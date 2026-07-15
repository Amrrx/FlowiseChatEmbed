/**
 * REST client for operator-broadcast announcement endpoints on the MCP server.
 * Mirrors api/notifications.ts — active-list fetch + mark-read on the customer identity.
 */

export type AnnouncementMedia = {
  kind: 'image' | 'gif';
  url: string;
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

export async function fetchActiveAnnouncements(apiHost: string, userId: string): Promise<AnnouncementsResponse> {
  const response = await fetch(`${apiHost}/api/announcements`, {
    headers: { 'X-User-ID': userId },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch announcements: ${response.status}`);
  }
  return response.json();
}

export async function markAnnouncementsRead(apiHost: string, userId: string, announcementIds: string[]): Promise<void> {
  if (announcementIds.length === 0) return;
  await fetch(`${apiHost}/api/announcements/read`, {
    method: 'POST',
    headers: {
      'X-User-ID': userId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ announcement_ids: announcementIds }),
  });
}
