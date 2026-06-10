# Case Attachments Integration — Design Spec
**Date:** 2026-06-10  
**Status:** Approved

---

## Overview

Wire the existing `GET /v1/slip/case/{caseId}/attachments` endpoint into three pages that currently only show slip-level attachments (or none at all). The approach is **Option A — dual-mode `FileAttachmentModalContent`**: the existing modal gains an optional `caseId` prop and renders slip-grouped file lists when it is present, while remaining fully backward-compatible when only `slipId` is given or neither ID is set.

---

## Affected Files

| File | Change |
|------|--------|
| `components/file-attachment-modal-content.tsx` | Add `caseId` prop, new fetch path, slip-grouped file list UI |
| `services/slip-attachments-service.ts` | Extend `mapSlipAttachmentToLocalItem` to accept slip context fields |
| `app/lab-case-management/page.tsx` | Pass `caseId={selectedSlipForAttachment.caseId}` to modal |
| `app/virtual-slip-v2/[caseNumber]/page.tsx` | Pass `caseId={caseId}` to modal |
| `components/case-design-center/components/ModalOrchestrator.tsx` | Add `slipId?` + `caseId?` props, thread through |
| `components/case-design-center/components/CaseDesignCenter.tsx` | Accept `slipId?` + `caseId?` in `CaseDesignProps`, pass to orchestrator |
| `components/case-design-center/types.ts` | Add `slipId?: number` and `caseId?: number` to `CaseDesignProps` |

---

## Section 1 — Props & Fetch Modes

### New prop on `FileAttachmentModalContentProps`

```ts
caseId?: number
```

### Three operating modes (derived, never stored in state)

| Mode | Condition | Fetch |
|------|-----------|-------|
| **Case mode** | `caseId` is set | `SlipAttachmentsService.getCaseAttachments(caseId)` |
| **Slip mode** | only `slipId` is set | `SlipAttachmentsService.getSlipAttachments(slipId)` (existing) |
| **Local mode** | neither ID | no fetch — upload-only (new case creation in CDC) |

Upload always targets `slipId` regardless of which mode loaded the file list.

---

## Section 2 — `LocalUploadItem` Extension

Add two optional fields to `LocalUploadItem` (local type inside the modal):

```ts
type LocalUploadItem = {
  // ...existing fields...
  slipId?: number       // which slip owns this remote file (case mode only)
  slipNumber?: string   // "Slip #123" — displayed as accordion header label
}
```

### `mapSlipAttachmentToLocalItem` extension

The helper in `slip-attachments-service.ts` gains an optional second argument:

```ts
export function mapSlipAttachmentToLocalItem(
  a: SlipAttachmentRecord,
  slipContext?: { slipId: number; slipNumber: string }
) { ... }
```

When `slipContext` is provided the returned object includes `slipId` and `slipNumber`.  
`case_attachments` (case-level files with no parent slip) are mapped with `slipContext` omitted — they render under a "Case Files" section.

---

## Section 3 — Case-Mode Fetch Effect

A new `useEffect` sits alongside the existing slip-mode effect.  
A `fetchedCaseIdRef` ref (mirroring the existing `fetchedSlipIdRef`) prevents duplicate fetches:

```ts
const fetchedCaseIdRef = useRef<number | null>(null)

useEffect(() => {
  if (!caseId) return                    // not case mode
  const numericCaseId = Number(caseId)
  if (isNaN(numericCaseId) || numericCaseId === 0) return
  if (fetchedCaseIdRef.current === numericCaseId) return
  fetchedCaseIdRef.current = numericCaseId
  // ...async fetch, map slips[].attachments + case_attachments, setSimulatedUploads
}, [caseId])
```

The existing slip-mode effect gains one guard line at the top: `if (caseId) return` so that when `caseId` is present it takes precedence and slip-mode fetch is skipped. Both IDs may be provided together (e.g. lab-case-management passes both); `caseId` wins for the file list while `slipId` is still used for uploads.

---

## Section 4 — File List Grouping UI

A derived value controls which render path runs — no extra state:

```ts
const groupingMode = caseId ? "slip" : "stage"
```

### Slip-grouped layout (case mode)

Middle panel renders slip sections in place of the stage accordion:

```
┌─ Slip #123  [In Lab]  3 files ─────────────────────┐
│  file-a.stl  |  photo.jpg  |  rx-scan.stl           │
└─────────────────────────────────────────────────────┘
┌─ Slip #124  [Pending]  1 file ──────────────────────┐
│  bite-record.jpg                                     │
└─────────────────────────────────────────────────────┘
┌─ Case Files  1 file ────────────────────────────────┐
│  rx-notes.pdf                                        │
└─────────────────────────────────────────────────────┘
```

Each slip section is a collapsible accordion. Sections with zero visible files are hidden.  
The existing "stage" filter dropdown is hidden when `groupingMode === "slip"`.

### Stage-grouped layout (slip / local mode)

Unchanged — existing accordion render path.

---

## Section 5 — Page Wiring

### `/lab-case-management`

`handleAttachmentClick(slip)` sets `selectedSlipForAttachment`. The slip row already carries `slip.caseId`.

```tsx
<FileAttachmentModalContent
  slipId={selectedSlipForAttachment.id}
  caseId={selectedSlipForAttachment.caseId ?? undefined}
  ...
/>
```

If `slip.caseId` is falsy (edge case), falls back to slip-mode (existing behaviour).

### `/virtual-slip-v2/[caseNumber]`

`caseId` is already derived via `useMemo`. Thread it into the modal:

```tsx
<FileAttachmentModalContent
  slipId={slipId}
  caseId={caseId ?? undefined}
  ...
/>
```

### `/case-design-center` — `CaseDesignProps` → `CaseDesignCenter` → `ModalOrchestrator` → modal

Add to `CaseDesignProps` in `components/case-design-center/types.ts`:

```ts
slipId?: number
caseId?: number
```

`CaseDesignCenter` forwards both to `ModalOrchestrator`.  
`ModalOrchestratorProps` gains the same two props and passes them into `FileAttachmentModalContent`.  
Both default to `undefined` — new case creation stays in local (upload-only) mode.

---

## Section 6 — Archive / Delete

Archive and delete operate on individual `remoteId` values via:
- `SlipAttachmentsService.deleteAttachment(remoteId)`
- `SlipAttachmentsService.toggleArchiveAttachment(remoteId)`

These are per-file endpoints independent of fetch mode. No changes required.

---

## Section 7 — Error Handling

| Failure | Behaviour |
|---------|-----------|
| Case fetch fails | Error caught silently; file list shows empty; upload panel still functional |
| Upload fails | Existing `uploadError` state shown; no change |
| `caseId` present but `0` or `NaN` | Guard `if (!caseId || isNaN(caseId)) return` in fetch effect — falls through to local mode |

---

## Section 8 — Testing

**Unit tests** (`components/file-attachment-modal-content.test.tsx`):
- Renders upload-only when neither `slipId` nor `caseId` supplied
- Calls `getCaseAttachments` when `caseId` given; does not call `getSlipAttachments`
- Calls `getSlipAttachments` when only `slipId` given; does not call `getCaseAttachments`
- Renders slip-grouped accordion in case mode
- Renders stage-grouped accordion in slip/local mode
- Does not re-fetch when same `caseId` passed on re-render

**Integration tests**:
- `lab-case-management`: clicking attachment icon on a slip row opens modal with case-level files grouped by slip
- `virtual-slip-v2`: attachment modal shows all slips' files grouped by slip number

**Coverage target:** 80%+

---

## Section 9 — STL Card Auto-Select on File Upload

**File:** `components/impression-selection-modal.tsx` + `components/stl-file-selection-modal.tsx`

### Current behaviour

When a user picks an STL impression card → `STLFileSelectionModal` opens → user adds files → user clicks **Confirm** → `handleSTLConfirmed()` fires → `onSetArchQty(arch, impression, files.length)` → card turns blue (selected).

### Desired behaviour

The STL card should auto-select **as soon as files are added** — no separate Confirm click required.

### Implementation

In `stl-file-selection-modal.tsx`, both `handleFileChange` and `handleDrop` should call `onConfirm(newFiles)` and then `onClose()` immediately after updating state with the new files, eliminating the manual confirm step.

```ts
// handleFileChange — after building newFiles:
onConfirm(newFiles)
onClose()

// handleDrop — after building newFiles:
onConfirm(newFiles)
onClose()
```

The `handleConfirm` button path remains for any explicit re-confirm, but in practice the modal will close automatically. Result: `handleSTLConfirmed` in `impression-selection-modal.tsx` fires on file-add, `onSetArchQty` sets qty = file count, the card shows the blue border immediately.

---

## Out of Scope

- Upload to case level (no case-level upload endpoint exists; all uploads target a slip)
- Attachment count badge on the case row in lab-case-management (separate feature)
- Pagination of case attachments (API supports it but not needed for initial implementation)
