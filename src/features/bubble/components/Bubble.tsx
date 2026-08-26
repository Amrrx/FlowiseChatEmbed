import { createSignal, Show, splitProps, onCleanup, createEffect, onMount } from 'solid-js';
import { getCurrentElement } from 'solid-element';
import styles from '../../../assets/index.css';
import { BubbleButton } from './BubbleButton';
import { BubbleParams } from '../types';
import { Bot, BotProps } from '../../../components/Bot';
import Tooltip from './Tooltip';
import { getBubbleButtonSize } from '@/utils';
import { useAgUiStream } from '@/agui/useAgUiStream';

const SIDEBAR_MIN_VIEWPORT_WIDTH = 768;

const defaultButtonColor = '#00B8D9';
const defaultIconColor = 'white';

export type BubbleProps = BotProps & BubbleParams;

export const Bubble = (props: BubbleProps) => {
  const [bubbleProps] = splitProps(props, ['theme']);

  const hostElement = getCurrentElement();

  const [isBotOpened, setIsBotOpened] = createSignal(false);
  const [isBotStarted, setIsBotStarted] = createSignal(false);
  const [buttonPosition, setButtonPosition] = createSignal({
    bottom: bubbleProps.theme?.button?.bottom ?? 20,
    right: bubbleProps.theme?.button?.right ?? 20,
  });

  const [viewportWidth, setViewportWidth] = createSignal(window.innerWidth);
  onMount(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    onCleanup(() => window.removeEventListener('resize', onResize));
  });

  // Sidebar mode docks the panel to the right edge and pushes the host page aside (like devtools).
  // It only applies above the mobile breakpoint; smaller screens keep the floating overlay.
  const sidebarWidth = bubbleProps.theme?.chatWindow?.width ?? 400;
  const isSidebarMode = () => (bubbleProps.theme?.chatWindow?.layout ?? 'floating') === 'sidebar' && viewportWidth() >= SIDEBAR_MIN_VIEWPORT_WIDTH;

  // Notify the host page so it can push its own layout aside — this widget renders in a
  // Shadow DOM custom element and cannot resize the host page's layout by itself.
  createEffect(() => {
    const active = isSidebarMode() && isBotOpened();
    hostElement?.dispatchEvent(
      new CustomEvent('flowise-sidebar-toggle', {
        bubbles: true,
        composed: true,
        detail: { open: active, width: active ? sidebarWidth : 0 },
      }),
    );
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

  const backgroundStyle = {
    'background-color': bubbleProps.theme?.chatWindow?.backgroundColor || '#ffffff',
    'background-image': bubbleProps.theme?.chatWindow?.backgroundImage ? `url(${bubbleProps.theme?.chatWindow?.backgroundImage})` : 'none',
    'background-size': 'cover',
    'background-position': 'center',
    'background-repeat': 'no-repeat',
  };

  const panelStyle = () => {
    if (isSidebarMode()) {
      return {
        ...backgroundStyle,
        top: '0',
        bottom: '0',
        right: '0',
        height: '100vh',
        width: `${sidebarWidth}px`,
        transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-out',
        transform: isBotOpened() ? 'translateX(0)' : 'translateX(100%)',
        'box-shadow': '-4px 0 24px rgba(0, 0, 0, 0.12)',
        'z-index': 42424242,
        'border-radius': '0',
      };
    }

    return {
      ...backgroundStyle,
      height: bubbleProps.theme?.chatWindow?.height ? `${bubbleProps.theme?.chatWindow?.height.toString()}px` : 'calc(100% - 150px)',
      width: bubbleProps.theme?.chatWindow?.width ? `${bubbleProps.theme?.chatWindow?.width.toString()}px` : undefined,
      transition: 'transform 200ms cubic-bezier(0, 1.2, 1, 1), opacity 150ms ease-out',
      'transform-origin': 'bottom right',
      transform: isBotOpened() ? 'scale3d(1, 1, 1)' : 'scale3d(0, 0, 1)',
      'box-shadow': '0 4px 24px rgba(0, 0, 0, 0.12)',
      'z-index': 42424242,
      'border-radius': '20px',
      bottom: `${Math.min(buttonPosition().bottom + buttonSize + 10, window.innerHeight - chatWindowBottom)}px`,
      right: `${Math.max(0, Math.min(buttonPosition().right, window.innerWidth - (bubbleProps.theme?.chatWindow?.width ?? 410) - 10))}px`,
    };
  };

  const panelClass = () =>
    isSidebarMode()
      ? 'fixed inset-y-0 right-0 w-full sm:w-auto' + (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none')
      : `fixed sm:right-5 w-full sm:w-[400px] max-h-[704px]` +
        (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none') +
        ` bottom-${chatWindowBottom}px`;

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
        autoOpen={bubbleProps.theme?.button?.autoWindowOpen?.autoOpen ?? false}
        openDelay={bubbleProps.theme?.button?.autoWindowOpen?.openDelay}
        autoOpenOnMobile={bubbleProps.theme?.button?.autoWindowOpen?.autoOpenOnMobile ?? false}
        streamConnected={streamConnected()}
        unreadCount={unreadCount()}
      />
      <div part="bot" style={panelStyle()} class={panelClass()}>
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
