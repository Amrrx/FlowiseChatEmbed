import { Show, createSignal } from 'solid-js';
import type { CardData, CardAction } from '../../agui/types';
import { PIPELINE_DOWNLOAD_ACTION_ID } from '@/api/pipeline';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void | Promise<void>;
};

const DOWNLOAD_ACTION: CardAction = {
  action_id: PIPELINE_DOWNLOAD_ACTION_ID,
  label: 'Download Excel',
  style: 'primary',
  payload_fields: ['run_id'],
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return String(iso);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Report acknowledgement and summary; rows require a fresh authorized panel preview. */
export const PipelineResultCardBubble = (props: Props) => {
  const [downloading, setDownloading] = createSignal(false);
  const [failure, setFailure] = createSignal('');

  const data = () => props.card.data;
  const hasResult = () => data().row_count !== undefined && (!data().status || data().status === 'ready');
  const openReport = () =>
    props.onAction(
      props.card,
      { action_id: 'open_reports', label: 'Open Reports', style: 'secondary', payload_fields: ['run_id', 'submission_ref'] },
      { run_id: data().run_id, submission_ref: data().submission_ref },
    );
  const rowCount = () => Number(data().row_count ?? 0);
  const countLabel = () => {
    const expected = data().expected_count;
    return expected !== null && expected !== undefined && expected !== rowCount() ? `${rowCount()} of ${expected}` : `${rowCount()}`;
  };

  const download = async () => {
    setDownloading(true);
    setFailure('');
    try {
      await props.onAction(props.card, DOWNLOAD_ACTION, { run_id: data().run_id });
    } catch (error) {
      // An aborted download belongs to a user who left the session: nothing to report.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      class="rounded-lg border border-gray-200 overflow-hidden w-full max-w-[560px]"
      style={{
        'background-color': props.backgroundColor ?? '#f7f8ff',
        color: props.textColor ?? '#303235',
        'font-size': `${props.fontSize ?? 14}px`,
      }}
    >
      <div class="px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
        <span class="font-semibold text-sm">{data().title ?? 'Report result'}</span>
        <span class="text-xs" style={{ color: data().complete ? '#16a34a' : '#d97706' }}>
          {hasResult()
            ? data().complete
              ? 'Complete'
              : 'Incomplete'
            : data().status === 'submission_unconfirmed'
              ? 'Submission unconfirmed'
              : data().status === 'admitted'
                ? 'Queued'
                : data().status ?? 'Report'}
        </span>
      </div>
      <Show when={hasResult()}>
        <div class="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#4b5563' }}>
          <span>
            Rows: <b>{countLabel()}</b>
          </span>
          <span>Columns: {data().column_count ?? 0}</span>
          <span>Available until: {formatDate(data().expires_at)}</span>
        </div>
      </Show>
      <Show when={!hasResult()}>
        <p class="px-4 py-2 text-xs">
          {data().status === 'submission_unconfirmed'
            ? 'Admission has not been confirmed. Check Reports before requesting another report.'
            : 'You can keep chatting. Open Reports to check progress.'}
        </p>
      </Show>
      <div class="px-4 py-2 border-t border-gray-200 mt-2 flex items-center justify-end gap-2">
        <Show when={failure()}>
          <span class="text-xs" style={{ color: '#dc2626' }}>
            Download failed: {failure()}
          </span>
        </Show>
        <Show when={data().run_id || data().submission_ref}>
          <button type="button" class="px-3 py-1.5 rounded text-xs" onClick={openReport}>
            Open Reports
          </button>
        </Show>
        <Show when={hasResult()}>
          <button
            class="px-3 py-1.5 rounded text-xs font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
            disabled={downloading() || !data().run_id || (data().expires_at && Date.parse(data().expires_at) <= Date.now())}
            onClick={download}
          >
            {downloading() ? 'Preparing…' : DOWNLOAD_ACTION.label}
          </button>
        </Show>
      </div>
    </div>
  );
};
