export type ConfirmCardState = 'open' | 'approved' | 'cancelled' | 'expired';

/** The server answers a resolve for a wait that already ended (timed out or answered elsewhere) with 410 Gone. */
const RESOLVE_GONE_STATUS = 410;

const expiresAtMs = (data: Record<string, unknown>): number | null => {
  const parsed = typeof data.expires_at === 'string' ? Date.parse(data.expires_at) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
};

/** What an approval card shows: the user's answer, or "expired" once the server stopped waiting. */
export const confirmCardState = (data: Record<string, unknown>, nowMs: number): ConfirmCardState => {
  const answered = data.submitted_action;
  if (answered === 'approve') return 'approved';
  if (answered === 'cancel') return 'cancelled';
  if (answered === 'expired') return 'expired';
  const expiresAt = expiresAtMs(data);
  return expiresAt !== null && nowMs >= expiresAt ? 'expired' : 'open';
};

/** Milliseconds until the card expires (0 when already past), or null when the server sent no expiry. */
export const msUntilExpiry = (data: Record<string, unknown>, nowMs: number): number | null => {
  const expiresAt = expiresAtMs(data);
  return expiresAt === null ? null : Math.max(0, expiresAt - nowMs);
};

/**
 * The card answer to record after the server's reply to a resolve (null = no reply, e.g. a network error):
 * keep the user's answer when it was accepted, "expired" when the wait already ended, otherwise reopen the card
 * so the user can answer again while it is still open.
 */
export const resolveOutcomeAction = (status: number | null): 'keep' | 'expired' | 'reopen' => {
  if (status === RESOLVE_GONE_STATUS) return 'expired';
  return status !== null && status >= 200 && status < 300 ? 'keep' : 'reopen';
};

/** The absolute expiry the widget uses: the server's seconds-left counted from arrival, else its expires_at. */
export const localExpiresAt = (expiresInS: unknown, expiresAt: unknown, arrivedAtMs: number): string | undefined => {
  if (typeof expiresInS === 'number' && Number.isFinite(expiresInS)) return new Date(arrivedAtMs + expiresInS * 1000).toISOString();
  return typeof expiresAt === 'string' ? expiresAt : undefined;
};
