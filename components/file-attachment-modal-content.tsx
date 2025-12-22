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
  Eye,
  X,
  Upload,
  ChevronDown,
  ChevronRight,
  Calendar,
  Trash2,
  Download,
  FileText,
} from "lucide-react"
import Image from "next/image"
import SimpleSTLViewer from "./demo/simple-stl-generator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSlipCreation } from "../contexts/slip-creation-context"

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

const SectionHeader = ({
  title,
  fileCount,
  slipNumber,
  isExpanded,
  onToggle,
}: {
  title: string
  fileCount: number
  slipNumber: string
  isExpanded: boolean
  onToggle: () => void
}) => (
  <div
    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-100 rounded-lg transition"
    onClick={onToggle}
    style={{ userSelect: "none" }}
  >
    {isExpanded ? (
      <ChevronDown className="w-5 h-5 text-gray-500" />
    ) : (
      <ChevronRight className="w-5 h-5 text-gray-500" />
    )}
    <div className="flex items-center gap-2">
      <FileText className="w-5 h-5 text-blue-600" />
      <span className="font-semibold text-lg">{title}</span>
      <Badge variant="secondary" className="text-xs">{fileCount} files</Badge>
      <span className="text-xs text-gray-500">Slip # {slipNumber}</span>
    </div>
  </div>
)

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
    Array<{ file: File, url: string, type: "stl" | "image" | "other" }>
  >([])
  const [description, setDescription] = useState("")
  const [expandedSections, setExpandedSections] = useState<string[]>(["custom-tray", "bite-block"])
  const [showListing, setShowListing] = useState(false)
  const [autoOpenStlUrl, setAutoOpenStlUrl] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
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
        let type: "stl" | "image" | "other" = "other"
        if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
        else if (file.type.startsWith("image/")) type = "image"
        return { file, url, type }
      })
      setSimulatedUploads(prev => {
        const stlFile = newUploads.find(f => f.type === "stl")
        if (stlFile) setAutoOpenStlUrl(stlFile.url)
        return [...prev, ...newUploads]
      })
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
        let type: "stl" | "image" | "other" = "other"
        if (file.name.toLowerCase().endsWith(".stl")) type = "stl"
        else if (file.type.startsWith("image/")) type = "image"
        return { file, url, type }
      })
      setSimulatedUploads(prev => {
        const stlFile = newUploads.find(f => f.type === "stl")
        if (stlFile) setAutoOpenStlUrl(stlFile.url)
        return [...prev, ...newUploads]
      })
    }
  }, [])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  const mockTotalSize = 0 * 1024 * 1024
  const uploadedFilesSize = simulatedUploads.reduce((sum, { file }) => sum + file.size, 0)
  const totalSizeMB = ((mockTotalSize + uploadedFilesSize) / (1024 * 1024)).toFixed(2)

  const stlUploads = simulatedUploads.filter(({ type }) => type === "stl")
  const imageUploads = simulatedUploads.filter(({ type }) => type === "image")

  // If a slipId is provided, fetch remote attachments and merge them into simulatedUploads for preview
  useEffect(() => {
    if (!slipId) return
    let mounted = true
    ;(async () => {
      try {
        const data = await fetchSlipAttachments(Number(slipId))
        if (!mounted || !data || !Array.isArray(data)) return
        const mapped = data.map((a: any) => {
          const type = a.is_stl ? "stl" : a.is_image ? "image" : a.is_pdf ? "pdf" : "other"
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
  }

  // Restore view STL file function for individual STL file
  const handleViewStlFile = (url: string) => {
    const viewerEl = document.querySelector(`[data-viewer-key="${url}"]`)
    if (viewerEl) {
      viewerEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
  }

  return (
    <div className="flex h-[90vh] bg-white rounded-lg">
      <div className="p-6 border-r w-[400px] flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Attachment</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAttachModal(false)}>
            <X className="w-4 h-4" />
          </Button>
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
          <p className="text-sm text-gray-500 mb-2">Drag & drop files here</p>
          <p className="text-sm text-gray-500">or click to browse files.</p>
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
        <div className="flex justify-end gap-3">
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

      {/* Right side: Accordion sectioned file preview */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <span className="font-medium">Dr: {doctorName || "-"}</span>
              <span className="mx-2">•</span>
              <span className="font-medium">Patient: {patientName || "-"}</span>
              <span className="mx-2">•</span>
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
              <Eye className="w-4 h-4 mr-2" />
              Hide Achived
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
            <div className="space-y-8">
              {/* Dynamic Stage Sections */}
              {stages.map((stage, stageIdx) => {
                const stageFiles = filesByStage[stage] || []
                const stageKey = stage.toLowerCase().replace(/\s+/g, "-")
                return (
                  <div key={stage} className="border rounded-lg mb-8">
                    <div
                      className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-100 rounded-t-lg transition"
                      onClick={() => toggleAccordion(stageKey)}
                      style={{ userSelect: "none" }}
                    >
                      {expanded[stageKey] ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-lg">{stage}</span>
                      <Badge variant="secondary" className="text-xs">{stageFiles.length} files</Badge>
                      {savedProducts.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {savedProducts.filter(p => 
                            (p.maxillaryStage === stage && p.maxillaryTeeth.length > 0) ||
                            (p.mandibularStage === stage && p.mandibularTeeth.length > 0)
                          ).map(p => p.product.name).join(", ")}
                        </span>
                      )}
                    </div>
                    {expanded[stageKey] && (
                      <div className="p-4 grid grid-cols-3 gap-6">
                        {stageFiles.map(({ file, url }, idx) => {
                          const isStl = file.name?.toLowerCase().endsWith(".stl") || url.toLowerCase().endsWith(".stl")
                          const isImage = file.type?.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          
                          if (isStl) {
                            // STL file rendering
                            const imageThumbnails = selectedImageThumbnailUrls
                            return (
                              <div
                                key={url}
                                className={`bg-white rounded-xl shadow p-4 relative flex flex-col items-center w-full max-w-md mx-auto border-2 border-blue-200 ${
                                  selectedStlUrls.includes(url) ? "ring-2 ring-blue-500" : ""
                                }`}
                              >
                                {/* Checkbox top-left */}
                                <input
                                  type="checkbox"
                                  checked={selectedStlUrls.includes(url)}
                                  onChange={() => handleToggleStlCheckbox(url)}
                                  className="absolute top-2 left-2 w-5 h-5 accent-blue-600 z-20"
                                  title="Show in STL Viewer"
                                />
                                <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
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
                                  <div className="absolute top-2 right-2 text-xs text-gray-700 font-semibold bg-white rounded px-2 py-1 shadow border border-gray-200 z-10">
                                    ID: {547896 + idx}
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium shadow hover:bg-blue-800 transition"
                                    style={{ zIndex: 10 }}
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleViewStlFile(url)
                                    }}
                                  >
                                    View File
                                  </button>
                                </div>
                                <div className="w-full px-2">
                                  <div className="truncate font-medium text-base mb-1">{file.name || 'STL File'}</div>
                                  <div className="text-xs text-gray-500 mb-2">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(file.lastModified || Date.now()).toLocaleDateString()} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Delete"
                                      onClick={() => handleDeleteFile(url)}
                                    >
                                      <Trash2 className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                      <Download className="w-4 h-4 text-gray-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          } else if (isImage) {
                            // Image file rendering
                            return (
                              <div key={url} className="bg-white rounded-xl shadow p-4 relative flex flex-col items-center w-full max-w-md mx-auto border-2 border-blue-200">
                                {/* Checkbox top-left for image selection (multi-select) */}
                                <input
                                  type="checkbox"
                                  checked={selectedImageThumbnailUrls.includes(url)}
                                  onChange={() => setSelectedImageThumbnailUrls(
                                    selectedImageThumbnailUrls.includes(url)
                                      ? selectedImageThumbnailUrls.filter(u => u !== url)
                                      : [...selectedImageThumbnailUrls, url]
                                  )}
                                  className="absolute top-2 left-2 w-5 h-5 accent-blue-600 z-20"
                                  title="Use as STL Viewer Thumbnail"
                                />
                                <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                  <img src={url} alt={file.name || 'Image'} className="object-cover w-full h-full rounded-lg" />
                                  <div className="absolute top-2 right-2 text-xs text-gray-700 font-semibold bg-white rounded px-2 py-1 shadow border border-gray-200 z-10">
                                    ID: {547896 + idx}
                                  </div>
                                </div>
                                <div className="w-full px-2">
                                  <div className="truncate font-medium text-base mb-1">{file.name || 'Image'}</div>
                                  <div className="text-xs text-gray-500 mb-2">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(file.lastModified || Date.now()).toLocaleDateString()} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Delete"
                                      onClick={() => handleDeleteFile(url)}
                                    >
                                      <Trash2 className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                      <Download className="w-4 h-4 text-gray-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          } else {
                            // Other file types
                            return (
                              <div key={url} className="bg-white rounded-xl shadow p-4 relative flex flex-col items-center w-full max-w-md mx-auto border-2 border-blue-200">
                                <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                  <FileText className="w-16 h-16 text-gray-300" />
                                  <div className="absolute top-2 right-2 text-xs text-gray-700 font-semibold bg-white rounded px-2 py-1 shadow border border-gray-200 z-10">
                                    ID: {547896 + idx}
                                  </div>
                                </div>
                                <div className="w-full px-2">
                                  <div className="truncate font-medium text-base mb-1">{file.name || 'File'}</div>
                                  <div className="text-xs text-gray-500 mb-2">{`${(file.size / 1024 / 1024).toFixed(2)} MB`}</div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(file.lastModified || Date.now()).toLocaleDateString()} @ {new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="Delete"
                                      onClick={() => handleDeleteFile(url)}
                                    >
                                      <Trash2 className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-200 rounded" title="Download">
                                      <Download className="w-4 h-4 text-gray-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          }
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
      {/* ...existing file input and cancel modal... */}
      <input type="file" style={{ display: "none" }} onChange={handleFileChange} multiple ref={fileInputRef} />

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
