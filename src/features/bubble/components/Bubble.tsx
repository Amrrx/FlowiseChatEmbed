import { createSignal, Show, splitProps, onCleanup, onMount, createEffect, on, createMemo } from 'solid-js';
import styles from '../../../assets/index.css';
import { BubbleButton } from './BubbleButton';
import { BubbleParams } from '../types';
import { Bot, BotProps } from '../../../components/Bot';
import Tooltip from './Tooltip';
import { getBubbleButtonSize } from '@/utils';
import { useAgUiStream } from '@/agui/useAgUiStream';
import { createAnnouncements } from '@/components/AnnouncementsButton';
import type { SwitchableLayout } from '@/components/HeaderMenu';
import { colorSchemeStyle, resolveTheme } from '../colorScheme';

const defaultButtonColor = '#00B8D9';
const defaultIconColor = 'white';
// Below this viewport width sidebar mode falls back to the floating overlay —
// a docked panel leaves too little room for the host page on small screens.
const sidebarMinViewportWidth = 768;
const defaultSidebarWidth = 400;
const minSidebarWidth = 240;
const maxSidebarWidth = 600;
// angular-split's vertical gutter grip (5×30 dots), so a host using it can match.
const gripImage =
  'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==)';

export type BubbleProps = BotProps & BubbleParams;

export const Bubble = (props: BubbleProps, { element: hostElement }: { element: HTMLElement }) => {
  const [bubbleProps] = splitProps(props, ['theme']);
  // The theme as rendered: light as given, or with the dark palette applied
  // (see colorScheme.ts). Every theme read below goes through this.
  const theme = createMemo(() => resolveTheme(bubbleProps.theme));

  const [isBotOpened, setIsBotOpened] = createSignal(false);
  const [isBotStarted, setIsBotStarted] = createSignal(false);
  // Set once the visitor opens or closes the panel themselves; suppresses auto-open.
  const [userInteracted, setUserInteracted] = createSignal(false);
  // Anchor for the announcement overlay — sits at the bubble root, outside the
  // chat window's `scale3d` transform, so a fixed overlay covers the full viewport.
  const [announceHost, setAnnounceHost] = createSignal<HTMLDivElement>();
  const [buttonPosition, setButtonPosition] = createSignal({
    bottom: theme()?.button?.bottom ?? 20,
    right: theme()?.button?.right ?? 20,
  });

  const {
    streamConnected,
    notifications,
    initialUnread,
    unreadCount,
    setUnreadCount,
    registerStreamHandler,
    refreshUnread,
    pendingBotMessages,
    consumePendingBotMessages,
  } = useAgUiStream({
    apiHost: () => props.apiHost,
    agentId: () => props.agentId,
    chatflowid: () => props.chatflowid,
    protocol: () => props.protocol,
    chatflowConfig: () => props.chatflowConfig,
    isBotVisible: isBotOpened,
  });

  // Owned here (not in the header button) so the closed launcher can react to an
  // unread announcement before the chat is ever opened. Shared into Bot, so the
  // header button and the bubble motion read one signal.
  const announce = createAnnouncements({
    apiHost: () => props.apiHost ?? '',
    userId: () => ((props.chatflowConfig?.vars as any)?.userId as string) ?? '',
    // Same resolution Bot.tsx uses for its endpoint id.
    agentId: () => props.agentId ?? props.chatflowid ?? '',
    userToken: () => ((props.chatflowConfig?.vars as any)?.userToken as string) ?? '',
    registerStreamHandler,
  });

  const openBot = () => {
    if (!isBotStarted()) setIsBotStarted(true);
    setIsBotOpened(true);
    setUnreadCount(0);
    // Surface anything that arrived while the panel was closed via Path A.
    // Bot stays mounted across open/close, so its internal refresh effect
    // doesn't re-run — call it from here.
    void refreshUnread();
  };

  const closeBot = () => {
    setIsBotOpened(false);
  };

  const toggleBot = () => {
    setUserInteracted(true);
    isBotOpened() ? closeBot() : openBot();
  };

  onCleanup(() => {
    setIsBotStarted(false);
  });

  // Read through functions, never plain consts: `theme` is a reactive prop and
  // init() re-assigns it on an already-mounted element, so a value snapshotted
  // during setup would never repaint.
  const [viewportWidth, setViewportWidth] = createSignal(window.innerWidth);
  onMount(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    onCleanup(() => window.removeEventListener('resize', onResize));
  });

  // A memo, so re-running init() with the same layout (e.g. only the colorScheme
  // changed) does not count as a change and keep the user's own pick.
  const configuredLayout = createMemo(() => theme()?.chatWindow?.layout ?? 'floating');
  // Set by the title bar's layout switcher. Cleared whenever the host re-inits
  // with a different layout, so the host's own choice always wins.
  const [layoutOverride, setLayoutOverride] = createSignal<SwitchableLayout | null>(null);
  createEffect(on(configuredLayout, () => setLayoutOverride(null), { defer: true }));
  const layout = () => layoutOverride() ?? configuredLayout();
  const isSidebarMode = () => layout() === 'sidebar' && viewportWidth() >= sidebarMinViewportWidth;
  // Renders unpositioned, filling whatever box the host placed the element in
  // (see window.ts's init({id}) adoption option) — no launcher, no fixed
  // positioning/transform, opens immediately. Host owns visibility via its own
  // CSS, so there is nothing here for isBotOpened() to gate.
  const isInlineMode = () => layout() === 'inline';
  // Clamped so a misconfigured width can't render a degenerate panel or hand the
  // host a margin that doesn't match what was drawn.
  const sidebarMin = () => theme()?.chatWindow?.sidebarMinWidth ?? minSidebarWidth;
  const sidebarMax = () => theme()?.chatWindow?.sidebarMaxWidth ?? maxSidebarWidth;
  const sidebarWidthKey = () => (props.chatflowid ? `${props.chatflowid}_SIDEBAR_WIDTH` : null);
  const readSidebarWidth = () => {
    const key = sidebarWidthKey();
    if (!key) return null;
    try {
      const value = Number(localStorage.getItem(key));
      return value > 0 ? value : null;
    } catch (e) {
      return null;
    }
  };
  // Only a user drag sets this; until then the theme width (or the default) applies.
  const [draggedSidebarWidth, setDraggedSidebarWidth] = createSignal<number | null>(
    theme()?.chatWindow?.sidebarResizable ? readSidebarWidth() : null,
  );
  const [isSidebarResizing, setIsSidebarResizing] = createSignal(false);
  const sidebarWidth = () =>
    Math.max(sidebarMin(), Math.min(draggedSidebarWidth() ?? theme()?.chatWindow?.width ?? defaultSidebarWidth, sidebarMax(), viewportWidth()));
  const hideLauncher = () =>
    isInlineMode() ||
    (theme()?.button?.hideLauncher ?? false) ||
    (isSidebarMode() && (theme()?.button?.hideLauncherWhenDocked ?? false)) ||
    (isBotOpened() && (theme()?.button?.hideLauncherWhenOpen ?? false));

  // Only floating and sidebar can be switched between; inline is placed by the host.
  const switchableLayout = (): SwitchableLayout | undefined => (isInlineMode() ? undefined : isSidebarMode() ? 'sidebar' : 'floating');
  const switchLayout = (next: SwitchableLayout) => {
    if (next === switchableLayout()) return;
    setLayoutOverride(next);
    document.dispatchEvent(new CustomEvent('flowise-layout-change', { detail: { layout: next } }));
  };

  let sidebarResizeStartX = 0;
  let sidebarResizeStartWidth = 0;
  const onSidebarResizeMove = (e: PointerEvent) => {
    // The panel is anchored to the right edge: dragging its left edge leftward grows it.
    const next = sidebarResizeStartWidth + (sidebarResizeStartX - e.clientX);
    setDraggedSidebarWidth(Math.round(Math.max(sidebarMin(), Math.min(next, sidebarMax()))));
  };
  const onSidebarResizeUp = () => {
    document.removeEventListener('pointermove', onSidebarResizeMove);
    document.removeEventListener('pointerup', onSidebarResizeUp);
    setIsSidebarResizing(false);
    const key = sidebarWidthKey();
    if (!key) return;
    try {
      localStorage.setItem(key, String(sidebarWidth()));
    } catch (e) {
      return;
    }
  };
  const [resizeHandleHover, setResizeHandleHover] = createSignal(false);
  const resizeHandleStyle = () => {
    const handle = theme()?.chatWindow?.sidebarResizeHandle;
    const base = { position: 'absolute' as const, top: '0', bottom: '0', cursor: 'col-resize', 'z-index': 60, 'touch-action': 'none' };
    if (!handle) return { ...base, left: '-3px', width: '6px' };
    const width = handle.width ?? 5;
    const color = handle.color ?? '#eee';
    return {
      ...base,
      left: `-${width}px`,
      width: `${width}px`,
      'background-color': resizeHandleHover() || isSidebarResizing() ? handle.hoverColor ?? color : color,
    };
  };

  const onSidebarResizeDown = (e: PointerEvent) => {
    e.preventDefault();
    sidebarResizeStartX = e.clientX;
    sidebarResizeStartWidth = sidebarWidth();
    setIsSidebarResizing(true);
    document.addEventListener('pointermove', onSidebarResizeMove);
    document.addEventListener('pointerup', onSidebarResizeUp);
  };
  onCleanup(() => {
    document.removeEventListener('pointermove', onSidebarResizeMove);
    document.removeEventListener('pointerup', onSidebarResizeUp);
  });
  const themeColor = () => theme()?.themeColor;

  const backgroundStyle = () => ({
    'background-color': theme()?.chatWindow?.backgroundColor || '#ffffff',
    'background-image': theme()?.chatWindow?.backgroundImage ? `url(${theme()?.chatWindow?.backgroundImage})` : 'none',
    'background-size': 'cover',
    'background-position': 'center',
    'background-repeat': 'no-repeat',
  });

  // Tell the host page how much room the docked panel occupies so it can push its
  // own layout aside — this widget lives in a Shadow DOM custom element and cannot
  // reflow the host by itself. Dispatched on `document` rather than the host
  // element: on teardown the element is already detached, so a bubbling event from
  // it would never reach a document-level listener and the host would stay indented.
  // `resizing` is true while the user drags the sidebar edge, so the host can follow
  // the pointer without easing.
  const emitSidebarState = (open: boolean) => {
    document.dispatchEvent(
      new CustomEvent('flowise-sidebar-toggle', {
        detail: { open, width: open ? sidebarWidth() : 0, resizing: open && isSidebarResizing() },
      }),
    );
  };

  createEffect(() => emitSidebarState(isSidebarMode() && isBotOpened()));
  onCleanup(() => emitSidebarState(false));

  // Inline mode has no launcher/click-to-open affordance of its own — the host
  // controls visibility entirely via its own CSS around this element — so open
  // immediately once mounted rather than waiting for a toggle. Effect (not a
  // seeded signal) because `theme` can be reassigned in place by a repeated
  // host-side init() call (see window.ts), so this self-heals if the 'inline'
  // layout arrives a tick after first render.
  createEffect(() => {
    if (isInlineMode() && !isBotOpened()) openBot();
  });

  // Host-supplied trigger, for embeds that hide the built-in launcher.
  onMount(() => {
    if (!hostElement) return;
    const onExternalToggle = (e: Event) => {
      const open = (e as CustomEvent)?.detail?.open;
      setUserInteracted(true);
      if (open === true) openBot();
      else if (open === false) closeBot();
      else toggleBot();
    };
    hostElement.addEventListener('flowise-toggle', onExternalToggle);
    onCleanup(() => hostElement.removeEventListener('flowise-toggle', onExternalToggle));
  });

  // Owned here rather than in BubbleButton so that hiding the launcher does not
  // silently disable auto-open. Calls openBot() directly — going through
  // toggleBot() would mark the open as a user interaction and suppress itself.
  createEffect(() => {
    if (!theme()?.button?.autoWindowOpen?.autoOpen) return;
    const onMobile = window.innerWidth <= 640;
    if (onMobile && !theme()?.button?.autoWindowOpen?.autoOpenOnMobile) return;

    const delay = (theme()?.button?.autoWindowOpen?.openDelay ?? 2) * 1000;
    const timer = setTimeout(() => {
      if (!isBotOpened() && !userInteracted()) openBot();
    }, delay);
    onCleanup(() => clearTimeout(timer));
  });

  const buttonSize = getBubbleButtonSize(theme()?.button?.size); // Default to 48px if size is not provided
  const buttonBottom = theme()?.button?.bottom ?? 20;
  const chatWindowBottom = buttonBottom + buttonSize + 10; // Adjust the offset here for slight shift
  const windowGap = 10;
  const minChatSize = 300;
  const sizeMargin = 20;

  // A pinned floating window sits at fixed viewport offsets, unfolding from its own
  // bottom-right corner rather than from the launcher.
  const floatingPinned = () => theme()?.chatWindow?.floatingRight !== undefined || theme()?.chatWindow?.floatingBottom !== undefined;
  const pinnedAnchor = () => ({
    right: `${theme()?.chatWindow?.floatingRight ?? 20}px`,
    left: 'auto',
    bottom: `${theme()?.chatWindow?.floatingBottom ?? 20}px`,
    top: 'auto',
    'transform-origin': 'bottom right',
  });

  // Which screen corner the button occupies — the single source of truth for how the
  // window unfolds, where the resize grip sits, and which way a resize drag grows.
  const anchorFlags = () => {
    if (floatingPinned()) return { nearRight: true, nearBottom: true };
    const pos = buttonPosition();
    return {
      nearRight: pos.right + buttonSize / 2 < window.innerWidth / 2,
      nearBottom: pos.bottom + buttonSize / 2 < window.innerHeight / 2,
    };
  };

  // Unfold the chat window from whichever corner the button occupies: upward from a
  // bottom corner, downward from a top corner, and horizontally toward screen center.
  const windowAnchor = () => {
    const pos = buttonPosition();
    const { nearRight, nearBottom } = anchorFlags();
    const buttonTop = window.innerHeight - pos.bottom - buttonSize;
    const buttonLeft = window.innerWidth - pos.right - buttonSize;

    return {
      right: nearRight ? `${Math.max(0, pos.right)}px` : 'auto',
      left: nearRight ? 'auto' : `${Math.max(0, buttonLeft)}px`,
      bottom: nearBottom ? `${pos.bottom + buttonSize + windowGap}px` : 'auto',
      top: nearBottom ? 'auto' : `${buttonTop + buttonSize + windowGap}px`,
      'transform-origin': `${nearBottom ? 'bottom' : 'top'} ${nearRight ? 'right' : 'left'}`,
    };
  };

  // Drag-to-resize: persisted per chatflow, applied on desktop only.
  const sizeStorageKey = () => (props.chatflowid ? `${props.chatflowid}_CHAT_SIZE` : null);

  const readPersistedSize = () => {
    const key = sizeStorageKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number') {
        return { width: parsed.width, height: parsed.height };
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const persistChatSize = (size: { width: number; height: number }) => {
    const key = sizeStorageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(size));
    } catch (e) {
      return;
    }
  };

  const [chatSize, setChatSize] = createSignal<{ width: number; height: number } | null>(readPersistedSize());

  let windowRef: HTMLDivElement | undefined;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartW = 0;
  let resizeStartH = 0;
  let resizeNearRight = true;
  let resizeNearBottom = true;

  const onResizePointerDown = (e: PointerEvent) => {
    if (!windowRef) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = windowRef.getBoundingClientRect();
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartW = rect.width;
    resizeStartH = rect.height;
    const flags = anchorFlags();
    resizeNearRight = flags.nearRight;
    resizeNearBottom = flags.nearBottom;
    document.addEventListener('pointermove', onResizePointerMove);
    document.addEventListener('pointerup', onResizePointerUp);
  };

  const onResizePointerMove = (e: PointerEvent) => {
    // Grow toward screen center: the sign follows the anchored corner.
    const deltaW = resizeNearRight ? resizeStartX - e.clientX : e.clientX - resizeStartX;
    const deltaH = resizeNearBottom ? resizeStartY - e.clientY : e.clientY - resizeStartY;
    setChatSize({
      width: Math.min(Math.max(resizeStartW + deltaW, minChatSize), window.innerWidth - sizeMargin),
      height: Math.min(Math.max(resizeStartH + deltaH, minChatSize), window.innerHeight - sizeMargin),
    });
  };

  const onResizePointerUp = () => {
    document.removeEventListener('pointermove', onResizePointerMove);
    document.removeEventListener('pointerup', onResizePointerUp);
    const size = chatSize();
    if (size) persistChatSize(size);
  };

  // A resized size overrides theme/default dimensions and the max-height cap, desktop only.
  const sizeStyle = () => {
    const size = window.innerWidth > 640 ? chatSize() : null;
    const themeHeight = theme()?.chatWindow?.height;
    const themeWidth = theme()?.chatWindow?.width;
    return {
      width: size ? `${size.width}px` : themeWidth ? `${themeWidth.toString()}px` : undefined,
      height: size ? `${size.height}px` : themeHeight ? `${themeHeight.toString()}px` : 'calc(100% - 150px)',
      'max-height': size ? `${window.innerHeight - sizeMargin}px` : undefined,
    };
  };

  // Grip hugs the inner corner (opposite the button's anchor), flush with the window's
  // rounded corner so it reads as part of the corner rather than a floating chip.
  const gripStyle = () => {
    const { nearRight, nearBottom } = anchorFlags();
    const vSide = nearBottom ? 'top' : 'bottom';
    const hSide = nearRight ? 'left' : 'right';
    const oppV = nearBottom ? 'bottom' : 'top';
    const oppH = nearRight ? 'right' : 'left';
    return {
      position: 'absolute' as const,
      [vSide]: '0px',
      [hSide]: '0px',
      [`border-${vSide}-${hSide}-radius`]: '18px',
      [`border-${oppV}-${oppH}-radius`]: '9px',
      // width: '22px',
      // height: '22px',
      padding: '2px',
      overflow: 'hidden',
      background: 'rgba(255, 255, 255, 0.55)',
      'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.12)',
      'align-items': nearBottom ? 'flex-start' : 'flex-end',
      'justify-content': nearRight ? 'flex-start' : 'flex-end',
      cursor: nearBottom === nearRight ? 'nwse-resize' : 'nesw-resize',
      'z-index': 60,
      'touch-action': 'none',
    };
  };

  // Rotate the grip glyph so its diagonal always points outward toward its own corner.
  const gripRotation = () => {
    const { nearRight, nearBottom } = anchorFlags();
    return nearBottom ? (nearRight ? 180 : 270) : nearRight ? 90 : 0;
  };

  // Sidebar docks to the right edge full-height and slides in horizontally; floating
  // keeps the corner-anchored, resizable window that unfolds from the button; inline
  // has no chrome of its own at all — it just fills whatever box the host gave it.
  const panelStyle = () => {
    if (isInlineMode()) {
      return {
        ...backgroundStyle(),
        position: 'static' as const,
        width: '100%',
        height: '100%',
        'max-height': 'none',
        transform: 'none',
        opacity: 1,
        'box-shadow': 'none',
        'border-radius': '0',
        'z-index': 'auto',
      };
    }

    if (isSidebarMode()) {
      return {
        ...backgroundStyle(),
        top: `${theme()?.chatWindow?.sidebarTop ?? 0}px`,
        bottom: `${theme()?.chatWindow?.sidebarBottom ?? 0}px`,
        right: '0',
        left: 'auto',
        height: 'auto',
        'max-height': 'none',
        width: `${sidebarWidth()}px`,
        transition: isSidebarResizing() ? 'none' : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-out',
        transform: isBotOpened() ? 'translateX(0)' : 'translateX(100%)',
        'box-shadow': theme()?.chatWindow?.sidebarBoxShadow ?? '-4px 0 24px rgba(0, 0, 0, 0.12)',
        ...(theme()?.chatWindow?.sidebarBorder
          ? { border: theme()?.chatWindow?.sidebarBorder }
          : {
              'border-left': `${theme()?.chatWindow?.sidebarBorderWidth ?? 1}px solid ${theme()?.chatWindow?.sidebarBorderColor ?? '#d1d5db'}`,
            }),
        'border-radius': '0',
        'z-index': theme()?.chatWindow?.sidebarZIndex ?? 42424242,
      };
    }

    return {
      ...sizeStyle(),
      ...backgroundStyle(),
      transition: 'transform 200ms cubic-bezier(0, 1.2, 1, 1), opacity 150ms ease-out',
      transform: isBotOpened() ? 'scale3d(1, 1, 1)' : 'scale3d(0, 0, 1)',
      'box-shadow': theme()?.chatWindow?.floatingBoxShadow ?? '0 4px 24px rgba(0, 0, 0, 0.12)',
      'z-index': 42424242,
      'border-radius': `${theme()?.chatWindow?.floatingBorderRadius ?? 20}px`,
      ...(theme()?.chatWindow?.floatingBorder ? { border: theme()?.chatWindow?.floatingBorder } : {}),
      ...(floatingPinned() ? pinnedAnchor() : windowAnchor()),
    };
  };

  const panelClass = () => {
    if (isInlineMode()) return 'relative w-full h-full';
    const visibility = isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none';
    if (isSidebarMode()) return 'fixed right-0' + visibility;
    return `fixed sm:right-5 w-full sm:w-[400px] max-h-[704px]` + visibility + ` bottom-${chatWindowBottom}px`;
  };

  // Add viewport meta tag dynamically
  createEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  });

  const showTooltip = theme()?.tooltip?.showTooltip ?? false;

  return (
    <>
      <Show when={theme()?.customCSS}>
        <style>{theme()?.customCSS}</style>
      </Show>
      <style>{styles}</style>
      <style>{colorSchemeStyle(theme()?.colorScheme)}</style>
      <div ref={setAnnounceHost} />
      <Show when={!hideLauncher()}>
        <Tooltip
          showTooltip={showTooltip && !isBotOpened()}
          position={buttonPosition()}
          buttonSize={buttonSize}
          tooltipMessage={theme()?.tooltip?.tooltipMessage}
          tooltipBackgroundColor={theme()?.tooltip?.tooltipBackgroundColor}
          tooltipTextColor={theme()?.tooltip?.tooltipTextColor}
          tooltipFontSize={theme()?.tooltip?.tooltipFontSize} // Set the tooltip font size
        />
        <BubbleButton
          {...theme()?.button}
          toggleBot={toggleBot}
          isBotOpened={isBotOpened()}
          setButtonPosition={setButtonPosition}
          backgroundColor={theme()?.button?.backgroundColor ?? themeColor()}
          dragAndDrop={theme()?.button?.dragAndDrop ?? false}
          chatflowid={props.chatflowid}
          streamConnected={streamConnected()}
          unreadCount={unreadCount()}
          announcementUnread={announce.unreadCount()}
        />
      </Show>
      <div part="bot" ref={windowRef} style={panelStyle()} class={panelClass()}>
        <Show when={isBotOpened() && isSidebarMode() && theme()?.chatWindow?.sidebarResizable}>
          <div
            style={resizeHandleStyle()}
            onPointerDown={onSidebarResizeDown}
            onPointerEnter={() => setResizeHandleHover(true)}
            onPointerLeave={() => setResizeHandleHover(false)}
            title="Drag to resize"
          >
            <Show when={theme()?.chatWindow?.sidebarResizeHandle && theme()?.chatWindow?.sidebarResizeHandle?.grip !== false}>
              {/* Its own element so dark mode can invert the dark-dotted grip
                  (--fw-grip-filter) without inverting the strip behind it. */}
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  'background-image': gripImage,
                  'background-position': 'center',
                  'background-repeat': 'no-repeat',
                  filter: 'var(--fw-grip-filter, none)',
                  'pointer-events': 'none',
                }}
              />
            </Show>
          </div>
        </Show>
        <Show when={isBotOpened() && !isSidebarMode() && !isInlineMode()}>
          <div
            class="hidden sm:flex opacity-90 hover:opacity-100 transition-opacity duration-150"
            style={gripStyle()}
            onPointerDown={onResizePointerDown}
            title="Drag to resize"
          >
            <svg viewBox="0 0 18 18" width="15" height="15" style={{ transform: `rotate(${gripRotation()}deg)` }}>
              <path d="M14 6 L6 14 M14 10 L10 14" stroke="#334155" stroke-width="1.8" stroke-linecap="round" fill="none" />
            </svg>
          </div>
        </Show>
        <Show when={isBotStarted()}>
          <div class="relative h-full">
            <Show when={isBotOpened() && !isInlineMode() && !theme()?.chatWindow?.header}>
              {/* Cross button For only mobile screen use this <Show when={isBotOpened() && window.innerWidth <= 640}>  */}
              <button
                onClick={closeBot}
                class="py-2 pe-3 absolute top-0 end-[-8px] m-[6px] bg-transparent text-white rounded-full z-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75"
                title="Close Chat"
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill={theme()?.button?.iconColor ?? defaultIconColor}
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
                  />
                </svg>
              </button>
            </Show>
            <Bot
              backgroundColor={theme()?.chatWindow?.backgroundColor}
              formBackgroundColor={theme()?.form?.backgroundColor}
              formTextColor={theme()?.form?.textColor}
              badgeBackgroundColor={theme()?.chatWindow?.backgroundColor}
              bubbleBackgroundColor={theme()?.button?.backgroundColor ?? themeColor() ?? defaultButtonColor}
              bubbleTextColor={theme()?.button?.iconColor ?? defaultIconColor}
              squareCorners={isSidebarMode() || isInlineMode()}
              header={theme()?.chatWindow?.header}
              cornerRadius={theme()?.chatWindow?.floatingBorderRadius}
              quickActionsTheme={theme()?.chatWindow?.quickActions}
              currentLayout={switchableLayout()}
              onSwitchLayout={theme()?.chatWindow?.header?.layoutSwitcher && !isInlineMode() ? switchLayout : undefined}
              showCloseInTitle={!!theme()?.chatWindow?.header && !isInlineMode()}
              titleHeight={theme()?.chatWindow?.titleHeight}
              showTitle={theme()?.chatWindow?.showTitle}
              showAgentMessages={theme()?.chatWindow?.showAgentMessages}
              title={theme()?.chatWindow?.title}
              title_rtl={theme()?.chatWindow?.title_rtl}
              titleAvatarSrc={theme()?.chatWindow?.titleAvatarSrc}
              titleTextColor={theme()?.chatWindow?.titleTextColor}
              titleBackgroundColor={theme()?.chatWindow?.titleBackgroundColor}
              showWelcomeMessage={theme()?.chatWindow?.showWelcomeMessage}
              welcomeMessage={theme()?.chatWindow?.welcomeMessage}
              errorMessage={theme()?.chatWindow?.errorMessage}
              poweredByTextColor={theme()?.chatWindow?.poweredByTextColor}
              textInput={{
                ...theme()?.chatWindow?.textInput,
                sendButtonColor: theme()?.chatWindow?.textInput?.sendButtonColor ?? themeColor(),
              }}
              botMessage={theme()?.chatWindow?.botMessage}
              userMessage={theme()?.chatWindow?.userMessage}
              feedback={theme()?.chatWindow?.feedback}
              fontSize={theme()?.chatWindow?.fontSize}
              footer={theme()?.chatWindow?.footer}
              sourceDocsTitle={theme()?.chatWindow?.sourceDocsTitle}
              starterPrompts={theme()?.chatWindow?.starterPrompts}
              starterPromptFontSize={theme()?.chatWindow?.starterPromptFontSize}
              chatflowid={props.chatflowid}
              chatflowConfig={props.chatflowConfig}
              apiHost={props.apiHost}
              protocol={props.protocol}
              apiPath={props.apiPath}
              agentId={props.agentId}
              onRequest={props.onRequest}
              observersConfig={props.observersConfig}
              clearChatOnReload={theme()?.chatWindow?.clearChatOnReload}
              disclaimer={theme()?.disclaimer}
              dateTimeToggle={theme()?.chatWindow?.dateTimeToggle}
              renderHTML={theme()?.chatWindow?.renderHTML}
              autoMessage={theme()?.chatWindow?.autoMessage}
              closeBot={closeBot}
              streamConnected={streamConnected()}
              notifications={notifications}
              initialUnread={initialUnread}
              unreadCount={unreadCount()}
              setUnreadCount={setUnreadCount}
              registerStreamHandler={registerStreamHandler}
              refreshUnread={refreshUnread}
              pendingBotMessages={pendingBotMessages}
              consumePendingBotMessages={consumePendingBotMessages}
              overlayMount={announceHost}
              announceController={announce}
              chatOpened={isBotOpened}
            />
          </div>
        </Show>
      </div>
    </>
  );
};
