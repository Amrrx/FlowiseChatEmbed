/**
 * REST client for operator-broadcast announcement endpoints on the MCP server.
 * Mirrors api/notifications.ts — active-list fetch + mark-read on the customer identity.
 */

export type AnnouncementMedia = {
  kind: 'image' | 'gif';
  /** May be relative for an upload we own — resolve against apiHost before use. */
  url: string;
  media_id?: string | null;
};

export type AnnouncementCta = {
  label: string;
  url: string;
};

export type Announcement = {
  announcement_id: string;
  title: string;
  body: string;
  media: AnnouncementMedia | null;
  cta: AnnouncementCta | null;
  category: string;
  created_at: string;
  unread: boolean;
};

export type AnnouncementsResponse = {
  announcements: Announcement[];
  unread_count: number;
};

/** Thin SSE frame pushed on publish — only enough to light the LED; body is pulled via fetchActive. */
export type AnnouncementEvent = {
  type: 'announcement';
  announcement_id: string;
  title: string;
  category: string;
  created_at: string;
};

/**
 * Identity carried on every announcement call.
 *
 * The agent id is required for agent-scoped announcements: an agent-targeted one
 * appears only inside that agent's chat, so the badge cannot be answered from the
 * user alone. The token is sent for parity with /stream and /chat, which already
 * send it — it is not yet verified server-side.
 */
export type AnnouncementIdentity = {
  apiHost: string;
  userId: string;
  agentId: string;
  userToken: string;
};

const identityHeaders = (id: AnnouncementIdentity): Record<string, string> => {
  const headers: Record<string, string> = { 'X-User-ID': id.userId };
  if (id.agentId) headers['X-Agent-ID'] = id.agentId;
  if (id.userToken) headers['X-User-Token'] = id.userToken;
  return headers;
};

export async function fetchActiveAnnouncements(id: AnnouncementIdentity): Promise<AnnouncementsResponse> {
  const response = await fetch(`${id.apiHost}/api/announcements`, { headers: identityHeaders(id) });
  if (!response.ok) {
    throw new Error(`Failed to fetch announcements: ${response.status}`);
  }
  return response.json();
}

/**
 * Mark announcements read. Resolves **true only on a 2xx** — the caller drops its
 * optimistic read state otherwise. Previously this ignored the response entirely,
 * so a 500 resolved as success and the badge cleared permanently.
 */
export async function markAnnouncementsRead(id: AnnouncementIdentity, announcementIds: string[]): Promise<boolean> {
  if (announcementIds.length === 0) return true;
  const response = await fetch(`${id.apiHost}/api/announcements/read`, {
    method: 'POST',
    headers: { ...identityHeaders(id), 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcement_ids: announcementIds }),
  });
  return response.ok;
}
