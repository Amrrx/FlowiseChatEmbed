import { Accessor, createEffect, createMemo, createSignal, onCleanup, untrack, on, batch } from 'solid-js';
import {
  PipelineError,
  PipelineScope,
  ReportFollowup,
  ReportList,
  ReportPreview,
  ReportRun,
  ReportState,
  downloadPipelineResult,
  pipelineRequest,
} from '@/api/pipeline';
import type { StreamEvent } from '@/agui/stream';

const PAGE_SIZE = 25;

export const reportState = (run: ReportRun): ReportState =>
  run.availability === 'expired' ? 'expired' : run.status === 'admitted' ? 'queued' : run.status;
export const reportActive = (run: ReportRun): boolean => run.status === 'admitted' || run.status === 'running';

/** One request lifetime and bounded refresh queue for the mounted conversation. */
export function useReports(
  scope: Accessor<PipelineScope>,
  visible: Accessor<boolean>,
  onFollowup: (event: ReportFollowup) => void,
  onInternalQuestions: (questions: string[]) => void,
) {
  const [enabled, setEnabled] = createSignal(false);
  const [open, setOpen] = createSignal(false);
  const [items, setItems] = createSignal<ReportRun[]>([]);
  const [counts, setCounts] = createSignal<ReportList['counts']>({});
  const [filter, setFilter] = createSignal<ReportState>('all');
  const [offset, setOffset] = createSignal(0);
  const [total, setTotal] = createSignal(0);
  const [selectedId, setSelectedId] = createSignal('');
  const [selectedExtra, setSelectedExtra] = createSignal<ReportRun>();
  const [clock, setClock] = createSignal(Date.now());
  const selected = createMemo(() => {
    const run = items().find((run) => run.run_id === selectedId()) ?? selectedExtra();
    if (run?.status === 'ready' && run.expires_at && Date.parse(run.expires_at) <= clock()) return { ...run, availability: 'expired' as const };
    return run;
  });
  const [preview, setPreview] = createSignal<ReportPreview>();
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [downloading, setDownloading] = createSignal(false);
  const [cancelRequested, setCancelRequested] = createSignal<string[]>([]);
  const [refusal, setRefusal] = createSignal('');
  const [cancelNotice, setCancelNotice] = createSignal<{ runId: string; text: string }>();
  let controller = new AbortController();
  let generation = 0;
  let refreshAgain = false;
  let followupsAgain = false;
  let inflight = false;
  let retryAfter = 0;
  let failures = 0;
  let serverOffset = 0;
  const scopeKey = () => {
    const s = scope();
    return [s.apiHost, s.userId, s.agentId, s.sessionId, s.environment].join('|');
  };
  const clear = () => {
    generation++;
    serverOffset = 0;
    setRefusal('');
    controller.abort();
    controller = new AbortController();
    inflight = false;
    refreshAgain = false;
    followupsAgain = false;
    retryAfter = 0;
    failures = 0;
    setBusy(false);
    setItems([]);
    setCounts({});
    setTotal(0);
    setSelectedId('');
    setSelectedExtra(undefined);
    setPreview(undefined);
    setCancelRequested([]);
    setCancelNotice(undefined);
    setError('');
    setDownloading(false);
    setOpen(false);
    setOffset(0);
    setFilter('all');
  };
  createEffect(() => {
    scopeKey();
    untrack(() => {
      clear();
      setEnabled(false);
    });
  });
  onCleanup(() => controller.abort());
  const fail = (err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    if (err instanceof PipelineError && [401, 403].includes(err.status)) {
      clear();
      setEnabled(false);
      setRefusal('Report access was refused. Please sign in again or ask your administrator to restore access.');
      return;
    }
    failures++;
    retryAfter = Date.now() + Math.min(60000, 15000 * failures);
    setError('Unable to refresh reports. Please try again.');
  };
  const refresh = async (followups = false): Promise<void> => {
    if (!enabled()) return;
    if (inflight) {
      refreshAgain = true;
      followupsAgain ||= followups;
      return;
    }
    inflight = true;
    setBusy(true);
    const epoch = generation;
    const current = scope();
    const signal = controller.signal;
    try {
      const result = await pipelineRequest<ReportList>(current, `runs?state=${filter()}&offset=${offset()}&limit=${PAGE_SIZE}`, signal);
      if (epoch !== generation || signal.aborted) return;
      if (result.principal.user_id !== current.userId || result.principal.environment !== current.environment) {
        clear();
        setEnabled(false);
        return;
      }
      const retained = result.items.find((run) => run.run_id === selectedId()) ?? selected();
      if (retained) setSelectedExtra(retained);
      setItems([...new Map(result.items.map((run) => [run.run_id, run])).values()]);
      setTotal(result.total);
      setCounts(result.counts);
      serverOffset = Date.parse(result.server_time) - Date.now();
      setClock(Date.now() + serverOffset);
      if (!selectedId() && result.items[0]) setSelectedId(result.items[0].run_id);
      setError('');
      failures = 0;
      retryAfter = 0;
      if (followups) {
        const recovered: ReportFollowup[] = [];
        const questions = new Set<string>();
        let pageOffset: number | null = 0;
        while (pageOffset !== null) {
          const page: { items: ReportFollowup[]; internal_questions?: string[]; next_offset?: number | null } = await pipelineRequest(
            current,
            `followups?offset=${pageOffset}`,
            signal,
          );
          if (epoch !== generation || signal.aborted) return;
          for (const question of page.internal_questions ?? []) questions.add(question);
          recovered.push(...page.items);
          const next = page.next_offset ?? null;
          pageOffset = next !== null && next > pageOffset ? next : null;
        }
        onInternalQuestions([...questions]);
        for (const event of recovered.reverse()) {
          if (event.session_id === current.sessionId && event.environment === current.environment) onFollowup(event);
        }
      }
    } catch (err) {
      if (epoch === generation) fail(err);
    } finally {
      if (epoch === generation) {
        inflight = false;
        setBusy(false);
        if (refreshAgain) {
          const nextFollowups = followupsAgain;
          refreshAgain = false;
          followupsAgain = false;
          void refresh(nextFollowups);
        }
      }
    }
  };
  createEffect(
    on(
      () => enabled() && open() && visible(),
      (shown) => {
        if (shown) void refresh(true);
      },
    ),
  );
  createEffect(
    on(
      () => `${filter()}|${offset()}`,
      () => {
        if (enabled() && open() && visible()) void refresh();
      },
      { defer: true },
    ),
  );
  const pollTimer = setInterval(() => {
    if (open() && visible() && enabled() && (counts().queued ?? 0) + (counts().running ?? 0) > 0 && Date.now() >= retryAfter) void refresh();
  }, 15000);
  const clockTimer = setInterval(() => {
    if (open() && visible() && enabled()) setClock(Date.now() + serverOffset);
  }, 1000);
  onCleanup(() => {
    clearInterval(pollTimer);
    clearInterval(clockTimer);
  });
  const previewKey = createMemo(() => {
    const run = selected();
    return [run?.run_id, run ? reportState(run) : undefined, open(), visible(), enabled(), scopeKey()].join('|');
  });
  createEffect(
    on(previewKey, () => {
      const run = selected();
      const active = open() && visible() && enabled();
      const id = run?.run_id;
      const state = run ? reportState(run) : undefined;
      setPreview(undefined);
      if (!active || !id || state !== 'ready') return;
      const abort = new AbortController();
      const parent = controller.signal;
      const cancel = () => abort.abort();
      parent.addEventListener('abort', cancel);
      const epoch = generation;
      void pipelineRequest<ReportPreview>(scope(), `runs/${encodeURIComponent(id)}/preview`, abort.signal)
        .then((data) => {
          if (epoch === generation && !abort.signal.aborted) setPreview({ ...data, preview: data.preview.slice(0, 20) });
        })
        .catch((err) => {
          if (!abort.signal.aborted && epoch === generation) {
            fail(err);
            if (err instanceof PipelineError && err.status === 410) void refresh();
          }
        });
      onCleanup(() => {
        abort.abort();
        parent.removeEventListener('abort', cancel);
      });
    }),
  );
  const openReport = async (id?: string) => {
    if (!enabled()) return;
    setOpen(true);
    if (!id) return;
    setSelectedExtra(undefined);
    setSelectedId(id);
    if (items().some((run) => run.run_id === id)) return;
    const epoch = generation;
    try {
      const run = await pipelineRequest<ReportRun>(scope(), `runs/${encodeURIComponent(id)}`, controller.signal);
      if (epoch === generation && selectedId() === id) setSelectedExtra(run);
    } catch (err) {
      if (epoch === generation) fail(err);
    }
  };
  const reconcile = async (reference: string) => {
    if (!enabled()) return;
    setOpen(true);
    const epoch = generation;
    try {
      const run = await pipelineRequest<ReportRun>(scope(), `submissions/${encodeURIComponent(reference)}`, controller.signal);
      if (epoch === generation && run.run_id) await openReport(run.run_id);
    } catch (err) {
      if (epoch !== generation) return;
      if (err instanceof PipelineError && err.status === 404) setError('Submission not yet confirmed. Check again before requesting another report.');
      else fail(err);
    }
  };
  const cancel = async () => {
    const run = selected();
    if (!run || !reportActive(run)) return;
    const epoch = generation;
    setCancelRequested((ids) => [...ids, run.run_id]);
    try {
      const response = await pipelineRequest<Partial<ReportRun>>(scope(), `runs/${encodeURIComponent(run.run_id)}/cancel`, controller.signal, 'POST');
      const result: ReportRun = { ...run, ...response };
      if (epoch === generation) {
        if (result.run_id) {
          setItems((items) => items.map((item) => (item.run_id === result.run_id ? result : item)));
          setSelectedExtra(result);
        }
        if (!reportActive(result) && result.status !== 'cancelled') {
          setCancelNotice({ runId: run.run_id, text: 'The report finished before cancellation took effect.' });
        }
        await refresh();
      }
    } catch (err) {
      if (epoch === generation) {
        setCancelRequested((ids) => ids.filter((id) => id !== run.run_id));
        fail(err);
      }
    }
  };
  const download = async () => {
    const run = selected();
    if (!run || reportState(run) !== 'ready') return;
    const epoch = generation;
    setDownloading(true);
    setError('');
    try {
      await downloadPipelineResult({ ...scope(), runId: run.run_id, title: run.title, admittedAt: run.admitted_at, signal: controller.signal });
    } catch (err) {
      if (epoch === generation) {
        fail(err);
        void refresh();
      }
    } finally {
      if (epoch === generation) setDownloading(false);
    }
  };
  const event = (event: StreamEvent) => {
    if (event.type === 'ack') {
      setEnabled(event.pipeline_reports === true && event.environment === scope().environment);
      if (enabled()) {
        setRefusal('');
        void refresh(true);
      } else {
        clear();
        if (event.authorization_error) setRefusal('Report access was refused. Please sign in again or ask your administrator to restore access.');
      }
      return;
    }
    const s = scope();
    if (
      !enabled() ||
      event.user_id !== s.userId ||
      event.agent_id !== s.agentId ||
      event.session_id !== s.sessionId ||
      event.environment !== s.environment
    )
      return;
    if (event.type === 'pipeline_changed' || event.type === 'pipeline_report_changed') void refresh();
  };
  return {
    enabled,
    refusal,
    pageSize: PAGE_SIZE,
    open,
    setOpen,
    items,
    counts,
    filter,
    setFilter: (value: ReportState) =>
      batch(() => {
        setSelectedId('');
        setSelectedExtra(undefined);
        setOffset(0);
        setFilter(value);
      }),
    offset,
    setOffset: (value: number) => {
      setSelectedId('');
      setSelectedExtra(undefined);
      setOffset(value);
    },
    total,
    selected,
    selectedId,
    preview,
    error,
    busy,
    clock,
    cancelRequested,
    cancelNotice,
    downloading,
    cancel,
    download,
    refresh,
    openReport,
    reconcile,
    event,
  };
}
export type ReportsController = ReturnType<typeof useReports>;
