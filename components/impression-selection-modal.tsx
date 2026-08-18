"use client"

import { Plus, Trash2 } from "lucide-react"
import { Check } from "@/components/ui/custom-check"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { useCallback, useEffect, useRef, useState } from "react"
import { STLFileSelectionModal, type STLFile } from "./stl-file-selection-modal"
import type { ImpressionOptionForModal as ImpressionOption } from "@/components/case-design-center/types"
import { DoneTransitionButton } from "@/components/case-design-center/components/DoneTransitionButton"
import {
  applyOppositeStlQtyForMultiFileUpload,
  findStlImpressionOption,
  getArchImpressionQtyForOption,
  impressionTouchKey,
  isStlImpressionOption,
  oppositeArch,
  type SlipImpressionSelections,
} from "@/components/case-design-center/utils/impressionStorage"

interface ImpressionSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  impressions: ImpressionOption[]
  selectedImpressions: SlipImpressionSelections
  onSetArchQty: (
    arch: "maxillary" | "mandibular",
    option: ImpressionOption,
    quantity: number
  ) => void
  onRemoveArchImpression: (arch: "maxillary" | "mandibular", code: string) => void
  onSTLFilesAttached?: (files: STLFile[], impressionKey: string) => void
  productId: string
  arch: "maxillary" | "mandibular"
  stlFilesByImpression?: Record<string, STLFile[]>
  oppositeImpression?: "Yes" | "No"
  oppositeImpressions?: ImpressionOption[]
  onSubmitNoOpposing?: () => void
  /** Saves impression selections for one arch without closing the modal (green check on a card). */
  onSaveArchSelection?: (arch: "maxillary" | "mandibular") => void
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
  onSetArchQty,
  onRemoveArchImpression,
  onSTLFilesAttached,
  productId,
  arch,
  stlFilesByImpression = {},
  lastTouchedKey,
  onRegisterTouch,
  onKeyRemoved,
  onSaveArchSelection,
  isValidationComplete,
  onConfirmAllAndClose,
  suppressDoneButton = false,
  peerArch,
  peerImpressions = [],
}: {
  impressions: ImpressionOption[]
  selectedImpressions: SlipImpressionSelections
  onSetArchQty: (
    arch: "maxillary" | "mandibular",
    option: ImpressionOption,
    qty: number
  ) => void
  onRemoveArchImpression: (arch: "maxillary" | "mandibular", code: string) => void
  onSTLFilesAttached?: (files: STLFile[], key: string) => void
  productId: string
  arch: "maxillary" | "mandibular"
  stlFilesByImpression?: Record<string, STLFile[]>
  /** Single key across the whole modal — only this card shows the green check */
  lastTouchedKey: string | null
  onRegisterTouch: (key: string) => void
  onKeyRemoved: (key: string) => void
  /** Saves one arch when validation is not yet complete */
  onSaveArchSelection?: (arch: "maxillary" | "mandibular") => void
  /** When true, green check saves all arches and closes the modal */
  isValidationComplete: boolean
  onConfirmAllAndClose: () => void
  /** When true, hides the section-level Done button row. */
  suppressDoneButton?: boolean
  /** Opposite jaw — used to auto-select STL qty when 2+ files are uploaded. */
  peerArch?: "maxillary" | "mandibular"
  peerImpressions?: ImpressionOption[]
}) {
  const [showSTLModal, setShowSTLModal] = useState(false)
  const [selectedSTLImpression, setSelectedSTLImpression] = useState<ImpressionOption | null>(null)
  const getImpressionLabel = (impression: ImpressionOption) =>
    impression.name ?? impression.code ?? impression.value ?? "Impression"

  const touchKey = (key: string) => onRegisterTouch(key)

  const getCode = (impression: ImpressionOption) =>
    impression.code ?? impression.value ?? getImpressionLabel(impression)

  const getKey = (impression: ImpressionOption) =>
    impressionTouchKey(arch, getCode(impression))

  const getQty = (impression: ImpressionOption) =>
    getArchImpressionQtyForOption(selectedImpressions, arch, impression)

  const isSTL = (impression: ImpressionOption) => isStlImpressionOption(impression)

  const handleCardClick = (impression: ImpressionOption) => {
    if (getQty(impression) > 0) return
    const key = getKey(impression)
    if (isSTL(impression)) {
      setSelectedSTLImpression(impression)
      setShowSTLModal(true)
    } else {
      onSetArchQty(arch, impression, 1)
      touchKey(key)
    }
  }

  const handleIncrement = (impression: ImpressionOption, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = getKey(impression)
    if (isSTL(impression)) {
      setSelectedSTLImpression(impression)
      setShowSTLModal(true)
    } else {
      onSetArchQty(arch, impression, getQty(impression) + 1)
      touchKey(key)
    }
  }

  const handleDecrement = (impression: ImpressionOption, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = getKey(impression)
    const qty = getQty(impression)
    if (qty > 1) {
      onSetArchQty(arch, impression, qty - 1)
      touchKey(key)
    }
  }

  const handleRemove = (impression: ImpressionOption, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = getKey(impression)
    onSetArchQty(arch, impression, 0)
    onRemoveArchImpression(arch, getCode(impression))
    onKeyRemoved(key)
  }

  const handleSTLConfirmed = (files: STLFile[]) => {
    if (!selectedSTLImpression || !onSTLFilesAttached) return
    const key = getKey(selectedSTLImpression)
    onSetArchQty(arch, selectedSTLImpression, files.length)
    onSTLFilesAttached(files, key)
    const otherArch = peerArch ?? oppositeArch(arch)
    const otherStl =
      findStlImpressionOption(peerImpressions) ??
      findStlImpressionOption(impressions)
    const withOpposite = applyOppositeStlQtyForMultiFileUpload(
      selectedImpressions,
      arch,
      files.length,
      otherStl
    )
    const oppositeQty = otherStl
      ? getArchImpressionQtyForOption(withOpposite, otherArch, otherStl)
      : 0
    const previousOppositeQty = otherStl
      ? getArchImpressionQtyForOption(selectedImpressions, otherArch, otherStl)
      : 0
    if (otherStl && oppositeQty > 0 && previousOppositeQty === 0) {
      onSetArchQty(otherArch, otherStl, oppositeQty)
    }
    touchKey(key)
    setShowSTLModal(false)
    setSelectedSTLImpression(null)
  }

  const renderCard = (impression: ImpressionOption, compact: boolean) => {
    const qty = getQty(impression)
    const isSelected = qty > 0
    // Green check only on the single last-touched card across both arch sections
    const showCheck = qty >= 1 && getKey(impression) === lastTouchedKey

    const imgSize = compact ? "text-2xl" : "text-3xl lg:text-4xl"
    const nameSize = compact ? "text-xs" : "text-sm lg:text-base"
    const controlSize = compact ? "w-7 h-7" : "w-9 h-9"
    const iconSize = compact ? "w-5 h-5" : "w-7 h-7"
    const qtyTextSize = compact ? "text-sm min-w-[18px]" : "text-lg min-w-[24px]"
    const qtyLabelSize = compact ? "text-xs" : "text-sm"

    return (
      <div
        key={impression.id}
        className={cn(
          "relative flex flex-col items-center rounded-[11px] transition-all duration-200 cursor-pointer select-none h-full w-full",
          compact ? "p-1.5" : "p-2 lg:p-3",
          isSelected
            ? "border-[3px] border-[#1162A8]"
            : "border-2 border-[#B4B0B0]"
        )}
        onClick={() => handleCardClick(impression)}
      >
        {/* Image */}
        <div
          className={cn(
            "w-full rounded-[8px] overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0",
            compact ? "h-[68px]" : "aspect-square"
          )}
        >
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
        <span className={cn("font-['Verdana'] font-normal text-black text-center mt-1 w-full flex-1 flex items-end justify-center pb-0.5 leading-tight", nameSize)}>
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

              {showCheck && (
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-center flex-shrink-0 rounded hover:bg-green-50",
                    controlSize
                  )}
                  title={
                    isValidationComplete
                      ? "Save all impressions and close"
                      : "Save impression for this arch"
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isValidationComplete) {
                      onConfirmAllAndClose()
                    } else {
                      onSaveArchSelection?.(arch)
                    }
                  }}
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

  // Index of the last-touched card in THIS section (so Done sits under that column)
  const lastTouchedIndex = impressions.findIndex(
    (imp) => getKey(imp) === lastTouchedKey
  )
  const showDoneInThisSection =
    !suppressDoneButton && isValidationComplete && lastTouchedIndex >= 0

  // Cap the grid to the cards' natural width and center it, so a single (or few)
  // impression card doesn't stretch to the full modal width and balloon in size.
  // When there are many options the columns still shrink to fit the modal.
  const colCount = impressions.length
  const cappedGridStyle = {
    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
    maxWidth: `calc(${colCount} * 190px + ${Math.max(colCount - 1, 0)} * 1rem)`,
  }

  return (
    <>
      {/* Small screens: side-by-side when only a couple options; otherwise 2-column grid */}
      <div
        className={cn(
          "w-full min-w-0 sm:hidden",
          colCount <= 2 ? "flex justify-center gap-2" : "grid grid-cols-2 gap-2"
        )}
      >
        {impressions?.map((impression) => (
          <div
            key={impression.id}
            className={cn(colCount <= 2 ? "w-[46%] max-w-[148px] flex-shrink-0" : "min-w-0")}
          >
            {renderCard(impression, true)}
          </div>
        ))}
      </div>

      {/* sm+: capped grid centered in the section */}
      <div className="hidden sm:grid gap-3 md:gap-4 w-full mx-auto min-w-0" style={cappedGridStyle}>
        {impressions?.map((impression) => renderCard(impression, false))}
      </div>

      {/* Done sits under the column of the last-touched card — kept inside the box */}
      {showDoneInThisSection && (
        <>
          {/* Desktop: align under the last-touched card's column */}
          <div
            className="hidden sm:grid gap-3 md:gap-4 w-full mt-3 mx-auto"
            style={cappedGridStyle}
          >
            <div className="flex justify-center py-2 overflow-visible" style={{ gridColumnStart: lastTouchedIndex + 1 }}>
              <DoneTransitionButton
                className="whitespace-nowrap px-10 py-2"
                onComplete={onConfirmAllAndClose}
              />
            </div>
          </div>
          {/* Mobile: centered */}
          <div className="flex sm:hidden justify-center mt-3 py-2 overflow-visible">
            <DoneTransitionButton
              className="whitespace-nowrap px-10 py-2"
              onComplete={onConfirmAllAndClose}
            />
          </div>
        </>
      )}

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
  onSetArchQty,
  onRemoveArchImpression,
  onSTLFilesAttached,
  productId,
  arch,
  stlFilesByImpression = {},
  oppositeImpression = "No",
  oppositeImpressions,
  onSubmitNoOpposing,
  onSaveArchSelection,
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

  const hasTopSelection = selectedImpressions[topArch].length > 0
  const hasBottomSelection = bottomArch
    ? selectedImpressions[bottomArch].length > 0
    : false

  const topArchLabel = topArch === "maxillary" ? "Maxillary" : "Mandibular"
  const bottomArchLabel = bottomArch === "maxillary" ? "Maxillary" : "Mandibular"

  // Progressive disclosure: in dual-arch mode, only show the bottom section once
  // the top arch has at least one impression selected. When re-opening with
  // existing top-arch selections, both sections are immediately visible.
  const showBottomSection = !!bottomArch && (isDualArch ? hasTopSelection : true)
  const shouldShowSkipOpposing =
    showBottomSection && !hideSkipOpposing && !hasBottomSelection

  // Primary arch selections are required; opposing arch is always optional.
  const isValidationComplete = hasTopSelection

  const [lastTouchedKey, setLastTouchedKey] = useState<string | null>(null)
  const touchHistoryRef = useRef<string[]>([])

  const registerTouch = useCallback((key: string) => {
    touchHistoryRef.current = [
      ...touchHistoryRef.current.filter((k) => k !== key),
      key,
    ]
    setLastTouchedKey(key)
  }, [])

  const handleKeyRemoved = useCallback(
    (removedKey: string) => {
      const without = touchHistoryRef.current.filter((k) => k !== removedKey)
      touchHistoryRef.current = without
      setLastTouchedKey((current) => {
        if (current !== removedKey) return current
        return (
          [...without]
            .reverse()
            .find((k) => {
              const [archPart, code] = k.split(":")
              if (!archPart || !code) return false
              const archKey = archPart as "maxillary" | "mandibular";
              return (
                selectedImpressions[archKey].find((e) => e.code === code)?.qty ?? 0
              ) > 0
            }) ?? null
        )
      })
    },
    [selectedImpressions]
  )

  useEffect(() => {
    if (!isOpen) return
    const activeKeys: string[] = []
    for (const archKey of ["maxillary", "mandibular"] as const) {
      for (const entry of selectedImpressions[archKey]) {
        if (entry.qty > 0) activeKeys.push(impressionTouchKey(archKey, entry.code))
      }
    }
    touchHistoryRef.current = activeKeys
    setLastTouchedKey((prev) => {
      if (prev && activeKeys.includes(prev)) return prev
      return activeKeys.length > 0 ? activeKeys[activeKeys.length - 1] : null
    })
  }, [isOpen])

  const handleDone = () => {
    if (!isValidationComplete) return;
    onClose();
  };

  const sharedGridProps = {
    selectedImpressions,
    onSetArchQty,
    onRemoveArchImpression,
    onSTLFilesAttached,
    stlFilesByImpression,
    lastTouchedKey,
    onRegisterTouch: registerTouch,
    onKeyRemoved: handleKeyRemoved,
    onSaveArchSelection,
    isValidationComplete,
    onConfirmAllAndClose: onClose,
    suppressDoneButton: shouldShowSkipOpposing,
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[92vw] max-w-[1080px] h-auto max-h-[min(92dvh,calc(100dvh-1rem))] overflow-y-auto overflow-x-hidden p-0 border-0 rounded-[10px] max-sm:top-3 max-sm:translate-y-0 flex flex-col"
      >
        <div className="flex flex-col gap-2 sm:gap-3 px-3 sm:px-5 md:px-8 lg:px-10 py-3 sm:py-4 bg-white w-full">

          {modalHeading ? (
            <h2 className="font-['Verdana'] font-bold text-base sm:text-xl text-center text-[#1d1d1b] tracking-wide">
              {modalHeading}
            </h2>
          ) : null}

          {/* Top arch section */}
          <div
            className={cn(
              "relative rounded-[12px] px-2 sm:px-6 pt-5 pb-2 sm:pb-3 border-2 transition-colors min-w-0",
              hasTopSelection ? "border-[#22c55e]" : "border-[#CF0202]"
            )}
          >
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 sm:px-4 font-['Verdana'] font-bold text-xs sm:text-base whitespace-nowrap",
                hasTopSelection ? "text-[#22c55e]" : "text-[#CF0202]"
              )}
            >
              {hasTopSelection
                ? `${topArchLabel} Impression`
                : `Select ${topArchLabel} Impression`}
            </span>
            <ImpressionGrid
              {...sharedGridProps}
              impressions={topList}
              productId={productId}
              arch={topArch}
              peerArch={oppositeArch(topArch)}
              peerImpressions={optionListForArch(oppositeArch(topArch))}
            />
          </div>

          {/* Bottom arch section */}
          {showBottomSection && bottomArch && (
            <div
              className={cn(
                "relative rounded-[12px] px-2 sm:px-6 pt-5 pb-2 sm:pb-3 border-2 transition-colors min-w-0",
                hasBottomSelection ? "border-[#22c55e]" : "border-[#CF0202]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 sm:px-4 font-['Verdana'] font-bold text-xs sm:text-base whitespace-nowrap",
                  hasBottomSelection ? "text-[#22c55e]" : "text-[#CF0202]"
                )}
              >
                {hasBottomSelection
                  ? `${bottomArchLabel} Impression`
                  : `Select ${bottomArchLabel} Impression`}
              </span>
              <ImpressionGrid
                {...sharedGridProps}
                impressions={bottomList}
                productId={productId}
                arch={bottomArch}
                peerArch={oppositeArch(bottomArch)}
                peerImpressions={optionListForArch(oppositeArch(bottomArch))}
              />
              {shouldShowSkipOpposing && (
              <div className="flex justify-center mt-2 sm:mt-4">
                <button
                  onClick={() => onSubmitNoOpposing ? onSubmitNoOpposing() : handleDone()}
                  className="px-4 sm:px-5 py-1 sm:py-1.5 bg-[#CF0202] hover:bg-[#910202] text-white rounded font-['Verdana'] font-bold text-xs sm:text-sm transition-colors"
                >
                  Skip Opposing
                </button>
              </div>
              )}
            </div>
          )}

          {(isDualArch ? topList.length === 0 && bottomList.length === 0 : impressions.length === 0) && (
            <div className="text-center py-6 sm:py-12 text-[#7F7F7F] font-['Verdana'] text-sm sm:text-lg w-full">
              No impressions available
            </div>
          )}

          <div className="flex justify-between items-center gap-4 border-t border-[#e5e7eb] pt-2 sm:pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 sm:px-8 py-2 sm:py-2.5 bg-[#CF0202] hover:bg-[#910202] text-white rounded-[6px] font-['Verdana'] font-bold text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
