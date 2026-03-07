export type AGUIEventType =
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'CUSTOM'
  | 'STATE_DELTA'
  | 'STEP_STARTED'
  | 'STEP_FINISHED'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_END'
  | 'ACTIVITY_SNAPSHOT';

export type AGUIEvent = {
  type: AGUIEventType;
  [key: string]: any;
};

export type CardAction = {
  action_id: string;
  label: string;
  style: 'primary' | 'secondary' | 'danger';
  payload_fields: string[];
};

export type CardData = {
  card_id: string;
  type_id: 'entity' | 'selection' | 'progress';
  data: Record<string, any>;
  actions: CardAction[];
};

export type SelectionOption = {
  option_id: string;
  label: string;
  value: string;
  metadata?: Record<string, any>;
};

export type DisplayMapping = {
  source: string;
  type: 'text' | 'tags' | 'findings';
  label?: string;
};

export type ProgressStep = {
  step_id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  error?: string;
  details?: Record<string, any>;
  display_map?: DisplayMapping[];
};

export type CardInteraction = {
  card_id: string;
  action_id: string;
  payload: Record<string, any>;
};

export type AGUIAction =
  | { type: 'run_started' }
  | { type: 'run_finished' }
  | { type: 'run_error'; message: string }
  | { type: 'text_start'; messageId: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'text_end' }
  | { type: 'card'; card: CardData }
  | { type: 'state_delta'; delta: Array<{ op: string; path: string; value: any }> }
  | { type: 'step_finished'; stepName: string }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string }
  | { type: 'tool_call_args'; toolCallId: string; delta: string }
  | { type: 'tool_call_end'; toolCallId: string }
  | { type: 'task_lock'; lock: TaskLockData }
  | { type: 'activity'; content: string }
  | { type: 'unknown'; raw: AGUIEvent };

export type TaskLockData = {
  task_id: string;
  task_type: string;
  description: string;
  context: Record<string, any>;
  final_statuses: string[];
};

export type ToolCallData = {
  toolCallId: string;
  toolName: string;
  args: string;
  status: 'calling' | 'completed';
};
