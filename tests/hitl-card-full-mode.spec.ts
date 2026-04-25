import { test, expect } from '@playwright/test';

/**
 * Verifies the actual user-facing fix: a confirm_card event arriving on
 * /stream in Full mode renders a visible confirmation card in the chat.
 *
 * The /stream endpoint is mocked to emit one confirm_card event and then close.
 */

test.describe('HITL card rendering in Full mode', () => {
  test('confirm_card event from /stream renders a visible card with action buttons', async ({ page }) => {
    const confirmEvent = {
      type: 'confirm_card',
      wait_id: 'wait-123',
      title: 'Delete customer record?',
      message: 'This action cannot be undone.',
      danger: true,
      actions: [
        { action_id: 'approve', label: 'Approve', payload_fields: [] },
        { action_id: 'deny', label: 'Cancel', payload_fields: [] },
      ],
    };

    // Mock /stream to push one SSE event then end.
    await page.route('**/stream', async (route) => {
      const body = `data: ${JSON.stringify(confirmEvent)}\n\n`;
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
        body,
      });
    });

    await page.route('**/notifications/unread*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ notifications: [], unread_count: 0 }),
      });
    });

    await page.goto('/test-full-agui.html');

    // Full mode renders inside a shadow DOM owned by <flowise-fullchatbot>.
    // We pierce into it via Playwright's locator (which traverses open shadow roots).
    const host = page.locator('flowise-fullchatbot');

    // Assert the card title appears (this proves the /stream handler fired,
    // the event was parsed as a confirm_card, and the bubble rendered).
    await expect(host.getByText('Delete customer record?')).toBeVisible({ timeout: 10_000 });
    await expect(host.getByText('This action cannot be undone.')).toBeVisible();

    // Both action buttons must render.
    await expect(host.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });
});
