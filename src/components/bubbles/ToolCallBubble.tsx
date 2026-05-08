import { Show } from 'solid-js';
import type { ToolCallData } from '../../agui/types';

type Props = {
  toolCall: ToolCallData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
};

const formatToolName = (name: string): string => name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ACCENTS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#06b6d4', '#f43f5e'];

const accentFor = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

const Spinner = (props: { color: string }) => (
  <svg class="animate-spin shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={props.color} stroke-width="2.5">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="0.95" stroke-linecap="round" />
  </svg>
);

const Checkmark = () => (
  <svg
    class="shrink-0"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22c55e"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Cross = () => (
  <svg
    class="shrink-0"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9ca3af"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ToolCallBubble = (props: Props) => {
  const isCalling = () => props.toolCall.status === 'calling';
  const isCancelled = () => props.toolCall.status === 'cancelled';
  const accent = () => accentFor(props.toolCall.toolCallId);
  const lineColor = () => {
    if (isCalling()) return accent();
    if (isCancelled()) return '#d1d5db';
    return '#a7f3d0';
  };
  const labelColor = () => {
    if (isCalling()) return accent();
    if (isCancelled()) return '#9ca3af';
    return props.textColor ?? '#6b7280';
  };

  return (
    <div class="flex items-center gap-3 w-full my-1" style={{ 'font-size': `${(props.fontSize ?? 14) - 2}px` }}>
      <span class="flex-1 h-px" style={{ 'background-color': lineColor(), opacity: 0.5 }} />
      <div class="flex items-center gap-1.5 px-1" style={{ color: labelColor() }}>
        <Show when={isCalling()}>
          <Spinner color={accent()} />
        </Show>
        <Show when={!isCalling() && !isCancelled()}>
          <Checkmark />
        </Show>
        <Show when={isCancelled()}>
          <Cross />
        </Show>
        <span class="font-medium tracking-wide">{formatToolName(props.toolCall.toolName)}</span>
        <Show when={isCancelled()}>
          <span class="italic" style={{ opacity: 0.7 }}>
            cancelled by user
          </span>
        </Show>
      </div>
      <span class="flex-1 h-px" style={{ 'background-color': lineColor(), opacity: 0.5 }} />
    </div>
  );
};
