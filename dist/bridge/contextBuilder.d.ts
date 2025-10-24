/**
 * Context Builder Utility
 *
 * Converts Angular events into JSON format for LLM consumption.
 * The LLM receives event data in overrideConfig.angularContext
 */
import type { AngularEvent } from './types';
/**
 * Builds a JSON string from Angular events for LLM context.
 * Returns the last 20 events in structured JSON format.
 *
 * @param events - Array of events received from Angular
 * @returns JSON string for LLM, or empty string if no events
 */
export declare function buildLLMContext(events: AngularEvent[]): string;
//# sourceMappingURL=contextBuilder.d.ts.map