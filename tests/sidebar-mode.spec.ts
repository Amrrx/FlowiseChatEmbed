import { test, expect, Page } from '@playwright/test';

/**
 * Bubble sidebar layout mode and host-controlled launcher:
 *   - layout:'sidebar' docks the panel to the right edge and emits
 *     'flowise-sidebar-toggle' so the host can push its own layout aside.
 *   - The docked width is clamped, so the host's margin always matches the panel.
 *   - hideLauncher suppresses the built-in button; the host drives 'flowise-toggle'.
 *   - Theme reads stay reactive across a repeat init().
 *
 * The host page is served from a route intercept, so these need no backend and
 * no fixture file in public/.
 */

const HOST_PAGE = (theme: unknown) => `<!doctype html>
<html><head><meta charset="utf-8"><title>host</title>
<style>body{margin:0;transition:none}</style></head>
<body>
  <div id="content">host content</div>
  <button id="trigger">Ask</button>
  <script type="module">
    import Chatbot from './web.js';
    window.__events = [];
    document.addEventListener('flowise-sidebar-toggle', (e) => {
      window.__events.push(e.detail);
      document.body.style.marginRight = e.detail.open ? e.detail.width + 'px' : '0px';
    });
    Chatbot.init({ chatflowid: 'sidebar-spec', apiHost: 'http://127.0.0.1:9999', theme: ${JSON.stringify(theme)} });
    document.getElementById('trigger').onclick = () =>
      document.querySelector('flowise-chatbot').dispatchEvent(new CustomEvent('flowise-toggle'));
    window.Chatbot = Chatbot;
    window.__ready = true;
  </script>
</body></html>`;

async function loadHost(page: Page, theme: unknown) {
  await page.route('**/sidebar-host.html', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: HOST_PAGE(theme) });
  });
  await page.goto('/sidebar-host.html');
  await page.waitForFunction(() => (window as never as { __ready: boolean }).__ready === true);
  await page.waitForSelector('[part="bot"]', { state: 'attached' });
}

const panel = (page: Page) => page.locator('[part="bot"]');
const launcher = (page: Page) => page.locator('[part="button"]');

/** Panel geometry read from the shadow root, viewport-relative and scroll-independent. */
const panelRect = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('flowise-chatbot')!.shadowRoot!.querySelector('[part="bot"]')!;
    const r = el.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), viewport: window.innerWidth };
  });

/** Waits out the 250ms slide so geometry is measured settled, not mid-transition. */
async function openAndSettle(page: Page, via: 'launcher' | 'host' = 'launcher') {
  await (via === 'launcher' ? launcher(page) : page.locator('#trigger')).click();
  await expect(panel(page)).toHaveCSS('opacity', '1');
  await expect(panel(page)).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
}

const SIDEBAR = { chatWindow: { layout: 'sidebar', showTitle: true, title: 'T' } };

test('floating layout is unaffected by the sidebar option', async ({ page }) => {
  await loadHost(page, {});
  await expect(panel(page)).toHaveCSS('opacity', '0');
  await launcher(page).click();
  await expect(panel(page)).toHaveCSS('opacity', '1');
  await expect(panel(page)).toHaveCSS('border-top-left-radius', '20px');
  expect(await page.evaluate(() => getComputedStyle(document.body).marginRight)).toBe('0px');
});

test('sidebar docks flush to the right edge at full height with square corners', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadHost(page, SIDEBAR);
  await openAndSettle(page);

  const rect = await panelRect(page);
  expect(rect.width).toBe(400);
  expect(rect.height).toBe(800);
  expect(rect.right).toBe(rect.viewport);
  await expect(panel(page)).toHaveCSS('border-top-left-radius', '0px');
});

test('host receives an open event whose width matches the rendered panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadHost(page, { chatWindow: { layout: 'sidebar', width: 520 } });
  await openAndSettle(page);

  const rect = await panelRect(page);
  const events = await page.evaluate(() => (window as never as { __events: { open: boolean; width: number }[] }).__events);
  expect(events.filter((e) => e.open).pop()!.width).toBe(rect.width);
  await expect(page.locator('body')).toHaveCSS('margin-right', `${rect.width}px`);
});

test('an out-of-range width is clamped and still matches what the host is told', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadHost(page, { chatWindow: { layout: 'sidebar', width: -100 } });
  await openAndSettle(page);

  const rect = await panelRect(page);
  expect(rect.width).toBe(240); // minSidebarWidth
  await expect(page.locator('body')).toHaveCSS('margin-right', '240px');
});

test('destroy() releases the host margin instead of leaving the page indented', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadHost(page, SIDEBAR);
  await openAndSettle(page);
  await expect(page.locator('body')).toHaveCSS('margin-right', '400px');

  await page.evaluate(() => (window as never as { Chatbot: { destroy: () => void } }).Chatbot.destroy());
  await expect(page.locator('body')).toHaveCSS('margin-right', '0px');
});

test('sidebar falls back to the floating overlay below the breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadHost(page, SIDEBAR);
  await openAndSettle(page);
  await expect(panel(page)).toHaveCSS('border-top-left-radius', '0px');

  await page.setViewportSize({ width: 700, height: 800 });
  await expect(panel(page)).toHaveCSS('border-top-left-radius', '20px');
  await expect(page.locator('body')).toHaveCSS('margin-right', '0px');
});

test('a repeat init() repaints the panel instead of keeping the first theme', async ({ page }) => {
  await loadHost(page, {});
  await launcher(page).click();
  await expect(panel(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.evaluate(() =>
    (window as never as { Chatbot: { init: (o: unknown) => void } }).Chatbot.init({
      chatflowid: 'sidebar-spec',
      apiHost: 'http://127.0.0.1:9999',
      theme: { chatWindow: { backgroundColor: '#ff0000' } },
    }),
  );
  await expect(panel(page)).toHaveCSS('background-color', 'rgb(255, 0, 0)');
});

test('hideLauncher removes the built-in button and the host drives the panel', async ({ page }) => {
  await loadHost(page, { button: { hideLauncher: true }, chatWindow: { layout: 'sidebar' } });
  await expect(launcher(page)).toHaveCount(0);
  await expect(panel(page)).toHaveCSS('opacity', '0');

  await openAndSettle(page, 'host');
  await page.locator('#trigger').click();
  await expect(panel(page)).toHaveCSS('opacity', '0');
});

test('autoWindowOpen still fires when the launcher is hidden', async ({ page }) => {
  await loadHost(page, { button: { hideLauncher: true, autoWindowOpen: { autoOpen: true, openDelay: 1 } } });
  await expect(panel(page)).toHaveCSS('opacity', '0');
  await expect(panel(page)).toHaveCSS('opacity', '1', { timeout: 5_000 });
});

test('the disclaimer keeps its deny button in sidebar mode', async ({ page }) => {
  await loadHost(page, {
    chatWindow: { layout: 'sidebar' },
    disclaimer: { title: 'Notice', message: 'Accept?', buttonText: 'Accept', denyButtonText: 'Cancel' },
  });
  await openAndSettle(page);
  await expect(page.locator('flowise-chatbot').getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(page.locator('flowise-chatbot').getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('titleHeight resizes the title bar and the scroll padding that clears it', async ({ page }) => {
  await loadHost(page, { chatWindow: { showTitle: true, title: 'T', titleHeight: 90 } });
  await launcher(page).click();
  await expect(page.locator('.chatbot-chat-view')).toHaveCSS('padding-top', '104px'); // 90 + 14
});

test('themeColor fills in for both the launcher and the send button', async ({ page }) => {
  await loadHost(page, { themeColor: '#7c3aed' });
  await expect(launcher(page)).toHaveCSS('background-color', 'rgb(124, 58, 237)');
  await launcher(page).click();
  const sendBtn = page.locator('flowise-chatbot').locator('button.rounded-full.p-2').last();
  await expect(sendBtn).toHaveCSS('background-color', 'rgb(124, 58, 237)');
});
