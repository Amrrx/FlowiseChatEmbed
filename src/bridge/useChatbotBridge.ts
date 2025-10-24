/**
 * Chatbot Bridge Hook (SolidJS)
 *
 * Receives events from Angular in real-time and triggers callback immediately.
 * No storage, no batching - events are processed as they arrive.
 */

import { createEffect, onCleanup } from 'solid-js';
import type { AngularEvent } from './types';

/**
 * Hook to receive events from Angular parent application.
 *
 * @param onEventReceived - Callback function that will be triggered immediately when an event is received
 *
 * @example
 * useChatbotBridge((event) => {
 *   console.log('Received event:', event);
 *   // Send event.prompt to LLM immediately
 * });
 */
export function useChatbotBridge(onEventReceived: (event: AngularEvent) => void): void {
  createEffect(() => {
    const handleEvent = (e: Event) => {
      const event = (e as CustomEvent<AngularEvent>).detail;
      console.log('[Bridge] Received event:', event);

      // Immediately trigger callback (no storage, no batching)
      onEventReceived(event);
    };

    window.addEventListener('angular:event', handleEvent);

    onCleanup(() => {
      window.removeEventListener('angular:event', handleEvent);
    });
  });
}
