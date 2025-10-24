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
export const EVENT_PROMPT_TEMPLATES: {
  [K in AngularEvent['type']]: PromptTemplate<Extract<AngularEvent, { type: K }>>;
} = {
  UNIT_QUERIED: (event) => {
    return `User searched for a unit using ${event.searchType}: "${event.searchTerm}".
Please provide relevant information about this unit.`;
  },
};

/**
 * Build a prompt from an event using its configured template
 */
export function buildPromptFromEvent(event: AngularEvent): string {
  const template = EVENT_PROMPT_TEMPLATES[event.type];
  return template(event as any);
}
