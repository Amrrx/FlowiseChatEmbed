import { test, expect, Page } from '@playwright/test';

/**
 * #12–#15 — Path A (summary card, frozen initialUnread) and Path B (live
 * NotificationBubble from /stream events) must never contaminate each other.
 *
 * Regression target: the initialUnread vs notifications split in
 * useAgUiStream — the summary must reflect the server snapshot at connect
 * time and not swell when live events arrive afterwards.
 */

async function stubNotifications(page: Page, notifications: unknown[], unreadCount?: number) {
  await page.route('**/api/notifications*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications,
        unread_count: unreadCount ?? notifications.length,
      }),
    });
  });
}

async function streamEmitting(page: Page, events: unknown[]) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  await page.route('**/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
      body,
    });
  });
}

function makeNotif(id: string, overrides: Partial<Record<string, any>> = {}) {
  return {
    notification_id: id,
    title: `Notification ${id}`,
    message: `Body ${id}`,
    level: 'info',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function liveEvent(id: string, overrides: Partial<Record<string, any>> = {}) {
  return {
    type: 'notification',
    notification_id: id,
    title: `Live ${id}`,
    message: `Live body ${id}`,
    level: 'info',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test('#12 Path A only — backlog renders as summary, no live bubbles', async ({ page }) => {
  await stubNotifications(page, [makeNotif('a1'), makeNotif('a2'), makeNotif('a3')]);
  await streamEmitting(page, []);

  await page.goto('/test-full-agui.html');

  const host = page.locator('flowise-fullchatbot');
  await expect(host.getByText(/3 unread notifications/)).toBeVisible({ timeout: 10_000 });

  // Path B bubbles render via NotificationBubble (class or content based).
  // Assert none of the summary items appear as standalone bubbles.
  // NotificationBubble renders the title — we pick one title that ONLY exists in
  // backlog; if it appears twice (summary + bubble), Path A contaminated Path B.
  await expect(host.getByText('Notification a1')).toHaveCount(1, { timeout: 2_000 });
});

test('#13 Path B only — empty backlog, live event renders as standalone bubble', async ({ page }) => {
  await stubNotifications(page, [], 0);
  await streamEmitting(page, [liveEvent('b1')]);

  await page.goto('/test-full-agui.html');

  const host = page.locator('flowise-fullchatbot');

  // Summary card should NOT appear (no backlog).
  await page.waitForTimeout(1500); // let initialUnread settle
  await expect(host.getByText(/unread notification/)).toHaveCount(0);

  // Live bubble should render.
  await expect(host.getByText('Live b1')).toBeVisible({ timeout: 5_000 });
});

test('#14 Combined — backlog + live coexist without cross-contamination', async ({ page }) => {
  await stubNotifications(page, [makeNotif('x1'), makeNotif('x2')]);
  await streamEmitting(page, [liveEvent('y1')]);

  await page.goto('/test-full-agui.html');

  const host = page.locator('flowise-fullchatbot');

  // Summary card shows exactly 2 (frozen initialUnread, not 3).
  await expect(host.getByText(/2 unread notifications/)).toBeVisible({ timeout: 10_000 });

  // Live bubble appears for the new item.
  await expect(host.getByText('Live y1')).toBeVisible();

  // And the backlog items do NOT additionally appear as standalone bubbles.
  await expect(host.getByText('Notification x1')).toHaveCount(1);
});

test('#15 Live event does not mutate the summary card row count', async ({ page }) => {
  await stubNotifications(page, [makeNotif('s1'), makeNotif('s2')]);
  await streamEmitting(page, [liveEvent('s3'), liveEvent('s4')]);

  await page.goto('/test-full-agui.html');

  const host = page.locator('flowise-fullchatbot');
  const summary = host.getByText(/2 unread notifications/);
  await expect(summary).toBeVisible({ timeout: 10_000 });

  // Wait long enough for any stray mutations to land.
  await page.waitForTimeout(1500);

  // Summary header still says "2", never "3" or "4".
  await expect(summary).toBeVisible();
  await expect(host.getByText(/3 unread notifications/)).toHaveCount(0);
  await expect(host.getByText(/4 unread notifications/)).toHaveCount(0);
});
