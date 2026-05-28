# Call Logs Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the `lab-case-management/call-logs` page with the documented RXN3D call log APIs and adjust the UI so listing, create, update, delete, follow-up, resolved, and attachments work against live backend data.

**Architecture:** Add a dedicated typed call log API module, extract response-to-row mapping helpers with focused tests, and rework the lab call logs page to load case-level call logs and execute per-call-log mutations. Reuse the existing modal shell where it helps, but align labels and actions with the backend contract instead of the current mock behavior.

**Tech Stack:** Next.js App Router, React client components, TypeScript, existing `ApiService`, Shadcn UI components, Node test runner used by existing `.test.mjs` utilities.

---

### Task 1: Add typed call log transforms and failing tests

**Files:**
- Create: `lib/call-log-transformers.ts`
- Create: `lib/call-log-transformers.test.mjs`
- Reference: `../rxn3d_backend/docs/slip/SLIP_CALL_LOG_API_DOCUMENTATION.md`

- [ ] **Step 1: Write the failing test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { flattenCaseCallLogs, toCallLogActionStatus } from "./call-log-transformers";

test("flattenCaseCallLogs flattens nested case/slip call logs into table rows", () => {
  const rows = flattenCaseCallLogs({
    id: 77,
    patient_name: "John Doe",
    office: { id: 2, name: "Smile Office" },
    doctor: { id: 3, name: "Dr. Smith" },
    slips: [
      {
        id: 10,
        slip_number: "SLIP-010",
        location: { id: 5, name: "Main Lab" },
        products: [{ id: 1, product_name: "Crown", stage_name: "Design" }],
        call_logs: [
          {
            id: 99,
            call_type: "incoming",
            call_date_time: "2025-07-18T14:30:00.000000Z",
            caller_name: "Jane Caller",
            caller_phone: "+123",
            call_notes: "Needs update",
            action_status: "follow_up",
            logged_by: { id: 7, name: "Agent A" },
            action_by: { id: 8, name: "Agent B" },
            has_attachments: true,
            attachments_count: 2,
          },
        ],
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].callLogId, 99);
  assert.equal(rows[0].slipId, 10);
  assert.equal(rows[0].caseId, 77);
  assert.equal(rows[0].callType, "Incoming");
  assert.equal(rows[0].followUp, true);
  assert.equal(rows[0].resolved, false);
  assert.equal(rows[0].pending, false);
  assert.equal(rows[0].patientName, "John Doe");
  assert.equal(rows[0].officeName, "Smile Office");
  assert.equal(rows[0].doctorName, "Dr. Smith");
  assert.equal(rows[0].productSummary, "Crown");
});

test("toCallLogActionStatus maps backend action states predictably", () => {
  assert.deepEqual(toCallLogActionStatus("follow_up"), {
    followUp: true,
    resolved: false,
    pending: false,
  });
  assert.deepEqual(toCallLogActionStatus("resolved"), {
    followUp: false,
    resolved: true,
    pending: false,
  });
  assert.deepEqual(toCallLogActionStatus(null), {
    followUp: false,
    resolved: false,
    pending: true,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: FAIL with module not found or missing export errors for `call-log-transformers`.

- [ ] **Step 3: Write minimal implementation**

```typescript
export type BackendActionStatus = "follow_up" | "resolved" | null | undefined;

export type FlattenedCallLogRow = {
  callLogId: number;
  slipId: number;
  slipNumber: string;
  caseId: number;
  timestamp: string;
  callType: "Incoming" | "Outgoing";
  callerName: string;
  callerPhone: string;
  note: string;
  loggedByName: string;
  actionByName: string;
  followUp: boolean;
  resolved: boolean;
  pending: boolean;
  hasAttachments: boolean;
  attachmentsCount: number;
  patientName: string;
  doctorName: string;
  officeName: string;
  locationName: string;
  productSummary: string;
};

export function toCallLogActionStatus(actionStatus: BackendActionStatus) {
  return {
    followUp: actionStatus === "follow_up",
    resolved: actionStatus === "resolved",
    pending: actionStatus == null,
  };
}

export function flattenCaseCallLogs(caseData: any): FlattenedCallLogRow[] {
  const slips = Array.isArray(caseData?.slips) ? caseData.slips : [];

  return slips.flatMap((slip: any) => {
    const callLogs = Array.isArray(slip?.call_logs) ? slip.call_logs : [];
    const productSummary = Array.isArray(slip?.products)
      ? slip.products.map((product: any) => product?.product_name).filter(Boolean).join(", ")
      : "";

    return callLogs.map((callLog: any) => {
      const state = toCallLogActionStatus(callLog?.action_status ?? null);

      return {
        callLogId: Number(callLog?.id ?? 0),
        slipId: Number(slip?.id ?? 0),
        slipNumber: String(slip?.slip_number ?? ""),
        caseId: Number(caseData?.id ?? 0),
        timestamp: String(callLog?.call_date_time ?? ""),
        callType: callLog?.call_type === "incoming" ? "Incoming" : "Outgoing",
        callerName: String(callLog?.caller_name ?? ""),
        callerPhone: String(callLog?.caller_phone ?? ""),
        note: String(callLog?.call_notes ?? ""),
        loggedByName: String(callLog?.logged_by?.name ?? ""),
        actionByName: String(callLog?.action_by?.name ?? ""),
        followUp: state.followUp,
        resolved: state.resolved,
        pending: state.pending,
        hasAttachments: Boolean(callLog?.has_attachments ?? false),
        attachmentsCount: Number(callLog?.attachments_count ?? 0),
        patientName: String(caseData?.patient_name ?? ""),
        doctorName: String(caseData?.doctor?.name ?? ""),
        officeName: String(caseData?.office?.name ?? ""),
        locationName: String(slip?.location?.name ?? ""),
        productSummary,
      };
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS with 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/call-log-transformers.ts lib/call-log-transformers.test.mjs
git commit -m "test: add call log transform coverage"
```

### Task 2: Add dedicated call log API service with typed methods

**Files:**
- Create: `services/call-logs-service.ts`
- Modify: `lib/api-service.ts`
- Test: `lib/call-log-transformers.test.mjs`

- [ ] **Step 1: Write the failing test**

Add this test to `lib/call-log-transformers.test.mjs`:

```javascript
import { toCallLogCreatePayload } from "./call-log-transformers";

test("toCallLogCreatePayload formats UI form state into backend payload", () => {
  const payload = toCallLogCreatePayload({
    callType: "Incoming",
    callDate: "2025-07-18",
    callTime: "14:30",
    callerName: "John Doe",
    callerPhone: "+1234567890",
    callNotes: "Customer called to check status",
  });

  assert.deepEqual(payload, {
    call_type: "incoming",
    call_date_time: "2025-07-18 14:30:00",
    caller_name: "John Doe",
    caller_phone: "+1234567890",
    call_notes: "Customer called to check status",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: FAIL because `toCallLogCreatePayload` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add to `lib/call-log-transformers.ts`:

```typescript
export type CallLogFormValues = {
  callType: "Incoming" | "Outgoing";
  callDate: string;
  callTime: string;
  callerName: string;
  callerPhone: string;
  callNotes: string;
};

export function toCallLogCreatePayload(values: CallLogFormValues) {
  return {
    call_type: values.callType === "Incoming" ? "incoming" : "outgoing",
    call_date_time: `${values.callDate} ${values.callTime}:00`,
    caller_name: values.callerName,
    caller_phone: values.callerPhone,
    call_notes: values.callNotes,
  };
}
```

Create `services/call-logs-service.ts` with:

```typescript
import { ApiService } from "@/lib/api-service";

export type CallLogFilterParams = {
  call_type?: "incoming" | "outgoing";
  action_status?: "follow_up" | "resolved";
  caller_name?: string;
};

export type CallLogMutationPayload = {
  call_type: "incoming" | "outgoing";
  call_date_time: string;
  caller_name: string;
  caller_phone?: string;
  call_notes: string;
};

function toQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const CallLogsService = {
  listCaseCallLogs(caseId: number, filters: CallLogFilterParams = {}) {
    return ApiService.get(`/v1/slip/case/${caseId}/call-logs${toQueryString(filters)}`);
  },
  getCallLog(callLogId: number) {
    return ApiService.get(`/v1/slip/call-logs/call-log/${callLogId}`);
  },
  createCallLog(slipId: number, payload: CallLogMutationPayload) {
    return ApiService.post(`/v1/slip/call-logs/${slipId}/create`, payload);
  },
  updateCallLog(callLogId: number, payload: CallLogMutationPayload) {
    return ApiService.put(`/v1/slip/call-logs/call-log/${callLogId}`, payload);
  },
  deleteCallLog(callLogId: number) {
    return ApiService.delete(`/v1/slip/call-logs/call-log/${callLogId}`);
  },
  markCallLogFollowUp(callLogId: number) {
    return ApiService.patch(`/v1/slip/call-logs/call-log/${callLogId}/follow-up`);
  },
  markCallLogResolved(callLogId: number) {
    return ApiService.patch(`/v1/slip/call-logs/call-log/${callLogId}/resolved`);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/call-log-transformers.ts lib/call-log-transformers.test.mjs services/call-logs-service.ts
git commit -m "feat: add call logs api service"
```

### Task 3: Add attachment helpers to the call log service

**Files:**
- Modify: `services/call-logs-service.ts`
- Reference: `contexts/slip-creation-context.tsx:807-849`

- [ ] **Step 1: Write the failing test**

Add this test to `lib/call-log-transformers.test.mjs`:

```javascript
import { toCallLogAttachmentSummary } from "./call-log-transformers";

test("toCallLogAttachmentSummary maps attachment response for UI display", () => {
  const summary = toCallLogAttachmentSummary([
    { id: 1, file_name: "voice-note.mp3", file_size: "2048", file_path: "https://example.com/voice-note.mp3" },
  ]);

  assert.deepEqual(summary, [
    { id: 1, name: "voice-note.mp3", size: "2048", url: "https://example.com/voice-note.mp3" },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: FAIL because `toCallLogAttachmentSummary` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add to `lib/call-log-transformers.ts`:

```typescript
export function toCallLogAttachmentSummary(attachments: any[] = []) {
  return attachments.map((attachment) => ({
    id: Number(attachment?.id ?? 0),
    name: String(attachment?.file_name ?? ""),
    size: String(attachment?.file_size ?? ""),
    url: String(attachment?.file_path ?? ""),
  }));
}
```

Extend `services/call-logs-service.ts` with:

```typescript
type UploadCallLogAttachmentsResponse = {
  success: boolean;
  message: string;
  data: any[];
};

async function uploadCallLogAttachments(callLogId: number, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("attachments[]", file));

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/slip/call-logs/call-log/${callLogId}/attachments`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }
  );

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized - Redirecting to login");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload attachments");
  }

  return response.json() as Promise<UploadCallLogAttachmentsResponse>;
}

async function getCallLogAttachments(callLogId: number) {
  return ApiService.get(`/v1/slip/call-logs/call-log/${callLogId}/attachments`);
}
```

Wire them into the exported service object:

```typescript
  uploadCallLogAttachments,
  getCallLogAttachments,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS with 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/call-log-transformers.ts lib/call-log-transformers.test.mjs services/call-logs-service.ts
git commit -m "feat: add call log attachment helpers"
```

### Task 4: Replace the lab call logs page fetch and row mapping

**Files:**
- Modify: `app/lab-case-management/call-logs/page.tsx`
- Modify: `app/lab-case-management/SlipContext.tsx`
- Reference: `app/lab-case-management/page.tsx`
- Reference: `services/call-logs-service.ts`
- Reference: `lib/call-log-transformers.ts`

- [ ] **Step 1: Write the failing test**

No new file-level test is needed here. Use the existing transformer coverage as the failing guardrail and make the page compile against the new types. The failure signal for this task is the page breaking TypeScript or runtime imports.

- [ ] **Step 2: Run test to verify current implementation fails the intended integration contract**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS for transformer tests only, while the page still uses the wrong `/slip/call-logs` source and is not yet integrated.

- [ ] **Step 3: Write minimal implementation**

Make these changes in `app/lab-case-management/call-logs/page.tsx`:

- remove `fetchCallLogs()` dependency from `SlipContext`
- derive `caseId` from:
  - `useSearchParams().get("caseId")` when available
  - otherwise a stored selected slip/case source already used by the app
- load case call logs with `CallLogsService.listCaseCallLogs(caseId, filters)`
- flatten nested response using `flattenCaseCallLogs`
- replace placeholder row shape accessors with flattened fields
- use `Delete` instead of `Archive` in the row menu
- guard empty `caseId` with a clean empty state message instead of firing a bad request

Make these changes in `app/lab-case-management/SlipContext.tsx`:

- remove the old `fetchCallLogs` implementation or mark it unused if other pages still depend on it
- do not keep `${API_BASE_URL}/slip/call-logs` as an active source for the lab page

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand`
Expected: If this repo has no configured test target, capture the failure and then run `node --test lib/call-log-transformers.test.mjs` plus a build/typecheck command in later tasks. If `npm test` exists, expect no new failures from the page refactor.

- [ ] **Step 5: Commit**

```bash
git add app/lab-case-management/call-logs/page.tsx app/lab-case-management/SlipContext.tsx
git commit -m "feat: load lab call logs from case api"
```

### Task 5: Wire create and edit form behavior into the call log modal

**Files:**
- Modify: `components/call-log-modal.tsx`
- Modify: `app/lab-case-management/call-logs/page.tsx`
- Reference: `services/call-logs-service.ts`
- Reference: `lib/call-log-transformers.ts`

- [ ] **Step 1: Write the failing test**

Use the existing payload-formatting test from Task 2 as the red test for form submission correctness. Add one more test:

```javascript
test("toCallLogCreatePayload keeps outgoing values lowercase for backend", () => {
  const payload = toCallLogCreatePayload({
    callType: "Outgoing",
    callDate: "2025-07-18",
    callTime: "09:15",
    callerName: "Front Desk",
    callerPhone: "",
    callNotes: "Returned call",
  });

  assert.equal(payload.call_type, "outgoing");
  assert.equal(payload.call_date_time, "2025-07-18 09:15:00");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: FAIL until the new test is added and the helper behavior exists exactly as expected.

- [ ] **Step 3: Write minimal implementation**

Update `components/call-log-modal.tsx` to:

- accept:
  - `slipId`
  - optional `callLogId`
  - initial values for edit mode
  - `onSaved`
- remove mock history as source of truth for the lab page flow
- submit create with `CallLogsService.createCallLog`
- submit edit with `CallLogsService.updateCallLog`
- if `markAsFollowUp` is checked during create, call `markCallLogFollowUp` after create succeeds
- upload selected files after successful create or edit if files exist
- call `onSaved()` and close the modal after success

Update `app/lab-case-management/call-logs/page.tsx` to:

- open the modal with the selected row’s `slipId` for create
- open the modal with row details for edit
- refresh case data after save

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS with all payload-formatting tests green.

- [ ] **Step 5: Commit**

```bash
git add components/call-log-modal.tsx app/lab-case-management/call-logs/page.tsx lib/call-log-transformers.test.mjs
git commit -m "feat: connect call log modal to live mutations"
```

### Task 6: Wire follow-up, resolved, and delete row actions

**Files:**
- Modify: `app/lab-case-management/call-logs/page.tsx`
- Reference: `services/call-logs-service.ts`

- [ ] **Step 1: Write the failing test**

No additional unit test file is required here. The existing action-state transformer tests cover the expected state mapping; this task validates the mutation wiring against the live page behavior.

- [ ] **Step 2: Run test to verify it fails the intended behavior**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS for pure helpers while the page actions still do nothing or show placeholder behavior.

- [ ] **Step 3: Write minimal implementation**

In `app/lab-case-management/call-logs/page.tsx`:

- wire `Mark as follow up` to `CallLogsService.markCallLogFollowUp`
- wire `Mark as resolved` to `CallLogsService.markCallLogResolved`
- wire `Delete` to `CallLogsService.deleteCallLog`
- refresh case call logs after each mutation
- disable conflicting actions when a row is already resolved or already follow-up if needed for clarity
- keep bulk actions sequential, one call log at a time, because no bulk backend endpoints are documented

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS, then manually confirm the page actions no longer rely on placeholder callbacks.

- [ ] **Step 5: Commit**

```bash
git add app/lab-case-management/call-logs/page.tsx
git commit -m "feat: connect call log row actions"
```

### Task 7: Add attachment viewing and UI adjustments

**Files:**
- Modify: `app/lab-case-management/call-logs/page.tsx`
- Modify: `components/call-log-modal.tsx`
- Modify: `lib/call-log-transformers.ts`
- Test: `lib/call-log-transformers.test.mjs`

- [ ] **Step 1: Write the failing test**

Add this test:

```javascript
test("flattenCaseCallLogs defaults attachment fields safely when backend omits them", () => {
  const rows = flattenCaseCallLogs({
    id: 1,
    patient_name: "Pat",
    slips: [{ id: 10, slip_number: "S-1", call_logs: [{ id: 11, call_type: "outgoing", call_date_time: "2025-01-01T00:00:00.000000Z", caller_name: "Desk", call_notes: "Note" }] }],
  });

  assert.equal(rows[0].hasAttachments, false);
  assert.equal(rows[0].attachmentsCount, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: FAIL if the transformer does not safely default omitted attachment fields.

- [ ] **Step 3: Write minimal implementation**

Adjust the page and modal to:

- lazy-load attachments with `getCallLogAttachments(callLogId)` when a row is opened or when editing
- show a useful attachment affordance when attachments exist
- keep the paperclip indicator tied to real backend data
- show selected upload files clearly inside the modal before save
- align button and menu labels with backend behavior:
  - `Add Call log`
  - `Edit`
  - `Delete`
  - `Mark as resolved`
  - `Mark as follow up`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS with all transformer tests green.

- [ ] **Step 5: Commit**

```bash
git add app/lab-case-management/call-logs/page.tsx components/call-log-modal.tsx lib/call-log-transformers.ts lib/call-log-transformers.test.mjs
git commit -m "feat: add call log attachment display"
```

### Task 8: Final verification

**Files:**
- Verify: `app/lab-case-management/call-logs/page.tsx`
- Verify: `components/call-log-modal.tsx`
- Verify: `services/call-logs-service.ts`
- Verify: `lib/call-log-transformers.ts`
- Verify: `lib/call-log-transformers.test.mjs`

- [ ] **Step 1: Run targeted tests**

Run: `node --test lib/call-log-transformers.test.mjs`
Expected: PASS with all tests passing.

- [ ] **Step 2: Run project verification**

Run: `npm run lint`
Expected: PASS, or report only pre-existing unrelated failures with exact output.

- [ ] **Step 3: Run build or typecheck verification**

Run: `npm run build`
Expected: PASS, or report the exact failing file and error if build issues remain.

- [ ] **Step 4: Verify spec coverage**

Check the implementation against:
- `docs/superpowers/specs/2026-05-25-call-logs-integration-design.md`

Expected:
- case-level loading present
- create/edit/delete/follow-up/resolved wired
- attachments upload and fetch wired
- placeholder call log data removed from lab page flow

- [ ] **Step 5: Commit**

```bash
git add app/lab-case-management/call-logs/page.tsx components/call-log-modal.tsx services/call-logs-service.ts lib/call-log-transformers.ts lib/call-log-transformers.test.mjs app/lab-case-management/SlipContext.tsx
git commit -m "feat: integrate lab call logs api"
```
