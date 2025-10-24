/**
 * Chatbot Bridge Hook (SolidJS)
 *
 * Receives events from Angular in real-time and triggers callback immediately.
 * No storage, no batching - events are processed as they arrive.
 */
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
export declare function useChatbotBridge(onEventReceived: (event: AngularEvent) => void): void;
//# sourceMappingURL=useChatbotBridge.d.ts.map