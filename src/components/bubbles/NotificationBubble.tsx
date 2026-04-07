import { Component } from 'solid-js';
import type { Notification } from '@/api/notifications';

const LEVEL_STYLES: Record<string, { border: string; bg: string; dot: string; title: string }> = {
  success: { border: '#22c55e', bg: '#0a2a1a', dot: '#22c55e', title: '#22c55e' },
  info: { border: '#3b82f6', bg: '#0a1a2a', dot: '#3b82f6', title: '#3b82f6' },
  warning: { border: '#f59e0b', bg: '#2a1a0a', dot: '#f59e0b', title: '#f59e0b' },
  error: { border: '#ef4444', bg: '#2a0a0a', dot: '#ef4444', title: '#ef4444' },
};

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString.replace(/([+-]\d{2}:\d{2})Z$/, '$1')).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Props = {
  notification: Notification;
};

export const NotificationBubble: Component<Props> = (props) => {
  const style = () => LEVEL_STYLES[props.notification.level] ?? LEVEL_STYLES.info;

  return (
    <div
      style={{
        background: style().bg,
        'border-left': `3px solid ${style().border}`,
        'border-radius': '0 8px 8px 0',
        padding: '10px 14px',
        margin: '8px 0',
      }}
    >
      <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'margin-bottom': '4px' }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            'border-radius': '50%',
            background: style().dot,
          }}
        />
        <span
          style={{
            color: style().title,
            'font-size': '10px',
            'font-weight': '600',
            'text-transform': 'uppercase',
            'letter-spacing': '0.5px',
          }}
        >
          {props.notification.title}
        </span>
        <span style={{ color: '#555', 'font-size': '10px', 'margin-left': 'auto' }}>{formatTimeAgo(props.notification.created_at)}</span>
      </div>
      <p style={{ color: '#ccc', 'font-size': '12px', margin: '0' }}>{props.notification.message}</p>
    </div>
  );
};
