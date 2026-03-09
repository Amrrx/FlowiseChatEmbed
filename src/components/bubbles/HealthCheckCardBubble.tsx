import { For, Show, createSignal } from 'solid-js';
import type { CardData, CardAction } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};

type ValidationCheck = {
  text: string;
  expected: string;
  actual: string;
  status: boolean;
  comment: string;
  tag: string;
  priority: string;
  confidence: string;
};

type RCAEntry = {
  id: string;
  title: string;
  reason: string;
  recommendation: string;
  severity: string;
  matched_tags: string[];
};

const SEVERITY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  medium: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
  low: { bg: '#f0f9ff', text: '#2563eb', border: '#93c5fd' },
};

const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fef2f2', text: '#dc2626' },
  medium: { bg: '#fffbeb', text: '#d97706' },
  low: { bg: '#f0f9ff', text: '#2563eb' },
};

const formatTimestamp = (ts: string | null | undefined): string => {
  if (!ts) return '\u2014';
  try {
    // Handle double timezone suffix (e.g. "2026-03-08T20:30:39.610946+00:00Z")
    const cleaned = ts.replace(/([+-]\d{2}:\d{2})Z$/, '$1');
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(ts);
  }
};

const PriorityBadge = (props: { priority: string }) => {
  const p = () => String(props.priority ?? 'medium').toLowerCase();
  const colors = () => PRIORITY_COLOR[p()] ?? PRIORITY_COLOR.medium;
  return (
    <span class="px-1.5 py-0 rounded text-[9px] font-bold uppercase" style={{ 'background-color': colors().bg, color: colors().text }}>
      {p()}
    </span>
  );
};

const SeverityBadge = (props: { severity: string }) => {
  const s = () => String(props.severity ?? 'medium').toLowerCase();
  const colors = () => SEVERITY_COLOR[s()] ?? SEVERITY_COLOR.medium;
  return (
    <span class="px-1.5 py-0 rounded text-[9px] font-bold uppercase" style={{ 'background-color': colors().border, color: colors().text }}>
      {s()}
    </span>
  );
};

const SectionHeader = (props: { icon: string; title: string; count: number; color: string }) => (
  <div class="flex items-center gap-1.5 mb-2">
    <span style={{ color: props.color, 'font-size': '12px' }}>{props.icon}</span>
    <span class="text-[11px] uppercase tracking-wider font-semibold" style={{ color: props.color }}>
      {props.title}
    </span>
    <span class="px-1.5 py-0 rounded-full text-[10px] font-semibold" style={{ 'background-color': props.color + '18', color: props.color }}>
      {props.count}
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// Failed check card
// ---------------------------------------------------------------------------

const FailedCheck = (props: { check: ValidationCheck; rcaHint: RCAEntry | undefined }) => (
  <div class="rounded-md px-2.5 py-2 mb-1.5" style={{ 'background-color': '#fef2f2', border: '1px solid #fecaca' }}>
    <div class="flex items-center gap-1.5 flex-wrap">
      <span style={{ color: '#dc2626', 'font-size': '12px' }}>{'\u2717'}</span>
      <span class="text-[12px] font-medium flex-1 min-w-0" style={{ color: '#1f2937' }}>
        {props.check.text}
      </span>
      <PriorityBadge priority={props.check.priority} />
    </div>
    <div class="grid grid-cols-2 gap-2 mt-1.5 ml-4">
      <div>
        <span class="text-[10px] uppercase" style={{ color: '#9ca3af' }}>
          Expected
        </span>
        <div class="text-[12px] font-medium" style={{ color: '#16a34a' }}>
          {props.check.expected}
        </div>
      </div>
      <div>
        <span class="text-[10px] uppercase" style={{ color: '#9ca3af' }}>
          Actual
        </span>
        <div class="text-[12px] font-medium" style={{ color: '#dc2626' }}>
          {props.check.actual}
        </div>
      </div>
    </div>
    <Show when={props.rcaHint}>
      <div class="mt-1.5 ml-4 flex items-start gap-1 text-[11px]" style={{ color: '#92400e' }}>
        <span>{'\uD83D\uDCA1'}</span>
        <span>
          <span class="font-semibold">{props.rcaHint!.title}:</span> {props.rcaHint!.recommendation}
        </span>
      </div>
    </Show>
  </div>
);

// ---------------------------------------------------------------------------
// Passed check line
// ---------------------------------------------------------------------------

const PassedCheck = (props: { check: ValidationCheck }) => (
  <div class="flex items-center gap-1.5 py-0.5">
    <span style={{ color: '#16a34a', 'font-size': '11px' }}>{'\u2713'}</span>
    <span class="text-[12px]" style={{ color: '#4b5563' }}>
      {props.check.comment}
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// RCA card
// ---------------------------------------------------------------------------

const RCACard = (props: { rca: RCAEntry }) => {
  const s = () => String(props.rca.severity ?? 'medium').toLowerCase();
  const colors = () => SEVERITY_COLOR[s()] ?? SEVERITY_COLOR.medium;
  return (
    <div class="rounded-md px-2.5 py-2 mb-1.5" style={{ 'background-color': '#fffbeb', border: '1px solid #fde68a' }}>
      <div class="flex items-center gap-2">
        <SeverityBadge severity={props.rca.severity} />
        <span class="text-[12px] font-semibold" style={{ color: colors().text }}>
          {props.rca.title}
        </span>
      </div>
      <div class="mt-1 text-[11px]" style={{ color: '#4b5563' }}>
        {props.rca.reason}
      </div>
      <div class="mt-1 flex items-start gap-1 text-[11px]" style={{ color: '#6b7280' }}>
        <span style={{ color: colors().text }}>{'\u2192'}</span>
        <span>{props.rca.recommendation}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const HealthCheckCardBubble = (props: Props) => {
  const d = () => props.card.data;
  const checks = (): ValidationCheck[] => (d().validation_comments as ValidationCheck[]) ?? [];
  const rcaList = (): RCAEntry[] => (d().root_cause_analysis as RCAEntry[]) ?? [];
  const errorMessage = () => (d().error_message as string) ?? null;
  const imei = () => (d().imei as string) ?? '\u2014';
  const scope = () => (d().validation_scope as string) ?? '\u2014';
  const timestamp = () => d().timestamp as string | undefined;

  const failedChecks = () => checks().filter((c) => !c.status);
  const passedChecks = () => checks().filter((c) => c.status);
  const failCount = () => failedChecks().length;
  const passCount = () => passedChecks().length;
  const totalCount = () => checks().length;

  const isError = () => !!errorMessage();
  const isHealthy = () => !isError() && failCount() === 0;

  const headerBg = () => {
    if (isError()) return '#fef2f2';
    if (isHealthy()) return '#f0fdf4';
    return '#fffbeb';
  };
  const headerIcon = () => {
    if (isError()) return '\uD83D\uDD34';
    if (isHealthy()) return '\uD83D\uDFE2';
    return '\uD83D\uDFE1';
  };
  const statusLabel = () => {
    if (isError()) return 'Error';
    if (isHealthy()) return 'Healthy';
    return 'Issues Found';
  };
  const statusColor = () => {
    if (isError()) return '#dc2626';
    if (isHealthy()) return '#16a34a';
    return '#d97706';
  };

  const [passedExpanded, setPassedExpanded] = createSignal(false);

  const rcaForTag = (tag: string): RCAEntry | undefined => rcaList().find((rca) => rca.matched_tags?.includes(tag));

  const handleAction = (action: CardAction) => {
    const payload: Record<string, any> = {};
    for (const field of action.payload_fields) {
      payload[field] = d()[field] ?? props.card.card_id;
    }
    props.onAction(props.card, action, payload);
  };

  return (
    <div
      class="rounded-xl border overflow-hidden"
      style={{
        'background-color': '#ffffff',
        'border-color': '#e5e7eb',
        'max-width': '400px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.08)',
        color: props.textColor ?? '#1f2937',
        'font-size': `${props.fontSize ?? 13}px`,
      }}
    >
      {/* Header */}
      <div class="px-4 py-3 flex items-center justify-between" style={{ 'background-color': headerBg(), 'border-bottom': '1px solid #e5e7eb' }}>
        <div class="flex items-center gap-2">
          <span style={{ 'font-size': '18px', 'line-height': '1' }}>{headerIcon()}</span>
          <div class="flex flex-col">
            <span class="text-[14px] font-bold" style={{ color: '#0f172a' }}>
              Health Check
            </span>
            <span class="text-[10px]" style={{ color: '#9ca3af' }}>
              {imei()}
            </span>
          </div>
        </div>
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ 'background-color': statusColor() + '18', color: statusColor() }}
        >
          {statusLabel()}
        </span>
      </div>

      <div class="px-4 py-3">
        {/* Error state */}
        <Show when={isError()}>
          <div class="rounded-md px-3 py-2 text-[12px]" style={{ 'background-color': '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {errorMessage()}
          </div>
        </Show>

        {/* Normal states (healthy or issues found) */}
        <Show when={!isError()}>
          {/* Meta row */}
          <div class="flex items-center justify-between text-[11px] mb-3" style={{ color: '#6b7280' }}>
            <div class="flex items-center gap-3">
              <span>
                Scope:{' '}
                <span class="font-medium capitalize" style={{ color: '#374151' }}>
                  {scope()}
                </span>
              </span>
              <span>
                Pass:{' '}
                <span class="font-medium" style={{ color: statusColor() }}>
                  {passCount()}/{totalCount()}
                </span>
              </span>
            </div>
            <span class="text-[10px]" style={{ color: '#9ca3af' }}>
              {formatTimestamp(timestamp())}
            </span>
          </div>

          {/* Healthy — collapsible passed list */}
          <Show when={isHealthy()}>
            <button
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[12px] cursor-pointer"
              style={{
                'background-color': '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
              }}
              onClick={() => setPassedExpanded(!passedExpanded())}
            >
              <span class="font-medium">
                {'\u2713'} All {totalCount()} checks passed
              </span>
              <span style={{ 'font-size': '10px', transition: 'transform 0.2s', transform: passedExpanded() ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {'\u25BC'}
              </span>
            </button>
            <Show when={passedExpanded()}>
              <div class="mt-2 pl-2" style={{ 'border-left': '2px solid #bbf7d0' }}>
                <For each={passedChecks()}>{(check) => <PassedCheck check={check} />}</For>
              </div>
            </Show>
          </Show>

          {/* Issues found */}
          <Show when={!isHealthy()}>
            {/* Failed section */}
            <Show when={failCount() > 0}>
              <SectionHeader icon={'\u2717'} title="Failed" count={failCount()} color="#dc2626" />
              <For each={failedChecks()}>{(check) => <FailedCheck check={check} rcaHint={rcaForTag(check.tag)} />}</For>
            </Show>

            {/* Passed section */}
            <Show when={passCount() > 0}>
              <div style={{ 'margin-top': failCount() > 0 ? '12px' : '0' }}>
                <SectionHeader icon={'\u2713'} title="Passed" count={passCount()} color="#16a34a" />
                <div class="pl-2" style={{ 'border-left': '2px solid #bbf7d0' }}>
                  <For each={passedChecks()}>{(check) => <PassedCheck check={check} />}</For>
                </div>
              </div>
            </Show>

            {/* RCA section */}
            <Show when={rcaList().length > 0}>
              <div style={{ 'margin-top': '12px' }}>
                <div class="flex items-center gap-1.5 mb-2">
                  <span style={{ 'font-size': '12px' }}>{'\uD83D\uDD0D'}</span>
                  <span class="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#92400e' }}>
                    Root Cause Analysis
                  </span>
                </div>
                <For each={rcaList()}>{(rca) => <RCACard rca={rca} />}</For>
              </div>
            </Show>
          </Show>
        </Show>
      </div>

      {/* Action buttons */}
      <Show when={props.card.actions.length > 0}>
        <div class="px-4 py-2 flex gap-2 justify-end" style={{ 'border-top': '1px solid #e5e7eb' }}>
          <For each={props.card.actions}>
            {(action) => (
              <button
                class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
      </Show>
    </div>
  );
};
