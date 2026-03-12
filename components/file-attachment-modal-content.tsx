"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  RotateCcw,
  Play,
} from "lucide-react"
import dynamic from "next/dynamic"
import SimpleSTLViewer from "./demo/simple-stl-generator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSlipCreation } from "../contexts/slip-creation-context"

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
  doctorName?: string
  patientName?: string
  savedProducts?: SavedProduct[]
  /** Dynamic stages from product API — overrides savedProducts-derived stages when provided */
  availableStages?: string[]
  /** Called when STL viewer opens/closes so parent dialog can resize */
  onViewerToggle?: (isOpen: boolean) => void
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
  doctorName: propDoctorName,
  patientName: propPatientName,
  savedProducts = [],
  availableStages: propAvailableStages,
  onViewerToggle,
}: FileAttachmentModalContentProps) {
  const { uploadSlipAttachment, fetchSlipAttachments } = useSlipCreation()
  const [simulatedUploads, setSimulatedUploads] = useState<
    Array<{ file: any, url: string, type: "stl" | "image" | "3dobject" | "other", archived?: boolean, remoteId?: any, remoteMeta?: any, stage?: string }>
  >([])
  const [description, setDescription] = useState("")
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
      return ["Custom Tray", "Bite Block", "Try in with Teeth", "Finish"]
    }
    return Array.from(stageSet).sort()
  })()

  // Active stage defaults to first available stage
  const activeStage = stages[0] || null

  // STL viewer display state
  const [isWireframe, setIsWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [modelColor, setModelColor] = useState("#f9c74f")

  // Viewer items: STL files and images assigned to layout cells
  const [viewerStlUrls, setViewerStlUrls] = useState<string[]>([])
  const [viewerItems, setViewerItems] = useState<{ url: string; type: "stl" | "image" }[]>([])

  // Doctor / patient names
  const [doctorName, setDoctorName] = useState<string>(propDoctorName || "")
  const [patientName, setPatientName] = useState<string>(propPatientName || "")

  useEffect(() => {
    if (propDoctorName) {
      setDoctorName(propDoctorName)
    } else if (typeof window !== "undefined") {
      try {
        const cacheStr = localStorage.getItem("caseDesignCache")
        if (cacheStr) {
          const cache = JSON.parse(cacheStr)
          const formData = cache?.slipData?.formData
          setDoctorName(formData?.doctor || "")
        }
      } catch {}
    }
  }, [propDoctorName])

  useEffect(() => {
    if (propPatientName) {
      setPatientName(propPatientName)
    } else if (typeof window !== "undefined") {
      try {
        const cacheStr = localStorage.getItem("caseDesignCache")
        if (cacheStr) {
          const cache = JSON.parse(cacheStr)
          const formData = cache?.slipData?.formData
          setPatientName(formData?.patient || formData?.patient_name || "")
        }
      } catch {}
    }
  }, [propPatientName])

  useEffect(() => {
    return () => {
      simulatedUploads.forEach(({ url }) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [simulatedUploads])

  const [selectedImageThumbnailUrls, setSelectedImageThumbnailUrls] = useState<string[]>([])

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

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value)
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

  // Fetch remote attachments
  useEffect(() => {
    if (!slipId) return
    let mounted = true
    ;(async () => {
      try {
        const data = await fetchSlipAttachments(Number(slipId))
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
          return {
            file: fileLike,
            url: a.download_url || a.file_path,
            type,
            archived: a.archived || a.is_archived || false,
            remoteId: a.id,
            remoteMeta: a,
          }
        })
        setSimulatedUploads((prev: any[]) => {
          const existing = new Set(prev.map(p => p.url))
          const toAdd = mapped.filter(m => m.url && !existing.has(m.url))
          if (toAdd.length === 0) return prev
          return [...prev, ...toAdd]
        })
      } catch (err) {
        console.error("Failed to fetch slip attachments:", err)
      }
    })()
    return () => { mounted = false }
  }, [slipId, fetchSlipAttachments])

  const handleAttachFiles = async () => {
    const attachments = simulatedUploads.map(({ file, url, type }) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      previewUrl: url,
      fileType: type,
      description,
    }))

    if (slipId) {
      try {
        for (const { file } of simulatedUploads) {
          await uploadSlipAttachment(Number(slipId), file, description)
        }
        if (onAttachmentsUploaded) onAttachmentsUploaded(simulatedUploads)
        setShowAttachModal(false)
        return
      } catch (e) {
        console.error('Error uploading attachments:', e)
      }
    }

    if (onAttachmentsUploaded) {
      onAttachmentsUploaded(simulatedUploads)
    }

    if (typeof window !== 'undefined') {
      ;(window as any).__caseDesignAttachments = simulatedUploads
    }

    if (typeof window !== "undefined") {
      try {
        const cacheStr = localStorage.getItem("caseDesignCache") || "{}"
        const cache = JSON.parse(cacheStr || "{}")
        cache.attachments = attachments
        localStorage.setItem("caseDesignCache", JSON.stringify(cache))
      } catch (err) {
        console.error('Failed to save attachments metadata to localStorage', err)
      }
    }

    setShowAttachModal(false)
  }

  const groupFilesByStage = () => {
    const grouped: { [stage: string]: typeof simulatedUploads } = {}
    stages.forEach((stage) => {
      grouped[stage] = []
    })
    simulatedUploads.forEach((file) => {
      const stage = file.stage || activeStage || stages[0]
      if (!grouped[stage]) grouped[stage] = []
      grouped[stage].push(file)
    })
    return grouped
  }

  const filesByStage = groupFilesByStage()

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

  const handleToggleStlCheckbox = (url: string) => {
    setSelectedStlUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    )
  }

  const handleDeleteFile = (url: string) => {
    setSimulatedUploads(prev => prev.filter(f => f.url !== url))
    setSelectedStlUrls(prev => prev.filter(u => u !== url))
    setViewerStlUrls(prev => prev.filter(u => u !== url))
    setViewerItems(prev => prev.filter(v => v.url !== url))
    if (viewing3dUrl === url) setViewing3dUrl(null)
  }

  // Get the active layout definition
  const activeLayout = LAYOUT_OPTIONS.find(l => l.id === selectedLayout) || LAYOUT_OPTIONS[0]
  const maxCells = activeLayout.cells.length

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
    <div className="flex h-full max-h-[min(750px,85vh)] bg-white rounded-lg relative">
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

        <Textarea
          placeholder="Label or describe this attachment"
          className={`mb-3 ${isViewerOpen ? "text-[10px] min-h-[50px]" : "text-xs min-h-[60px]"}`}
          rows={isViewerOpen ? 2 : 3}
          disabled={isCaseSubmitted}
          value={description}
          onChange={handleDescriptionChange}
        />

        <div className="flex items-center gap-1.5 mb-4">
          <input
            type="checkbox"
            id="shareFiles"
            className="rounded border-gray-300 w-3.5 h-3.5"
            disabled={isCaseSubmitted}
            defaultChecked
          />
          <Label htmlFor="shareFiles" className={`${isViewerOpen ? "text-[10px]" : "text-xs"}`}>
            Make files available to related cases
          </Label>
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
            disabled={isCaseSubmitted || simulatedUploads.length === 0}
            className={`bg-[#1162A8] hover:bg-[#0f5490] text-white ${isViewerOpen ? "px-3 h-7 text-[10px]" : "px-4 h-8 text-xs"}`}
            onClick={handleAttachFiles}
          >
            Attach Files
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
            <Select defaultValue="all-stages" disabled={isCaseSubmitted}>
              <SelectTrigger className={`${isViewerOpen ? "w-[100px] h-7 text-[10px]" : "w-[120px] h-8 text-xs"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-stages">All Stages</SelectItem>
                <SelectItem value="custom-tray">Custom Tray</SelectItem>
                <SelectItem value="bite-block">Bite Block</SelectItem>
                <SelectItem value="try-in">Try in with Teeth</SelectItem>
                <SelectItem value="finish">Finish</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-visibility" disabled={isCaseSubmitted}>
              <SelectTrigger className={`${isViewerOpen ? "w-[100px] h-7 text-[10px]" : "w-[120px] h-8 text-xs"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-visibility">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className={`bg-[#1162A8] text-white hover:bg-[#0f5490] ${isViewerOpen ? "h-7 text-[10px] px-2" : "h-8 text-xs px-3"}`}
              disabled={isCaseSubmitted}
            >
              <Archive className={`${isViewerOpen ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
              Hide Archived
            </Button>
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-3">
          {simulatedUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Paperclip className="w-8 h-8 mb-1" />
              <div className="text-sm font-semibold mb-0.5">No files selected</div>
              <div className="text-[10px]">Files you add will appear here for preview.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage) => {
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
                          const isImage = file.type?.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
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

                              {/* Checkbox for STL/image selection when viewer is open */}
                              {isViewerOpen && (isStl || is3dObj) && !archived && (
                                <input
                                  type="checkbox"
                                  checked={selectedStlUrls.includes(url)}
                                  onChange={() => handleToggleStlCheckbox(url)}
                                  className="absolute top-1.5 left-1.5 w-3.5 h-3.5 accent-blue-600 z-20"
                                  title="Select for viewer"
                                />
                              )}

                              {/* Image checkbox for thumbnail selection */}
                              {isViewerOpen && isImage && !archived && (
                                <input
                                  type="checkbox"
                                  checked={selectedImageThumbnailUrls.includes(url)}
                                  onChange={() => setSelectedImageThumbnailUrls(
                                    selectedImageThumbnailUrls.includes(url)
                                      ? selectedImageThumbnailUrls.filter(u => u !== url)
                                      : [...selectedImageThumbnailUrls, url]
                                  )}
                                  className="absolute top-1.5 left-1.5 w-3.5 h-3.5 accent-blue-600 z-20"
                                  title="Use as STL Viewer Thumbnail"
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
                                    stlUrl={url}
                                    materialColor="#f9c74f"
                                    viewerKey={url}
                                    autoOpen={false}
                                    thumbnailUrls={selectedImageThumbnailUrls}
                                  />
                                ) : is3dObj ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <Box className={`text-gray-400 ${isViewerOpen ? "w-8 h-8" : "w-10 h-10"}`} />
                                    <span className="text-[8px] text-gray-400 font-medium mt-0.5">3D Object</span>
                                  </div>
                                ) : isImage ? (
                                  <img src={url} alt={file.name || 'Image'} className="object-cover w-full h-full rounded-t-lg" />
                                ) : (
                                  <FileText className={`text-gray-300 ${isViewerOpen ? "w-8 h-8" : "w-10 h-10"}`} />
                                )}

                                {/* "View File" button overlay on hover for STL/3D files */}
                                {(isStl || is3dObj) && !archived && (
                                  <button
                                    type="button"
                                    className={`absolute bottom-1.5 right-1.5 bg-[#1162A8] text-white rounded font-medium shadow hover:bg-[#0f5490] transition z-10 opacity-0 group-hover:opacity-100 ${isViewerOpen ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"}`}
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleViewFile(url)
                                    }}
                                  >
                                    View File
                                  </button>
                                )}

                                {/* Action icons at bottom of thumbnail for images/other */}
                                <div className={`absolute bottom-1 right-1 flex gap-0.5 z-10 ${(isStl || is3dObj) ? "opacity-0 group-hover:opacity-100" : ""}`}>
                                  {!archived && (
                                    <>
                                      <button className="p-0.5 hover:bg-white/80 rounded bg-white/60" title="Archive">
                                        <Archive className={`text-gray-500 ${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                                      </button>
                                      <button className="p-0.5 hover:bg-white/80 rounded bg-white/60" title="Download">
                                        <Download className={`text-gray-500 ${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
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
                                  <button className="ml-auto p-0 hover:text-red-500" title="Delete" onClick={() => handleDeleteFile(url)}>
                                    <Archive className={`${isViewerOpen ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                                  </button>
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
        <div className="flex-1 min-w-[380px] border-l h-full flex flex-col">
          {/* Viewer header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-[8px]">3D</span>
              </div>
              <span className="font-semibold text-xs">STL Viewer</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button className="p-1 hover:bg-gray-100 rounded" title="Full screen">
                <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded" title="Close viewer" onClick={() => setViewing3dUrl(null)}>
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Image thumbnail strip */}
          {selectedImageThumbnailUrls.length > 0 && (
            <div className="flex gap-1 px-3 py-1.5 border-b overflow-x-auto">
              {selectedImageThumbnailUrls.map((imgUrl) => (
                <div key={imgUrl} className="w-[60px] h-[45px] flex-shrink-0 rounded border border-gray-200 overflow-hidden relative group/thumb">
                  <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-black/40 text-white p-0.5 rounded-bl opacity-0 group-hover/thumb:opacity-100 transition"
                    onClick={() => setSelectedImageThumbnailUrls(prev => prev.filter(u => u !== imgUrl))}
                  >
                    <X className="w-2 h-2" />
                  </button>
                  {/* Play icon for video-like thumbnails */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition">
                      <Play className="w-2 h-2 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls sidebar + 3D canvas side by side */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Controls sidebar */}
            <div className="w-[120px] flex-shrink-0 border-r overflow-y-auto p-2 space-y-3">
              {/* Controls section */}
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

              {/* Display section */}
              <div>
                <h4 className="text-[10px] font-semibold mb-1.5">Display</h4>
                <div className="space-y-1">
                  <button
                    className={`w-full border rounded py-1 text-[9px] font-medium transition ${
                      viewerStlUrls.length > 0 ? "bg-[#1162A8] text-white border-[#1162A8]" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={handleAddToViewer}
                  >
                    Add to Viewer
                  </button>
                  {viewerStlUrls.length > 0 && (
                    <button
                      className="w-full border rounded py-1 text-[9px] text-gray-600 hover:bg-gray-50"
                      onClick={handleClearDisplay}
                    >
                      Clear Display
                    </button>
                  )}
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
            <div className="flex-1 min-w-0 min-h-0 relative">
              <div
                className={`absolute inset-0 grid ${activeLayout.cols} gap-[2px] bg-gray-300`}
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
                            models={[{ src: item.url, color: modelColor }]}
                            isWireframe={isWireframe}
                            showGrid={showGrid}
                            modelColor={modelColor}
                          />
                        </div>
                      ) : item?.type === "image" ? (
                        <img
                          src={item.url}
                          alt={`Preview ${idx + 1}`}
                          className="absolute inset-0 w-full h-full object-contain bg-white"
                        />
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
        accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.stl,.3Dobject,.mp4,.avi,.mov,.zip,.rar"
      />

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
