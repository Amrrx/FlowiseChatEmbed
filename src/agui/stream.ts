/**
 * Persistent SSE connection manager.
 * Establishes long-lived connection to /stream for real-time event delivery,
 * and owns reconnection: the library's own retry is disabled so every ended stream
 * reconnects through one backoff, and a stream that goes silent is replaced.
 */

import { fetchEventSource } from '@microsoft/fetch-event-source';

export type StreamEvent = {
  type: string;
  [key: string]: any;
};

export type StreamOptions = {
  apiHost: string;
  agentId: string;
  userId: string;
  userToken: string;
  sessionId: string;
  onEvent: (event: StreamEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
};

export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;
// The server sends a ping every 15 s; three missed pings mean the stream is dead.
export const STREAM_IDLE_TIMEOUT_MS = 45_000;

/** The server refused for good (401/403): never reconnect. */
class TerminalStreamError extends Error {}

/** The stream ended or was refused for now: reconnect after the backoff (at least `minDelayMs`). */
class RetryStreamError extends Error {
  constructor(readonly minDelayMs = 0) {
    super('stream ended');
  }
}

let abortController: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer(timer: ReturnType<typeof setTimeout> | null): null {
  if (timer) clearTimeout(timer);
  return null;
}

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

function backoffMs(attempt: number): number {
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
  return delay * (1 + Math.random() * 0.5);
}

export function connectStream(options: StreamOptions): void {
  disconnectStream();

  // Consecutive attempts since the last `ack`; an acknowledged stream starts the backoff over.
  let attempt = 0;

  const headers: Record<string, string> = {
    'X-Agent-ID': options.agentId,
    'X-User-ID': options.userId,
    'X-User-Token': options.userToken,
    'X-Session-ID': options.sessionId,
  };

  const scheduleReconnect = (minDelayMs: number) => {
    const delay = Math.max(backoffMs(attempt), minDelayMs);
    attempt += 1;
    reconnectTimer = setTimeout(open, delay);
  };

  function open(): void {
    reconnectTimer = null;
    const connection = new AbortController();
    abortController = connection;

    const armIdleTimer = () => {
      idleTimer = clearTimer(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
        connection.abort();
        options.onDisconnect?.();
        scheduleReconnect(0);
      }, STREAM_IDLE_TIMEOUT_MS);
    };

    fetchEventSource(`${options.apiHost}/stream`, {
      method: 'GET',
      headers,
      signal: connection.signal,
      openWhenHidden: true,

      async onopen(response) {
        if (response.status === 401 || response.status === 403) {
          options.onError?.(`HTTP ${response.status}`);
          throw new TerminalStreamError();
        }
        // 204 is the server's rate-limit reply: no body, back off.
        if (response.status === 204) throw new RetryStreamError(retryAfterMs(response));
        if (!response.ok) {
          options.onError?.((await response.text()) || 'Stream connection failed');
          throw new RetryStreamError(retryAfterMs(response));
        }
        options.onConnect?.();
        armIdleTimer();
      },

      onmessage(ev) {
        let event: StreamEvent;
        try {
          event = JSON.parse(ev.data);
        } catch {
          return; // comments, keepalive
        }
        armIdleTimer();
        if (event.type === 'ack') attempt = 0;
        if (event.type === 'ping') return;
        options.onEvent(event);
      },

      onclose() {
        throw new RetryStreamError();
      },

      onerror(error) {
        throw error; // reconnection is handled below, not by the library's fixed 1 s retry
      },
    }).then(
      () => {
        idleTimer = clearTimer(idleTimer);
      },
      (error: unknown) => {
        idleTimer = clearTimer(idleTimer);
        if (connection.signal.aborted || abortController !== connection) return;
        options.onDisconnect?.();
        if (error instanceof TerminalStreamError) return;
        scheduleReconnect(error instanceof RetryStreamError ? error.minDelayMs : 0);
      },
    );
  }

  open();
}

export function disconnectStream(): void {
  reconnectTimer = clearTimer(reconnectTimer);
  idleTimer = clearTimer(idleTimer);
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
