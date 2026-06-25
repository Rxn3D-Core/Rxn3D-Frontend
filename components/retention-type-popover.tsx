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

interface RetentionTypePopoverProps {
  toothNumber: number
  onSelectRetentionType: (type: RetentionChartType) => void
  selectedType?: RetentionChartType | null
  onClose?: () => void
  onDeselectTooth?: () => void
  retentionOptions?: RetentionOptionItem[]
  arrowOffsetX?: number | null
  arrowDirection?: 'down' | 'up'
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
  toothNumber: number
): Array<{ id: number; toothChartType: RetentionChartType; name: string; imageUrl: string | null }> {
  if (!retentionOptions?.length) return []

  // Show every active retention option from the product (no whitelist, no
  // collapsing by category) so the popover is fully driven by product data.
  return [...retentionOptions]
    .filter((opt) => (opt.status || 'Active') === 'Active')
    .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
    .map((opt) => ({
      id: opt.id,
      toothChartType: resolveRetentionOptionChartTypeOrDefault(opt),
      name: getOptionName(opt),
      imageUrl: resolveRetentionOptionImageUrl(opt, toothNumber),
    }))
}

export const RetentionTypePopover: React.FC<RetentionTypePopoverProps> = ({
  toothNumber,
  onSelectRetentionType,
  selectedType,
  onClose,
  onDeselectTooth,
  retentionOptions,
  arrowOffsetX = null,
  arrowDirection = 'down',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onClose])

  const options = useMemo(
    () => buildRetentionPopoverOptions(retentionOptions, toothNumber),
    [retentionOptions, toothNumber]
  )

  // The chart stores/renders by category, so highlight the first option matching
  // the selected category (the representative the chart draws), not every variant.
  const selectedOptionId = selectedType
    ? options.find((opt) => opt.toothChartType === selectedType)?.id
    : undefined

  const showArrow = typeof arrowOffsetX === 'number'

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
    <div ref={popoverRef} className="relative" style={{ overflow: 'visible' }}>
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
                onClick={() => {
                  onSelectRetentionType(opt.toothChartType)
                  onClose?.()
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

          {options.length === 0 && (
            <div className="flex items-center px-2 text-xs text-gray-500">
              No retention options available
            </div>
          )}

          {onDeselectTooth && (
            <button
              type="button"
              onClick={() => {
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
