import { test, expect, Page } from '@playwright/test';
import { createServer, Server, ServerResponse } from 'http';

/**
 * #4 — The connection indicator dot in the chat title bar must reflect the
 * real /stream state: "Connected" when the SSE connection is open, and
 * "Disconnected" before connect / after error.
 *
 * Route /stream requests to a tiny in-process HTTP server that holds the
 * SSE connection open until the test closes it — Playwright's route.fulfill
 * can't stream, so we redirect via route.continue({url}) instead.
 */

let sseServer: Server;
let ssePort: number;
let activeResponses: ServerResponse[] = [];

test.beforeAll(async () => {
  sseServer = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      });
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': keepalive\n\n');
    activeResponses.push(res);
    req.on('close', () => {
      activeResponses = activeResponses.filter((r) => r !== res);
    });
  });
  await new Promise<void>((resolve) => sseServer.listen(0, '127.0.0.1', resolve));
  ssePort = (sseServer.address() as { port: number }).port;
});

test.afterAll(async () => {
  activeResponses.forEach((r) => {
    try {
      r.end();
    } catch {
      /* already closed */
    }
  });
  await new Promise<void>((resolve) => sseServer.close(() => resolve()));
});

async function stubNotifications(page: Page) {
  await page.route('**/api/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ notifications: [], unread_count: 0 }),
    });
  });
}

test('#4 indicator flips to Connected when stream opens, back to Disconnected on close', async ({ page }) => {
  await stubNotifications(page);

  await page.route('**/stream', async (route) => {
    // Redirect the request to our keep-alive server. route.continue({url})
    // lets the browser fetch the body as a real stream (not a buffered fulfill).
    await route.continue({ url: `http://127.0.0.1:${ssePort}/` });
  });

  await page.goto('/test-full-agui.html');

  const indicator = page.locator('flowise-fullchatbot').locator('[title="Connected"], [title="Disconnected"]');

  await expect(indicator).toHaveAttribute('title', 'Connected', { timeout: 10_000 });

  // Close the server-side connection and expect the indicator to flip back.
  activeResponses.forEach((r) => r.end());
  activeResponses = [];

  await expect(indicator).toHaveAttribute('title', 'Disconnected', { timeout: 5_000 });
});
