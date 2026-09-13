import { test, expect, Page } from '@playwright/test';

/**
 * Markdown parity, embed side (design §5.1). Cases 1-7 byte-equal against the
 * canonical fixture; case 8 structural because attribute order is not
 * guaranteed across DOM implementations.
 *
 * The overlay renders the body, so this asserts what a customer actually sees
 * rather than the function in isolation.
 *
 * Fixture: mosaad_mcp/docs/announcement-markdown-fixture.md
 */

const FIXTURE = [
  ['**bold**', '<p><strong>bold</strong></p>'],
  ['> Important update', '<blockquote>\n<p>Important update</p>\n</blockquote>'],
  ['`<tag>`', '<p><code>&lt;tag&gt;</code></p>'],
  ['<strong>hi</strong>', '<p>&lt;strong&gt;hi&lt;/strong&gt;</p>'],
  ['### Sub heading', '<h3>Sub heading</h3>'],
  ['# Big heading', 'Big heading'],
  ['- one\n- two', '<ul>\n<li>one</li>\n<li>two</li>\n</ul>'],
] as const;

async function stubAnnouncement(page: Page, body: string) {
  await page.route('**/api/announcements*', async (route) => {
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
            announcement_id: 'fixture-1',
            title: 'Fixture',
            body,
            media: null,
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

const bodyLocator = (page: Page) => page.locator('flowise-chatbot').locator('[data-testid="announcement-body"]').first();

async function openOverlay(page: Page) {
  await page.goto('/index.html');
  // The overlay auto-opens on the chat-open edge when something is unread.
  await page.locator('flowise-chatbot').locator('button[part="button"]').click();
}

for (const [input, expected] of FIXTURE) {
  test(`renders ${JSON.stringify(input)} identically to the fixture`, async ({ page }) => {
    await stubAnnouncement(page, input);
    await openOverlay(page);

    await expect(bodyLocator(page)).toBeVisible({ timeout: 15_000 });
    const html = await bodyLocator(page).innerHTML();
    expect(html.trim()).toBe(expected);
  });
}

test('renders a link with target and rel', async ({ page }) => {
  await stubAnnouncement(page, '[link](https://x.com)');
  await openOverlay(page);

  const anchor = bodyLocator(page).locator('a');
  await expect(anchor).toHaveAttribute('href', 'https://x.com', { timeout: 15_000 });
  await expect(anchor).toHaveAttribute('target', '_blank');
  await expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
});

/**
 * Rendered markdown must actually be *styled*, not merely correct HTML.
 *
 * Tailwind Preflight (`@tailwind base`) resets headings to `font-size: inherit` and
 * strips list markers, so without the `.announcement-body` rules a heading rendered
 * at the 13px body size with no bullets — while the operator's panel showed browser
 * defaults. The two surfaces disagreed in opposite directions, so this pins the
 * numbers the panel CSS mirrors.
 */
test('a heading and a list are visibly styled, not Preflight-reset', async ({ page }) => {
  await stubAnnouncement(page, '### Sub heading\n\n- one\n- two');
  await openOverlay(page);
  await expect(bodyLocator(page)).toBeVisible({ timeout: 15_000 });

  const heading = bodyLocator(page).locator('h3');
  await expect(heading).toHaveCSS('font-size', '14px');
  await expect(heading).toHaveCSS('font-weight', '600');

  const list = bodyLocator(page).locator('ul');
  await expect(list).toHaveCSS('list-style-type', 'disc');
  await expect(list).toHaveCSS('padding-left', '20px');
});

/**
 * Inline code must inherit the body's size and colour on both surfaces. The panel's
 * global stylesheet styles `code` as pink at 0.875em, so hardcoding values here
 * would have left the two surfaces looking different while both "passed".
 */
test('inline code inherits body size and colour rather than a global code style', async ({ page }) => {
  await stubAnnouncement(page, 'run `mosaad status` first');
  await openOverlay(page);
  await expect(bodyLocator(page)).toBeVisible({ timeout: 15_000 });

  const code = bodyLocator(page).locator('code');
  await expect(code).toHaveCSS('font-size', '13px');
  await expect(code).toHaveCSS('color', 'rgb(55, 65, 81)');
  await expect(code).toHaveCSS('background-color', 'rgb(243, 244, 246)');
});
