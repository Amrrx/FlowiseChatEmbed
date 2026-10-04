import { createSignal, splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

type ShortTextInputProps = {
  ref: HTMLInputElement | HTMLTextAreaElement | undefined;
  onInput: (value: string) => void;
  fontSize?: number;
  disabled?: boolean;
  // Tighter field (10px/14px padding, 44px tall) for the outlined composer.
  compact?: boolean;
} & Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onInput'>;

const DEFAULT_HEIGHT = 56;
const COMPACT_HEIGHT = 44;

export const ShortTextInput = (props: ShortTextInputProps) => {
  const [local, others] = splitProps(props, ['ref', 'onInput', 'compact']);
  const defaultHeight = () => (local.compact ? COMPACT_HEIGHT : DEFAULT_HEIGHT);
  const [height, setHeight] = createSignal(local.compact ? COMPACT_HEIGHT : DEFAULT_HEIGHT);

  // @ts-expect-error: unknown type
  const handleInput = (e) => {
    if (props.ref) {
      if (e.currentTarget.value === '') {
        // reset height when value is empty
        setHeight(defaultHeight());
      } else if (local.compact) {
        // Collapse first so scrollHeight measures the content, not the current box.
        e.currentTarget.style.height = `${COMPACT_HEIGHT}px`;
        setHeight(Math.max(COMPACT_HEIGHT, e.currentTarget.scrollHeight));
      } else {
        setHeight(e.currentTarget.scrollHeight - 24);
      }
      e.currentTarget.scrollTo(0, e.currentTarget.scrollHeight);
      local.onInput(e.currentTarget.value);
    }
  };

  // @ts-expect-error: unknown type
  const handleKeyDown = (e) => {
    // Handle Shift/Alt + Enter new line
    if (e.keyCode == 13 && (e.shiftKey || e.altKey)) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.value += '\n';
      handleInput(e);
    }
  };

  return (
    <textarea
      ref={props.ref}
      class={
        'focus:outline-none bg-transparent flex-1 w-full h-full max-h-[128px] text-input disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 ' +
        (local.compact ? 'px-[14px] py-[10px] min-h-[44px]' : 'px-4 py-4 min-h-[56px]')
      }
      disabled={props.disabled}
      style={{
        'font-size': props.fontSize ? `${props.fontSize}px` : '13px',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'line-height': '1.5',
        resize: 'none',
        height: `${props.value !== '' ? height() : defaultHeight()}px`,
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      {...others}
    />
  );
};
