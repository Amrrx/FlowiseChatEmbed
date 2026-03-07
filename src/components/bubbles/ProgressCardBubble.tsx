import { For, Show } from 'solid-js';
import type { CardData, CardAction, ProgressStep, DisplayMapping } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};

const TASK_ICON: Record<string, string> = {
  maintenance: '\uD83D\uDD27',
  report: '\uD83D\uDCCB',
  export: '\uD83D\uDCE4',
};

const SEVERITY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  medium: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
  low: { bg: '#f0f9ff', text: '#2563eb', border: '#93c5fd' },
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const resolvePath = (obj: any, path: string): any => path.split('.').reduce((curr, key) => curr?.[key], obj);

const hasDisplayData = (step: ProgressStep): boolean => {
  const dm = step.display_map;
  const d = step.details;
  if (!dm?.length || !d) return false;
  return dm.some((m) => resolvePath(d, m.source) != null);
};

// ---------------------------------------------------------------------------
// Step icon
// ---------------------------------------------------------------------------

const StepIcon = (props: { status: string }) => {
  if (props.status === 'completed') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="#16a34a" />
        <path d="M5.5 9.2L7.8 11.5L12.5 6.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    );
  }
  if (props.status === 'failed') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="#dc2626" />
        <path d="M6 6L12 12M12 6L6 12" stroke="white" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    );
  }
  if (props.status === 'in_progress') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="9" cy="9" r="7.5" stroke="#e5e7eb" stroke-width="2.5" fill="none" />
        <path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" stroke="#d1d5db" stroke-width="2" fill="none" />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Display renderers (driven by display_map config)
// ---------------------------------------------------------------------------

const TextRenderer = (props: { value: any; label?: string }) => {
  const text = () => String(props.value ?? '');
  if (!text()) return null;
  const isError = () => /critical|error/i.test(text());
  const color = () => (isError() ? '#dc2626' : '#6b7280');

  return (
    <div class="text-[11px] mt-0.5" style={{ color: color() }}>
      <Show when={props.label}>
        <span class="font-medium">{props.label}: </span>
      </Show>
      <span>{text()}</span>
    </div>
  );
};

const TagsRenderer = (props: { items: any[]; label?: string }) => {
  const tags = () => (Array.isArray(props.items) ? props.items.map(String) : []);
  if (!tags().length) return null;

  return (
    <div class="mt-1">
      <Show when={props.label}>
        <span class="text-[10px] font-medium uppercase" style={{ color: '#9ca3af' }}>
          {props.label}
        </span>
      </Show>
      <div class="flex flex-wrap gap-1 mt-0.5">
        <For each={tags()}>
          {(tag) => {
            const isFailed = () => /failed/i.test(tag);
            return (
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  'background-color': isFailed() ? '#fef2f2' : '#f0fdf4',
                  color: isFailed() ? '#dc2626' : '#16a34a',
                }}
              >
                {tag}
              </span>
            );
          }}
        </For>
      </div>
    </div>
  );
};

const FindingsRenderer = (props: { findings: any[] }) => {
  const items = () => (Array.isArray(props.findings) ? props.findings : []);
  if (!items().length) return null;

  return (
    <div class="mt-1.5 space-y-1.5">
      <For each={items()}>
        {(finding) => {
          const severity = () => String(finding.severity ?? 'medium').toLowerCase();
          const colors = () => SEVERITY_COLOR[severity()] ?? SEVERITY_COLOR.medium;
          return (
            <div
              class="rounded-md px-2.5 py-2 text-[11px]"
              style={{ 'background-color': colors().bg, 'border-left': `3px solid ${colors().border}` }}
            >
              <div class="flex items-center gap-2">
                <span class="font-semibold" style={{ color: colors().text }}>
                  {finding.title ?? 'Issue'}
                </span>
                <span
                  class="px-1.5 py-0 rounded text-[9px] font-bold uppercase"
                  style={{ 'background-color': colors().border, color: colors().text }}
                >
                  {severity()}
                </span>
              </div>
              <Show when={finding.reason}>
                <div class="mt-0.5" style={{ color: '#4b5563' }}>
                  {finding.reason}
                </div>
              </Show>
              <Show when={finding.recommendation}>
                <div class="mt-0.5 flex items-start gap-1" style={{ color: '#6b7280' }}>
                  <span style={{ color: colors().text }}>{'\u2192'}</span>
                  <span>{finding.recommendation}</span>
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
};

const DisplayMapRenderer = (props: { displayMap: DisplayMapping[]; details: Record<string, any> }) => {
  return (
    <For each={props.displayMap}>
      {(mapping) => {
        const value = () => resolvePath(props.details, mapping.source);
        if (value() == null) return null;

        if (mapping.type === 'findings' && Array.isArray(value())) {
          return <FindingsRenderer findings={value()} />;
        }
        if (mapping.type === 'tags' && Array.isArray(value())) {
          return <TagsRenderer items={value()} label={mapping.label} />;
        }
        return <TextRenderer value={value()} label={mapping.label} />;
      }}
    </For>
  );
};

// ---------------------------------------------------------------------------
// Fallback renderer (no display_map)
// ---------------------------------------------------------------------------

const ResultFallback = (props: { text: string; variant: 'success' | 'error' }) => {
  const isError = () => props.variant === 'error';
  const color = () => (isError() ? '#dc2626' : '#16a34a');
  const bg = () => (isError() ? '#fef2f2' : '#f0fdf4');
  const border = () => (isError() ? '#fecaca' : '#bbf7d0');

  return (
    <div
      class="rounded-md mt-1 px-2.5 py-1.5 text-[11px]"
      style={{ 'background-color': bg(), 'border-left': `3px solid ${border()}`, color: color() }}
    >
      {props.text}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ProgressCardBubble = (props: Props) => {
  const d = () => props.card.data;
  const title = () => (d().title as string) ?? 'Processing';
  const subtitle = () => (d().subtitle as string) ?? '';
  const taskType = () => (d().task_type as string) ?? '';
  const steps = () => (d().steps as ProgressStep[]) ?? [];
  const icon = () => TASK_ICON[taskType()] ?? '\u2699\uFE0F';

  const completedCount = () => steps().filter((s) => s.status === 'completed' || s.status === 'failed').length;
  const progress = () => (steps().length > 0 ? (completedCount() / steps().length) * 100 : 0);
  const barColor = () => {
    if (steps().some((s) => s.status === 'failed')) return '#dc2626';
    if (progress() >= 100) return '#16a34a';
    return '#2563eb';
  };

  const handleAction = (action: CardAction) => {
    const payload: Record<string, any> = {};
    for (const field of action.payload_fields) {
      payload[field] = d()[field] ?? props.card.card_id;
    }
    props.onAction(props.card, action, payload);
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
        <div class="px-4 py-3 flex items-center gap-3" style={{ 'background-color': '#f8fafc', 'border-bottom': '1px solid #e5e7eb' }}>
          <span style={{ 'font-size': '20px', 'line-height': '1' }}>{icon()}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-bold" style={{ color: '#0f172a' }}>
              {title()}
            </span>
            <Show when={subtitle()}>
              <span class="text-[11px]" style={{ color: '#9ca3af' }}>
                {subtitle()}
              </span>
            </Show>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', 'background-color': '#f1f5f9' }}>
          <div
            style={{
              height: '100%',
              width: `${progress()}%`,
              'background-color': barColor(),
              transition: 'width 0.4s ease, background-color 0.3s ease',
            }}
          />
        </div>

        {/* Steps */}
        <div class="px-4 py-3 space-y-3">
          <For each={steps()}>
            {(step) => (
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 mt-0.5">
                  <StepIcon status={step.status} />
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <span
                      class="text-sm"
                      style={{
                        color: step.status === 'pending' ? '#9ca3af' : '#1f2937',
                        'font-weight': step.status === 'in_progress' ? '600' : '400',
                      }}
                    >
                      {step.label}
                    </span>
                    <Show when={step.status === 'in_progress'}>
                      <span class="text-[10px] font-medium flex-shrink-0" style={{ color: '#2563eb' }}>
                        IN PROGRESS
                      </span>
                    </Show>
                  </div>
                  <Show
                    when={hasDisplayData(step)}
                    fallback={
                      <>
                        <Show when={step.result}>
                          <ResultFallback text={step.result!} variant="success" />
                        </Show>
                        <Show when={step.error}>
                          <ResultFallback text={step.error!} variant="error" />
                        </Show>
                      </>
                    }
                  >
                    <DisplayMapRenderer displayMap={step.display_map!} details={step.details!} />
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Actions */}
        <Show when={props.card.actions.length > 0}>
          <div class="px-4 py-2 flex gap-2 justify-end" style={{ 'border-top': '1px solid #e5e7eb' }}>
            <For each={props.card.actions}>
              {(action) => (
                <button
                  class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
        </Show>
      </div>
    </>
  );
};
