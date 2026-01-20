"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { STLFileSelectionModal } from "./stl-file-selection-modal"

interface ImpressionOption {
  id: number
  name: string
  code?: string
  description?: string
  image_url?: string
  value: string
  label: string
}

interface STLFile {
  file: File
  url: string
  description?: string
}

interface ImpressionSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  impressions: ImpressionOption[]
  selectedImpressions: Record<string, number> // key: impression name, value: quantity
  onUpdateQuantity: (impressionKey: string, quantity: number) => void
  onRemoveImpression: (impressionKey: string) => void
  onSTLFilesAttached?: (files: STLFile[], impressionKey: string) => void
  productId: string
  arch: "maxillary" | "mandibular"
  stlFilesByImpression?: Record<string, STLFile[]>
}

export function ImpressionSelectionModal({
  isOpen,
  onClose,
  impressions,
  selectedImpressions,
  onUpdateQuantity,
  onRemoveImpression,
  onSTLFilesAttached,
  productId,
  arch,
  stlFilesByImpression = {},
}: ImpressionSelectionModalProps) {
  const [showSTLModal, setShowSTLModal] = useState(false)
  const [selectedSTLImpression, setSelectedSTLImpression] = useState<ImpressionOption | null>(null)
  const getImpressionKey = (impression: ImpressionOption) => {
    const identifier = impression.value || impression.name
    return `${productId}_${arch}_${identifier}`
  }

  const getQuantity = (impression: ImpressionOption) => {
    const key = getImpressionKey(impression)
    return selectedImpressions[key] || 0
  }

  const handleIncrement = (impression: ImpressionOption) => {
    const key = getImpressionKey(impression)
    const currentQty = getQuantity(impression)
    onUpdateQuantity(key, currentQty + 1)
  }

  const handleDecrement = (impression: ImpressionOption) => {
    const key = getImpressionKey(impression)
    const currentQty = getQuantity(impression)
    if (currentQty > 0) {
      onUpdateQuantity(key, currentQty - 1)
    }
  }

  const handleDelete = (impression: ImpressionOption) => {
    const key = getImpressionKey(impression)
    onRemoveImpression(key)
  }

  // Check if impression is STL file type
  const isSTLImpression = (impression: ImpressionOption): boolean => {
    const name = impression.name.toLowerCase()
    const code = impression.code?.toLowerCase() || ""
    return name.includes("stl") || code === "stl" || name === "stl file"
  }

  // Handle impression click - open STL modal if STL, otherwise increment
  const handleImpressionClick = (impression: ImpressionOption) => {
    if (isSTLImpression(impression)) {
      setSelectedSTLImpression(impression)
      setShowSTLModal(true)
    } else {
      handleIncrement(impression)
    }
  }

  // Handle STL files confirmation
  const handleSTLFilesConfirmed = (files: STLFile[]) => {
    if (!selectedSTLImpression || !onSTLFilesAttached) return
    
    const key = getImpressionKey(selectedSTLImpression)
    
    // Update quantity to match number of STL files
    const fileCount = files.length
    onUpdateQuantity(key, fileCount)
    
    // Attach STL files (even if empty, to clear existing files)
    onSTLFilesAttached(files, key)
    
    setShowSTLModal(false)
    setSelectedSTLImpression(null)
  }

  // Get existing STL files for an impression
  const getExistingSTLFiles = (impression: ImpressionOption): STLFile[] => {
    const key = getImpressionKey(impression)
    return stlFilesByImpression[key] || []
  }

  // Sort impressions: selected ones first, then alphabetically
  const sortedImpressions = [...impressions].sort((a, b) => {
    const qtyA = getQuantity(a)
    const qtyB = getQuantity(b)

    if (qtyA > 0 && qtyB === 0) return -1
    if (qtyA === 0 && qtyB > 0) return 1

    return a.name.localeCompare(b.name)
  })

  // Count only selections relevant to this modal's product and arch
  const modalSelectedCount = impressions.reduce((sum, impression) => {
    return sum + getQuantity(impression)
  }, 0)

  // Function to get dental impression image from API
  const getImpressionImage = (impression: ImpressionOption): string | null => {
    // Return the image_url from the API if available
    if (impression.image_url) {
      return impression.image_url
    }
    
    // Return null if no image is available from API
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4">
          <DialogTitle className="text-xl font-semibold">
            Select Impressions - {arch.charAt(0).toUpperCase() + arch.slice(1)}
            {modalSelectedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({modalSelectedCount} selected)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-6 gap-3">
            {sortedImpressions.map((impression) => {
              const qty = getQuantity(impression)
              const isSelected = qty > 0

              return (
                <div
                  key={impression.id}
                  className={cn(
                    "relative border-2 rounded-lg overflow-hidden transition-all duration-200 bg-white flex flex-col cursor-pointer h-[280px]",
                    isSelected
                      ? "border-blue-500 shadow-xl"
                      : "border-gray-300 hover:border-blue-500 hover:shadow-xl"
                  )}
                >
                  {/* Image */}
                  <div className="w-full h-40 bg-gray-50 overflow-hidden relative flex items-center justify-center">
                    {getImpressionImage(impression) ? (
                      <img
                        width={400}
                        height={400}
                        src={getImpressionImage(impression)!}
                        alt={impression.name}
                        className="max-w-full max-h-full object-contain object-center"
                        onError={(e) => {
                          // Fallback if image fails to load
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          const parent = target.parentElement
                          if (parent && !parent.querySelector('.fallback-letter')) {
                            const fallbackDiv = document.createElement('div')
                            fallbackDiv.className = 'fallback-letter text-gray-400 text-3xl font-bold flex items-center justify-center absolute inset-0'
                            fallbackDiv.textContent = impression.name.charAt(0).toUpperCase()
                            parent.appendChild(fallbackDiv)
                          }
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-3xl font-bold flex items-center justify-center absolute inset-0">
                        {impression.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-2 border-t-2 border-gray-300 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm text-gray-900 mb-1 text-center min-h-[2rem] flex items-center justify-center leading-tight">
                      {impression.name}
                    </h3>
                    {impression.description && (
                      <p className="text-xs text-gray-600 mb-2 text-center line-clamp-2">
                        {impression.description}
                      </p>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      {isSelected ? (
                        <>
                          {/* Quantity controls */}
                          <div className="flex items-center gap-1 flex-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-md border-2 hover:bg-gray-100"
                              onClick={() => handleDecrement(impression)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="flex-1 text-center font-bold text-base">
                              {qty}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-md border-2 hover:bg-gray-100"
                              onClick={() => handleIncrement(impression)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            {isSTLImpression(impression) ? (
                              <Button
                                size="sm"
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs"
                                onClick={() => {
                                  setSelectedSTLImpression(impression)
                                  setShowSTLModal(true)
                                }}
                              >
                                Files
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs"
                                onClick={onClose}
                              >
                                Done
                              </Button>
                            )}
                          </div>
                          {/* Delete button */}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0 rounded-md"
                            onClick={() => handleDelete(impression)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full h-8 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                          onClick={() => handleImpressionClick(impression)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                      {qty}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {impressions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No impressions available
            </div>
          )}
        </div>

        {/* Footer with action button */}
        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {modalSelectedCount > 0 && (
            <Button onClick={onClose}>
              Done ({modalSelectedCount} selected)
            </Button>
          )}
        </div>
      </DialogContent>

      {/* STL File Selection Modal */}
      {selectedSTLImpression && (
        <STLFileSelectionModal
          isOpen={showSTLModal}
          onClose={() => {
            setShowSTLModal(false)
            setSelectedSTLImpression(null)
          }}
          onConfirm={handleSTLFilesConfirmed}
          productId={productId}
          arch={arch}
          impressionName={selectedSTLImpression.name}
          existingFiles={getExistingSTLFiles(selectedSTLImpression)}
        />
      )}
    </Dialog>
  )
}
