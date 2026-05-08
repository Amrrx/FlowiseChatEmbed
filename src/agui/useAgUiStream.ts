import { createSignal, onCleanup, onMount, Accessor, Setter } from 'solid-js';
import { connectStream, disconnectStream, StreamEvent } from './stream';
import { fetchUnreadNotifications, type Notification } from '@/api/notifications';
import { getOrCreateSessionId } from '@/session/chatSession';

export type UseAgUiStreamInput = {
  apiHost?: string;
  agentId?: string;
  chatflowid: string;
  protocol?: string;
  chatflowConfig?: { vars?: Record<string, any> } | any;
  isBotVisible?: () => boolean;
};

export type UseAgUiStreamOutput = {
  streamConnected: Accessor<boolean>;
  notifications: Accessor<Notification[]>;
  initialUnread: Accessor<Notification[]>;
  unreadCount: Accessor<number>;
  setUnreadCount: Setter<number>;
  registerStreamHandler: (handler: (event: StreamEvent) => void) => () => void;
  refreshUnread: () => Promise<void>;
  pendingBotMessages: Accessor<StreamEvent[]>;
  consumePendingBotMessages: () => StreamEvent[];
};

export function useAgUiStream(input: UseAgUiStreamInput): UseAgUiStreamOutput {
  const [streamConnected, setStreamConnected] = createSignal(false);
  const [notifications, setNotifications] = createSignal<Notification[]>([]);
  const [initialUnread, setInitialUnread] = createSignal<Notification[]>([]);
  const [unreadCount, setUnreadCount] = createSignal(0);
  const [pendingBotMessages, setPendingBotMessages] = createSignal<StreamEvent[]>([]);
  const [streamEventHandlers, setStreamEventHandlers] = createSignal<Array<(event: StreamEvent) => void>>([]);

  const refreshUnread = async (): Promise<void> => {
    const vars = (input.chatflowConfig?.vars ?? {}) as Record<string, string>;
    if (!vars.userId) return;
    try {
      const res = await fetchUnreadNotifications(input.apiHost ?? '', vars.userId);
      setNotifications(res.notifications);
      setInitialUnread(res.notifications);
      setUnreadCount((current) => Math.max(current, res.unread_count));
    } catch (err) {
      console.warn('[Notifications] Refresh failed:', err);
    }
  };

  onMount(() => {
    if (input.protocol !== 'ag-ui') return;

    const vars = (input.chatflowConfig?.vars ?? {}) as Record<string, string>;
    if (!vars.userId || !input.agentId) return;

    const sessionId = getOrCreateSessionId(input.chatflowid, vars.customerId);

    connectStream({
      apiHost: input.apiHost ?? '',
      agentId: input.agentId,
      userId: vars.userId,
      userToken: vars.userToken ?? '',
      sessionId,
      onEvent: (event: StreamEvent) => {
        const botVisible = input.isBotVisible?.() ?? true;

        if (event.type === 'notification') {
          setNotifications((prev) => [event as unknown as Notification, ...prev]);
          if (!botVisible) {
            // Hidden: bump the badge and let Path A surface this on next open
            // via refreshUnread → summary card. Skip fan-out so Bot doesn't
            // push a live bubble that the user never sees in context.
            setUnreadCount((c) => c + 1);
            return;
          }
        } else if (event.type === 'bot_message' && !botVisible) {
          // Hidden: buffer for replay on next open. Skip live fan-out so Bot
          // doesn't append a bubble the user can't see in context — matching
          // the notification branch above.
          setPendingBotMessages((prev) => [...prev, event]);
          setUnreadCount((c) => c + 1);
          return;
        }

        for (const handler of streamEventHandlers()) {
          handler(event);
        }
      },
      onConnect: () => {
        setStreamConnected(true);
        void refreshUnread();
      },
      onDisconnect: () => setStreamConnected(false),
    });
  });

  onCleanup(() => disconnectStream());

  const registerStreamHandler = (handler: (event: StreamEvent) => void) => {
    setStreamEventHandlers((prev) => [...prev, handler]);
    return () => setStreamEventHandlers((prev) => prev.filter((h) => h !== handler));
  };

  const consumePendingBotMessages = (): StreamEvent[] => {
    const drained = pendingBotMessages();
    if (drained.length > 0) setPendingBotMessages([]);
    return drained;
  };

  return {
    streamConnected,
    notifications,
    initialUnread,
    unreadCount,
    setUnreadCount,
    registerStreamHandler,
    refreshUnread,
    pendingBotMessages,
    consumePendingBotMessages,
  };
}
