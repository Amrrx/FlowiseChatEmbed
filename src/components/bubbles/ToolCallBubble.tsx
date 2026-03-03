import { Show } from 'solid-js';
import type { ToolCallData } from '../../agui/types';

type Props = {
  toolCall: ToolCallData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
};

const formatToolName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const parseArgs = (raw: string): Array<[string, string]> => {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return [];
    return Object.entries(parsed).map(([k, v]) => [k, String(v)]);
  } catch {
    return [];
  }
};

const Spinner = () => (
  <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="0.75" stroke-linecap="round" />
  </svg>
);

const Checkmark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ToolCallBubble = (props: Props) => {
  const args = () => parseArgs(props.toolCall.args);
  const isCalling = () => props.toolCall.status === 'calling';

  return (
    <div
      class="rounded-md border px-3 py-2 max-w-[300px]"
      style={{
        'background-color': props.backgroundColor ?? '#f9fafb',
        color: props.textColor ?? '#6b7280',
        'font-size': `${(props.fontSize ?? 14) - 2}px`,
        'border-color': isCalling() ? '#e5e7eb' : '#d1fae5',
      }}
    >
      <div class="flex items-center gap-2">
        <Show when={isCalling()} fallback={<Checkmark />}>
          <Spinner />
        </Show>
        <span class="font-medium" style={{ color: props.textColor ?? '#374151' }}>
          {formatToolName(props.toolCall.toolName)}
        </span>
      </div>
      <Show when={isCalling() && args().length > 0}>
        <div class="mt-1.5 pl-5 space-y-0.5 text-xs" style={{ color: '#9ca3af' }}>
          {args().map(([key, value]) => (
            <div class="truncate">
              <span class="font-medium">{key}:</span> {value}
            </div>
          ))}
        </div>
      </Show>
    </div>
  );
};
