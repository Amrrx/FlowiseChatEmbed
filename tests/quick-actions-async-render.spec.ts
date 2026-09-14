import { test, expect } from '@playwright/test';

/**
 * Uses the FULL-page harness, not /index.html: the bubble demo sets
 * `autoOpen: false`, so Bot never mounts there and a spec asserting the row is
 * absent would pass without ever fetching anything — a false green.
 * `initFull` mounts Bot on load.
 */

test('quick actions render when the list arrives after mount', async ({ page }) => {
  // Delayed deliberately: a component that snapshots props at setup renders null
  // forever (design §7.1). The delay IS the assertion — an instant response would
  // pass against a broken component.
  await page.route('**/api/quick_actions*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        actions: [
          { id: 'fleet_health', label: 'Fleet health', payload: 'Run a full fleet health check.' },
          { id: 'offline_units', label: 'Offline units', payload: 'List every unit offline for over 24 hours.' },
        ],
      }),
    });
  });

  await page.goto('/test-full-agui.html');

  await expect(page.getByRole('button', { name: 'Fleet health' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Offline units' })).toBeVisible();
});

test('no row renders when the agent has no actions', async ({ page }) => {
  let fetched = false;
  await page.route('**/api/quick_actions*', (route) => {
    fetched = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ actions: [] }),
    });
  });

  await page.goto('/test-full-agui.html');

  // Prove the fetch actually happened before asserting absence — otherwise this
  // test passes on a chat that never mounted.
  await expect.poll(() => fetched, { timeout: 15_000 }).toBe(true);
  await expect(page.locator('[data-testid="quick-actions"]')).toHaveCount(0);
});

test('no row renders when the fetch fails', async ({ page }) => {
  let fetched = false;
  await page.route('**/api/quick_actions*', (route) => {
    fetched = true;
    return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' });
  });

  await page.goto('/test-full-agui.html');

  await expect.poll(() => fetched, { timeout: 15_000 }).toBe(true);
  // An affordance, not content: a failed fetch shows no row and no error state.
  await expect(page.locator('[data-testid="quick-actions"]')).toHaveCount(0);
});
