import { For } from 'solid-js';
import type { CardData, CardAction } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};

const statusColor = (value: string): string => {
  const v = String(value).toLowerCase();
  if (v === 'moving' || v === 'on' || v === 'true' || v === 'excellent' || v === 'good' || v === 'stable') return '#16a34a';
  if (v === 'idling' || v === 'fair') return '#d97706';
  if (v === 'stopped' || v === 'off' || v === 'false' || v === 'offline' || v === 'poor') return '#dc2626';
  return '#6b7280';
};

const Badge = (props: { value: any; label?: string }) => {
  const text = () => String(props.value ?? '\u2014');
  return (
    <span
      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        'background-color': statusColor(text()) + '18',
        color: statusColor(text()),
      }}
    >
      {props.label ?? text()}
    </span>
  );
};

const MetricCell = (props: { label: string; value: any; unit?: string; badge?: boolean }) => {
  const formatted = () => {
    const v = props.value;
    if (v === null || v === undefined) return '\u2014';
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return v.toFixed(1);
    }
    return String(v);
  };

  return (
    <div class="flex flex-col">
      <span class="text-[10px] uppercase tracking-wide" style={{ color: '#9ca3af' }}>{props.label}</span>
      {props.badge ? (
        <Badge value={props.value} />
      ) : (
        <span class="text-sm font-semibold" style={{ color: '#1f2937' }}>
          {formatted()}{props.unit ? <span class="text-xs font-normal" style={{ color: '#6b7280' }}> {props.unit}</span> : ''}
        </span>
      )}
    </div>
  );
};

const Divider = () => <div style={{ 'border-bottom': '1px solid #e5e7eb', margin: '8px 0' }} />;

const SectionHeader = (props: { title: string }) => (
  <div class="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#9ca3af', 'margin-bottom': '4px' }}>
    {props.title}
  </div>
);

export const DeviceCardBubble = (props: Props) => {
  const d = () => props.card.data;

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
        'max-width': '360px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.08)',
        color: props.textColor ?? '#1f2937',
        'font-size': `${props.fontSize ?? 13}px`,
      }}
    >
      {/* Header — unit name + status */}
      <div
        class="px-4 py-3 flex items-center justify-between"
        style={{ 'background-color': '#f8fafc', 'border-bottom': '1px solid #e5e7eb' }}
      >
        <div class="flex flex-col">
          <span class="text-[10px] uppercase tracking-wide" style={{ color: '#9ca3af' }}>Device</span>
          <span class="text-base font-bold" style={{ color: '#0f172a' }}>{d().unit_name ?? '\u2014'}</span>
        </div>
        <div class="flex gap-1.5 items-center">
          <Badge value={d().status} />
          <Badge value={d().ignition} label={`IGN ${d().ignition ?? ''}`} />
        </div>
      </div>

      <div class="px-4 py-3">
        {/* Vehicle + Online */}
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs" style={{ color: '#6b7280' }}>{d().vehicle_type ?? ''}</span>
          <div class="flex gap-1.5">
            <Badge value={d().online} label={d().online === true || d().online === 'true' ? 'Online' : 'Offline'} />
          </div>
        </div>

        <Divider />

        {/* Real-time metrics */}
        <SectionHeader title="Real-time" />
        <div class="grid grid-cols-3 gap-3 mb-1">
          <MetricCell label="Speed" value={d().speed} unit="km/h" />
          <MetricCell label="Odometer" value={d().odometer ? Math.round(d().odometer as number) : d().odometer} unit="km" />
          <MetricCell label="Battery" value={d().battery} unit="V" />
        </div>

        <Divider />

        {/* Health indicators */}
        <SectionHeader title="Health" />
        <div class="grid grid-cols-3 gap-3 mb-1">
          <MetricCell label="Connection" value={d().connection} badge />
          <MetricCell label="GPS" value={d().gps} badge />
          <MetricCell label="Batt. Health" value={d().battery_health} badge />
        </div>

        <Divider />

        {/* 24h activity */}
        <SectionHeader title="Last 24h" />
        <div class="grid grid-cols-4 gap-2 mb-1">
          <MetricCell label="Distance" value={d().distance_24h} unit="km" />
          <MetricCell label="Max Speed" value={d().max_speed} unit="km/h" />
          <MetricCell label="Stops" value={d().stops} />
          <MetricCell label="Harsh" value={(d().harsh_braking ?? 0) + (d().harsh_acceleration ?? 0)} />
        </div>

        <Divider />

        {/* Footer info */}
        <div class="flex justify-between items-center text-[11px]" style={{ color: '#9ca3af' }}>
          <span>Last signal: {d().last_signal ?? '\u2014'}</span>
        </div>
      </div>

      {/* Action buttons */}
      {props.card.actions.length > 0 && (
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
      )}
    </div>
  );
};
