# Reports flow

## Initialization

1. `src/agui/useAgUiStream.ts` → verified SSE acknowledgement → feature flag and environment.
2. `src/components/Bot.tsx` → current user, agent and conversation → `useReports.ts`.
3. `useReports.ts` → authenticated run list and paginated follow-up recovery → `src/api/pipeline.ts`.
4. Scope change or permission loss → abort pending requests/downloads → clear panel and report messages.

## Reports

1. Header or report action → `ReportsPanel.tsx` → desktop adjacent panel / narrow-screen overlay.
2. Visible panel with active runs → one run-list request every 15 seconds → server step states.
3. Selected ready report → authenticated preview → `ReportPreviewTable.tsx` → first 20 rows.
4. Download → current credentials and run ID → authenticated export → browser workbook.
5. Cancel → actual backend state → cancellation requested until terminal status.
6. Retry → composer prefill → user sends a new request.
7. Unconfirmed submission → exact submission-reference lookup → no automatic resubmission.

## Completion and history

1. Scoped SSE hint → list refresh; reconnect → paginated durable follow-ups.
2. Follow-up IDs + Flowise message IDs → update/deduplicate assistant history in `src/components/Bot.tsx`.
3. Authenticated internal question markers → exact history suppression.
4. Inline report cards → summary/reference only; report cards excluded from persisted history.
5. Report rows → current authorized panel preview only → discarded on scope change.
6. Uncertain previous chat turn → explicit Start new chat → preserve draft without resubmitting.

## Files

| File                        | Responsibility                                  |
| --------------------------- | ----------------------------------------------- |
| `src/api/pipeline.ts`       | Current-credential HTTP and run-based export    |
| `useReports.ts`             | Scope, paging, requests, cancellation, recovery |
| `ReportsPanel.tsx`          | Responsive report list and detail               |
| `ReportPreviewTable.tsx`    | Bounded table and full cell inspection          |
| `src/agui/useAgUiStream.ts` | Scoped event validation and hidden buffering    |
| `src/components/Bot.tsx`    | Chat integration, history and report actions    |

## Activation boundary

- Local synthetic acceptance only; deployment and real-user enablement require the backend plan's identity/history prerequisites.
