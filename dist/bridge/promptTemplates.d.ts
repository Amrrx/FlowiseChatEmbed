/**
 * Prompt Templates for Angular Events
 *
 * Define how each event type should be converted into an LLM prompt.
 * Templates use event data to construct the final prompt.
 */
import type { AngularEvent } from './types';
/**
 * Template function that receives event data and returns a prompt string
 */
type PromptTemplate<T extends AngularEvent> = (event: T) => string;
/**
 * Map of event types to their prompt templates
 */
export declare const EVENT_PROMPT_TEMPLATES: {
    [K in AngularEvent['type']]: PromptTemplate<Extract<AngularEvent, {
        type: K;
    }>>;
};
/**
 * Build a prompt from an event using its configured template
 */
export declare function buildPromptFromEvent(event: AngularEvent): string;
export {};
//# sourceMappingURL=promptTemplates.d.ts.map