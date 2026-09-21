"use client"

import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import {
  X,
  Upload,
  Download,
  Archive,
  FileText,
  Box,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Eye,
  Paperclip,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { SlipAttachmentsService, validateSlipAttachmentFile } from "@/services/slip-attachments-service"
import type { CaseAttachmentsData, SlipAttachmentRecord } from "@/services/slip-attachments-service"
import { toProxiedFileUrl } from "@/lib/file-proxy"
import { usePlanCapabilities } from "@/hooks/use-plan-capabilities"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import FileAttachmentModalContent from "./file-attachment-modal-content"

const STLCanvasOnly = dynamic(() => import("@/components/stl-canvas-only"), { ssr: false })

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isImageFile(name: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(name)
}
function isStlFile(name: string) {
  return /\.(stl)$/i.test(name)
}
function is3dFile(name: string) {
  return /\.(obj|3dobject|ply|glb|gltf)$/i.test(name)
}
function isPdfFile(name: string) {
  return /\.pdf$/i.test(name)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StagedFile {
  file: File
  url: string
  id: string
}

// Slip group for the right panel browser
interface SlipGroup {
  slipId: number
  slipNumber: string
  /** Stage name(s) for the slip header — joined with " / " when upper + lower differ */
  stageName: string
  attachments: SlipAttachmentRecord[]
}

/** Build slip folder label from product stage names (upper / lower). */
function formatSlipStageLabel(
  products?: Array<{ stage_name?: string | null }> | null
): string {
  const stages = (products ?? [])
    .map((p) => (p.stage_name ?? "").trim())
    .filter(Boolean)
  const unique: string[] = []
  for (const name of stages) {
    if (!unique.includes(name)) unique.push(name)
  }
  return unique.length > 0 ? unique.join(" / ") : "Slip"
}

// ─── FileCard ─────────────────────────────────────────────────────────────────

// Each live STL thumbnail holds its own WebGL context and browsers drop the oldest
// once ~16 are open, so auto-loading is capped — cards beyond the cap stay on the
// click-to-preview fallback.
const MAX_LIVE_STL_PREVIEWS = 8
let liveStlPreviewCount = 0

function FileCard({
  record,
  selected,
  onSelect,
  onDownload,
  onDelete,
  canDelete = true,
  deleting = false,
}: {
  record: SlipAttachmentRecord
  selected: boolean
  onSelect: (r: SlipAttachmentRecord) => void
  onDownload: (r: SlipAttachmentRecord) => void
  onDelete?: (r: SlipAttachmentRecord) => void
  canDelete?: boolean
  deleting?: boolean
}) {
  const { can3dViewer } = usePlanCapabilities()
  const isImage = record.is_image || isImageFile(record.file_name)
  const isStl = (record.is_stl || isStlFile(record.file_name)) && can3dViewer
  const is3d = is3dFile(record.file_name)
  const isPdf = record.is_pdf || isPdfFile(record.file_name)

  // STL thumbnails render a real, orbitable 3D canvas. They auto-load once the card
  // scrolls into view (up to MAX_LIVE_STL_PREVIEWS), so off-screen cards cost nothing.
  const [livePreview, setLivePreview] = useState(false)
  const previewHostRef = useRef<HTMLDivElement>(null)
  const countedRef = useRef(false)

  // `force` = explicit user click, which always wins over the auto-load cap
  const activateLivePreview = useCallback((force = false) => {
    if (countedRef.current) return true
    if (!force && liveStlPreviewCount >= MAX_LIVE_STL_PREVIEWS) return false
    liveStlPreviewCount += 1
    countedRef.current = true
    setLivePreview(true)
    return true
  }, [])

  // Release this card's slot when it unmounts (dialog close, filter change)
  useEffect(() => () => {
    if (countedRef.current) liveStlPreviewCount -= 1
  }, [])

  useEffect(() => {
    if (!isStl || livePreview) return
    const el = previewHostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        if (activateLivePreview()) io.disconnect()
      },
      { rootMargin: "150px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [isStl, livePreview, activateLivePreview])

  const uploadedAt = record.created_at
    ? new Date(record.created_at).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }) +
      " @ " +
      new Date(record.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""

  return (
    <div
      className={cn(
        "relative group flex-shrink-0 rounded-lg border cursor-pointer transition-all",
        "w-[calc(50%-0.375rem)] max-w-[170px] sm:w-[148px] sm:max-w-none",
        selected
          ? "ring-2 ring-[#1162A8] border-[#1162A8] bg-blue-50"
          : "border-gray-200 hover:border-gray-400"
      )}
      onClick={() => onSelect(record)}
    >
      {/* ID badge */}
      <div className="absolute top-1.5 left-1.5 z-10 bg-white/80 rounded px-1 py-0.5 text-[8px] text-gray-500 font-mono">
        ID: {record.id}
      </div>

      {/* Preview area */}
      <div ref={previewHostRef} className="relative h-[88px] bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={toProxiedFileUrl(record.file_path)}
            alt={record.file_name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : isStl ? (
          livePreview ? (
            <div className="absolute inset-0" onClick={(e) => e.stopPropagation()}>
              <STLCanvasOnly src={toProxiedFileUrl(record.file_path)} />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-1 w-full h-full group/preview"
              title="Click to preview 3D model"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(record)
                activateLivePreview(true)
              }}
            >
              <Box className="w-8 h-8 text-yellow-500 group-hover/preview:text-[#1162A8] transition-colors" />
              <span className="text-[7px] text-gray-400">click to preview</span>
            </div>
          )
        ) : is3d ? (
          <Box className="w-8 h-8 text-yellow-500" />
        ) : isPdf ? (
          <FileText className="w-8 h-8 text-red-400" />
        ) : (
          <FileText className="w-8 h-8 text-gray-400" />
        )}

        {/* Eye indicator when selected */}
        {selected && (
          <div className="absolute inset-0 bg-[#1162A8]/10 pointer-events-none">
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#1162A8] flex items-center justify-center">
              <Eye className="w-3 h-3 text-white" />
            </div>
          </div>
        )}

        {/* Actions on hover */}
        <div
          className={`absolute bottom-1 right-1 flex gap-1 transition-opacity ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            className="w-6 h-6 rounded bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-[#1162A8]"
            title="Download"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(record)
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-1.5 py-1.5 space-y-0.5">
        <div className="truncate text-[9px] font-medium text-gray-800">{record.file_name}</div>
        {record.uploaded_by?.name && (
          <div className="truncate text-[8px] text-gray-500">
            Uploaded by {record.uploaded_by.name}
          </div>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[8px] text-gray-400 truncate">{uploadedAt}</span>
          {canDelete && onDelete && (
            <button
              type="button"
              className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              title="Delete attachment"
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(record)
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Layout option definitions ────────────────────────────────────────────────

interface LayoutCell { colSpan: number; rowSpan: number }
interface LayoutOption {
  id: string
  cols: string
  rows: number
  cells: LayoutCell[]
  icon: ReactNode
}

function LayoutIcon1x1() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="18" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIcon2Col() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="8" height="12" rx="1" fill="currentColor" />
      <rect x="11" y="1" width="8" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIcon3Col() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="4.5" height="12" rx="1" fill="currentColor" />
      <rect x="7.75" y="1" width="4.5" height="12" rx="1" fill="currentColor" />
      <rect x="14.5" y="1" width="4.5" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIcon2Row() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="18" height="5.5" rx="1" fill="currentColor" />
      <rect x="1" y="7.5" width="18" height="5.5" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIcon2x2() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="8" height="5.5" rx="1" fill="currentColor" />
      <rect x="11" y="1" width="8" height="5.5" rx="1" fill="currentColor" />
      <rect x="1" y="7.5" width="8" height="5.5" rx="1" fill="currentColor" />
      <rect x="11" y="7.5" width="8" height="5.5" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIcon3Row() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="18" height="3.3" rx="1" fill="currentColor" />
      <rect x="1" y="5.35" width="18" height="3.3" rx="1" fill="currentColor" />
      <rect x="1" y="9.7" width="18" height="3.3" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIconBigLeft() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="11" height="12" rx="1" fill="currentColor" />
      <rect x="14" y="1" width="5" height="5.5" rx="1" fill="currentColor" />
      <rect x="14" y="7.5" width="5" height="5.5" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIconBigTop() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="18" height="7.5" rx="1" fill="currentColor" />
      <rect x="1" y="9.5" width="8" height="3.5" rx="1" fill="currentColor" />
      <rect x="11" y="9.5" width="8" height="3.5" rx="1" fill="currentColor" />
    </svg>
  )
}
function LayoutIconBigCenter() {
  return (
    <svg viewBox="0 0 20 14" className="w-full h-full">
      <rect x="1" y="1" width="5" height="12" rx="1" fill="currentColor" />
      <rect x="8" y="1" width="5" height="12" rx="1" fill="currentColor" />
      <rect x="15" y="1" width="5" height="5.5" rx="1" fill="currentColor" />
      <rect x="15" y="7.5" width="5" height="5.5" rx="1" fill="currentColor" />
    </svg>
  )
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: "1x1", cols: "grid-cols-1", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }], icon: <LayoutIcon1x1 /> },
  { id: "2col", cols: "grid-cols-2", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIcon2Col /> },
  { id: "3col", cols: "grid-cols-3", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIcon3Col /> },
  { id: "2row", cols: "grid-cols-1", rows: 2, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIcon2Row /> },
  { id: "2x2", cols: "grid-cols-2", rows: 2, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIcon2x2 /> },
  { id: "3row", cols: "grid-cols-1", rows: 3, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIcon3Row /> },
  { id: "big-left", cols: "grid-cols-[2fr_1fr]", rows: 2, cells: [{ colSpan: 1, rowSpan: 2 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIconBigLeft /> },
  { id: "big-top", cols: "grid-cols-2", rows: 2, cells: [{ colSpan: 2, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIconBigTop /> },
  { id: "big-center", cols: "grid-cols-3", rows: 2, cells: [{ colSpan: 1, rowSpan: 2 }, { colSpan: 1, rowSpan: 2 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }], icon: <LayoutIconBigCenter /> },
]

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  items,
  onClear,
  onFullscreen,
}: {
  items: SlipAttachmentRecord[]
  onClear: () => void
  onFullscreen: () => void
}) {
  const [isWireframe, setIsWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState("1x1")

  // Auto-pick a layout that fits the number of selected items
  useEffect(() => {
    const count = items.length
    if (count <= 1) setSelectedLayout("1x1")
    else if (count === 2) setSelectedLayout("2col")
    else if (count === 3) setSelectedLayout("3col")
    else setSelectedLayout("2x2")
  }, [items.length])

  const activeLayout = LAYOUT_OPTIONS.find((l) => l.id === selectedLayout) ?? LAYOUT_OPTIONS[0]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-gray-200 bg-white sm:border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-[#1162A8] rounded flex items-center justify-center">
            <span className="text-white text-[7px] font-bold leading-none">3D</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">MyStudio</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition"
            title="Fullscreen"
            onClick={onFullscreen}
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1.5 5.5V2.5H4.5M11.5 2.5H14.5V5.5M14.5 10.5V13.5H11.5M4.5 13.5H1.5V10.5" />
            </svg>
          </button>
          <button
            type="button"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition"
            title="Close preview"
            onClick={onClear}
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Controls + viewer — stacked on phone, side-by-side on desktop */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {/* Controls */}
        <div className="flex w-full shrink-0 flex-row gap-3 overflow-x-auto border-b border-gray-100 px-2.5 py-2 sm:w-[120px] sm:flex-col sm:gap-0 sm:overflow-y-auto sm:border-b-0 sm:border-r sm:px-0 sm:py-0">
          {/* Display section */}
          <div className="flex shrink-0 flex-col gap-1.5 sm:px-2.5 sm:pb-2 sm:pt-3">
            <div className="mb-0 hidden text-[10px] font-semibold uppercase tracking-wide text-gray-600 sm:mb-2 sm:block">
              Display
            </div>
            <div className="flex flex-row gap-1.5 sm:flex-col">
              <button
                type="button"
                className="h-7 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2 text-left text-[10px] font-medium text-gray-700 transition hover:bg-gray-50 sm:w-full"
                onClick={onClear}
              >
                Clear Selection
              </button>
              <button
                type="button"
                className={`h-7 whitespace-nowrap rounded-md border px-2 text-left text-[10px] font-medium transition sm:w-full ${
                  isWireframe
                    ? "border-[#1162A8] bg-blue-50 text-[#1162A8]"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setIsWireframe((v) => !v)}
              >
                Wireframe
              </button>
              <button
                type="button"
                className={`h-7 whitespace-nowrap rounded-md border px-2 text-left text-[10px] font-medium transition sm:w-full ${
                  showGrid
                    ? "border-[#1162A8] bg-blue-50 text-[#1162A8]"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setShowGrid((v) => !v)}
              >
                Grid
              </button>
            </div>
          </div>

          <div className="mx-0 hidden border-t border-gray-100 sm:mx-2.5 sm:block" />

          {/* Layout section */}
          <div className="flex shrink-0 flex-col sm:px-2.5 sm:pb-3 sm:pt-2.5">
            <div className="mb-1 hidden text-[10px] font-semibold uppercase tracking-wide text-gray-600 sm:mb-2 sm:block">
              Layout
            </div>
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-3">
              {LAYOUT_OPTIONS.map((opt) => {
                const active = selectedLayout === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.id}
                    className={`flex aspect-[10/7] items-center justify-center rounded border p-[3px] transition ${
                      active
                        ? "border-[#82298D] bg-purple-50 text-[#82298D]"
                        : "border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600"
                    }`}
                    onClick={() => setSelectedLayout(opt.id)}
                  >
                    {opt.icon}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3D / Image viewer area */}
        <div className="relative min-h-[220px] min-w-0 flex-1 overflow-hidden bg-[#e9ecef] sm:min-h-0">
          {items.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
              Select a file to preview
            </div>
          ) : (
            <div
              className={`absolute inset-0 grid ${activeLayout.cols} gap-[2px] bg-gray-300`}
              style={{ gridTemplateRows: `repeat(${activeLayout.rows}, 1fr)` }}
            >
              {activeLayout.cells.map((cell, idx) => {
                const item = items[idx]
                if (!item) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="bg-[#e9ecef]"
                      style={{ gridColumn: `span ${cell.colSpan}`, gridRow: `span ${cell.rowSpan}` }}
                    />
                  )
                }
                const isImg = item.is_image || isImageFile(item.file_name)
                const isStl = item.is_stl || isStlFile(item.file_name)
                return (
                  <div
                    key={`${selectedLayout}-${idx}`}
                    className="bg-[#e9ecef] overflow-hidden relative"
                    style={{ gridColumn: `span ${cell.colSpan}`, gridRow: `span ${cell.rowSpan}` }}
                  >
                    {isStl ? (
                      <div className="absolute inset-0">
                        <STLCanvasOnly
                          src={toProxiedFileUrl(item.file_path)}
                          isWireframe={isWireframe}
                          showGrid={showGrid}
                        />
                      </div>
                    ) : isImg ? (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toProxiedFileUrl(item.file_path)}
                          alt={item.file_name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <FileText className="w-10 h-10 text-gray-400" />
                        <span className="text-xs text-gray-500 text-center px-2">{item.file_name}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface SlipAttachmentBrowserDialogProps {
  open: boolean
  onClose: () => void
  caseId?: number
  slipId?: number
  caseNumber?: string
  doctorName?: string
  patientName?: string
  isCaseSubmitted?: boolean
  onAttached?: () => void
}

export default function SlipAttachmentBrowserDialog({
  open,
  onClose,
  caseId,
  slipId,
  caseNumber,
  doctorName,
  patientName,
  isCaseSubmitted = false,
  onAttached,
}: SlipAttachmentBrowserDialogProps) {
  // ── Fetched data ────────────────────────────────────────────────────────────
  const [caseData, setCaseData] = useState<CaseAttachmentsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Upload state ────────────────────────────────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [label, setLabel] = useState("")
  const [makeAvailable, setMakeAvailable] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Browser / filter state ──────────────────────────────────────────────────
  const [stageFilter, setStageFilter] = useState("all")
  const [visibilityFilter, setVisibilityFilter] = useState("all")
  const [hideArchived, setHideArchived] = useState(true)
  const [selectMultiple, setSelectMultiple] = useState(false)
  const [expandedSlips, setExpandedSlips] = useState<Set<number>>(new Set())

  // ── Preview state ───────────────────────────────────────────────────────────
  const [selectedForPreview, setSelectedForPreview] = useState<SlipAttachmentRecord[]>([])
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null)
  const showPreview = selectedForPreview.length > 0

  // ── Fullscreen (My Studio) ──────────────────────────────────────────────────
  const [showFullscreen, setShowFullscreen] = useState(false)
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState<"upload" | "browse">("browse")

  useEffect(() => {
    if (!open) setMobileTab("browse")
  }, [open])

  // Selection handed to the fullscreen viewer so it opens on the same files
  const fullscreenViewerItems = useMemo(
    () =>
      selectedForPreview.map((r) => ({
        // Same precedence the fullscreen viewer uses to build its own file list,
        // so these items line up with its thumbnail strip
        url: r.download_url || r.file_path,
        type: (r.is_image || isImageFile(r.file_name) ? "image" : "stl") as "stl" | "image",
      })),
    [selectedForPreview]
  )

  // ── Fetch on open ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    setError(null)
    try {
      const res = await SlipAttachmentsService.getCaseAttachments(caseId)
      if (!res.success) throw new Error(res.message)
      setCaseData(res.data)
      // Auto-expand slips that have attachments
      const withFiles = res.data.slips.filter((s) => s.attachments.length > 0).map((s) => s.id)
      setExpandedSlips(new Set(withFiles))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments")
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (open) {
      void fetchData()
      // Pre-populate staged files from window cache (impression STL files land here)
      if (typeof window !== "undefined") {
        const cached = ((window as any).__caseDesignAttachments ?? []) as any[]
        const localFiles = cached.filter((item: any) => item.file instanceof File && !item.remoteId)
        setStagedFiles(
          localFiles.map((item: any) => ({
            file: item.file as File,
            url: item.url || URL.createObjectURL(item.file as File),
            id: `cache-${item._impressionKey ?? Date.now()}-${Math.random()}`,
          }))
        )
      } else {
        setStagedFiles([])
      }
      setLabel("")
      setUploadError(null)
      setSelectedForPreview([])
    }
  }, [open, fetchData])

  // ── Derived data ────────────────────────────────────────────────────────────
  const slipGroups = useMemo<SlipGroup[]>(() => {
    if (!caseData) return []
    return caseData.slips
      .map((slip) => ({
        slipId: slip.id,
        slipNumber: slip.slip_number ?? String(slip.id),
        stageName: formatSlipStageLabel(slip.products),
        attachments: slip.attachments.filter((a) =>
          hideArchived ? !a.is_archived : true
        ),
      }))
      // Hide slips that currently have no visible attachments
      .filter((group) => group.attachments.length > 0)
  }, [caseData, hideArchived])

  const totalSizeMB = useMemo(() => {
    if (!caseData) return "0.00"
    const total = (caseData.all_attachments ?? []).reduce((acc, a) => acc + (a.file_size ?? 0), 0)
    return (total / 1024 / 1024).toFixed(2)
  }, [caseData])

  const availableStages = useMemo(() => {
    if (!caseData) return []
    const stages = new Set<string>()
    caseData.slips.forEach((s) => s.products?.forEach((p) => p.stage_name && stages.add(p.stage_name)))
    return [...stages]
  }, [caseData])

  const displayedDocName = caseData?.doctor?.name ?? doctorName
  const displayedPatientName = caseData?.patient_name ?? patientName

  // ── Upload handlers ─────────────────────────────────────────────────────────
  const addFiles = useCallback((files: File[]) => {
    setUploadError(null)
    const valid: StagedFile[] = []
    for (const file of files) {
      const err = validateSlipAttachmentFile(file)
      if (err) {
        setUploadError(err)
        continue
      }
      valid.push({ file, url: URL.createObjectURL(file), id: `${Date.now()}-${Math.random()}` })
    }
    setStagedFiles((prev) => [...prev, ...valid])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files))
      e.target.value = ""
    },
    [addFiles]
  )

  const handleAttachFiles = useCallback(async () => {
    if (stagedFiles.length === 0) return
    if (!slipId) {
      // No slip yet — add any newly staged files to window cache for upload on submit.
      // Only append — never remove existing cached files (impression STLs live there).
      if (typeof window !== "undefined") {
        const existing = ((window as any).__caseDesignAttachments ?? []) as any[]
        const existingNames = new Set(
          existing.filter((i: any) => i.file instanceof File).map((i: any) => (i.file as File).name)
        )
        const newFiles = stagedFiles
          .filter((f) => !existingNames.has(f.file.name))
          .map((f) => ({ file: f.file, url: f.url, type: "stl" as const, archived: false }))
        if (newFiles.length > 0) {
          ;(window as any).__caseDesignAttachments = [...existing, ...newFiles]
        }
      }
      onAttached?.()
      onClose()
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      for (const staged of stagedFiles) {
        await SlipAttachmentsService.uploadSlipAttachment(slipId, staged.file, {
          notes: label || undefined,
        })
      }
      onAttached?.()
      await fetchData()
      setStagedFiles([])
      setLabel("")
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [stagedFiles, slipId, label, fetchData, onAttached, onClose])

  // ── File selection for preview ──────────────────────────────────────────────
  const handleSelectForPreview = useCallback(
    (record: SlipAttachmentRecord) => {
      if (selectMultiple) {
        setSelectedForPreview((prev) => {
          const exists = prev.some((r) => r.id === record.id)
          return exists ? prev.filter((r) => r.id !== record.id) : [...prev, record]
        })
      } else {
        setSelectedForPreview((prev) => {
          if (prev.length === 1 && prev[0].id === record.id) return []
          return [record]
        })
      }
    },
    [selectMultiple]
  )

  const handleDownload = useCallback((record: SlipAttachmentRecord) => {
    const a = document.createElement("a")
    a.href = toProxiedFileUrl(record.download_url || record.file_path)
    a.download = record.file_name
    a.click()
  }, [])

  const handleDelete = useCallback(
    async (record: SlipAttachmentRecord) => {
      if (isCaseSubmitted) return
      const confirmed = window.confirm(
        `Permanently delete "${record.file_name}"? This removes the file from storage and cannot be undone.`
      )
      if (!confirmed) return

      setDeletingAttachmentId(record.id)
      setUploadError(null)
      try {
        const res = await SlipAttachmentsService.deleteAttachment(record.id)
        if (!res.success) throw new Error(res.message || "Failed to delete attachment")
        setSelectedForPreview((prev) => prev.filter((r) => r.id !== record.id))
        await fetchData()
        onAttached?.()
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Failed to delete attachment")
      } finally {
        setDeletingAttachmentId(null)
      }
    },
    [fetchData, isCaseSubmitted, onAttached]
  )

  const toggleSlip = useCallback((slipId: number) => {
    setExpandedSlips((prev) => {
      const next = new Set(prev)
      if (next.has(slipId)) next.delete(slipId)
      else next.add(slipId)
      return next
    })
  }, [])

  if (!open) return null

  const showUploadPanel = !isMobile || (mobileTab === "upload" && !showPreview)
  const showBrowsePanel = !isMobile || (mobileTab === "browse" && !showPreview)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9990] bg-black/40" onClick={onClose} />

      {/* Dialog panel */}
      <div
        className="fixed inset-0 z-[9991] flex items-stretch justify-center p-0 sm:items-center sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "relative flex w-full flex-col overflow-hidden bg-white shadow-2xl",
            "h-[100dvh] max-h-[100dvh]",
            "sm:h-[min(90vh,720px)] sm:max-h-[min(90vh,720px)] sm:w-[min(96vw,1400px)] sm:rounded-xl",
            "md:flex-row",
          )}
        >
          {/* Mobile top tabs */}
          {isMobile && !showPreview ? (
            <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-t-md px-3 py-2.5 text-sm font-semibold transition",
                  mobileTab === "upload"
                    ? "border-b-2 border-[#1162A8] text-[#1162A8]"
                    : "text-gray-500",
                )}
                onClick={() => setMobileTab("upload")}
              >
                Upload
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-t-md px-3 py-2.5 text-sm font-semibold transition",
                  mobileTab === "browse"
                    ? "border-b-2 border-[#1162A8] text-[#1162A8]"
                    : "text-gray-500",
                )}
                onClick={() => setMobileTab("browse")}
              >
                Files
              </button>
              <button
                type="button"
                className="ml-1 rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : null}

          {/* ── Left panel: Upload ─────────────────────────────── */}
          <div
            className={cn(
              "flex min-h-0 flex-col border-gray-200 bg-white",
              showUploadPanel ? "flex" : "hidden",
              "w-full flex-1 md:w-[310px] md:flex-none md:border-r",
              !isMobile && "border-b md:border-b-0",
            )}
          >
            <div className="hidden items-center gap-2 px-5 pb-2 pt-5 md:flex">
              <Paperclip className="h-5 w-5 text-gray-700" />
              <span className="text-base font-semibold text-gray-900">Attachment</span>
            </div>
            <p className="px-4 pb-3 pt-3 text-xs leading-relaxed text-gray-500 md:px-5 md:pb-4 md:pt-0">
              Upload case files, scans, photos or documents related to this treatment.
            </p>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 md:px-5">
              <div
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 transition-colors md:py-8",
                  isDragging
                    ? "border-[#1162A8] bg-blue-50"
                    : "border-gray-300 hover:border-[#1162A8] hover:bg-blue-50/40",
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-xs text-gray-500">Drag &amp; drop files here</p>
                  <p className="text-xs text-gray-400">or tap to browse files.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx,.obj"
                  onChange={handleFileInputChange}
                />
              </div>

              {stagedFiles.length > 0 && (
                <div className="flex max-h-40 min-h-0 flex-col gap-1 overflow-y-auto md:max-h-none md:flex-1">
                  {stagedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-xs text-gray-700"
                    >
                      <FileText className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                      <span className="flex-shrink-0 text-gray-400">{formatBytes(f.file.size)}</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => {
                          URL.revokeObjectURL(f.url)
                          setStagedFiles((prev) => prev.filter((x) => x.id !== f.id))
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

              <div className="mt-auto">
                <textarea
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Label or describe this attachment"
                  className="h-[72px] w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:border-[#1162A8] focus:outline-none focus:ring-1 focus:ring-[#1162A8] md:h-[80px]"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2 pb-2">
                <Checkbox
                  checked={makeAvailable}
                  onCheckedChange={(v) => setMakeAvailable(Boolean(v))}
                  className="mt-0.5"
                />
                <span className="text-xs leading-relaxed text-gray-700">
                  Make files available to related cases
                </span>
              </label>
            </div>

            <div className="flex gap-2 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5 md:py-4">
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 text-xs md:h-9"
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-10 flex-1 bg-[#1162A8] text-xs text-white hover:bg-[#0d4a85] md:h-9"
                onClick={handleAttachFiles}
                disabled={stagedFiles.length === 0 || uploading}
              >
                {uploading ? "Uploading…" : "Attach Files"}
              </Button>
            </div>
          </div>

          {/* ── Right panel: Browser ───────────────────────────── */}
          <div
            className={cn(
              "relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              showBrowsePanel || (isMobile && showPreview) ? "flex" : "hidden",
              "md:flex md:flex-row",
            )}
          >
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-col overflow-hidden transition-all",
                showPreview && isMobile ? "hidden" : "flex-1",
                showPreview && !isMobile ? "md:w-[45%] md:flex-none" : "flex-1",
              )}
            >
              <div className="flex flex-shrink-0 items-center justify-between border-b bg-gray-50 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-4">
                  {displayedDocName && (
                    <span className="flex-shrink-0 text-xs font-medium text-gray-700">
                      Dr: <span className="font-semibold text-gray-900">{displayedDocName}</span>
                    </span>
                  )}
                  {displayedPatientName && (
                    <span className="flex-shrink-0 text-xs text-gray-700">
                      Patient:{" "}
                      <span className="font-semibold text-gray-900">{displayedPatientName}</span>
                    </span>
                  )}
                  {caseData && (
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      Total Size: {totalSizeMB} MB
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="ml-2 hidden flex-shrink-0 rounded p-1 hover:bg-gray-200 md:block"
                  onClick={onClose}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="h-8 w-[min(100%,7.5rem)] text-[11px] sm:h-7 sm:w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {availableStages.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                  <SelectTrigger className="h-8 w-[min(100%,7.5rem)] text-[11px] sm:h-7 sm:w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visibility</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  className="flex h-8 items-center rounded-md px-2.5 text-[11px] font-medium transition-opacity hover:opacity-80 sm:h-7"
                  style={
                    hideArchived
                      ? {
                          background:
                            "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)",
                          color: "#fff",
                          border: "1.5px solid transparent",
                        }
                      : {
                          background:
                            "linear-gradient(white,white) padding-box, linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%) border-box",
                          border: "1.5px solid transparent",
                          color: "#82298D",
                        }
                  }
                  onClick={() => setHideArchived((v) => !v)}
                >
                  <Archive className="mr-1 h-3 w-3" />
                  {hideArchived ? "Hide Archived" : "Show Archived"}
                </button>

                <button
                  type="button"
                  className="h-8 rounded-md px-2.5 text-[11px] font-medium transition-opacity hover:opacity-80 sm:h-7"
                  style={
                    selectMultiple
                      ? {
                          background:
                            "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)",
                          color: "#fff",
                          border: "1.5px solid transparent",
                        }
                      : {
                          background:
                            "linear-gradient(white,white) padding-box, linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%) border-box",
                          border: "1.5px solid transparent",
                          color: "#82298D",
                        }
                  }
                  onClick={() => {
                    setSelectMultiple((v) => !v)
                    if (selectMultiple) setSelectedForPreview([])
                  }}
                >
                  Select Multiple
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                    Loading attachments…
                  </div>
                ) : error ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <p className="text-sm text-red-500">{error}</p>
                    <Button size="sm" variant="outline" onClick={fetchData}>
                      Retry
                    </Button>
                  </div>
                ) : !caseId ? (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                    No case associated yet
                  </div>
                ) : slipGroups.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                    No attachments found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {slipGroups.map((group) => {
                      const isExpanded = expandedSlips.has(group.slipId)
                      return (
                        <div key={group.slipId}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-3 transition hover:bg-gray-50 sm:px-4"
                            onClick={() => toggleSlip(group.slipId)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            )}
                            <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-500" />
                            <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                              {group.stageName}
                            </span>
                            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              {group.attachments.length} file
                              {group.attachments.length !== 1 ? "s" : ""}
                            </span>
                            <span className="ml-auto flex-shrink-0 text-xs text-gray-400">
                              Slip # {group.slipNumber}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-4 sm:px-4">
                              <div className="flex flex-wrap gap-3">
                                {group.attachments.map((record) => (
                                  <FileCard
                                    key={record.id}
                                    record={record}
                                    selected={selectedForPreview.some((r) => r.id === record.id)}
                                    onSelect={handleSelectForPreview}
                                    onDownload={handleDownload}
                                    onDelete={handleDelete}
                                    canDelete={!isCaseSubmitted}
                                    deleting={deletingAttachmentId === record.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {showPreview && (
              <div
                className={cn(
                  "flex min-h-0 min-w-0 flex-col bg-white",
                  isMobile ? "absolute inset-0 z-20" : "md:w-[55%] md:flex-none",
                )}
              >
                {isMobile ? (
                  <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1.5 text-sm font-medium text-[#1162A8] hover:bg-blue-50"
                      onClick={() => setSelectedForPreview([])}
                    >
                      ← Back
                    </button>
                    <span className="truncate text-sm font-semibold text-gray-800">Preview</span>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1">
                  <PreviewPanel
                    items={selectedForPreview}
                    onClear={() => setSelectedForPreview([])}
                    onFullscreen={() => setShowFullscreen(true)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showFullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-white"
            style={{ width: "100vw", height: "100vh" }}
          >
            <FileAttachmentModalContent
              setShowAttachModal={setShowFullscreen}
              isCaseSubmitted={isCaseSubmitted}
              caseId={caseId}
              caseNumber={caseNumber}
              slipId={slipId}
              doctorName={displayedDocName}
              patientName={displayedPatientName}
              open={showFullscreen}
              initialViewerItems={fullscreenViewerItems}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
