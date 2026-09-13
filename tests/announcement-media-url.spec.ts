import { test, expect, Page } from '@playwright/test';

/**
 * An uploaded image's stored url is relative. The embed runs on the CUSTOMER's page, so
 * assigning it straight to <img src> resolves against the customer's origin rather than
 * mosaad — every uploaded image would 404 (design §8.3.1).
 */

async function stubWithMedia(page: Page, url: string) {
  await page.route('**/api/announcements**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        announcements: [
          {
            announcement_id: 'a1',
            title: 'With media',
            body: 'b',
            media: { kind: 'gif', url, media_id: 'm1' },
            cta: null,
            category: 'feature',
            created_at: new Date().toISOString(),
            unread: true,
          },
        ],
        unread_count: 1,
      }),
    });
  });
}

const media = (page: Page) => page.locator('flowise-chatbot').locator('[data-testid="announcement-media"]');

async function open(page: Page) {
  await page.goto('/index.html');
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();
}

test('a relative media url resolves against the API host, not the page', async ({ page }) => {
  await stubWithMedia(page, '/api/announcements/media/m1');
  await open(page);

  // Attached, not visible: the resolved host need not be serving for this assertion.
  // Requiring visibility would test whether the image LOADS, which is a different claim.
  await expect(media(page)).toBeAttached({ timeout: 15_000 });
  const src = await media(page).getAttribute('src');
  expect(src).toContain('/api/announcements/media/m1');
  expect(src).not.toBe('/api/announcements/media/m1');
  expect(src!.startsWith('http')).toBe(true);
});

test('an absolute external url passes through unchanged', async ({ page }) => {
  await stubWithMedia(page, 'https://cdn.example.com/x.png');
  await open(page);
  await expect(media(page)).toHaveAttribute('src', 'https://cdn.example.com/x.png', { timeout: 15_000 });
});
