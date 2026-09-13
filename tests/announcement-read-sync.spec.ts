import { test, expect, Page } from '@playwright/test';

/**
 * Read state must not outlive a failed POST (design §6.7).
 *
 * The server here keeps reporting `unread: true`, so only local state can clear the
 * LED. Both tests drive the identical flow and differ ONLY in the mark-read status
 * code — so the contrast between them is the proof: a 200 must leave the LED clear,
 * a 500 must let it come back. A single set overriding every fetch would clear it
 * permanently in both cases and the user would silently lose the announcement.
 */

async function stub(page: Page, opts: { markStatus: number }) {
  await page.route('**/api/announcements**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: opts.markStatus, body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        announcements: [
          {
            announcement_id: 'a1',
            title: 'T',
            body: 'b',
            media: null,
            cta: null,
            category: 'notice',
            created_at: new Date().toISOString(),
            unread: true,
          },
        ],
        unread_count: 1,
      }),
    });
  });
}

const led = (page: Page) => page.locator('flowise-chatbot').locator('[data-testid="announcement-unread-led"]');

/** Open the chat, then mark read via the header megaphone. */
async function openAndMarkRead(page: Page) {
  await page.goto('/index.html');
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();
  await expect(led(page)).toHaveText('1', { timeout: 15_000 });
  await page.locator('flowise-chatbot').locator('[data-testid="announcement-button"]').click();
}

test('a failed mark-read lets the LED come back', async ({ page }) => {
  await stub(page, { markStatus: 500 });
  await openAndMarkRead(page);

  // The 500 drops the pending read and the refetch restores the unread state.
  await expect(led(page)).toHaveText('1', { timeout: 15_000 });
});

test('a successful mark-read keeps the LED clear across a refetch', async ({ page }) => {
  await stub(page, { markStatus: 200 });
  await openAndMarkRead(page);

  // The confirmed read overrides the server still reporting unread.
  await expect(led(page)).toHaveCount(0, { timeout: 15_000 });
});

test('an announcement_read frame from another tab clears the LED', async ({ page }) => {
  await stub(page, { markStatus: 200 });
  await page.route('**/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
      body: `data: ${JSON.stringify({ type: 'announcement_read', announcement_ids: ['a1'] })}\n\n`,
    });
  });

  await page.goto('/index.html');
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();

  // No click here — the frame alone must settle the badge.
  await expect(led(page)).toHaveCount(0, { timeout: 15_000 });
});
