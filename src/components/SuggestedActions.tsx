import { For } from 'solid-js';

type Props = {
  actions?: string[];
  actionColor?: string;
  fontSize?: number;
};

const defaultActionColor = '#00B8D9';
const defaultFontSize = 13;

export const SuggestedActions = (props: Props) => {
  const actions = props.actions ?? [];

  if (actions.length === 0) {
    return null;
  }

  return (
    <div class="flex flex-col gap-2 px-4 py-3">
      <For each={actions}>
        {(action) => (
          <button
            disabled
            class="px-4 py-2 rounded-full font-medium text-white transition-all duration-200 cursor-not-allowed opacity-50"
            style={{
              'background-color': props.actionColor ?? defaultActionColor,
              'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
              'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              border: 'none',
              'box-shadow': '0 2px 8px rgba(0, 184, 217, 0.2)',
            }}
          >
            {action}
          </button>
        )}
      </For>
    </div>
  );
};
