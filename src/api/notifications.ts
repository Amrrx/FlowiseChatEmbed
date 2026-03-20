/**
 * REST client for notification endpoints on the MCP server.
 */

export type Notification = {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  metadata: Record<string, any>;
  created_at: string;
  read: boolean;
  read_at: string | null;
};

export type NotificationResponse = {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
};

export async function fetchUnreadNotifications(
  apiHost: string,
  userId: string,
  limit = 50,
): Promise<NotificationResponse> {
  const url = `${apiHost}/api/notifications?unread_only=true&limit=${limit}`;
  const response = await fetch(url, {
    headers: { 'X-User-ID': userId },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }
  return response.json();
}

export async function markNotificationsRead(
  apiHost: string,
  userId: string,
  notificationIds: string[],
): Promise<void> {
  await fetch(`${apiHost}/api/notifications/read`, {
    method: 'POST',
    headers: {
      'X-User-ID': userId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_ids: notificationIds }),
  });
}
