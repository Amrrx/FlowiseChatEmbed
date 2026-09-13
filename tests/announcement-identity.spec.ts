import { test, expect, Page } from '@playwright/test';

/**
 * The announcements fetch must carry the agent id and token, like /stream and
 * /chat already do (design §6.6). Without the agent id an agent-scoped
 * announcement cannot be resolved, and the badge on a closed bubble would be
 * answered from the user alone.
 */

async function captureHeaders(page: Page): Promise<Record<string, string>[]> {
  const seen: Record<string, string>[] = [];
  await page.route('**/api/announcements*', async (route) => {
    seen.push(route.request().headers());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ announcements: [], unread_count: 0 }),
    });
  });
  return seen;
}

test('the announcements fetch carries user, agent and token headers', async ({ page }) => {
  const seen = await captureHeaders(page);
  await page.goto('/index.html');

  await expect.poll(() => seen.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(seen[0]['x-user-id']).toBeTruthy();
  expect(seen[0]['x-agent-id']).toBeTruthy();
  expect(seen[0]['x-user-token']).toBeTruthy();
});

test('the agent id matches the configured agent, not the chatflow id', async ({ page }) => {
  const seen = await captureHeaders(page);
  await page.goto('/index.html');

  await expect.poll(() => seen.length, { timeout: 15_000 }).toBeGreaterThan(0);
  // public/index.html sets agentId: "avl-agent" alongside a different chatflowid,
  // so this pins the `props.agentId ?? props.chatflowid` precedence.
  expect(seen[0]['x-agent-id']).toBe('avl-agent');
});
