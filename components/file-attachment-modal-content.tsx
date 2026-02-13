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
  Trash2,
  Download,
  FileText,
  FolderOpen,
  Archive,
  Box,
} from "lucide-react"
import dynamic from "next/dynamic"
import SimpleSTLViewer from "./demo/simple-stl-generator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSlipCreation } from "../contexts/slip-creation-context"

// Lazy-load STL Viewer to avoid pulling Three.js into the initial modal bundle
const STLViewerPane = dynamic(() => import("@/components/stl-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-400">
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
  slipId?: number // <-- Add slipId prop for API
  onAttachmentsUploaded?: (attachments: any[]) => void // <-- Callback to parent
  doctorName?: string // <-- Doctor name from case design center
  patientName?: string // <-- Patient name from case design center
  savedProducts?: SavedProduct[] // <-- Saved products with stages
}


export default function FileAttachmentModalContent({
  setShowAttachModal,
  isCaseSubmitted,
  slipId,
  onAttachmentsUploaded,
  doctorName: propDoctorName,
  patientName: propPatientName,
  savedProducts = [],
}: FileAttachmentModalContentProps) {
  const { uploadSlipAttachment, fetchSlipAttachments } = useSlipCreation()
  const [simulatedUploads, setSimulatedUploads] = useState<
    Array<{ file: any, url: string, type: "stl" | "image" | "3dobject" | "other", archived?: boolean, remoteId?: any, remoteMeta?: any }>
  >([])
  const [description, setDescription] = useState("")
  const [showCancelModal, setShowCancelModal] = useState(false)
  // Third-pane STL Viewer state: set to a file URL when "View File" is clicked
  const [viewing3dUrl, setViewing3dUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])

  // --- Get doctor and patient name from props or localStorage fallback ---
  const [doctorName, setDoctorName] = useState<string>(propDoctorName || "")
  const [patientName, setPatientName] = useState<string>(propPatientName || "")

  useEffect(() => {
    // Use props if provided, otherwise fallback to localStorage
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
    // Use props if provided, otherwise fallback to localStorage
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

  // Add state for selected image thumbnail
  const [selectedImageThumbnailUrls, setSelectedImageThumbnailUrls] = useState<string[]>([])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newUploads = Array.from(files).map(file => {
        const url = URL.createObjectURL(file)
        let type: "stl" | "image" | "3dobject" | "other" = "other"
        if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
        else if (file.name.toLowerCase().endsWith(".3dobject")) type = "3dobject"
        else if (file.type.startsWith("image/")) type = "image"
        return { file, url, type }
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
      const newUploads = Array.from(files).map(file => {
        const url = URL.createObjectURL(file)
        let type: "stl" | "image" | "3dobject" | "other" = "other"
        if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
        else if (file.name.toLowerCase().endsWith(".3dobject")) type = "3dobject"
        else if (file.type.startsWith("image/")) type = "image"
        return { file, url, type }
      })
      setSimulatedUploads(prev => [...prev, ...newUploads])
    }
  }, [])

  const uploadedFilesSize = simulatedUploads.reduce((sum, { file }) => sum + file.size, 0)
  const totalSizeMB = (uploadedFilesSize / (1024 * 1024)).toFixed(2)

  // If a slipId is provided, fetch remote attachments and merge them into simulatedUploads for preview
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
          else if (a.is_pdf) type = "other" // PDFs stay as "other"
          const fileLike = {
            name: a.file_name || a.download_url?.split("/").pop() || "remote-file",
            size: Number(a.file_size) || 0,
            lastModified: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
          }
          return {
            // keep a small file-like object for UI (can't reconstruct File)
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

  // --- Save attachments to localStorage or upload immediately if slipId is provided ---
  const handleAttachFiles = async () => {
    // Prepare file metadata for caching (cannot store File objects directly)
    const attachments = simulatedUploads.map(({ file, url, type }) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      previewUrl: url,
      fileType: type,
      description,
    }))

    // If a slipId is provided, upload files immediately
    if (slipId) {
      try {
        // Upload each file using context API
        for (const { file } of simulatedUploads) {
          await uploadSlipAttachment(Number(slipId), file, description)
        }
        // Optionally notify parent
        if (onAttachmentsUploaded) onAttachmentsUploaded(simulatedUploads)
        setShowAttachModal(false)
        return
      } catch (e) {
        console.error('Error uploading attachments:', e)
        // Fallback to saving metadata
      }
    }

    // If no slipId, expose files to parent for later upload and stash them on window for fallback
    if (onAttachmentsUploaded) {
      onAttachmentsUploaded(simulatedUploads)
    }

    // Stash File objects on window temporarily so submit handler can pick them up across components
    if (typeof window !== 'undefined') {
      ;(window as any).__caseDesignAttachments = simulatedUploads
    }

    // Save metadata to localStorage under caseDesignCache.attachments for persistence
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

  // --- Group files by stage based on savedProducts ---
  // Extract unique stages from savedProducts
  const getStagesFromProducts = () => {
    const stages = new Set<string>()
    savedProducts.forEach((product) => {
      if (product.maxillaryStage && product.maxillaryTeeth.length > 0) {
        stages.add(product.maxillaryStage)
      }
      if (product.mandibularStage && product.mandibularTeeth.length > 0) {
        stages.add(product.mandibularStage)
      }
    })
    // If no stages found, use default stages
    if (stages.size === 0) {
      return ["Custom Tray", "Bite Block", "Try in with Teeth", "Finish"]
    }
    return Array.from(stages).sort()
  }

  const stages = getStagesFromProducts()

  // Group files by stage (for now, we'll distribute files across stages)
  // In a real implementation, you might want to let users assign files to specific stages
  const groupFilesByStage = () => {
    const grouped: { [stage: string]: typeof simulatedUploads } = {}
    stages.forEach((stage) => {
      grouped[stage] = []
    })

    // Distribute files across stages (you can enhance this logic)
    simulatedUploads.forEach((file, index) => {
      const stageIndex = index % stages.length
      const stage = stages[stageIndex]
      if (!grouped[stage]) grouped[stage] = []
      grouped[stage].push(file)
    })

    return grouped
  }

  const filesByStage = groupFilesByStage()

  // Accordion state for each section - dynamically based on stages
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {}
    stages.forEach((stage) => {
      initial[stage] = true // All sections expanded by default
    })
    return initial
  })

  const toggleAccordion = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Checkbox state for STL selection (by url)
  const [selectedStlUrls, setSelectedStlUrls] = useState<string[]>([])

  // Toggle STL selection
  const handleToggleStlCheckbox = (url: string) => {
    setSelectedStlUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    )
  }

  // Delete file by url from simulatedUploads
  const handleDeleteFile = (url: string) => {
    setSimulatedUploads(prev => prev.filter(f => f.url !== url))
    setSelectedStlUrls(prev => prev.filter(u => u !== url))
    // Close the 3D viewer pane if the deleted file is currently being viewed
    if (viewing3dUrl === url) setViewing3dUrl(null)
  }

  // Open STL/3D file in the third-pane viewer
  const handleViewFile = (url: string) => {
    setViewing3dUrl(url)
  }

  // Slip number for section headers
  const displaySlipId = slipId ? String(slipId) : "------"

  return (
    <div className="flex h-[90vh] bg-white rounded-lg relative">
      {/* Close (X) button – top-right of entire modal */}
      <button
        type="button"
        className="absolute top-4 right-4 z-50 p-1 rounded hover:bg-gray-100 transition"
        onClick={() => setShowAttachModal(false)}
        aria-label="Close"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      {/* ===== Left Panel: Upload ===== */}
      <div className="p-6 border-r w-[400px] flex-shrink-0 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <Paperclip className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Attachment</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Upload case files, scans, photos or documents related to this treatment.
        </p>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleUploadButtonClick}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Drag & drop files here<br />or click to browse files.</p>
        </div>

        <Textarea
          placeholder="Label or describe this attachment"
          className="mb-6"
          rows={4}
          disabled={isCaseSubmitted}
          value={description}
          onChange={handleDescriptionChange}
        />

        <div className="flex items-center gap-2 mb-8">
          <input
            type="checkbox"
            id="shareFiles"
            className="rounded border-gray-300"
            disabled={isCaseSubmitted}
            defaultChecked
          />
          <Label htmlFor="shareFiles" className="text-sm">
            Make files available to related cases
          </Label>
        </div>

        {uploadError && (
          <div className="text-red-600 text-sm mb-2">{uploadError}</div>
        )}
        <div className="flex justify-center gap-3 mt-auto">
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            disabled={isCaseSubmitted || uploading}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            disabled={isCaseSubmitted || simulatedUploads.length === 0}
            className="bg-[#1162A8] hover:bg-[#0f5490] text-white px-6"
            onClick={handleAttachFiles}
          >
            Attach Files
          </Button>
        </div>
      </div>

      {/* ===== Middle Panel: File List ===== */}
      <div className={`flex-1 flex flex-col min-w-0 ${viewing3dUrl ? "max-w-[50%]" : ""}`}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <span className="font-medium">Dr: {doctorName || "-"}</span>
              <span className="mx-4">Patient: {patientName ? (patientName.length > 18 ? patientName.slice(0, 18) + "..." : patientName) : "-"}</span>
              <span className="text-gray-500">Total Size: {totalSizeMB} MB</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select defaultValue="all-stages" disabled={isCaseSubmitted}>
              <SelectTrigger className="w-40">
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
              <SelectTrigger className="w-40">
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
              className="bg-[#1162A8] text-white hover:bg-[#0f5490]"
              disabled={isCaseSubmitted}
            >
              <Archive className="w-4 h-4 mr-2" />
              Hide Archived
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {/* If no files, show placeholder */}
          {simulatedUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Paperclip className="w-12 h-12 mb-2" />
              <div className="text-lg font-semibold mb-1">No files selected</div>
              <div className="text-sm">Files you add will appear here for preview.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dynamic Stage Sections */}
              {stages.map((stage, stageIdx) => {
                const stageFiles = filesByStage[stage] || []
                const stageKey = stage.toLowerCase().replace(/\s+/g, "-")
                return (
                  <div key={stage} className="border rounded-lg">
                    {/* Section Header with Folder icon and Slip # */}
                    <div
                      className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 rounded-t-lg transition"
                      onClick={() => toggleAccordion(stageKey)}
                      style={{ userSelect: "none" }}
                    >
                      {expanded[stageKey] ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-lg">{stage}</span>
                      <Badge variant="secondary" className="text-xs">{stageFiles.length} files</Badge>
                      <span className="text-xs text-gray-500 ml-2">Slip # {displaySlipId}</span>
                    </div>
                    {expanded[stageKey] && (
                      <div className="p-4 grid grid-cols-3 gap-4">
                        {stageFiles.map((item, idx) => {
                          const { file, url, archived } = item
                          const isStl = file.name?.toLowerCase().endsWith(".stl") || url.toLowerCase().endsWith(".stl")
                          const is3dObj = file.name?.toLowerCase().endsWith(".3dobject") || url.toLowerCase().endsWith(".3dobject")
                          const isImage = file.type?.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)

                          // --- STL file card ---
                          if (isStl) {
                            const imageThumbnails = selectedImageThumbnailUrls
                            return (
                              <div
                                key={url}
                                className={`bg-white rounded-xl shadow p-3 relative flex flex-col items-center w-full border border-gray-200 ${
                                  selectedStlUrls.includes(url) ? "ring-2 ring-blue-500" : ""
                                } ${archived ? "opacity-70" : ""}`}
                                style={archived ? { filter: "grayscale(60%)" } : undefined}
                              >
                                {/* Archived badge */}
                                {archived && (
                                  <div className="absolute top-2 left-2 z-20 bg-gray-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                                    Archived
                                  </div>
                                )}
                                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                  <SimpleSTLViewer
                                    title={file.name?.replace('.stl', '') || 'STL File'}
                                    geometryType="cube"
                                    fileSize={`${(file.size / 1024 / 1024).toFixed(1)} MB`}
                                    dimensions="Unknown"
                                    stlUrl={url}
                                    materialColor="#f9c74f"
                                    viewerKey={url}
                                    autoOpen={false}
                                    thumbnailUrls={imageThumbnails}
                                  />
                                  <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-semibold bg-white/90 rounded px-1.5 py-0.5 shadow border border-gray-200 z-10">
                                    ID: {547896 + idx}
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute bottom-3 right-3 bg-[#1162A8] text-white px-3 py-1 rounded text-xs font-medium shadow hover:bg-[#0f5490] transition z-10"
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleViewFile(url)
                                    }}
                                  >
                                    View File
                                  </button>
                                </div>
                                <div className="w-full px-1">
                                  <div className="truncate font-medium text-sm mb-0.5">{file.name || 'STL File'}</div>
                                  <div className="text-xs text-gray-500 mb-1">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Delete" onClick={() => handleDeleteFile(url)}>
                                      <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                      <Download className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-red-100 rounded ml-auto" title="Archive">
                                      <Archive className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          // --- .3Dobject file card ---
                          if (is3dObj) {
                            return (
                              <div
                                key={url}
                                className={`bg-white rounded-xl shadow p-3 relative flex flex-col items-center w-full border border-gray-200 ${
                                  archived ? "opacity-70" : ""
                                }`}
                                style={archived ? { filter: "grayscale(60%)" } : undefined}
                              >
                                {archived && (
                                  <div className="absolute top-2 left-2 z-20 bg-gray-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                                    Archived
                                  </div>
                                )}
                                <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex flex-col items-center justify-center overflow-hidden relative">
                                  {/* 3D object placeholder icon */}
                                  <Box className="w-16 h-16 text-gray-400 mb-1" />
                                  <span className="text-xs text-gray-400 font-medium">3D Object</span>
                                  <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-semibold bg-white/90 rounded px-1.5 py-0.5 shadow border border-gray-200 z-10">
                                    ID: {547896 + idx}
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute bottom-3 right-3 bg-[#1162A8] text-white px-3 py-1 rounded text-xs font-medium shadow hover:bg-[#0f5490] transition z-10"
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleViewFile(url)
                                    }}
                                  >
                                    View File
                                  </button>
                                </div>
                                <div className="w-full px-1">
                                  <div className="truncate font-medium text-sm mb-0.5">{file.name || '3D Object'}</div>
                                  <div className="text-xs text-gray-500 mb-1">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Delete" onClick={() => handleDeleteFile(url)}>
                                      <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                      <Download className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-red-100 rounded ml-auto" title="Archive">
                                      <Archive className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          // --- Image file card ---
                          if (isImage) {
                            return (
                              <div
                                key={url}
                                className={`bg-white rounded-xl shadow p-3 relative flex flex-col items-center w-full border border-gray-200 ${
                                  archived ? "opacity-70" : ""
                                }`}
                                style={archived ? { filter: "grayscale(60%)" } : undefined}
                              >
                                {archived && (
                                  <div className="absolute top-2 left-2 z-20 bg-gray-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                                    Archived
                                  </div>
                                )}
                                {/* Checkbox top-left for image selection (multi-select) */}
                                {!archived && (
                                  <input
                                    type="checkbox"
                                    checked={selectedImageThumbnailUrls.includes(url)}
                                    onChange={() => setSelectedImageThumbnailUrls(
                                      selectedImageThumbnailUrls.includes(url)
                                        ? selectedImageThumbnailUrls.filter(u => u !== url)
                                        : [...selectedImageThumbnailUrls, url]
                                    )}
                                    className="absolute top-2 left-2 w-4 h-4 accent-blue-600 z-20"
                                    title="Use as STL Viewer Thumbnail"
                                  />
                                )}
                                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                  <img src={url} alt={file.name || 'Image'} className="object-cover w-full h-full rounded-lg" />
                                  <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-semibold bg-white/90 rounded px-1.5 py-0.5 shadow border border-gray-200 z-10">
                                    ID: {547896 + idx}
                                  </div>
                                </div>
                                <div className="w-full px-1">
                                  <div className="truncate font-medium text-sm mb-0.5">{file.name || 'Image'}</div>
                                  <div className="text-xs text-gray-500 mb-1">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Delete" onClick={() => handleDeleteFile(url)}>
                                      <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                      <Download className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-red-100 rounded ml-auto" title="Archive">
                                      <Archive className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          // --- Other file types ---
                          return (
                            <div
                              key={url}
                              className={`bg-white rounded-xl shadow p-3 relative flex flex-col items-center w-full border border-gray-200 ${
                                archived ? "opacity-70" : ""
                              }`}
                              style={archived ? { filter: "grayscale(60%)" } : undefined}
                            >
                              {archived && (
                                <div className="absolute top-2 left-2 z-20 bg-gray-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                                  Archived
                                </div>
                              )}
                              <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                <FileText className="w-16 h-16 text-gray-300" />
                                <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-semibold bg-white/90 rounded px-1.5 py-0.5 shadow border border-gray-200 z-10">
                                  ID: {547896 + idx}
                                </div>
                              </div>
                              <div className="w-full px-1">
                                <div className="truncate font-medium text-sm mb-0.5">{file.name || 'File'}</div>
                                <div className="text-xs text-gray-500 mb-1">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(file.lastModified || Date.now()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button className="p-1 hover:bg-gray-200 rounded" title="Delete" onClick={() => handleDeleteFile(url)}>
                                    <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                  <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                    <Download className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                  <button className="p-1 hover:bg-red-100 rounded ml-auto" title="Archive">
                                    <Archive className="w-3.5 h-3.5 text-red-400" />
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

      {/* ===== Right Pane: STL Viewer (conditional, shown when View File is clicked) ===== */}
      {viewing3dUrl && (
        <div className="w-[420px] flex-shrink-0 border-l h-full">
          <STLViewerPane
            models={[{ src: viewing3dUrl, color: "#f9c74f" }]}
            onCloseViewer={() => setViewing3dUrl(null)}
            onClearDisplay={() => setViewing3dUrl(null)}
          />
        </div>
      )}

      {/* Hidden file input – accepts .stl, .3Dobject, images, and common document types */}
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
        <DialogContent className="max-w-md p-8 rounded-xl flex flex-col items-center">
          <div className="flex flex-col items-center gap-4">
            <span className="text-2xl font-bold text-gray-800 mb-2">Cancel Attachment?</span>
            <span className="text-gray-600 text-center mb-4">
              Are you sure you want to cancel? Any unsaved file uploads will be lost.
            </span>
            <div className="flex gap-4 mt-2">
              <Button
                variant="outline"
                className="px-6"
                onClick={() => setShowCancelModal(false)}
              >
                Go Back
              </Button>
              <Button
                className="bg-[#1162A8] hover:bg-[#0f5490] text-white px-6"
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
