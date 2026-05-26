# Call Logs Integration Design

## Summary

This spec defines the frontend integration for the `lab-case-management/call-logs` page using the documented RXN3D backend call log APIs in `../rxn3d_backend/docs/slip/SLIP_CALL_LOG_API_DOCUMENTATION.md`.

The approved direction is to make the page a case-level call log view backed by:

- `GET /v1/slip/case/{caseId}/call-logs`

The page will also support the documented call log mutation endpoints:

- `POST /v1/slip/call-logs/{slipId}/create`
- `GET /v1/slip/call-logs/call-log/{callLogId}`
- `PUT /v1/slip/call-logs/call-log/{callLogId}`
- `DELETE /v1/slip/call-logs/call-log/{callLogId}`
- `PATCH /v1/slip/call-logs/call-log/{callLogId}/follow-up`
- `PATCH /v1/slip/call-logs/call-log/{callLogId}/resolved`
- `POST /v1/slip/call-logs/call-log/{callLogId}/attachments`
- `GET /v1/slip/call-logs/call-log/{callLogId}/attachments`

## Current State

The current `app/lab-case-management/call-logs/page.tsx` is only partially integrated:

- It uses `fetchCallLogs()` from `app/lab-case-management/SlipContext.tsx`
- That fetch currently calls `${API_BASE_URL}/slip/call-logs`
- The request shape does not match the documented backend routes
- The returned data is not mapped into stable typed UI rows
- Row actions and add-call-log behavior are placeholder UI only
- Attachments are displayed as a boolean icon state, not backed by the call log attachment APIs

There is also an existing `components/call-log-modal.tsx`, but it is mock-data driven and not connected to the live API.

## Goals

- Replace the incomplete call log fetch with the real documented backend integration
- Use the case-level endpoint as the page source of truth
- Flatten case/slip/call-log response data into table rows suitable for the current layout
- Support all documented page-relevant call log APIs
- Keep frontend naming and behaviors aligned with backend terminology:
  - `call_type`
  - `action_status`
  - `follow_up`
  - `resolved`
  - soft delete
- Preserve existing app auth behavior and unauthorized redirect handling

## Non-Goals

- Rebuilding the entire page visual design
- Adding unsupported backend actions
- Implementing an archive state separate from the documented soft delete endpoint
- Changing backend request or response contracts

## Backend Contract

### Primary page query

The page will load by case:

- `GET /v1/slip/case/{caseId}/call-logs`

Supported query params from docs:

- `call_type`
- `action_status`
- `caller_name`

The response returns:

- case details
- lab, office, doctor, creator info
- slips
- each slip’s `call_logs`

### Secondary slip-specific query

The slip-specific listing endpoint exists and supports richer filtering:

- `GET /v1/slip/call-logs/{slipId}`

Supported query params from docs:

- `call_type`
- `action_status`
- `caller_name`
- `date_from`
- `date_to`
- `logged_by`
- `action_by`
- `per_page`

This endpoint will not be the page’s primary source, but it remains useful for:

- future slip-scoped views
- fallback detail refresh
- single-slip modal expansion if needed later

### Mutation endpoints

- Create:
  - `POST /v1/slip/call-logs/{slipId}/create`
- Read one:
  - `GET /v1/slip/call-logs/call-log/{callLogId}`
- Update:
  - `PUT /v1/slip/call-logs/call-log/{callLogId}`
- Delete:
  - `DELETE /v1/slip/call-logs/call-log/{callLogId}`
- Mark follow up:
  - `PATCH /v1/slip/call-logs/call-log/{callLogId}/follow-up`
- Mark resolved:
  - `PATCH /v1/slip/call-logs/call-log/{callLogId}/resolved`
- Upload attachments:
  - `POST /v1/slip/call-logs/call-log/{callLogId}/attachments`
- Fetch attachments:
  - `GET /v1/slip/call-logs/call-log/{callLogId}/attachments`

## Frontend Design

### 1. Dedicated call log API module

Create a focused service module for call logs rather than keeping this logic embedded in `SlipContext`.

Planned responsibilities:

- expose typed request/response interfaces
- centralize authenticated requests
- normalize base URL handling
- provide one function per backend endpoint

Planned shape:

- `listCaseCallLogs(caseId, filters)`
- `listSlipCallLogs(slipId, filters)`
- `getCallLog(callLogId)`
- `createCallLog(slipId, payload)`
- `updateCallLog(callLogId, payload)`
- `deleteCallLog(callLogId)`
- `markCallLogFollowUp(callLogId)`
- `markCallLogResolved(callLogId)`
- `uploadCallLogAttachments(callLogId, files)`
- `getCallLogAttachments(callLogId)`

### 2. Stable frontend types

Introduce typed models for:

- case-level call log response
- slip summary within a case response
- call log record
- call log attachment
- create/update payloads
- page filter state
- flattened table row state

This replaces current `type CallLog = any` usage.

### 3. Page data source

The page will load from a resolved `caseId`.

The implementation must trace where `lab-case-management/call-logs` gets the active case context from. If the route currently lacks a case identifier in URL or shared state, implementation must first identify the source already used by adjacent case-management flows and reuse it rather than inventing a new mechanism.

Once `caseId` is available:

- fetch `GET /v1/slip/case/{caseId}/call-logs`
- keep the original nested response in state
- derive flattened table rows for rendering

### 4. Response-to-UI mapping

Each rendered row should retain both display fields and raw identifiers.

Derived row fields:

- `callLogId`
- `slipId`
- `slipNumber`
- `caseId`
- `timestamp`
- `callType`
- `callerName`
- `callerPhone`
- `note`
- `loggedByName`
- `actionByName`
- `followUp`
- `resolved`
- `pending`
- `hasAttachments`
- `attachmentsCount`
- `patientName`
- `doctorName`
- `officeName`
- `locationName`
- `productSummary`

Formatting rules:

- display time from `call_date_time`
- map backend lowercase values to UI labels:
  - `incoming` -> `Incoming`
  - `outgoing` -> `Outgoing`
- map `action_status` to toggle and menu behavior:
  - `follow_up` => follow-up on
  - `resolved` => resolved
  - `null` => pending

### 5. Filters

The page’s active filters should match the backend contract where possible.

Direct backend-backed filters:

- call type
- action status
- caller name

Client-side derived filters:

- search across slip number, patient, doctor, note, caller, user
- office filter
- user filter
- follow-up-only toggle
- date range if case-level endpoint does not support server-side date filtering

For the initial implementation:

- fetch case-level call logs using supported backend params
- apply remaining display-only filters client-side after flattening

### 6. Actions

Row and bulk actions will only use supported backend semantics.

Supported actions:

- add call log
- edit call log
- delete call log
- mark follow up
- mark resolved
- fetch attachments
- upload attachments after create or edit

UI label handling:

- If the current menu says `Archive`, it should be renamed to `Delete` unless product explicitly wants soft delete exposed as archive language.
- `Mark as follow up` should call the dedicated follow-up endpoint.
- `Mark as resolved` should call the dedicated resolved endpoint.

### 7. Create flow

When the user creates a call log:

1. choose the target slip
2. submit the create payload to `POST /v1/slip/call-logs/{slipId}/create`
3. if files were selected, upload them to the returned `callLogId`
4. refresh case call logs
5. optionally fetch attachments for the new call log if the UI immediately opens details

Required create payload fields:

- `call_type`
- `call_date_time`
- `caller_name`
- `call_notes`

Optional:

- `caller_phone`

Follow-up note:

- create does not document an `action_status` field
- if the form includes “mark as follow up”, implementation should create the record first, then call the follow-up endpoint

### 8. Edit flow

Edit will:

1. fetch or reuse the current call log data
2. submit `PUT /v1/slip/call-logs/call-log/{callLogId}`
3. refresh case call logs

Edit payload fields align with docs:

- `call_type`
- `call_date_time`
- `caller_name`
- `caller_phone`
- `call_notes`

### 9. Attachment flow

Attachments are call-log-scoped, not slip-scoped for this page.

Flow:

- use `POST /v1/slip/call-logs/call-log/{callLogId}/attachments`
- use multipart upload
- use `GET /v1/slip/call-logs/call-log/{callLogId}/attachments` for display and detail views

Table behavior:

- icon presence should be based on attachment existence from backend data
- if the case-level response does not include attachment counts, fetch attachments lazily when a row is opened or after create/edit

### 10. State management

Preferred structure:

- keep the API wrapper in a dedicated service file
- keep page-specific fetch/mutation state close to the page or in a focused hook
- avoid growing `SlipContext` into a catch-all if call logs need their own loading, errors, and refresh paths

If `SlipContext` is already the only practical shared entry point for adjacent routes, it may expose a minimal case-call-log API surface, but type-safe helpers should still live in a dedicated call log service module.

## Error Handling

- 401:
  - reuse existing auth redirect behavior
- 403:
  - show access-denied feedback on page
- 404:
  - handle missing case, slip, or call log cleanly
- 422 or validation failure:
  - map field errors into the create/edit form
- attachment upload failure:
  - keep the created call log and show a partial-success message

## Testing

Before production completion, add focused tests for:

- response flattening from case call logs into table rows
- action-status mapping
- create payload formatting
- follow-up-after-create sequencing
- attachment upload sequencing

If the repo does not already have a nearby test harness for this page, add the smallest viable test surface around extracted helpers instead of coupling tests to the full page component.

## Implementation Sequence

1. Identify how `caseId` is sourced for `lab-case-management/call-logs`
2. Add typed call log API module
3. Add response mapping helpers
4. Replace current page fetch with case-level fetch
5. Wire filters to supported backend params and client-side derived filters
6. Integrate create flow
7. Integrate update, delete, follow-up, resolved actions
8. Integrate attachment upload and fetch
9. Add targeted tests
10. Verify page behavior manually and through tests

## Open Decisions Resolved

- The page should use the case-level endpoint as its primary data source: approved
- The page should integrate all documented call-log-relevant APIs that support the current screen: approved

## Risks

- The route may not currently expose a reliable `caseId`
- Existing mock UI wording may not exactly match backend semantics
- Attachment metadata may require lazy loading if not included in the case-level response
- Bulk actions may need sequential API calls per selected call log because no bulk backend endpoints are documented

## Acceptance Criteria

- `lab-case-management/call-logs` loads real case call logs from the backend
- rows render real slip and call log data
- supported filters work correctly
- create, edit, delete, follow-up, and resolved actions call the documented endpoints
- call log attachments can be uploaded and retrieved
- the page refreshes consistently after mutations
- no placeholder dummy call log data remains in the lab case management call logs flow
