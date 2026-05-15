import React, { useEffect, useRef } from 'react'

export interface ToothStatusOption {
  code: string
  name: string
  color: string
  visibilityType?: 'Image' | 'Color' | string
  imagesByTooth?: Record<number, string | null>
}

interface ToothStatusPopoverProps {
  toothNumber: number
  options: ToothStatusOption[]
  currentCode?: string | null
  onSelect: (code: string) => void
  onRemove?: () => void
  onClose?: () => void
  /** Product image URL to display at the top of the popover */
  productImageUrl?: string | null
  /** Pixel offset from the popover's left edge where the arrow should point. When provided, a downward arrow is rendered. */
  arrowOffsetX?: number | null
  /** Arrow direction. 'down' points from popover bottom toward a tooth below; 'up' points from popover top toward a tooth above. */
  arrowDirection?: 'down' | 'up'
}

function isMissingCode(code: string, name: string): boolean {
  return code.toUpperCase() === 'MT' || name.toLowerCase().includes('missing')
}

function isWillExtractCode(code: string, name: string): boolean {
  const c = code.toUpperCase()
  const n = name.toLowerCase()
  return c === 'WED' || c === 'WEOD' || n.includes('will extract')
}

function isTeethInMouthCode(_code: string, name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('teeth in mouth') || n.includes('in mouth')
}

function ToothImage({ toothNumber, style, className }: { toothNumber: number; style?: React.CSSProperties; className?: string }) {
  const arch = toothNumber <= 16 ? 'maxillary' : 'mandibular'
  return (
    <img
      key={toothNumber}
      src={`/images/teeth/${arch}/tooth-${toothNumber}.png?v=2`}
      alt={`Tooth ${toothNumber}`}
      className={`w-full h-full object-contain ${className ?? ''}`}
      style={style}
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.opacity = '0'
      }}
    />
  )
}

function MissingToothDisplay({ toothNumber }: { toothNumber: number }) {
  const arch = toothNumber <= 16 ? 'maxillary' : 'mandibular'
  return (
    <div className="w-full h-[90px] flex items-center justify-center">
      <img
        key={toothNumber}
        src={`/images/teeth/${arch}/missing-teeth/tooth-${toothNumber}.png?v=2`}
        alt={`Tooth ${toothNumber} missing`}
        className="w-full h-full object-contain"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.opacity = '0'
        }}
      />
    </div>
  )
}

function WillExtractToothDisplay({ toothNumber }: { toothNumber: number }) {
  const arch = toothNumber <= 16 ? 'maxillary' : 'mandibular'
  return (
    <div className="relative w-full h-[90px] overflow-hidden">
      <img
        key={toothNumber}
        src={`/images/teeth/${arch}/tooth-${toothNumber}.png?v=2`}
        alt={`Tooth ${toothNumber}`}
        className="w-full h-full object-contain"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.opacity = '0'
        }}
      />
      <svg
        className="absolute"
        style={{ width: 28, height: 37, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        viewBox="0 0 24 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0.312293 28.0802C0.0484933 29.0457 -0.341315 29.7125 0.576054 30.6215C1.49342 31.5305 3.08986 29.9351 3.24269 29.7276C3.39553 29.5202 6.21477 24.8224 6.85731 23.7684C7.36025 22.9433 10.3391 18.3335 11.7894 16.1668C13.1298 18.1866 15.9142 22.4023 16.3289 23.1074C16.8472 23.9887 20.3343 30.2499 20.6327 30.7089C20.9312 31.1679 21.7165 32.0493 21.9364 31.884C22.1563 31.7187 21.8579 30.5436 21.5909 29.7174C21.3238 28.8911 19.1562 24.7232 18.4808 23.3461C17.9405 22.2444 14.7957 16.5883 13.2909 13.8979C14.5421 12.2734 17.1618 8.87806 17.6304 8.29299C18.2161 7.56165 22.8737 1.94806 23.1028 1.65146C23.332 1.35485 23.8395 0.493744 23.5448 0.340657C23.2502 0.187571 22.5954 0.608558 22.0388 1.02955C21.4822 1.45053 17.3235 5.75763 16.7049 6.39265C16.2099 6.90066 13.3599 10.1557 11.9968 11.7198C10.8348 9.9029 8.46269 6.19156 8.26954 5.8811C8.0281 5.49304 4.5956 0.710851 3.84817 0.201206C3.28165 -0.185078 2.08585 0.000331625 1.66012 0.624552C1.12798 1.40477 1.50743 2.77366 1.84885 3.30801C2.48781 4.09156 4.61467 6.57854 5.43418 7.5365C6.25368 8.49446 8.97682 12.1766 10.236 13.8979C9.14755 15.3074 6.45856 18.7925 4.4098 21.4568C2.36104 24.1212 0.576093 27.1148 0.312293 28.0802Z" fill="url(#will-extract-gradient-popover)"/>
        <defs>
          <radialGradient id="will-extract-gradient-popover" cx="0" cy="0" r="1" gradientTransform="matrix(11.8521 -12.9807 9.61599 11.9972 13.4853 12.2084)" gradientUnits="userSpaceOnUse">
            <stop offset="0.226023" stopColor="#CF0202"/>
            <stop offset="1" stopColor="#910202"/>
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

export const ToothStatusPopover: React.FC<ToothStatusPopoverProps> = ({
  toothNumber,
  options,
  currentCode,
  onSelect,
  onRemove,
  onClose,
  productImageUrl: _productImageUrl,
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
      <div className="z-50 bg-white border border-gray-200 hover:border-blue-500 shadow-xl p-3 flex flex-col gap-2 transition-colors">
      <div className="flex gap-2">
        {options.filter((opt) => !isTeethInMouthCode(opt.code, opt.name)).map((opt) => {
          const isMissing = isMissingCode(opt.code, opt.name)
          const willExtract = isWillExtractCode(opt.code, opt.name)
          const isSelected = currentCode === opt.code
          const label = isMissing ? 'Missing' : willExtract ? 'Will extract' : opt.name
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => {
                if (isSelected && onRemove) {
                  onRemove()
                } else {
                  onSelect(opt.code)
                }
                onClose?.()
              }}
              className={`flex flex-col items-center gap-0 p-2 rounded-xl border-2 transition-all w-[90px] hover:shadow-sm ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Tooth image */}
              {(opt.visibilityType === 'Image' || (opt.visibilityType === 'Color' && opt.imagesByTooth?.[toothNumber])) && opt.imagesByTooth?.[toothNumber] ? (
                <div className="w-full h-[90px] flex items-center justify-center">
                  <img
                    src={opt.imagesByTooth[toothNumber]!}
                    alt={label}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
                  />
                </div>
              ) : isMissing ? (
                <MissingToothDisplay toothNumber={toothNumber} />
              ) : willExtract ? (
                <WillExtractToothDisplay toothNumber={toothNumber} />
              ) : (
                <div className="w-full h-[90px]">
                  <ToothImage toothNumber={toothNumber} />
                </div>
              )}
              {/* Label */}
              <span className="text-[10px] font-semibold text-center leading-tight text-black">
                #{toothNumber} {label}
              </span>
            </button>
          )
        })}
        {onRemove && currentCode && (
          <button
            type="button"
            onClick={() => {
              onRemove()
              onClose?.()
            }}
            className="flex flex-col items-center justify-center p-2 border border-transparent hover:border-orange-500 hover:bg-orange-50 rounded-xl transition-all group w-[90px]"
            title="Remove status"
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
