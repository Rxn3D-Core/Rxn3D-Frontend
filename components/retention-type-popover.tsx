import React, { useEffect, useRef } from 'react'

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
}

// Map API retention option names to the internal RetentionType values used downstream
const NAME_TO_RETENTION_TYPE: Record<string, string> = {
  Implant: 'Implant',
  Prepped: 'Prep',
  Prep: 'Prep',
  Pontic: 'Pontic',
}

interface RetentionTypePopoverProps {
  onSelectRetentionType: (type: 'Implant' | 'Prep' | 'Pontic') => void
  selectedType?: 'Implant' | 'Prep' | 'Pontic' | null
  onClose?: () => void
  onDeselect?: () => void
  onDeselectTooth?: () => void
  retentionOptions?: RetentionOptionItem[]
  /** Pixel offset from the popover's left edge where the arrow should point. */
  arrowOffsetX?: number | null
  /** Arrow direction. 'down' points from popover bottom toward a tooth below; 'up' points from popover top toward a tooth above. */
  arrowDirection?: 'down' | 'up'
}

export const RetentionTypePopover: React.FC<RetentionTypePopoverProps> = ({
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

    // Add event listener when component mounts
    document.addEventListener('click', handleClickOutside)

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onClose])

  const getOptionName = (opt: RetentionOptionItem) =>
    opt.name ||
    opt.retention_option?.name ||
    opt.lab_retention_option?.name ||
    'Unknown'

  const getOptionImageUrl = (opt: RetentionOptionItem) =>
    opt.image_url ||
    opt.retention_option?.image_url ||
    opt.lab_retention_option?.image_url ||
    null

  const getRetentionType = (opt: RetentionOptionItem) => {
    const rawType =
      opt.tooth_chart_type ||
      opt.retention_option?.tooth_chart_type ||
      opt.lab_retention_option?.tooth_chart_type ||
      getOptionName(opt)

    return (NAME_TO_RETENTION_TYPE[rawType] || rawType) as 'Implant' | 'Prep' | 'Pontic'
  }

  // Build the list of options directly from product retention_options API data.
  const options = React.useMemo(() => {
    if (!retentionOptions?.length) return []

    const seen = new Set<string>()

    return [...retentionOptions]
      .filter((opt) => (opt.status || 'Active') === 'Active')
      .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
      .map((opt) => {
        const toothChartType = getRetentionType(opt)

        return {
          toothChartType,
          name: getOptionName(opt),
          imageUrl: getOptionImageUrl(opt),
        }
      })
      .filter((opt) => {
        if (!['Implant', 'Prep', 'Pontic'].includes(opt.toothChartType)) return false
        if (seen.has(opt.toothChartType)) return false
        seen.add(opt.toothChartType)
        return true
      })
  }, [retentionOptions])

  const showArrow = typeof arrowOffsetX === 'number'

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
            ...(arrowDirection === 'down'
              ? { bottom: '-8px', borderTop: '8px solid white', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))' }
              : { top: '-8px', borderBottom: '8px solid white', filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.15))' }),
          }}
        />
      )}
      <div className="bg-white border border-gray-200 hover:border-blue-500 rounded-lg shadow-xl p-2 flex gap-2 transition-colors">
      {options.map((opt) => (
        <button
          key={opt.toothChartType}
          onClick={() => onSelectRetentionType(opt.toothChartType)}
          className={`flex flex-col items-center justify-center p-2 border rounded transition-all group ${
            selectedType === opt.toothChartType
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-transparent hover:border-blue-500 hover:bg-gray-50'
          }`}
          title={opt.name}
        >
          {opt.imageUrl ? (
            <img
              src={opt.imageUrl}
              alt={opt.name}
              width={30}
              height={30}
              className="group-hover:scale-110 transition-transform"
            />
          ) : (
            <span className="w-[30px] h-[30px] flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-100 rounded">
              {opt.name.charAt(0)}
            </span>
          )}
          <span className="text-[10px] text-gray-600 mt-1 font-medium">{opt.name}</span>
        </button>
      ))}

      {!options.length && (
        <div className="flex items-center px-2 text-xs text-gray-500">
          No retention options available
        </div>
      )}

      {/* Deselect Tooth Option - Remove tooth from selection */}
      {onDeselectTooth && (
        <button
          onClick={() => {
            onDeselectTooth()
            onClose?.()
          }}
          className="flex flex-col items-center justify-center p-2 border border-transparent hover:border-orange-500 hover:bg-orange-50 rounded transition-all group"
          title="Deselect Tooth"
        >
          <svg
            width="30"
            height="30"
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
          <span className="text-[10px] text-gray-600 mt-1 font-medium group-hover:text-orange-500">Remove</span>
        </button>
      )}
      </div>
    </div>
  )
}
