import { test, expect } from '@playwright/test';

/**
 * Verifies the /stream ownership seam:
 *   - Full mode (Bot-owned) opens exactly one /stream connection.
 *   - Bubble mode (host-owned) opens exactly one /stream connection.
 *   - Non-ag-ui protocol opens zero /stream connections.
 *
 * These tests intercept /stream at the network layer so no backend is needed.
 */

type StreamProbe = {
  count: () => number;
};

async function interceptStream(page: import('@playwright/test').Page): Promise<StreamProbe> {
  let count = 0;
  await page.route('**/stream', async (route) => {
    count += 1;
    // Return an empty-but-valid SSE response so the client opens, reads nothing,
    // and closes cleanly. We only care that the request was made.
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
  return { count: () => count };
}

async function stubNotifications(page: import('@playwright/test').Page) {
  // Hook fires fetchUnreadNotifications on connect; mock it to avoid a real backend call.
  await page.route('**/notifications/unread*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ notifications: [], unread_count: 0 }),
    });
  });
}

test.describe('/stream connection ownership', () => {
  test('Full mode opens /stream when protocol is ag-ui', async ({ page }) => {
    const probe = await interceptStream(page);
    await stubNotifications(page);

    await page.goto('/test-full-agui.html');
    // Give the onMount inside useAgUiStream time to fire.
    await page.waitForTimeout(1500);

    expect(probe.count()).toBe(1);
  });

  test('Bubble mode opens /stream exactly once (regression)', async ({ page }) => {
    const probe = await interceptStream(page);
    await stubNotifications(page);

    await page.goto('/index.html');
    await page.waitForTimeout(1500);

    // Must be 1 — not 0 (broken Bubble) and not 2 (both host AND Bot fired).
    expect(probe.count()).toBe(1);
  });

  test('Full mode does NOT open /stream when protocol is not ag-ui', async ({ page }) => {
    const probe = await interceptStream(page);
    await stubNotifications(page);

    await page.goto('/test-full-agui.html?protocol=legacy');
    await page.waitForTimeout(1500);

    expect(probe.count()).toBe(0);
  });
});
