"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  X,
  Upload,
  Calendar,
  Download,
  FileText,
  Archive,
  Box,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  Plus,
  Trash2,
} from "lucide-react"
import dynamic from "next/dynamic"
import SimpleSTLViewer from "./demo/simple-stl-generator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSlipCreation } from "../contexts/slip-creation-context"
import {
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
  slipNumber?: string
  slipStageName?: string
}
import { toProxiedFileUrl } from "@/lib/file-proxy"
import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

const areStringArraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

/** Smoothly rotate raw Three.js OrbitControls by azimuth/polar delta over ~300ms. */
function rotateOrbitControls(controls: OrbitControls, azimuthDelta: number, polarDelta: number) {
  const DURATION = 300
  const start = performance.now()

  const offset = new THREE.Vector3().copy(controls.object.position).sub(controls.target)
  const from = new THREE.Spherical().setFromVector3(offset)
  const toTheta = from.theta + azimuthDelta
  const toPhi = Math.max(0.05, Math.min(Math.PI - 0.05, from.phi + polarDelta))

  const tick = (now: number) => {
    const t = Math.min((now - start) / DURATION, 1)
    // Cubic ease-out
    const ease = 1 - Math.pow(1 - t, 3)

    const current = new THREE.Spherical(
      from.radius,
      from.phi + (toPhi - from.phi) * ease,
      from.theta + (toTheta - from.theta) * ease,
    )
    const pos = new THREE.Vector3().setFromSpherical(current)
    controls.object.position.copy(controls.target).add(pos)
    controls.object.lookAt(controls.target)
    controls.update()

    if (t < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

// Lazy-load only the 3D Canvas (no controls UI) to keep the bundle small
const STLCanvasOnly = dynamic(() => import("@/components/stl-canvas-only"), { ssr: false })

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
  /** When set, fetches all slips for the case and shows slip-grouped files */
  caseId?: number
  caseNumber?: string
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
  caseId,
  caseNumber,
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
  initialViewerItems,
}: FileAttachmentModalContentProps) {
  const {
    uploadSlipAttachment,
    fetchSlipAttachments,
    fetchCaseAttachments,
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
  const [addingFiles, setAddingFiles] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState("1x1")
  const dragThumbIdx = useRef<number | null>(null)
  const dragOverThumbIdx = useRef<number | null>(null)
  const orbitControlsRef = useRef<any>(null)

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
  // Tracks which STL cards have had "Preview" clicked — lazy-loads the 3D canvas only on demand
  const [previewedStlUrls, setPreviewedStlUrls] = useState<Set<string>>(new Set())

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
  const lastFileCountsRef = useRef<{ photoCount: number; stlCount: number } | null>(null)

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
      const lastCounts = lastFileCountsRef.current
      if (!lastCounts || lastCounts.photoCount !== photoCount || lastCounts.stlCount !== stlCount) {
        lastFileCountsRef.current = { photoCount, stlCount }
        onFileCountsChange(photoCount, stlCount)
      }
    }
    // ponytail: no auto-select — user clicks to add files to viewer
    const stlUrls = simulatedUploads.filter((u) => u.type !== "image").map((u) => u.url)
    const imageUrls = simulatedUploads.filter((u) => u.type === "image").map((u) => u.url)
    setViewerStlUrls((prev) => (areStringArraysEqual(prev, stlUrls) ? prev : stlUrls))
    setSelectedImageThumbnailUrls((prev) => (areStringArraysEqual(prev, imageUrls) ? prev : imageUrls))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatedUploads, onFileCountsChange])

  const [selectedImageThumbnailUrls, setSelectedImageThumbnailUrls] = useState<string[]>([])

  const addLocalFiles = (files: FileList | File[]) => {
    setAddingFiles(true)
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
    setAddingFiles(false)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setAddingFiles(true)
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
      setAddingFiles(false)
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
      setAddingFiles(true)
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
      setAddingFiles(false)
    }
  }, [activeStage, stages])

  const uploadedFilesSize = simulatedUploads.reduce((sum, { file }) => sum + file.size, 0)
  const totalSizeMB = (uploadedFilesSize / (1024 * 1024)).toFixed(2)

  const [fetchingAttachments, setFetchingAttachments] = useState(false)

  // Fetch remote attachments for a single slip (used when slipId prop is set)
  useEffect(() => {
    if (!slipId) return
    const numericSlipId = Number(slipId)
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
  }, [slipId])

  // Case-level fetch: loads all slips' attachments when caseId is provided.
  useEffect(() => {
    if (!caseId) return
    let mounted = true
    setFetchingAttachments(true)
    ;(async () => {
      try {
        const responseData = await fetchCaseAttachments(caseId)
        if (!mounted || !responseData) return
        const dataAny = (responseData as any).data ?? responseData
        const slips = Array.isArray(dataAny.slips) ? dataAny.slips : []
        const slipById = new Map(slips.map((s: any) => [s.id, s]))
        const allAttachments: any[] = Array.isArray(dataAny.all_attachments) && dataAny.all_attachments.length > 0
          ? dataAny.all_attachments
          : [
              ...(Array.isArray(dataAny.case_attachments)
                ? dataAny.case_attachments.map((a: any) => ({
                    ...a,
                    source: a.source ?? "case",
                    slip_id: a.slip_id ?? null,
                    slip_number: a.slip_number ?? null,
                  }))
                : []),
              ...slips.flatMap((s: any) =>
                Array.isArray(s.attachments)
                  ? s.attachments.map((a: any) => ({
                      ...a,
                      source: a.source ?? "slip",
                      slip_id: a.slip_id ?? s.id,
                      slip_number: a.slip_number ?? s.slip_number,
                    }))
                  : [],
              ),
            ]
        const mapped: LocalUploadItem[] = allAttachments.map((a: any) => {
          const slip = slipById.get(a.slip_id) as any
          const stageName =
            slip?.products?.[0]?.stage_name ??
            slip?.stage_name ??
            a.stage_name ??
            undefined
          const fileName = (a.file_name || a.download_url?.split("/").pop() || "remote-file").toLowerCase()
          const mime = (a.mime_type || a.file_type || "").toLowerCase()
          let type: "stl" | "image" | "3dobject" | "other" = "other"
          if (a.is_stl || fileName.endsWith(".stl") || mime === "model/stl" || mime === "application/sla") type = "stl"
          else if (a.is_image || mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(fileName)) type = "image"
          return {
            file: {
              name: a.file_name || "remote-file",
              size: Number(a.file_size) || 0,
              lastModified: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
            },
            url: a.download_url || a.file_path,
            type,
            archived: a.is_archived || false,
            remoteId: a.id,
            remoteMeta: a,
            slipNumber: a.slip_number ?? slip?.slip_number,
            slipStageName: a.source === "case" ? "Case Attachments" : stageName,
          }
        })
        if (mounted) {
          setSimulatedUploads(mapped)
          onAttachmentStateChange?.(mapped.length > 0)
        }
      } catch (e) {
        console.error("[case attachments] fetch failed:", e)
      } finally {
        if (mounted) setFetchingAttachments(false)
      }
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

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

  const groupFilesBySlip = () => {
    const grouped: { [key: string]: typeof simulatedUploads } = {}
    simulatedUploads.forEach((file) => {
      if (!passesFilters(file)) return
      const sid = (file.remoteMeta as any)?.slip_id
      const key = (file.remoteMeta as any)?.source === "case" ? "case" : sid != null ? String(sid) : "local"
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(file)
    })
    return grouped
  }

  const filesBySlip = groupFilesBySlip()

  // Ordered slip keys: numeric slip IDs sorted descending, then "local" last
  const slipKeys = Object.keys(filesBySlip).sort((a, b) => {
    if (a === "local") return 1
    if (b === "local") return -1
    return Number(b) - Number(a)
  })

  const visibleFileCount = slipKeys.reduce((sum, k) => sum + filesBySlip[k].length, 0)

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
      setViewerItems(prev => [...prev, { url, type: itemType }])
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

  const visibleUploads = useMemo(
    () => simulatedUploads.filter((item) => !hideArchived || !item.archived),
    [hideArchived, simulatedUploads],
  )

  const [activeSlipKey, setActiveSlipKey] = useState<string | null>(null)
  const [fileOrder, setFileOrder] = useState<string[]>([])
  const dragFileIdx = useRef<number | null>(null)
  const dragOverFileIdx = useRef<number | null>(null)

  // Keep fileOrder in sync when uploads change
  useEffect(() => {
    setFileOrder(prev => {
      const urls = visibleUploads.map(u => u.url)
      const kept = prev.filter(u => urls.includes(u))
      const added = urls.filter(u => !kept.includes(u))
      const next = [...kept, ...added]
      if (prev.length === next.length && prev.every((url, index) => url === next[index])) {
        return prev
      }
      return next
    })
  }, [visibleUploads])

  const filteredUploads = (() => {
    const base = activeSlipKey === null
      ? visibleUploads
      : visibleUploads.filter((u) => {
          const sid = (u.remoteMeta as any)?.slip_id
          const key = (u.remoteMeta as any)?.source === "case" ? "case" : sid != null ? String(sid) : "local"
          return key === activeSlipKey
        })
    return [...base].sort((a, b) => {
      const ai = fileOrder.indexOf(a.url)
      const bi = fileOrder.indexOf(b.url)
      return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
    })
  })()

  const slipGroups = (() => {
    const groups: { key: string; slipNumber: string | undefined; stageName: string | undefined; files: LocalUploadItem[] }[] = []
    const seen = new Map<string, number>()
    visibleUploads.forEach((u) => {
      const sid = (u.remoteMeta as any)?.slip_id
      const key = (u.remoteMeta as any)?.source === "case" ? "case" : sid != null ? String(sid) : "local"
      if (!seen.has(key)) {
        seen.set(key, groups.length)
        groups.push({ key, slipNumber: u.slipNumber, stageName: u.slipStageName, files: [] })
      }
      groups[seen.get(key)!].files.push(u)
    })
    return groups
  })()

  // Get the active layout definition
  const activeLayout = LAYOUT_OPTIONS.find(l => l.id === selectedLayout) || LAYOUT_OPTIONS[0]
  const maxCells = activeLayout.cells.length
  const isSingleLayout = activeLayout.cells.length === 1

  const handleThumbDragStart = (idx: number) => {
    dragThumbIdx.current = idx
  }
  const handleThumbDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    dragOverThumbIdx.current = idx
  }
  const handleThumbDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragThumbIdx.current
    const to = dragOverThumbIdx.current
    if (from === null || to === null || from === to) return
    setViewerItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    dragThumbIdx.current = null
    dragOverThumbIdx.current = null
  }
  const handleThumbClick = (idx: number) => {
    if (!isSingleLayout) return
    setViewerItems(prev => {
      if (idx === 0) return prev
      const next = [...prev]
      const [clicked] = next.splice(idx, 1)
      next.unshift(clicked)
      return next
    })
  }


  // Zoom state per viewer cell (keyed by url)
  const [imageZoom, setImageZoom] = useState<Record<string, number>>({})
  const [imagePan, setImagePan] = useState<Record<string, { x: number; y: number }>>({})
  const [imageRotation, setImageRotation] = useState<Record<string, number>>({})

  const handleImageZoomIn = (url: string) => {
    setImageZoom(prev => ({ ...prev, [url]: Math.min((prev[url] || 1) + 0.25, 5) }))
  }
  const handleImageZoomOut = (url: string) => {
    setImageZoom(prev => ({ ...prev, [url]: Math.max((prev[url] || 1) - 0.25, 0.25) }))
  }
  const handleImageZoomReset = (url: string) => {
    setImageZoom(prev => ({ ...prev, [url]: 1 }))
    setImagePan(prev => ({ ...prev, [url]: { x: 0, y: 0 } }))
    setImageRotation(prev => ({ ...prev, [url]: 0 }))
  }
  const handleImageRotateLeft = (url: string) => {
    setImageRotation(prev => ({ ...prev, [url]: ((prev[url] || 0) - 90) % 360 }))
  }
  const handleImageRotateRight = (url: string) => {
    setImageRotation(prev => ({ ...prev, [url]: ((prev[url] || 0) + 90) % 360 }))
  }

  // View file: open STL viewer pane with this file
  const handleViewFile = (url: string) => {
    const alreadyIn = viewerItems.some(v => v.url === url)
    if (alreadyIn) {
      setViewerItems(prev => prev.filter(v => v.url !== url))
      setViewerStlUrls(prev => prev.filter(u => u !== url))
      if (viewing3dUrl === url) setViewing3dUrl(null)
      return
    }
    setViewing3dUrl(url)
    const item = simulatedUploads.find(u => u.url === url)
    const itemType: "stl" | "image" = item?.type === "image" ? "image" : "stl"
    setViewerItems(prev => [...prev, { url, type: itemType }])
    if (itemType === "stl") setViewerStlUrls(prev => [...prev, url])
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

  const handleClearSelectedFiles = () => {
    setViewerItems([])
    setViewerStlUrls([])
    setSelectedStlUrls([])
    setSelectedImageThumbnailUrls([])
    setViewing3dUrl(null)
  }

  // Carry the compact browser's selection into the viewer when we open fullscreen,
  // so the user doesn't have to re-pick the files they already chose.
  const seededSelectionRef = useRef("")
  useEffect(() => {
    if (!open) {
      seededSelectionRef.current = ""
      return
    }
    const items = initialViewerItems ?? []
    const key = items.map(i => `${i.type}:${i.url}`).join("|")
    if (!key || key === seededSelectionRef.current) return
    seededSelectionRef.current = key
    setViewerItems(items)
    setViewerStlUrls(items.filter(i => i.type === "stl").map(i => i.url))
    const firstStl = items.find(i => i.type === "stl")
    setViewing3dUrl(firstStl?.url ?? items[0]?.url ?? null)
  }, [open, initialViewerItems])

  // Clear display
  const displaySlipId = slipId ? String(slipId) : "------"

  // Is viewer panel open
  const isViewerOpen = viewing3dUrl !== null
  const hasSelectedFiles =
    viewerItems.length > 0 ||
    selectedStlUrls.length > 0 ||
    selectedImageThumbnailUrls.length > 0

  // Notify parent when viewer opens/closes so dialog can resize
  useEffect(() => {
    onViewerToggle?.(isViewerOpen)
  }, [isViewerOpen, onViewerToggle])

  // Reusable file card renderer
  const renderFileCard = (item: typeof simulatedUploads[number], idx: number) => {
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
        <div className="w-full bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden relative h-[90px]">
          <div className="absolute top-1 right-1 text-gray-600 font-semibold bg-white/90 rounded px-1 py-0 shadow border border-gray-200 z-10 text-[7px]">
            ID: {547896 + idx}
          </div>
          {isStl ? (
            previewedStlUrls.has(url) ? (
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
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer group/preview"
                onClick={() => setPreviewedStlUrls(prev => new Set([...prev, url]))}
                title="Click to preview 3D model"
              >
                <Box className="text-gray-300 w-8 h-8 group-hover/preview:text-[#1162A8] transition-colors" />
                <span className="text-[8px] text-gray-400 font-medium text-center px-1 leading-tight truncate max-w-full">
                  {file.name || 'STL File'}
                </span>
                <span className="text-[7px] text-gray-300">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · click to preview
                </span>
              </div>
            )
          ) : is3dObj ? (
            <div className="flex flex-col items-center justify-center">
              <Box className="text-gray-400 w-8 h-8" />
              <span className="text-[8px] text-gray-400 font-medium mt-0.5">3D Object</span>
            </div>
          ) : isImage ? (
            <img src={toProxiedFileUrl(url)} alt={file.name || 'Image'} className="object-cover w-full h-full rounded-t-lg" />
          ) : (
            <FileText className="text-gray-300 w-8 h-8" />
          )}
          {(isStl || is3dObj || isImage) && !archived && (
            <button
              type="button"
              className="absolute bottom-1.5 right-1.5 bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white rounded font-medium shadow hover:bg-[#0f5490] transition z-10 opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[8px]"
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
                    <Archive className="text-gray-500 w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  className="p-0.5 hover:bg-white/80 rounded bg-white/60"
                  title="Download"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile(item) }}
                >
                  <Download className="text-gray-500 w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="px-1.5 py-1 pb-1">
          <div className="truncate font-medium text-[9px]">{file.name || 'File'}</div>
          <div className="text-gray-500 text-[8px]">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
          <div className="flex items-center gap-1 text-gray-400 mt-0.5 text-[7px]">
            <Calendar className="w-2 h-2" />
            <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {!isCaseSubmitted && (
              <button
                type="button"
                className="ml-auto p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="Delete attachment"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDeleteFile(item)
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

  return (
    <div className="flex bg-white overflow-hidden" style={{ width: "100vw", height: "100vh" }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
      <div className="w-[160px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">

        {/* Logo / MyStudio header */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100">
          <div className="w-6 h-6 bg-[#1162A8] rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[8px] font-bold leading-none">3D</span>
          </div>
          <span className="text-sm font-bold text-gray-900">MyStudio</span>
        </div>

        {/* Display controls */}
        <div className="px-3 pt-4 pb-3 border-b border-gray-100">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Display</div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="w-full h-8 px-3 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-left font-medium transition"
              onClick={handleClearSelectedFiles}
            >
              Clear Selection
            </button>
            <button
              type="button"
              className={`w-full h-8 px-3 text-xs rounded-md border font-medium text-left transition ${
                isWireframe
                  ? "border-[#1162A8] bg-blue-50 text-[#1162A8]"
                  : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              }`}
              onClick={() => setIsWireframe(prev => !prev)}
            >
              Wireframe
            </button>
            <button
              type="button"
              className={`w-full h-8 px-3 text-xs rounded-md border font-medium text-left transition ${
                showGrid
                  ? "border-[#1162A8] bg-blue-50 text-[#1162A8]"
                  : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              }`}
              onClick={() => setShowGrid(prev => !prev)}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Layout picker */}
        <div className="px-3 pt-4 pb-3 flex-1 overflow-y-auto">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Layout</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["1x1","2x2","1-1v","2-1h","1h-2","1-2v","3s-1","1-3s","3x2","2x3"] as const).map((layoutId) => (
              <button
                key={layoutId}
                type="button"
                className={`aspect-[10/7] rounded-md border flex items-center justify-center p-1 transition ${
                  selectedLayout === layoutId
                    ? "border-[#82298D] bg-purple-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
                onClick={() => setSelectedLayout(layoutId)}
              >
                <LayoutIcon layoutId={layoutId} isActive={selectedLayout === layoutId} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT MAIN AREA ──────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header: Dr/Patient/Total + filter tabs + icons */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center gap-4 flex-shrink-0">
            {doctorName && (
              <span className="text-sm text-gray-700">
                Dr: <span className="font-semibold text-gray-900">{doctorName}</span>
              </span>
            )}
            {patientName && (
              <span className="text-sm text-gray-700">
                Patient: <span className="font-semibold text-gray-900">{patientName}</span>
              </span>
            )}
            <span className="text-xs text-gray-500 flex-shrink-0">Total Size: {totalSizeMB} MB</span>
          </div>

          {/* Slip filter tabs */}
          {slipGroups.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
              <button
                type="button"
                onClick={() => setActiveSlipKey(null)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1 text-xs font-medium border transition-colors ${
                  activeSlipKey === null
                    ? "text-white border-transparent"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#1162A8] hover:text-[#1162A8]"
                }`}
                style={activeSlipKey === null ? { background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)" } : undefined}
              >
                All Files
              </button>
              {slipGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveSlipKey(group.key === activeSlipKey ? null : group.key)}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1 text-xs font-medium border transition-colors ${
                    activeSlipKey === group.key
                      ? "text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-300 hover:border-[#1162A8] hover:text-[#1162A8]"
                  }`}
                  style={activeSlipKey === group.key ? { background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)" } : undefined}
                >
                  {group.key === "case" ? "Case" : `S${String(group.slipNumber ?? group.key).replace(/^S/i, "")}`}
                </button>
              ))}
            </div>
          )}

          {/* Minimize (back to compact) + Close */}
          <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 transition"
              title="Exit fullscreen"
              aria-label="Exit fullscreen"
              onClick={() => setShowAttachModal(false)}
            >
              <Minimize2 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 transition"
              title="Close"
              onClick={() => setShowAttachModal(false)}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            {!isCaseSubmitted && (
              <button
                type="button"
                className="flex-shrink-0 w-[88px] h-[72px] rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-[#1162A8] hover:bg-blue-50 transition text-gray-400 hover:text-[#1162A8]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-medium">Add Files</span>
              </button>
            )}
            {filteredUploads.length === 0 && isCaseSubmitted && (
              <div className="text-gray-400 text-xs py-2">No files</div>
            )}
            {filteredUploads.map((upload, idx) => {
              const isInViewer = viewerItems.some(v => v.url === upload.url)
              const isImage = upload.type === "image"
              return (
                <div
                  key={upload.url}
                  draggable
                  onDragStart={() => { dragFileIdx.current = idx }}
                  onDragOver={(e) => { e.preventDefault(); dragOverFileIdx.current = idx }}
                  onDrop={() => {
                    const from = dragFileIdx.current
                    const to = dragOverFileIdx.current
                    if (from === null || to === null || from === to) return
                    setFileOrder(prev => {
                      const urls = filteredUploads.map(u => u.url)
                      const next = [...urls]
                      const [moved] = next.splice(from, 1)
                      next.splice(to, 0, moved)
                      const allUrls = visibleUploads.map(u => u.url)
                      const filteredSet = new Set(urls)
                      let ni = 0
                      return allUrls.map(u => filteredSet.has(u) ? next[ni++] : u)
                    })
                    dragFileIdx.current = null
                    dragOverFileIdx.current = null
                  }}
                  onDragEnd={() => { dragFileIdx.current = null; dragOverFileIdx.current = null }}
                  className={`flex-shrink-0 w-[88px] rounded-lg border cursor-grab active:cursor-grabbing select-none group ${
                    isInViewer ? "ring-2 ring-[#1162A8] border-[#1162A8]" : "border-gray-200 hover:border-gray-400"
                  } ${upload.archived ? "opacity-60" : ""}`}
                  onClick={() => handleToggleFileInViewer(upload.url)}
                >
                  <div className="relative h-[58px] bg-gray-50 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={toProxiedFileUrl(upload.url)} alt={upload.file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Box className="w-6 h-6 text-gray-300" />
                    )}
                    {isInViewer && (
                      <div className="absolute inset-0 bg-[#1162A8]/15 pointer-events-none">
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1162A8] flex items-center justify-center">
                          <Eye className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                    <div className={`absolute bottom-1 right-1 flex gap-0.5 transition-opacity ${isInViewer ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      {upload.remoteId && (
                        <button type="button" className="w-5 h-5 rounded bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-[#1162A8]"
                          title={upload.archived ? "Unarchive" : "Archive"}
                          onClick={(e) => { e.stopPropagation(); void handleToggleArchive(upload) }}>
                          <Archive className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {upload.url && (
                        <button type="button" className="w-5 h-5 rounded bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-[#1162A8]"
                          title="Download"
                          onClick={(e) => { e.stopPropagation(); handleDownloadFile(upload) }}>
                          <Download className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {!isCaseSubmitted && (
                        <button type="button" className="w-5 h-5 rounded bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-red-600"
                          title="Delete attachment"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteFile(upload) }}>
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-1.5 py-1">
                    <div className="truncate text-[8px] font-medium text-gray-700">{upload.file.name || "File"}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3D canvas / image viewer */}
        <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden bg-[#e9ecef]">
          {viewerItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Select a file above to preview
            </div>
          ) : (
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
                    style={{ gridColumn: `span ${cell.colSpan}`, gridRow: `span ${cell.rowSpan}` }}
                  >
                    {item?.type === "stl" ? (
                      <div className="absolute inset-0">
                        <STLCanvasOnly
                          src={toProxiedFileUrl(item.url)}
                          isWireframe={isWireframe}
                          showGrid={showGrid}
                          modelColor={modelColor}
                          autoRotate
                          controlsRef={idx === 0 ? orbitControlsRef : undefined}
                        />
                      </div>
                    ) : item?.type === "image" ? (
                      <div
                        className="absolute inset-0 bg-white overflow-hidden cursor-grab active:cursor-grabbing"
                        onWheel={(e) => { e.stopPropagation(); if (e.deltaY < 0) handleImageZoomIn(item.url); else handleImageZoomOut(item.url) }}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return
                          const startX = e.clientX, startY = e.clientY
                          const startPan = imagePan[item.url] || { x: 0, y: 0 }
                          const onMove = (ev: MouseEvent) => setImagePan(prev => ({ ...prev, [item.url]: { x: startPan.x + (ev.clientX - startX), y: startPan.y + (ev.clientY - startY) } }))
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
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
                            transform: `scale(${imageZoom[item.url] || 1}) translate(${(imagePan[item.url]?.x || 0) / (imageZoom[item.url] || 1)}px, ${(imagePan[item.url]?.y || 0) / (imageZoom[item.url] || 1)}px) rotate(${imageRotation[item.url] || 0}deg)`,
                            transformOrigin: "center center",
                          }}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-lg px-1.5 py-1 z-20">
                          <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageZoomOut(item.url) }} title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
                          <span className="text-white text-[9px] font-medium min-w-[32px] text-center">{Math.round((imageZoom[item.url] || 1) * 100)}%</span>
                          <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageZoomIn(item.url) }} title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
                          <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageRotateLeft(item.url) }} title="Rotate left"><RotateCcw className="w-3 h-3" /></button>
                          <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageRotateRight(item.url) }} title="Rotate right"><RotateCw className="w-3 h-3" /></button>
                          <button className="p-0.5 hover:bg-white/20 rounded text-white transition" onClick={(e) => { e.stopPropagation(); handleImageZoomReset(item.url) }} title="Reset view"><RotateCcw className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        {idx === 0 ? "Select a file to preview" : `Cell ${idx + 1}`}
                      </div>
                    )}
                    {activeLayout.cells.length > 1 && (
                      <div className="absolute top-1 left-1 bg-black/40 text-white text-[8px] font-medium px-1.5 py-0.5 rounded z-10">{idx + 1}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" style={{ display: "none" }} onChange={handleFileChange} multiple ref={fileInputRef} accept=".jpg,.jpeg,.png,.gif,.pdf,.stl,.zip,.rar,.doc,.docx,.xls,.xlsx" />

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-sm p-6 rounded-xl flex flex-col items-center">
          <div className="flex flex-col items-center gap-3">
            <span className="text-lg font-bold text-gray-800">Cancel Attachment?</span>
            <span className="text-gray-600 text-center text-sm">
              Are you sure you want to cancel? Any unsaved file uploads will be lost.
            </span>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="px-4 h-8 text-xs" onClick={() => setShowCancelModal(false)}>Go Back</Button>
              <Button
                className="px-4 h-8 text-xs text-white"
                style={{ background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)" }}
                onClick={() => { setShowCancelModal(false); setShowAttachModal(false) }}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  void uploading; void uploadedAttachments; void addingFiles; void setIsFullscreen
}

// Small layout icon component for the layout grid picker
function LayoutIcon({ layoutId, isActive }: { layoutId: string; isActive: boolean }) {
  const bg = isActive ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)]" : "bg-gray-400"
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
