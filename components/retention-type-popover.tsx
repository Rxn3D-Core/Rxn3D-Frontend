import React from 'react'

interface RetentionTypePopoverProps {
  onSelectRetentionType: (type: 'Implant' | 'Prep' | 'Pontic') => void
  selectedType?: 'Implant' | 'Prep' | 'Pontic' | null
}

export const RetentionTypePopover: React.FC<RetentionTypePopoverProps> = ({
  onSelectRetentionType,
  selectedType
}) => {
  return (
    <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2">
      {/* Implant Option */}
      <button
        onClick={() => onSelectRetentionType('Implant')}
        className={`flex flex-col items-center justify-center p-2 border rounded transition-all group ${
          selectedType === 'Implant' 
            ? 'border-primary bg-primary/10' 
            : 'border-transparent hover:border-primary hover:bg-gray-50'
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
            ? 'border-primary bg-primary/10' 
            : 'border-transparent hover:border-primary hover:bg-gray-50'
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
            ? 'border-primary bg-primary/10' 
            : 'border-transparent hover:border-primary hover:bg-gray-50'
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
    </div>
  )
}
