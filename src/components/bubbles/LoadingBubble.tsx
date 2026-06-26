import { TypingBubble } from '@/components';

export const LoadingBubble = (props: { label?: string }) => (
  <div class="flex justify-start mb-2 items-start animate-fade-in host-container">
    <span class="px-2 py-3 ms-2 flex items-center gap-2" data-testid="host-bubble">
      <TypingBubble />
      {props.label && <span class="loading-label">{props.label}</span>}
    </span>
  </div>
);
