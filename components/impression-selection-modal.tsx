"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Plus, Minus } from "lucide-react"
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
  selectedImpressions: Record<string, number>
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
  const [lastTouchedKey, setLastTouchedKey] = useState<string | null>(null)

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
    setLastTouchedKey(key)
  }

  const handleDecrement = (impression: ImpressionOption) => {
    const key = getImpressionKey(impression)
    const currentQty = getQuantity(impression)
    if (currentQty > 1) {
      onUpdateQuantity(key, currentQty - 1)
      setLastTouchedKey(key)
    } else if (currentQty === 1) {
      // going to 0 — move "last touched" to another card that still has quantity
      onUpdateQuantity(key, 0)
      setLastTouchedKey((prev) => {
        if (prev !== key) return prev
        // Find another impression that still has quantity > 0
        const otherKey = impressions
          .map(getImpressionKey)
          .find((k) => k !== key && (selectedImpressions[k] ?? 0) > 0)
        return otherKey ?? null
      })
    }
  }

  const isSTLImpression = (impression: ImpressionOption): boolean => {
    const name = impression.name.toLowerCase()
    const code = impression.code?.toLowerCase() || ""
    return name.includes("stl") || code === "stl" || name === "stl file"
  }

  const handleImpressionClick = (impression: ImpressionOption) => {
    const key = getImpressionKey(impression)
    setLastTouchedKey(key)
    if (isSTLImpression(impression)) {
      setSelectedSTLImpression(impression)
      setShowSTLModal(true)
    } else {
      handleIncrement(impression)
    }
  }

  const handleSTLFilesConfirmed = (files: STLFile[]) => {
    if (!selectedSTLImpression || !onSTLFilesAttached) return
    const key = getImpressionKey(selectedSTLImpression)
    const fileCount = files.length
    onUpdateQuantity(key, fileCount)
    onSTLFilesAttached(files, key)
    setLastTouchedKey(key)
    setShowSTLModal(false)
    setSelectedSTLImpression(null)
  }

  const getExistingSTLFiles = (impression: ImpressionOption): STLFile[] => {
    const key = getImpressionKey(impression)
    return stlFilesByImpression[key] || []
  }

  const getImpressionImage = (impression: ImpressionOption): string | null => {
    if (impression.image_url) {
      return impression.image_url
    }
    return null
  }

  // The "last touched" card key — valid only if it still has quantity > 0
  const activeDoneKey = lastTouchedKey && (selectedImpressions[lastTouchedKey] ?? 0) > 0
    ? lastTouchedKey
    : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0 border-0 rounded-none">
        {/* Product gallery container */}
        <div className="flex flex-col justify-center items-start px-3 sm:px-6 md:px-12 lg:px-[100px] py-6 sm:py-10 md:py-[71px] gap-4 sm:gap-[25px] bg-white w-full overflow-y-auto max-h-[100vh]">
          {/* Title */}
          <h2 className="font-['Verdana'] font-bold text-lg sm:text-2xl md:text-[30px] leading-tight sm:leading-[63px] tracking-[-0.02em] text-black">
            Select Impressions
          </h2>

          {/* Mobile: horizontal carousel */}
          <div className="flex sm:hidden gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide w-full">
            {impressions.map((impression) => {
              const qty = getQuantity(impression)
              const isSelected = qty > 0
              const isLastSelected = getImpressionKey(impression) === activeDoneKey

              return (
                <div key={impression.id} className="flex flex-col items-center snap-center flex-shrink-0 w-[150px]">
                  {/* Card */}
                  <div
                    className={cn(
                      "flex flex-col justify-center items-center px-2 py-[8px] gap-[8px] bg-white rounded-[11px] transition-all duration-200 w-full",
                      isSelected
                        ? "border-[4px] border-[#1162A8]"
                        : "border-2 border-[#B4B0B0]"
                    )}
                  >
                    {/* Image */}
                    <div className="w-full aspect-square rounded-[8px] overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
                      {getImpressionImage(impression) ? (
                        <img
                          width={201}
                          height={201}
                          src={getImpressionImage(impression)!}
                          alt={impression.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.fallback-letter')) {
                              const fallbackDiv = document.createElement('div')
                              fallbackDiv.className = 'fallback-letter text-[#B4B0B0] text-2xl font-bold flex items-center justify-center w-full h-full'
                              fallbackDiv.textContent = impression.name.charAt(0).toUpperCase()
                              parent.appendChild(fallbackDiv)
                            }
                          }}
                        />
                      ) : (
                        <div className="text-[#B4B0B0] text-2xl font-bold flex items-center justify-center w-full h-full">
                          {impression.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <span className="font-['Verdana'] font-normal text-xs tracking-[-0.02em] text-black text-center w-full flex-shrink-0">
                      {impression.name}
                    </span>

                    {!isSelected && impression.description && (
                      <span className="font-['Verdana'] font-normal text-[10px] leading-[14px] tracking-[-0.02em] text-[#7F7F7F] text-center flex-shrink-0">
                        {impression.description}
                      </span>
                    )}
                  </div>

                  {/* Controls outside the card — always visible */}
                  <div className="flex flex-col items-center gap-1 mt-2">
                    {/* - qty + */}
                    <div className="flex flex-row items-center gap-[5px]">
                      <button
                        className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] border border-[#B4B0B0] bg-white hover:bg-gray-50 transition-all"
                        onClick={() => handleDecrement(impression)}
                      >
                        <Minus className="w-[13px] h-[13px] text-[#1E1E1E]" strokeWidth={1.83} />
                      </button>
                      <span className="font-['Verdana'] font-normal text-sm leading-[14px] tracking-[-0.02em] text-black text-center min-w-[30px] flex items-center justify-center h-[26px]">
                        {qty}
                      </span>
                      <button
                        className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] border border-[#B4B0B0] bg-white hover:bg-gray-50 transition-all"
                        onClick={() => handleImpressionClick(impression)}
                      >
                        <Plus className="w-[13px] h-[13px] text-[#1D1B20]" strokeWidth={1.83} />
                      </button>
                    </div>

                    {/* Done/Files button — only on last selected card */}
                    {isSelected && isLastSelected && (
                      isSTLImpression(impression) ? (
                        <button
                          className="flex items-center justify-center px-[8px] py-[6px] bg-[#1162A8] rounded-[4px] hover:bg-[#0e5290] transition-colors h-[26px]"
                          onClick={() => {
                            setSelectedSTLImpression(impression)
                            setShowSTLModal(true)
                          }}
                        >
                          <span className="font-['Verdana'] font-normal text-[11px] leading-[14px] tracking-[-0.02em] text-white">
                            Files
                          </span>
                        </button>
                      ) : (
                        <button
                          className="flex items-center justify-center px-[8px] py-[6px] bg-[#1162A8] rounded-[4px] hover:bg-[#0e5290] transition-colors h-[26px]"
                          onClick={onClose}
                        >
                          <span className="font-['Verdana'] font-normal text-[11px] leading-[14px] tracking-[-0.02em] text-white">
                            Done
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: grid layout - 6 per row */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 lg:gap-[24px] w-full">
            {impressions.map((impression) => {
              const qty = getQuantity(impression)
              const isSelected = qty > 0
              const isLastSelected = getImpressionKey(impression) === activeDoneKey

              return (
                <div key={impression.id} className="flex flex-col items-center">
                  {/* Card */}
                  <div
                    className={cn(
                      "flex flex-col justify-center items-center px-3 lg:px-[26px] py-[8px] gap-[10px] bg-white rounded-[11px] transition-all duration-200 w-full aspect-[254/303]",
                      isSelected
                        ? "border-[5px] border-[#1162A8]"
                        : "border-2 border-[#B4B0B0]"
                    )}
                  >
                    {/* Image */}
                    <div className="w-full aspect-square rounded-[8px] overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
                      {getImpressionImage(impression) ? (
                        <img
                          width={201}
                          height={201}
                          src={getImpressionImage(impression)!}
                          alt={impression.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.fallback-letter')) {
                              const fallbackDiv = document.createElement('div')
                              fallbackDiv.className = 'fallback-letter text-[#B4B0B0] text-3xl lg:text-4xl font-bold flex items-center justify-center w-full h-full'
                              fallbackDiv.textContent = impression.name.charAt(0).toUpperCase()
                              parent.appendChild(fallbackDiv)
                            }
                          }}
                        />
                      ) : (
                        <div className="text-[#B4B0B0] text-3xl lg:text-4xl font-bold flex items-center justify-center w-full h-full">
                          {impression.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <span className="font-['Verdana'] font-normal text-base lg:text-[23px] lg:leading-[25px] tracking-[-0.02em] text-black text-center w-full flex-shrink-0">
                      {impression.name}
                    </span>

                    {!isSelected && impression.description && (
                      <span className="font-['Verdana'] font-normal text-xs lg:text-[14px] leading-[22px] tracking-[-0.02em] text-[#7F7F7F] text-center flex-shrink-0">
                        {impression.description}
                      </span>
                    )}
                  </div>

                  {/* Controls outside the card — always visible */}
                  <div className="flex flex-col items-center gap-2 mt-2">
                    {/* - qty + */}
                    <div className="flex flex-row items-center gap-[5px]">
                      <button
                        className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-[#B4B0B0] bg-white hover:bg-gray-50 transition-all"
                        onClick={() => handleDecrement(impression)}
                      >
                        <Minus className="w-[15px] h-[15px] text-[#1E1E1E]" strokeWidth={1.83} />
                      </button>
                      <span className="font-['Verdana'] font-normal text-sm lg:text-[18px] leading-[14px] tracking-[-0.02em] text-black text-center min-w-[30px] lg:min-w-[46px] flex items-center justify-center h-[31px]">
                        {qty}
                      </span>
                      <button
                        className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] border border-[#B4B0B0] bg-white hover:bg-gray-50 transition-all"
                        onClick={() => handleImpressionClick(impression)}
                      >
                        <Plus className="w-[15px] h-[15px] text-[#1D1B20]" strokeWidth={1.83} />
                      </button>
                    </div>

                    {/* Done/Files button — only on last selected card */}
                    {isSelected && isLastSelected && (
                      isSTLImpression(impression) ? (
                        <button
                          className="flex items-center justify-center px-[10px] py-[8px] bg-[#1162A8] rounded-[4px] hover:bg-[#0e5290] transition-colors h-[31px]"
                          onClick={() => {
                            setSelectedSTLImpression(impression)
                            setShowSTLModal(true)
                          }}
                        >
                          <span className="font-['Verdana'] font-normal text-xs lg:text-[14px] leading-[14px] tracking-[-0.02em] text-white">
                            Files
                          </span>
                        </button>
                      ) : (
                        <button
                          className="flex items-center justify-center px-[10px] py-[8px] bg-[#1162A8] rounded-[4px] hover:bg-[#0e5290] transition-colors h-[31px]"
                          onClick={onClose}
                        >
                          <span className="font-['Verdana'] font-normal text-xs lg:text-[14px] leading-[14px] tracking-[-0.02em] text-white">
                            Done
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {impressions.length === 0 && (
            <div className="text-center py-8 sm:py-12 text-[#7F7F7F] font-['Verdana'] text-[14px] sm:text-[18px] w-full">
              No impressions available
            </div>
          )}

          {/* Cancel button - bottom right */}
          <div className="flex justify-end w-full">
            <button
              onClick={onClose}
              className="flex items-center justify-center px-[16px] py-[12px] border-2 border-[#9BA5B7] rounded-[6px] bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="font-['Verdana'] font-bold text-[12px] leading-[22px] tracking-[-0.02em] text-[#9BA5B7]">
                Cancel
              </span>
            </button>
          </div>
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
