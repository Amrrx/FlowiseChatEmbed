import { createSignal, createEffect, onMount, on, Show } from 'solid-js';
import { isNotDefined, getBubbleButtonSize } from '@/utils/index';
import { ButtonTheme } from '../types';

type Props = ButtonTheme & {
  isBotOpened: boolean;
  toggleBot: () => void;
  setButtonPosition: (position: { bottom: number; right: number }) => void;
  dragAndDrop: boolean;
  chatflowid?: string; // Used to key the persisted drag position per chatflow
  streamConnected?: boolean;
  unreadCount?: number;
  announcementUnread?: number;
};

const defaultButtonColor = '#00B8D9';
const defaultIconColor = 'white';
const defaultBottom = 20;
const defaultRight = 20;
const edgeMargin = 10;
const dragThreshold = 5; // Pixels moved before a press counts as a drag, not a click

export const BubbleButton = (props: Props) => {
  const buttonSize = getBubbleButtonSize(props.size);

  const storageKey = () => (props.chatflowid ? `${props.chatflowid}_BUBBLE_POS` : null);

  const readPersistedPosition = () => {
    const key = storageKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.right === 'number' && typeof parsed?.bottom === 'number') {
        return { right: parsed.right, bottom: parsed.bottom };
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const persistPosition = (pos: { bottom: number; right: number }) => {
    const key = storageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(pos));
    } catch (e) {
      return;
    }
  };

  // Restore a saved position only while dragging is enabled; otherwise fall back to defaults.
  const restoredPosition = props.dragAndDrop ? readPersistedPosition() : null;

  const [position, setPosition] = createSignal(
    restoredPosition ?? {
      bottom: props.bottom ?? defaultBottom,
      right: props.right ?? defaultRight,
    },
  );

  const [isSmallScreen, setIsSmallScreen] = createSignal(false);

  // Sync the chat window anchor to the restored position before the first open.
  onMount(() => {
    if (restoredPosition) props.setButtonPosition(restoredPosition);
  });

  let dragStartX = 0;
  let dragStartY = 0;
  let initialRight = 0;
  let initialBottom = 0;
  let wasDragged = false;

  const onPointerDown = (e: PointerEvent) => {
    // Dragging is only allowed while the chat window is closed.
    if (!props.dragAndDrop || props.isBotOpened) return;

    wasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialRight = position().right;
    initialBottom = position().bottom;

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e: PointerEvent) => {
    const deltaX = dragStartX - e.clientX;
    const deltaY = dragStartY - e.clientY;

    if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
      wasDragged = true;
    }

    const maxRight = window.innerWidth - buttonSize - edgeMargin;
    const maxBottom = window.innerHeight - buttonSize - edgeMargin;

    const newPosition = {
      right: Math.min(Math.max(initialRight + deltaX, edgeMargin), maxRight),
      bottom: Math.min(Math.max(initialBottom + deltaY, edgeMargin), maxBottom),
    };

    setPosition(newPosition);
    props.setButtonPosition(newPosition);
  };

  const onPointerUp = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    if (wasDragged) persistPosition(position());
  };

  // Snap the button to the screen corner it's closest to, so the opened chat
  // window always has room to unfold and never spills off-screen.
  const nearestCorner = (pos: { bottom: number; right: number }) => {
    const nearRight = pos.right + buttonSize / 2 < window.innerWidth / 2;
    const nearBottom = pos.bottom + buttonSize / 2 < window.innerHeight / 2;
    return {
      right: nearRight ? edgeMargin : window.innerWidth - buttonSize - edgeMargin,
      bottom: nearBottom ? edgeMargin : window.innerHeight - buttonSize - edgeMargin,
    };
  };

  createEffect(
    on(
      () => props.isBotOpened,
      (opened) => {
        if (!opened || !props.dragAndDrop) return;
        const corner = nearestCorner(position());
        setPosition(corner);
        props.setButtonPosition(corner);
        persistPosition(corner);
      },
    ),
  );

  const handleButtonClick = () => {
    // A drag also fires a trailing click; swallow it so the chat doesn't toggle.
    if (wasDragged) {
      wasDragged = false;
      return;
    }
    props.toggleBot();
    if (window.innerWidth <= 640) {
      setIsSmallScreen(true);
    }
  };

  return (
    <Show when={!isSmallScreen() || !props.isBotOpened} keyed>
      <button
        part="button"
        onClick={handleButtonClick}
        onPointerDown={onPointerDown}
        class={`fixed rounded-full hover:scale-110 active:scale-95 transition-all duration-200 flex justify-center items-center animate-fade-in`}
        style={{
          'background-color': props.backgroundColor ?? defaultButtonColor,
          'z-index': 42424242,
          right: `${position().right}px`,
          bottom: `${position().bottom}px`,
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          cursor: props.dragAndDrop ? 'grab' : 'pointer',
          'touch-action': props.dragAndDrop ? 'none' : undefined,
          'box-shadow': '0 4px 16px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Announcement attention motion — amber radar ripple, only while the chat
            is closed and something is unread. Two staggered rings = continuous ping. */}
        <Show when={!props.isBotOpened && (props.announcementUnread ?? 0) > 0}>
          <style>{`@keyframes announce-ripple{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.9);opacity:0}}`}</style>
          <span
            style={{
              position: 'absolute',
              inset: '0',
              'border-radius': '50%',
              border: '2px solid #f59e0b',
              animation: 'announce-ripple 1.6s ease-out infinite',
              'pointer-events': 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: '0',
              'border-radius': '50%',
              border: '2px solid #f59e0b',
              animation: 'announce-ripple 1.6s ease-out infinite',
              'animation-delay': '0.8s',
              'pointer-events': 'none',
            }}
          />
        </Show>

        <Show when={isNotDefined(props.customIconSrc)} keyed>
          <svg
            viewBox="0 0 24 24"
            style={{
              stroke: props.iconColor ?? defaultIconColor,
            }}
            class={
              `stroke-2 fill-transparent absolute duration-200 transition ` + (props.isBotOpened ? 'scale-0 opacity-0' : 'scale-100 opacity-100')
            }
            width={buttonSize * 0.6}
            height={buttonSize * 0.6}
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </Show>
        <Show when={props.customIconSrc}>
          <img
            src={props.customIconSrc}
            class={'rounded-full object-cover' + (props.isBotOpened ? 'scale-0 opacity-0' : 'scale-100 opacity-100')}
            style={{
              width: `${buttonSize * 0.6}px`,
              height: `${buttonSize * 0.6}px`,
            }}
            alt="Bubble button icon"
          />
        </Show>

        <svg
          viewBox="0 0 24 24"
          style={{ fill: props.iconColor ?? 'white' }}
          class={`absolute duration-200 transition ` + (props.isBotOpened ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-180 opacity-0')}
          width={buttonSize * 0.6}
          height={buttonSize * 0.6}
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M18.601 8.39897C18.269 8.06702 17.7309 8.06702 17.3989 8.39897L12 13.7979L6.60099 8.39897C6.26904 8.06702 5.73086 8.06702 5.39891 8.39897C5.06696 8.73091 5.06696 9.2691 5.39891 9.60105L11.3989 15.601C11.7309 15.933 12.269 15.933 12.601 15.601L18.601 9.60105C18.9329 9.2691 18.9329 8.73091 18.601 8.39897Z"
          />
        </svg>

        {/* Connection LED — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            width: '10px',
            height: '10px',
            'border-radius': '50%',
            'background-color': props.streamConnected ? '#22c55e' : '#94a3b8',
            border: '2px solid #1a1a2e',
            'box-shadow': props.streamConnected ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
          }}
          title={props.streamConnected ? 'Connected' : 'Disconnected'}
        />

        {/* Notification badge — top right */}
        <Show when={(props.unreadCount ?? 0) > 0}>
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              'font-size': '10px',
              'font-weight': '700',
              'border-radius': '50%',
              'min-width': '18px',
              height: '18px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              border: '2px solid #1a1a2e',
            }}
          >
            {props.unreadCount}
          </div>
        </Show>
      </button>
    </Show>
  );
};
