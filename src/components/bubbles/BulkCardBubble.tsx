import { Show, createSignal } from 'solid-js';
import type { CardData, CardAction } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  accentColor?: string;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};

const OPERATION_LABELS: Record<string, string> = {
  avl_unit_rename_bulk: 'Bulk rename',
  avl_bulk_test_echo: 'Bulk test',
};

export const BulkCardBubble = (props: Props) => {
  const data = () => props.card.data;
  const isSummary = () => props.card.type_id === 'bulk_summary';
  const total = () => (data().total as number) ?? 0;
  const completed = () => (isSummary() ? total() : (data().completed as number) ?? 0);
  const succeeded = () => (data().succeeded as number) ?? 0;
  const failed = () => ((data().failed_retryable as number) ?? 0) + ((data().failed_permanent as number) ?? 0);
  const cancelledCount = () => (data().cancelled as number) ?? 0;
  const status = () => (data().status as string) ?? 'running';
  const running = () => !isSummary() && status() === 'running';
  const percent = () => (total() > 0 ? Math.round((completed() / total()) * 100) : 0);
  const operationLabel = () => OPERATION_LABELS[data().operation_name as string] ?? (data().operation_name as string) ?? 'Bulk operation';

  const [actionSent, setActionSent] = createSignal<string | null>(null);

  const handleAction = (action: CardAction) => {
    if (actionSent()) return;
    setActionSent(action.action_id);
    props.onAction(props.card, action, { bulk_run_id: data().bulk_run_id });
  };

  const statusBadge = () => {
    if (running()) return { label: `Running ${completed()}/${total()}`, color: '#3B81F6' };
    if (status() === 'cancelled') return { label: 'Cancelled', color: '#f59e0b' };
    if (failed() > 0) return { label: 'Completed with failures', color: '#ef4444' };
    return { label: 'Completed', color: '#10b981' };
  };

  return (
    <div
      class="rounded-lg border border-gray-200 overflow-hidden max-w-[320px] w-full"
      style={{
        'background-color': props.backgroundColor ?? '#f7f8ff',
        color: props.textColor ?? '#303235',
        'font-size': `${props.fontSize ?? 14}px`,
      }}
    >
      <div class="px-4 py-3 flex items-center justify-between">
        <span class="text-sm font-medium">{operationLabel()}</span>
        <span class="text-xs px-2 py-0.5 rounded-full text-white" style={{ 'background-color': statusBadge().color }}>
          {statusBadge().label}
        </span>
      </div>

      <div class="px-4 pb-2">
        <div class="h-2 rounded bg-gray-200 overflow-hidden">
          <div class="h-2 rounded transition-all duration-300" style={{ width: `${percent()}%`, 'background-color': statusBadge().color }} />
        </div>
      </div>

      <div class="px-4 pb-3 flex gap-3 text-xs text-gray-500">
        <span>✓ {succeeded()}</span>
        <Show when={failed() > 0}>
          <span style={{ color: '#ef4444' }}>✗ {failed()}</span>
        </Show>
        <Show when={cancelledCount() > 0}>
          <span style={{ color: '#f59e0b' }}>⊘ {cancelledCount()}</span>
        </Show>
        <span class="ml-auto">{total()} items</span>
      </div>

      <Show when={running() || (isSummary() && props.card.actions.some((a) => a.action_id === 'retry_failed'))}>
        <div class="px-4 py-2 border-t border-gray-200 flex justify-end gap-2">
          <Show when={running()}>
            <button
              class={`px-3 py-1 rounded text-xs font-medium border border-gray-300 ${
                actionSent() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
              }`}
              disabled={!!actionSent()}
              onClick={() => handleAction({ action_id: 'cancel', label: 'Cancel', style: 'secondary', payload_fields: [] })}
            >
              {actionSent() === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </button>
          </Show>
          <Show when={isSummary() && props.card.actions.some((a) => a.action_id === 'retry_failed')}>
            <button
              class={`px-3 py-1 rounded text-xs font-medium text-white ${
                actionSent() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
              }`}
              style={{ 'background-color': props.accentColor ?? '#3B81F6' }}
              disabled={!!actionSent()}
              onClick={() => handleAction({ action_id: 'retry_failed', label: 'Retry failed items', style: 'primary', payload_fields: [] })}
            >
              {actionSent() === 'retry_failed' ? 'Retrying…' : 'Retry failed items'}
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
};
