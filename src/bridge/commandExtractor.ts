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
export function extractCommands(text: string): ExtractedMessage {
  const commandRegex = /\[COMMAND\]([\s\S]*?)\[\/COMMAND\]/g;
  const commands: ChatbotCommand[] = [];

  // Extract all command blocks
  let match;
  while ((match = commandRegex.exec(text)) !== null) {
    try {
      const commandJson = match[1].trim();
      const command = JSON.parse(commandJson);
      commands.push(command);
    } catch (e) {
      console.error('[CommandExtractor] Invalid command JSON:', match[1], e);
    }
  }

  // Remove command blocks from display text
  const displayText = text.replace(commandRegex, '').trim();

  return { displayText, commands };
}