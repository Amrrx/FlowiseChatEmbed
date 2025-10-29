/**
 * Command Extractor
 *
 * Extracts [COMMAND]...[/COMMAND] blocks from LLM responses
 * Returns clean display text and parsed commands
 */
import type { ChatbotCommand } from './types';
export type ExtractedMessage = {
    displayText: string;
    commands: ChatbotCommand[];
};
/**
 * Extract commands from LLM response while preserving display text
 *
 * @param text - Raw LLM response text
 * @returns Object with displayText (cleaned) and commands array
 *
 * @example
 * const result = extractCommands("Let me search.\n[COMMAND]{...}[/COMMAND]\nDone!");
 * // result.displayText = "Let me search.\nDone!"
 * // result.commands = [{type: "QUERY_UNIT", ...}]
 */
export declare function extractCommands(text: string): ExtractedMessage;
//# sourceMappingURL=commandExtractor.d.ts.map