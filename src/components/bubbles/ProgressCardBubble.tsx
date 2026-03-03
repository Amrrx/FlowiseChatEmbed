import { For } from 'solid-js';
import type { CardData, CardAction, ProgressStep } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};

const STATUS_ICON: Record<string, string> = {
  completed: '\u2705',
  in_progress: '\u23F3',
  pending: '\u25CB',
  failed: '\u274C',
};

const STATUS_COLOR: Record<string, string> = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  pending: '#9ca3af',
  failed: '#ef4444',
};

export const ProgressCardBubble = (props: Props) => {
  const title = () => (props.card.data.title as string) ?? 'Workflow';
  const steps = () => (props.card.data.steps as ProgressStep[]) ?? [];

  const handleAction = (action: CardAction) => {
    const payload: Record<string, any> = {};
    for (const field of action.payload_fields) {
      payload[field] = props.card.data[field] ?? props.card.card_id;
    }
    props.onAction(props.card, action, payload);
  };

  return (
    <div
      class="rounded-lg border border-gray-200 overflow-hidden max-w-[320px]"
      style={{
        'background-color': props.backgroundColor ?? '#f7f8ff',
        color: props.textColor ?? '#303235',
        'font-size': `${props.fontSize ?? 14}px`,
      }}
    >
      <div class="px-4 py-2 border-b border-gray-200 font-semibold text-sm">{title()}</div>
      <div class="px-4 py-3 space-y-2">
        <For each={steps()}>
          {(step) => (
            <div class="flex items-center gap-3 text-sm">
              <span style={{ color: STATUS_COLOR[step.status] ?? '#9ca3af' }}>
                {STATUS_ICON[step.status] ?? '\u25CB'}
              </span>
              <span class="flex-1">{step.label}</span>
              {step.result && <span class="text-xs text-gray-400 truncate max-w-[100px]">{step.result}</span>}
              {step.error && <span class="text-xs text-red-400 truncate max-w-[100px]">{step.error}</span>}
            </div>
          )}
        </For>
      </div>
      {props.card.actions.length > 0 && (
        <div class="px-4 py-2 border-t border-gray-200 flex gap-2 justify-end">
          <For each={props.card.actions}>
            {(action) => (
              <button
                class={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  action.style === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : action.style === 'primary'
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            )}
          </For>
        </div>
      )}
    </div>
  );
};
