import { test, expect } from '@playwright/test';
import { createServer, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';

// Exercise the built widget over a real streaming socket. Build first with yarn build.
// No dev server, production services, or customer credentials are used.
async function fixture() {
  const bundle = await readFile(new URL('../dist/web.js', import.meta.url));
  const clients = new Set<ServerResponse>();
  let session = '';
  let followups: Record<string, unknown>[] = [];
  let recoveries = 0;
  let connections = 0;
  let reportsEnabled = true;
  let accessDenied = false;
  let runs: Record<string, any>[] = [];
  let hideRuns = false;
  const scope = () => ({ user_id: 'report-test', agent_id: 'avl-agent', session_id: session, environment: 'afaqy.sa' });
  const frame = (event: Record<string, unknown>) => `data: ${JSON.stringify({ ...scope(), ...event })}\n\n`;
  const message = (id: string) => ({
    ...scope(),
    type: 'bot_message',
    message_id: `report:${id}`,
    run_id: id,
    text: `Report ${id} is ready.`,
    action: 'open_reports',
  });
  const emit = (event: Record<string, unknown>) => {
    for (const client of clients) client.write(frame(event));
  };
  const server = createServer((req, res) => {
    const path = new URL(req.url!, 'http://localhost').pathname;
    const json = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (path === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        `<html><body><script type="module">import Chatbot from '/web.js';Chatbot.init({chatflowid:'report-regression',agentId:'avl-agent',apiHost:location.origin+'/core',apiPath:'/chat',protocol:'ag-ui',showWelcomeMessage:false,chatflowConfig:{vars:{userId:'report-test',userToken:'synthetic-token'}},theme:{chatWindow:{title:'Assistant',width:500,height:650}}});</script></body></html>`,
      );
    } else if (path === '/web.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(bundle);
    } else if (path === '/core/stream') {
      session = String(req.headers['x-session-id']);
      connections++;
      clients.add(res);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write(frame({ type: 'ack', pipeline_reports: reportsEnabled }));
      req.on('close', () => clients.delete(res));
    } else if (path === '/core/api/pipeline/runs') {
      if (accessDenied) {
        res.statusCode = 403;
        json({ error: 'forbidden' });
        return;
      }
      json({
        principal: { user_id: 'report-test', environment: 'afaqy.sa' },
        items: hideRuns ? [] : runs,
        total: hideRuns ? 0 : runs.length,
        counts: {},
        server_time: new Date().toISOString(),
      });
    } else if (path.startsWith('/core/api/pipeline/runs/')) {
      json(runs.find((run) => run.run_id === path.split('/').at(-1)));
    } else if (path === '/core/chat/avl-agent') {
      req.resume();
      const run = {
        run_id: 'card-run',
        title: 'Units Inactive 7+ Days',
        status: 'admitted',
        availability: null,
        admitted_at: new Date().toISOString(),
        steps: [],
        result_summary: null,
      };
      runs = [run];
      const events = [
        { type: 'RUN_STARTED' },
        {
          type: 'CUSTOM',
          name: 'entity_card',
          value: {
            card_id: 'report-card',
            type_id: 'entity',
            data: { entity_type: 'pipeline_result', run_id: run.run_id, title: run.title, status: 'admitted' },
            actions: [],
          },
        },
        { type: 'RUN_FINISHED' },
      ];
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''));
    } else if (path === '/core/api/pipeline/followups') {
      recoveries++;
      json({ items: followups, internal_questions: [], next_offset: null });
    } else if (path.includes('/chatmessage')) json([]);
    else json({ items: [], turns: [], actions: [], notifications: [], unread_count: 0, isStreaming: false });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  return {
    url: `http://127.0.0.1:${address.port}`,
    message,
    emit,
    updateRun: (status: string, outsidePage = false) => {
      hideRuns = outsidePage;
      runs = runs.map((run) => ({
        ...run,
        status,
        availability: status === 'ready' ? 'ready' : null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        result_summary: status === 'ready' ? { row_count: 390, column_count: 4, expected_count: 390, complete: true } : null,
      }));
      emit({ type: 'pipeline_changed', run_id: 'card-run' });
    },
    recoveries: () => recoveries,
    connections: () => connections,
    denyAccess: (denied: boolean) => {
      accessDenied = denied;
    },
    persist: (event: Record<string, unknown>) => {
      followups.push(event);
    },
    authorize: (enabled: boolean) => {
      reportsEnabled = enabled;
      emit({ type: 'ack', pipeline_reports: enabled });
    },
    reconnect: () => {
      for (const client of clients) client.end();
    },
    close: async () => {
      for (const client of clients) client.end();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    },
  };
}

let backend: Awaited<ReturnType<typeof fixture>>;
test.beforeEach(async ({ page }) => {
  backend = await fixture();
  await page.goto(backend.url);
  await page.locator('[part="button"]').click();
  await expect(page.getByRole('button', { name: 'Reports', exact: true })).toBeVisible();
  await expect.poll(backend.recoveries).toBeGreaterThan(0);
});
test.afterEach(async () => {
  await backend.close();
});

test('completion arrives with Reports closed; duplicate and foreign events are excluded', async ({ page }) => {
  const completion = backend.message('live');
  // Empty recovery endpoint proves that the live SSE event itself renders.
  backend.emit(completion);
  await expect(page.getByText(completion.text, { exact: true })).toBeVisible();
  await expect(page.locator('.reports-panel')).toHaveCount(0);
  backend.emit(completion);
  for (const wrongScope of [{ user_id: 'other' }, { agent_id: 'other' }, { session_id: 'other' }, { environment: 'afaqy.om' }]) {
    backend.emit({ ...completion, ...wrongScope, message_id: 'foreign', text: 'Foreign report' });
  }
  const barrier = backend.message('barrier');
  backend.emit(barrier);
  await expect(page.getByText(barrier.text, { exact: true })).toBeVisible();
  await expect(page.getByText(completion.text, { exact: true })).toHaveCount(1);
  await expect(page.getByText('Foreign report', { exact: true })).toHaveCount(0);
});

test('hidden widget buffers completion; reconnect recovers without opening Reports', async ({ page }) => {
  await page.locator('[part="button"]').click();
  const hidden = backend.message('hidden');
  backend.emit(hidden);
  backend.emit(hidden);
  await expect(page.locator('button[part="button"] > div').filter({ hasText: /^1$/ })).toBeVisible();
  await page.locator('[part="button"]').click();
  await expect(page.getByText(hidden.text, { exact: true })).toBeVisible();
  await expect(page.getByText(hidden.text, { exact: true })).toHaveCount(1);
  const recovered = backend.message('reconnected');
  backend.persist(recovered);
  const connections = backend.connections();
  backend.reconnect();
  await expect.poll(backend.connections).toBeGreaterThan(connections);
  await expect(page.getByText(recovered.text, { exact: true })).toBeVisible();
  await expect(page.locator('.reports-panel')).toHaveCount(0);
});

test('disabled report access hides events; reauthorization recovers persisted completion once', async ({ page }) => {
  backend.authorize(false);
  await expect(page.getByRole('button', { name: 'Reports', exact: true })).toHaveCount(0);
  const completion = backend.message('restored');
  backend.persist(completion);
  backend.emit(completion);
  // A normal chat event is a processing barrier for the preceding report event.
  backend.emit({ type: 'bot_message', text: 'Access is disabled.' });
  await expect(page.getByText('Access is disabled.', { exact: true })).toBeVisible();
  await expect(page.getByText(completion.text, { exact: true })).toHaveCount(0);
  // Coalesce ACK and a duplicate completion on the same socket turn.
  backend.authorize(true);
  backend.emit(completion);
  await expect(page.getByText(completion.text, { exact: true })).toBeVisible();
  await expect(page.getByText(completion.text, { exact: true })).toHaveCount(1);
  await expect(page.locator('.reports-panel')).toHaveCount(0);
});

test('API denial drops live completion safely; stream reconnect restores it from the authorized server', async ({ page }) => {
  backend.denyAccess(true);
  backend.emit({ type: 'pipeline_changed', run_id: 'denied' });
  await expect(page.getByRole('button', { name: 'Reports', exact: true })).toHaveCount(0);
  const completion = backend.message('authorized-again');
  backend.persist(completion);
  // Stream ACK still permits reports: this reaches Bot's reports.enabled() guard.
  backend.emit(completion);
  backend.emit({ type: 'bot_message', text: 'Report API refused access.' });
  await expect(page.getByText('Report API refused access.', { exact: true })).toBeVisible();
  await expect(page.getByText(completion.text, { exact: true })).toHaveCount(0);
  backend.denyAccess(false);
  backend.reconnect();
  await expect(page.getByText(completion.text, { exact: true })).toBeVisible();
  await expect(page.getByText(completion.text, { exact: true })).toHaveCount(1);
  await expect(page.locator('.reports-panel')).toHaveCount(0);
});

for (const outsidePage of [false, true]) {
  test(`submission card follows authoritative status with Reports closed (outside page: ${outsidePage})`, async ({ page }, testInfo) => {
    const input = page.getByRole('textbox');
    await input.fill('Generate the inactive units report');
    await input.press('Enter');
    const card = page.locator('div.rounded-lg').filter({ has: page.getByText('Units Inactive 7+ Days', { exact: true }) });
    await expect(card.getByText('Queued', { exact: true })).toBeVisible();
    backend.updateRun('running', outsidePage);
    await expect(card.getByText('running', { exact: true })).toBeVisible();
    backend.updateRun('ready', outsidePage);
    backend.emit(backend.message('card-run'));
    await expect(page.getByText('Report card-run is ready.', { exact: true })).toBeVisible();
    await expect(card.getByText('Complete', { exact: true })).toBeVisible();
    await expect(card.getByText('390', { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Download Excel', exact: true })).toBeEnabled();
    await expect(card.getByText('Queued', { exact: true })).toHaveCount(0);
    await expect(page.locator('.reports-panel')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('report-card-ready.png') });
  });
}

for (const terminal of ['failed', 'cancelled']) {
  test(`submission card shows ${terminal} without offering a download`, async ({ page }) => {
    await page.getByRole('textbox').fill('Generate a report');
    await page.getByRole('textbox').press('Enter');
    const card = page.locator('div.rounded-lg').filter({ has: page.getByText('Units Inactive 7+ Days', { exact: true }) });
    await expect(card.getByText('Queued', { exact: true })).toBeVisible();
    backend.updateRun(terminal, true);
    await expect(card.getByText(terminal, { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Download Excel', exact: true })).toHaveCount(0);
    await expect(card.getByText('Queued', { exact: true })).toHaveCount(0);
  });
}
