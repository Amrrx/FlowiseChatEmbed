import type { AGUIAction, AGUIEvent, CardData } from './types';

const parseCustomEvent = (event: AGUIEvent): AGUIAction | null => {
  const name = event.name ?? '';
  const value = event.value;

  if (!value || typeof value !== 'object') return null;

  if (name === 'entity_card' || name === 'selection_card' || name === 'progress_card') {
    return { type: 'card', card: value as CardData };
  }

  return { type: 'unknown', raw: event };
};

export const parseAGUIEvent = (raw: string): AGUIAction | null => {
  let event: AGUIEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return null;
  }

  const type = event.type;
  if (!type) return null;

  switch (type) {
    case 'RUN_STARTED':
      return { type: 'run_started' };

    case 'RUN_FINISHED':
      return { type: 'run_finished' };

    case 'RUN_ERROR':
      return { type: 'run_error', message: event.message ?? 'Unknown error' };

    case 'TEXT_MESSAGE_START':
      return { type: 'text_start', messageId: event.messageId ?? '' };

    case 'TEXT_MESSAGE_CONTENT':
      return { type: 'text_delta', delta: event.delta ?? '' };

    case 'TEXT_MESSAGE_END':
      return { type: 'text_end' };

    case 'CUSTOM':
      return parseCustomEvent(event);

    case 'STATE_DELTA':
      return { type: 'state_delta', delta: event.delta ?? [] };

    case 'STEP_STARTED':
      return null;

    case 'STEP_FINISHED':
      return { type: 'step_finished', stepName: event.stepName ?? '' };

    case 'TOOL_CALL_START':
      return { type: 'tool_call_start', toolCallId: event.tool_call_id ?? '', toolName: event.tool_call_name ?? '' };

    case 'TOOL_CALL_ARGS':
      return { type: 'tool_call_args', toolCallId: event.tool_call_id ?? '', delta: event.delta ?? '' };

    case 'TOOL_CALL_END':
      return { type: 'tool_call_end', toolCallId: event.tool_call_id ?? '' };

    case 'ACTIVITY_SNAPSHOT':
      return { type: 'activity', content: event.content ?? '' };

    default:
      return { type: 'unknown', raw: event };
  }
};
