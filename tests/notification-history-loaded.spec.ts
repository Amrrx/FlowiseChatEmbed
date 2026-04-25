import { test, expect, Page } from '@playwright/test';

/**
 * #10, #11 — historyLoaded must flip true regardless of cached chat history
 * so the Path A notification summary can inject. Regression target: the fix
 * that moved setHistoryLoaded(true) out of the `if (chatMessage && ...)` block
 * in Bot.tsx — previously, fresh chatflows with empty localStorage never
 * triggered the summary.
 */

const CHATFLOW_ID = 'ea7b1e24-c8b0-4176-b12f-9542ff03c0af'; // matches public/index.html

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

async function emptyStream(page: Page) {
  await page.route('**/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    });
  });
}

function makeNotif(id: string, overrides: Partial<Record<string, any>> = {}) {
  return {
    notification_id: id,
    title: `Notification ${id}`,
    message: `Message body ${id}`,
    level: 'info',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test('#10 Summary card renders for fresh chatflow with empty localStorage', async ({ page }) => {
  await stubNotifications(page, [makeNotif('n1'), makeNotif('n2'), makeNotif('n3')]);
  await emptyStream(page);

  // Ensure localStorage has no prior history for this chatflow.
  await page.addInitScript((key) => {
    localStorage.removeItem(key);
  }, `${CHATFLOW_ID}_EXTERNAL`);

  await page.goto('/index.html');

  // Click the bubble button to mount Bot.
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();

  const summary = page.locator('flowise-chatbot').getByText(/3 unread notifications/);
  await expect(summary).toBeVisible({ timeout: 10_000 });
});

test('#11 Summary card + saved history both render when localStorage has prior chat', async ({ page }) => {
  await stubNotifications(page, [makeNotif('n1'), makeNotif('n2')]);
  await emptyStream(page);

  const savedChat = {
    chatId: 'seeded-chat-id',
    chatHistory: [
      { message: 'Hi earlier', type: 'userMessage', dateTime: new Date().toISOString() },
      { message: 'Prior assistant reply', type: 'apiMessage', dateTime: new Date().toISOString() },
    ],
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: `${CHATFLOW_ID}_EXTERNAL`, value: savedChat },
  );

  await page.goto('/index.html');
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();

  const host = page.locator('flowise-chatbot');
  await expect(host.getByText(/2 unread notifications/)).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText('Hi earlier')).toBeVisible();
  await expect(host.getByText('Prior assistant reply')).toBeVisible();
});
