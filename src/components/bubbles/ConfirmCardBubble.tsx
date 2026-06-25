import { For, Show } from 'solid-js';
import type { CardData, CardAction } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (actionId: string, waitId: string) => void;
};

const ACCENTS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#06b6d4', '#f43f5e'];

const accentFor = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

const QuestionIcon = (props: { color: string }) => (
  <svg
    class="shrink-0"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color}
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const WarningIcon = (props: { color: string }) => (
  <svg
    class="shrink-0"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color}
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg
    class="shrink-0"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CrossIcon = () => (
  <svg
    class="shrink-0"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ConfirmCardBubble = (props: Props) => {
  const title = () => (props.card.data.title as string) ?? 'Confirm action';
  const message = () => (props.card.data.message as string) ?? '';
  const danger = () => props.card.data.danger === true;
  const waitId = () => (props.card.data.wait_id as string) ?? '';
  // Submitted state is stored on the card itself so it survives Bot.tsx's
  // cloneDeep-induced component remounts during LLM streaming updates.
  const submittedAction = () => (props.card.data.submitted_action as string | undefined) ?? null;
  const submitted = () => submittedAction() !== null;
  const wasApproved = () => submittedAction() === 'approve';

  const accent = () => (danger() ? '#ef4444' : accentFor(props.card.card_id));
  const stripeColor = () => {
    if (!submitted()) return accent();
    return wasApproved() ? '#22c55e' : '#9ca3af';
  };
  const headerColor = () => stripeColor();

  const handleClick = (action: CardAction) => {
    if (submitted()) return;
    props.onAction(action.action_id, waitId());
  };

  const buttonStyle = (action: CardAction): Record<string, string> => {
    if (action.style === 'primary') return { 'background-color': danger() ? '#ef4444' : accent(), color: '#ffffff' };
    if (action.style === 'danger') return { 'background-color': '#ef4444', color: '#ffffff' };
    return { 'background-color': '#f3f4f6', color: '#374151' };
  };

  return (
    <div
      class={`relative rounded-xl overflow-hidden max-w-[340px] transition-opacity ${submitted() ? 'opacity-75' : ''}`}
      style={{
        'background-color': props.backgroundColor ?? '#ffffff',
        color: props.textColor ?? '#303235',
        'font-size': `${props.fontSize ?? 14}px`,
        'box-shadow': '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <span class="absolute start-0 top-0 bottom-0 w-1" style={{ 'background-color': stripeColor() }} />

      <div class="ps-5 pe-4 py-4 flex flex-col gap-3">
        <div class="flex items-center gap-2" style={{ color: headerColor() }}>
          <span class="flex-1 h-px" style={{ 'background-color': headerColor(), opacity: 0.3 }} />
          <Show when={danger()} fallback={<QuestionIcon color={headerColor()} />}>
            <WarningIcon color={headerColor()} />
          </Show>
          <span class="text-xs font-semibold uppercase tracking-wider">{title()}</span>
          <span class="flex-1 h-px" style={{ 'background-color': headerColor(), opacity: 0.3 }} />
        </div>

        <div class="text-sm whitespace-pre-wrap leading-relaxed">{message()}</div>

        <Show
          when={!submitted()}
          fallback={
            <div class="flex items-center gap-1.5 text-xs font-medium" style={{ color: stripeColor() }}>
              <Show when={wasApproved()} fallback={<CrossIcon />}>
                <CheckIcon />
              </Show>
              <span>{wasApproved() ? 'Approved' : 'Cancelled'}</span>
            </div>
          }
        >
          <Show when={props.card.actions.length > 0}>
            <div class="flex gap-2 justify-end">
              <For each={props.card.actions}>
                {(action) => (
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer hover:opacity-90 active:scale-95"
                    style={buttonStyle(action)}
                    onClick={() => handleClick(action)}
                  >
                    {action.label}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
};
