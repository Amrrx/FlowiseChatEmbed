import { createSignal, Show, splitProps, onCleanup, createEffect } from 'solid-js';
import styles from '../../../assets/index.css';
import { BubbleButton } from './BubbleButton';
import { BubbleParams } from '../types';
import { Bot, BotProps } from '../../../components/Bot';
import Tooltip from './Tooltip';
import { getBubbleButtonSize } from '@/utils';
import { useAgUiStream } from '@/agui/useAgUiStream';

const defaultButtonColor = '#00B8D9';
const defaultIconColor = 'white';

export type BubbleProps = BotProps & BubbleParams;

export const Bubble = (props: BubbleProps) => {
  const [bubbleProps] = splitProps(props, ['theme']);

  const [isBotOpened, setIsBotOpened] = createSignal(false);
  const [isBotStarted, setIsBotStarted] = createSignal(false);
  const [buttonPosition, setButtonPosition] = createSignal({
    bottom: bubbleProps.theme?.button?.bottom ?? 20,
    right: bubbleProps.theme?.button?.right ?? 20,
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
    isBotOpened() ? closeBot() : openBot();
  };

  onCleanup(() => {
    setIsBotStarted(false);
  });

  const buttonSize = getBubbleButtonSize(props.theme?.button?.size); // Default to 48px if size is not provided
  const buttonBottom = props.theme?.button?.bottom ?? 20;
  const chatWindowBottom = buttonBottom + buttonSize + 10; // Adjust the offset here for slight shift
  const windowGap = 10;
  const minChatSize = 300;
  const sizeMargin = 20;

  // Which screen corner the button occupies — the single source of truth for how the
  // window unfolds, where the resize grip sits, and which way a resize drag grows.
  const anchorFlags = () => {
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
    const themeHeight = bubbleProps.theme?.chatWindow?.height;
    const themeWidth = bubbleProps.theme?.chatWindow?.width;
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

  const showTooltip = bubbleProps.theme?.tooltip?.showTooltip ?? false;

  return (
    <>
      <Show when={props.theme?.customCSS}>
        <style>{props.theme?.customCSS}</style>
      </Show>
      <style>{styles}</style>
      <Tooltip
        showTooltip={showTooltip && !isBotOpened()}
        position={buttonPosition()}
        buttonSize={buttonSize}
        tooltipMessage={bubbleProps.theme?.tooltip?.tooltipMessage}
        tooltipBackgroundColor={bubbleProps.theme?.tooltip?.tooltipBackgroundColor}
        tooltipTextColor={bubbleProps.theme?.tooltip?.tooltipTextColor}
        tooltipFontSize={bubbleProps.theme?.tooltip?.tooltipFontSize} // Set the tooltip font size
      />
      <BubbleButton
        {...bubbleProps.theme?.button}
        toggleBot={toggleBot}
        isBotOpened={isBotOpened()}
        setButtonPosition={setButtonPosition}
        dragAndDrop={bubbleProps.theme?.button?.dragAndDrop ?? false}
        chatflowid={props.chatflowid}
        autoOpen={bubbleProps.theme?.button?.autoWindowOpen?.autoOpen ?? false}
        openDelay={bubbleProps.theme?.button?.autoWindowOpen?.openDelay}
        autoOpenOnMobile={bubbleProps.theme?.button?.autoWindowOpen?.autoOpenOnMobile ?? false}
        streamConnected={streamConnected()}
        unreadCount={unreadCount()}
      />
      <div
        part="bot"
        ref={windowRef}
        style={{
          ...sizeStyle(),
          transition: 'transform 200ms cubic-bezier(0, 1.2, 1, 1), opacity 150ms ease-out',
          transform: isBotOpened() ? 'scale3d(1, 1, 1)' : 'scale3d(0, 0, 1)',
          'box-shadow': '0 4px 24px rgba(0, 0, 0, 0.12)',
          'background-color': bubbleProps.theme?.chatWindow?.backgroundColor || '#ffffff',
          'background-image': bubbleProps.theme?.chatWindow?.backgroundImage ? `url(${bubbleProps.theme?.chatWindow?.backgroundImage})` : 'none',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat',
          'z-index': 42424242,
          'border-radius': '20px',
          ...windowAnchor(),
        }}
        class={
          `fixed sm:right-5 w-full sm:w-[400px] max-h-[704px]` +
          (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none') +
          ` bottom-${chatWindowBottom}px`
        }
      >
        <Show when={isBotOpened()}>
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
            <Show when={isBotOpened()}>
              {/* Cross button For only mobile screen use this <Show when={isBotOpened() && window.innerWidth <= 640}>  */}
              <button
                onClick={closeBot}
                class="py-2 pe-3 absolute top-0 end-[-8px] m-[6px] bg-transparent text-white rounded-full z-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75"
                title="Close Chat"
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill={bubbleProps.theme?.button?.iconColor ?? defaultIconColor}
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
                  />
                </svg>
              </button>
            </Show>
            <Bot
              backgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
              formBackgroundColor={bubbleProps.theme?.form?.backgroundColor}
              formTextColor={bubbleProps.theme?.form?.textColor}
              badgeBackgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
              bubbleBackgroundColor={bubbleProps.theme?.button?.backgroundColor ?? defaultButtonColor}
              bubbleTextColor={bubbleProps.theme?.button?.iconColor ?? defaultIconColor}
              showTitle={bubbleProps.theme?.chatWindow?.showTitle}
              showAgentMessages={bubbleProps.theme?.chatWindow?.showAgentMessages}
              title={bubbleProps.theme?.chatWindow?.title}
              title_rtl={bubbleProps.theme?.chatWindow?.title_rtl}
              titleAvatarSrc={bubbleProps.theme?.chatWindow?.titleAvatarSrc}
              titleTextColor={bubbleProps.theme?.chatWindow?.titleTextColor}
              titleBackgroundColor={bubbleProps.theme?.chatWindow?.titleBackgroundColor}
              showWelcomeMessage={bubbleProps.theme?.chatWindow?.showWelcomeMessage}
              welcomeMessage={bubbleProps.theme?.chatWindow?.welcomeMessage}
              errorMessage={bubbleProps.theme?.chatWindow?.errorMessage}
              poweredByTextColor={bubbleProps.theme?.chatWindow?.poweredByTextColor}
              textInput={bubbleProps.theme?.chatWindow?.textInput}
              botMessage={bubbleProps.theme?.chatWindow?.botMessage}
              userMessage={bubbleProps.theme?.chatWindow?.userMessage}
              feedback={bubbleProps.theme?.chatWindow?.feedback}
              fontSize={bubbleProps.theme?.chatWindow?.fontSize}
              footer={bubbleProps.theme?.chatWindow?.footer}
              sourceDocsTitle={bubbleProps.theme?.chatWindow?.sourceDocsTitle}
              starterPrompts={bubbleProps.theme?.chatWindow?.starterPrompts}
              starterPromptFontSize={bubbleProps.theme?.chatWindow?.starterPromptFontSize}
              chatflowid={props.chatflowid}
              chatflowConfig={props.chatflowConfig}
              apiHost={props.apiHost}
              protocol={props.protocol}
              apiPath={props.apiPath}
              agentId={props.agentId}
              onRequest={props.onRequest}
              observersConfig={props.observersConfig}
              clearChatOnReload={bubbleProps.theme?.chatWindow?.clearChatOnReload}
              disclaimer={bubbleProps.theme?.disclaimer}
              dateTimeToggle={bubbleProps.theme?.chatWindow?.dateTimeToggle}
              renderHTML={props.theme?.chatWindow?.renderHTML}
              autoMessage={bubbleProps.theme?.chatWindow?.autoMessage}
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
            />
          </div>
        </Show>
      </div>
    </>
  );
};
