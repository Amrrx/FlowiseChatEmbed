import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { ReportState } from '@/api/pipeline';
import { reportActive, reportState, ReportsController } from './useReports';
import { ReportPreviewTable, formatReportCell } from './ReportPreviewTable';
const states: ReportState[] = ['all', 'queued', 'running', 'ready', 'failed', 'cancelled', 'expired'];
const date = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');
const label = (state: string) => state.charAt(0).toUpperCase() + state.slice(1);
export const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" />
  </svg>
);
export const ReportsPanel = (props: {
  controller: ReportsController;
  anchor: () => HTMLElement | undefined;
  mount?: () => HTMLElement | undefined;
  visible: boolean;
  onRetry: (title: string) => void;
  background?: string;
  color?: string;
  accent?: string;
}) => {
  const c = props.controller;
  let panel: HTMLElement | undefined;
  let filters: HTMLElement | undefined;
  let drag: { pointer: number; x: number; scroll: number; moved: boolean } | undefined;
  const scrollFilters = (event: WheelEvent) => {
    if (!filters || event.deltaX !== 0 || event.deltaY === 0) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? filters.clientWidth : 1);
    const next = Math.max(0, Math.min(filters.scrollLeft + delta, filters.scrollWidth - filters.clientWidth));
    if (next === filters.scrollLeft) return;
    event.preventDefault();
    filters.scrollLeft = next;
  };
  const startFilterDrag = (event: PointerEvent) => {
    drag = undefined;
    // Touch keeps native swiping; mouse dragging supplies the hidden scrollbar's affordance.
    if (!filters || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { pointer: event.pointerId, x: event.clientX, scroll: filters.scrollLeft, moved: false };
  };
  const moveFilterDrag = (event: PointerEvent) => {
    if (!filters || !drag || event.pointerId !== drag.pointer || event.buttons !== 1) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && Math.abs(distance) <= 4) return;
    drag.moved = true;
    filters.setPointerCapture(event.pointerId);
    filters.scrollLeft = drag.scroll - distance;
  };
  const endFilterDrag = (event: PointerEvent) => {
    if (filters?.hasPointerCapture(event.pointerId)) filters.releasePointerCapture(event.pointerId);
  };
  const [rect, setRect] = createSignal({ top: 0, left: 0, width: 440, height: 600, overlay: true });
  createEffect(() => {
    if (!c.open() || !props.visible) return;
    const position = () => {
      const anchor = props.anchor()?.getBoundingClientRect();
      if (!anchor) return;
      const width = 440;
      const leftSpace = anchor.left >= width + 12;
      const rightSpace = window.innerWidth - anchor.right >= width + 12;
      const overlay = window.innerWidth <= 640 || (!leftSpace && !rightSpace);
      setRect({
        top: Math.max(0, anchor.top),
        left: overlay ? anchor.left : leftSpace ? anchor.left - width - 10 : anchor.right + 10,
        width: overlay ? anchor.width : width,
        height: Math.min(anchor.height, window.innerHeight - Math.max(0, anchor.top)),
        overlay,
      });
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    const observer = new ResizeObserver(position);
    const anchor = props.anchor();
    if (anchor) observer.observe(anchor);
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    });
  });
  createEffect(() => {
    if (c.open() && props.visible) queueMicrotask(() => panel?.querySelector<HTMLButtonElement>('button')?.focus());
  });
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab' || !rect().overlay || !panel) return;
    const controls = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, [tabindex="0"]')].filter(
      (element) => element.getClientRects().length > 0,
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = (panel.getRootNode() as Document | ShadowRoot).activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  const close = () => {
    c.setOpen(false);
    props.anchor()?.querySelector<HTMLButtonElement>('[data-reports-button]')?.focus();
  };
  return (
    <Show when={c.enabled() && c.open() && props.visible}>
      <Portal mount={props.mount?.() ?? props.anchor()?.parentElement ?? undefined}>
        <section
          ref={panel}
          tabIndex={-1}
          class="reports-panel"
          aria-modal={rect().overlay ? true : undefined}
          role={rect().overlay ? 'dialog' : 'region'}
          aria-label="Reports"
          onKeyDown={trapFocus}
          style={{
            top: `${rect().top}px`,
            left: `${rect().left}px`,
            width: `${rect().width}px`,
            height: `${rect().height}px`,
            'background-color': props.background ?? '#fff',
            color: props.color ?? '#303235',
            '--report-accent': props.accent ?? '#3b81f6',
          }}
        >
          <header>
            <Show when={rect().overlay}>
              <button type="button" onClick={close} aria-label="Back to chat">
                ←
              </button>
            </Show>
            <ReportsIcon />
            <h2>Reports</h2>
            <span class="report-scope">This conversation</span>
            <button type="button" class="report-close" onClick={close} aria-label="Close reports">
              ×
            </button>
          </header>
          <nav
            ref={filters}
            class="scrollable-container"
            aria-label="Filter reports"
            onWheel={scrollFilters}
            onPointerDown={startFilterDrag}
            onPointerMove={moveFilterDrag}
            onPointerUp={endFilterDrag}
            onPointerCancel={endFilterDrag}
          >
            <For each={states}>
              {(state) => (
                <button
                  type="button"
                  aria-pressed={c.filter() === state}
                  onClick={(event) => {
                    if (event.detail !== 0 && drag?.moved) return;
                    c.setFilter(state);
                  }}
                >
                  {label(state)} <span>{c.counts()[state] ?? 0}</span>
                </button>
              )}
            </For>
          </nav>
          <Show when={c.error()}>
            <div class="report-notice" role="alert">
              {c.error()}{' '}
              <button type="button" disabled={c.busy()} onClick={() => c.refresh(true)}>
                Retry
              </button>
            </div>
          </Show>
          <ul class="report-list" aria-busy={c.busy()}>
            <For each={c.items()} fallback={<li class="report-muted">{c.busy() ? 'Loading reports…' : 'No reports in this state.'}</li>}>
              {(run) => (
                <li>
                  <button type="button" aria-current={c.selectedId() === run.run_id} onClick={() => c.openReport(run.run_id)}>
                    <strong>{run.title}</strong>
                    <span class={`report-pill ${reportState(run)}`}>{label(reportState(run))}</span>
                    <small>{date(run.admitted_at)}</small>
                  </button>
                </li>
              )}
            </For>
          </ul>
          <Show when={c.total() > c.pageSize}>
            <div class="report-paging">
              <button disabled={c.offset() === 0 || c.busy()} onClick={() => c.setOffset(Math.max(0, c.offset() - c.pageSize))}>
                Previous
              </button>
              <span>
                {c.offset() + 1}–{Math.min(c.offset() + c.pageSize, c.total())} of {c.total()}
              </span>
              <button disabled={c.offset() + c.pageSize >= c.total() || c.busy()} onClick={() => c.setOffset(c.offset() + c.pageSize)}>
                Next
              </button>
            </div>
          </Show>
          <main class="report-detail">
            <Show when={c.selected()} fallback={<p class="report-muted">Select a report to see it here.</p>}>
              {(run) => (
                <>
                  <div class="report-title">
                    <h3>{run().title}</h3>
                    <span class={`report-pill ${reportState(run())}`}>{label(reportState(run()))}</span>
                  </div>
                  <Show when={reportActive(run())}>
                    <p class="report-muted">
                      Elapsed {Math.max(0, Math.floor((c.clock() - Date.parse(run().started_at ?? run().admitted_at)) / 1000))}s · You can keep
                      chatting.
                    </p>
                  </Show>
                  <ul class="report-steps">
                    <For each={run().steps}>
                      {(step) => (
                        <li>
                          <span>{['done', 'completed', 'ready'].includes(step.status) ? '✓' : step.status === 'failed' ? '×' : '○'}</span>
                          <span>
                            {step.name} <small>{step.op}</small>
                          </span>
                          <small>{label(step.status)}</small>
                        </li>
                      )}
                    </For>
                  </ul>
                  <Show when={run().result_summary}>
                    {(summary) => (
                      <div class="report-facts">
                        <div>
                          <small>Rows</small>
                          <b>{summary().row_count.toLocaleString()}</b>
                        </div>
                        <div>
                          <small>Columns</small>
                          <b>{summary().column_count}</b>
                        </div>
                        <div>
                          <small>Result</small>
                          <b>{summary().complete ? 'Complete' : 'Incomplete'}</b>
                        </div>
                        <Show when={summary().expected_count != null}>
                          <p>Expected: {summary().expected_count}</p>
                        </Show>
                      </div>
                    )}
                  </Show>
                  <Show when={reportState(run()) === 'failed'}>
                    <p class="report-notice">{run().error ?? 'The report could not be completed.'}</p>
                  </Show>
                  <Show when={c.cancelNotice()?.runId === run().run_id}>
                    <p class="report-notice" role="status">
                      {c.cancelNotice()?.text}
                    </p>
                  </Show>
                  <Show when={reportState(run()) === 'cancelled'}>
                    <p class="report-notice">This report was cancelled.</p>
                  </Show>
                  <Show when={reportState(run()) === 'expired'}>
                    <p class="report-notice">The result expired. Summary information is retained; preview and download are no longer available.</p>
                  </Show>
                  <Show when={reportState(run()) === 'ready'}>
                    <p class="report-muted">Available until {date(run().expires_at)}</p>
                    <Show when={c.preview()} fallback={<p class="report-muted">Loading preview…</p>}>
                      {(preview) => (
                        <>
                          <For
                            each={(['match_counts', 'join_counts'] as const).filter(
                              (key) => preview()[key] && Object.keys(preview()[key] ?? {}).length,
                            )}
                          >
                            {(key) => (
                              <div class="report-outcomes">
                                <b>{key === 'match_counts' ? 'Match counts' : 'Join counts'}</b>
                                <For each={Object.entries(preview()[key] ?? {})}>
                                  {([name, value]) => (
                                    <span>
                                      {name}: {formatReportCell(value)}
                                    </span>
                                  )}
                                </For>
                                <small>Counts describe this operation, before any later filtering.</small>
                              </div>
                            )}
                          </For>
                          <ReportPreviewTable columns={preview().columns} preview={preview().preview} />
                          <small class="report-muted">
                            Showing the first {preview().preview.length} of {preview().row_count.toLocaleString()} rows.
                          </small>
                        </>
                      )}
                    </Show>
                  </Show>
                  <div class="report-actions">
                    <Show when={reportActive(run())}>
                      <button disabled={c.cancelRequested().includes(run().run_id)} onClick={c.cancel}>
                        {c.cancelRequested().includes(run().run_id) ? 'Cancellation requested' : 'Cancel report'}
                      </button>
                    </Show>
                    <Show when={reportState(run()) === 'ready'}>
                      <button class="primary" disabled={c.downloading()} onClick={c.download}>
                        {c.downloading() ? 'Preparing…' : 'Download Excel'}
                      </button>
                    </Show>
                    <Show when={['failed', 'cancelled', 'expired'].includes(reportState(run()))}>
                      <button
                        onClick={() => {
                          props.onRetry(run().title);
                          close();
                        }}
                      >
                        Retry in chat
                      </button>
                    </Show>
                  </div>
                </>
              )}
            </Show>
          </main>
        </section>
      </Portal>
    </Show>
  );
};
