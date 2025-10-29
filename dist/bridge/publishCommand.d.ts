/**
 * Command Publisher for Chatbot → Angular Communication
 *
 * Allows the chatbot to send commands to the Angular parent application.
 */
import type { ChatbotCommand } from './types';
/**
 * Publish a command from the chatbot to Angular.
 *
 * Angular listens for 'chatbot:command' events and routes them to appropriate components.
 *
 * @param command - The command to send to Angular
 *
 * @example
 * ```typescript
 * // Trigger a unit search in Angular
 * publishCommand({
 *   type: 'QUERY_UNIT',
 *   searchTerm: 'ABC-123',
 *   searchType: 'plate'
 * });
 * ```
 */
export declare function publishCommand(command: ChatbotCommand): void;
//# sourceMappingURL=publishCommand.d.ts.map