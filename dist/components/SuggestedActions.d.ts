import { QuickAction } from '@/api/quickActions';
import type { QuickActionsTheme } from '@/features/bubble/types';
type Props = {
    actions?: QuickAction[];
    disabled?: boolean;
    onActionClick?: (payload: string, id: string) => void;
    theme?: QuickActionsTheme;
};
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
export declare const SuggestedActions: (props: Props) => import("solid-js").JSX.Element;
export {};
//# sourceMappingURL=SuggestedActions.d.ts.map