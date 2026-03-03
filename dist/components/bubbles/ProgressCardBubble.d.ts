import type { CardData, CardAction } from '../../agui/types';
type Props = {
    card: CardData;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    onAction: (card: CardData, action: CardAction, payload: Record<string, any>) => void;
};
export declare const ProgressCardBubble: (props: Props) => import("solid-js").JSX.Element;
export {};
//# sourceMappingURL=ProgressCardBubble.d.ts.map