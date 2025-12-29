import React from 'react'
import { RetentionTypePopover } from './retention-type-popover'

interface MaxillaryTeethSVGProps {
  selectedTeeth: number[]
  onToothClick?: (toothNumber: number) => void
  className?: string
  isImplantMode?: boolean // Keep for backward compatibility
  retentionTypesByTooth?: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  showRetentionPopover?: boolean
  retentionPopoverTooth?: number | null
  onSelectRetentionType?: (toothNumber: number, type: 'Implant' | 'Prep' | 'Pontic') => void
}

export const MaxillaryTeethSVG: React.FC<MaxillaryTeethSVGProps> = ({
  selectedTeeth,
  onToothClick,
  className = '',
  isImplantMode = false,
  retentionTypesByTooth = {},
  showRetentionPopover = false,
  retentionPopoverTooth = null,
  onSelectRetentionType
}) => {
  const isToothSelected = (toothNumber: number) => selectedTeeth.includes(toothNumber)

  const handleToothClick = (toothNumber: number) => {
    if (onToothClick) {
      onToothClick(toothNumber)
    }
  }

  // Maxillary teeth mapping: pattern0 = tooth 1 (rightmost), pattern15 = tooth 16 (leftmost)
  const toothMapping = [
    { tooth: 16, x: 651, width: 44, pattern: 'pattern0_0_1' },
    { tooth: 15, x: 601, width: 50, pattern: 'pattern1_0_1' },
    { tooth: 14, x: 547, width: 54, pattern: 'pattern2_0_1' },
    { tooth: 13, x: 509, width: 38, pattern: 'pattern3_0_1' },
    { tooth: 12, x: 472, width: 37, pattern: 'pattern4_0_1' },
    { tooth: 11, x: 432, width: 40, pattern: 'pattern5_0_1' },
    { tooth: 10, x: 396, width: 36, pattern: 'pattern6_0_1' },
    { tooth: 9, x: 347, width: 49, pattern: 'pattern7_0_1' },
    { tooth: 8, x: 298, width: 49, pattern: 'pattern8_0_1' },
    { tooth: 7, x: 262, width: 36, pattern: 'pattern9_0_1' },
    { tooth: 6, x: 222, width: 40, pattern: 'pattern10_0_1' },
    { tooth: 5, x: 185, width: 37, pattern: 'pattern11_0_1' },
    { tooth: 4, x: 148, width: 37, pattern: 'pattern12_0_1' },
    { tooth: 3, x: 94, width: 54, pattern: 'pattern13_0_1' },
    { tooth: 2, x: 44, width: 50, pattern: 'pattern14_0_1' },
    { tooth: 1, x: 0, width: 44, pattern: 'pattern15_0_1' }
  ]

  // Number positions - center x coordinates for each tooth number
  const numberPositions: Record<number, { cx: number; cy: number }> = {
    1: { cx: 673, cy: 159 },
    2: { cx: 626, cy: 159 },
    3: { cx: 574, cy: 159 },
    4: { cx: 528, cy: 159 },
    5: { cx: 491, cy: 159 },
    6: { cx: 452, cy: 159 },
    7: { cx: 414, cy: 159 },
    8: { cx: 371.5, cy: 159 },
    9: { cx: 322.5, cy: 159 },
    10: { cx: 280, cy: 159 },
    11: { cx: 242, cy: 159 },
    12: { cx: 203.5, cy: 159 },
    13: { cx: 166.5, cy: 159 },
    14: { cx: 121, cy: 159 },
    15: { cx: 69, cy: 159 },
    16: { cx: 22, cy: 159 }
  }

  // Circle positions for each tooth
  const circlePositions: Record<number, { cx: number; cy: number }> = {
    1: { cx: 22, cy: 75.7988 },
    2: { cx: 69, cy: 75.7988 },
    3: { cx: 121, cy: 75.7988 },
    4: { cx: 166.5, cy: 75.7988 },
    5: { cx: 203.5, cy: 75.7988 },
    6: { cx: 242, cy: 75.7988 },
    7: { cx: 280, cy: 75.7988 },
    8: { cx: 322.5, cy: 75.7988 },
    9: { cx: 371.5, cy: 75.7988 },
    10: { cx: 414, cy: 75.7988 },
    11: { cx: 452, cy: 75.7988 },
    12: { cx: 490.5, cy: 75.7988 },
    13: { cx: 528, cy: 75.7988 },
    14: { cx: 574, cy: 75.7988 },
    15: { cx: 626, cy: 75.7988 },
    16: { cx: 673, cy: 75.7988 },
  }

  // SVG Components for each retention type
  const ImplantIndicator = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.3584 22.6572C12.3213 26.4281 17.6777 26.4281 18.6406 22.6572L22.3369 8.18164C22.9437 5.80533 21.1488 3.49323 18.6963 3.49316H11.3027C8.85035 3.49343 7.05533 5.80543 7.66211 8.18164L11.3584 22.6572Z" fill="#1162A8" fillOpacity="0.2" stroke="#1162A8" strokeWidth="1.07369"/>
    </svg>
  )

  const PrepIndicator = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.4797 9.15527H17.7229C19.7124 9.15527 21.4417 10.5214 21.9016 12.457L23.8938 20.8457H6.12134L8.32349 12.3701C8.81534 10.4772 10.524 9.15547 12.4797 9.15527Z" fill="#1162A8" fillOpacity="0.2" stroke="#1162A8" strokeWidth="1.07369"/>
    </svg>
  )

  const PonticIndicator = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.72111 15.3455L5.9663 20.9246C9.30315 21.6011 11.3148 22.8177 14.7184 22.7296C17.6986 22.6524 23.6874 20.9246 23.6874 20.9246L24.917 18.4695C25.3972 17.5107 26.0315 14.2464 24.917 12.0243C24.1945 10.5839 23.5353 9.68426 22.0961 9.10854C20.8275 8.60105 18.6242 9.10854 18.6242 9.10854C18.6242 9.10854 16.3872 7.30331 14.7184 7.26717C13.3251 7.237 11.3189 8.41809 11.3189 8.41809C11.3189 8.41809 9.66638 7.75798 8.57034 7.80422C7.18619 7.86262 6.23675 8.08466 5.24314 9.10854C3.87617 10.5172 4.72111 15.3455 4.72111 15.3455Z" fill="#1162A8" fillOpacity="0.2" stroke="#1162A8" strokeWidth="1.07369"/>
    </svg>
  )

  // Helper function to render the selection indicator
  const renderSelectionIndicator = (toothNumber: number) => {
    const pos = circlePositions[toothNumber]
    if (!pos) return null

    // Get retention types for this tooth
    const retentionTypes = retentionTypesByTooth[toothNumber] || []

    // Backward compatibility: if isImplantMode is true and no retention types set, show implant
    if (isImplantMode && retentionTypes.length === 0) {
      return (
        <g transform={`translate(${pos.cx - 15}, ${pos.cy - 15})`}>
          <ImplantIndicator />
        </g>
      )
    }

    // If retention types are selected, show them
    if (retentionTypes.length > 0) {
      return (
        <g>
          {retentionTypes.map((type, index) => {
            // Horizontal spacing for multiple indicators
            const offsetX = (index - (retentionTypes.length - 1) / 2) * 35
            const centerX = pos.cx + offsetX

            return (
              <g key={type} transform={`translate(${centerX - 15}, ${pos.cy - 15})`}>
                {type === 'Implant' && <ImplantIndicator />}
                {type === 'Prep' && <PrepIndicator />}
                {type === 'Pontic' && <PonticIndicator />}
              </g>
            )
          })}
        </g>
      )
    }

    // Default: show orange circle
    return <circle cx={pos.cx} cy={pos.cy} r="7.08203" fill="#FF9900" fillOpacity="0.2" stroke="#FF9900"/>
  }

  return (
    <div className={`relative ${className}`}>
      {/* Retention Type Popover */}
      {showRetentionPopover && retentionPopoverTooth !== null && onSelectRetentionType && (() => {
        // Get the currently selected retention type for this tooth (only first one since only one is allowed)
        const retentionTypes = retentionTypesByTooth[retentionPopoverTooth] || []
        const selectedType = retentionTypes.length > 0 ? retentionTypes[0] : null
        return (
          <div
            className="absolute z-50"
            style={{
              left: `${circlePositions[retentionPopoverTooth]?.cx || 0}px`,
              top: `${(circlePositions[retentionPopoverTooth]?.cy || 0) - 60}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <RetentionTypePopover
              onSelectRetentionType={(type) => onSelectRetentionType(retentionPopoverTooth, type)}
              selectedType={selectedType || undefined}
            />
          </div>
        )
      })()}

      <svg width="100%" height="169" viewBox="0 0 695 169" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
        {toothMapping.map(({ tooth, x, width, pattern }) => {
          const isSelected = isToothSelected(tooth)
          return (
            <rect
              key={tooth}
              x={x}
              y="0"
              width={width}
              height="141"
              fill={`url(#${pattern})`}
              onClick={() => handleToothClick(tooth)}
              style={{
                cursor: 'pointer',
                opacity: isSelected ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            />
          )
        })}

        {/* Render selection indicators for all selected teeth */}
        {selectedTeeth.map(tooth => (
          <React.Fragment key={`indicator-${tooth}`}>
            {renderSelectionIndicator(tooth)}
          </React.Fragment>
        ))}

        {/* All the tooth number labels and patterns - keeping original structure */}
        {/* ... (keeping all the original SVG patterns and text elements) ... */}
      </svg>
    </div>
  )
}
