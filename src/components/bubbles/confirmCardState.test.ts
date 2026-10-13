import { describe, expect, it } from 'vitest';
import { confirmCardState, localExpiresAt, msUntilExpiry, resolveOutcomeAction } from './confirmCardState';

// Live regression 2026-10-13 B14: after the server's 50 s timeout the card kept live Approve/Cancel buttons, and a
// click on it (answered 410 Gone) showed "Cancelled" as if it had worked.
const EXPIRES = '2026-10-13T05:12:19.369Z';
const at = (iso: string) => Date.parse(iso);

describe('confirmCardState', () => {
  it('is open before expires_at', () => {
    expect(confirmCardState({ expires_at: EXPIRES }, at('2026-10-13T05:12:00Z'))).toBe('open');
  });

  it('is expired at and after expires_at', () => {
    expect(confirmCardState({ expires_at: EXPIRES }, at(EXPIRES))).toBe('expired');
    expect(confirmCardState({ expires_at: EXPIRES }, at('2026-10-13T06:00:00Z'))).toBe('expired');
  });

  it('keeps the user answer given before expiry', () => {
    const later = at('2026-10-13T06:00:00Z');
    expect(confirmCardState({ expires_at: EXPIRES, submitted_action: 'approve' }, later)).toBe('approved');
    expect(confirmCardState({ expires_at: EXPIRES, submitted_action: 'cancel' }, later)).toBe('cancelled');
  });

  it('shows a server-rejected answer as expired', () => {
    expect(confirmCardState({ submitted_action: 'expired' }, at(EXPIRES))).toBe('expired');
  });

  it('stays open without a usable expires_at (older servers)', () => {
    expect(confirmCardState({}, at(EXPIRES))).toBe('open');
    expect(confirmCardState({ expires_at: 'not a date' }, at(EXPIRES))).toBe('open');
  });
});

describe('msUntilExpiry', () => {
  it('counts down to expires_at, never below zero', () => {
    expect(msUntilExpiry({ expires_at: EXPIRES }, at(EXPIRES) - 1500)).toBe(1500);
    expect(msUntilExpiry({ expires_at: EXPIRES }, at(EXPIRES) + 10)).toBe(0);
  });

  it('is null without expires_at', () => {
    expect(msUntilExpiry({}, 0)).toBeNull();
  });
});

describe('resolveOutcomeAction', () => {
  it('marks the card expired when the server answers 410 Gone', () => {
    expect(resolveOutcomeAction(410)).toBe('expired');
  });

  it('keeps the user answer when the server accepted it', () => {
    expect(resolveOutcomeAction(200)).toBe('keep');
  });

  it('reopens the card when the answer did not go through', () => {
    expect(resolveOutcomeAction(500)).toBe('reopen');
    expect(resolveOutcomeAction(403)).toBe('reopen');
    expect(resolveOutcomeAction(null)).toBe('reopen');
  });
});

describe('localExpiresAt', () => {
  const arrived = at('2026-10-13T05:11:30Z');

  it('counts the seconds left from when the card arrived', () => {
    expect(localExpiresAt(49.5, EXPIRES, arrived)).toBe('2026-10-13T05:12:19.500Z');
  });

  it("falls back to the server's expires_at", () => {
    expect(localExpiresAt(undefined, EXPIRES, arrived)).toBe(EXPIRES);
    expect(localExpiresAt(undefined, undefined, arrived)).toBeUndefined();
  });
});
