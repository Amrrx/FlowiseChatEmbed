/**
 * Angular Bridge Module
 *
 * Provides bidirectional communication between the chatbot and Angular parent application.
 */
export type { AngularEvent, ChatbotCommand, UnitQueriedEvent, QueryUnitCommand } from './types';
export { useChatbotBridge } from './useChatbotBridge';
export { publishCommand } from './publishCommand';
export { buildPromptFromEvent, EVENT_PROMPT_TEMPLATES } from './promptTemplates';
//# sourceMappingURL=index.d.ts.map