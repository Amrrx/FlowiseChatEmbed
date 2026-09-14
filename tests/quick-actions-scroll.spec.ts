import { test, expect, Page } from '@playwright/test';

/**
 * The row hides its scrollbar (.scrollable-container), which leaves a pointer with no
 * way to reach the overflow — touch swipes natively, a mouse has neither a horizontal
 * wheel nor a bar to drag. Wheel-to-horizontal and drag-to-scroll replace it, and a
 * drag must never fire the button it ends on.
 */

const ROW = '[data-testid="quick-actions"]';

// Enough actions to overflow a 420px panel.
const ACTIONS = {
  actions: [
    { id: 'a', label: 'Fleet health', payload: 'do a' },
    { id: 'b', label: 'Offline units', payload: 'do b' },
    { id: 'c', label: 'My units', payload: 'do c' },
    { id: 'd', label: 'Unit groups', payload: 'do d' },
    { id: 'e', label: 'Drivers', payload: 'do e' },
    { id: 'f', label: 'Trailers', payload: 'do f' },
  ],
};

async function ready(page: Page) {
  await page.route('**/api/quick_actions*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIONS) }));
  await page.setViewportSize({ width: 420, height: 700 });
  await page.goto('/test-full-agui.html');
  await expect(page.getByRole('button', { name: 'Fleet health' })).toBeVisible({ timeout: 15_000 });
}

const scrollLeft = (page: Page) => page.locator(ROW).evaluate((el) => el.scrollLeft);

test('the scrollbar is hidden but the row still overflows', async ({ page }) => {
  await ready(page);
  const m = await page.locator(ROW).evaluate((el) => ({
    scrollable: el.scrollWidth > el.clientWidth,
    gutter: (el as HTMLElement).offsetHeight - el.clientHeight,
  }));
  expect(m.scrollable).toBe(true);
  expect(m.gutter).toBe(0); // no scrollbar occupying layout
});

test('wheel over the row scrolls it sideways', async ({ page }) => {
  await ready(page);
  expect(await scrollLeft(page)).toBe(0);
  await page.locator(ROW).hover();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(250);
  expect(await scrollLeft(page)).toBeGreaterThan(0);
});

test('dragging scrolls the row and does not fire the button underneath', async ({ page }) => {
  await ready(page);
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/chat/')) posts.push(r.url());
  });

  const box = await page.getByRole('button', { name: 'Fleet health' }).boundingBox();
  if (!box) throw new Error('quick-action button has no bounding box');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  expect(await scrollLeft(page)).toBeGreaterThan(0);
  expect(posts).toHaveLength(0);
});

test('a plain click still fires the action', async ({ page }) => {
  await ready(page);
  const questions: string[] = [];
  await page.route('**/chat/**', async (route) => {
    try {
      questions.push(route.request().postDataJSON()?.question ?? '');
    } catch {
      /* ignore */
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: 'ok' }) });
  });

  await page.getByRole('button', { name: 'Fleet health' }).click();
  await expect.poll(() => questions.length, { timeout: 15_000 }).toBe(1);
  expect(questions[0]).toBe('do a');
});
