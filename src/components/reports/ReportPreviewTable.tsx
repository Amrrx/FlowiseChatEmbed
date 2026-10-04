import { For, Show, createSignal } from 'solid-js';
import type { ReportPreview } from '@/api/pipeline';
export const formatReportCell = (value: unknown): string =>
  value == null || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
/** Bounded horizontally scrolling preview with keyboard-accessible full cell inspection. */
export const ReportPreviewTable = (props: Pick<ReportPreview, 'columns' | 'preview'>) => {
  const [cell, setCell] = createSignal<string>();
  return (
    <>
      <div class="report-table">
        <table>
          <thead>
            <tr>
              <For each={props.columns}>{(column) => <th>{column.key}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={props.preview.slice(0, 20)}>
              {(row) => (
                <tr>
                  <For each={props.columns}>
                    {(column) => (
                      <td>
                        <button type="button" title={formatReportCell(row[column.key])} onClick={() => setCell(formatReportCell(row[column.key]))}>
                          {formatReportCell(row[column.key])}
                        </button>
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={cell() !== undefined}>
        <div class="report-cell" role="region" aria-label="Full cell value">
          <button type="button" onClick={() => setCell(undefined)}>
            Close value
          </button>
          <pre>{cell()}</pre>
        </div>
      </Show>
    </>
  );
};
