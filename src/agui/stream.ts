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
  chatId: string;
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

  const headers: Record<string, string> = {
    'X-Agent-ID': options.agentId,
    'X-User-ID': options.userId,
    'X-User-Token': options.userToken,
    'X-Chat-ID': options.chatId,
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
      const errMessage = (await response.text()) ?? 'Stream connection failed';
      options.onError?.(errMessage);
      throw new Error(errMessage);
    },

    onmessage(ev) {
      try {
        const event: StreamEvent = JSON.parse(ev.data);
        options.onEvent(event);
      } catch {
        // Ignore unparseable events (comments, keepalive)
      }
    },

    onerror() {
      options.onDisconnect?.();
    },

    onclose() {
      options.onDisconnect?.();
    },
  });
}

export function disconnectStream(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
