import { ShortTextInput } from './ShortTextInput';
import { isMobile } from '@/utils/isMobileSignal';
import { Show, createSignal, createEffect, onMount, Setter } from 'solid-js';
import { FileEvent, UploadsConfig } from '@/components/Bot';
import { ChatInputHistory } from '@/utils/chatInputHistory';
import { AttachmentIcon, AddImageIcon, RecordIcon, SendIcon } from '@/components/icons';

type TextInputProps = {
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  sendButtonColor?: string;
  inputValue: string;
  fontSize?: number;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onInputChange: (value: string) => void;
  uploadsConfig?: Partial<UploadsConfig>;
  isFullFileUpload?: boolean;
  setPreviews: Setter<unknown[]>;
  onMicrophoneClicked: () => void;
  handleFileChange: (event: FileEvent<HTMLInputElement>) => void;
  maxChars?: number;
  maxCharsWarningMessage?: string;
  autoFocus?: boolean;
  sendMessageSound?: boolean;
  sendSoundLocation?: string;
  fullFileUploadAllowedTypes?: string;
  enableInputHistory?: boolean;
  maxHistorySize?: number;
};

const defaultBackgroundColor = '#ffffff';
const defaultTextColor = '#303235';
const defaultFontSize = 13;
const defaultSendButtonColor = '#00B8D9';
// CDN link for default send sound
const defaultSendSound = 'https://cdn.jsdelivr.net/gh/FlowiseAI/FlowiseChatEmbed@latest/src/assets/send_message.mp3';

export const TextInput = (props: TextInputProps) => {
  const [isSendButtonDisabled, setIsSendButtonDisabled] = createSignal(false);
  const [warningMessage, setWarningMessage] = createSignal('');
  const [inputHistory] = createSignal(new ChatInputHistory(() => props.maxHistorySize || 10));
  let inputRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let fileUploadRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let imgUploadRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let audioRef: HTMLAudioElement | undefined;

  const handleInput = (inputValue: string) => {
    const wordCount = inputValue.length;

    if (props.maxChars && wordCount > props.maxChars) {
      setWarningMessage(props.maxCharsWarningMessage ?? `You exceeded the characters limit. Please input less than ${props.maxChars} characters.`);
      setIsSendButtonDisabled(true);
      return;
    }

    props.onInputChange(inputValue);
    setWarningMessage('');
    setIsSendButtonDisabled(false);
  };

  const checkIfInputIsValid = () => warningMessage() === '' && inputRef?.reportValidity();

  const submit = () => {
    if (checkIfInputIsValid()) {
      if (props.enableInputHistory) {
        inputHistory().addToHistory(props.inputValue);
      }
      props.onSubmit(props.inputValue);
      if (props.sendMessageSound && audioRef) {
        audioRef.play();
      }
    }
  };

  const handleImageUploadClick = () => {
    if (imgUploadRef) imgUploadRef.click();
  };

  const handleFileUploadClick = () => {
    if (fileUploadRef) fileUploadRef.click();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const isIMEComposition = e.isComposing || e.keyCode === 229;
      if (!isIMEComposition) {
        e.preventDefault();
        submit();
      }
    } else if (props.enableInputHistory) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const previousInput = inputHistory().getPreviousInput(props.inputValue);
        props.onInputChange(previousInput);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextInput = inputHistory().getNextInput();
        props.onInputChange(nextInput);
      }
    }
  };

  createEffect(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : !isMobile() && window.innerWidth > 640;

    if (!props.disabled && shouldAutoFocus && inputRef) inputRef.focus();
  });

  onMount(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : !isMobile() && window.innerWidth > 640;

    if (!props.disabled && shouldAutoFocus && inputRef) inputRef.focus();

    if (props.sendMessageSound) {
      if (props.sendSoundLocation) {
        audioRef = new Audio(props.sendSoundLocation);
      } else {
        audioRef = new Audio(defaultSendSound);
      }
    }
  });

  const handleFileChange = (event: FileEvent<HTMLInputElement>) => {
    props.handleFileChange(event);
    if (event.target) event.target.value = '';
  };

  const getFileType = () => {
    if (props.isFullFileUpload) return props.fullFileUploadAllowedTypes === '' ? '*' : props.fullFileUploadAllowedTypes;
    if (props.uploadsConfig?.fileUploadSizeAndTypes?.length) {
      const allowedFileTypes = props.uploadsConfig?.fileUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',');
      if (allowedFileTypes.includes('*')) return '*';
      else return allowedFileTypes;
    }
    return '*';
  };

  return (
    <div
      class="w-full h-auto max-h-[192px] min-h-[56px] flex flex-col items-end justify-between chatbot-input transition-all duration-200"
      data-testid="input"
      style={{
        margin: 'auto',
        'background-color': props.backgroundColor ?? defaultBackgroundColor,
        color: props.textColor ?? defaultTextColor,
        'border-radius': '28px',
        border: '2px solid rgba(59, 130, 246, 0.2)',
        'box-shadow': '0 2px 12px rgba(59, 130, 246, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
      onKeyDown={handleKeyDown}
      onFocusIn={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59, 130, 246, 0.5)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08)';
      }}
      onFocusOut={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59, 130, 246, 0.2)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(59, 130, 246, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)';
      }}
    >
      <Show when={warningMessage() !== ''}>
        <div class="w-full px-4 pt-4 pb-1 text-red-500 text-sm" data-testid="warning-message">
          {warningMessage()}
        </div>
      </Show>
      <div class="w-full flex items-center justify-between px-3 py-2 gap-2">
        {/* Left side icons */}
        <div class="flex items-center gap-1">
          {props.uploadsConfig?.isRAGFileUploadAllowed || props.isFullFileUpload ? (
            <>
              <button
                type="button"
                class="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95"
                disabled={props.disabled || isSendButtonDisabled()}
                onClick={handleFileUploadClick}
                style={{
                  cursor: props.disabled || isSendButtonDisabled() ? 'not-allowed' : 'pointer',
                  opacity: props.disabled || isSendButtonDisabled() ? '0.5' : '1',
                  border: 'none',
                  background: 'transparent',
                }}
              >
                <AttachmentIcon color={props.sendButtonColor ?? '#9CA3AF'} width="18" height="18" />
              </button>
              <input
                style={{ display: 'none' }}
                multiple
                ref={fileUploadRef as HTMLInputElement}
                type="file"
                onChange={handleFileChange}
                accept={getFileType()}
              />
            </>
          ) : null}
          {props.uploadsConfig?.isImageUploadAllowed ? (
            <>
              <button
                type="button"
                class="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 flex items-center justify-center"
                disabled={props.disabled || isSendButtonDisabled()}
                onClick={handleImageUploadClick}
                style={{
                  cursor: props.disabled || isSendButtonDisabled() ? 'not-allowed' : 'pointer',
                  opacity: props.disabled || isSendButtonDisabled() ? '0.5' : '1',
                  border: 'none',
                  background: 'transparent',
                }}
              >
                <AddImageIcon color={props.sendButtonColor ?? '#9CA3AF'} width="18" height="18" />
              </button>
              <input
                style={{ display: 'none' }}
                multiple
                ref={imgUploadRef as HTMLInputElement}
                type="file"
                onChange={handleFileChange}
                accept={
                  props.uploadsConfig?.imgUploadSizeAndTypes?.length
                    ? props.uploadsConfig?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',')
                    : '*'
                }
              />
            </>
          ) : null}
          {props.uploadsConfig?.isSpeechToTextEnabled ? (
            <button
              type="button"
              class="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 flex items-center justify-center start-recording-button active:scale-95"
              disabled={props.disabled || isSendButtonDisabled()}
              onClick={props.onMicrophoneClicked}
              style={{
                cursor: props.disabled || isSendButtonDisabled() ? 'not-allowed' : 'pointer',
                opacity: props.disabled || isSendButtonDisabled() ? '0.5' : '1',
                border: 'none',
                background: 'transparent',
              }}
            >
              <RecordIcon color={props.sendButtonColor ?? '#9CA3AF'} width="18" height="18" />
            </button>
          ) : null}
        </div>

        {/* Text input */}
        <div class="flex-1">
          <ShortTextInput
            ref={inputRef as HTMLTextAreaElement}
            onInput={handleInput}
            value={props.inputValue}
            fontSize={props.fontSize}
            disabled={props.disabled}
            placeholder={props.placeholder ?? 'Message...'}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          disabled={props.disabled || isSendButtonDisabled()}
          onClick={submit}
          class="p-2 rounded-full transition-all duration-200 hover:shadow-lg active:scale-95"
          style={{
            'background-color': props.sendButtonColor ?? defaultSendButtonColor,
            cursor: props.disabled || isSendButtonDisabled() ? 'not-allowed' : 'pointer',
            opacity: props.disabled || isSendButtonDisabled() ? '0.5' : '1',
            'min-width': '36px',
            'min-height': '36px',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            border: 'none',
            'box-shadow': '0 2px 6px rgba(59, 130, 246, 0.25)',
          }}
        >
          <SendIcon color="#FFFFFF" width="18" height="18" />
        </button>
      </div>
    </div>
  );
};
