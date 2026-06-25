import { Component, For, createSignal } from 'solid-js';
import type { Notification } from '@/api/notifications';

const LEVEL_BADGE: Record<string, { bg: string; color: string }> = {
  success: { bg: '#dcfce7', color: '#166534' },
  info: { bg: '#dbeafe', color: '#1e40af' },
  warning: { bg: '#fef3c7', color: '#92400e' },
  error: { bg: '#fee2e2', color: '#991b1b' },
};

const LEVEL_DOT: Record<string, string> = {
  success: '#22c55e',
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
};

function formatTimeAgo(isoString: string): string {
  const cleaned = isoString.replace(/([+-]\d{2}:\d{2})Z$/, '$1');
  const ts = new Date(cleaned).getTime();
  if (isNaN(ts)) return '';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Props = {
  notifications: Notification[];
};

export const NotificationSummaryCard: Component<Props> = (props) => {
  const [expandedIds, setExpandedIds] = createSignal<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds().has(id);

  const levelCounts = () => {
    const counts: Record<string, number> = {};
    for (const n of props.notifications) {
      counts[n.level] = (counts[n.level] ?? 0) + 1;
    }
    return counts;
  };

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        'border-radius': '12px',
        padding: '14px 16px',
        margin: '10px 0',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header row: icon + title + badges */}
      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '12px' }}>
        <span style={{ 'font-size': '15px', 'line-height': '1' }}>🔔</span>
        <span style={{ color: '#1e293b', 'font-size': '13px', 'font-weight': '600', 'letter-spacing': '-0.01em' }}>
          {props.notifications.length} unread notification{props.notifications.length !== 1 ? 's' : ''}
        </span>
        <div style={{ 'margin-inline-start': 'auto', display: 'flex', gap: '6px' }}>
          <For each={Object.entries(levelCounts())}>
            {([level, count]) => {
              const badge = LEVEL_BADGE[level] ?? LEVEL_BADGE.info;
              return (
                <span
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: '2px 8px',
                    'border-radius': '10px',
                    'font-size': '10px',
                    'font-weight': '600',
                    'letter-spacing': '0.02em',
                    'white-space': 'nowrap',
                  }}
                >
                  {count} {level}
                </span>
              );
            }}
          </For>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ 'border-top': '1px solid #e2e8f0', 'padding-top': '10px' }}>
        <For each={props.notifications}>
          {(n) => (
            <div
              onClick={() => toggle(n.notification_id)}
              style={{
                display: 'flex',
                'align-items': isExpanded(n.notification_id) ? 'flex-start' : 'center',
                gap: '8px',
                padding: '6px 4px',
                'border-radius': '6px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#f1f5f9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  'border-radius': '50%',
                  background: LEVEL_DOT[n.level] ?? LEVEL_DOT.info,
                  'flex-shrink': '0',
                  'margin-top': isExpanded(n.notification_id) ? '6px' : '0',
                }}
              />
              <span
                style={{
                  color: '#334155',
                  'font-size': '12px',
                  flex: '1',
                  overflow: 'hidden',
                  'text-overflow': isExpanded(n.notification_id) ? 'clip' : 'ellipsis',
                  'white-space': isExpanded(n.notification_id) ? 'normal' : 'nowrap',
                  'line-height': '1.4',
                }}
              >
                <span style={{ 'font-weight': '500' }}>{n.title}</span>
                <span style={{ color: '#94a3b8' }}> — </span>
                <span style={{ color: '#64748b' }}>{n.message}</span>
              </span>
              <span
                style={{
                  color: '#94a3b8',
                  'font-size': '10px',
                  'flex-shrink': '0',
                  'white-space': 'nowrap',
                  'margin-top': isExpanded(n.notification_id) ? '2px' : '0',
                }}
              >
                {formatTimeAgo(n.created_at)}
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
