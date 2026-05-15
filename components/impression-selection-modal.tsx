"use client"

import { Check, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { useState } from "react"
import { STLFileSelectionModal } from "./stl-file-selection-modal"
import type { ImpressionOptionForModal as ImpressionOption } from "@/components/case-design-center/types"

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
  /** When true, hides the 'Skip Opposing' button (used when both arches have their own products) */
  hideSkipOpposing?: boolean
  /** Optional title shown once above all arch sections (e.g. "Impressions") */
  modalHeading?: string
  /**
   * Dual-grid only: slip's main product arch — that section is shown first (top), opposing second (bottom).
   */
  dualImpressionPrimaryArch?: "maxillary" | "mandibular"
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
  const getImpressionLabel = (impression: ImpressionOption) =>
    impression.name ?? impression.code ?? impression.value ?? "Impression"
  const [lastTouchedKey, setLastTouchedKey] = useState<string | null>(() => {
    // On mount, restore check to the last impression in the list that already has qty > 0
    const buildKey = (imp: ImpressionOption) => `${productId}_${arch}_${imp.value || getImpressionLabel(imp)}`
    const preSelected = [...impressions].reverse().find(imp => (selectedImpressions[buildKey(imp)] || 0) > 0)
    return preSelected ? buildKey(preSelected) : null
  })

  const getKey = (impression: ImpressionOption) =>
    `${productId}_${arch}_${impression.value || getImpressionLabel(impression)}`

  const getQty = (impression: ImpressionOption) =>
    selectedImpressions[getKey(impression)] || 0

  const isSTL = (impression: ImpressionOption) => {
    const name = (impression.name ?? "").toLowerCase()
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
    // Check shows only on the last card touched in this grid
    const showCheck = showDoneCheckmark && qty >= 1 && getKey(impression) === lastTouchedKey

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
              alt={getImpressionLabel(impression)}
              className="w-full h-full object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = "none"
                const parent = el.parentElement
                if (parent && !parent.querySelector(".fallback-letter")) {
                  const div = document.createElement("div")
                  div.className = `fallback-letter text-[#B4B0B0] ${imgSize} font-bold flex items-center justify-center w-full h-full`
                  div.textContent = (impression.name ?? '').charAt(0).toUpperCase()
                  parent.appendChild(div)
                }
              }}
            />
          ) : (
            <div className={cn("text-[#B4B0B0] font-bold flex items-center justify-center w-full h-full", imgSize)}>
              {(impression.name ?? '').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <span className={cn("font-['Verdana'] font-normal text-black text-center mt-1.5 w-full flex-1 flex items-end justify-center pb-1", nameSize)}>
          {getImpressionLabel(impression)}
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
                  <span className={cn("font-['Verdana'] font-normal text-black text-center leading-none", qtyTextSize)}>−</span>
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

              {/* Green checkmark — click to confirm done */}
              {showCheck && (
                <button
                  className={cn(
                    "flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200",
                    "hover:scale-125 hover:bg-green-50",
                    controlSize
                  )}
                  onClick={(e) => { e.stopPropagation(); onDone?.() }}
                  title="Done — save and close"
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
          {impressions && impressions.map((impression) => (
            <div key={impression.id} className="snap-center flex-shrink-0 w-[140px]">
              {renderCard(impression, true)}
            </div>
          ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid gap-3 md:gap-4 w-full" style={{ gridTemplateColumns: `repeat(${impressions.length}, minmax(0, 1fr))` }}>
        {impressions && impressions.map((impression) => renderCard(impression, false))}
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
          impressionName={getImpressionLabel(selectedSTLImpression)}
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
  hideSkipOpposing = false,
  modalHeading,
  dualImpressionPrimaryArch = "maxillary",
}: ImpressionSelectionModalProps) {
  const isDualArch = oppositeImpression === "Yes"

  const primaryArch: "maxillary" | "mandibular" = isDualArch ? dualImpressionPrimaryArch : arch
  const topArch: "maxillary" | "mandibular" = isDualArch ? primaryArch : arch
  const bottomArch: ("maxillary" | "mandibular") | null = isDualArch
    ? (primaryArch === "maxillary" ? "mandibular" : "maxillary")
    : oppositeImpression === "No"
      ? null
      : arch === "maxillary"
        ? "mandibular"
        : "maxillary"

  const optionListForArch = (targetArch: "maxillary" | "mandibular") =>
    targetArch === arch ? impressions : (oppositeImpressions ?? impressions)

  const topList = isDualArch ? optionListForArch(topArch) : impressions
  const bottomList = isDualArch && bottomArch
    ? optionListForArch(bottomArch)
    : (oppositeImpressions ?? impressions)

  const topPrefix = `${productId}_${topArch}_`
  const hasTopSelection = Object.entries(selectedImpressions).some(
    ([key, qty]) => key.startsWith(topPrefix) && qty > 0
  )

  const bottomPrefix = bottomArch ? `${productId}_${bottomArch}_` : ""
  const hasBottomSelection = bottomArch ? Object.entries(selectedImpressions).some(
    ([key, qty]) => key.startsWith(bottomPrefix) && qty > 0
  ) : false

  const topArchLabel = topArch === "maxillary" ? "Maxillary" : "Mandibular"
  const bottomArchLabel = bottomArch === "maxillary" ? "Maxillary" : "Mandibular"
  const showBottomSection = !!bottomArch && (!isDualArch || hasTopSelection)

  const handleDone = () => {
    // Single close path avoids double-commit when parent uses the same logic in onClose and onConfirm.
    onClose()
  }

  const sharedGridProps = {
    selectedImpressions,
    onUpdateQuantity,
    onRemoveImpression,
    onSTLFilesAttached,
    stlFilesByImpression,
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton
        className="w-[96vw] max-w-[1120px] max-h-[94dvh] overflow-hidden flex flex-col p-0 border-0 rounded-[10px]"
      >
        <div className="flex flex-col px-3 sm:px-5 md:px-8 lg:px-10 py-3 sm:py-5 md:py-6 gap-3 sm:gap-4 bg-white w-full min-h-0 overflow-y-auto max-h-[94dvh]">

          {modalHeading ? (
            <h2 className="font-['Verdana'] font-bold text-lg sm:text-xl text-center text-[#1d1d1b] tracking-wide -mt-1 mb-1">
              {modalHeading}
            </h2>
          ) : null}

          {/* Top arch section */}
          <div
            className={cn(
              "relative rounded-[12px] px-4 sm:px-6 pt-7 pb-5 border-2 transition-colors",
              hasTopSelection ? "border-[#22c55e]" : "border-[#CF0202]"
            )}
          >
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 font-['Verdana'] font-bold text-sm sm:text-base whitespace-nowrap",
                hasTopSelection ? "text-[#22c55e]" : "text-[#CF0202]"
              )}
            >
              Select {topArchLabel} Impressions
            </span>
            <ImpressionGrid
              {...sharedGridProps}
              impressions={topList}
              productId={productId}
              arch={topArch}
              showDoneCheckmark
              onDone={handleDone}
            />
          </div>

          {/* Bottom arch section */}
          {showBottomSection && bottomArch && (
            <div
              className={cn(
                "relative rounded-[12px] px-4 sm:px-6 pt-7 pb-5 border-2 transition-colors",
                hasBottomSelection ? "border-[#22c55e]" : "border-[#CF0202]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 font-['Verdana'] font-bold text-sm sm:text-base whitespace-nowrap",
                  hasBottomSelection ? "text-[#22c55e]" : "text-[#CF0202]"
                )}
              >
                Select {bottomArchLabel} Impressions
              </span>
              <ImpressionGrid
                {...sharedGridProps}
                impressions={bottomList}
                productId={productId}
                arch={bottomArch}
                showDoneCheckmark={true}
                onDone={handleDone}
              />
              {!hideSkipOpposing && !hasBottomSelection && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => onSubmitNoOpposing ? onSubmitNoOpposing() : handleDone()}
                  className="px-5 py-1.5 bg-[#CF0202] hover:bg-[#910202] text-white rounded font-['Verdana'] font-bold text-sm transition-colors"
                >
                  Skip Opposing
                </button>
              </div>
              )}
            </div>
          )}

          {isDualArch && bottomArch && !hasTopSelection && (
            <div className="text-center text-sm text-[#7F7F7F] font-['Verdana']">
              Select at least one {topArchLabel.toLowerCase()} impression to continue.
            </div>
          )}

          {(isDualArch ? topList.length === 0 && bottomList.length === 0 : impressions.length === 0) && (
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
