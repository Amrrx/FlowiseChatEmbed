import { For, Show } from 'solid-js';
import { QuickAction } from '@/api/quickActions';

type Props = {
  actions?: QuickAction[];
  disabled?: boolean;
  onActionClick?: (payload: string, id: string) => void;
};

/** Movement past this many pixels is a drag, not a click. */
const DRAG_THRESHOLD_PX = 4;

/**
 * Curated per-agent action buttons, pinned above the composer.
 *
 * props is read inside JSX and never snapshotted: the list arrives from an async
 * fetch after mount, and a value captured in the component body cannot update.
 *
 * The row scrolls sideways with its scrollbar hidden, which leaves a pointer with no
 * way to reach the overflow — touch swipes natively, but a mouse has neither a
 * horizontal wheel nor a bar to drag. Both are supplied below.
 */
export const SuggestedActions = (props: Props) => {
  let scroller: HTMLDivElement | undefined;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  // A vertical wheel over the row scrolls it sideways. Only claim the event when the
  // row can actually move, so a trackpad's vertical gesture still scrolls the page
  // once the row has reached its end.
  const onWheel = (e: WheelEvent) => {
    if (!scroller || e.deltaY === 0 || e.deltaX !== 0) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 0) return;
    const next = Math.min(Math.max(scroller.scrollLeft + e.deltaY, 0), max);
    if (next === scroller.scrollLeft) return;
    e.preventDefault();
    scroller.scrollLeft = next;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!scroller || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startScroll = scroller.scrollLeft;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || !scroller) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      moved = true;
      // Claim the pointer only once it is a real drag, so a plain click still lands
      // on the button underneath.
      scroller.setPointerCapture?.(e.pointerId);
    }
    if (moved) scroller.scrollLeft = startScroll - dx;
  };

  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    scroller?.releasePointerCapture?.(e.pointerId);
  };

  // A drag that ends over a button must not fire it.
  const onClickCapture = (e: MouseEvent) => {
    if (!moved) return;
    e.preventDefault();
    e.stopPropagation();
    moved = false;
  };

  return (
    <Show when={props.actions?.length}>
      <div class="w-full px-5 pt-1 shrink-0">
        <div class="text-[10px] leading-none uppercase tracking-wide text-gray-500 pb-1">Quick actions</div>
        <div
          ref={scroller}
          data-testid="quick-actions"
          class="scrollable-container w-full flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1 cursor-grab active:cursor-grabbing"
          style={{ 'touch-action': 'pan-x' }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={onClickCapture}
        >
          <For each={props.actions}>
            {(action) => (
              <button
                type="button"
                data-testid="quick-action"
                disabled={props.disabled}
                title={action.label}
                onClick={() => props.onActionClick?.(action.payload, action.id)}
                class={
                  'px-3.5 py-1.5 whitespace-nowrap rounded-full text-[13px] font-medium border transition-all duration-200 ' +
                  (props.disabled
                    ? 'opacity-50 cursor-not-allowed border-[#e5e5e5] text-gray-400 bg-[#f5f5f5]'
                    : 'cursor-pointer border-[#d1d1d6] text-gray-800 bg-[#f0f0f2] hover:shadow-md active:scale-98')
                }
              >
                {action.label}
              </button>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
};
