# Case Attachment Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-slip attachment studio with a case-level modal that shows all slip attachments in per-slip accordions with per-slip upload.

**Architecture:** New `CaseAttachmentModal` component fetches `GET /v1/slip/case/{caseId}/attachments`, renders a `Dialog` with one accordion section per slip plus a "Case Files" section at top. Upload calls the existing `uploadSlipAttachment` service and refetches. The lab case management page swaps its trigger state + modal render; `FileAttachmentModalContent` is untouched.

**Tech Stack:** Next.js 14, React, TypeScript, Radix UI Dialog, Lucide icons, existing `slipAttachmentsService`, `toProxiedFileUrl` from `@/lib/file-proxy`

## Global Constraints

- Never mutate objects in place — always spread into new objects
- No `any` in new code — use types from `services/slip-attachments-service.ts`
- No console.log in production code
- Accept same file types as existing modal: `.jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx`
- File size limit: 100 MB (use `validateSlipAttachmentFile` from the service)
- Reuse `Dialog / DialogContent` from `@/components/ui/dialog`
- Follow existing icon size and button class patterns from `file-attachment-modal-content.tsx`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/case-attachment-modal.tsx` | Create | Full new modal: fetch, accordions, file cards, upload |
| `app/lab-case-management/page.tsx` | Modify | Swap state + modal render |

---

### Task 1: Build `CaseAttachmentModal` component

**Files:**
- Create: `components/case-attachment-modal.tsx`

**Interfaces:**
- Consumes: `slipAttachmentsService.getCaseAttachments(caseId)` → `SlipAttachmentsApiResponse<CaseAttachmentsData>`
- Consumes: `slipAttachmentsService.uploadSlipAttachment(slipId, file)` → `SlipAttachmentsApiResponse<SlipAttachmentRecord>`
- Consumes: `slipAttachmentsService.deleteAttachment(attachmentId)` → `SlipAttachmentsApiResponse<null>`
- Consumes: `slipAttachmentsService.toggleArchiveAttachment(attachmentId)` → `SlipAttachmentsApiResponse<SlipAttachmentRecord>`
- Consumes: `toProxiedFileUrl(url: string)` from `@/lib/file-proxy`
- Consumes types: `CaseAttachmentsData`, `CaseAttachmentSlip`, `SlipAttachmentRecord` from `@/services/slip-attachments-service`
- Produces: `export default function CaseAttachmentModal(props: CaseAttachmentModalProps)`

- [ ] **Step 1: Create the component file with types, imports, and skeleton**

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Upload, Download, Archive, FileText, Box, Calendar, ChevronDown, ChevronRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { slipAttachmentsService, validateSlipAttachmentFile } from "@/services/slip-attachments-service"
import type { CaseAttachmentsData, CaseAttachmentSlip, SlipAttachmentRecord } from "@/services/slip-attachments-service"
import { toProxiedFileUrl } from "@/lib/file-proxy"

interface CaseAttachmentModalProps {
  open: boolean
  onClose: () => void
  caseId: number
  caseNumber: string
  patientName?: string
  doctorName?: string
}

export default function CaseAttachmentModal({
  open,
  onClose,
  caseId,
  caseNumber,
  patientName,
  doctorName,
}: CaseAttachmentModalProps) {
  const [data, setData] = useState<CaseAttachmentsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // expandedSections: Set of section keys ("case" | slip id string)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  // uploadingSlipId: which slip is currently uploading
  const [uploadingSlipId, setUploadingSlipId] = useState<number | null>(null)
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({})
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <div>skeleton</div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Add fetch logic**

Replace the `return` in the component body (before the JSX) with:

```tsx
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await slipAttachmentsService.getCaseAttachments(caseId)
      if (!res.success) throw new Error(res.message)
      setData(res.data)
      // Auto-expand first section that has files
      const firstWithFiles =
        (res.data.case_attachments?.length ?? 0) > 0
          ? "case"
          : res.data.slips.find((s) => s.attachments.length > 0)?.id?.toString() ?? null
      if (firstWithFiles) setExpandedSections(new Set([firstWithFiles]))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments")
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])
```

- [ ] **Step 3: Add upload handler**

Add below the fetch logic:

```tsx
  const handleUpload = async (slipId: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const validationError = validateSlipAttachmentFile(file)
    if (validationError) {
      setUploadErrors((prev) => ({ ...prev, [slipId]: validationError }))
      return
    }
    setUploadErrors((prev) => ({ ...prev, [slipId]: "" }))
    setUploadingSlipId(slipId)
    try {
      await slipAttachmentsService.uploadSlipAttachment(slipId, file)
      await fetchData()
    } catch (e) {
      setUploadErrors((prev) => ({
        ...prev,
        [slipId]: e instanceof Error ? e.message : "Upload failed",
      }))
    } finally {
      setUploadingSlipId(null)
    }
  }

  const handleDelete = async (attachmentId: number) => {
    try {
      await slipAttachmentsService.deleteAttachment(attachmentId)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    }
  }

  const handleToggleArchive = async (attachmentId: number) => {
    try {
      await slipAttachmentsService.toggleArchiveAttachment(attachmentId)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive toggle failed")
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
```

- [ ] **Step 4: Add file card renderer**

Add this helper function inside the component (before the return):

```tsx
  const renderFileCard = (attachment: SlipAttachmentRecord) => {
    const isImage = attachment.is_image
    const isStl = attachment.is_stl
    const downloadUrl = attachment.download_url || attachment.file_path

    return (
      <div
        key={attachment.id}
        className={`bg-white rounded-lg border border-gray-200 flex flex-col w-[140px] flex-shrink-0 ${attachment.is_archived ? "opacity-60" : ""}`}
      >
        {/* Thumbnail */}
        <div className="w-full bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden h-[80px] relative">
          {attachment.is_archived && (
            <div className="absolute top-1 left-1 z-10 bg-gray-600/80 text-white text-[7px] font-semibold px-1 py-0.5 rounded">
              Archived
            </div>
          )}
          {isImage ? (
            <img
              src={toProxiedFileUrl(downloadUrl)}
              alt={attachment.file_name}
              className="object-cover w-full h-full rounded-t-lg"
            />
          ) : isStl ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <Box className="text-gray-300 w-7 h-7" />
              <span className="text-[7px] text-gray-400">STL</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <FileText className="text-gray-300 w-7 h-7" />
              <span className="text-[7px] text-gray-400 uppercase">{attachment.file_type || "file"}</span>
            </div>
          )}
          {/* Action buttons overlay */}
          <div className="absolute bottom-1 right-1 flex gap-0.5">
            <button
              type="button"
              className="p-0.5 hover:bg-white/80 rounded bg-white/60"
              title="Archive"
              onClick={() => void handleToggleArchive(attachment.id)}
            >
              <Archive className="text-gray-500 w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              className="p-0.5 hover:bg-white/80 rounded bg-white/60"
              title="Download"
              onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
            >
              <Download className="text-gray-500 w-2.5 h-2.5" />
            </button>
          </div>
        </div>
        {/* Meta */}
        <div className="px-1.5 py-1">
          <div className="truncate font-medium text-[9px]">{attachment.file_name}</div>
          <div className="text-gray-500 text-[8px]">{attachment.file_size_formatted || `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB`}</div>
          <div className="flex items-center gap-1 text-gray-400 mt-0.5 text-[7px]">
            <Calendar className="w-2 h-2" />
            <span>{new Date(attachment.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}</span>
            <button
              type="button"
              className="ml-auto p-0 hover:text-red-500"
              title="Delete"
              onClick={() => void handleDelete(attachment.id)}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }
```

- [ ] **Step 5: Add upload zone renderer**

Add this helper inside the component:

```tsx
  const renderUploadZone = (slip: CaseAttachmentSlip) => (
    <div className="mt-2">
      <div
        className="rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 h-[60px]"
        onClick={() => fileInputRefs.current[slip.id]?.click()}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy" }}
        onDrop={(e) => {
          e.preventDefault()
          void handleUpload(slip.id, e.dataTransfer.files)
        }}
      >
        {uploadingSlipId === slip.id ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4 text-[#1162A8]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-xs text-[#1162A8]">Uploading…</span>
          </div>
        ) : (
          <>
            <Upload className="text-gray-400 w-4 h-4 mb-0.5" />
            <p className="text-gray-400 text-[9px]">Drop or browse to upload</p>
          </>
        )}
      </div>
      {uploadErrors[slip.id] && (
        <p className="text-red-500 text-[9px] mt-1">{uploadErrors[slip.id]}</p>
      )}
      <input
        type="file"
        className="hidden"
        ref={(el) => { fileInputRefs.current[slip.id] = el }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx"
        onChange={(e) => void handleUpload(slip.id, e.target.files)}
      />
    </div>
  )
```

- [ ] **Step 6: Add accordion section renderer**

Add this helper inside the component:

```tsx
  const renderSection = (
    key: string,
    label: string,
    statusBadge: string | null,
    attachments: SlipAttachmentRecord[],
    slip?: CaseAttachmentSlip
  ) => {
    const isExpanded = expandedSections.has(key)
    return (
      <div key={key} className="border-b last:border-b-0">
        {/* Accordion header */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition text-left"
          onClick={() => toggleSection(key)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
          <span className="font-medium text-sm">{label}</span>
          {statusBadge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
              {statusBadge}
            </span>
          )}
          <span className="ml-auto text-[11px] text-gray-500">{attachments.length} file{attachments.length !== 1 ? "s" : ""}</span>
        </button>

        {/* Accordion body */}
        {isExpanded && (
          <div className="px-4 pb-3">
            {attachments.length === 0 ? (
              <p className="text-gray-400 text-xs mb-2">No files yet</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map(renderFileCard)}
              </div>
            )}
            {/* Upload zone only for slip sections (not case files) */}
            {slip && renderUploadZone(slip)}
          </div>
        )}
      </div>
    )
  }
```

- [ ] **Step 7: Wire up the full JSX return**

Replace the entire `return` block:

```tsx
  const totalCount = data?.summary?.total_count ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">3D</span>
            </div>
            <div>
              <span className="font-semibold text-sm">Case Attachments</span>
              <span className="ml-2 text-gray-500 text-sm font-normal">{caseNumber}</span>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100 transition"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Sub-header: meta */}
        <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4 flex-shrink-0 text-sm">
          {doctorName && <span className="font-semibold">Dr: {doctorName}</span>}
          {patientName && <span className="text-gray-700">Patient: {patientName}</span>}
          {data && <span className="text-gray-500 text-xs ml-auto">{totalCount} total file{totalCount !== 1 ? "s" : ""}</span>}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-40 gap-2">
              <svg className="animate-spin w-5 h-5 text-[#1162A8]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm text-gray-500">Loading attachments…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center h-40">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Case-level files section */}
              {(data.case_attachments?.length ?? 0) > 0 &&
                renderSection("case", "Case Files", null, data.case_attachments ?? [])}

              {/* Per-slip sections */}
              {data.slips.length === 0 && (data.case_attachments?.length ?? 0) === 0 && (
                <div className="flex items-center justify-center h-40">
                  <p className="text-gray-400 text-sm">No attachments found for this case.</p>
                </div>
              )}
              {data.slips.map((slip) =>
                renderSection(
                  slip.id.toString(),
                  `Slip #${slip.slip_number}`,
                  slip.status,
                  slip.attachments,
                  slip
                )
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
```

- [ ] **Step 8: Verify the component compiles**

```bash
cd "Rxn3D-Frontend" && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "case-attachment-modal"
```

Expected: no errors for `case-attachment-modal.tsx`

- [ ] **Step 9: Commit**

```bash
git add "Rxn3D-Frontend/components/case-attachment-modal.tsx"
git commit -m "feat: add CaseAttachmentModal component with per-slip accordions"
```

---

### Task 2: Wire `CaseAttachmentModal` into lab case management page

**Files:**
- Modify: `app/lab-case-management/page.tsx`

**Interfaces:**
- Consumes: `CaseAttachmentModal` default export from `@/components/case-attachment-modal`
- Consumes existing: `showAttachModal`, `setShowAttachModal` state (already present at line 174)
- Replaces: `selectedSlipForAttachment` / `setSelectedSlipForAttachment` (line 175)

- [ ] **Step 1: Add import for `CaseAttachmentModal`**

In `app/lab-case-management/page.tsx`, find the existing import:

```tsx
import FileAttachmentModalContent from "@/components/file-attachment-modal-content"
```

Add below it:

```tsx
import CaseAttachmentModal from "@/components/case-attachment-modal"
```

- [ ] **Step 2: Replace `selectedSlipForAttachment` state with `selectedCaseForAttachment`**

Find (line ~175):
```tsx
const [selectedSlipForAttachment, setSelectedSlipForAttachment] = useState<any>(null)
```

Replace with:
```tsx
const [selectedCaseForAttachment, setSelectedCaseForAttachment] = useState<{
  caseId: number
  caseNumber: string
  patient: string
  doctor: string
} | null>(null)
```

- [ ] **Step 3: Update `handleAttachmentClick`**

Find (line ~328):
```tsx
const handleAttachmentClick = (slip: any) => {
  setSelectedSlipForAttachment(slip)
  setShowAttachModal(true)
}
```

Replace with:
```tsx
const handleAttachmentClick = (slip: any) => {
  setSelectedCaseForAttachment({
    caseId: slip.caseId,
    caseNumber: slip.case_number ?? "",
    patient: slip.patient ?? "",
    doctor: slip.doctor ?? "",
  })
  setShowAttachModal(true)
}
```

- [ ] **Step 4: Remove stale handlers that referenced `selectedSlipForAttachment`**

Find and remove `handleAttachmentsUploaded` (lines ~333–350) and `handleAttachmentStateChange` (lines ~352–355) — the new modal manages its own refetch internally. If `updateSlipAttachmentState` is used elsewhere in the file, keep that call; just remove the two handler functions and their usage in the portal render.

Verify `updateSlipAttachmentState` is not solely called from those two handlers by checking:
```bash
grep -n "updateSlipAttachmentState" "app/lab-case-management/page.tsx"
```
If it appears only in those two handlers, remove it too. If it appears elsewhere, keep the function body.

- [ ] **Step 5: Swap the modal render**

Find the portal block (lines ~2026–2046):
```tsx
{showAttachModal && selectedSlipForAttachment && typeof document !== "undefined" && createPortal(
  <div ...>
    <FileAttachmentModalContent
      setShowAttachModal={setShowAttachModal}
      isCaseSubmitted={...}
      slipId={selectedSlipForAttachment.id}
      doctorName={selectedSlipForAttachment.doctor}
      patientName={selectedSlipForAttachment.patient}
      onAttachmentsUploaded={handleAttachmentsUploaded}
      onAttachmentStateChange={handleAttachmentStateChange}
      open={showAttachModal}
    />
  </div>,
  document.body
)}
```

Replace entirely with:
```tsx
{showAttachModal && selectedCaseForAttachment && (
  <CaseAttachmentModal
    open={showAttachModal}
    onClose={() => {
      setShowAttachModal(false)
      setSelectedCaseForAttachment(null)
    }}
    caseId={selectedCaseForAttachment.caseId}
    caseNumber={selectedCaseForAttachment.caseNumber}
    patientName={selectedCaseForAttachment.patient}
    doctorName={selectedCaseForAttachment.doctor}
  />
)}
```

- [ ] **Step 6: Verify no remaining references to removed state/handlers**

```bash
grep -n "selectedSlipForAttachment\|handleAttachmentsUploaded\|handleAttachmentStateChange" "app/lab-case-management/page.tsx"
```

Expected: no output.

- [ ] **Step 7: TypeScript check**

```bash
cd "Rxn3D-Frontend" && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "lab-case-management"
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "Rxn3D-Frontend/app/lab-case-management/page.tsx"
git commit -m "feat: wire CaseAttachmentModal into lab case management, replace single-slip flow"
```

---

## Self-Review Checklist

- [x] Spec coverage: fetch on open ✓, case files section ✓, per-slip accordion ✓, upload per slip ✓, delete ✓, archive ✓, loading state ✓, empty state ✓, icon visibility unchanged ✓
- [x] No placeholders or TBDs
- [x] Type consistency: `SlipAttachmentRecord` used throughout, `CaseAttachmentSlip` in upload zone, all service method names match `slip-attachments-service.ts` exactly (`getCaseAttachments`, `uploadSlipAttachment`, `deleteAttachment`, `toggleArchiveAttachment`)
- [x] `FileAttachmentModalContent` not touched
