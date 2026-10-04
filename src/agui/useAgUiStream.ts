import { createSignal, onCleanup, createEffect, Accessor, Setter, untrack } from 'solid-js';
import { connectStream, disconnectStream, StreamEvent } from './stream';
import { fetchUnreadNotifications, type Notification, type NotificationIdentity } from '@/api/notifications';
import { getOrCreateSessionId, sessionGenerationOf } from '@/session/chatSession';

export type UseAgUiStreamInput = {
  apiHost?: () => string | undefined;
  agentId?: () => string | undefined;
  chatflowid: () => string;
  protocol?: () => string | undefined;
  chatflowConfig?: () => { vars?: Record<string, any> } | any;
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

  let unreadRequest = 0;
  let unreadController: AbortController | undefined;
  const notificationIdentity = (): NotificationIdentity => {
    const vars = (input.chatflowConfig?.()?.vars ?? {}) as Record<string, string>;
    return {
      apiHost: input.apiHost?.() ?? '',
      userId: vars.userId ?? '',
      userToken: vars.userToken ?? '',
      agentId: input.agentId?.() ?? '',
    };
  };
  const notificationScope = (identity: NotificationIdentity): string =>
    JSON.stringify([identity.apiHost, identity.userId, identity.agentId, identity.userToken]);
  const invalidateUnread = (): void => {
    ++unreadRequest;
    unreadController?.abort();
    unreadController = undefined;
    setNotifications([]);
    setInitialUnread([]);
    setUnreadCount(0);
  };
  const refreshUnread = async (): Promise<void> => {
    const identity = notificationIdentity();
    if (!identity.userId || !identity.userToken || !identity.agentId) {
      invalidateUnread();
      return;
    }
    unreadController?.abort();
    const controller = new AbortController();
    unreadController = controller;
    const request = ++unreadRequest;
    const epoch = generation;
    const scope = notificationScope(identity);
    try {
      const res = await fetchUnreadNotifications(identity, 50, controller.signal);
      if (controller.signal.aborted || request !== unreadRequest || epoch !== generation || notificationScope(notificationIdentity()) !== scope)
        return;
      setNotifications(res.notifications);
      setInitialUnread(res.notifications);
      setUnreadCount((current) => Math.max(current, res.unread_count));
    } catch (err) {
      if (controller.signal.aborted || request !== unreadRequest || epoch !== generation || notificationScope(notificationIdentity()) !== scope)
        return;
      console.warn('[Notifications] Refresh failed:', err);
    } finally {
      if (unreadController === controller) unreadController = undefined;
    }
  };

  // Connect when config becomes ready, not when the component mounts. A host
  // framework can insert the element before assigning chatflowConfig/agentId,
  // so mount timing != config readiness.
  let connected = false;
  let connectedUserId: string | undefined;
  let connectedSessionId: string | undefined;
  let connectedKey = '';
  let ack: StreamEvent | undefined;
  let generation = 0;

  createEffect(() => {
    if (input.protocol?.() !== 'ag-ui') return;

    // Tracked so a reset re-runs this effect: the id lives in localStorage, which
    // is not reactive on its own.
    sessionGenerationOf();

    const vars = (input.chatflowConfig?.()?.vars ?? {}) as Record<string, string>;
    const agentId = input.agentId?.();
    if (!vars.userId || !vars.userToken || !agentId) {
      disconnectStream();
      connected = false;
      connectedKey = '';
      ack = undefined;
      generation++;
      setPendingBotMessages([]);
      invalidateUnread();
      return;
    }

    const sessionId = getOrCreateSessionId(input.chatflowid(), vars.customerId, vars.userId);

    // Already connected for this user and session — nothing to do (other prop
    // changes don't warrant a reconnect). Two things force a rebuild:
    //   userId    — "login as" leaves the socket bound to the previous user's
    //               channels server-side.
    //   sessionId — the server publishes session-scoped events (HITL cards,
    //               progress) on events:{user}:{agent}:{session}, and this socket
    //               subscribed to that channel at connect time. After a reset the
    //               old subscription can never receive the new session's cards,
    //               and Redis discards them silently.
    const key = [vars.userId, agentId, sessionId, input.apiHost?.(), vars.userToken].join('|');
    if (connected && key === connectedKey) return;
    if (connected) disconnectStream();

    const epoch = ++generation;
    const changedScope =
      vars.userId !== connectedUserId ||
      sessionId !== connectedSessionId ||
      key.split('|').slice(0, 4).join('|') !== connectedKey.split('|').slice(0, 4).join('|');
    if (changedScope) setPendingBotMessages([]);
    invalidateUnread();
    setUnreadCount(pendingBotMessages().length);
    ack = undefined;
    connectedKey = key;
    connected = true;
    connectedUserId = vars.userId;
    connectedSessionId = sessionId;

    connectStream({
      apiHost: input.apiHost?.() ?? '',
      agentId,
      userId: vars.userId,
      userToken: vars.userToken ?? '',
      sessionId,
      onEvent: (event: StreamEvent) => {
        if (epoch !== generation) return;
        if (event.type === 'ack') {
          if (ack?.environment && ack.environment !== event.environment) {
            setPendingBotMessages([]);
            invalidateUnread();
          }
          ack = event;
        }
        if (event.type === 'pipeline_changed' || event.type === 'pipeline_report_changed' || (event.type === 'bot_message' && event.run_id)) {
          if (
            ack?.pipeline_reports !== true ||
            event.user_id !== vars.userId ||
            event.agent_id !== agentId ||
            event.session_id !== sessionId ||
            event.environment !== ack.environment
          )
            return;
        }
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
          if (event.message_id && pendingBotMessages().some((item) => item.message_id === event.message_id)) return;
          setPendingBotMessages((prev) => [...prev, event].slice(-100));
          setUnreadCount((c) => c + 1);
          return;
        }

        for (const handler of streamEventHandlers()) {
          handler(event);
        }
      },
      onConnect: () => {
        if (epoch !== generation) return;
        setStreamConnected(true);
        void refreshUnread();
      },
      onDisconnect: () => {
        if (epoch === generation) setStreamConnected(false);
      },
      onError: (error) => {
        if (epoch !== generation) return;
        if (['HTTP 401', 'HTTP 403'].includes(error)) {
          ack = undefined;
          setPendingBotMessages([]);
          invalidateUnread();
          for (const handler of untrack(streamEventHandlers)) handler({ type: 'ack', pipeline_reports: false, authorization_error: true });
        }
      },
    });
  });

  onCleanup(() => {
    ++generation;
    invalidateUnread();
    disconnectStream();
  });

  const registerStreamHandler = (handler: (event: StreamEvent) => void) => {
    setStreamEventHandlers((prev) => [...prev, handler]);
    if (ack) handler(ack);
    return () => setStreamEventHandlers((prev) => prev.filter((h) => h !== handler));
  };

  const consumePendingBotMessages = (): StreamEvent[] => {
    const drained = pendingBotMessages();
    if (drained.length > 0) {
      setPendingBotMessages([]);
      setUnreadCount((count) => Math.max(0, count - drained.length));
    }
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
