/**
 * connectStream reconnect contract, driven through the real @microsoft/fetch-event-source
 * with a scripted fetch and fake timers.
 *
 * Contract under test:
 *   - Reconnect delay n = min(RECONNECT_BASE_MS * 2^n, RECONNECT_MAX_MS), optional additive jitter up to +50%.
 *     n counts consecutive attempts since the last `ack`; an `ack` resets it to 0.
 *   - A 204 reply backs off by that delay; `Retry-After: <seconds>` raises the delay to at least that value.
 *   - 401 / 403 stay terminal.
 *   - STREAM_IDLE_TIMEOUT_MS without any event (a `ping` counts) aborts the request and reconnects.
 *   - `{"type":"ping"}` is consumed by stream.ts and never reaches onEvent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectStream, disconnectStream, type StreamOptions } from './stream';

const RECONNECT_BASE_MS = 1_000;
const STREAM_IDLE_TIMEOUT_MS = 45_000;
const JITTER = 1.5;

type ServerStream = {
  push: (event: Record<string, unknown>) => void;
  close: () => void;
  signal: AbortSignal;
};

type Reply = (signal: AbortSignal) => Response;

const encoder = new TextEncoder();
let replies: Reply[] = [];
let streams: ServerStream[] = [];
let callTimes: number[] = [];

function sseReply(signal: AbortSignal): Response {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start: (c) => {
      controller = c;
    },
  });
  signal.addEventListener('abort', () => {
    try {
      controller.error(new DOMException('The operation was aborted.', 'AbortError'));
    } catch {
      // stream already closed
    }
  });
  streams.push({
    push: (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)),
    close: () => controller.close(),
    signal,
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const statusReply =
  (status: number, headers: Record<string, string> = {}): Reply =>
  () =>
    new Response(status === 204 ? null : `HTTP ${status}`, { status, headers });

const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  callTimes.push(Date.now());
  const reply = replies.shift() ?? sseReply;
  return Promise.resolve(reply(init?.signal as AbortSignal));
});

function connect(overrides: Partial<StreamOptions> = {}): StreamOptions {
  const options: StreamOptions = {
    apiHost: 'http://engine.test',
    agentId: 'agent-1',
    userId: 'user-1',
    userToken: 'token-1',
    sessionId: 'session-1',
    onEvent: vi.fn(),
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
  connectStream(options);
  return options;
}

const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
};
const settle = (): Promise<void> => advance(0);
const gaps = (): number[] => callTimes.slice(1).map((time, i) => time - callTimes[i]);
const eventTypes = (options: StreamOptions): string[] => vi.mocked(options.onEvent).mock.calls.map(([event]) => event.type);

function expectGapWithin(gap: number | undefined, min: number, max: number): void {
  expect(gap, `reconnect gap ${gap} ms, expected [${min}, ${max}]`).toBeGreaterThanOrEqual(min);
  expect(gap, `reconnect gap ${gap} ms, expected [${min}, ${max}]`).toBeLessThanOrEqual(max);
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
  // fetch-event-source schedules retries through window.setTimeout, reads window.fetch and
  // detaches a document visibility listener on dispose.
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  replies = [];
  streams = [];
  callTimes = [];
});

afterEach(() => {
  disconnectStream();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('harness', () => {
  it('opens GET /stream with identity headers and forwards events', async () => {
    const options = connect();
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://engine.test/stream');
    expect(init?.method).toBe('GET');
    expect(init?.headers).toMatchObject({ 'X-User-ID': 'user-1', 'X-Agent-ID': 'agent-1', 'X-Session-ID': 'session-1' });
    expect(options.onConnect).toHaveBeenCalledTimes(1);

    streams[0].push({ type: 'ack', pipeline_reports: false });
    await settle();
    expect(eventTypes(options)).toEqual(['ack']);
  });
});

describe('clean close of an acked stream', () => {
  it.each([
    ['disabled', false],
    ['enabled', true],
  ])('reconnects with backoff when Reports are %s', async (_label, pipelineReports) => {
    connect();
    await settle();
    streams[0].push({ type: 'ack', pipeline_reports: pipelineReports });
    streams[0].close();
    await settle();

    expect(callTimes, 'no immediate reconnect').toHaveLength(1);
    await advance(10_000);

    expect(callTimes.length, 'reconnect attempts after clean close').toBeGreaterThanOrEqual(2);
    expectGapWithin(gaps()[0], RECONNECT_BASE_MS, RECONNECT_BASE_MS * JITTER);
  });

  it('disconnectStream cancels a pending reconnect', async () => {
    connect();
    await settle();
    streams[0].push({ type: 'ack', pipeline_reports: false });
    streams[0].close();
    await settle();
    disconnectStream();
    await advance(120_000);

    expect(callTimes).toHaveLength(1);
  });
});

describe('204 reply', () => {
  it('backs off exponentially across consecutive 204 replies', async () => {
    replies = [statusReply(204), statusReply(204), statusReply(204)];
    connect();
    await advance(30_000);

    expect(callTimes.length).toBeGreaterThanOrEqual(4);
    const [first, second, third] = gaps();
    expectGapWithin(first, RECONNECT_BASE_MS, RECONNECT_BASE_MS * JITTER);
    expectGapWithin(second, RECONNECT_BASE_MS * 2, RECONNECT_BASE_MS * 2 * JITTER);
    expectGapWithin(third, RECONNECT_BASE_MS * 4, RECONNECT_BASE_MS * 4 * JITTER);
  });

  it('honours Retry-After on a 204 reply', async () => {
    replies = [statusReply(204, { 'Retry-After': '10' })];
    connect();
    await advance(30_000);

    expect(callTimes.length).toBeGreaterThanOrEqual(2);
    expectGapWithin(gaps()[0], 10_000, 10_000 * JITTER);
  });
});

describe('authorization failure', () => {
  it.each([401, 403])('HTTP %i is terminal: reports onError and never reconnects', async (status) => {
    replies = [statusReply(status)];
    const options = connect();
    await advance(120_000);

    expect(callTimes).toHaveLength(1);
    expect(options.onError).toHaveBeenCalledWith(`HTTP ${status}`);
  });
});

describe('idle watchdog', () => {
  it(`reconnects when an open stream receives no event for ${STREAM_IDLE_TIMEOUT_MS} ms`, async () => {
    connect();
    await settle();
    streams[0].push({ type: 'ack', pipeline_reports: false });
    await advance(STREAM_IDLE_TIMEOUT_MS - 1);

    expect(callTimes, 'no reconnect before the idle timeout').toHaveLength(1);
    await advance(RECONNECT_BASE_MS * JITTER + 1);

    expect(callTimes.length, 'reconnect after the idle timeout').toBe(2);
    expect(streams[0].signal.aborted, 'idle request aborted').toBe(true);
    expectGapWithin(gaps()[0], STREAM_IDLE_TIMEOUT_MS, STREAM_IDLE_TIMEOUT_MS + RECONNECT_BASE_MS * JITTER);
  });

  it('a ping event resets the idle timer', async () => {
    connect();
    await settle();
    streams[0].push({ type: 'ack', pipeline_reports: false });
    await advance(30_000);
    streams[0].push({ type: 'ping' });
    await advance(STREAM_IDLE_TIMEOUT_MS - 1);

    expect(callTimes, 'ping kept the stream alive').toHaveLength(1);
    await advance(RECONNECT_BASE_MS * JITTER + 1);

    expect(callTimes.length, 'reconnect after the idle timeout counted from the ping').toBe(2);
  });
});

describe('ping heartbeat', () => {
  it('does not forward ping events to onEvent', async () => {
    const options = connect();
    await settle();
    streams[0].push({ type: 'ack', pipeline_reports: false });
    streams[0].push({ type: 'ping' });
    streams[0].push({ type: 'notification', id: 'n-1' });
    await settle();

    expect(eventTypes(options)).toEqual(['ack', 'notification']);
  });
});
