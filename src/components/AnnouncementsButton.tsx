import { createSignal, createEffect, on, onMount, onCleanup, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Announcement, fetchActiveAnnouncements, markAnnouncementsRead } from '@/api/announcements';
import { renderAnnouncementBody, resolveMediaUrl } from './announcementMarkdown';

export type AnnouncementsController = {
  announcements: () => Announcement[];
  unreadCount: () => number;
  refresh: () => Promise<void>;
  markRead: (ids: string[]) => void;
};

type ControllerOpts = {
  apiHost: () => string;
  userId: () => string;
  /** Agent-scoped announcements mean the badge is per-agent, so this is part of the key. */
  agentId: () => string;
  userToken: () => string;
  registerStreamHandler: (handler: (event: any) => void) => () => void;
};

/**
 * Announcement data source: fetches active announcements, refreshes on live
 * `announcement` frames, and marks-read. Instantiate ONCE at the level that
 * needs the unread signal — the Bubble owns it so the closed launcher can react
 * before the chat (and its header button) is ever mounted. AnnouncementsButton
 * falls back to a component-local instance when no controller is injected
 * (Full / popup modes, which have no separate launcher).
 */
export const createAnnouncements = (opts: ControllerOpts): AnnouncementsController => {
  const [announcements, setAnnouncements] = createSignal<Announcement[]>([]);
  const unreadCount = () => announcements().filter((a) => a.unread).length;

  const identity = () => ({
    apiHost: opts.apiHost(),
    userId: opts.userId(),
    agentId: opts.agentId(),
    userToken: opts.userToken(),
  });

  // Two counters, answering two different questions.
  //
  // `generation` orders concurrent fetches: two can settle out of order, and only
  // the newest may install.
  //
  // `epoch` is bumped when the identity changes, and invalidates EVERYTHING in
  // flight. It is separate because a request that completes after a user switch is
  // not merely stale — it belongs to a different person. Without it, user A's
  // delayed mark-read success lands in user B's confirmed set, and an outstanding
  // GET can repopulate a list that logout just cleared. A generation check alone
  // cannot catch the logout case: `refresh` returns early when the user id is
  // empty, so it never bumps generation and the in-flight fetch still looks newest.
  let generation = 0;
  let epoch = 0;

  /** Disown every request in flight — called on any identity change. */
  const invalidate = () => {
    epoch += 1;
    generation += 1;
  };

  // Local read knowledge, deliberately in TWO sets. A single set overriding every
  // fetch would make a FAILED mark-read permanent on screen: the badge clears, the
  // POST 500s, and no refresh could ever restore it — the user silently loses an
  // announcement. `pending` is an optimistic guess and is droppable; `confirmed` is
  // a server fact. Both are scoped to the user and cleared on identity change,
  // because read-state is per-person and inheriting a previous person's set would
  // suppress announcements the new user has never seen.
  const pendingReads = new Set<string>();
  const confirmedReads = new Set<string>();

  const applyLocalReads = (rows: Announcement[]): Announcement[] =>
    rows.map((a) => (pendingReads.has(a.announcement_id) || confirmedReads.has(a.announcement_id) ? { ...a, unread: false } : a));

  const refresh = async () => {
    if (!opts.userId()) return;
    const mine = ++generation;
    const myEpoch = epoch;
    try {
      const res = await fetchActiveAnnouncements(identity());
      if (myEpoch !== epoch || mine !== generation) return;
      setAnnouncements(applyLocalReads(res.announcements));
    } catch (err) {
      console.warn('[Announcements] fetch failed:', err);
    }
  };

  const markRead = (ids: string[]) => {
    if (ids.length === 0) return;
    // optimistic clear + persist — updates the one shared signal, so the header
    // badge and the bubble motion both settle together.
    ids.forEach((id) => pendingReads.add(id));
    setAnnouncements((prev) => applyLocalReads(prev));

    const myEpoch = epoch;
    const settle = (ok: boolean) => {
      // A different person owns this controller now — this result is not theirs.
      if (myEpoch !== epoch) return;
      ids.forEach((id) => pendingReads.delete(id));
      if (ok) {
        ids.forEach((id) => confirmedReads.add(id));
        return;
      }
      // The write did not land — drop the guess and let the server decide.
      void refresh();
    };
    void markAnnouncementsRead(identity(), ids).then(settle, () => settle(false));
  };

  onMount(() => {
    void refresh();
    const unregister = opts.registerStreamHandler((event) => {
      if (event?.type === 'announcement') void refresh();
      // Another tab (any agent) marked these read. Clear locally and idempotently —
      // self-delivery is harmless — without a refetch.
      if (event?.type === 'announcement_read') {
        (event.announcement_ids ?? []).forEach((id: string) => confirmedReads.add(id));
        setAnnouncements((prev) => applyLocalReads(prev));
      }
    });
    onCleanup(unregister);
  });

  // A session that switches user or agent must not keep showing the previous
  // identity's announcements. `defer: true` so this does not double the mount fetch.
  createEffect(
    on(
      () => `${opts.userId()}|${opts.agentId()}`,
      () => {
        // Invalidate BEFORE clearing, so a reply already on the wire cannot write
        // into the list we are about to hand to the next identity. This runs even
        // when the new user id is empty (logout), which is the case refresh alone
        // cannot cover.
        invalidate();
        pendingReads.clear();
        confirmedReads.clear();
        setAnnouncements([]);
        void refresh();
      },
      { defer: true },
    ),
  );

  return { announcements, unreadCount, refresh, markRead };
};

type Props = {
  apiHost: string;
  userId: string;
  /** Full / popup modes have no launcher, so the button's own controller needs
   *  these too — without them those modes silently keep the old behaviour. */
  agentId?: string;
  userToken?: string;
  /** Stream handler registrar — lets us light the LED live on an `announcement` frame. */
  registerStreamHandler: (handler: (event: any) => void) => () => void;
  color?: string;
  /**
   * Mount target for the full-viewport overlay. The trigger lives in the chat header,
   * which sits inside a `transform: scale3d` window that traps `position: fixed` to the
   * panel. Portaling to a host node outside that transform lets the overlay cover the
   * whole browser viewport. Falls back to `document.body` when absent.
   */
  overlayMount?: () => HTMLElement | undefined;
  /** Shared data source. When omitted, the button owns a local one (Full / popup). */
  controller?: AnnouncementsController;
  /** Chat open/closed signal. On the closed→open edge, an unread announcement
   *  auto-opens the overlay ("what's new on open"). Bubble mode only. */
  chatOpened?: () => boolean;
};

/**
 * Chat-header button + LED + centered overlay for operator broadcast announcements.
 * Consumes an injected data controller (Bubble owns it) or creates its own; renders
 * the overlay and marks-read on open. Body renders markdown via announcementMarkdown.
 */
export const AnnouncementsButton = (props: Props) => {
  const ctrl =
    props.controller ??
    createAnnouncements({
      apiHost: () => props.apiHost,
      userId: () => props.userId,
      agentId: () => props.agentId ?? '',
      userToken: () => props.userToken ?? '',
      registerStreamHandler: props.registerStreamHandler,
    });

  const [open, setOpen] = createSignal(false);
  const [showEarlier, setShowEarlier] = createSignal(false);
  // ids that were unread at the moment the panel opened — the "New" section.
  // Snapshotted before the optimistic mark-read flips them, so the split stays
  // stable while the panel is open.
  const [newIds, setNewIds] = createSignal<Set<string>>(new Set());

  const unreadCount = ctrl.unreadCount;
  const newAnnouncements = () => ctrl.announcements().filter((a) => newIds().has(a.announcement_id));
  const earlierAnnouncements = () => ctrl.announcements().filter((a) => !newIds().has(a.announcement_id));

  const openOverlay = () => {
    const unreadIds = ctrl
      .announcements()
      .filter((a) => a.unread)
      .map((a) => a.announcement_id);
    setNewIds(new Set(unreadIds));
    setShowEarlier(false);
    setOpen(true);
    ctrl.markRead(unreadIds);
  };

  createEffect(() => {
    if (!open()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  });

  // Auto-open the overlay on the chat's closed→open edge when something is unread.
  // `on(..., { defer: true })` fires only on transitions after mount; the short
  // delay lets the chat window begin opening before the overlay takes the screen.
  createEffect(
    on(
      () => props.chatOpened?.() ?? false,
      (opened, prevOpened) => {
        if (!opened || prevOpened || open() || unreadCount() === 0) return;
        setTimeout(() => {
          if (!open() && unreadCount() > 0) openOverlay();
        }, 350);
      },
      { defer: true },
    ),
  );

  const Card = (p: { a: Announcement }) => (
    <div style={{ padding: '12px 18px 18px', 'border-top': '1px solid #f1f1f4' }}>
      <div style={{ 'font-size': '14px', 'font-weight': '600', 'margin-bottom': '6px' }}>{p.a.title}</div>
      <Show when={p.a.media}>
        <img
          data-testid="announcement-media"
          src={resolveMediaUrl(p.a.media!.url, props.apiHost)}
          alt=""
          style={{ 'max-width': '100%', 'border-radius': '10px', 'margin-bottom': '8px' }}
        />
      </Show>
      <div
        class="announcement-body"
        data-testid="announcement-body"
        style={{ 'font-size': '13px', 'line-height': '1.5', color: '#374151', 'word-break': 'break-word' }}
        innerHTML={renderAnnouncementBody(p.a.body)}
      />
      <Show when={p.a.cta}>
        <a
          href={p.a.cta!.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            'margin-top': '10px',
            padding: '8px 16px',
            background: '#2563eb',
            color: '#fff',
            'border-radius': '8px',
            'font-size': '13px',
            'font-weight': '500',
            'text-decoration': 'none',
          }}
        >
          {p.a.cta!.label}
        </a>
      </Show>
    </div>
  );

  return (
    <>
      <button
        type="button"
        title="Announcements"
        data-testid="announcement-button"
        onClick={openOverlay}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          'align-items': 'center',
          color: props.color || 'currentColor',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 11l18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
        <Show when={unreadCount() > 0}>
          <span
            data-testid="announcement-unread-led"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              'min-width': '15px',
              height: '15px',
              padding: '0 4px',
              'border-radius': '999px',
              background: '#ef4444',
              color: '#fff',
              'font-size': '10px',
              'font-weight': '700',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'box-shadow': '0 0 0 2px rgba(0,0,0,0.15)',
            }}
          >
            {unreadCount()}
          </span>
        </Show>
      </button>

      <Show when={open()}>
        <Portal mount={props.overlayMount?.()}>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: '0',
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'z-index': '2147483000',
              'backdrop-filter': 'blur(2px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                color: '#111827',
                'border-radius': '16px',
                width: 'min(92%, 440px)',
                'max-height': '80vh',
                overflow: 'auto',
                'box-shadow': '0 20px 60px rgba(0,0,0,0.35)',
                'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '16px 18px 8px' }}>
                <span style={{ 'font-size': '15px', 'font-weight': '700' }}>What's new</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', 'font-size': '20px', color: '#6b7280', 'line-height': '1' }}
                >
                  ×
                </button>
              </div>

              <Show
                when={newAnnouncements().length > 0}
                fallback={
                  <div style={{ padding: '28px 18px', 'text-align': 'center', color: '#6b7280', 'font-size': '13px' }}>
                    <div style={{ 'font-size': '22px', 'margin-bottom': '6px' }}>🎉</div>
                    You're all caught up
                  </div>
                }
              >
                <For each={newAnnouncements()}>{(a) => <Card a={a} />}</For>
              </Show>

              <Show when={earlierAnnouncements().length > 0}>
                <button
                  type="button"
                  onClick={() => setShowEarlier((v) => !v)}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '12px 18px',
                    background: '#fafafa',
                    border: 'none',
                    'border-top': '1px solid #f1f1f4',
                    cursor: 'pointer',
                    color: '#6b7280',
                    'font-size': '13px',
                    'font-weight': '600',
                  }}
                >
                  <span style={{ 'font-size': '9px', transform: showEarlier() ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                  {showEarlier() ? 'Hide earlier' : 'Show earlier'} ({earlierAnnouncements().length})
                </button>
                <Show when={showEarlier()}>
                  <For each={earlierAnnouncements()}>{(a) => <Card a={a} />}</For>
                </Show>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};
