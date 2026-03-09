import { For, Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { CardData, CardAction } from '../../agui/types';
import { DeviceCardBubble } from './DeviceCardBubble';
import { HealthCheckCardBubble } from './HealthCheckCardBubble';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};

// Card renderer map — add specialized renderers here by entity_type
const ENTITY_RENDERERS: Record<string, Component<Props>> = {
  device: DeviceCardBubble,
  health_check: HealthCheckCardBubble,
};

const FIELD_EXCLUDES = ['entity_type'];

const formatFieldLabel = (key: string): string => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatFieldValue = (value: any): string => {
  if (value === null || value === undefined) return '\u2014';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const EntityCardBubble = (props: Props) => {
  const entityType = () => props.card.data.entity_type ?? 'Entity';

  // Delegate to specialized renderer if one exists
  const specializedRenderer = () => ENTITY_RENDERERS[entityType()];
  if (specializedRenderer()) {
    return <Dynamic component={specializedRenderer()!} {...props} />;
  }

  // Generic fallback for unmapped entity types
  const fields = () => Object.entries(props.card.data).filter(([key]) => !FIELD_EXCLUDES.includes(key));

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
      <div class="px-4 py-2 border-b border-gray-200 font-semibold text-sm capitalize">{formatFieldLabel(entityType())}</div>
      <div class="px-4 py-3 space-y-1.5">
        <For each={fields()}>
          {([key, value]) => (
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">{formatFieldLabel(key)}</span>
              <span class="font-medium">{formatFieldValue(value)}</span>
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
                  action.style === 'primary'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : action.style === 'danger'
                      ? 'bg-red-500 text-white hover:bg-red-600'
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
