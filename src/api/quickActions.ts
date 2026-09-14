/**
 * REST client for the agent's quick-action buttons on the MCP server.
 * Mirrors api/announcements.ts — identity headers on a plain GET.
 */

export type QuickAction = {
  id: string;
  label: string;
  payload: string;
};

/**
 * Identity carried on the quick-actions call.
 *
 * The agent id is required: actions are curated per agent, so the list cannot be
 * answered from the user alone. The token is sent for parity with /stream and
 * /chat, which already send it — it is not yet verified server-side.
 */
export type QuickActionIdentity = {
  apiHost: string;
  userId: string;
  agentId: string;
  userToken: string;
};

const identityHeaders = (id: QuickActionIdentity): Record<string, string> => {
  const headers: Record<string, string> = { 'X-User-ID': id.userId };
  if (id.agentId) headers['X-Agent-ID'] = id.agentId;
  if (id.userToken) headers['X-User-Token'] = id.userToken;
  return headers;
};

export async function fetchQuickActions(id: QuickActionIdentity): Promise<QuickAction[]> {
  const response = await fetch(`${id.apiHost}/api/quick_actions`, { headers: identityHeaders(id) });
  if (!response.ok) {
    throw new Error(`Failed to fetch quick actions: ${response.status}`);
  }
  const body = await response.json();
  return body?.actions ?? [];
}
