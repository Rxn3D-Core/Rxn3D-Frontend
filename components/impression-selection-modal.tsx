"use client"

import { Check, Minus, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { useState } from "react"
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
  onConfirm?: () => void
  impressions: ImpressionOption[]
  selectedImpressions: Record<string, number>
  onUpdateQuantity: (impressionKey: string, quantity: number) => void
  onRemoveImpression: (impressionKey: string) => void
  onSTLFilesAttached?: (files: STLFile[], impressionKey: string) => void
  productId: string
  arch: "maxillary" | "mandibular"
  stlFilesByImpression?: Record<string, STLFile[]>
  oppositeImpression?: "Yes" | "No"
  oppositeImpressions?: ImpressionOption[]
  onSubmitNoOpposing?: () => void
}

function ImpressionGrid({
  impressions,
  selectedImpressions,
  onUpdateQuantity,
  onSTLFilesAttached,
  productId,
  arch,
  stlFilesByImpression = {},
  showDoneCheckmark,
  onDone,
}: {
  impressions: ImpressionOption[]
  selectedImpressions: Record<string, number>
  onUpdateQuantity: (key: string, qty: number) => void
  onSTLFilesAttached?: (files: STLFile[], key: string) => void
  productId: string
  arch: "maxillary" | "mandibular"
  stlFilesByImpression?: Record<string, STLFile[]>
  showDoneCheckmark: boolean
  onDone?: () => void
}) {
  const [showSTLModal, setShowSTLModal] = useState(false)
  const [selectedSTLImpression, setSelectedSTLImpression] = useState<ImpressionOption | null>(null)
  const [lastTouchedKey, setLastTouchedKey] = useState<string | null>(null)

  const getKey = (impression: ImpressionOption) =>
    `${productId}_${arch}_${impression.value || impression.name}`

  const getQty = (impression: ImpressionOption) =>
    selectedImpressions[getKey(impression)] || 0

  const isSTL = (impression: ImpressionOption) => {
    const name = impression.name.toLowerCase()
    const code = impression.code?.toLowerCase() || ""
    return name.includes("stl") || code === "stl" || name === "stl file"
  }

  const handleCardClick = (impression: ImpressionOption) => {
    if (getQty(impression) > 0) return
    const key = getKey(impression)
    if (isSTL(impression)) {
      setSelectedSTLImpression(impression)
      setShowSTLModal(true)
    } else {
      onUpdateQuantity(key, 1)
      setLastTouchedKey(key)
    }
  }

  const handleIncrement = (impression: ImpressionOption, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = getKey(impression)
    if (isSTL(impression)) {
      setSelectedSTLImpression(impression)
      setShowSTLModal(true)
    } else {
      onUpdateQuantity(key, getQty(impression) + 1)
      setLastTouchedKey(key)
    }
  }

  const handleDecrement = (impression: ImpressionOption, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = getKey(impression)
    const qty = getQty(impression)
    if (qty > 1) {
      onUpdateQuantity(key, qty - 1)
      setLastTouchedKey(key)
    }
  }

  const handleRemove = (impression: ImpressionOption, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = getKey(impression)
    onUpdateQuantity(key, 0)
    if (lastTouchedKey === key) setLastTouchedKey(null)
  }

  const handleSTLConfirmed = (files: STLFile[]) => {
    if (!selectedSTLImpression || !onSTLFilesAttached) return
    const key = getKey(selectedSTLImpression)
    onUpdateQuantity(key, files.length)
    onSTLFilesAttached(files, key)
    setLastTouchedKey(key)
    setShowSTLModal(false)
    setSelectedSTLImpression(null)
  }

  const renderCard = (impression: ImpressionOption, compact: boolean) => {
    const qty = getQty(impression)
    const isSelected = qty > 0
    const key = getKey(impression)
    const canCheck = showDoneCheckmark && key === lastTouchedKey && qty >= 1

    const imgSize = compact ? "text-2xl" : "text-3xl lg:text-4xl"
    const nameSize = compact ? "text-xs" : "text-sm lg:text-base"
    const controlSize = compact ? "w-5 h-5" : "w-6 h-6"
    const iconSize = compact ? "w-4 h-4" : "w-5 h-5"
    const qtyTextSize = compact ? "text-xs min-w-[16px]" : "text-sm min-w-[20px]"
    const qtyLabelSize = compact ? "text-xs" : "text-sm"

    return (
      <div
        key={impression.id}
        className={cn(
          "flex flex-col items-center rounded-[11px] transition-all duration-200 p-2 lg:p-3 cursor-pointer select-none h-full",
          isSelected
            ? "border-[3px] border-[#1162A8]"
            : "border-2 border-[#B4B0B0]"
        )}
        onClick={() => handleCardClick(impression)}
      >
        {/* Image */}
        <div className="w-full aspect-square rounded-[8px] overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
          {impression.image_url ? (
            <img
              src={impression.image_url}
              alt={impression.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = "none"
                const parent = el.parentElement
                if (parent && !parent.querySelector(".fallback-letter")) {
                  const div = document.createElement("div")
                  div.className = `fallback-letter text-[#B4B0B0] ${imgSize} font-bold flex items-center justify-center w-full h-full`
                  div.textContent = impression.name.charAt(0).toUpperCase()
                  parent.appendChild(div)
                }
              }}
            />
          ) : (
            <div className={cn("text-[#B4B0B0] font-bold flex items-center justify-center w-full h-full", imgSize)}>
              {impression.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <span className={cn("font-['Verdana'] font-normal text-black text-center mt-1.5 w-full flex-1 flex items-end justify-center pb-1", nameSize)}>
          {impression.name}
        </span>

        {/* Controls — always pinned to bottom */}
        <div
          className="flex items-center gap-1 mt-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {qty === 0 ? (
            <span
              className={cn("font-['Verdana'] text-[#7F7F7F] cursor-pointer", qtyLabelSize)}
              onClick={() => handleCardClick(impression)}
            >
              QTY +
            </span>
          ) : (
            <>
              {/* Trash */}
              <button
                className={cn("flex items-center justify-center flex-shrink-0", controlSize)}
                onClick={(e) => handleRemove(impression, e)}
              >
                <Trash2 className={cn("text-[#CF0202]", iconSize)} strokeWidth={1.83} />
              </button>

              {/* Minus — only when qty > 1 */}
              {qty > 1 && (
                <button
                  className={cn("flex items-center justify-center flex-shrink-0", controlSize)}
                  onClick={(e) => handleDecrement(impression, e)}
                >
                  <Minus className={cn("text-[#1E1E1E]", iconSize)} strokeWidth={1.83} />
                </button>
              )}

              {/* Quantity */}
              <span className={cn("font-['Verdana'] font-normal text-black text-center", qtyTextSize)}>
                {qty}
              </span>

              {/* Plus */}
              <button
                className={cn("flex items-center justify-center flex-shrink-0", controlSize)}
                onClick={(e) => handleIncrement(impression, e)}
              >
                <Plus className={cn("text-[#1D1B20]", iconSize)} strokeWidth={1.83} />
              </button>

              {/* Checkmark (Done) */}
              {canCheck && (
                <button
                  className={cn("flex items-center justify-center flex-shrink-0", controlSize)}
                  onClick={(e) => { e.stopPropagation(); onDone?.() }}
                >
                  <Check className={cn("text-[#22c55e]", iconSize)} strokeWidth={2.5} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: horizontal carousel */}
      <div className="flex sm:hidden gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide w-full">
        {impressions.map((impression) => (
          <div key={impression.id} className="snap-center flex-shrink-0 w-[140px]">
            {renderCard(impression, true)}
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 w-full">
        {impressions.map((impression) => renderCard(impression, false))}
      </div>

      {selectedSTLImpression && (
        <STLFileSelectionModal
          isOpen={showSTLModal}
          onClose={() => {
            setShowSTLModal(false)
            setSelectedSTLImpression(null)
          }}
          onConfirm={handleSTLConfirmed}
          productId={productId}
          arch={arch}
          impressionName={selectedSTLImpression.name}
          existingFiles={stlFilesByImpression[getKey(selectedSTLImpression)] || []}
        />
      )}
    </>
  )
}

export function ImpressionSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  impressions,
  selectedImpressions,
  onUpdateQuantity,
  onRemoveImpression,
  onSTLFilesAttached,
  productId,
  arch,
  stlFilesByImpression = {},
  oppositeImpression = "No",
  oppositeImpressions,
  onSubmitNoOpposing,
}: ImpressionSelectionModalProps) {
  const oppositeArch = arch === "maxillary" ? "mandibular" : "maxillary"
  const oppositeList = oppositeImpressions ?? impressions
  const isDualArch = oppositeImpression === "Yes"

  const mainPrefix = `${productId}_${arch}_`
  const hasMainSelection = Object.entries(selectedImpressions).some(
    ([key, qty]) => key.startsWith(mainPrefix) && qty > 0
  )

  const oppositePrefix = `${productId}_${oppositeArch}_`
  const hasOpposingSelection = Object.entries(selectedImpressions).some(
    ([key, qty]) => key.startsWith(oppositePrefix) && qty > 0
  )

  const archLabel = arch === "maxillary" ? "Maxillary" : "Mandibular"
  const oppositeArchLabel = oppositeArch === "maxillary" ? "Maxillary" : "Mandibular"

  const handleDone = () => {
    onConfirm?.()
    onClose()
  }

  const sharedGridProps = {
    selectedImpressions,
    onUpdateQuantity,
    onRemoveImpression,
    onSTLFilesAttached,
    stlFilesByImpression,
    onDone: handleDone,
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0 border-0 rounded-none">
        <div className="flex flex-col px-3 sm:px-6 md:px-12 lg:px-[100px] py-6 sm:py-10 md:py-[71px] gap-6 bg-white w-full overflow-y-auto max-h-[100vh]">

          {/* Main arch section */}
          <div
            className={cn(
              "relative rounded-[12px] px-4 sm:px-6 pt-7 pb-5 border-2 transition-colors",
              hasMainSelection ? "border-[#22c55e]" : "border-[#CF0202]"
            )}
          >
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 font-['Verdana'] font-bold text-sm sm:text-base whitespace-nowrap",
                hasMainSelection ? "text-[#22c55e]" : "text-[#CF0202]"
              )}
            >
              Select {archLabel} Impressions
            </span>
            <ImpressionGrid
              {...sharedGridProps}
              impressions={impressions}
              productId={productId}
              arch={arch}
              showDoneCheckmark={!isDualArch}
            />
          </div>

          {/* Opposing arch section — always visible in dual arch; locked until primary selected */}
          {isDualArch && (
            <div
              className={cn(
                "relative rounded-[12px] px-4 sm:px-6 pt-7 pb-5 border-2 transition-all duration-300",
                hasOpposingSelection ? "border-[#22c55e]" : "border-[#CF0202]",
                !hasMainSelection && "opacity-40 pointer-events-none"
              )}
            >
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 font-['Verdana'] font-bold text-sm sm:text-base whitespace-nowrap",
                  hasOpposingSelection ? "text-[#22c55e]" : "text-[#CF0202]"
                )}
              >
                Select {oppositeArchLabel} Impressions
              </span>
              <ImpressionGrid
                {...sharedGridProps}
                impressions={oppositeList}
                productId={productId}
                arch={oppositeArch}
                showDoneCheckmark={true}
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => onSubmitNoOpposing ? onSubmitNoOpposing() : handleDone()}
                  className="px-5 py-1.5 bg-[#CF0202] hover:bg-[#910202] text-white rounded font-['Verdana'] font-bold text-sm transition-colors"
                >
                  Skip Opposing
                </button>
              </div>
            </div>
          )}

          {impressions.length === 0 && (
            <div className="text-center py-8 sm:py-12 text-[#7F7F7F] font-['Verdana'] text-sm sm:text-lg w-full">
              No impressions available
            </div>
          )}

          {/* Cancel */}
          <div className="flex justify-start">
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-[#CF0202] hover:bg-[#910202] text-white rounded-[6px] font-['Verdana'] font-bold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
