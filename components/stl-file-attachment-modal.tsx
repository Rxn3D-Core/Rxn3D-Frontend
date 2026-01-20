"use client"

import React, { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip, Upload, X } from "lucide-react"

interface STLFileAttachmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAttachFiles: (files: File[], description: string) => void
}

export function STLFileAttachmentModal({
  isOpen,
  onClose,
  onAttachFiles,
}: STLFileAttachmentModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles))
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
    const droppedFiles = event.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      setFiles(Array.from(droppedFiles))
    }
  }, [])

  const handleAttachFiles = () => {
    if (files.length > 0) {
      onAttachFiles(files, description)
      // Reset state
      setFiles([])
      setDescription("")
      onClose()
    }
  }

  const handleClose = () => {
    setFiles([])
    setDescription("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              <DialogTitle className="text-xl font-semibold">Attach Files</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          <p className="text-sm text-gray-600 mb-6">
            Upload case files, scans, photos or documents related to this treatment.
          </p>

          {/* File Upload Area */}
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

          {/* Selected files display */}
          {files.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {files.length} file{files.length > 1 ? 's' : ''} selected:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="truncate">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description Input */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Label or describe this attachment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttachFiles}
              disabled={files.length === 0}
              className="bg-[#1162A8] hover:bg-[#0f5490] text-white px-6"
            >
              Attach Files
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          style={{ display: "none" }}
        />
      </DialogContent>
    </Dialog>
  )
}
