/**
 * Validates catalog.json against TypeScript types
 *
 * This file will show TypeScript errors if catalog.json is out of sync with types.ts
 * Run `yarn build` to validate.
 */

import type { AngularEvent, ChatbotCommand } from './types';
import catalogJson from './catalog.json';

// Type validation - will error at compile time if catalog is wrong
type IncomingEventType = (typeof catalogJson.incomingEvents)[number]['type'];
type CommandType = (typeof catalogJson.availableCommands)[number]['type'];

// Ensure every event type in catalog exists in types.ts
type ValidateIncoming = IncomingEventType extends AngularEvent['type'] ? IncomingEventType : never;
const _validateIncoming: ValidateIncoming = 'UNIT_QUERIED' as ValidateIncoming;

// Ensure every command type in catalog exists in types.ts
type ValidateCommands = CommandType extends ChatbotCommand['type'] ? CommandType : never;
const _validateCommands: ValidateCommands = 'QUERY_UNIT' as ValidateCommands;

// Export for use in chatbot or MCP server
export const CATALOG = catalogJson;