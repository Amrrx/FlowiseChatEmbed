import { Show } from 'solid-js';
import type { ToolCallData } from '../../agui/types';

type Props = {
  toolCall: ToolCallData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
};

const formatToolName = (name: string): string => name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ToolCallBubble = (props: Props) => {
  const isCalling = () => props.toolCall.status === 'calling';
  const isCancelled = () => props.toolCall.status === 'cancelled';

  const borderColor = () => {
    if (isCalling()) return '#e5e7eb';
    if (isCancelled()) return '#e5e7eb';
    return '#d1fae5';
  };

  return (
    <div
      class="rounded-md border px-3 py-2 max-w-[300px]"
      style={{
        'background-color': props.backgroundColor ?? '#f9fafb',
        color: props.textColor ?? '#6b7280',
        'font-size': `${(props.fontSize ?? 14) - 2}px`,
        'border-color': borderColor(),
      }}
    >
      <div class="flex items-center gap-2">
        <Show when={!isCalling() && !isCancelled()}>
          <Checkmark />
        </Show>
        <Show when={isCalling()}>
          <Spinner />
        </Show>
        <Show when={isCancelled()}>
          <Cross />
        </Show>
        <span class="font-medium" style={{ color: props.textColor ?? '#374151' }}>
          {formatToolName(props.toolCall.toolName)}
        </span>
        <Show when={isCancelled()}>
          <span class="text-xs italic" style={{ color: '#9ca3af' }}>
            cancelled by user
          </span>
        </Show>
      </div>
    </div>
  );
};
