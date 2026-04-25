import { test, expect, Page } from '@playwright/test';

/**
 * Bubble-only behavior: the unread badge on the collapsed button.
 *   #2 — bot_message arriving while bot is closed bumps the unread count.
 *   #3 — opening the bot resets the count to zero (badge disappears).
 *
 * These tests validate the `isBotVisible` accessor wired from Bubble's
 * isBotOpened() into useAgUiStream — the mode-specific signal that Full
 * deliberately omits.
 */

async function stubNotifications(page: Page) {
  await page.route('**/api/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ notifications: [], unread_count: 0 }),
    });
  });
}

async function mockStreamOnce(page: Page, events: unknown[]) {
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

function badgeLocator(page: Page) {
  // The badge is the button's direct child <div> whose text is a digit.
  return page
    .locator('flowise-chatbot')
    .locator('button[part="button"] > div')
    .filter({ hasText: /^\d+$/ });
}

test('#2 Bubble unread badge increments on bot_message with bot closed', async ({ page }) => {
  await stubNotifications(page);
  await mockStreamOnce(page, [{ type: 'bot_message', content: 'hello' }]);

  await page.goto('/index.html');

  await expect(badgeLocator(page)).toHaveText('1', { timeout: 10_000 });
});

test('#3 Bubble unread badge clears to 0 when bot opens', async ({ page }) => {
  await stubNotifications(page);
  await mockStreamOnce(page, [{ type: 'bot_message', content: 'hello' }]);

  await page.goto('/index.html');

  // First verify the badge appeared.
  const badge = badgeLocator(page);
  await expect(badge).toHaveText('1', { timeout: 10_000 });

  // Click the bubble button to open the bot.
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();

  // Badge div disappears when unreadCount === 0 (Show in BubbleButton.tsx:165).
  await expect(badge).toHaveCount(0, { timeout: 5_000 });
});
