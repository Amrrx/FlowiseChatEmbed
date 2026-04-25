import { test, expect, Page } from '@playwright/test';

/**
 * #19–#23 — Interactive rows in NotificationSummaryCard. Each row collapses
 * long content with ellipsis by default, expands on click, and highlights on
 * hover. Rows toggle independently.
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

function makeNotif(id: string, title: string, message: string) {
  return {
    notification_id: id,
    title,
    message,
    level: 'info',
    created_at: new Date().toISOString(),
  };
}

/**
 * Resolve the row element for a given notification by its title text.
 * NotificationSummaryCard rows are clickable divs; we locate the text span
 * and walk up to the row container.
 */
function rowByTitle(page: Page, title: string) {
  return page
    .locator('flowise-fullchatbot')
    .locator('div')
    .filter({ has: page.locator(`span:has-text("${title}")`) })
    .filter({ hasText: /cursor/ }) // narrow to row-level div by style hint
    .first();
}

// Simpler: locate the text span and read its inline style.
function textSpanFor(page: Page, title: string) {
  return page
    .locator('flowise-fullchatbot')
    .locator('span', { has: page.locator('span', { hasText: title }) })
    .filter({ hasText: title })
    .first();
}

const LONG =
  'This is a deliberately long notification message that must exceed the visible width of the row to trigger CSS ellipsis truncation in the collapsed state of the summary card row.';

async function setupSummary(page: Page, notifications: unknown[]) {
  await stubNotifications(page, notifications);
  await emptyStream(page);
  await page.goto('/test-full-agui.html');
  await expect(page.locator('flowise-fullchatbot').getByText(/unread notification/)).toBeVisible({ timeout: 10_000 });
}

// The clickable row: div with cursor: pointer that contains the title.
function clickableRow(page: Page, title: string) {
  return page.locator('flowise-fullchatbot').locator('div[style*="cursor: pointer"]').filter({ hasText: title });
}

test('#19 Row renders collapsed with nowrap + ellipsis by default', async ({ page }) => {
  await setupSummary(page, [makeNotif('n1', 'Long Title', LONG)]);

  const span = page.locator('flowise-fullchatbot').locator('span').filter({ hasText: 'Long Title' }).filter({ hasText: LONG }).first();

  const style = await span.getAttribute('style');
  expect(style).toMatch(/white-space:\s*nowrap/);
  expect(style).toMatch(/text-overflow:\s*ellipsis/);
});

test('#20 Clicking a row expands it (switches to normal wrap)', async ({ page }) => {
  await setupSummary(page, [makeNotif('n1', 'Click Me', LONG)]);

  await clickableRow(page, 'Click Me').click();

  const span = page.locator('flowise-fullchatbot').locator('span').filter({ hasText: 'Click Me' }).filter({ hasText: LONG }).first();

  const style = await span.getAttribute('style');
  expect(style).toMatch(/white-space:\s*normal/);
  expect(style).toMatch(/text-overflow:\s*clip/);
});

test('#21 Clicking an expanded row collapses it back', async ({ page }) => {
  await setupSummary(page, [makeNotif('n1', 'Toggle Row', LONG)]);

  const row = clickableRow(page, 'Toggle Row');
  await row.click(); // expand
  await row.click(); // collapse

  const span = page.locator('flowise-fullchatbot').locator('span').filter({ hasText: 'Toggle Row' }).filter({ hasText: LONG }).first();

  const style = await span.getAttribute('style');
  expect(style).toMatch(/white-space:\s*nowrap/);
});

test('#22 Rows expand independently', async ({ page }) => {
  await setupSummary(page, [makeNotif('n1', 'Row A', LONG), makeNotif('n2', 'Row B', LONG), makeNotif('n3', 'Row C', LONG)]);

  await clickableRow(page, 'Row A').click();
  await clickableRow(page, 'Row C').click();

  const getStyle = async (title: string) => {
    const span = page.locator('flowise-fullchatbot').locator('span').filter({ hasText: title }).filter({ hasText: LONG }).first();
    return await span.getAttribute('style');
  };

  expect(await getStyle('Row A')).toMatch(/white-space:\s*normal/);
  expect(await getStyle('Row B')).toMatch(/white-space:\s*nowrap/);
  expect(await getStyle('Row C')).toMatch(/white-space:\s*normal/);
});

test('#23 Hovering a row highlights it, leaving resets the background', async ({ page }) => {
  await setupSummary(page, [makeNotif('n1', 'Hover Me', 'short msg')]);

  const row = clickableRow(page, 'Hover Me');

  await row.hover();
  await expect.poll(async () => await row.getAttribute('style'), { timeout: 2_000 }).toMatch(/background:\s*(#f1f5f9|rgb\(241,\s*245,\s*249\))/);

  // Move away and verify the background resets.
  await page.mouse.move(0, 0);
  await expect.poll(async () => await row.getAttribute('style'), { timeout: 2_000 }).toMatch(/background:\s*(transparent|rgba?\(0,\s*0,\s*0,\s*0\))/);
});
