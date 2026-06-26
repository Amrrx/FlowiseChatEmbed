import { getLocalStorageChatflow, setLocalStorageChatflow, removeLocalStorageChatHistory } from '@/utils';

/**
 * Single owner of the conversation identifier (session_id) for a given chatflow
 * on this browser.
 *
 * Canonical name: sessionId (aligned with Flowise's own memory-node naming).
 * The same value is also carried as `body.chatId` at the Flowise predict API
 * boundary — that's Flowise's wire contract; conceptually it's the same thing.
 *
 * Both the SSE stream (useAgUiStream) and the chat prediction calls (Bot) must
 * read from this single owner. Persists in localStorage under
 * `${chatflowid}_EXTERNAL.chatId` (legacy field name, same value) so existing
 * saved sessions keep working without migration.
 *
 * Full propagation chain — client → gateway → Flowise → MCP server → back:
 *   mosaad_mcp/docs/FLOWS.md § "Flow 7: Chat Identity Propagation"
 */

const fallbackRandom = (): string => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

const buildId = (customerId?: string): string => (customerId ? `${customerId}+${fallbackRandom()}` : fallbackRandom());

export function getOrCreateSessionId(chatflowid: string, customerId?: string, userId?: string): string {
  const saved = getLocalStorageChatflow(chatflowid);

  // The session is bound to the user who created it. A different userId on the
  // same browser ("login as") must get a fresh chatId: Flowise keys conversation
  // memory by chatId alone, so reusing it would blend the two users' histories.
  if (saved?.chatId) {
    if (saved.ownerId === undefined) {
      // Legacy session created before owner-binding — adopt it for the current user.
      if (userId !== undefined) setLocalStorageChatflow(chatflowid, saved.chatId, { ownerId: userId });
      return saved.chatId; // legacy field name — same value
    }
    if (userId === undefined || saved.ownerId === userId) return saved.chatId;
  }

  const fresh = buildId(customerId);
  setLocalStorageChatflow(chatflowid, fresh, userId === undefined ? {} : { ownerId: userId });
  return fresh;
}

export function resetSessionId(chatflowid: string): void {
  removeLocalStorageChatHistory(chatflowid);
}

/** @deprecated use getOrCreateSessionId */
export const getOrCreateChatId = getOrCreateSessionId;
/** @deprecated use resetSessionId */
export const resetChatId = resetSessionId;
