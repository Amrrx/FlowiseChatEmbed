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

export type NotificationIdentity = {
  apiHost: string;
  userId: string;
  agentId: string;
  userToken: string;
};

const identityHeaders = (identity: NotificationIdentity): Record<string, string> => ({
  'X-User-ID': identity.userId,
  'X-Agent-ID': identity.agentId,
  'X-User-Token': identity.userToken,
});

export async function fetchUnreadNotifications(identity: NotificationIdentity, limit = 50, signal?: AbortSignal): Promise<NotificationResponse> {
  const url = `${identity.apiHost}/api/notifications?unread_only=true&limit=${limit}`;
  const response = await fetch(url, {
    headers: identityHeaders(identity),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }
  return response.json();
}

export async function markNotificationsRead(identity: NotificationIdentity, notificationIds: string[]): Promise<void> {
  const response = await fetch(`${identity.apiHost}/api/notifications/read`, {
    method: 'POST',
    headers: {
      ...identityHeaders(identity),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_ids: notificationIds }),
  });
  if (!response.ok) {
    throw new Error(`Failed to mark notifications read: ${response.status}`);
  }
}
