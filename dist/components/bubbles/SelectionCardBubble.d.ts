import type { CardData, SelectionOption } from '../../agui/types';
type Props = {
    card: CardData;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    accentColor?: string;
    onSelect: (card: CardData, selected: SelectionOption) => void;
};
export declare const SelectionCardBubble: (props: Props) => import("solid-js").JSX.Element;
export {};
//# sourceMappingURL=SelectionCardBubble.d.ts.map