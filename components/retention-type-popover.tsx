import React, { useEffect, useRef } from 'react'

export interface RetentionOptionItem {
  id: number
  name: string
  image_url: string | null
  tooth_chart_type: string | null
  status?: string
  sequence?: number
  lab_retention_option?: {
    name?: string
    image_url?: string | null
    tooth_chart_type?: string | null
  }
}

// Fallback static images for known tooth_chart_type values
const FALLBACK_IMAGES: Record<string, string> = {
  Implant: '/images/retention-type/Implant.svg',
  Prep: '/images/retention-type/prepped.svg',
  Pontic: '/images/retention-type/pontic.svg',
}

interface RetentionTypePopoverProps {
  onSelectRetentionType: (type: 'Implant' | 'Prep' | 'Pontic') => void
  selectedType?: 'Implant' | 'Prep' | 'Pontic' | null
  onClose?: () => void
  onDeselect?: () => void
  onDeselectTooth?: () => void
  retentionOptions?: RetentionOptionItem[]
}

export const RetentionTypePopover: React.FC<RetentionTypePopoverProps> = ({
  onSelectRetentionType,
  selectedType,
  onClose,
  onDeselect,
  onDeselectTooth,
  retentionOptions,
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

  // Build the list of options to render from API data or fallback to hardcoded defaults
  const options = React.useMemo(() => {
    if (retentionOptions && retentionOptions.length > 0) {
      // Filter active options and deduplicate by tooth_chart_type
      const seen = new Set<string>()
      return retentionOptions
        .filter((opt) => {
          const status = opt.status || 'Active'
          return status === 'Active'
        })
        .map((opt) => {
          const toothChartType = (opt.tooth_chart_type || opt.lab_retention_option?.tooth_chart_type || '') as 'Implant' | 'Prep' | 'Pontic'
          const name = opt.name || opt.lab_retention_option?.name || toothChartType || 'Unknown'
          const imageUrl = opt.image_url || opt.lab_retention_option?.image_url || FALLBACK_IMAGES[toothChartType] || null
          return { toothChartType, name, imageUrl }
        })
        .filter((opt) => {
          // Only include options with a valid tooth_chart_type and deduplicate
          if (!opt.toothChartType || seen.has(opt.toothChartType)) return false
          seen.add(opt.toothChartType)
          return true
        })
    }

    // Fallback: hardcoded defaults
    return [
      { toothChartType: 'Implant' as const, name: 'Implant', imageUrl: FALLBACK_IMAGES.Implant },
      { toothChartType: 'Prep' as const, name: 'Prep', imageUrl: FALLBACK_IMAGES.Prep },
      { toothChartType: 'Pontic' as const, name: 'Pontic', imageUrl: FALLBACK_IMAGES.Pontic },
    ]
  }, [retentionOptions])

  return (
    <div ref={popoverRef} className="absolute z-50 bg-white border border-gray-200 hover:border-blue-500 rounded-lg shadow-lg p-2 flex gap-2 mb-2 transition-colors">
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
  )
}
