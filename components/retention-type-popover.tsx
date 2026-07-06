import React, { useEffect, useMemo, useRef } from 'react'
import { resolveRetentionOptionImageUrl } from '@/components/case-design-center/utils/retentionOptionImage'
import {
  resolveRetentionOptionChartTypeOrDefault,
  type RetentionChartType,
} from '@/components/case-design-center/utils/retentionOptionChartType'

export interface RetentionOptionToothImage {
  tooth_number: number
  image_url?: string | null
  image?: string | null
}

export interface RetentionOptionItem {
  id: number
  name: string
  image_url: string | null
  tooth_chart_type: string | null
  has_implant?: 'Yes' | 'No'
  selector_shape?: string | null
  retention_option_id?: number
  status?: string
  sequence?: number
  images?: RetentionOptionToothImage[]
  global_connection?: {
    sample_image_url?: string | null
    global_retention_option_id?: number
    global_retention_option_name?: string
    is_connected_to_global?: boolean
    [key: string]: unknown
  } | null
  lab_retention_option?: {
    id?: number
    name?: string
    image_url?: string | null
    tooth_chart_type?: string | null
    has_implant?: 'Yes' | 'No'
    selector_shape?: string | null
  }
  retention_option?: {
    id?: number
    name?: string
    image_url?: string | null
    tooth_chart_type?: string | null
    has_implant?: 'Yes' | 'No'
    selector_shape?: string | null
  }
  retentions?: Array<{
    id?: number
    name?: string
    code?: string | null
    status?: string | null
  }>
}

/**
 * A single extraction-status entry for the combined popover (e.g. Missing, Will
 * extract, Clasps). Shape is intentionally minimal so the panel can map any
 * `ProductExtraction` into it.
 */
export interface ExtractionStatusOption {
  code: string
  name: string
  imageUrl?: string | null
}

interface RetentionTypePopoverProps {
  toothNumber: number
  onSelectRetentionType?: (type: RetentionChartType) => void
  /** When set, called with the specific retention option id (for per-option tooth images). */
  onSelectRetentionOption?: (optionId: number, type: RetentionChartType) => void
  selectedType?: RetentionChartType | null
  /** When set, highlights the exact retention option (needed when multiple options share a chart type). */
  selectedRetentionOptionId?: number | null
  onClose?: () => void
  onDeselectTooth?: () => void
  retentionOptions?: RetentionOptionItem[]
  arrowOffsetX?: number | null
  arrowDirection?: 'down' | 'up'
  /**
   * When false, Pontic options are hidden (a pontic needs an abutment first). Ignored
   * when the product has no abutment (Prep/Implant) options at all — then Pontic stays
   * available. Defaults to true.
   */
  allowPontic?: boolean
  /**
   * Extraction statuses to offer alongside retention types ("both" products). When
   * provided and non-empty, the popover renders a combined layout: retention options,
   * a divider, then extraction statuses. Omit for a retention-only popover.
   */
  extractionOptions?: ExtractionStatusOption[]
  /** Currently selected extraction status code for this tooth (mutually exclusive with retention). */
  selectedExtractionCode?: string | null
  /**
   * Called when the user picks an extraction status. The caller is responsible for
   * enforcing per-tooth exclusivity (clearing any retention type on this tooth).
   */
  onSelectExtractionStatus?: (code: string) => void
}

function getOptionName(opt: RetentionOptionItem): string {
  return opt.name || opt.retention_option?.name || opt.lab_retention_option?.name || 'Unknown'
}

function ToothImageFallback({ toothNumber }: { toothNumber: number }) {
  const arch = (toothNumber <= 16) ? 'maxillary' : 'mandibular'
  return (
    <img
      src={`/images/teeth/${arch}/tooth-${toothNumber}.png?v=2`}
      alt={`Tooth ${toothNumber}`}
      className="w-full h-full object-contain"
      onError={(e) => {
        const img = e.target as HTMLImageElement
        img.style.opacity = '0'
      }}
    />
  )
}

function buildRetentionPopoverOptions(
  retentionOptions: RetentionOptionItem[] | undefined,
  toothNumber: number,
  allowPontic: boolean
): Array<{ id: number; toothChartType: RetentionChartType; name: string; imageUrl: string | null }> {
  if (!retentionOptions?.length) return []

  // Every active retention option from the product (fully data-driven).
  const mapped = [...retentionOptions]
    .filter((opt) => (opt.status || 'Active') === 'Active')
    .map((opt) => ({
      id: opt.id,
      toothChartType: resolveRetentionOptionChartTypeOrDefault(opt),
      name: getOptionName(opt),
      imageUrl: resolveRetentionOptionImageUrl(opt, toothNumber),
      sequence: opt.sequence ?? Number.MAX_SAFE_INTEGER,
    }))

  // A Pontic needs an abutment first: hide Pontic options until the product has one,
  // but only when the product actually offers abutment (Prep/Implant) options.
  const hasAbutmentOption = mapped.some((o) => o.toothChartType !== 'Pontic')
  const visible =
    allowPontic || !hasAbutmentOption
      ? mapped
      : mapped.filter((o) => o.toothChartType !== 'Pontic')

  // Order: abutment options (Prep/Implant) first, Pontic last; then by sequence.
  const rank = (t: RetentionChartType) => (t === 'Pontic' ? 1 : 0)
  return visible
    .sort((a, b) => rank(a.toothChartType) - rank(b.toothChartType) || a.sequence - b.sequence)
    .map(({ sequence: _sequence, ...opt }) => opt)
}

export const RetentionTypePopover: React.FC<RetentionTypePopoverProps> = ({
  toothNumber,
  onSelectRetentionType,
  onSelectRetentionOption,
  selectedType,
  selectedRetentionOptionId,
  onClose,
  onDeselectTooth,
  retentionOptions,
  arrowOffsetX = null,
  arrowDirection = 'down',
  allowPontic = true,
  extractionOptions,
  selectedExtractionCode,
  onSelectExtractionStatus,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    // Defer so the opening tooth click does not immediately dismiss the popover.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDownOutside)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', handlePointerDownOutside)
    }
  }, [onClose])

  const options = useMemo(
    () => buildRetentionPopoverOptions(retentionOptions, toothNumber, allowPontic),
    [retentionOptions, toothNumber, allowPontic]
  )

  const extractionItems = useMemo(
    () =>
      onSelectExtractionStatus
        ? (extractionOptions ?? []).filter((e) => e.code && e.name)
        : [],
    [extractionOptions, onSelectExtractionStatus]
  )
  const hasExtractionGroup = extractionItems.length > 0

  // Highlight the exact option when id is known; otherwise fall back to chart type.
  const selectedOptionId =
    selectedRetentionOptionId ??
    (selectedType ? options.find((opt) => opt.toothChartType === selectedType)?.id : undefined)

  const applyRetentionSelection = (
    optionId: number,
    type: RetentionChartType,
  ) => {
    onSelectRetentionOption?.(optionId, type)
    onSelectRetentionType?.(type)
  }

  const applyExtractionSelection = (code: string) => {
    onSelectExtractionStatus?.(code)
  }

  const showArrow = typeof arrowOffsetX === 'number'

  const popoverButtonPointerProps = {
    onPointerDownCapture: (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
    },
  } as const

  const arrowStyle: React.CSSProperties =
    arrowDirection === 'down'
      ? {
          bottom: '-8px',
          borderTop: '8px solid white',
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))',
        }
      : {
          top: '-8px',
          borderBottom: '8px solid white',
          filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.15))',
        }

  return (
    <div
      ref={popoverRef}
      data-tooth-chart-popover="true"
      className="relative"
      style={{ overflow: 'visible' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showArrow && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${arrowOffsetX}px`,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            zIndex: 51,
            ...arrowStyle,
          }}
        />
      )}
      <div className="z-50 bg-white border border-gray-200 hover:border-blue-500 shadow-xl p-3 flex flex-col gap-2 transition-colors">
        <div className="flex gap-2">
          {options.map((opt) => {
            const isSelected = opt.id === selectedOptionId
            return (
              <button
                key={opt.id}
                type="button"
                {...popoverButtonPointerProps}
                onClick={(e) => {
                  e.stopPropagation()
                  applyRetentionSelection(opt.id, opt.toothChartType)
                }}
                className={
                  isSelected
                    ? 'flex flex-col items-center gap-0 p-2 rounded-xl border-2 transition-all w-[90px] hover:shadow-sm border-blue-500 bg-blue-50'
                    : 'flex flex-col items-center gap-0 p-2 rounded-xl border-2 transition-all w-[90px] hover:shadow-sm border-gray-200 hover:border-gray-300 bg-white'
                }
                title={opt.name}
              >
                <div className="w-full h-[90px] flex items-center justify-center">
                  {opt.imageUrl ? (
                    <img
                      src={opt.imageUrl}
                      alt={opt.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.opacity = '0'
                      }}
                    />
                  ) : (
                    <ToothImageFallback toothNumber={toothNumber} />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight text-black">
                  #{toothNumber} {opt.name}
                </span>
              </button>
            )
          })}

          {options.length === 0 && !hasExtractionGroup && (
            <div className="flex items-center px-2 text-xs text-gray-500">
              No retention options available
            </div>
          )}

          {/* Extraction-status group (combined "both" popover). A vertical divider
              separates retention types from extraction statuses; per-tooth
              exclusivity is enforced by the caller's onSelectExtractionStatus. */}
          {hasExtractionGroup && options.length > 0 && (
            <div aria-hidden="true" className="self-stretch w-px bg-gray-200 mx-1" />
          )}

          {extractionItems.map((opt) => {
            const isSelected = opt.code === selectedExtractionCode
            return (
              <button
                key={`ext-${opt.code}`}
                type="button"
                {...popoverButtonPointerProps}
                onClick={(e) => {
                  e.stopPropagation()
                  applyExtractionSelection(opt.code)
                }}
                className={
                  isSelected
                    ? 'flex flex-col items-center gap-0 p-2 rounded-xl border-2 transition-all w-[90px] hover:shadow-sm border-blue-500 bg-blue-50'
                    : 'flex flex-col items-center gap-0 p-2 rounded-xl border-2 transition-all w-[90px] hover:shadow-sm border-gray-200 hover:border-gray-300 bg-white'
                }
                title={opt.name}
              >
                <div className="w-full h-[90px] flex items-center justify-center">
                  {opt.imageUrl ? (
                    <img
                      src={opt.imageUrl}
                      alt={opt.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.opacity = '0'
                      }}
                    />
                  ) : (
                    <ToothImageFallback toothNumber={toothNumber} />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight text-black">
                  #{toothNumber} {opt.name}
                </span>
              </button>
            )
          })}

          {onDeselectTooth && (
            <button
              type="button"
              {...popoverButtonPointerProps}
              onClick={(e) => {
                e.stopPropagation()
                onDeselectTooth()
                onClose?.()
              }}
              className="flex flex-col items-center justify-center p-2 border border-transparent hover:border-orange-500 hover:bg-orange-50 rounded-xl transition-all group w-[90px]"
              title="Deselect Tooth"
            >
              <div className="w-full h-[90px] flex items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="group-hover:scale-110 transition-transform"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 group-hover:text-red-500"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight text-gray-600 group-hover:text-orange-500">
                Remove
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
