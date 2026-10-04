import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import type { HeaderTheme } from '@/features/bubble/types';

export type SwitchableLayout = 'floating' | 'sidebar';

type Props = {
  header: HeaderTheme;
  iconColor: string;
  // Present only when the layout switcher is enabled and the bubble owns placement.
  currentLayout?: SwitchableLayout;
  onSwitchLayout?: (layout: SwitchableLayout) => void;
};

const WindowIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M6.486 2.5h7.028c2.457 0 3.986 1.734 3.986 4.188v6.623c0 2.454-1.529 4.189-3.986 4.189H6.486C4.029 17.5 2.5 15.765 2.5 13.311V6.688C2.5 4.234 4.036 2.5 6.486 2.5Z" />
    <path d="M2.5 7.1h15" />
    <path d="M5.25 4.8h.05M7.32 4.8h.05M9.39 4.8h.05" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.667"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M16.667 5.417 7.5 14.583l-4.167-4.166" />
  </svg>
);

const itemStyle = {
  display: 'flex',
  'align-items': 'center',
  gap: '8px',
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  'border-radius': '6px',
  background: 'transparent',
  color: 'var(--fw-text, #414651)',
  'font-size': '16px',
  'line-height': '24px',
  'text-align': 'start' as const,
  cursor: 'pointer',
};

/**
 * The title bar's ⋮ menu: "Switch to Floating / Side Panel".
 */
export const HeaderMenu = (props: Props) => {
  const [open, setOpen] = createSignal(false);
  let rootRef: HTMLDivElement | undefined;

  // The widget lives in a Shadow DOM, so match against the composed path rather than event.target.
  onMount(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (open() && rootRef && !e.composedPath().includes(rootRef)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    onCleanup(() => document.removeEventListener('pointerdown', onPointerDown, true));
  });

  const labels = () => props.header.labels ?? {};
  const layouts = (): { value: SwitchableLayout; label: string; icon: () => any }[] => [
    { value: 'floating', label: labels().floating ?? 'Floating', icon: WindowIcon },
    { value: 'sidebar', label: labels().sidebar ?? 'Side Panel', icon: WindowIcon },
  ];

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex' }}>
      <button
        type="button"
        aria-label={labels().menu ?? 'More options'}
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: '36px',
          height: '36px',
          border: `1px solid ${props.header.buttonBorderColor ?? '#D5D7DA'}`,
          'border-radius': '8px',
          'box-shadow': '0 1px 2px rgba(10, 13, 18, 0.05)',
          background: open() ? 'var(--fw-surface-hover, #FAFAFA)' : 'var(--fw-surface-raised, #FFFFFF)',
          color: props.iconColor,
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="10" cy="4.167" r="1.667" />
          <circle cx="10" cy="10" r="1.667" />
          <circle cx="10" cy="15.833" r="1.667" />
        </svg>
      </button>
      <Show when={open()}>
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            'inset-inline-end': '0',
            'min-width': '208px',
            padding: '4px',
            background: 'var(--fw-surface-raised, #ffffff)',
            border: '1px solid var(--fw-border, #E9EAEB)',
            'border-radius': '8px',
            'box-shadow': '0 12px 16px -4px rgba(10, 13, 18, 0.08), 0 4px 6px -2px rgba(10, 13, 18, 0.03)',
            'z-index': 60,
          }}
        >
          <Show when={props.onSwitchLayout}>
            <div style={{ padding: '10px 14px', color: 'var(--fw-text, #252B37)', 'font-size': '16px', 'line-height': '24px', 'font-weight': '600' }}>
              {labels().switchTo ?? 'Switch to'}
            </div>
            <For each={layouts()}>
              {(item) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={props.currentLayout === item.value}
                  style={{
                    ...itemStyle,
                    background: props.currentLayout === item.value ? props.header.activeBackgroundColor ?? 'rgba(232, 239, 239, 0.5)' : 'transparent',
                  }}
                  onClick={() => choose(() => props.onSwitchLayout?.(item.value))}
                >
                  <item.icon />
                  <span style={{ flex: '1' }}>{item.label}</span>
                  <Show when={props.currentLayout === item.value}>
                    <span style={{ color: props.header.activeColor ?? '#252B37', display: 'flex' }}>
                      <CheckIcon />
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};
