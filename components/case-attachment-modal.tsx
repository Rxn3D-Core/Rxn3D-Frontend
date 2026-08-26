"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X,
  Upload,
  Download,
  Archive,
  FileText,
  Box,
  Calendar,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  SlipAttachmentsService,
  validateSlipAttachmentFile,
} from "@/services/slip-attachments-service"
import type {
  CaseAttachmentsData,
  CaseAttachmentSlip,
  SlipAttachmentRecord,
} from "@/services/slip-attachments-service"
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [uploadingSlipId, setUploadingSlipId] = useState<number | null>(null)
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({})
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await SlipAttachmentsService.getCaseAttachments(caseId)
      if (!res.success) throw new Error(res.message)
      setData(res.data)
      const firstWithFiles =
        res.data.slips.find((s) => s.attachments.length > 0)?.id?.toString() ?? null
      if (firstWithFiles) setExpandedSections(new Set([firstWithFiles]))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments")
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (open) void fetchData()
  }, [open, fetchData])

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
      await SlipAttachmentsService.uploadSlipAttachment(slipId, file)
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
      await SlipAttachmentsService.deleteAttachment(attachmentId)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    }
  }

  const handleToggleArchive = async (attachmentId: number) => {
    try {
      await SlipAttachmentsService.toggleArchiveAttachment(attachmentId)
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

  const renderFileCard = (attachment: SlipAttachmentRecord) => {
    const downloadUrl = attachment.download_url || attachment.file_path

    return (
      <div
        key={attachment.id}
        className={`bg-white rounded-lg border border-gray-200 flex flex-col w-[140px] flex-shrink-0 ${
          attachment.is_archived ? "opacity-60" : ""
        }`}
      >
        <div className="w-full bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden h-[80px] relative">
          {attachment.is_archived && (
            <div className="absolute top-1 left-1 z-10 bg-gray-600/80 text-white text-[7px] font-semibold px-1 py-0.5 rounded">
              Archived
            </div>
          )}
          {attachment.is_image ? (
            <img
              src={toProxiedFileUrl(downloadUrl)}
              alt={attachment.file_name}
              className="object-cover w-full h-full rounded-t-lg"
            />
          ) : attachment.is_stl ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <Box className="text-gray-300 w-7 h-7" />
              <span className="text-[7px] text-gray-400">STL</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <FileText className="text-gray-300 w-7 h-7" />
              <span className="text-[7px] text-gray-400 uppercase">
                {attachment.file_type || "file"}
              </span>
            </div>
          )}
          <div className="absolute bottom-1 right-1 flex gap-0.5">
            <button
              type="button"
              className="p-0.5 hover:bg-white/80 rounded bg-white/60"
              title={attachment.is_archived ? "Unarchive" : "Archive"}
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
        <div className="px-1.5 py-1">
          <div className="truncate font-medium text-[9px]">{attachment.file_name}</div>
          <div className="text-gray-500 text-[8px]">
            {attachment.file_size_formatted ||
              `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB`}
          </div>
          <div className="flex items-center gap-1 text-gray-400 mt-0.5 text-[7px]">
            <Calendar className="w-2 h-2" />
            <span>
              {new Date(attachment.created_at).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="ml-auto p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
              title="Delete attachment"
              onClick={() => void handleDelete(attachment.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderUploadZone = (slip: CaseAttachmentSlip) => (
    <div className="mt-2">
      <div
        className="rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 h-[60px]"
        onClick={() => fileInputRefs.current[slip.id]?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "copy"
        }}
        onDrop={(e) => {
          e.preventDefault()
          void handleUpload(slip.id, e.dataTransfer.files)
        }}
      >
        {uploadingSlipId === slip.id ? (
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin w-4 h-4 text-[#1162A8]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
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
        ref={(el) => {
          fileInputRefs.current[slip.id] = el
        }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx"
        onChange={(e) => void handleUpload(slip.id, e.target.files)}
      />
    </div>
  )

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
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium capitalize">
              {statusBadge}
            </span>
          )}
          <span className="ml-auto text-[11px] text-gray-500">
            {attachments.length} file{attachments.length !== 1 ? "s" : ""}
          </span>
        </button>

        {isExpanded && (
          <div className="px-4 pb-3">
            {attachments.length === 0 ? (
              <p className="text-gray-400 text-xs mb-2">No files yet</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map(renderFileCard)}
              </div>
            )}
            {slip && renderUploadZone(slip)}
          </div>
        )}
      </div>
    )
  }

  const totalCount = data?.slips.reduce((sum, s) => sum + s.attachments.length, 0) ?? 0

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

        {/* Sub-header */}
        <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4 flex-shrink-0 text-sm">
          {doctorName && <span className="font-semibold">Dr: {doctorName}</span>}
          {patientName && <span className="text-gray-700">Patient: {patientName}</span>}
          {data && (
            <span className="text-gray-500 text-xs ml-auto">
              {totalCount} total file{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-40 gap-2">
              <svg
                className="animate-spin w-5 h-5 text-[#1162A8]"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
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
              {data.slips.length === 0 && (
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
}
