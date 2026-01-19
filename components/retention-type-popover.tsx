import React, { useEffect, useRef } from 'react'

interface RetentionTypePopoverProps {
  onSelectRetentionType: (type: 'Implant' | 'Prep' | 'Pontic') => void
  selectedType?: 'Implant' | 'Prep' | 'Pontic' | null
  onClose?: () => void
  onDeselect?: () => void
  onDeselectTooth?: () => void
}

export const RetentionTypePopover: React.FC<RetentionTypePopoverProps> = ({
  onSelectRetentionType,
  selectedType,
  onClose,
  onDeselect,
  onDeselectTooth
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

  return (
    <div ref={popoverRef} className="absolute z-50 bg-white border border-gray-200 hover:border-blue-500 rounded-lg shadow-lg p-2 flex gap-2 mb-2 transition-colors">
      {/* Implant Option */}
      <button
        onClick={() => onSelectRetentionType('Implant')}
        className={`flex flex-col items-center justify-center p-2 border rounded transition-all group ${
          selectedType === 'Implant' 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-transparent hover:border-blue-500 hover:bg-gray-50'
        }`}
        title="Implant"
      >
        <img 
          src="/images/retention-type/Implant.svg" 
          alt="Implant" 
          width={30} 
          height={30} 
          className="group-hover:scale-110 transition-transform"
        />
        <span className="text-[10px] text-gray-600 mt-1 font-medium">Implant</span>
      </button>

      {/* Prep Option */}
      <button
        onClick={() => onSelectRetentionType('Prep')}
        className={`flex flex-col items-center justify-center p-2 border rounded transition-all group ${
          selectedType === 'Prep' 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-transparent hover:border-blue-500 hover:bg-gray-50'
        }`}
        title="Prep"
      >
        <img 
          src="/images/retention-type/prepped.svg" 
          alt="Prep" 
          width={30} 
          height={30} 
          className="group-hover:scale-110 transition-transform"
        />
        <span className="text-[10px] text-gray-600 mt-1 font-medium">Prep</span>
      </button>

      {/* Pontic Option */}
      <button
        onClick={() => onSelectRetentionType('Pontic')}
        className={`flex flex-col items-center justify-center p-2 border rounded transition-all group ${
          selectedType === 'Pontic' 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-transparent hover:border-blue-500 hover:bg-gray-50'
        }`}
        title="Pontic"
      >
        <img 
          src="/images/retention-type/pontic.svg" 
          alt="Pontic" 
          width={30} 
          height={30} 
          className="group-hover:scale-110 transition-transform"
        />
        <span className="text-[10px] text-gray-600 mt-1 font-medium">Pontic</span>
      </button>

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
