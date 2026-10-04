/**
 * Workbook download for data pipeline result cards on the MCP server.
 *
 * The request always goes to the configured MCP API host (its path prefix kept) and carries only the
 * run reference from the card plus the current conversation credentials. A card never supplies a URL, so the
 * token is never sent anywhere else. The browser adds Origin itself; MCP resolves the environment from it.
 */

export const PIPELINE_DOWNLOAD_ACTION_ID = 'pipeline_download';

export type PipelineDownloadRequest = {
  apiHost: string;
  userToken: string;
  runId: string;
  userId: string;
  agentId: string;
  sessionId: string;
  locale?: string;
  title?: string;
  admittedAt?: string;
  // Aborted when the user who started the download is no longer the widget's user.
  signal: AbortSignal;
};

const BLOB_URL_LIFETIME_MS = 10_000;
const FILENAME_UTF8 = /filename\*=UTF-8''([^;]+)/i;
const FILENAME_PLAIN = /filename="?([^";]+)"?/i;

const attachmentFilename = (disposition: string | null): string | null => {
  if (!disposition) return null;
  const encoded = FILENAME_UTF8.exec(disposition);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return null;
    }
  }
  const plain = FILENAME_PLAIN.exec(disposition);
  return plain ? plain[1] : null;
};

const fallbackFilename = (request: PipelineDownloadRequest): string => {
  const title =
    (request.title ?? 'Report')
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\p{M}_-]+/gu, '_')
      .replace(/^_+|_+$/g, '') || 'Report';
  const date = new Date(request.admittedAt ?? '');
  const suffix = Number.isNaN(date.getTime()) ? '' : `_${date.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}Z`;
  const prefix = 'Afaqy_Mosaed_';
  const boundedTitle =
    Array.from(title)
      .slice(0, 100 - prefix.length - suffix.length)
      .join('')
      .replace(/_+$/g, '') || 'Report';
  return `${prefix}${boundedTitle}${suffix}.xlsx`;
};

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
};

/**
 * Fetch the result's workbook and save it; rejects with the server's error code on failure. Nothing is saved
 * once `signal` is aborted, even if the workbook already arrived.
 */
export async function downloadPipelineResult(request: PipelineDownloadRequest): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  Object.assign(headers, pipelineHeaders(request));
  const response = await fetch(pipelineUrl(request.apiHost, 'exports'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ run_id: request.runId, locale: /^ar(?:-|$)/i.test(request.locale ?? document.documentElement.lang) ? 'ar' : 'en' }),
    signal: request.signal,
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    throw new PipelineError(response.status, failure?.error ?? `HTTP ${response.status}`);
  }
  const filename = attachmentFilename(response.headers.get('Content-Disposition')) ?? fallbackFilename(request);
  const blob = await response.blob();
  if (request.signal.aborted) throw new DOMException('The download was cancelled', 'AbortError');
  saveBlob(blob, filename);
}

export type PipelineScope = { apiHost: string; userToken: string; userId: string; agentId: string; sessionId: string; environment: string };
export type ReportState = 'all' | 'queued' | 'running' | 'ready' | 'failed' | 'cancelled' | 'expired';
export type ReportRun = {
  run_id: string;
  title: string;
  status: 'admitted' | 'running' | 'ready' | 'failed' | 'cancelled';
  availability: 'ready' | 'expired' | null;
  error?: string | null;
  admitted_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  expires_at?: string | null;
  steps: Array<{ name: string; op: string; status: string; error?: string | null }>;
  result_summary: { row_count: number; expected_count: number | null; complete: boolean; column_count: number } | null;
};
export type ReportPreview = {
  columns: Array<{ key: string; type: string }>;
  preview: Record<string, unknown>[];
  row_count: number;
  complete: boolean;
  expected_count: number | null;
  expires_at: string;
  match_counts?: Record<string, unknown>;
  join_counts?: Record<string, unknown>;
};
export type ReportFollowup = {
  type: 'bot_message';
  message_id: string;
  flowise_message_id?: string;
  run_id: string;
  text: string;
  session_id: string;
  environment: string;
  action: 'open_reports';
};
export type ReportList = {
  principal: { user_id: string; environment: string };
  items: ReportRun[];
  total: number;
  offset: number;
  limit: number;
  counts: Partial<Record<ReportState, number>>;
  server_time: string;
};
export class PipelineError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const pipelineUrl = (host: string, path: string): string => `${host.replace(/\/$/, '')}/api/pipeline/${path}`;
export const pipelineHeaders = (scope: Pick<PipelineScope, 'userId' | 'userToken' | 'agentId' | 'sessionId'>): Record<string, string> => ({
  'X-User-ID': scope.userId,
  'X-User-Token': scope.userToken,
  'X-Agent-ID': scope.agentId,
  'X-Session-ID': scope.sessionId,
});
/** Read or cancel a report using only the current caller's credentials. */
export async function pipelineRequest<T>(scope: PipelineScope, path: string, signal: AbortSignal, method = 'GET'): Promise<T> {
  const response = await fetch(pipelineUrl(scope.apiHost, path), { method, headers: pipelineHeaders(scope), signal, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new PipelineError(response.status, body.error ?? `HTTP ${response.status}`);
  }
  return response.json();
}
