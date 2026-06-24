import type { BubbleProps } from './features/bubble';

export const appVersion = '3.8.0';

export const defaultBotProps: BubbleProps = {
  chatflowid: '',
  apiHost: undefined,
  protocol: undefined,
  apiPath: undefined,
  agentId: undefined,
  onRequest: undefined,
  chatflowConfig: undefined,
  theme: undefined,
  observersConfig: undefined,
};
