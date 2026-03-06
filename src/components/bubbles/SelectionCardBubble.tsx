import { createSignal, For } from 'solid-js';
import type { CardData, SelectionOption } from '../../agui/types';

type Props = {
  card: CardData;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  accentColor?: string;
  onSelect: (card: CardData, selected: SelectionOption) => void;
};

export const SelectionCardBubble = (props: Props) => {
  const prompt = () => (props.card.data.prompt as string) ?? 'Select an option:';
  const options = () => (props.card.data.options as SelectionOption[]) ?? [];
  const allowMultiple = () => props.card.data.allow_multiple === true;
  const [selected, setSelected] = createSignal<string | null>(null);
  const [submitted, setSubmitted] = createSignal(false);

  const handleConfirm = () => {
    const value = selected();
    if (!value) return;
    const option = options().find((o) => o.value === value);
    if (!option) return;
    setSubmitted(true);
    props.onSelect(props.card, option);
  };

  return (
    <div
      class="rounded-lg border border-gray-200 overflow-hidden max-w-[320px]"
      style={{
        'background-color': props.backgroundColor ?? '#f7f8ff',
        color: props.textColor ?? '#303235',
        'font-size': `${props.fontSize ?? 14}px`,
      }}
    >
      <div class="px-4 py-3 text-sm font-medium">{prompt()}</div>
      <div class="px-4 pb-2 space-y-2">
        <For each={options()}>
          {(option) => (
            <label
              class={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                selected() === option.value ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
              } ${submitted() ? 'pointer-events-none opacity-70' : ''}`}
            >
              <input
                type={allowMultiple() ? 'checkbox' : 'radio'}
                name={`card-${props.card.card_id}`}
                value={option.value}
                checked={selected() === option.value}
                onChange={() => setSelected(option.value)}
                disabled={submitted()}
                class="accent-blue-500"
                style={{ 'accent-color': props.accentColor ?? '#3B81F6' }}
              />
              <div class="flex flex-col">
                <span class="text-sm">{option.label}</span>
                {option.metadata &&
                  Object.entries(option.metadata).map(([k, v]) => (
                    <span class="text-xs text-gray-400">
                      {k}: {String(v)}
                    </span>
                  ))}
              </div>
            </label>
          )}
        </For>
      </div>
      <div class="px-4 py-2 border-t border-gray-200 flex justify-end">
        <button
          class={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
            selected() && !submitted() ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          style={selected() && !submitted() ? { 'background-color': props.accentColor ?? '#3B81F6' } : {}}
          disabled={!selected() || submitted()}
          onClick={handleConfirm}
        >
          {submitted() ? 'Submitted' : 'Confirm'}
        </button>
      </div>
    </div>
  );
};
