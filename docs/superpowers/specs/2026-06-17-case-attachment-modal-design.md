# Case Attachment Modal — Design Spec
**Date:** 2026-06-17
**Feature:** Case-level attachment viewer with per-slip accordion sections

---

## Problem

The current attachment icon in `/lab-case-management` opens `FileAttachmentModalContent` scoped to a single slip. Users cannot see attachments from other slips on the same case without navigating away. The backend already supports a case-wide attachment endpoint (`GET /v1/slip/case/{caseId}/attachments`) that returns all slip attachments grouped by slip.

---

## Goal

When a user clicks the attachment icon on any slip row, open a modal that shows **all attachments for that case**, organized per slip in collapsible accordions. Users can upload new files to any individual slip directly from the modal.

---

## Scope

- New component: `components/case-attachment-modal.tsx`
- Modified: `app/lab-case-management/page.tsx` (trigger + state swap)
- Untouched: `components/file-attachment-modal-content.tsx`

---

## Data Flow

### Trigger
`handleAttachmentClick(row)` currently passes the full slip row to `selectedSlipForAttachment`. Change it to extract and pass only what the new modal needs:

```ts
{ caseId: row.caseId, caseNumber: row.case_number, patient: row.patient, doctor: row.doctor }
```

State rename: `selectedSlipForAttachment` → `selectedCaseForAttachment`.

### Fetch
On modal open, call `slipAttachmentsService.getCaseAttachments(caseId)`.

Returns:
- `data.case_attachments[]` — files attached directly to the case
- `data.slips[]` — each slip with `{ id, slip_number, status, attachments[] }`
- `data.summary` — counts (used for header badge)

### Upload
Per slip: `uploadSlipAttachment(slipId, file)` (existing service call). After upload, refetch `getCaseAttachments` to refresh all sections.

### Delete / Archive
Existing `deleteSlipAttachment(attachmentId)` and `toggleSlipAttachmentArchive(attachmentId)`. After action, refetch.

---

## Component: `CaseAttachmentModal`

**File:** `components/case-attachment-modal.tsx`

### Props
```ts
interface CaseAttachmentModalProps {
  open: boolean
  onClose: () => void
  caseId: number
  caseNumber: string
  patientName?: string
  doctorName?: string
}
```

### Layout

```
┌─────────────────────────────────────────────┐
│ [3D icon] Case Attachments  C00077  [X]      │
│ Dr: Smith · Patient: Tes Tes · 3 files total │
├─────────────────────────────────────────────┤
│ ▼ Case Files (1)                             │
│   [file card] [file card]                    │
├─────────────────────────────────────────────┤
│ ▼ Slip #C00077-S01 — In Progress (2)         │
│   [file card] [file card]                    │
│   [+ Upload drop zone]                       │
├─────────────────────────────────────────────┤
│ ► Slip #C00077-S02 — In Progress (0)         │
│   (collapsed)                                │
└─────────────────────────────────────────────┘
```

### Accordion behavior
- Each section (Case Files + each slip) is an accordion item
- Default state: first section with files is expanded; empty sections collapsed
- Toggle on header click
- Section header shows: slip number, status badge, file count

### File card
Reuse the same visual pattern from `file-attachment-modal-content.tsx`:
- Thumbnail area (90px tall): image preview, Box icon for STL, FileText for others
- Below: filename (truncated), size, date
- Action icons: Download, Archive (if `remoteId` exists), Delete (X)
- No 3D viewer, no layout picker, no thumbnail strip

### Upload zone (per slip)
- Shown at the bottom of each slip accordion when expanded
- Drop zone + browse button: calls `uploadSlipAttachment(slip.id, file)`
- Accepts same file types as existing modal: `.jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx`
- On success: refetch `getCaseAttachments(caseId)`
- On error: show inline error below the drop zone

### Loading / empty states
- Loading: spinner centered in modal body while fetching
- Empty case (no slips, no files): "No attachments found for this case."
- Empty slip: accordion shows "No files yet" + upload zone

---

## Lab Case Management Page Changes

**File:** `app/lab-case-management/page.tsx`

1. Add state:
   ```ts
   const [selectedCaseForAttachment, setSelectedCaseForAttachment] = useState<{
     caseId: number; caseNumber: string; patient: string; doctor: string
   } | null>(null)
   ```

2. Update `handleAttachmentClick`:
   ```ts
   const handleAttachmentClick = (slip: any) => {
     setSelectedCaseForAttachment({
       caseId: slip.caseId,
       caseNumber: slip.case_number,
       patient: slip.patient,
       doctor: slip.doctor,
     })
     setShowAttachModal(true)
   }
   ```

3. Swap modal render from `FileAttachmentModalContent` to `CaseAttachmentModal`:
   ```tsx
   {showAttachModal && selectedCaseForAttachment && (
     <CaseAttachmentModal
       open={showAttachModal}
       onClose={() => { setShowAttachModal(false); setSelectedCaseForAttachment(null) }}
       caseId={selectedCaseForAttachment.caseId}
       caseNumber={selectedCaseForAttachment.caseNumber}
       patientName={selectedCaseForAttachment.patient}
       doctorName={selectedCaseForAttachment.doctor}
     />
   )}
   ```

4. Remove `handleAttachmentsUploaded` and `handleAttachmentStateChange` from the portal render (modal manages its own refetch). Keep `updateSlipAttachmentState` if needed elsewhere.

---

## Icon Visibility

No change. The attachment icon remains gated on `row.attachment === true` (slip has at least one attachment). Opening the icon now shows the full case view instead of single-slip studio.

---

## Out of Scope

- 3D STL viewer / layout picker — not included in this modal
- Uploading case-level files (to `case_attachments`) — upload is slip-scoped only
- Changing this flow for office-case-management — separate ticket
- `FileAttachmentModalContent` — untouched

---

## Files Changed

| File | Change |
|------|--------|
| `components/case-attachment-modal.tsx` | New component |
| `app/lab-case-management/page.tsx` | Swap trigger + modal render |
