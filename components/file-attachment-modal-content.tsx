"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Paperclip,
  X,
  Upload,
  ChevronDown,
  ChevronRight,
  Calendar,
  Download,
  FileText,
  FolderOpen,
  Archive,
  Box,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
} from "lucide-react"
import dynamic from "next/dynamic"
import SimpleSTLViewer from "./demo/simple-stl-generator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSlipCreation } from "../contexts/slip-creation-context"
import {
  mapSlipAttachmentToLocalItem,
  validateSlipAttachmentFile,
} from "@/services/slip-attachments-service"


type LocalUploadItem = {
  file: File | { name: string; size: number; lastModified: number }
  url: string
  type: "stl" | "image" | "3dobject" | "other"
  archived?: boolean
  remoteId?: number
  remoteMeta?: unknown
  stage?: string
  attachmentType?: string
  notes?: string
}
import { toProxiedFileUrl } from "@/lib/file-proxy"

// Lazy-load only the 3D Canvas (no controls UI) to keep the bundle small
const STLCanvasOnly = dynamic(() => import("@/components/stl-canvas-only"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
      Loading 3D Viewer...
    </div>
  ),
})

interface SavedProduct {
  id: string
  product: { id: number; name: string }
  maxillaryStage?: string
  mandibularStage?: string
  maxillaryTeeth: number[]
  mandibularTeeth: number[]
  [key: string]: any
}

interface FileAttachmentModalContentProps {
  setShowAttachModal: (show: boolean) => void
  isCaseSubmitted: boolean
  slipId?: number
  onAttachmentsUploaded?: (attachments: any[]) => void
  onAttachmentStateChange?: (hasAttachments: boolean) => void
  doctorName?: string
  patientName?: string
  savedProducts?: SavedProduct[]
  /** Dynamic stages from product API — overrides savedProducts-derived stages when provided */
  availableStages?: string[]
  /** Called when STL viewer opens/closes so parent dialog can resize */
  onViewerToggle?: (isOpen: boolean) => void
  /** Called whenever the attached file list changes with counts of photos and STL files */
  onFileCountsChange?: (photoCount: number, stlCount: number) => void
  /** Pre-populated STL files from the impression selection modal */
  impressionFiles?: { file: File; url: string; description?: string }[]
  /** Whether the modal is currently open — triggers a fresh attachment fetch each time it opens */
  open?: boolean
}

// Layout icon definitions for the STL viewer layout picker
const LAYOUT_OPTIONS = [
  // Row 1
  { id: "1x1", cols: "grid-cols-1", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }] },
  { id: "2x2", cols: "grid-cols-2", rows: 2, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  // Row 2
  { id: "1-1v", cols: "grid-cols-2", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  { id: "2-1h", cols: "grid-cols-3", rows: 1, cells: [{ colSpan: 2, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  // Row 3
  { id: "1h-2", cols: "grid-cols-3", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 2, rowSpan: 1 }] },
  { id: "1-2v", cols: "grid-cols-2", rows: 2, cells: [{ colSpan: 1, rowSpan: 2 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  // Row 4
  { id: "3s-1", cols: "grid-cols-4", rows: 1, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  { id: "1-3s", cols: "grid-cols-4", rows: 2, cells: [{ colSpan: 1, rowSpan: 2 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  // Row 5
  { id: "3x2", cols: "grid-cols-3", rows: 2, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
  { id: "2x3", cols: "grid-cols-3", rows: 2, cells: [{ colSpan: 1, rowSpan: 1 }, { colSpan: 2, rowSpan: 1 }, { colSpan: 2, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }] },
]


export default function FileAttachmentModalContent({
  setShowAttachModal,
  isCaseSubmitted,
  slipId,
  onAttachmentsUploaded,
  onAttachmentStateChange,
  doctorName: propDoctorName,
  patientName: propPatientName,
  savedProducts = [],
  availableStages: propAvailableStages,
  onViewerToggle,
  onFileCountsChange,
  impressionFiles = [],
  open,
}: FileAttachmentModalContentProps) {
  const {
    uploadSlipAttachment,
    fetchSlipAttachments,
    deleteSlipAttachment,
    toggleSlipAttachmentArchive,
  } = useSlipCreation()

  // Restore previously attached files from window cache (persists across Dialog open/close)
  const restoreCachedUploads = () => {
    if (typeof window === "undefined") return []
    const cached = (window as any).__caseDesignAttachments as any[] | undefined
    if (!cached || !Array.isArray(cached) || cached.length === 0) return []
    // Re-create blob URLs for File objects (old blob URLs are revoked on unmount)
    return cached.map((item: any) => {
      const hasFile = item.file instanceof File || item.file instanceof Blob
      const url = hasFile ? URL.createObjectURL(item.file) : item.url
      return { ...item, url }
    })
  }

  const [simulatedUploads, setSimulatedUploads] = useState<
    Array<{ file: any, url: string, type: "stl" | "image" | "3dobject" | "other", archived?: boolean, remoteId?: any, remoteMeta?: any, stage?: string, isPublic?: boolean, generatedPath?: string }>
  >(restoreCachedUploads)

  // Sync impression files into simulatedUploads whenever the prop changes
  useEffect(() => {
    if (!impressionFiles || impressionFiles.length === 0) return
    setSimulatedUploads((prev) => {
      const existingNames = new Set(prev.map((u: any) => u.file?.name))
      const toAdd = impressionFiles
        .filter((f) => !existingNames.has(f.file?.name))
        .map((f) => ({ file: f.file, url: f.url, type: "stl" as const, archived: false }))
      if (toAdd.length === 0) return prev
      return [...prev, ...toAdd]
    })
  }, [impressionFiles])

  const description = ""
  // Filters
  const [stageFilter, setStageFilter] = useState("all-stages")
  const [visibilityFilter, setVisibilityFilter] = useState("all-visibility")
  const [hideArchived, setHideArchived] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [viewing3dUrl, setViewing3dUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState("1x1")

  // Stages — use API-derived stages when available, then savedProducts, then fallback
  const stages = (() => {
    if (propAvailableStages && propAvailableStages.length > 0) {
      return propAvailableStages
    }
    const stageSet = new Set<string>()
    savedProducts.forEach((product) => {
      if (product.maxillaryStage && product.maxillaryTeeth.length > 0) {
        stageSet.add(product.maxillaryStage)
      }
      if (product.mandibularStage && product.mandibularTeeth.length > 0) {
        stageSet.add(product.mandibularStage)
      }
    })
    if (stageSet.size === 0) {
      return []
    }
    return Array.from(stageSet).sort()
  })()

  // Active stage defaults to first available stage
  const activeStage = stages[0] || null

  // STL viewer display state
  const [isWireframe, setIsWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [modelColor, setModelColor] = useState("#f5ecd0")

  // Viewer items: STL files and images assigned to layout cells
  const [viewerStlUrls, setViewerStlUrls] = useState<string[]>([])
  const [viewerItems, setViewerItems] = useState<{ url: string; type: "stl" | "image" }[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Doctor / patient names — read from localStorage on every mount/render cycle
  const readDoctorFromStorage = (): string => {
    if (typeof window === "undefined") return ""
    try {
      // Try caseDesignCache first
      const cacheStr = localStorage.getItem("caseDesignCache")
      if (cacheStr) {
        const cache = JSON.parse(cacheStr)
        const formData = cache?.slipData?.formData
        if (formData?.doctor) return formData.doctor
      }
      // Fallback: selectedDoctor from localStorage
      const doctorStr = localStorage.getItem("selectedDoctor")
      if (doctorStr) {
        const doc = JSON.parse(doctorStr)
        const name = [doc.first_name, doc.last_name].filter(Boolean).join(" ")
        if (name) return name
      }
    } catch {}
    return ""
  }

  const readPatientFromStorage = (): string => {
    if (typeof window === "undefined") return ""
    try {
      // Try caseDesignCache first
      const cacheStr = localStorage.getItem("caseDesignCache")
      if (cacheStr) {
        const cache = JSON.parse(cacheStr)
        const formData = cache?.slipData?.formData
        const name = formData?.patient || formData?.patient_name
        if (name) return name
      }
      // Fallback: patientData from localStorage
      const patientStr = localStorage.getItem("patientData")
      if (patientStr) {
        const patient = JSON.parse(patientStr)
        if (patient?.name) return patient.name
      }
    } catch {}
    return ""
  }

  const [doctorName, setDoctorName] = useState<string>(propDoctorName || readDoctorFromStorage)
  const [patientName, setPatientName] = useState<string>(propPatientName || readPatientFromStorage)

  // Re-read from localStorage when props change or on mount — covers Dialog re-open
  useEffect(() => {
    setDoctorName(propDoctorName || readDoctorFromStorage())
    setPatientName(propPatientName || readPatientFromStorage())
  }, [propDoctorName, propPatientName])

  // Keep window cache in sync so files persist across modal open/close
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__caseDesignAttachments = simulatedUploads
    }
    if (onFileCountsChange) {
      const photoCount = simulatedUploads.filter((u) => u.type === "image").length
      const stlCount = simulatedUploads.filter((u) => u.type === "stl" || u.type === "3dobject").length
      onFileCountsChange(photoCount, stlCount)
    }
  }, [simulatedUploads, onFileCountsChange])

  const [selectedImageThumbnailUrls, setSelectedImageThumbnailUrls] = useState<string[]>([])

  const addLocalFiles = (files: FileList | File[]) => {
    const targetStage = activeStage || stages[0]
    const rejected: string[] = []
    const newUploads: LocalUploadItem[] = []

    Array.from(files).forEach((file) => {
      const validationError = validateSlipAttachmentFile(file)
      if (validationError) {
        rejected.push(`${file.name}: ${validationError}`)
        return
      }
      const url = URL.createObjectURL(file)
      let type: "stl" | "image" | "3dobject" | "other" = "other"
      if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
      else if (file.name.toLowerCase().endsWith(".3dobject")) type = "3dobject"
      else if (file.type.startsWith("image/")) type = "image"
      newUploads.push({
        file,
        url,
        type,
        stage: targetStage,
        notes: description,
      })
    })

    if (rejected.length > 0) {
      setUploadError(rejected.join(" "))
    } else {
      setUploadError(null)
    }
    if (newUploads.length > 0) {
      setSimulatedUploads((prev) => [...prev, ...newUploads])
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const targetStage = activeStage || stages[0]
      const newUploads = Array.from(files).map(file => {
        const url = URL.createObjectURL(file)
        let type: "stl" | "image" | "3dobject" | "other" = "other"
        if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
        else if (file.name.toLowerCase().endsWith(".3dobject")) type = "3dobject"
        else if (file.type.startsWith("image/")) type = "image"
        return { file, url, type, stage: targetStage }
      })
      setSimulatedUploads(prev => [...prev, ...newUploads])
    }
  }

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      const targetStage = activeStage || stages[0]
      const newUploads = Array.from(files).map(file => {
        const url = URL.createObjectURL(file)
        let type: "stl" | "image" | "3dobject" | "other" = "other"
        if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
        else if (file.name.toLowerCase().endsWith(".3dobject")) type = "3dobject"
        else if (file.type.startsWith("image/")) type = "image"
        return { file, url, type, stage: targetStage }
      })
      setSimulatedUploads(prev => [...prev, ...newUploads])
    }
  }, [activeStage, stages])

  const uploadedFilesSize = simulatedUploads.reduce((sum, { file }) => sum + file.size, 0)
  const totalSizeMB = (uploadedFilesSize / (1024 * 1024)).toFixed(2)

  // Guards against duplicate fetches for the same slipId (StrictMode double-invoke
  // and callback-identity churn both re-run the effect below).
  const fetchedSlipIdRef = useRef<number | null>(null)
  const [fetchingAttachments, setFetchingAttachments] = useState(false)

  // Reset the fetch guard each time the modal opens so we re-fetch current attachments
  useEffect(() => {
    if (open) {
      fetchedSlipIdRef.current = null
    }
  }, [open])

  // Fetch remote attachments — re-runs each time the modal opens (open prop resets the guard)
  useEffect(() => {
    if (!slipId) return
    const numericSlipId = Number(slipId)
    if (fetchedSlipIdRef.current === numericSlipId) return
    fetchedSlipIdRef.current = numericSlipId
    let mounted = true
    setFetchingAttachments(true)
    ;(async () => {
      try {
        const data = await fetchSlipAttachments(numericSlipId)
        if (!mounted || !data || !Array.isArray(data)) return
        const mapped = data.map((a: any) => {
          const fileName = (a.file_name || a.download_url?.split("/").pop() || "remote-file").toLowerCase()
          let type: "stl" | "image" | "3dobject" | "other" = "other"
          if (a.is_stl || fileName.endsWith(".stl")) type = "stl"
          else if (fileName.endsWith(".3dobject") || a.is_3d) type = "3dobject"
          else if (a.is_image) type = "image"
          else if (a.is_pdf) type = "other"
          const fileLike = {
            name: a.file_name || a.download_url?.split("/").pop() || "remote-file",
            size: Number(a.file_size) || 0,
            lastModified: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
          }
          const isPublic =
            a.is_public ?? a.visibility === "public" ?? a.share_with_related_cases ?? true
          return {
            file: fileLike,
            url: a.download_url || a.file_path,
            type,
            archived: a.archived || a.is_archived || false,
            remoteId: a.id,
            remoteMeta: a,
            isPublic: Boolean(isPublic),
            generatedPath: a.file_path || a.download_url || undefined,
          }
        })
        // Replace any previously-fetched remote items with the fresh list, preserve local-only items
        setSimulatedUploads((prev: any[]) => {
          const localOnly = prev.filter((p: any) => !p.remoteId)
          const remoteUrls = new Set(mapped.map((m: any) => m.url).filter(Boolean))
          const freshLocal = localOnly.filter((p: any) => !remoteUrls.has(p.url))
          return [...mapped, ...freshLocal]
        })
        onAttachmentStateChange?.(mapped.length > 0)
      } catch (err) {
        // Error handled: state remains as-is, UI shows empty attachments section
      } finally {
        if (mounted) setFetchingAttachments(false)
      }
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slipId, fetchSlipAttachments, open])

  // Pull the backend-generated storage path / URL out of an upload response
  const extractGeneratedPath = (data: any): string | undefined => {
    if (!data || typeof data !== "object") return undefined
    return data.file_path || data.download_url || data.path || data.url || undefined
  }

  const buildAttachmentMeta = (uploads: typeof simulatedUploads) =>
    uploads.map(({ file, url, type, isPublic, generatedPath }) => ({
      name: file.name,
      size: file.size,
      type: "type" in file ? file.type : undefined,
      lastModified: file.lastModified,
      previewUrl: url,
      fileType: type,
      isPublic: isPublic !== false,
      generatedPath: generatedPath || null,
      description,
    }))

  const persistAttachmentCache = (uploads: typeof simulatedUploads) => {
    if (typeof window === "undefined") return
    ;(window as any).__caseDesignAttachments = uploads
    try {
      const cacheStr = localStorage.getItem("caseDesignCache") || "{}"
      const cache = JSON.parse(cacheStr || "{}")
      cache.attachments = buildAttachmentMeta(uploads)
      localStorage.setItem("caseDesignCache", JSON.stringify(cache))
    } catch (err) {
      // Error handled: cache write failed, non-critical for functionality
    }
  }

  const handleAttachFiles = async () => {
    setUploadError(null)

    // When a slip already exists, upload local files now and capture the generated path.
    if (slipId) {
      setUploading(true)
      try {
        const uploaded = await Promise.all(
          simulatedUploads.map(async (upload) => {
            // Already-remote files keep their existing path — don't re-upload.
            if (upload.remoteId || upload.generatedPath) return upload
            const data = await uploadSlipAttachment(
              Number(slipId),
              upload.file as File,
            )
            const generatedPath = extractGeneratedPath(data)
            return {
              ...upload,
              remoteId: data?.id ?? upload.remoteId,
              remoteMeta: data ?? upload.remoteMeta,
              generatedPath: generatedPath ?? upload.generatedPath,
              url: generatedPath ?? upload.url,
            }
          }),
        )
        setSimulatedUploads(uploaded)
        persistAttachmentCache(uploaded)
        onAttachmentsUploaded?.(uploaded)
        onAttachmentStateChange?.(uploaded.length > 0)
        setShowAttachModal(false)
        return
      } catch (e) {
        const message = e instanceof Error ? e.message : "Attachment upload failed"
        setUploadError(message)
        return
      } finally {
        setUploading(false)
      }
    }

    // Slip-creation path: defer real upload to submit. Generated paths are filled in later.
    onAttachmentsUploaded?.(simulatedUploads)
    onAttachmentStateChange?.(simulatedUploads.length > 0)
    persistAttachmentCache(simulatedUploads)
    setShowAttachModal(false)
  }

  // Apply the Visibility + Hide-Archived filters to a single upload
  const passesFilters = (file: typeof simulatedUploads[number]): boolean => {
    if (hideArchived && file.archived) return false
    if (visibilityFilter === "public" && file.isPublic === false) return false
    if (visibilityFilter === "private" && file.isPublic !== false) return false
    return true
  }

  const groupFilesByStage = () => {
    const grouped: { [stage: string]: typeof simulatedUploads } = {}
    stages.forEach((stage) => {
      grouped[stage] = []
    })
    simulatedUploads.forEach((file) => {
      if (!passesFilters(file)) return
      const stage = file.stage || activeStage || stages[0]
      if (!grouped[stage]) grouped[stage] = []
      grouped[stage].push(file)
    })
    return grouped
  }

  const filesByStage = groupFilesByStage()

  // Stages shown in the list — narrowed by the Stage filter
  const visibleStages =
    stageFilter === "all-stages"
      ? stages
      : stages.filter((s) => s.toLowerCase().replace(/\s+/g, "-") === stageFilter)

  // Total files visible after all filters — drives the empty state
  const visibleFileCount = visibleStages.reduce(
    (sum, stage) => sum + (filesByStage[stage]?.length || 0),
    0,
  )

  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {}
    stages.forEach((stage) => {
      initial[stage] = true
    })
    return initial
  })

  const toggleAccordion = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const [selectedStlUrls, setSelectedStlUrls] = useState<string[]>([])

  // Unified checkbox handler: toggle file in/out of the Studio viewer
  const handleToggleFileInViewer = (url: string) => {
    const isInViewer = viewerItems.some(v => v.url === url)
    if (isInViewer) {
      // Remove from viewer
      setViewerItems(prev => prev.filter(v => v.url !== url))
      setViewerStlUrls(prev => prev.filter(u => u !== url))
      setSelectedStlUrls(prev => prev.filter(u => u !== url))
      setSelectedImageThumbnailUrls(prev => prev.filter(u => u !== url))
      // If no items left, close viewer
      const remaining = viewerItems.filter(v => v.url !== url)
      if (remaining.length === 0) {
        setViewing3dUrl(null)
      } else if (viewing3dUrl === url) {
        setViewing3dUrl(remaining[0]?.url || null)
      }
    } else {
      // Add to viewer
      const item = simulatedUploads.find(u => u.url === url)
      const itemType: "stl" | "image" = item?.type === "image" ? "image" : "stl"
      setViewerItems(prev => {
        if (prev.length >= maxCells) {
          return [...prev.slice(1), { url, type: itemType }]
        }
        return [...prev, { url, type: itemType }]
      })
      if (itemType === "stl") {
        setSelectedStlUrls(prev => prev.includes(url) ? prev : [...prev, url])
        setViewerStlUrls(prev => prev.includes(url) ? prev : [...prev, url])
      } else {
        setSelectedImageThumbnailUrls(prev => prev.includes(url) ? prev : [...prev, url])
      }
      // Open viewer if not already open
      if (!viewing3dUrl) {
        setViewing3dUrl(url)
      }
    }
  }

  const removeFileFromUi = (url: string) => {
    setSimulatedUploads((prev) => prev.filter((f) => f.url !== url))
    setSelectedStlUrls((prev) => prev.filter((u) => u !== url))
    setViewerStlUrls((prev) => prev.filter((u) => u !== url))
    setViewerItems((prev) => prev.filter((v) => v.url !== url))
    setSelectedImageThumbnailUrls((prev) => prev.filter((u) => u !== url))
    if (viewing3dUrl === url) setViewing3dUrl(null)
  }

  const handleDeleteFile = async (item: LocalUploadItem) => {
    if (item.remoteId) {
      try {
        await deleteSlipAttachment(item.remoteId)
        removeFileFromUi(item.url)
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Failed to delete attachment")
      }
      return
    }
    removeFileFromUi(item.url)
  }

  const handleToggleArchive = async (item: LocalUploadItem) => {
    if (!item.remoteId) return
    try {
      const updated = await toggleSlipAttachmentArchive(item.remoteId)
      if (hideArchived && updated.is_archived) {
        removeFileFromUi(item.url)
        return
      }
      setSimulatedUploads((prev) =>
        prev.map((f) =>
          f.url === item.url
            ? {
                ...f,
                archived: updated.is_archived,
                remoteMeta: updated,
              }
            : f
        )
      )
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to update archive status")
    }
  }

  const handleDownloadFile = (item: LocalUploadItem) => {
    const href = item.url
    if (!href) return
    window.open(href, "_blank", "noopener,noreferrer")
  }

  const visibleUploads = simulatedUploads.filter((item) => !hideArchived || !item.archived)

  // Get the active layout definition
  const activeLayout = LAYOUT_OPTIONS.find(l => l.id === selectedLayout) || LAYOUT_OPTIONS[0]
  const maxCells = activeLayout.cells.length

  // When layout changes, keep only items that fit in the new cell count
  useEffect(() => {
    setViewerItems(prev => prev.length > maxCells ? prev.slice(0, maxCells) : prev)
  }, [maxCells])

  // Zoom state per viewer cell (keyed by url)
  const [imageZoom, setImageZoom] = useState<Record<string, number>>({})
  const [imagePan, setImagePan] = useState<Record<string, { x: number; y: number }>>({})

  const handleImageZoomIn = (url: string) => {
    setImageZoom(prev => ({ ...prev, [url]: Math.min((prev[url] || 1) + 0.25, 5) }))
  }
  const handleImageZoomOut = (url: string) => {
    setImageZoom(prev => ({ ...prev, [url]: Math.max((prev[url] || 1) - 0.25, 0.25) }))
  }
  const handleImageZoomReset = (url: string) => {
    setImageZoom(prev => ({ ...prev, [url]: 1 }))
    setImagePan(prev => ({ ...prev, [url]: { x: 0, y: 0 } }))
  }

  // View file: open STL viewer pane with this file
  const handleViewFile = (url: string) => {
    setViewing3dUrl(url)
    const item = simulatedUploads.find(u => u.url === url)
    const itemType: "stl" | "image" = item?.type === "image" ? "image" : "stl"
    // Auto-add to viewer items if not already present
    if (!viewerItems.find(v => v.url === url)) {
      setViewerItems(prev => {
        if (prev.length >= maxCells) {
          return [...prev.slice(1), { url, type: itemType }]
        }
        return [...prev, { url, type: itemType }]
      })
    }
    // Keep legacy viewerStlUrls in sync for checkbox highlights
    if (!viewerStlUrls.includes(url) && itemType === "stl") {
      setViewerStlUrls(prev => [...prev, url])
    }
  }

  // Add to Viewer: add selected STL files + selected images (up to layout cell count)
  const handleAddToViewer = () => {
    const newItems: { url: string; type: "stl" | "image" }[] = []
    // Add selected STL/3D files
    selectedStlUrls.forEach(url => {
      const item = simulatedUploads.find(u => u.url === url)
      if (item && (item.type === "stl" || item.file?.name?.toLowerCase().endsWith(".stl"))) {
        newItems.push({ url, type: "stl" })
      }
    })
    // Add selected images
    selectedImageThumbnailUrls.forEach(url => {
      newItems.push({ url, type: "image" })
    })
    if (newItems.length > 0) {
      const trimmed = newItems.slice(0, maxCells)
      setViewerItems(trimmed)
      setViewerStlUrls(trimmed.filter(i => i.type === "stl").map(i => i.url))
      // Ensure viewer stays open
      const firstStl = trimmed.find(i => i.type === "stl")
      setViewing3dUrl(firstStl?.url || trimmed[0]?.url || null)
    }
  }

  // Clear display
  const handleClearDisplay = () => {
    setViewerItems([])
    setViewerStlUrls([])
    setViewing3dUrl(null)
  }

  const displaySlipId = slipId ? String(slipId) : "------"

  // Is viewer panel open
  const isViewerOpen = viewing3dUrl !== null

  // Notify parent when viewer opens/closes so dialog can resize
  useEffect(() => {
    onViewerToggle?.(isViewerOpen)
  }, [isViewerOpen, onViewerToggle])

  return (
    <div className="flex h-[80vh] max-h-[800px] bg-white rounded-lg relative">
      {/* Close (X) button */}
      <button
        type="button"
        className="absolute top-3 right-3 z-50 p-0.5 rounded hover:bg-gray-100 transition"
        onClick={() => setShowAttachModal(false)}
        aria-label="Close"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>

      {/* ===== Left Panel: Upload ===== */}
      <div className={`border-r flex-shrink-0 flex flex-col ${isViewerOpen ? "w-[240px] p-3" : "w-[320px] p-4"}`}>
        <div className="flex items-center gap-1.5 mb-3">
          <Paperclip className={`${isViewerOpen ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
          <h3 className={`font-semibold ${isViewerOpen ? "text-sm" : "text-base"}`}>Attachment</h3>
        </div>

        <p className={`text-gray-600 mb-3 ${isViewerOpen ? "text-[10px] leading-tight" : "text-xs"}`}>
          Upload case files, scans, photos or documents related to this treatment.
        </p>

        <div
          className={`border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 transition-colors ${isViewerOpen ? "p-3 mb-3" : "p-5 mb-3"}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleUploadButtonClick}
        >
          <Upload className={`text-gray-400 mx-auto ${isViewerOpen ? "w-6 h-6 mb-1" : "w-8 h-8 mb-2"}`} />
          <p className={`text-gray-500 ${isViewerOpen ? "text-[10px] leading-tight" : "text-xs"}`}>Drag & drop files here<br />or click to browse files.</p>
        </div>


        {uploadError && (
          <div className="text-red-600 text-[10px] mb-1">{uploadError}</div>
        )}
        <div className="flex justify-center gap-2 mt-auto">
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            disabled={isCaseSubmitted || uploading}
            className={`${isViewerOpen ? "px-3 h-7 text-[10px]" : "px-4 h-8 text-xs"}`}
          >
            Cancel
          </Button>
          <Button
            disabled={isCaseSubmitted || simulatedUploads.length === 0 || uploading}
            className={`bg-[#1162A8] hover:bg-[#0f5490] text-white ${isViewerOpen ? "px-3 h-7 text-[10px]" : "px-4 h-8 text-xs"}`}
            onClick={handleAttachFiles}
          >
            {uploading ? "Uploading…" : "Attach Files"}
          </Button>
        </div>
      </div>

      {/* ===== Middle Panel: File List ===== */}
      <div className={`flex-1 flex flex-col min-w-0 ${isViewerOpen ? "max-w-[50%]" : ""}`}>
        {/* Header bar */}
        <div className={`border-b ${isViewerOpen ? "px-3 py-2" : "px-4 py-3"}`}>
          <div className={`flex items-center justify-between mb-2 ${isViewerOpen ? "text-[10px]" : "text-xs"}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium">Dr: {doctorName || "-"}</span>
              <span>Patient: {patientName ? (patientName.length > 18 ? patientName.slice(0, 18) + "..." : patientName) : "-"}</span>
              <span className="text-gray-500">Total Size: {totalSizeMB} MB</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stages.length > 0 && (
              <Select value={stageFilter} onValueChange={setStageFilter} disabled={isCaseSubmitted}>
                <SelectTrigger className={`${isViewerOpen ? "w-[100px] h-7 text-[10px]" : "w-[120px] h-8 text-xs"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-stages">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage.toLowerCase().replace(/\s+/g, "-")}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {stages.length > 0 && (
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter} disabled={isCaseSubmitted}>
                <SelectTrigger className={`${isViewerOpen ? "w-[100px] h-7 text-[10px]" : "w-[120px] h-8 text-xs"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-visibility">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              className={`${hideArchived ? "bg-[#0d4a85]" : "bg-[#1162A8]"} text-white hover:bg-[#0d4a85] hover:text-white border-[#1162A8] hover:border-[#0d4a85] ${isViewerOpen ? "h-7 text-[10px] px-2" : "h-8 text-xs px-3"}`}
              disabled={isCaseSubmitted}
              onClick={() => setHideArchived((prev) => !prev)}
            >
              <Archive className={`${isViewerOpen ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
              {hideArchived ? "Show Archived" : "Hide Archived"}
            </Button>
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-3">
          {fetchingAttachments ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-[#1162A8] rounded-full animate-spin" />
              <div className="text-xs">Loading attachments…</div>
            </div>
          ) : visibleUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Paperclip className="w-8 h-8 mb-1" />
              <div className="text-sm font-semibold mb-0.5">No files selected</div>
              <div className="text-[10px]">Files you add will appear here for preview.</div>
            </div>
          ) : stages.length === 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {visibleUploads.map((item, idx) => {
                const { file, url, archived } = item
                const isStl = file.name?.toLowerCase().endsWith(".stl") || url.toLowerCase().endsWith(".stl")
                const is3dObj = file.name?.toLowerCase().endsWith(".3dobject") || url.toLowerCase().endsWith(".3dobject")
                const isImage =
                  ("type" in file && typeof file.type === "string" && file.type.startsWith("image/")) ||
                  !!url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                const isInViewer = viewerStlUrls.includes(url) || viewerItems.some(v => v.url === url)
                return (
                  <div
                    key={url}
                    className={`bg-white rounded-lg border relative flex flex-col w-full group ${
                      isInViewer ? "ring-2 ring-blue-500 border-blue-400" : "border-gray-200"
                    } ${archived ? "opacity-60" : ""}`}
                    style={archived ? { filter: "grayscale(60%)" } : undefined}
                  >
                    {archived && (
                      <div className="absolute top-1 left-1 z-20 bg-gray-600/80 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded">
                        Archived
                      </div>
                    )}
                    {(isStl || is3dObj || isImage) && !archived && (
                      <input
                        type="checkbox"
                        checked={viewerItems.some(v => v.url === url)}
                        onChange={() => handleToggleFileInViewer(url)}
                        className="absolute top-1.5 left-1.5 w-4 h-4 accent-blue-600 z-20 cursor-pointer"
                        title="Show in Studio"
                      />
                    )}
                    <div className={`w-full bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden relative ${isViewerOpen ? "h-[90px]" : "h-[110px]"}`}>
                      <div className={`absolute top-1 right-1 text-gray-600 font-semibold bg-white/90 rounded px-1 py-0 shadow border border-gray-200 z-10 ${isViewerOpen ? "text-[7px]" : "text-[8px]"}`}>
                        ID: {547896 + idx}
                      </div>
                      {isStl ? (
                        <SimpleSTLViewer
                          title={file.name?.replace('.stl', '') || 'STL File'}
                          geometryType="cube"
                          fileSize={`${(file.size / 1024 / 1024).toFixed(1)} MB`}
                          dimensions="Unknown"
                          stlUrl={toProxiedFileUrl(url)}
                          materialColor="#f5ecd0"
                          viewerKey={url}
                          autoOpen={false}
                          thumbnailUrls={selectedImageThumbnailUrls.map(toProxiedFileUrl)}
                        />
                      ) : is3dObj ? (
                        <div className="flex flex-col items-center justify-center">
                          <Box className={`text-gray-400 ${isViewerOpen ? "w-8 h-8" : "w-10 h-10"}`} />
                          <span className="text-[8px] text-gray-400 font-medium mt-0.5">3D Object</span>
                        </div>
                      ) : isImage ? (
                        <img src={toProxiedFileUrl(url)} alt={file.name || 'Image'} className="object-cover w-full h-full rounded-t-lg" />
                      ) : (
                        <FileText className={`text-gray-300 ${isViewerOpen ? "w-8 h-8" : "w-10 h-10"}`} />
                      )}
                      {(isStl || is3dObj || isImage) && !archived && (
                        <button
                          type="button"
                          className={`absolute bottom-1.5 right-1.5 bg-[#1162A8] text-white rounded font-medium shadow hover:bg-[#0f5490] transition z-10 opacity-0 group-hover:opacity-100 ${isViewerOpen ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"}`}
                          onClick={e => { e.stopPropagation(); handleViewFile(url) }}
                        >
                          {isImage ? "View Image" : "View File"}
                        </button>
                      )}
                      <div className={`absolute bottom-1 right-1 flex gap-0.5 z-10 ${(isStl || is3dObj) ? "opacity-0 group-hover:opacity-100" : ""}`}>
                        {!archived && (
                          <>
                            {item.remoteId && (
                              <button
                                type="button"
                                className="p-0.5 hover:bg-white/80 rounded bg-white/60"
                                title="Archive / unarchive"
                                onClick={(e) => { e.stopPropagation(); void handleToggleArchive(item) }}
                              >
                                <Archive className={`text-gray-500 ${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="p-0.5 hover:bg-white/80 rounded bg-white/60"
                              title="Download"
                              onClick={(e) => { e.stopPropagation(); handleDownloadFile(item) }}
                            >
                              <Download className={`text-gray-500 ${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`px-1.5 py-1 ${isViewerOpen ? "pb-1" : "pb-1.5"}`}>
                      <div className={`truncate font-medium ${isViewerOpen ? "text-[9px]" : "text-[10px]"}`}>{file.name || 'File'}</div>
                      <div className={`text-gray-500 ${isViewerOpen ? "text-[8px]" : "text-[9px]"}`}>{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                      <div className={`flex items-center gap-1 text-gray-400 mt-0.5 ${isViewerOpen ? "text-[7px]" : "text-[8px]"}`}>
                        <Calendar className={`${isViewerOpen ? "w-2 h-2" : "w-2.5 h-2.5"}`} />
                        <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isCaseSubmitted && (
                          <button
                            type="button"
                            className="ml-auto p-0 hover:text-red-500"
                            title="Delete"
                            onClick={() => void handleDeleteFile(item)}
                          >
                            <X className={`${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : visibleFileCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Paperclip className="w-8 h-8 mb-1" />
              <div className="text-sm font-semibold mb-0.5">No files match these filters</div>
              <div className="text-[10px]">Adjust the stage, visibility, or archived filters.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleStages.map((stage) => {
                const stageFiles = filesByStage[stage] || []
                const stageKey = stage.toLowerCase().replace(/\s+/g, "-")
                return (
                  <div key={stage} className="border rounded">
                    {/* Accordion header */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => toggleAccordion(stageKey)}
                      style={{ userSelect: "none" }}
                    >
                      {expanded[stageKey] ? (
                        <ChevronDown className={`${isViewerOpen ? "w-3.5 h-3.5" : "w-4 h-4"} text-gray-500`} />
                      ) : (
                        <ChevronRight className={`${isViewerOpen ? "w-3.5 h-3.5" : "w-4 h-4"} text-gray-500`} />
                      )}
                      <FolderOpen className={`${isViewerOpen ? "w-3.5 h-3.5" : "w-4 h-4"} text-blue-600`} />
                      <span className={`font-semibold ${isViewerOpen ? "text-xs" : "text-sm"}`}>{stage}</span>
                      <Badge variant="secondary" className={`${isViewerOpen ? "text-[9px] px-1.5 py-0" : "text-[10px] px-2 py-0"}`}>{stageFiles.length} files</Badge>
                      <span className={`text-gray-500 ml-1 ${isViewerOpen ? "text-[9px]" : "text-[10px]"}`}>Slip # {displaySlipId}</span>
                    </div>

                    {expanded[stageKey] && (
                      <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                        {stageFiles.map((item, idx) => {
                          const { file, url, archived } = item
                          const isStl = file.name?.toLowerCase().endsWith(".stl") || url.toLowerCase().endsWith(".stl")
                          const is3dObj = file.name?.toLowerCase().endsWith(".3dobject") || url.toLowerCase().endsWith(".3dobject")
                          const isImage =
                            ("type" in file &&
                              typeof file.type === "string" &&
                              file.type.startsWith("image/")) ||
                            !!url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          const isInViewer = viewerStlUrls.includes(url) || viewerItems.some(v => v.url === url)

                          return (
                            <div
                              key={url}
                              className={`bg-white rounded-lg border relative flex flex-col w-full group ${
                                isInViewer ? "ring-2 ring-blue-500 border-blue-400" : "border-gray-200"
                              } ${archived ? "opacity-60" : ""}`}
                              style={archived ? { filter: "grayscale(60%)" } : undefined}
                            >
                              {/* Archived badge */}
                              {archived && (
                                <div className="absolute top-1 left-1 z-20 bg-gray-600/80 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded">
                                  Archived
                                </div>
                              )}

                              {/* Checkbox to toggle file in/out of Studio viewer */}
                              {(isStl || is3dObj || isImage) && !archived && (
                                <input
                                  type="checkbox"
                                  checked={viewerItems.some(v => v.url === url)}
                                  onChange={() => handleToggleFileInViewer(url)}
                                  className="absolute top-1.5 left-1.5 w-4 h-4 accent-blue-600 z-20 cursor-pointer"
                                  title="Show in Studio"
                                />
                              )}

                              {/* Thumbnail area */}
                              <div className={`w-full bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden relative ${isViewerOpen ? "h-[90px]" : "h-[110px]"}`}>
                                {/* ID badge */}
                                <div className={`absolute top-1 right-1 text-gray-600 font-semibold bg-white/90 rounded px-1 py-0 shadow border border-gray-200 z-10 ${isViewerOpen ? "text-[7px]" : "text-[8px]"}`}>
                                  ID: {547896 + idx}
                                </div>

                                {/* Content based on file type */}
                                {isStl ? (
                                  <SimpleSTLViewer
                                    title={file.name?.replace('.stl', '') || 'STL File'}
                                    geometryType="cube"
                                    fileSize={`${(file.size / 1024 / 1024).toFixed(1)} MB`}
                                    dimensions="Unknown"
                                    stlUrl={toProxiedFileUrl(url)}
                                    materialColor="#f5ecd0"
                                    viewerKey={url}
                                    autoOpen={false}
                                    thumbnailUrls={selectedImageThumbnailUrls.map(toProxiedFileUrl)}
                                  />
                                ) : is3dObj ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <Box className={`text-gray-400 ${isViewerOpen ? "w-8 h-8" : "w-10 h-10"}`} />
                                    <span className="text-[8px] text-gray-400 font-medium mt-0.5">3D Object</span>
                                  </div>
                                ) : isImage ? (
                                  <img src={toProxiedFileUrl(url)} alt={file.name || 'Image'} className="object-cover w-full h-full rounded-t-lg" />
                                ) : (
                                  <FileText className={`text-gray-300 ${isViewerOpen ? "w-8 h-8" : "w-10 h-10"}`} />
                                )}

                                {/* "View File" button overlay on hover for STL/3D/image files */}
                                {((isStl || is3dObj || isImage) && !archived) && (
                                  <button
                                    type="button"
                                    className={`absolute bottom-1.5 right-1.5 bg-[#1162A8] text-white rounded font-medium shadow hover:bg-[#0f5490] transition z-10 opacity-0 group-hover:opacity-100 ${isViewerOpen ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"}`}
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleViewFile(url)
                                    }}
                                  >
                                    {isImage ? "View Image" : "View File"}
                                  </button>
                                )}

                                {/* Action icons at bottom of thumbnail for images/other */}
                                <div className={`absolute bottom-1 right-1 flex gap-0.5 z-10 ${(isStl || is3dObj) ? "opacity-0 group-hover:opacity-100" : ""}`}>
                                  {!archived && (
                                    <>
                                      {item.remoteId && (
                                        <button
                                          type="button"
                                          className="p-0.5 hover:bg-white/80 rounded bg-white/60"
                                          title="Archive / unarchive"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            void handleToggleArchive(item)
                                          }}
                                        >
                                          <Archive className={`text-gray-500 ${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        className="p-0.5 hover:bg-white/80 rounded bg-white/60"
                                        title="Download"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDownloadFile(item)
                                        }}
                                      >
                                        <Download className={`text-gray-500 ${ isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* File info below thumbnail */}
                              <div className={`px-1.5 py-1 ${isViewerOpen ? "pb-1" : "pb-1.5"}`}>
                                <div className={`truncate font-medium ${isViewerOpen ? "text-[9px]" : "text-[10px]"}`}>{file.name || 'File'}</div>
                                <div className={`text-gray-500 ${isViewerOpen ? "text-[8px]" : "text-[9px]"}`}>{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                <div className={`flex items-center gap-1 text-gray-400 mt-0.5 ${isViewerOpen ? "text-[7px]" : "text-[8px]"}`}>
                                  <Calendar className={`${isViewerOpen ? "w-2 h-2" : "w-2.5 h-2.5"}`} />
                                  <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {!isCaseSubmitted && (
                                    <button
                                      type="button"
                                      className="ml-auto p-0 hover:text-red-500"
                                      title="Delete"
                                      onClick={() => void handleDeleteFile(item)}
                                    >
                                      <X className={`${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Right Pane: STL Viewer ===== */}
      {isViewerOpen && (
        <div className="flex-[1.5] min-w-[520px] border-l h-full flex flex-col">
          {/* Viewer header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-[8px]">3D</span>
              </div>
              <span className="font-semibold text-xs">My Studio</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button className="p-1 hover:bg-gray-100 rounded" title="Full screen" onClick={() => setIsFullscreen(true)}>
                <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded" title="Close viewer" onClick={() => setViewing3dUrl(null)}>
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Viewer items preview strip */}
          {viewerItems.length > 0 && (
            <div className="flex gap-2 px-3 py-2.5 border-b overflow-x-auto bg-gray-50">
              {viewerItems.map((item, idx) => (
                <div key={item.url} className={`w-[130px] h-[95px] flex-shrink-0 rounded-md border-2 overflow-hidden relative group/thumb cursor-pointer ${idx === 0 ? "border-blue-500" : "border-gray-200"}`}>
                  {item.type === "image" ? (
                    <img src={toProxiedFileUrl(item.url)} className="w-full h-full object-cover" alt={`Viewer ${idx + 1}`} />
                  ) : (
                    <div className="w-full h-full bg-[#2a3a4a] flex items-center justify-center">
                      <Box className="w-8 h-8 text-yellow-400" />
                    </div>
                  )}
                  <div className="absolute top-0.5 left-0.5 bg-black/50 text-white text-[8px] font-medium px-1 rounded">
                    {idx + 1}
                  </div>
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 bg-black/50 text-white p-0.5 rounded opacity-0 group-hover/thumb:opacity-100 transition"
                    onClick={() => handleToggleFileInViewer(item.url)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Controls sidebar + 3D canvas side by side */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Controls sidebar */}
            <div className="w-[120px] flex-shrink-0 border-r overflow-y-auto p-2 space-y-3">
              {/* Controls section — only for STL files */}
              {viewerItems.some(v => v.type === "stl") && (
              <div>
                <h4 className="text-[10px] font-semibold mb-1.5">Controls</h4>
                {/* Directional pad */}
                <div className="flex items-center justify-center mb-1.5">
                  <div className="relative w-[60px] h-[60px]">
                    {/* Top arrow */}
                    <button className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-gray-400 hover:border-b-blue-600 transition" title="Top view" />
                    {/* Bottom arrow */}
                    <button className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-gray-400 hover:border-t-blue-600 transition" title="Bottom view" />
                    {/* Left arrow */}
                    <button className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-gray-400 hover:border-r-blue-600 transition" title="Left view" />
                    {/* Right arrow */}
                    <button className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[10px] border-l-blue-600 hover:border-l-blue-700 transition" title="Right view" />
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full" />
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-1 border rounded py-1 text-[9px] text-gray-600 hover:bg-gray-50">
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              </div>
              )}

              {/* Display section — only for STL files */}
              {viewerItems.some(v => v.type === "stl") && (
              <div>
                <h4 className="text-[10px] font-semibold mb-1.5">Display</h4>
                <div className="space-y-1">
                  <button
                    className="w-full border rounded py-1 text-[9px] text-gray-600 hover:bg-gray-50"
                    onClick={handleClearDisplay}
                  >
                    Clear Display
                  </button>
                  <button
                    className={`w-full border rounded py-1 text-[9px] font-medium transition ${isWireframe ? "bg-[#1162A8] text-white border-[#1162A8]" : "text-gray-600 hover:bg-gray-50"}`}
                    onClick={() => setIsWireframe(prev => !prev)}
                  >
                    Wireframe
                  </button>
                  <button
                    className={`w-full border rounded py-1 text-[9px] font-medium transition ${showGrid ? "bg-[#1162A8] text-white border-[#1162A8]" : "text-gray-600 hover:bg-gray-50"}`}
                    onClick={() => setShowGrid(prev => !prev)}
                  >
                    Grid
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={modelColor}
                      onChange={(e) => setModelColor(e.target.value)}
                      className="w-5 h-5 rounded border border-gray-300 cursor-pointer p-0"
                    />
                    <span className="text-[9px] text-gray-600">Color Picker</span>
                  </div>
                </div>
              </div>
              )}

              {/* Layout section */}
              <div>
                <h4 className="text-[10px] font-semibold mb-1.5">Layout</h4>
                <div className="grid grid-cols-2 gap-1">
                  {/* Layout grid icons matching Figma */}
                  {[
                    /* Row 1 */ "1x1", "2x2",
                    /* Row 2 */ "1-1v", "2-1h",
                    /* Row 3 */ "1h-2", "1-2v",
                    /* Row 4 */ "3s-1", "1-3s",
                    /* Row 5 */ "3x2", "2x3",
                  ].map((layoutId) => (
                    <button
                      key={layoutId}
                      className={`w-full aspect-square border rounded p-0.5 transition ${
                        selectedLayout === layoutId ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                      }`}
                      onClick={() => setSelectedLayout(layoutId)}
                    >
                      <LayoutIcon layoutId={layoutId} isActive={selectedLayout === layoutId} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3D canvas / image grid driven by selected layout */}
            <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
              <div
                className={`absolute inset-0 grid ${activeLayout.cols} gap-[2px] bg-gray-300 overflow-hidden`}
                style={{ gridTemplateRows: `repeat(${activeLayout.rows}, 1fr)` }}
              >
                {activeLayout.cells.map((cell, idx) => {
                  const item = viewerItems[idx]
                  return (
                    <div
                      key={`${selectedLayout}-${idx}`}
                      className="bg-[#e9ecef] overflow-hidden relative"
                      style={{
                        gridColumn: `span ${cell.colSpan}`,
                        gridRow: `span ${cell.rowSpan}`,
                      }}
                    >
                      {item?.type === "stl" ? (
                        <div className="absolute inset-0">
                          <STLCanvasOnly
                            models={[{ src: toProxiedFileUrl(item.url), color: modelColor }]}
                            isWireframe={isWireframe}
                            showGrid={showGrid}
                            modelColor={modelColor}
                            glossy
                            autoRotate
                          />
                        </div>
                      ) : item?.type === "image" ? (
                        <div
                          className="absolute inset-0 bg-white overflow-hidden cursor-grab active:cursor-grabbing"
                          onWheel={(e) => {
                            e.stopPropagation()
                            if (e.deltaY < 0) handleImageZoomIn(item.url)
                            else handleImageZoomOut(item.url)
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            const startX = e.clientX
                            const startY = e.clientY
                            const startPan = imagePan[item.url] || { x: 0, y: 0 }
                            const onMove = (ev: MouseEvent) => {
                              setImagePan(prev => ({
                                ...prev,
                                [item.url]: {
                                  x: startPan.x + (ev.clientX - startX),
                                  y: startPan.y + (ev.clientY - startY),
                                },
                              }))
                            }
                            const onUp = () => {
                              window.removeEventListener("mousemove", onMove)
                              window.removeEventListener("mouseup", onUp)
                            }
                            window.addEventListener("mousemove", onMove)
                            window.addEventListener("mouseup", onUp)
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toProxiedFileUrl(item.url)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-contain select-none"
                            draggable={false}
                            referrerPolicy="no-referrer"
                            style={{
                              transform: `scale(${imageZoom[item.url] || 1}) translate(${(imagePan[item.url]?.x || 0) / (imageZoom[item.url] || 1)}px, ${(imagePan[item.url]?.y || 0) / (imageZoom[item.url] || 1)}px)`,
                              transformOrigin: "center center",
                            }}
                          />
                          {/* Zoom controls overlay */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-lg px-1.5 py-1 z-20">
                            <button
                              className="p-0.5 hover:bg-white/20 rounded text-white transition"
                              onClick={(e) => { e.stopPropagation(); handleImageZoomOut(item.url) }}
                              title="Zoom out"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-white text-[9px] font-medium min-w-[32px] text-center">
                              {Math.round((imageZoom[item.url] || 1) * 100)}%
                            </span>
                            <button
                              className="p-0.5 hover:bg-white/20 rounded text-white transition"
                              onClick={(e) => { e.stopPropagation(); handleImageZoomIn(item.url) }}
                              title="Zoom in"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-0.5 hover:bg-white/20 rounded text-white transition"
                              onClick={(e) => { e.stopPropagation(); handleImageZoomReset(item.url) }}
                              title="Reset zoom"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-[10px]">
                          {idx === 0 ? "Select a file to preview" : `Cell ${idx + 1}`}
                        </div>
                      )}
                      {/* Cell index badge */}
                      {activeLayout.cells.length > 1 && (
                        <div className="absolute top-1 left-1 bg-black/40 text-white text-[8px] font-medium px-1.5 py-0.5 rounded z-10">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
        multiple
        ref={fileInputRef}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx"
      />

      {/* Fullscreen Studio Viewer */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-[9px]">3D</span>
              </div>
              <span className="font-semibold text-sm">Studio</span>
            </div>
            <button className="p-1.5 hover:bg-gray-100 rounded" title="Exit full screen" onClick={() => setIsFullscreen(false)}>
              <Minimize2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Controls sidebar — only for STL */}
            {viewerItems.some(v => v.type === "stl") && (
            <div className="w-[140px] flex-shrink-0 border-r overflow-y-auto p-3 space-y-4">
              <div>
                <h4 className="text-xs font-semibold mb-2">Controls</h4>
                <div className="flex items-center justify-center mb-2">
                  <div className="relative w-[70px] h-[70px]">
                    <button className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[12px] border-b-gray-400 hover:border-b-blue-600 transition" title="Top view" />
                    <button className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[12px] border-t-gray-400 hover:border-t-blue-600 transition" title="Bottom view" />
                    <button className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-r-[12px] border-r-gray-400 hover:border-r-blue-600 transition" title="Left view" />
                    <button className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[12px] border-l-blue-600 hover:border-l-blue-700 transition" title="Right view" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-blue-600 rounded-full" />
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-1 border rounded py-1.5 text-[10px] text-gray-600 hover:bg-gray-50">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-2">Display</h4>
                <div className="space-y-1.5">
                  <button className="w-full border rounded py-1.5 text-[10px] text-gray-600 hover:bg-gray-50" onClick={handleClearDisplay}>Clear Display</button>
                  <button className={`w-full border rounded py-1.5 text-[10px] font-medium transition ${isWireframe ? "bg-[#1162A8] text-white border-[#1162A8]" : "text-gray-600 hover:bg-gray-50"}`} onClick={() => setIsWireframe(prev => !prev)}>Wireframe</button>
                  <button className={`w-full border rounded py-1.5 text-[10px] font-medium transition ${showGrid ? "bg-[#1162A8] text-white border-[#1162A8]" : "text-gray-600 hover:bg-gray-50"}`} onClick={() => setShowGrid(prev => !prev)}>Grid</button>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={modelColor} onChange={(e) => setModelColor(e.target.value)} className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0" />
                    <span className="text-[10px] text-gray-600">Color Picker</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-2">Layout</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {["1x1","2x2","1-1v","2-1h","1h-2","1-2v","3s-1","1-3s","3x2","2x3"].map((layoutId) => (
                    <button key={layoutId} className={`w-full aspect-square border rounded p-0.5 transition ${selectedLayout === layoutId ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`} onClick={() => setSelectedLayout(layoutId)}>
                      <LayoutIcon layoutId={layoutId} isActive={selectedLayout === layoutId} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* Canvas grid */}
            <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
              <div className={`absolute inset-0 grid ${activeLayout.cols} gap-[2px] bg-gray-300 overflow-hidden`} style={{ gridTemplateRows: `repeat(${activeLayout.rows}, 1fr)` }}>
                {activeLayout.cells.map((cell, idx) => {
                  const item = viewerItems[idx]
                  return (
                    <div key={`fs-${selectedLayout}-${idx}`} className="bg-[#e9ecef] overflow-hidden relative" style={{ gridColumn: `span ${cell.colSpan}`, gridRow: `span ${cell.rowSpan}` }}>
                      {item?.type === "stl" ? (
                        <div className="absolute inset-0">
                          <STLCanvasOnly models={[{ src: toProxiedFileUrl(item.url), color: modelColor }]} isWireframe={isWireframe} showGrid={showGrid} modelColor={modelColor} glossy autoRotate />
                        </div>
                      ) : item?.type === "image" ? (
                        <div className="absolute inset-0 bg-white overflow-hidden cursor-grab active:cursor-grabbing"
                          onWheel={(e) => { e.stopPropagation(); if (e.deltaY < 0) handleImageZoomIn(item.url); else handleImageZoomOut(item.url); }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            const startX = e.clientX, startY = e.clientY
                            const startPan = imagePan[item.url] || { x: 0, y: 0 }
                            const onMove = (ev: MouseEvent) => { setImagePan(prev => ({ ...prev, [item.url]: { x: startPan.x + (ev.clientX - startX), y: startPan.y + (ev.clientY - startY) } })) }
                            const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                            window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp)
                          }}
                        >
                          <img src={item.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain select-none" draggable={false} referrerPolicy="no-referrer"
                            style={{ transform: `scale(${imageZoom[item.url] || 1}) translate(${(imagePan[item.url]?.x || 0) / (imageZoom[item.url] || 1)}px, ${(imagePan[item.url]?.y || 0) / (imageZoom[item.url] || 1)}px)`, transformOrigin: "center center" }}
                          />
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-lg px-2 py-1 z-20">
                            <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageZoomOut(item.url) }}><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-white text-xs font-medium min-w-[36px] text-center">{Math.round((imageZoom[item.url] || 1) * 100)}%</span>
                            <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageZoomIn(item.url) }}><ZoomIn className="w-4 h-4" /></button>
                            <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageZoomReset(item.url) }}><RotateCcw className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">{idx === 0 ? "Select a file to preview" : `Cell ${idx + 1}`}</div>
                      )}
                      {activeLayout.cells.length > 1 && (
                        <div className="absolute top-1.5 left-1.5 bg-black/40 text-white text-[9px] font-medium px-2 py-0.5 rounded z-10">{idx + 1}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-sm p-6 rounded-xl flex flex-col items-center">
          <div className="flex flex-col items-center gap-3">
            <span className="text-lg font-bold text-gray-800">Cancel Attachment?</span>
            <span className="text-gray-600 text-center text-sm">
              Are you sure you want to cancel? Any unsaved file uploads will be lost.
            </span>
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                className="px-4 h-8 text-xs"
                onClick={() => setShowCancelModal(false)}
              >
                Go Back
              </Button>
              <Button
                className="bg-[#1162A8] hover:bg-[#0f5490] text-white px-4 h-8 text-xs"
                onClick={() => {
                  setShowCancelModal(false)
                  setShowAttachModal(false)
                }}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// Small layout icon component for the layout grid picker
function LayoutIcon({ layoutId, isActive }: { layoutId: string; isActive: boolean }) {
  const bg = isActive ? "bg-blue-600" : "bg-gray-400"
  const gap = "gap-[1px]"

  switch (layoutId) {
    case "1x1":
      return <div className={`w-full h-full ${bg} rounded-[1px]`} />
    case "2x2":
      return (
        <div className={`w-full h-full grid grid-cols-2 grid-rows-2 ${gap}`}>
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "1-1v":
      return (
        <div className={`w-full h-full grid grid-cols-2 ${gap}`}>
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "2-1h":
      return (
        <div className={`w-full h-full grid grid-cols-3 ${gap}`}>
          <div className={`${bg} rounded-[1px] col-span-2`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "1h-2":
      return (
        <div className={`w-full h-full grid grid-cols-3 ${gap}`}>
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px] col-span-2`} />
        </div>
      )
    case "1-2v":
      return (
        <div className={`w-full h-full grid grid-cols-2 grid-rows-2 ${gap}`}>
          <div className={`${bg} rounded-[1px] row-span-2`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "3s-1":
      return (
        <div className={`w-full h-full grid grid-cols-4 ${gap}`}>
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "1-3s":
      return (
        <div className={`w-full h-full grid grid-cols-4 grid-rows-2 ${gap}`}>
          <div className={`${bg} rounded-[1px] row-span-2`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "3x2":
      return (
        <div className={`w-full h-full grid grid-cols-3 grid-rows-2 ${gap}`}>
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    case "2x3":
      return (
        <div className={`w-full h-full grid grid-cols-3 grid-rows-2 ${gap}`}>
          <div className={`${bg} rounded-[1px]`} />
          <div className={`${bg} rounded-[1px] col-span-2`} />
          <div className={`${bg} rounded-[1px] col-span-2`} />
          <div className={`${bg} rounded-[1px]`} />
        </div>
      )
    default:
      return <div className={`w-full h-full ${bg} rounded-[1px]`} />
  }
}
