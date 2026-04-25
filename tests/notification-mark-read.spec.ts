import { test, expect, Page, Request } from '@playwright/test';

/**
 * #24–#26 — Notifications must be marked read in the server once rendered to
 * the user, whether via Path A (summary injection) or Path B (live bubble).
 * After summary injection, the unread count must reset to 0.
 */

async function stubNotifications(page: Page, notifications: unknown[], onReadPost: (req: Request) => void) {
  let markedRead = false;
  let getCallCount = 0;
  await page.route('**/api/notifications/read', async (route) => {
    onReadPost(route.request());
    markedRead = true;
    await route.fulfill({ status: 200, body: '{}' });
  });
  await page.route('**/api/notifications*', async (route) => {
    if (route.request().url().includes('/read')) {
      return;
    }
    getCallCount += 1;
    // Once any mark-read has occurred OR this is the 2nd+ fetch (Bot mount's
    // refreshUnread after summary injection), the server reflects the new state.
    const cleared = markedRead || getCallCount >= 2;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: cleared ? [] : notifications,
        unread_count: cleared ? 0 : notifications.length,
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

function makeNotif(id: string) {
  return {
    notification_id: id,
    title: `Title ${id}`,
    message: `Body ${id}`,
    level: 'info',
    created_at: new Date().toISOString(),
  };
}

test('#24 Summary injection POSTs /api/notifications/read once with all IDs', async ({ page }) => {
  const readRequests: Request[] = [];
  await stubNotifications(page, [makeNotif('m1'), makeNotif('m2'), makeNotif('m3')], (req) => readRequests.push(req));
  await streamEmitting(page, []);

  await page.goto('/test-full-agui.html');

  await expect(page.locator('flowise-fullchatbot').getByText(/3 unread notifications/)).toBeVisible({ timeout: 10_000 });

  await expect.poll(() => readRequests.length, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
  const body = readRequests[0].postDataJSON();
  expect(new Set(body.notification_ids)).toEqual(new Set(['m1', 'm2', 'm3']));
});

test('#25 Live notification bubble POSTs /api/notifications/read with its single ID', async ({ page }) => {
  const readRequests: Request[] = [];
  await stubNotifications(page, [], (req) => readRequests.push(req));
  await streamEmitting(page, [
    {
      type: 'notification',
      notification_id: 'live-1',
      title: 'Live single',
      message: 'one off',
      level: 'info',
      created_at: new Date().toISOString(),
    },
  ]);

  await page.goto('/test-full-agui.html');

  await expect(page.locator('flowise-fullchatbot').getByText('Live single')).toBeVisible({ timeout: 10_000 });

  await expect.poll(() => readRequests.length, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
  const body = readRequests[0].postDataJSON();
  expect(body.notification_ids).toEqual(['live-1']);
});

test('#26 unreadCount drops to 0 after summary injection', async ({ page }) => {
  const readRequests: Request[] = [];
  await stubNotifications(page, [makeNotif('b1'), makeNotif('b2')], (req) => readRequests.push(req));
  await streamEmitting(page, []);

  await page.goto('/index.html');

  const badge = page
    .locator('flowise-chatbot')
    .locator('button[part="button"] > div')
    .filter({ hasText: /^\d+$/ });
  await expect(badge).toHaveText('2', { timeout: 10_000 });

  // Open bubble — summary injects, stream.setUnreadCount(() => 0) fires after historyLoaded.
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();
  await expect(page.locator('flowise-chatbot').getByText(/2 unread notifications/)).toBeVisible();

  // After summary injection settles, the badge must disappear. Poll because the
  // intermediate state goes 2 (initial) → 0 (openBot) → 2 (refreshUnread) → 0 (summary).
  await expect.poll(() => badge.count(), { timeout: 5_000 }).toBe(0);
});
