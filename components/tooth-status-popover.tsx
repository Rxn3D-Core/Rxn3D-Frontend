import React, { useEffect, useRef } from 'react'

export interface ToothStatusOption {
  code: string
  name: string
  color: string
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
}

const TOOTH_PNG_BASE64 =
  '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'

function isMissingCode(code: string, name: string): boolean {
  return code.toUpperCase() === 'MT' || name.toLowerCase().includes('missing')
}

function isWillExtractCode(code: string, name: string): boolean {
  const c = code.toUpperCase()
  const n = name.toLowerCase()
  return c === 'WED' || c === 'WEOD' || n.includes('will extract')
}

function MissingToothSVG({ uid }: { uid: string }) {
  return (
    <svg width="38" height="51" viewBox="0 0 38 51" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <rect width="37.9594" height="50.8816" fill={`url(#missing_pat_${uid})`} />
      <defs>
        <pattern id={`missing_pat_${uid}`} patternContentUnits="objectBoundingBox" width="1" height="1">
          <use xlinkHref={`#tooth_img_${uid}`} transform="matrix(0.031466 0 0 0.0234747 -0.63642 -1.34351)" />
        </pattern>
        <image id={`tooth_img_${uid}`} width="54" height="104" preserveAspectRatio="none" xlinkHref={`data:image/png;base64,${TOOTH_PNG_BASE64}`} />
      </defs>
    </svg>
  )
}

function WillExtractToothSVG({ uid }: { uid: string }) {
  return (
    <svg width="37" height="52" viewBox="0 0 37 52" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <rect width="36.8172" height="51.5207" fill={`url(#extract_pat_${uid})`} />
      <defs>
        <pattern id={`extract_pat_${uid}`} patternContentUnits="objectBoundingBox" width="1" height="1">
          <use xlinkHref={`#tooth_img2_${uid}`} transform="matrix(0.0291481 0 0 0.0208295 -0.573995 -0.189187)" />
        </pattern>
        <image id={`tooth_img2_${uid}`} width="54" height="104" preserveAspectRatio="none" xlinkHref={`data:image/png;base64,${TOOTH_PNG_BASE64}`} />
      </defs>
    </svg>
  )
}

export const ToothStatusPopover: React.FC<ToothStatusPopoverProps> = ({
  toothNumber,
  options,
  currentCode,
  onSelect,
  onClose,
  productImageUrl,
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

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white border border-gray-200 hover:border-blue-500 rounded-xl shadow-xl p-3 flex flex-col gap-2 transition-colors"
    >
      {/* Product image header */}
      {productImageUrl && (
        <div className="flex items-center justify-center pb-2 border-b border-gray-100">
          <img
            src={productImageUrl}
            alt="Product"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded flex-shrink-0"
          />
        </div>
      )}
      <div className="flex gap-2">
        {options.map((opt) => {
          const uid = `${toothNumber}_${opt.code}`
          const isMissing = isMissingCode(opt.code, opt.name)
          const willExtract = isWillExtractCode(opt.code, opt.name)
          const isSelected = currentCode === opt.code
          return (
            <button
              key={opt.code}
              onClick={() => {
                onSelect(opt.code)
                onClose?.()
              }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all w-[80px] hover:shadow-sm ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Tooth image */}
              <div className="flex items-center justify-center">
                {isMissing ? (
                  <MissingToothSVG uid={uid} />
                ) : willExtract ? (
                  <WillExtractToothSVG uid={uid} />
                ) : (
                  <div className="w-[38px] h-[51px] flex items-center justify-center">
                    <img
                      src={`/images/teeth/${toothNumber <= 16 ? 'maxillary' : 'mandibular'}/tooth-${toothNumber}.png`}
                      alt={`Tooth ${toothNumber}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.opacity = '0'
                      }}
                    />
                  </div>
                )}
              </div>
              {/* Label */}
              <span
                className={`text-[10px] font-semibold text-center leading-tight ${
                  isSelected ? 'text-blue-700' : 'text-gray-700'
                }`}
              >
                #{toothNumber} {opt.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
