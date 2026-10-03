/**
 * Persistent SSE connection manager.
 * Establishes long-lived connection to /stream for real-time event delivery.
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

let abortController: AbortController | null = null;

export function connectStream(options: StreamOptions): void {
  if (abortController) {
    abortController.abort();
  }

  abortController = new AbortController();
  const connection = abortController;
  let reportsEnabled = false;

  const headers: Record<string, string> = {
    'X-Agent-ID': options.agentId,
    'X-User-ID': options.userId,
    'X-User-Token': options.userToken,
    'X-Session-ID': options.sessionId,
  };

  fetchEventSource(`${options.apiHost}/stream`, {
    method: 'GET',
    headers,
    signal: abortController.signal,
    openWhenHidden: true,

    async onopen(response) {
      if (response.ok) {
        options.onConnect?.();
        return;
      }
      if (response.status === 401 || response.status === 403) {
        connection.abort();
        options.onError?.(`HTTP ${response.status}`);
        options.onDisconnect?.();
        throw new Error(`HTTP ${response.status}`);
      }
      const errMessage = (await response.text()) ?? 'Stream connection failed';
      options.onError?.(errMessage);
      throw new Error(errMessage);
    },

    onmessage(ev) {
      try {
        const event: StreamEvent = JSON.parse(ev.data);
        if (event.type === 'ack') reportsEnabled = event.pipeline_reports === true;
        options.onEvent(event);
      } catch {
        // Ignore unparseable events (comments, keepalive)
      }
    },

    onerror() {
      options.onDisconnect?.();
      if (connection.signal.aborted) throw new Error('Stream closed');
    },

    onclose() {
      options.onDisconnect?.();
      if (reportsEnabled && !connection.signal.aborted) throw new Error('Report stream disconnected');
    },
  }).catch(() => options.onDisconnect?.());
}

export function disconnectStream(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
