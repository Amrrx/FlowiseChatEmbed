import { test, expect, Page } from '@playwright/test';
import { createServer, Server, ServerResponse } from 'http';

/**
 * #5 — When the Chatbot is destroyed (or the page unmounts), the /stream
 * connection must be closed. Our in-test SSE server tracks active
 * connections; we expect the count to drop to 0 after Chatbot.destroy().
 *
 * This guards the onCleanup lifecycle in useAgUiStream + the abort controller
 * in src/agui/stream.ts. A regression here would leak sockets on the server
 * and HTTP/2 streams on the client.
 */

let sseServer: Server;
let ssePort: number;
let activeResponses: ServerResponse[] = [];

test.beforeAll(async () => {
  sseServer = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
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

async function redirectStreamToTestServer(page: Page) {
  await page.route('**/stream', async (route) => {
    await route.continue({ url: `http://127.0.0.1:${ssePort}/` });
  });
}

test('#5 Chatbot.destroy() closes the /stream connection', async ({ page }) => {
  await stubNotifications(page);
  await redirectStreamToTestServer(page);

  await page.goto('/test-full-agui.html');

  // Wait for the stream to connect (active connection count = 1).
  await expect.poll(() => activeResponses.length, { timeout: 10_000 }).toBe(1);

  // Destroy the chatbot — this removes the custom element, triggering Solid's
  // onCleanup → disconnectStream() → abortController.abort().
  await page.evaluate(() => {
    (window as any).Chatbot?.destroy?.();
  });

  // Server-side connection must close.
  await expect.poll(() => activeResponses.length, { timeout: 5_000 }).toBe(0);
});
