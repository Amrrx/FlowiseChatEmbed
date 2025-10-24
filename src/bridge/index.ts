/**
 * Angular Bridge Module
 *
 * Provides bidirectional communication between the chatbot and Angular parent application.
 */

// Types
export type { AngularEvent, ChatbotCommand, UnitQueriedEvent, QueryUnitCommand } from './types';

// Hooks for receiving events from Angular
export { useChatbotBridge } from './useChatbotBridge';

// Functions for sending commands to Angular
export { publishCommand } from './publishCommand';

// Prompt templates for events
export { buildPromptFromEvent, EVENT_PROMPT_TEMPLATES } from './promptTemplates';
