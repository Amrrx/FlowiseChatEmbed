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
  const element = document.createElement('flowise-chatbot');
  Object.assign(element, props);
  document.body.appendChild(element);
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
