import { observersConfigType } from './components/Bot';
import { BubbleTheme } from './features/bubble/types';

/* eslint-disable solid/reactivity */
type BotProps = {
  chatflowid: string;
  apiHost?: string;
  protocol?: 'legacy' | 'ag-ui';
  apiPath?: string;
  agentId?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  chatflowConfig?: Record<string, unknown>;
  observersConfig?: observersConfigType;
  theme?: BubbleTheme;
  // Adopts a pre-placed <flowise-chatbot id="..."> tag in place instead of
  // creating+appending a new one to document.body — lets a host render inline
  // (layout: 'inline') exactly where its own markup puts it, mirroring
  // initFull's existing id-adoption option above.
  id?: string;
};

let elementUsed: Element | undefined;

export const initFull = (props: BotProps & { id?: string }) => {
  // Already mounted → update props in place. Hosts may call init repeatedly
  // (e.g. auth-driven re-renders); recreating would dispose the widget and
  // abort its live /stream connection.
  if (elementUsed && (elementUsed as HTMLElement).isConnected) {
    Object.assign(elementUsed, props);
    return;
  }
  destroy();
  let fullElement = props.id ? document.getElementById(props.id) : document.querySelector('flowise-fullchatbot');
  if (!fullElement) {
    fullElement = document.createElement('flowise-fullchatbot');
    Object.assign(fullElement, props);
    document.body.appendChild(fullElement);
  } else {
    Object.assign(fullElement, props);
  }
  elementUsed = fullElement;
};

export const init = (props: BotProps) => {
  // Already mounted → update props in place instead of destroy+recreate.
  // Hosts may call init repeatedly (e.g. auth-driven re-renders); recreating
  // would dispose the widget and abort its live /stream connection.
  if (elementUsed && (elementUsed as HTMLElement).isConnected) {
    Object.assign(elementUsed, props);
    return;
  }
  destroy();
  // When props.id is omitted (sidebar/floating today), behavior is unchanged:
  // always create+append a new element. When given (inline), adopt the host's
  // own pre-placed tag in place rather than creating a second element.
  const element = props.id ? document.getElementById(props.id) : null;
  if (!element) {
    const created = document.createElement('flowise-chatbot');
    Object.assign(created, props);
    document.body.appendChild(created);
    elementUsed = created;
    return;
  }
  Object.assign(element, props);
  elementUsed = element;
};

export const destroy = () => {
  elementUsed?.remove();
};

type Chatbot = {
  initFull: typeof initFull;
  init: typeof init;
  destroy: typeof destroy;
};

declare const window:
  | {
      Chatbot: Chatbot | undefined;
    }
  | undefined;

export const parseChatbot = () => ({
  initFull,
  init,
  destroy,
});

export const injectChatbotInWindow = (bot: Chatbot) => {
  if (typeof window === 'undefined') return;
  window.Chatbot = { ...bot };
};
