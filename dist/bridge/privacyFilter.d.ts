/**
 * Privacy Filter Utility
 *
 * Defense-in-depth layer to strip PII patterns from Angular events
 * before sending to LLM. This is a secondary filter - Angular should
 * sanitize first, but we catch anything that slips through.
 */
import type { AngularEvent } from './types';
/**
 * Sanitizes data before sending to LLM (defense-in-depth filter).
 * Returns '[REDACTED]' for any detected sensitive patterns.
 *
 * @param data - Data to sanitize (can be any type)
 * @returns Sanitized version of the data
 */
export declare function sanitizeForLLM(data: unknown): unknown;
/**
 * Checks if an event contains any sensitive data.
 * Returns true if event should be dropped entirely.
 *
 * @param event - Angular event to check
 * @returns true if event contains sensitive data
 */
export declare function containsSensitiveData(event: AngularEvent): boolean;
//# sourceMappingURL=privacyFilter.d.ts.map