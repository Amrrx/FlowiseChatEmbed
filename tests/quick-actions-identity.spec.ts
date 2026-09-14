import { test, expect, Page } from '@playwright/test';

/**
 * Identity and submission behaviour for the quick-actions row (design §7.2-§7.4).
 *
 * Uses the FULL-page harness: /index.html sets `autoOpen: false`, so Bot never
 * mounts there and every assertion below would be vacuous.
 */

const ACTIONS = { actions: [{ id: 'a', label: 'Fleet health', payload: 'do a' }] };

async function stubActions(page: Page): Promise<Record<string, string>[]> {
  const seen: Record<string, string>[] = [];
  await page.route('**/api/quick_actions*', async (route) => {
    seen.push(route.request().headers());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIONS) });
  });
  return seen;
}

test('the fetch carries user, agent and token headers', async ({ page }) => {
  const seen = await stubActions(page);
  await page.goto('/test-full-agui.html');

  await expect.poll(() => seen.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(seen[0]['x-user-id']).toBe('test-user');
  expect(seen[0]['x-agent-id']).toBe('test-agent');
  expect(seen[0]['x-user-token']).toBe('test-token');
});

test('the fetch is scoped to the current user', async ({ page }) => {
  const seen = await stubActions(page);
  await page.goto('/test-full-agui.html?userId=someone-else');

  await expect.poll(() => seen.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(seen[0]['x-user-id']).toBe('someone-else');
});

test('buttons are disabled once the composer holds a draft', async ({ page }) => {
  await stubActions(page);
  await page.goto('/test-full-agui.html');

  const button = page.getByRole('button', { name: 'Fleet health' });
  await expect(button).toBeEnabled({ timeout: 15_000 });

  const composer = page.locator('textarea').first();
  await composer.fill('hello');
  await expect(button).toBeDisabled();

  await composer.fill('');
  await expect(button).toBeEnabled();
});

test('clicking a button submits the payload, not the label', async ({ page }) => {
  await stubActions(page);
  const sent: string[] = [];
  await page.route('**/chat/**', async (route) => {
    const body = route.request().postDataJSON();
    sent.push(body?.question ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: 'ok' }) });
  });

  await page.goto('/test-full-agui.html');
  const button = page.getByRole('button', { name: 'Fleet health' });
  await expect(button).toBeEnabled({ timeout: 15_000 });
  await button.click();

  await expect.poll(() => sent.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(sent[0]).toBe('do a');
  // The label must never be what reaches the model.
  expect(sent[0]).not.toBe('Fleet health');
});

/**
 * NOT COVERED HERE: the generation/epoch invalidation race — a reply already on the
 * wire when identity changes must not write into the next identity's list. The demo
 * harness derives userId from a query param at load, so it offers no in-page identity
 * switch to drive that transition. Covering it needs either a harness that can re-init
 * with a new userId, or a unit-level test of the controller.
 */
