"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Upload, X, Trash2, FileText } from "lucide-react"

interface STLFile {
  file: File
  url: string
  description?: string
}

interface STLFileSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (files: STLFile[]) => void
  productId: string
  arch: "maxillary" | "mandibular"
  impressionName: string
  existingFiles?: STLFile[]
}

export function STLFileSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  productId,
  arch,
  impressionName,
  existingFiles = [],
}: STLFileSelectionModalProps) {
  const [stlFiles, setStlFiles] = useState<STLFile[]>(existingFiles)
  const [description, setDescription] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStlFiles(existingFiles)
      setDescription("")
    }
  }, [isOpen, existingFiles])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      stlFiles.forEach(({ url }) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [stlFiles])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        file,
        url: URL.createObjectURL(file),
        description: "",
      }))
      
      setStlFiles(prev => [...prev, ...newFiles])
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
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
      const newFiles = Array.from(files).map(file => ({
        file,
        url: URL.createObjectURL(file),
        description: "",
      }))
      
      setStlFiles(prev => [...prev, ...newFiles])
    }
  }, [])

  const handleDeleteFile = (url: string) => {
    setStlFiles(prev => {
      const fileToRemove = prev.find(f => f.url === url)
      if (fileToRemove && fileToRemove.url.startsWith("blob:")) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      return prev.filter(f => f.url !== url)
    })
  }

  const handleConfirm = () => {
    onConfirm(stlFiles)
    onClose()
  }

  const handleCancel = () => {
    // Cleanup blob URLs for files that weren't confirmed
    stlFiles.forEach(({ url }) => {
      if (url.startsWith("blob:") && !existingFiles.find(ef => ef.url === url)) {
        URL.revokeObjectURL(url)
      }
    })
    setStlFiles(existingFiles)
    setDescription("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-gray-700" />
              <DialogTitle className="text-xl font-semibold">
                Attach Files
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Upload STL files, scans, photos or documents related to this treatment.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Drag & Drop Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleUploadButtonClick}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-2">Drag & drop files here</p>
            <p className="text-sm text-gray-500">or click to browse files.</p>
          </div>

          {/* Description Field */}
          <Textarea
            placeholder="Label or describe this attachment"
            className="w-full"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Selected Files List (if any) */}
          {stlFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected Files ({stlFiles.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stlFiles.map((stlFile, idx) => (
                  <div
                    key={stlFile.url}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {stlFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(stlFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={() => handleDeleteFile(stlFile.url)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={stlFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Attach Files
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          multiple
          ref={fileInputRef}
        />
      </DialogContent>
    </Dialog>
  )
}
