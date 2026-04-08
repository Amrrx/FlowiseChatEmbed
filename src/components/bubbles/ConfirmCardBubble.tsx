import { For, Show } from 'solid-js';
import type { CardData, CardAction } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (actionId: string, waitId: string) => void;
};

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

  const containerBorderClass = () => {
    if (submitted()) {
      return wasApproved() ? 'border-green-200' : 'border-gray-300';
    }
    return danger() ? 'border-red-300' : 'border-gray-200';
  };

  const headerBorderClass = () => {
    if (submitted()) {
      return wasApproved() ? 'border-green-100' : 'border-gray-200';
    }
    return danger() ? 'border-red-200' : 'border-gray-200';
  };

  const footerBorderClass = () => {
    if (submitted()) {
      return wasApproved() ? 'border-green-100' : 'border-gray-200';
    }
    return danger() ? 'border-red-200' : 'border-gray-200';
  };

  const titleColorClass = () => {
    if (submitted()) return 'text-gray-500';
    return danger() ? 'text-red-700' : '';
  };

  const statusIcon = () => (wasApproved() ? '✓' : '✕');
  const statusLabel = () => (wasApproved() ? 'Approved' : 'Cancelled');
  const statusColorClass = () => (wasApproved() ? 'text-green-600' : 'text-gray-500');

  const buttonClass = (action: CardAction) => {
    if (action.style === 'primary') {
      return danger() ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600';
    }
    if (action.style === 'danger') {
      return 'bg-red-500 text-white hover:bg-red-600';
    }
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  const handleClick = (action: CardAction) => {
    if (submitted()) return;
    props.onAction(action.action_id, waitId());
  };

  return (
    <div
      class={`rounded-lg border overflow-hidden max-w-[320px] transition-opacity ${containerBorderClass()} ${
        submitted() ? 'opacity-75' : ''
      }`}
      style={{
        'background-color': props.backgroundColor ?? '#f7f8ff',
        color: props.textColor ?? '#303235',
        'font-size': `${props.fontSize ?? 14}px`,
      }}
    >
      <div class={`px-4 py-2 border-b font-semibold text-sm ${headerBorderClass()} ${titleColorClass()}`}>{title()}</div>
      <div class={`px-4 py-3 text-sm whitespace-pre-wrap ${submitted() ? 'text-gray-500' : ''}`}>{message()}</div>
      <Show
        when={!submitted()}
        fallback={
          <div class={`px-4 py-2 border-t flex items-center gap-2 ${footerBorderClass()}`}>
            <span class={`text-sm font-semibold ${statusColorClass()}`}>{statusIcon()}</span>
            <span class={`text-xs font-medium ${statusColorClass()}`}>{statusLabel()}</span>
          </div>
        }
      >
        {props.card.actions.length > 0 && (
          <div class={`px-4 py-2 border-t flex gap-2 justify-end ${footerBorderClass()}`}>
            <For each={props.card.actions}>
              {(action) => (
                <button
                  type="button"
                  class={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${buttonClass(action)}`}
                  onClick={() => handleClick(action)}
                >
                  {action.label}
                </button>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  );
};