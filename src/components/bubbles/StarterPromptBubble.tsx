type Props = {
  prompt: string;
  onPromptClick?: () => void;
  starterPromptFontSize?: number;
};
export const StarterPromptBubble = (props: Props) => (
  <>
    <div
      data-modal-target="defaultModal"
      data-modal-toggle="defaultModal"
      class="flex justify-start items-start animate-fade-in host-container"
      onClick={() => props.onPromptClick?.()}
    >
      <button
        class="px-4 py-2 ml-1 whitespace-pre-wrap max-w-full chatbot-host-bubble transition-all duration-200 hover:shadow-md active:scale-98"
        data-testid="host-bubble"
        style={{
          width: 'max-content',
          'font-size': props.starterPromptFontSize ? `${props.starterPromptFontSize}px` : '13px',
          'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          'border-radius': '18px',
          cursor: 'pointer',
          'background-color': '#3B81F6',
          color: '#ffffff',
          border: 'none',
          'font-weight': '500',
          'box-shadow': '0 2px 6px rgba(59, 130, 246, 0.25)',
        }}
      >
        {props.prompt}
      </button>
    </div>
  </>
);
