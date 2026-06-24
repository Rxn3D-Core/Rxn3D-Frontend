import React, { useLayoutEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { RetentionTypePopover, RetentionOptionItem } from './retention-type-popover'
import { ToothStatusPopover, ToothStatusOption } from './tooth-status-popover'
import { getClaspOverlayImageUrl } from './case-design-center/utils/claspOverlayImage'
import {
  getRetentionChartImageUrl,
  getRetentionSelectorShape,
  isToothShowingRetentionOnChart,
} from './case-design-center/utils/retentionChartImage'
import { RetentionSelectorShapeGraphic } from './case-design-center/utils/RetentionSelectorShapeGraphic'

// Wrapper that positions children above a target point, clamped to container bounds.
// When `renderChildren` is provided, it receives the arrow offset (x within the popover
// that aligns with targetX) so the popover can draw a pointer arrow toward the tooth.
const PopoverPositioner: React.FC<{
  targetX: number
  targetY: number
  containerLeft: number
  containerRight: number
  /** Vertical gap between the target (tooth) and the popover. Leaves room for the arrow. */
  gap?: number
  children?: React.ReactNode
  renderChildren?: (arrowOffsetX: number) => React.ReactNode
}> = ({ targetX, targetY, containerLeft, containerRight, gap = 10, children, renderChildren }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [arrowOffsetX, setArrowOffsetX] = useState<number>(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const padding = 4
    // Clamp within both the SVG container bounds and the viewport
    const maxRight = Math.min(containerRight, window.innerWidth)
    const minLeft = Math.max(containerLeft, 0)
    // Center horizontally on targetX, then clamp
    let left = targetX - rect.width / 2
    if (left < minLeft + padding) {
      left = minLeft + padding
    } else if (left + rect.width > maxRight - padding) {
      left = maxRight - padding - rect.width
    }
    // Position above targetY with a gap so the popover does not cover the teeth
    const top = Math.max(padding, targetY - rect.height - gap)
    setPos({ left, top })
    // Arrow x is the tooth's x relative to the popover's left edge, clamped inside the popover
    const arrowPadding = 12
    const arrowX = Math.max(arrowPadding, Math.min(rect.width - arrowPadding, targetX - left))
    setArrowOffsetX(arrowX)
  }, [targetX, targetY, containerLeft, containerRight, gap])

  return (
    <div
      ref={ref}
      className="fixed z-50"
      style={pos
        ? { left: `${pos.left}px`, top: `${pos.top}px` }
        : { left: `${targetX}px`, top: `${targetY}px`, transform: 'translate(-50%, -100%)', opacity: 0 }
      }
    >
      {renderChildren ? renderChildren(arrowOffsetX) : children}
    </div>
  )
}

interface MaxillaryTeethSVGProps {
  selectedTeeth: number[]
  onToothClick?: (toothNumber: number) => void
  onGearClick?: (toothNumber: number) => void
  className?: string
  retentionTypesByTooth?: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  showRetentionPopover?: boolean
  retentionPopoverTooth?: number | null
  onSelectRetentionType?: (toothNumber: number, type: 'Implant' | 'Prep' | 'Pontic') => void
  onClosePopover?: () => void
  onDeselectTooth?: (toothNumber: number) => void
  // Tooth status popover for removable products
  showToothStatusPopover?: boolean
  toothStatusPopoverTooth?: number | null
  toothStatusByTooth?: Record<number, string>
  onSelectToothStatus?: (toothNumber: number, status: string) => void
  toothStatusOptions?: ToothStatusOption[]
  onCloseToothStatusPopover?: () => void
  onRemoveToothStatus?: (toothNumber: number) => void
  /** Product name shown in the tooth status popover header */
  toothStatusProductName?: string | null
  /** Product image URL shown in the tooth status popover header */
  toothStatusProductImageUrl?: string | null
  /** Maps toothNumber → extractionCode. */
  toothExtractionMap?: Record<number, string>
  /** Tooth numbers that should show the red X overlay (Will Extract on Delivery). */
  willExtractTeeth?: number[]
  /** Tooth numbers that should render the missing-tooth image overlay. */
  missingTeeth?: number[]
  /** When true, hide orange circle and gear icon indicators (used when tooth status boxes are active). */
  hideSelectionIndicators?: boolean
  /** Tooth numbers that have clasp status (overlay). */
  claspTeeth?: number[]
  /** Returns the addon field value string for a tooth (e.g. "1x Acrylic Clasp"). */
  getAddonValue?: (toothNumber: number) => string
  /** Retention options from the product API response (fallback when per-tooth lookup is empty). */
  retentionOptions?: RetentionOptionItem[]
  /** Per-tooth retention options (e.g. from getToothProduct); preferred over retentionOptions for chart overlays. */
  getRetentionOptionsForTooth?: (toothNumber: number) => RetentionOptionItem[] | undefined
  /** When true, renders a checkbox below each tooth that has an extraction status. */
  showCheckboxes?: boolean
  /** Called whenever the set of checked teeth changes. */
  onCheckedTeethChange?: (teeth: number[]) => void
  /** When true, disables all tooth interactions (pointer-events-none + dimmed). */
  disabled?: boolean
  /** When provided, shows this text as a tooltip on tooth hover. */
  toothHoverTooltip?: string
  /** Map of extraction code → per-tooth image URLs. Used to replace static overlays when visibility_type === "Image". */
  extractionImagesByCode?: Record<string, Record<number, string | null>>
  /**
   * Full extraction metadata keyed by code. When provided, tooth classification
   * (missing / will-extract / clasp) is derived from the extraction name rather
   * than hardcoded code strings, making rendering fully API-driven.
   */
  extractionsByCode?: Record<string, { code: string; name: string; visibility_type?: string; color?: string | null; overlay?: string }>
  /** When true, show clickable splint diamonds between adjacent selected teeth (active splinted product). */
  splintEnabled?: boolean
  /** Allow-list of eligible gaps (lower tooth of each adjacent same-product pair). When omitted, all consecutive selected pairs are eligible. */
  splintableLinks?: number[]
  /** Lower tooth number of each connected (splinted) adjacent pair, e.g. `6` connects 6 & 7. */
  splintedLinks?: number[]
  /** Toggle a splint link between tooth `lower` and `lower + 1`. */
  onToggleSplintLink?: (lower: number) => void
  /** Empty neighbor teeth that should show a wing retainer icon (derived from pontics). */
  wingTeeth?: number[]
}

export const MaxillaryTeethSVG: React.FC<MaxillaryTeethSVGProps> = ({
  selectedTeeth,
  onToothClick,
  className = '',
  retentionTypesByTooth = {},
  showRetentionPopover = false,
  retentionPopoverTooth = null,
  onSelectRetentionType,
  onClosePopover,
  onDeselectTooth,
  showToothStatusPopover = false,
  toothStatusPopoverTooth = null,
  toothStatusByTooth = {},
  onSelectToothStatus,
  toothStatusOptions = [],
  onCloseToothStatusPopover,
  onRemoveToothStatus,
  toothStatusProductName,
  toothStatusProductImageUrl,
  toothExtractionMap = {},
  willExtractTeeth = [],
  missingTeeth = [],
  hideSelectionIndicators = false,
  claspTeeth = [],
  getAddonValue,
  retentionOptions,
  getRetentionOptionsForTooth,
  showCheckboxes = false,
  onCheckedTeethChange,
  disabled = false,
  extractionImagesByCode = {},
  extractionsByCode = {},
  toothHoverTooltip,
  splintEnabled = false,
  splintableLinks,
  splintedLinks = [],
  onToggleSplintLink,
  wingTeeth = [],
}) => {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [hoveredTooth, setHoveredTooth] = React.useState<number | null>(null)
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number } | null>(null)
  const [hoveredSplintLink, setHoveredSplintLink] = React.useState<number | null>(null)
  const [checkedTeeth, setCheckedTeeth] = React.useState<Set<number>>(new Set())
  React.useEffect(() => {
    onCheckedTeethChange?.(Array.from(checkedTeeth).sort((a, b) => a - b))
  }, [checkedTeeth, onCheckedTeethChange])

  React.useEffect(() => {
    if (disabled) setHoveredTooth(null)
  }, [disabled])

  const isToothSelected = (toothNumber: number) => selectedTeeth.includes(toothNumber)

  const resolveExtraction = (toothNumber: number): { code: string; name: string; visibility_type?: string; color?: string | null; overlay?: string } | null => {
    const code = toothExtractionMap[toothNumber]
    if (!code) return null
    return extractionsByCode[code] ?? null
  }

  const hexToRgb = (hex: string): string => {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `${r},${g},${b}`
  }

  const getS3UrlForTooth = (toothNumber: number): string | null | undefined => {
    const code = toothExtractionMap[toothNumber]
    return code ? extractionImagesByCode[code]?.[toothNumber] : undefined
  }

  const resolveRetentionOptionsForTooth = (toothNumber: number): RetentionOptionItem[] | undefined => {
    const perTooth = getRetentionOptionsForTooth?.(toothNumber)
    if (perTooth?.length) return perTooth
    return retentionOptions
  }

  const getRetentionUrlForTooth = (toothNumber: number): string | null =>
    getRetentionChartImageUrl(toothNumber, retentionTypesByTooth, resolveRetentionOptionsForTooth(toothNumber))

  const getRetentionShapeForTooth = (toothNumber: number): string | null =>
    getRetentionSelectorShape(toothNumber, retentionTypesByTooth, resolveRetentionOptionsForTooth(toothNumber))

  const isToothShowingRetentionImage = (toothNumber: number): boolean =>
    !!getRetentionUrlForTooth(toothNumber)

  const isToothShowingRetentionShape = (toothNumber: number): boolean =>
    !!getRetentionShapeForTooth(toothNumber)

  const isToothShowingRetentionVisual = (toothNumber: number): boolean =>
    isToothShowingRetentionOnChart(
      toothNumber,
      retentionTypesByTooth,
      resolveRetentionOptionsForTooth(toothNumber)
    )

  const isToothMissing = (toothNumber: number): boolean => {
    // Catalog/S3 image already represents this tooth — skip fallback missing overlay.
    if (getS3UrlForTooth(toothNumber)) return false
    const ext = resolveExtraction(toothNumber)
    if (ext) return ext.visibility_type === 'Image'
    return missingTeeth.includes(toothNumber)
  }

  // True when we should render the S3 image in place of the tooth — covers both Image and Color types when an image URL exists
  const isToothShowingS3Image = (toothNumber: number): boolean => {
    return !!getS3UrlForTooth(toothNumber)
  }

  const isToothWillExtract = (toothNumber: number): boolean => {
    const ext = resolveExtraction(toothNumber)
    if (ext) return ext.visibility_type === 'Image' && !!getS3UrlForTooth(toothNumber)
    return willExtractTeeth.includes(toothNumber)
  }

  const getToothBaseRectStyle = (toothNumber: number): React.CSSProperties => {
    const ext = resolveExtraction(toothNumber)
    const s3Url = getS3UrlForTooth(toothNumber)

    // Full-arch retention images replace the tooth graphic; selector shapes overlay on top.
    if (isToothShowingRetentionImage(toothNumber)) {
      return { cursor: 'pointer', opacity: 0, transition: 'all 0.2s ease' }
    }

    // Catalog/S3 extraction image replaces the default tooth graphic.
    if (s3Url) {
      return { cursor: 'pointer', opacity: 0, transition: 'all 0.2s ease' }
    }
    // Color type without image: apply filter directly on rect
    if (ext?.visibility_type === 'Color' && !s3Url && ext.color) {
      const rgb = hexToRgb(ext.color)
      return {
        cursor: 'pointer',
        opacity: 1,
        transition: 'all 0.2s ease',
        filter: `opacity(0.35) drop-shadow(rgb(${rgb}) 0px 0px 0px)`,
      }
    }
    let opacity = 1
    if (isToothSelected(toothNumber)) opacity = 1
    return { cursor: 'pointer', opacity, transition: 'all 0.2s ease' }
  }

  const renderExtractionImageOverlay = (toothNumber: number, x: number, width: number, toothHeight: number = 141) => {
    const code = toothExtractionMap[toothNumber]
    if (!code) return null
    const url = extractionImagesByCode[code]?.[toothNumber]
    if (!url) return null
    return (
      <image
        key={`extraction-img-${toothNumber}`}
        href={url}
        x={x}
        y={0}
        width={width}
        height={toothHeight}
        preserveAspectRatio="xMidYMid slice"
        style={{ pointerEvents: 'none' }}
      />
    )
  }

  const renderRetentionImageOverlay = (
    toothNumber: number,
    x: number,
    width: number,
    toothHeight: number = 141
  ) => {
    const url = getRetentionUrlForTooth(toothNumber)
    if (!url) return null
    // Fill the tooth slot (cover) so the implant/retention graphic matches the default
    // teeth — same width as the slot (not wider), full height (not shrunk).
    return (
      <image
        key={`retention-img-${toothNumber}`}
        href={url}
        x={x}
        y={0}
        width={width}
        height={toothHeight}
        preserveAspectRatio="xMidYMid slice"
        onClick={() => handleToothClick(toothNumber)}
        onMouseEnter={() => setHoveredTooth(toothNumber)}
        onMouseLeave={() => setHoveredTooth(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
      />
    )
  }

  const renderRetentionSelectorShapeOverlay = (
    toothNumber: number,
    x: number,
    width: number,
    toothHeight: number = 141
  ) => {
    const shape = getRetentionShapeForTooth(toothNumber)
    if (!shape) return null
    const size = Math.min(width, toothHeight) * 0.5
    const cx = x + width / 2
    const cy = toothHeight / 2
    return (
      <g
        key={`retention-shape-${toothNumber}`}
        transform={`translate(${cx - size / 2}, ${cy - size / 2})`}
        onClick={() => handleToothClick(toothNumber)}
        onMouseEnter={() => setHoveredTooth(toothNumber)}
        onMouseLeave={() => setHoveredTooth(null)}
        style={{ cursor: 'pointer' }}
      >
        <RetentionSelectorShapeGraphic shapeApiName={shape} size={size} />
      </g>
    )
  }

  const hasAnyAcrylicClasp = (() => {
    if (!getAddonValue || claspTeeth.length === 0) return false
    // Addon value may be stored on any selected tooth (e.g. the representative/first tooth),
    // not necessarily on the clasp teeth themselves, so check all selected teeth.
    return selectedTeeth.some((tn) => getAddonValue(tn).toLowerCase().includes('acrylic'))
  })()

  // Wire/Acrylic clasp image (same base SVG, tinted for acrylic)
  const CLASP_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAACwAAAASCAYAAAAg9DzcAAAACXBIWXMAAAsSAAALEgHS3X78AAAFQUlEQVRIic3WTWycRxnA8f+8876z77vetXfXa7trO3aStrJEUZQzohLljEoBVTlyzKEOStMvJ/FH1rHzQQikKUE99MwJERAcuKEiEOIAVZsYJVZInJRskyZre73efT9nhkNICLSBpgTakeY0o2d+ejTzPCOstXxex+zh+eeF4BBaj4H9o7E8Jz6v4LmF+Z8K4XxDpCEYQ2wF0vW+404fmi07jmw4rquMMW9jzLfnZ+fe/6ygM4fnx4UQv895Xi0vDNZaVtsRG1FKX6nytGOMKWda+9pYR0j5jHXkxen6oec/C+x0vf6W68or5UJPbWLLMDu+MEGpr4/1dpfWZhdruSystUxNz6y7ntsnpMRxHLDWpkmy90i9fvr/AT0wN7dLuu6bSnmlal+Rx7cMU+4tcO3SMu+c/zN/udXCkR5bx8a2C2stL+/f/4vAD76mjUF67h00kMTx2aP1+jf/V9DXZmbGpZQ/85TamfNcRgarPDE2Ss6TXLt0gaWlJS592KKTWQb7q7d+dPr04L1H99LUVJrzA9cag5dTCCEAyNJ0PUmSnScWF68+SuzU7OxZlct93RFCBDmP7SPDbBsbxbGaKxeXuLB0jpXbbVYTi/QU27aMTRxfXFh27gYwxh5L4hghBGmSYIwGwPW8kp8Prrw2PXP2UUBfOTh9dPrw4TTn+8+50hGlQsBT28d5ctsYNotYPvcnLpx/j+vNNq3EYIVgeHDwx8cXF5YB/qmsTe598Td+4D/teYpMa5RSSFfey7bWOgvD6Hsnjyzuf1joywcOvqWU9y1PqZIQ4DmCgVKRJ8bH6O/vp9NqcvG9d7i2ssKHGyHN2BALyfDA0K/PvH7qq3fjfKQO757cc6NYLAx5niJNM6Tn4nouUkrE3/dorbMoin9pMn3y+8eP/vZByH1TB3a5rpxSOfVFKaUrBEgBeddh9LEBto6N4+cUzZsNls+/S+N6g2Y3phlbEhxqA0Nvn3n91Ffuj/mxjWP35J4b+VwwFAR50iTFWIOnFFJKXFeCEAjAAlmWhVrrhjX2r/eCSmfClbJ6F+kIAdagHEupx2fr6CiDg0PEYYf3Ly/TuHaV26trrHZT1hJLJiQjteEfnjpxYs+/2h7Y6XZPTt7M5fzBQrGI0ZokSVAqx8hjQzjSIdOGJE3IdIbWBmPuTGstVoBA4AhwHYuHJfAEld4itdoInudy++Z1bjYarK3eZmMzpNlNWY8NUuXMluHRXd89sviTj3P929Y8+eK+31lrvlQoFJHSIe8H7Nyxg75iEYslTVPSNCOOI6IoZjPs0ul0icIuVico15KTAk9YisUCPT0F4m6X1WaT9kaLjc0urU7EWpTRTQ39/dWVN994Y9sDQf8JDPDqwYMvrK2v/yDv+15PsUitWmWkVqM6MEBOKRzHQQiBtXeym6YpWZqw1rzBrRvXcdBkaYpAkKYJnW5MuxPS6oRshDFhkiFcz47Uhs+cPHbsI1fgocH3sr137/kwjp/K+z69xSLVSoWBapVKuUKQD1BKIQAhBEkS8UGjwdWrl9FZSpplRFFCGEV0o5huHBOnGoRDtVJZqZQrzy7WD537JI6H+q3N1OsTa+trP99otyc8zyPI+fTk8wSBj68UAoExhihJ2Nhs0w0jMp2SJilJlpFpjdEGIR2G+qsrlUrl2YW5uU8E/VTg+8e+V1/5Vau9+eXNzmaPRSDEP9asBWvve4T2TkUp9/ZG5b7ePxQKxRfmZ2eXPs25j+Q/vH9m+ngYhs9kWpe11j1JkpaCIPgALMrzriil3j22sPjSf30Q8DfYcYQVVJu/eAAAAABJRU5ErkJggg=="

  const renderCheckbox = (toothNumber: number, x: number, width: number, toothHeight: number = 141) => {
    if (!showCheckboxes) return null
    if (!toothExtractionMap[toothNumber]) return null
    const size = 14
    const cx = x + width / 2 - size / 2
    const cy = toothHeight + 3
    const isChecked = checkedTeeth.has(toothNumber)
    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation()
      setCheckedTeeth(prev => {
        const next = new Set(prev)
        if (next.has(toothNumber)) { next.delete(toothNumber) } else { next.add(toothNumber) }
        return next
      })
    }
    return (
      <svg key={`checkbox-${toothNumber}`} x={cx} y={cy} width={size} height={size}
        viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ cursor: 'pointer' }} onClick={handleToggle}>
        {isChecked ? (
          <>
            <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="#1162A8" stroke="#1162A8" />
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="white" stroke="#9CA3AF" />
        )}
      </svg>
    )
  }

  const renderMissingToothImage = (toothNumber: number, x: number, width: number, toothHeight: number = 141) => {
    if (isToothShowingS3Image(toothNumber) || !isToothMissing(toothNumber)) return null
    const code = toothExtractionMap[toothNumber]
    const dynamicUrl = code ? extractionImagesByCode[code]?.[toothNumber] : undefined
    const href = dynamicUrl ?? `/images/teeth/maxillary/missing-teeth/tooth-${toothNumber}.png`
    return (
      <image
        key={`missing-tooth-${toothNumber}`}
        href={href}
        x={x}
        y={0}
        width={width}
        height={toothHeight}
        preserveAspectRatio="xMidYMid slice"
        style={{ pointerEvents: 'none' }}
      />
    )
  }

  const renderWillExtractOverlay = (toothNumber: number, x: number, width: number, toothHeight: number = 141) => {
    if (!isToothWillExtract(toothNumber)) return null
    const code = toothExtractionMap[toothNumber]
    const dynamicUrl = code ? extractionImagesByCode[code]?.[toothNumber] : undefined
    if (dynamicUrl) {
      return (
        <image
          key={`will-extract-${toothNumber}`}
          href={dynamicUrl}
          x={x}
          y={0}
          width={width}
          height={toothHeight}
          preserveAspectRatio="xMidYMid slice"
          style={{ pointerEvents: 'none' }}
        />
      )
    }
    const xSize = Math.max(width * 0.8, 18)
    const ySize = xSize * (32 / 24)
    const cx = x + width / 2 - xSize / 2
    const cy = toothHeight / 2 - ySize / 2
    return (
      <svg
        key={`will-extract-${toothNumber}`}
        x={cx}
        y={cy}
        width={xSize}
        height={ySize}
        viewBox="0 0 24 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ pointerEvents: 'none' }}
      >
        <path d="M0.312293 28.0802C0.0484933 29.0457 -0.341315 29.7125 0.576054 30.6215C1.49342 31.5305 3.08986 29.9351 3.24269 29.7276C3.39553 29.5202 6.21477 24.8224 6.85731 23.7684C7.36025 22.9433 10.3391 18.3335 11.7894 16.1668C13.1298 18.1866 15.9142 22.4023 16.3289 23.1074C16.8472 23.9887 20.3343 30.2499 20.6327 30.7089C20.9312 31.1679 21.7165 32.0493 21.9364 31.884C22.1563 31.7187 21.8579 30.5436 21.5909 29.7174C21.3238 28.8911 19.1562 24.7232 18.4808 23.3461C17.9405 22.2444 14.7957 16.5883 13.2909 13.8979C14.5421 12.2734 17.1618 8.87806 17.6304 8.29299C18.2161 7.56165 22.8737 1.94806 23.1028 1.65146C23.332 1.35485 23.8395 0.493744 23.5448 0.340657C23.2502 0.187571 22.5954 0.608558 22.0388 1.02955C21.4822 1.45053 17.3235 5.75763 16.7049 6.39265C16.2099 6.90066 13.3599 10.1557 11.9968 11.7198C10.8348 9.9029 8.46269 6.19156 8.26954 5.8811C8.0281 5.49304 4.5956 0.710851 3.84817 0.201206C3.28165 -0.185078 2.08585 0.000331625 1.66012 0.624552C1.12798 1.40477 1.50743 2.77366 1.84885 3.30801C2.48781 4.09156 4.61467 6.57854 5.43418 7.5365C6.25368 8.49446 8.97682 12.1766 10.236 13.8979C9.14755 15.3074 6.45856 18.7925 4.4098 21.4568C2.36104 24.1212 0.576093 27.1148 0.312293 28.0802Z" fill="url(#will-extract-gradient-max)"/>
        <defs>
          <radialGradient id="will-extract-gradient-max" cx="0" cy="0" r="1" gradientTransform="matrix(11.8521 -12.9807 9.61599 11.9972 13.4853 12.2084)" gradientUnits="userSpaceOnUse">
            <stop offset="0.226023" stopColor="#CF0202"/>
            <stop offset="1" stopColor="#910202"/>
          </radialGradient>
        </defs>
      </svg>
    )
  }

  const renderClaspOverlay = (toothNumber: number, x: number, width: number, yOffset: number = 0) => {
    if (!claspTeeth.includes(toothNumber)) return null
    const dynamicUrl = getClaspOverlayImageUrl({
      toothNumber,
      claspTeeth,
      toothExtractionMap,
      extractionImagesByCode,
      extractionsByCode,
    })
    if (dynamicUrl) {
      const claspW = Math.max(width, 20)
      const claspH = Math.round(claspW * (17 / 41))
      return (
        <image
          key={`clasp-${toothNumber}`}
          href={dynamicUrl}
          x={x}
          y={yOffset}
          width={claspW}
          height={claspH}
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        />
      )
    }
    const acrylic = hasAnyAcrylicClasp
    const claspW = Math.max(width, 20)
    const claspH = Math.round(claspW * (17 / 41))
    return (
      <svg
        key={`clasp-${toothNumber}`}
        x={x}
        y={yOffset}
        width={claspW}
        height={claspH}
        viewBox="0 0 41 17"
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
      >
        {acrylic && (
          <defs>
            <filter id={`acrylic-tint-${toothNumber}`} colorInterpolationFilters="sRGB">
              <feFlood floodColor="#d4848a" result="color" />
              <feComposite in="color" in2="SourceAlpha" operator="in" />
            </filter>
          </defs>
        )}
        <g transform="translate(0, 17) scale(1, -1)">
          <rect
            x="0"
            y="0"
            width="40.8594"
            height="16.7152"
            fill={`url(#clasp-pattern-${toothNumber})`}
            filter={acrylic ? `url(#acrylic-tint-${toothNumber})` : undefined}
          />
        </g>
        <defs>
          <pattern id={`clasp-pattern-${toothNumber}`} patternContentUnits="objectBoundingBox" width="1" height="1">
            <use xlinkHref={`#clasp-image-${toothNumber}`} transform="scale(0.0227273 0.0555556)" />
          </pattern>
          <image id={`clasp-image-${toothNumber}`} width="44" height="18" preserveAspectRatio="none" xlinkHref={`data:image/png;base64,${CLASP_IMAGE_B64}`} />
        </defs>
      </svg>
    )
  }

  // Wire clasp SVG image (metallic, default)
  const WIRE_CLASP_HREF = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAASCAYAAAAg9DzcAAAACXBIWXMAAAsSAAALEgHS3X78AAAFQUlEQVRIic3WTWycRxnA8f+8876z77vetXfXa7trO3aStrJEUZQzohLljEoBVTlyzKEOStMvJ/FH1rHzQQikKUE99MwJERAcuKEiEOIAVZsYJVZInJRskyZre73efT9nhkNICLSBpgTakeY0o2d+ejTzPCOstXxex+zh+eeF4BBaj4H9o7E8Jz6v4LmF+Z8K4XxDpCEYQ2wF0vW+404fmi07jmw4rquMMW9jzLfnZ+fe/6ygM4fnx4UQv895Xi0vDNZaVtsRG1FKX6nytGOMKWda+9pYR0j5jHXkxen6oec/C+x0vf6W68or5UJPbWLLMDu+MEGpr4/1dpfWZhdruSystUxNz6y7ntsnpMRxHLDWpkmy90i9fvr/AT0wN7dLuu6bSnmlal+Rx7cMU+4tcO3SMu+c/zN/udXCkR5bx8a2C2stL+/f/4vAD76mjUF67h00kMTx2aP1+jf/V9DXZmbGpZQ/85TamfNcRgarPDE2Ss6TXLt0gaWlJS592KKTWQb7q7d+dPr04L1H99LUVJrzA9cag5dTCCEAyNJ0PUmSnScWF68+SuzU7OxZlct93RFCBDmP7SPDbBsbxbGaKxeXuLB0jpXbbVYTi/QU27aMTRxfXFh27gYwxh5L4hghBGmSYIwGwPW8kp8Prrw2PXP2UUBfOTh9dPrw4TTn+8+50hGlQsBT28d5ctsYNotYPvcnLpx/j+vNNq3EYIVgeHDwx8cXF5YB/qmsTe958Td+4D/teYpMa5RSSFfey7bWOgvD6Hsnjyzuf1joywcOvqWU9y1PqZIQ4DmCgVKRJ8bH6O/vp9NqcvG9d7i2ssKHGyHN2BALyfDA0K/PvH7qq3fjfKQO757cc6NYLAx5niJNM6Tn4nouUkrE3/dorbMoin9pMn3y+8eP/vZByH1TB3a5rpxSOfVFKaUrBEgBeddh9LEBto6N4+cUzZsNls+/S+N6g2Y3phlbEhxqA0Nvn3n91Ffuj/mxjWP35J4b+XwwFAR50iTFWIOnFFJKXFeCEAjAAlmWhVrrhjX2r/eCSmfClbJ6F+kIAdagHEupx2fr6CiDg0PEYYf3Ly/TuHaV26trrHZT1hJLJiQjteEfnjpxYs+/2h7Y6XZPTt7M5fzBQrGI0ZokSVAqx8hjQzjSIdOGJE3IdIbWBmPuTGstVoBA4AhwHYuHJfAEld4itdoInudy++Z1bjYarK3eZmMzpNlNWY8NUuXMluHRXd89sviTj3P929Y8+eK+31lrvlQoFJHSIe8H7Nyxg75iEYslTVPSNCOOI6IoZjPs0ul0icIuVico15KTAk9YisUCPT0F4m6X1WaT9kaLjc0urU7EWpTRTQ39/dWVN994Y9sDQf8JDPDqwYMvrK2v/yDv+15PsUitWmWkVqM6MEBOKRzHQQiB NXeym6YpWZqw1rzBrRvXcdBkaYpAkKYJnW5MuxPS6oRshDFhkiFcz47Uhs+cPHbsI1fgocH3sr177/kwjp/K+z69xSLVSoWBapVKuUKQD1BKIQAhBEkS8UGjwdWrl9FZSpplRFFCGEV0o5huHBOnGoRDtVJZqZQrzy7WD537JI6H+q3N1OsTa+trP99otyc8zyPI+fTk8wSBj68UAoExhihJ2Nhs0w0jMp2SJilJlpFpjdEGIR2G+qsrlUrl2YW5uU8E/VTg+8e+V1/5Vau9+eXNzmaPRSDEP9asBWvve4T2TkUp9/ZG5b7ePxQKxRfmZ2eXPs25j+Q/vH9m+ngYhs9kWpe11j1JkpaCIPgALMrzriil3j22sPjSf30Q8DfYcYQVVJu/eAAAAABJRU5ErkJggg=="

  // Acrylic clasp SVG image (pink crescent)
  const ACRYLIC_CLASP_HREF = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAASCAYAAAAg9DzcAAAACXBIWXMAAAsSAAALEgHS3X78AAAFQUlEQVRIic3WTWycRxnA8f+8876z77vetXfXa7trO3aStrJEUZQzohLljEoBVTlyzKEOStMvJ/FH1rHzQQikKUE99MwJERAcuKEiEOIAVZsYJVZInJRskyZre73efT9nhkNICLSBpgTakeY0o2d+ejTzPCOstXxex+zh+eeF4BBaj4H9o7E8Jz6v4LmF+Z8K4XxDpCEYQ2wF0vW+404fmi07jmw4rquMMW9jzLfnZ+fe/6ygM4fnx4UQv895Xi0vDNZaVtsRG1FKX6nytGOMKWda+9pYR0j5jHXkxen6oec/C+x0vf6W68or5UJPbWLLMDu+MEGpr4/1dpfWZhdruSystUxNz6y7ntsnpMRxHLDWpkmy90i9fvr/AT0wN7dLuu6bSnmlal+Rx7cMU+4tcO3SMu+c/zN/udXCkR5bx8a2C2stL+/f/4vAD76mjUF67h00kMTx2aP1+jf/V9DXZmbGpZQ/85TamfNcRgarPDE2Ss6TXLt0gaWlJS592KKTWQb7q7d+dPr04L1H99LUVJrzA9cag5dTCCEAyNJ0PUmSnScWF68+SuzU7OxZlct93RFCBDmP7SPDbBsbxbGaKxeXuLB0jpXbbVYTi/QU27aMTRxfXFh27gYwxh5L4hghBGmSYIwGwPW8kp8Prrw2PXP2UUBfOTh9dPrw4TTn+8+50hGlQsBT28d5ctsYNotYPvcnLpx/j+vNNq3EYIVgeHDwx8cXF5YB/qmsTe958Td+4D/teYpMa5RSSFfey7bWOgvD6Hsnjyzuf1joywcOvqWU9y1PqZIQ4DmCgVKRJ8bH6O/vp9NqcvG9d7i2ssKHGyHN2BALyfDA0K/PvH7qq3fjfKQO757cc6NYLAx5niJNM6Tn4nouUkrE3/dorbMoin9pMn3y+8eP/vZByH1TB3a5rpxSOfVFKaUrBEgBeddh9LEBto6N4+cUzZsNls+/S+N6g2Y3phlbEhxqA0Nvn3n91Ffuj/mxjWP35J4b+XwwFAR50iTFWIOnFFJKXFeCEAjAAlmWhVrrhjX2r/eCSmfClbJ6F+kIAdagHEupx2fr6CiDg0PEYYf3Ly/TuHaV26trrHZT1hJLJiQjteEfnjpxYs+/2h7Y6XZPTt7M5fzBQrGI0ZokSVAqx8hjQzjSIdOGJE3IdIbWBmPuTGstVoBA4AhwHYuHJfAEld4itdoInudy++Z1bjYarK3eZmMzpNlNWY8NUuXMluHRXd89sviTj3P929Y8+eK+31lrvlQoFJHSIe8H7Nyxg75iEYslTVPSNCOOI6IoZjPs0ul0icIuVico15KTAk9YisUCPT0F4m6X1WaT9kaLjc0urU7EWpTRTQ39/dWVN994Y9sDQf8JDPDqwYMvrK2v/yDv+15PsUitWmWkVqM6MEBOKRzHQQiB NXeym6YpWZqw1rzBrRvXcdBkaYpAkKYJnW5MuxPS6oRshDFhkiFcz47Uhs+cPHbsI1fgocH3sr177/kwjp/K+z69xSLVSoWBapVKuUKQD1BKIQAhBEkS8UGjwdWrl9FZSpplRFFCGEV0o5huHBOnGoRDtVJZqZQrzy7WD537JI6H+q3N1OsTa+trP99otyc8zyPI+fTk8wSBj68UAoExhihJ2Nhs0w0jMp2SJilJlpFpjdEGIR2G+qsrlUrl2YW5uU8E/VTg+8e+V1/5Vau9+eXNzmaPRSDEP9asBWvve4T2TkUp9/ZG5b7ePxQKxRfmZ2eXPs25j+Q/vH9m+ngYhs9kWpe11j1JkpaCIPgALMrzriil3j22sPjSf30Q8DfYcYQVVJu/eAAAAABJRU5ErkJggg=="


  const handleToothClick = (toothNumber: number) => {
    if (onToothClick) {
      onToothClick(toothNumber)
    }
  }

  // Circle positions for each tooth (cx, cy values from the original circles)
  // MUST be defined before getPopoverPosition() uses it
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

  // Calculate popover position for a given tooth number
  const getToothPopoverPosition = (toothNumber: number) => {
    if (!svgRef.current) {
      return { left: 0, top: 0, containerLeft: 0, containerRight: 0 }
    }
    const svgRect = svgRef.current.getBoundingClientRect()
    const svgViewBox = svgRef.current.viewBox.baseVal
    if (!svgViewBox || svgViewBox.width === 0 || svgViewBox.height === 0) {
      return { left: 0, top: 0, containerLeft: 0, containerRight: 0 }
    }
    const scaleX = svgRect.width / svgViewBox.width
    const toothPos = circlePositions[toothNumber]
    if (!toothPos) {
      return { left: 0, top: 0, containerLeft: 0, containerRight: 0 }
    }
    const viewportX = svgRect.left + (toothPos.cx * scaleX)
    // Anchor bottom of popover to the top of the SVG so it never overlaps teeth
    const popoverTop = svgRect.top
    return {
      left: viewportX,
      top: popoverTop,
      containerLeft: svgRect.left,
      containerRight: svgRect.right
    }
  }

  // Position above the specific tooth that triggered the retention popover
  // If the removable tooth-status popover is active, never show retention popover.
  const effectiveShowRetentionPopover = showRetentionPopover && !showToothStatusPopover
  const getPopoverPosition = () => {
    if (!effectiveShowRetentionPopover || retentionPopoverTooth === null) {
      return { left: 0, top: 0, containerLeft: 0, containerRight: 0 }
    }
    return getToothPopoverPosition(retentionPopoverTooth)
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

  // SVG Components for each retention type
  const ImplantIndicator = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.3584 22.6572C12.3213 26.4281 17.6777 26.4281 18.6406 22.6572L22.3369 8.18164C22.9437 5.80533 21.1488 3.49323 18.6963 3.49316H11.3027C8.85035 3.49343 7.05533 5.80543 7.66211 8.18164L11.3584 22.6572Z" fill="#1162A8" fillOpacity="0.2" stroke="#1162A8" strokeWidth="1.07369" />
    </svg>
  )

  const PrepIndicator = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.4797 9.15527H17.7229C19.7124 9.15527 21.4417 10.5214 21.9016 12.457L23.8938 20.8457H6.12134L8.32349 12.3701C8.81534 10.4772 10.524 9.15547 12.4797 9.15527Z" fill="#1162A8" fillOpacity="0.2" stroke="#1162A8" strokeWidth="1.07369" />
    </svg>
  )

  const PonticIndicator = () => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.72111 15.3455L5.9663 20.9246C9.30315 21.6011 11.3148 22.8177 14.7184 22.7296C17.6986 22.6524 23.6874 20.9246 23.6874 20.9246L24.917 18.4695C25.3972 17.5107 26.0315 14.2464 24.917 12.0243C24.1945 10.5839 23.5353 9.68426 22.0961 9.10854C20.8275 8.60105 18.6242 9.10854 18.6242 9.10854C18.6242 9.10854 16.3872 7.30331 14.7184 7.26717C13.3251 7.237 11.3189 8.41809 11.3189 8.41809C11.3189 8.41809 9.66638 7.75798 8.57034 7.80422C7.18619 7.86262 6.23675 8.08466 5.24314 9.10854C3.87617 10.5172 4.72111 15.3455 4.72111 15.3455Z" fill="#1162A8" fillOpacity="0.2" stroke="#1162A8" strokeWidth="1.07369" />
    </svg>
  )

  // Helper function to render the gear icon (reusing the exact structure from selected teeth)
  const renderGearIcon = (toothNumber: number) => {
    const pos = circlePositions[toothNumber]
    if (!pos) return null

    // Gear icon center: x matches circle cx, y is fixed at 107.674
    const gearX = pos.cx
    const gearY = 107.674

    // Base gear icon path from tooth 16 (x=673). We'll use transform to position it correctly
    const baseX = 673
    const offsetX = gearX - baseX

    // Use transform to translate the gear icon to the correct position
    // Remove clipPath for hover to ensure it renders correctly for all teeth
    return (
      <g transform={`translate(${offsetX}, 20)`} style={{ pointerEvents: 'none' }}>
        <path d="M673 107.674C674.312 107.674 675.375 106.611 675.375 105.299C675.375 103.987 674.312 102.924 673 102.924C671.688 102.924 670.625 103.987 670.625 105.299C670.625 106.611 671.688 107.674 673 107.674Z" stroke="#7F7F7F" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M678.858 107.674C678.753 107.913 678.722 108.177 678.768 108.434C678.815 108.691 678.937 108.928 679.12 109.115L679.167 109.162C679.314 109.309 679.431 109.484 679.511 109.676C679.59 109.868 679.631 110.074 679.631 110.282C679.631 110.49 679.59 110.696 679.511 110.889C679.431 111.081 679.314 111.256 679.167 111.403C679.02 111.55 678.845 111.667 678.653 111.746C678.461 111.826 678.255 111.867 678.047 111.867C677.839 111.867 677.633 111.826 677.441 111.746C677.248 111.667 677.074 111.55 676.927 111.403L676.879 111.355C676.693 111.173 676.456 111.05 676.199 111.004C675.942 110.957 675.677 110.988 675.438 111.094C675.204 111.194 675.004 111.361 674.864 111.573C674.723 111.786 674.648 112.034 674.647 112.289V112.424C674.647 112.844 674.48 113.246 674.183 113.543C673.886 113.84 673.483 114.007 673.063 114.007C672.643 114.007 672.241 113.84 671.944 113.543C671.647 113.246 671.48 112.844 671.48 112.424V112.353C671.474 112.091 671.389 111.836 671.237 111.623C671.084 111.41 670.871 111.248 670.625 111.157C670.386 111.052 670.121 111.02 669.865 111.067C669.608 111.113 669.371 111.236 669.184 111.418L669.137 111.466C668.99 111.613 668.815 111.73 668.623 111.81C668.431 111.889 668.225 111.93 668.016 111.93C667.808 111.93 667.602 111.889 667.41 111.81C667.218 111.73 667.043 111.613 666.896 111.466C666.749 111.319 666.632 111.144 666.553 110.952C666.473 110.76 666.432 110.554 666.432 110.346C666.432 110.138 666.473 109.932 666.553 109.739C666.632 109.547 666.749 109.373 666.896 109.225L666.944 109.178C667.126 108.991 667.249 108.754 667.295 108.498C667.342 108.241 667.31 107.976 667.205 107.737C667.105 107.503 666.938 107.303 666.726 107.163C666.513 107.022 666.264 106.947 666.01 106.945H665.875C665.455 106.945 665.052 106.779 664.755 106.482C664.458 106.185 664.292 105.782 664.292 105.362C664.292 104.942 664.458 104.54 664.755 104.243C665.052 103.946 665.455 103.779 665.875 103.779H665.946C666.208 103.773 666.462 103.688 666.676 103.535C666.889 103.383 667.051 103.17 667.142 102.924C667.247 102.685 667.278 102.42 667.232 102.163C667.185 101.907 667.063 101.67 666.88 101.483L666.833 101.435C666.686 101.288 666.569 101.114 666.489 100.922C666.41 100.729 666.369 100.523 666.369 100.315C666.369 100.107 666.41 99.9012 666.489 99.709C666.569 99.5167 666.686 99.3421 666.833 99.1951C666.98 99.0479 667.155 98.9311 667.347 98.8514C667.539 98.7717 667.745 98.7307 667.953 98.7307C668.161 98.7307 668.367 98.7717 668.559 98.8514C668.752 98.9311 668.926 99.0479 669.073 99.1951L669.121 99.2426C669.307 99.4251 669.544 99.5475 669.801 99.5941C670.058 99.6406 670.323 99.6092 670.562 99.5038H670.625C670.859 99.4035 671.059 99.2368 671.199 99.0244C671.34 98.812 671.416 98.5632 671.417 98.3084V98.1738C671.417 97.7539 671.583 97.3512 671.88 97.0542C672.177 96.7573 672.58 96.5905 673 96.5905C673.42 96.5905 673.823 96.7573 674.12 97.0542C674.417 97.3512 674.583 97.7539 674.583 98.1738V98.2451C674.584 98.4998 674.66 98.7487 674.8 98.9611C674.941 99.1735 675.141 99.3401 675.375 99.4405C675.614 99.5459 675.879 99.5773 676.135 99.5307C676.392 99.4842 676.629 99.3618 676.816 99.1792L676.863 99.1317C677.01 98.9845 677.185 98.8677 677.377 98.7881C677.569 98.7084 677.775 98.6674 677.984 98.6674C678.192 98.6674 678.398 98.7084 678.59 98.7881C678.782 98.8677 678.957 98.9845 679.104 99.1317C679.251 99.2788 679.368 99.4534 679.447 99.6456C679.527 99.8378 679.568 100.044 679.568 100.252C679.568 100.46 679.527 100.666 679.447 100.858C679.368 101.05 679.251 101.225 679.104 101.372L679.056 101.42C678.874 101.606 678.751 101.843 678.705 102.1C678.658 102.357 678.69 102.622 678.795 102.86V102.924C678.895 103.158 679.062 103.358 679.274 103.498C679.487 103.639 679.736 103.714 679.99 103.715H680.125C680.545 103.715 680.948 103.882 681.245 104.179C681.542 104.476 681.708 104.879 681.708 105.299C681.708 105.719 681.542 106.121 681.245 106.418C680.948 106.715 680.545 106.882 680.125 106.882H680.054C679.799 106.883 679.55 106.959 679.338 107.099C679.125 107.24 678.959 107.44 678.858 107.674Z" stroke="#7F7F7F" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    )
  }

  // Helper function to render the selection indicator
  const renderSelectionIndicator = (toothNumber: number) => {
    const pos = circlePositions[toothNumber]
    if (!pos) return null

    const retentionTypes = retentionTypesByTooth[toothNumber] || []
    if (retentionTypes.length > 0 && isToothShowingRetentionVisual(toothNumber)) {
      return null
    }

    // Default: show orange circle
    return <circle cx={pos.cx} cy={pos.cy} r="7.08203" fill="#FF9900" fillOpacity="0.2" stroke="#FF9900" />
  }

  // Splint connectors between two adjacent selected teeth: a rounded bar at the crown
  // level. Splinted (filled gray) bars always render so the connection stays visible
  // even when the product accordion is collapsed; empty/clickable bars on eligible
  // gaps appear only while the product is active (editable).
  const renderSplintDiamonds = () => {
    const links = new Set(splintedLinks)
    const allowed = splintableLinks ? new Set(splintableLinks) : null
    const nodes: React.ReactNode[] = []
    const SPLINT_Y = 95
    const BAR_H = 10
    // Gaps to render: every splinted link (read-only, independent of the active card's
    // selection so it survives switching arches/products) plus eligible empty gaps among
    // the active selection when editable.
    const gaps = new Set<number>(splintedLinks)
    if (splintEnabled && !disabled) {
      const sorted = [...selectedTeeth].sort((a, b) => a - b)
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1] === sorted[i] + 1 && (!allowed || allowed.has(sorted[i]))) {
          gaps.add(sorted[i])
        }
      }
    }
    for (const lower of Array.from(gaps).sort((a, b) => a - b)) {
      const upper = lower + 1
      const splinted = links.has(lower)
      const editable = splintEnabled && !disabled && (!allowed || allowed.has(lower))
      const a = circlePositions[lower]
      const b = circlePositions[upper]
      if (!a || !b) continue
      const mx = (a.cx + b.cx) / 2
      const barW = Math.max(14, Math.abs(b.cx - a.cx) * 0.6)
      const hovered = editable && hoveredSplintLink === lower
      const fill = splinted ? '#8A8A8A' : hovered ? '#D9D9D9' : '#FFFFFF'
      nodes.push(
        <g
          key={`splint-${lower}`}
          style={{ cursor: editable ? 'pointer' : 'default' }}
          onMouseEnter={editable ? () => setHoveredSplintLink(lower) : undefined}
          onMouseLeave={editable ? () => setHoveredSplintLink((prev) => (prev === lower ? null : prev)) : undefined}
          onClick={editable ? (e) => { e.stopPropagation(); onToggleSplintLink?.(lower) } : undefined}
        >
          {/* Transparent hit area enlarges the clickable/hoverable gap (editable only) */}
          {editable && (
            <rect x={mx - barW / 2 - 3} y={SPLINT_Y - BAR_H / 2 - 5} width={barW + 6} height={BAR_H + 10} fill="transparent" />
          )}
          {/* Connector bar: empty (outline) → filled gray when splinted */}
          <rect
            x={mx - barW / 2}
            y={SPLINT_Y - BAR_H / 2}
            width={barW}
            height={BAR_H}
            rx={BAR_H / 2}
            fill={fill}
            stroke="#8A8A8A"
            strokeWidth={1}
            style={{ transition: 'fill 0.15s ease' }}
          />
        </g>
      )
    }
    return nodes
  }

  // Wing retainer indicator: a derived (non-interactive) gray filled circle drawn on
  // the empty neighbor of a pontic (Maryland / cantilever wing retainer).
  const renderWings = () => {
    if (!wingTeeth || wingTeeth.length === 0) return null
    return wingTeeth.map((wing) => {
      const pos = circlePositions[wing]
      if (!pos) return null
      return (
        <circle
          key={`wing-${wing}`}
          cx={pos.cx}
          cy={pos.cy + 22}
          r="10"
          fill="#8A8A8A"
          style={{ pointerEvents: 'none' }}
        />
      )
    })
  }

  return (
    <>
      {/* Retention Type Popover - using portal to avoid nesting issues */}
      {effectiveShowRetentionPopover && retentionPopoverTooth !== null && onSelectRetentionType && typeof window !== 'undefined' && (() => {
        const popoverPosition = getPopoverPosition()
        // Don't render if position calculation failed (returned 0, 0)
        if (popoverPosition.left === 0 && popoverPosition.top === 0) {
          return null
        }
        // Get the currently selected retention type for this tooth (only first one since only one is allowed)
        const retentionTypes = retentionTypesByTooth[retentionPopoverTooth] || []
        const selectedType = retentionTypes.length > 0 ? retentionTypes[0] : null
        return ReactDOM.createPortal(
          <PopoverPositioner key={retentionPopoverTooth} targetX={popoverPosition.left} targetY={popoverPosition.top} containerLeft={popoverPosition.containerLeft} containerRight={popoverPosition.containerRight}
            renderChildren={(arrowOffsetX) => (
              <RetentionTypePopover
                toothNumber={retentionPopoverTooth}
                retentionOptions={
                  resolveRetentionOptionsForTooth(retentionPopoverTooth) ?? retentionOptions
                }
                onSelectRetentionType={(type) => onSelectRetentionType(retentionPopoverTooth, type)}
                selectedType={selectedType || undefined}
                onClose={onClosePopover}
                onDeselectTooth={() => {
                  if (retentionPopoverTooth !== null) {
                    if (onDeselectTooth) {
                      onDeselectTooth(retentionPopoverTooth)
                    } else if (onToothClick) {
                      onToothClick(retentionPopoverTooth)
                    }
                  }
                }}
                arrowOffsetX={arrowOffsetX}
                arrowDirection="down"
              />
            )}
          />,
          document.body
        )
      })()
      }

      {/* Tooth Status Popover for removable products */}
      {showToothStatusPopover && toothStatusPopoverTooth !== null && onSelectToothStatus && typeof window !== 'undefined' && (() => {
        const popoverPosition = getToothPopoverPosition(toothStatusPopoverTooth)
        if (popoverPosition.left === 0 && popoverPosition.top === 0) return null
        return ReactDOM.createPortal(
          <PopoverPositioner
            key={toothStatusPopoverTooth}
            targetX={popoverPosition.left}
            targetY={popoverPosition.top}
            containerLeft={popoverPosition.containerLeft}
            containerRight={popoverPosition.containerRight}
            gap={14}
            renderChildren={(arrowOffsetX) => (
              <ToothStatusPopover
                toothNumber={toothStatusPopoverTooth}
                options={toothStatusOptions}
                currentCode={(() => {
                  const mapped = toothStatusByTooth[toothStatusPopoverTooth]
                  if (mapped) return mapped
                  if (claspTeeth.includes(toothStatusPopoverTooth)) {
                    const claspOpt = toothStatusOptions.find(o =>
                      o.code.toUpperCase().includes('CLASP') || o.name.toLowerCase().trim() === 'clasps' || o.name.toLowerCase().trim() === 'clasp'
                    )
                    return claspOpt?.code ?? null
                  }
                  return null
                })()}
                onSelect={(code) => onSelectToothStatus(toothStatusPopoverTooth, code)}
                onRemove={onRemoveToothStatus ? () => onRemoveToothStatus(toothStatusPopoverTooth) : undefined}
                onClose={onCloseToothStatusPopover}
                productImageUrl={toothStatusProductImageUrl}
                arrowOffsetX={arrowOffsetX}
                arrowDirection="down"
              />
            )}
          />,
          document.body
        )
      })()}

      <div
        className={`relative mx-auto max-w-[76%] ${className}${disabled ? ' pointer-events-none opacity-50' : ''}`}
        onMouseMove={(toothHoverTooltip || splintEnabled) ? (e) => setMousePos({ x: e.clientX, y: e.clientY }) : undefined}
        onMouseLeave={(toothHoverTooltip || splintEnabled) ? () => setMousePos(null) : undefined}
      >

        <svg ref={svgRef} className="w-full h-auto" viewBox={`0 0 695 ${showCheckboxes ? "158" : "139"}`} fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
          {toothMapping.map(({ tooth, x, width, pattern }) => {
            const isHovered = hoveredTooth === tooth
            const retentionTypes = retentionTypesByTooth[tooth] || []
            const s3Url = getS3UrlForTooth(tooth)
            const showS3Image = isToothShowingS3Image(tooth) && !!s3Url

            return (
              <g key={tooth}>
                <rect
                  x={x}
                  y={0}
                  width={width}
                  height={141}
                  fill={`url(#${pattern})`}
                  onClick={() => handleToothClick(tooth)}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  style={{ ...getToothBaseRectStyle(tooth) }}
                />
                {showS3Image && (
                  <image
                    href={s3Url!}
                    x={x}
                    y={0}
                    width={width}
                    height={141}
                    preserveAspectRatio="xMidYMid slice"
                    onClick={() => handleToothClick(tooth)}
                    onMouseEnter={() => setHoveredTooth(tooth)}
                    onMouseLeave={() => setHoveredTooth(null)}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  />
                )}
                {isToothShowingRetentionImage(tooth) && renderRetentionImageOverlay(tooth, x, width)}
                {!showS3Image &&
                  !isToothShowingRetentionImage(tooth) &&
                  renderExtractionImageOverlay(tooth, x, width)}
                {renderClaspOverlay(tooth, x, width, 80)}
                {!showS3Image && renderWillExtractOverlay(tooth, x, width)}
                {renderCheckbox(tooth, x, width)}
                {!showS3Image && renderMissingToothImage(tooth, x, width)}
                {isToothShowingRetentionShape(tooth) &&
                  renderRetentionSelectorShapeOverlay(tooth, x, width)}
              </g>
            )
          })}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(16) ? 'wed-number' : undefined}>
            <path d="M671.79 163H665.25V161.289H667.316V156.111H665.25V154.512C665.566 154.512 665.869 154.495 666.158 154.46C666.448 154.42 666.689 154.354 666.882 154.262C667.11 154.153 667.281 154.01 667.395 153.835C667.509 153.659 667.575 153.44 667.593 153.177H669.77V161.289H671.79V163ZM681.706 159.664C681.706 160.169 681.614 160.642 681.43 161.085C681.245 161.528 680.987 161.901 680.653 162.204C680.298 162.528 679.886 162.776 679.416 162.947C678.951 163.118 678.405 163.204 677.778 163.204C677.19 163.204 676.653 163.125 676.166 162.967C675.683 162.805 675.269 162.559 674.922 162.23C674.523 161.853 674.218 161.366 674.008 160.77C673.797 160.173 673.692 159.46 673.692 158.631C673.692 157.771 673.791 157.008 673.988 156.341C674.186 155.675 674.508 155.085 674.955 154.572C675.385 154.08 675.942 153.699 676.627 153.427C677.315 153.155 678.133 153.019 679.081 153.019C679.401 153.019 679.752 153.041 680.133 153.085C680.515 153.128 680.763 153.161 680.877 153.183V155.111H680.627C680.509 155.054 680.307 154.99 680.022 154.92C679.741 154.846 679.421 154.808 679.061 154.808C678.219 154.808 677.563 155.015 677.094 155.427C676.624 155.839 676.341 156.414 676.245 157.151C676.583 156.949 676.938 156.787 677.311 156.664C677.688 156.537 678.094 156.473 678.528 156.473C678.91 156.473 679.263 156.517 679.587 156.605C679.916 156.692 680.221 156.833 680.502 157.026C680.866 157.28 681.158 157.622 681.377 158.052C681.596 158.482 681.706 159.019 681.706 159.664ZM678.712 161.145C678.848 160.995 678.956 160.82 679.035 160.618C679.118 160.412 679.16 160.133 679.16 159.783C679.16 159.462 679.114 159.201 679.022 159C678.929 158.793 678.802 158.629 678.64 158.506C678.482 158.383 678.296 158.3 678.081 158.256C677.866 158.208 677.644 158.184 677.416 158.184C677.223 158.184 677.021 158.206 676.811 158.25C676.6 158.293 676.407 158.348 676.232 158.414C676.232 158.458 676.23 158.53 676.225 158.631C676.221 158.732 676.219 158.859 676.219 159.013C676.219 159.552 676.271 159.998 676.377 160.348C676.486 160.695 676.631 160.96 676.811 161.145C676.934 161.281 677.078 161.381 677.245 161.447C677.412 161.509 677.592 161.539 677.785 161.539C677.929 161.539 678.089 161.506 678.265 161.441C678.44 161.375 678.589 161.276 678.712 161.145Z" fill="#434343" />
          </g>
          {isToothSelected(16) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(16)}
              <g clipPath="url(#clip0_0_1)" transform="translate(0, 20)" display="none">
                <path d="M673 107.674C674.312 107.674 675.375 106.611 675.375 105.299C675.375 103.987 674.312 102.924 673 102.924C671.688 102.924 670.625 103.987 670.625 105.299C670.625 106.611 671.688 107.674 673 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M678.858 107.674C678.753 107.913 678.722 108.177 678.768 108.434C678.815 108.691 678.937 108.928 679.12 109.115L679.167 109.162C679.314 109.309 679.431 109.484 679.511 109.676C679.59 109.868 679.631 110.074 679.631 110.282C679.631 110.49 679.59 110.696 679.511 110.889C679.431 111.081 679.314 111.256 679.167 111.403C679.02 111.55 678.845 111.667 678.653 111.746C678.461 111.826 678.255 111.867 678.047 111.867C677.839 111.867 677.633 111.826 677.441 111.746C677.248 111.667 677.074 111.55 676.927 111.403L676.879 111.355C676.693 111.173 676.456 111.05 676.199 111.004C675.942 110.957 675.677 110.988 675.438 111.094C675.204 111.194 675.004 111.361 674.864 111.573C674.723 111.786 674.648 112.034 674.647 112.289V112.424C674.647 112.844 674.48 113.246 674.183 113.543C673.886 113.84 673.483 114.007 673.063 114.007C672.643 114.007 672.241 113.84 671.944 113.543C671.647 113.246 671.48 112.844 671.48 112.424V112.353C671.474 112.091 671.389 111.836 671.237 111.623C671.084 111.41 670.871 111.248 670.625 111.157C670.386 111.052 670.121 111.02 669.865 111.067C669.608 111.113 669.371 111.236 669.184 111.418L669.137 111.466C668.99 111.613 668.815 111.73 668.623 111.81C668.431 111.889 668.225 111.93 668.016 111.93C667.808 111.93 667.602 111.889 667.41 111.81C667.218 111.73 667.043 111.613 666.896 111.466C666.749 111.319 666.632 111.144 666.553 110.952C666.473 110.76 666.432 110.554 666.432 110.346C666.432 110.138 666.473 109.932 666.553 109.739C666.632 109.547 666.749 109.373 666.896 109.225L666.944 109.178C667.126 108.991 667.249 108.754 667.295 108.498C667.342 108.241 667.31 107.976 667.205 107.737C667.105 107.503 666.938 107.303 666.726 107.163C666.513 107.022 666.264 106.947 666.01 106.945H665.875C665.455 106.945 665.052 106.779 664.755 106.482C664.458 106.185 664.292 105.782 664.292 105.362C664.292 104.942 664.458 104.54 664.755 104.243C665.052 103.946 665.455 103.779 665.875 103.779H665.946C666.208 103.773 666.462 103.688 666.676 103.535C666.889 103.383 667.051 103.17 667.142 102.924C667.247 102.685 667.278 102.42 667.232 102.163C667.185 101.907 667.063 101.67 666.88 101.483L666.833 101.435C666.686 101.288 666.569 101.114 666.489 100.922C666.41 100.729 666.369 100.523 666.369 100.315C666.369 100.107 666.41 99.9012 666.489 99.709C666.569 99.5167 666.686 99.3421 666.833 99.1951C666.98 99.0479 667.155 98.9311 667.347 98.8514C667.539 98.7717 667.745 98.7307 667.953 98.7307C668.161 98.7307 668.367 98.7717 668.559 98.8514C668.752 98.9311 668.926 99.0479 669.073 99.1951L669.121 99.2426C669.307 99.4251 669.544 99.5475 669.801 99.5941C670.058 99.6406 670.323 99.6092 670.562 99.5038H670.625C670.859 99.4035 671.059 99.2368 671.199 99.0244C671.34 98.812 671.416 98.5632 671.417 98.3084V98.1738C671.417 97.7539 671.583 97.3512 671.88 97.0542C672.177 96.7573 672.58 96.5905 673 96.5905C673.42 96.5905 673.823 96.7573 674.12 97.0542C674.417 97.3512 674.583 97.7539 674.583 98.1738V98.2451C674.584 98.4998 674.66 98.7487 674.8 98.9611C674.941 99.1735 675.141 99.3401 675.375 99.4405C675.614 99.5459 675.879 99.5773 676.135 99.5307C676.392 99.4842 676.629 99.3618 676.816 99.1792L676.863 99.1317C677.01 98.9845 677.185 98.8677 677.377 98.7881C677.569 98.7084 677.775 98.6674 677.984 98.6674C678.192 98.6674 678.398 98.7084 678.59 98.7881C678.782 98.8677 678.957 98.9845 679.104 99.1317C679.251 99.2788 679.368 99.4534 679.447 99.6456C679.527 99.8378 679.568 100.044 679.568 100.252C679.568 100.46 679.527 100.666 679.447 100.858C679.368 101.05 679.251 101.225 679.104 101.372L679.056 101.42C678.874 101.606 678.751 101.843 678.705 102.1C678.658 102.357 678.69 102.622 678.795 102.86V102.924C678.895 103.158 679.062 103.358 679.274 103.498C679.487 103.639 679.736 103.714 679.99 103.715H680.125C680.545 103.715 680.948 103.882 681.245 104.179C681.542 104.476 681.708 104.879 681.708 105.299C681.708 105.719 681.542 106.121 681.245 106.418C680.948 106.715 680.545 106.882 680.125 106.882H680.054C679.799 106.883 679.55 106.959 679.338 107.099C679.125 107.24 678.959 107.44 678.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(15) ? 'wed-number' : undefined}>
            <path d="M624.79 163H618.25V161.289H620.316V156.111H618.25V154.512C618.566 154.512 618.869 154.495 619.158 154.46C619.448 154.42 619.689 154.354 619.882 154.262C620.11 154.153 620.281 154.01 620.395 153.835C620.509 153.659 620.575 153.44 620.593 153.177H622.77V161.289H624.79V163ZM634.509 159.684C634.509 160.193 634.412 160.666 634.219 161.105C634.03 161.539 633.754 161.912 633.39 162.224C632.987 162.557 632.522 162.805 631.995 162.967C631.473 163.125 630.877 163.204 630.206 163.204C629.42 163.2 628.756 163.136 628.212 163.013C627.672 162.895 627.232 162.761 626.889 162.612V160.447H627.166C627.565 160.684 627.995 160.881 628.455 161.039C628.916 161.197 629.374 161.276 629.831 161.276C630.107 161.276 630.405 161.245 630.725 161.184C631.05 161.118 631.307 161.002 631.495 160.835C631.644 160.699 631.756 160.561 631.831 160.421C631.91 160.28 631.949 160.063 631.949 159.769C631.949 159.541 631.897 159.346 631.791 159.184C631.69 159.017 631.559 158.883 631.396 158.782C631.16 158.638 630.874 158.543 630.541 158.5C630.208 158.451 629.905 158.427 629.633 158.427C629.238 158.427 628.859 158.462 628.495 158.532C628.135 158.598 627.819 158.664 627.547 158.73H627.258V153.203H634.226V155.078H629.633V156.677C629.769 156.668 629.94 156.662 630.146 156.657C630.357 156.649 630.541 156.644 630.699 156.644C631.239 156.644 631.719 156.697 632.14 156.802C632.565 156.903 632.932 157.045 633.239 157.23C633.638 157.471 633.949 157.791 634.173 158.19C634.397 158.585 634.509 159.083 634.509 159.684Z" fill="#434343" />
          </g>
          {isToothSelected(15) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(15)}
              <g clipPath="url(#clip1_0_1)" transform="translate(0, 20)" display="none">
                <path d="M626 107.674C627.312 107.674 628.375 106.611 628.375 105.299C628.375 103.987 627.312 102.924 626 102.924C624.688 102.924 623.625 103.987 623.625 105.299C623.625 106.611 624.688 107.674 626 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M631.858 107.674C631.753 107.913 631.722 108.177 631.768 108.434C631.815 108.691 631.937 108.928 632.12 109.115L632.167 109.162C632.314 109.309 632.431 109.484 632.511 109.676C632.59 109.868 632.631 110.074 632.631 110.282C632.631 110.49 632.59 110.696 632.511 110.889C632.431 111.081 632.314 111.256 632.167 111.403C632.02 111.55 631.845 111.667 631.653 111.746C631.461 111.826 631.255 111.867 631.047 111.867C630.839 111.867 630.633 111.826 630.441 111.746C630.248 111.667 630.074 111.55 629.927 111.403L629.879 111.355C629.693 111.173 629.456 111.05 629.199 111.004C628.942 110.957 628.677 110.988 628.438 111.094C628.204 111.194 628.004 111.361 627.864 111.573C627.723 111.786 627.648 112.034 627.647 112.289V112.424C627.647 112.844 627.48 113.246 627.183 113.543C626.886 113.84 626.483 114.007 626.063 114.007C625.643 114.007 625.241 113.84 624.944 113.543C624.647 113.246 624.48 112.844 624.48 112.424V112.353C624.474 112.091 624.389 111.836 624.237 111.623C624.084 111.41 623.871 111.248 623.625 111.157C623.386 111.052 623.121 111.02 622.865 111.067C622.608 111.113 622.371 111.236 622.184 111.418L622.137 111.466C621.99 111.613 621.815 111.73 621.623 111.81C621.431 111.889 621.225 111.93 621.016 111.93C620.808 111.93 620.602 111.889 620.41 111.81C620.218 111.73 620.043 111.613 619.896 111.466C619.749 111.319 619.632 111.144 619.553 110.952C619.473 110.76 619.432 110.554 619.432 110.346C619.432 110.138 619.473 109.932 619.553 109.739C619.632 109.547 619.749 109.373 619.896 109.225L619.944 109.178C620.126 108.991 620.249 108.754 620.295 108.498C620.342 108.241 620.31 107.976 620.205 107.737C620.105 107.503 619.938 107.303 619.726 107.163C619.513 107.022 619.264 106.947 619.01 106.945H618.875C618.455 106.945 618.052 106.779 617.755 106.482C617.458 106.185 617.292 105.782 617.292 105.362C617.292 104.942 617.458 104.54 617.755 104.243C618.052 103.946 618.455 103.779 618.875 103.779H618.946C619.208 103.773 619.462 103.688 619.676 103.535C619.889 103.383 620.051 103.17 620.142 102.924C620.247 102.685 620.278 102.42 620.232 102.163C620.185 101.907 620.063 101.67 619.88 101.483L619.833 101.435C619.686 101.288 619.569 101.114 619.489 100.922C619.41 100.729 619.369 100.523 619.369 100.315C619.369 100.107 619.41 99.9012 619.489 99.709C619.569 99.5167 619.686 99.3421 619.833 99.1951C619.98 99.0479 620.155 98.9311 620.347 98.8514C620.539 98.7717 620.745 98.7307 620.953 98.7307C621.161 98.7307 621.367 98.7717 621.559 98.8514C621.752 98.9311 621.926 99.0479 622.073 99.1951L622.121 99.2426C622.307 99.4251 622.544 99.5475 622.801 99.5941C623.058 99.6406 623.323 99.6092 623.562 99.5038H623.625C623.859 99.4035 624.059 99.2368 624.199 99.0244C624.34 98.812 624.416 98.5632 624.417 98.3084V98.1738C624.417 97.7539 624.583 97.3512 624.88 97.0542C625.177 96.7573 625.58 96.5905 626 96.5905C626.42 96.5905 626.823 96.7573 627.12 97.0542C627.417 97.3512 627.583 97.7539 627.583 98.1738V98.2451C627.584 98.4998 627.66 98.7487 627.8 98.9611C627.941 99.1735 628.141 99.3401 628.375 99.4405C628.614 99.5459 628.879 99.5773 629.135 99.5307C629.392 99.4842 629.629 99.3618 629.816 99.1792L629.863 99.1317C630.01 98.9845 630.185 98.8677 630.377 98.7881C630.569 98.7084 630.775 98.6674 630.984 98.6674C631.192 98.6674 631.398 98.7084 631.59 98.7881C631.782 98.8677 631.957 98.9845 632.104 99.1317C632.251 99.2788 632.368 99.4534 632.447 99.6456C632.527 99.8378 632.568 100.044 632.568 100.252C632.568 100.46 632.527 100.666 632.447 100.858C632.368 101.05 632.251 101.225 632.104 101.372L632.056 101.42C631.874 101.606 631.751 101.843 631.705 102.1C631.658 102.357 631.69 102.622 631.795 102.86V102.924C631.895 103.158 632.062 103.358 632.274 103.498C632.487 103.639 632.736 103.714 632.99 103.715H633.125C633.545 103.715 633.948 103.882 634.245 104.179C634.542 104.476 634.708 104.879 634.708 105.299C634.708 105.719 634.542 106.121 634.245 106.418C633.948 106.715 633.545 106.882 633.125 106.882H633.054C632.799 106.883 632.55 106.959 632.338 107.099C632.125 107.24 631.959 107.44 631.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(14) ? 'wed-number' : undefined}>
            <path d="M572.79 163H566.25V161.289H568.316V156.111H566.25V154.512C566.566 154.512 566.869 154.495 567.158 154.46C567.448 154.42 567.689 154.354 567.882 154.262C568.11 154.153 568.281 154.01 568.395 153.835C568.509 153.659 568.575 153.44 568.593 153.177H570.77V161.289H572.79V163ZM582.857 160.743H581.522V163.026H579.107V160.743H574.363V158.888L578.949 153.203H581.522V158.954H582.857V160.743ZM579.107 158.954V155.414L576.258 158.954H579.107Z" fill="#434343" />
          </g>
          {isToothSelected(14) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(14)}
              <g clipPath="url(#clip2_0_1)" transform="translate(0, 20)" display="none">
                <path d="M574 107.674C575.312 107.674 576.375 106.611 576.375 105.299C576.375 103.987 575.312 102.924 574 102.924C572.688 102.924 571.625 103.987 571.625 105.299C571.625 106.611 572.688 107.674 574 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M579.858 107.674C579.753 107.913 579.722 108.177 579.768 108.434C579.815 108.691 579.937 108.928 580.12 109.115L580.167 109.162C580.314 109.309 580.431 109.484 580.511 109.676C580.59 109.868 580.631 110.074 580.631 110.282C580.631 110.49 580.59 110.696 580.511 110.889C580.431 111.081 580.314 111.256 580.167 111.403C580.02 111.55 579.845 111.667 579.653 111.746C579.461 111.826 579.255 111.867 579.047 111.867C578.839 111.867 578.633 111.826 578.441 111.746C578.248 111.667 578.074 111.55 577.927 111.403L577.879 111.355C577.693 111.173 577.456 111.05 577.199 111.004C576.942 110.957 576.677 110.988 576.438 111.094C576.204 111.194 576.004 111.361 575.864 111.573C575.723 111.786 575.648 112.034 575.647 112.289V112.424C575.647 112.844 575.48 113.246 575.183 113.543C574.886 113.84 574.483 114.007 574.063 114.007C573.643 114.007 573.241 113.84 572.944 113.543C572.647 113.246 572.48 112.844 572.48 112.424V112.353C572.474 112.091 572.389 111.836 572.237 111.623C572.084 111.41 571.871 111.248 571.625 111.157C571.386 111.052 571.121 111.02 570.865 111.067C570.608 111.113 570.371 111.236 570.184 111.418L570.137 111.466C569.99 111.613 569.815 111.73 569.623 111.81C569.431 111.889 569.225 111.93 569.016 111.93C568.808 111.93 568.602 111.889 568.41 111.81C568.218 111.73 568.043 111.613 567.896 111.466C567.749 111.319 567.632 111.144 567.553 110.952C567.473 110.76 567.432 110.554 567.432 110.346C567.432 110.138 567.473 109.932 567.553 109.739C567.632 109.547 567.749 109.373 567.896 109.225L567.944 109.178C568.126 108.991 568.249 108.754 568.295 108.498C568.342 108.241 568.31 107.976 568.205 107.737C568.105 107.503 567.938 107.303 567.726 107.163C567.513 107.022 567.264 106.947 567.01 106.945H566.875C566.455 106.945 566.052 106.779 565.755 106.482C565.458 106.185 565.292 105.782 565.292 105.362C565.292 104.942 565.458 104.54 565.755 104.243C566.052 103.946 566.455 103.779 566.875 103.779H566.946C567.208 103.773 567.462 103.688 567.676 103.535C567.889 103.383 568.051 103.17 568.142 102.924C568.247 102.685 568.278 102.42 568.232 102.163C568.185 101.907 568.063 101.67 567.88 101.483L567.833 101.435C567.686 101.288 567.569 101.114 567.489 100.922C567.41 100.729 567.369 100.523 567.369 100.315C567.369 100.107 567.41 99.9012 567.489 99.709C567.569 99.5167 567.686 99.3421 567.833 99.1951C567.98 99.0479 568.155 98.9311 568.347 98.8514C568.539 98.7717 568.745 98.7307 568.953 98.7307C569.161 98.7307 569.367 98.7717 569.559 98.8514C569.752 98.9311 569.926 99.0479 570.073 99.1951L570.121 99.2426C570.307 99.4251 570.544 99.5475 570.801 99.5941C571.058 99.6406 571.323 99.6092 571.562 99.5038H571.625C571.859 99.4035 572.059 99.2368 572.2 99.0244C572.34 98.812 572.416 98.5632 572.417 98.3084V98.1738C572.417 97.7539 572.583 97.3512 572.88 97.0542C573.177 96.7573 573.58 96.5905 574 96.5905C574.42 96.5905 574.823 96.7573 575.12 97.0542C575.417 97.3512 575.583 97.7539 575.583 98.1738V98.2451C575.584 98.4998 575.66 98.7487 575.8 98.9611C575.941 99.1735 576.141 99.3401 576.375 99.4405C576.614 99.5459 576.879 99.5773 577.135 99.5307C577.392 99.4842 577.629 99.3618 577.816 99.1792L577.863 99.1317C578.01 98.9845 578.185 98.8677 578.377 98.7881C578.569 98.7084 578.775 98.6674 578.984 98.6674C579.192 98.6674 579.398 98.7084 579.59 98.7881C579.782 98.8677 579.957 98.9845 580.104 99.1317C580.251 99.2788 580.368 99.4534 580.447 99.6456C580.527 99.8378 580.568 100.044 580.568 100.252C580.568 100.46 580.527 100.666 580.447 100.858C580.368 101.05 580.251 101.225 580.104 101.372L580.056 101.42C579.874 101.606 579.751 101.843 579.705 102.1C579.658 102.357 579.69 102.622 579.795 102.86V102.924C579.895 103.158 580.062 103.358 580.274 103.498C580.487 103.639 580.736 103.714 580.99 103.715H581.125C581.545 103.715 581.948 103.882 582.245 104.179C582.542 104.476 582.708 104.879 582.708 105.299C582.708 105.719 582.542 106.121 582.245 106.418C581.948 106.715 581.545 106.882 581.125 106.882H581.054C580.799 106.883 580.55 106.959 580.338 107.099C580.125 107.24 579.959 107.44 579.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(13) ? 'wed-number' : undefined}>
            <path d="M526.79 163H520.25V161.289H522.316V156.111H520.25V154.512C520.566 154.512 520.869 154.495 521.158 154.46C521.448 154.42 521.689 154.354 521.882 154.262C522.11 154.153 522.281 154.01 522.395 153.835C522.509 153.659 522.575 153.44 522.593 153.177H524.77V161.289H526.79V163ZM535.759 158.407C535.973 158.592 536.145 158.807 536.272 159.052C536.399 159.298 536.463 159.625 536.463 160.033C536.463 160.493 536.37 160.923 536.186 161.322C536.006 161.721 535.728 162.064 535.351 162.349C534.982 162.625 534.548 162.838 534.048 162.987C533.552 163.132 532.949 163.204 532.238 163.204C531.427 163.204 530.73 163.14 530.146 163.013C529.567 162.886 529.096 162.743 528.732 162.585V160.434H528.988C529.365 160.662 529.815 160.859 530.337 161.026C530.863 161.193 531.344 161.276 531.778 161.276C532.032 161.276 532.309 161.256 532.607 161.217C532.905 161.173 533.157 161.081 533.364 160.941C533.526 160.831 533.655 160.699 533.752 160.546C533.848 160.388 533.897 160.162 533.897 159.868C533.897 159.583 533.831 159.364 533.699 159.21C533.568 159.052 533.394 158.94 533.179 158.875C532.964 158.804 532.706 158.767 532.403 158.763C532.1 158.754 531.82 158.75 531.561 158.75H531.021V156.999H531.58C531.923 156.999 532.225 156.988 532.488 156.967C532.752 156.945 532.975 156.894 533.16 156.815C533.353 156.732 533.497 156.622 533.594 156.486C533.69 156.346 533.739 156.142 533.739 155.874C533.739 155.677 533.688 155.519 533.587 155.401C533.486 155.278 533.359 155.181 533.206 155.111C533.035 155.032 532.833 154.979 532.6 154.953C532.368 154.927 532.168 154.914 532.002 154.914C531.589 154.914 531.142 154.986 530.659 155.131C530.177 155.271 529.71 155.475 529.258 155.743H529.014V153.618C529.374 153.473 529.863 153.335 530.482 153.203C531.1 153.067 531.727 152.999 532.363 152.999C532.982 152.999 533.524 153.054 533.989 153.164C534.454 153.269 534.837 153.411 535.14 153.591C535.5 153.806 535.767 154.067 535.943 154.374C536.118 154.681 536.206 155.041 536.206 155.453C536.206 155.997 536.037 156.484 535.699 156.914C535.362 157.339 534.916 157.611 534.364 157.73V157.822C534.587 157.853 534.824 157.914 535.074 158.006C535.324 158.098 535.552 158.232 535.759 158.407Z" fill="#434343" />
          </g>
          {isToothSelected(13) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(13)}
              <g clipPath="url(#clip3_0_1)" transform="translate(0, 20)" display="none">
                <path d="M528 107.674C529.312 107.674 530.375 106.611 530.375 105.299C530.375 103.987 529.312 102.924 528 102.924C526.688 102.924 525.625 103.987 525.625 105.299C525.625 106.611 526.688 107.674 528 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M533.858 107.674C533.753 107.913 533.722 108.177 533.768 108.434C533.815 108.691 533.937 108.928 534.12 109.115L534.167 109.162C534.314 109.309 534.431 109.484 534.511 109.676C534.59 109.868 534.631 110.074 534.631 110.282C534.631 110.49 534.59 110.696 534.511 110.889C534.431 111.081 534.314 111.256 534.167 111.403C534.02 111.55 533.845 111.667 533.653 111.746C533.461 111.826 533.255 111.867 533.047 111.867C532.839 111.867 532.633 111.826 532.441 111.746C532.248 111.667 532.074 111.55 531.927 111.403L531.879 111.355C531.693 111.173 531.456 111.05 531.199 111.004C530.942 110.957 530.677 110.988 530.438 111.094C530.204 111.194 530.004 111.361 529.864 111.573C529.723 111.786 529.648 112.034 529.647 112.289V112.424C529.647 112.844 529.48 113.246 529.183 113.543C528.886 113.84 528.483 114.007 528.063 114.007C527.643 114.007 527.241 113.84 526.944 113.543C526.647 113.246 526.48 112.844 526.48 112.424V112.353C526.474 112.091 526.389 111.836 526.237 111.623C526.084 111.41 525.871 111.248 525.625 111.157C525.386 111.052 525.121 111.02 524.865 111.067C524.608 111.113 524.371 111.236 524.184 111.418L524.137 111.466C523.99 111.613 523.815 111.73 523.623 111.81C523.431 111.889 523.225 111.93 523.016 111.93C522.808 111.93 522.602 111.889 522.41 111.81C522.218 111.73 522.043 111.613 521.896 111.466C521.749 111.319 521.632 111.144 521.553 110.952C521.473 110.76 521.432 110.554 521.432 110.346C521.432 110.138 521.473 109.932 521.553 109.739C521.632 109.547 521.749 109.373 521.896 109.225L521.944 109.178C522.126 108.991 522.249 108.754 522.295 108.498C522.342 108.241 522.31 107.976 522.205 107.737C522.105 107.503 521.938 107.303 521.726 107.163C521.513 107.022 521.264 106.947 521.01 106.945H520.875C520.455 106.945 520.052 106.779 519.755 106.482C519.458 106.185 519.292 105.782 519.292 105.362C519.292 104.942 519.458 104.54 519.755 104.243C520.052 103.946 520.455 103.779 520.875 103.779H520.946C521.208 103.773 521.462 103.688 521.676 103.535C521.889 103.383 522.051 103.17 522.142 102.924C522.247 102.685 522.278 102.42 522.232 102.163C522.185 101.907 522.063 101.67 521.88 101.483L521.833 101.435C521.686 101.288 521.569 101.114 521.489 100.922C521.41 100.729 521.369 100.523 521.369 100.315C521.369 100.107 521.41 99.9012 521.489 99.709C521.569 99.5167 521.686 99.3421 521.833 99.1951C521.98 99.0479 522.155 98.9311 522.347 98.8514C522.539 98.7717 522.745 98.7307 522.953 98.7307C523.161 98.7307 523.367 98.7717 523.559 98.8514C523.752 98.9311 523.926 99.0479 524.073 99.1951L524.121 99.2426C524.307 99.4251 524.544 99.5475 524.801 99.5941C525.058 99.6406 525.323 99.6092 525.562 99.5038H525.625C525.859 99.4035 526.059 99.2368 526.2 99.0244C526.34 98.812 526.416 98.5632 526.417 98.3084V98.1738C526.417 97.7539 526.583 97.3512 526.88 97.0542C527.177 96.7573 527.58 96.5905 528 96.5905C528.42 96.5905 528.823 96.7573 529.12 97.0542C529.417 97.3512 529.583 97.7539 529.583 98.1738V98.2451C529.584 98.4998 529.66 98.7487 529.8 98.9611C529.941 99.1735 530.141 99.3401 530.375 99.4405C530.614 99.5459 530.879 99.5773 531.135 99.5307C531.392 99.4842 531.629 99.3618 531.816 99.1792L531.863 99.1317C532.01 98.9845 532.185 98.8677 532.377 98.7881C532.569 98.7084 532.775 98.6674 532.984 98.6674C533.192 98.6674 533.398 98.7084 533.59 98.7881C533.782 98.8677 533.957 98.9845 534.104 99.1317C534.251 99.2788 534.368 99.4534 534.447 99.6456C534.527 99.8378 534.568 100.044 534.568 100.252C534.568 100.46 534.527 100.666 534.447 100.858C534.368 101.05 534.251 101.225 534.104 101.372L534.056 101.42C533.874 101.606 533.751 101.843 533.705 102.1C533.658 102.357 533.69 102.622 533.795 102.86V102.924C533.895 103.158 534.062 103.358 534.274 103.498C534.487 103.639 534.736 103.714 534.99 103.715H535.125C535.545 103.715 535.948 103.882 536.245 104.179C536.542 104.476 536.708 104.879 536.708 105.299C536.708 105.719 536.542 106.121 536.245 106.418C535.948 106.715 535.545 106.882 535.125 106.882H535.054C534.799 106.883 534.55 106.959 534.338 107.099C534.125 107.24 533.959 107.44 533.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(12) ? 'wed-number' : undefined}>
            <path d="M489.29 163H482.75V161.289H484.816V156.111H482.75V154.512C483.066 154.512 483.369 154.495 483.658 154.46C483.948 154.42 484.189 154.354 484.382 154.262C484.61 154.153 484.781 154.01 484.895 153.835C485.009 153.659 485.075 153.44 485.093 153.177H487.27V161.289H489.29V163ZM499.219 163H491.528V161.381C492.115 160.956 492.703 160.504 493.291 160.026C493.883 159.548 494.357 159.136 494.712 158.789C495.243 158.276 495.62 157.828 495.844 157.447C496.068 157.065 496.179 156.688 496.179 156.315C496.179 155.868 496.035 155.523 495.745 155.282C495.46 155.037 495.048 154.914 494.508 154.914C494.105 154.914 493.679 154.997 493.232 155.164C492.789 155.33 492.376 155.543 491.995 155.802H491.784V153.624C492.096 153.488 492.554 153.352 493.159 153.216C493.769 153.08 494.379 153.012 494.988 153.012C496.217 153.012 497.153 153.271 497.798 153.789C498.443 154.302 498.765 155.03 498.765 155.973C498.765 156.591 498.609 157.179 498.298 157.736C497.991 158.293 497.519 158.868 496.883 159.46C496.484 159.829 496.083 160.169 495.679 160.48C495.276 160.787 494.988 161.002 494.817 161.125H499.219V163Z" fill="#434343" />
          </g>
          {isToothSelected(12) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(12)}
              <g clipPath="url(#clip4_0_1)" transform="translate(0, 20)" display="none">
                <path d="M490.5 107.674C491.812 107.674 492.875 106.611 492.875 105.299C492.875 103.987 491.812 102.924 490.5 102.924C489.188 102.924 488.125 103.987 488.125 105.299C488.125 106.611 489.188 107.674 490.5 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M496.358 107.674C496.253 107.913 496.222 108.177 496.268 108.434C496.315 108.691 496.437 108.928 496.62 109.115L496.667 109.162C496.814 109.309 496.931 109.484 497.011 109.676C497.09 109.868 497.131 110.074 497.131 110.282C497.131 110.49 497.09 110.696 497.011 110.889C496.931 111.081 496.814 111.256 496.667 111.403C496.52 111.55 496.345 111.667 496.153 111.746C495.961 111.826 495.755 111.867 495.547 111.867C495.339 111.867 495.133 111.826 494.941 111.746C494.748 111.667 494.574 111.55 494.427 111.403L494.379 111.355C494.193 111.173 493.956 111.05 493.699 111.004C493.442 110.957 493.177 110.988 492.938 111.094C492.704 111.194 492.504 111.361 492.364 111.573C492.223 111.786 492.148 112.034 492.147 112.289V112.424C492.147 112.844 491.98 113.246 491.683 113.543C491.386 113.84 490.983 114.007 490.563 114.007C490.143 114.007 489.741 113.84 489.444 113.543C489.147 113.246 488.98 112.844 488.98 112.424V112.353C488.974 112.091 488.889 111.836 488.737 111.623C488.584 111.41 488.371 111.248 488.125 111.157C487.886 111.052 487.621 111.02 487.365 111.067C487.108 111.113 486.871 111.236 486.684 111.418L486.637 111.466C486.49 111.613 486.315 111.73 486.123 111.81C485.931 111.889 485.725 111.93 485.516 111.93C485.308 111.93 485.102 111.889 484.91 111.81C484.718 111.73 484.543 111.613 484.396 111.466C484.249 111.319 484.132 111.144 484.053 110.952C483.973 110.76 483.932 110.554 483.932 110.346C483.932 110.138 483.973 109.932 484.053 109.739C484.132 109.547 484.249 109.373 484.396 109.225L484.444 109.178C484.626 108.991 484.749 108.754 484.795 108.498C484.842 108.241 484.81 107.976 484.705 107.737C484.605 107.503 484.438 107.303 484.226 107.163C484.013 107.022 483.764 106.947 483.51 106.945H483.375C482.955 106.945 482.552 106.779 482.255 106.482C481.958 106.185 481.792 105.782 481.792 105.362C481.792 104.942 481.958 104.54 482.255 104.243C482.552 103.946 482.955 103.779 483.375 103.779H483.446C483.708 103.773 483.962 103.688 484.176 103.535C484.389 103.383 484.551 103.17 484.642 102.924C484.747 102.685 484.778 102.42 484.732 102.163C484.685 101.907 484.563 101.67 484.38 101.483L484.333 101.435C484.186 101.288 484.069 101.114 483.989 100.922C483.91 100.729 483.869 100.523 483.869 100.315C483.869 100.107 483.91 99.9012 483.989 99.709C484.069 99.5167 484.186 99.3421 484.333 99.1951C484.48 99.0479 484.655 98.9311 484.847 98.8514C485.039 98.7717 485.245 98.7307 485.453 98.7307C485.661 98.7307 485.867 98.7717 486.059 98.8514C486.252 98.9311 486.426 99.0479 486.573 99.1951L486.621 99.2426C486.807 99.4251 487.044 99.5475 487.301 99.5941C487.558 99.6406 487.823 99.6092 488.062 99.5038H488.125C488.359 99.4035 488.559 99.2368 488.7 99.0244C488.84 98.812 488.916 98.5632 488.917 98.3084V98.1738C488.917 97.7539 489.083 97.3512 489.38 97.0542C489.677 96.7573 490.08 96.5905 490.5 96.5905C490.92 96.5905 491.323 96.7573 491.62 97.0542C491.917 97.3512 492.083 97.7539 492.083 98.1738V98.2451C492.084 98.4998 492.16 98.7487 492.3 98.9611C492.441 99.1735 492.641 99.3401 492.875 99.4405C493.114 99.5459 493.379 99.5773 493.635 99.5307C493.892 99.4842 494.129 99.3618 494.316 99.1792L494.363 99.1317C494.51 98.9845 494.685 98.8677 494.877 98.7881C495.069 98.7084 495.275 98.6674 495.484 98.6674C495.692 98.6674 495.898 98.7084 496.09 98.7881C496.282 98.8677 496.457 98.9845 496.604 99.1317C496.751 99.2788 496.868 99.4534 496.947 99.6456C497.027 99.8378 497.068 100.044 497.068 100.252C497.068 100.46 497.027 100.666 496.947 100.858C496.868 101.05 496.751 101.225 496.604 101.372L496.556 101.42C496.374 101.606 496.251 101.843 496.205 102.1C496.158 102.357 496.19 102.622 496.295 102.86V102.924C496.395 103.158 496.562 103.358 496.774 103.498C496.987 103.639 497.236 103.714 497.49 103.715H497.625C498.045 103.715 498.448 103.882 498.745 104.179C499.042 104.476 499.208 104.879 499.208 105.299C499.208 105.719 499.042 106.121 498.745 106.418C498.448 106.715 498.045 106.882 497.625 106.882H497.554C497.299 106.883 497.05 106.959 496.838 107.099C496.625 107.24 496.459 107.44 496.358 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(11) ? 'wed-number' : undefined}>
            <path d="M450.79 163H444.25V161.289H446.316V156.111H444.25V154.512C444.566 154.512 444.869 154.495 445.158 154.46C445.448 154.42 445.689 154.354 445.882 154.262C446.11 154.153 446.281 154.01 446.395 153.835C446.509 153.659 446.575 153.44 446.593 153.177H448.77V161.289H450.79V163ZM460.101 163H453.561V161.289H455.627V156.111H453.561V154.512C453.876 154.512 454.179 154.495 454.469 154.46C454.758 154.42 454.999 154.354 455.192 154.262C455.42 154.153 455.591 154.01 455.705 153.835C455.82 153.659 455.885 153.44 455.903 153.177H458.081V161.289H460.101V163Z" fill="#434343" />
          </g>
          {isToothSelected(11) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(11)}
              <g clipPath="url(#clip5_0_1)" transform="translate(0, 20)" display="none">
                <path d="M452 107.674C453.312 107.674 454.375 106.611 454.375 105.299C454.375 103.987 453.312 102.924 452 102.924C450.688 102.924 449.625 103.987 449.625 105.299C449.625 106.611 450.688 107.674 452 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M457.858 107.674C457.753 107.913 457.722 108.177 457.768 108.434C457.815 108.691 457.937 108.928 458.12 109.115L458.167 109.162C458.314 109.309 458.431 109.484 458.511 109.676C458.59 109.868 458.631 110.074 458.631 110.282C458.631 110.49 458.59 110.696 458.511 110.889C458.431 111.081 458.314 111.256 458.167 111.403C458.02 111.55 457.845 111.667 457.653 111.746C457.461 111.826 457.255 111.867 457.047 111.867C456.839 111.867 456.633 111.826 456.441 111.746C456.248 111.667 456.074 111.55 455.927 111.403L455.879 111.355C455.693 111.173 455.456 111.05 455.199 111.004C454.942 110.957 454.677 110.988 454.438 111.094C454.204 111.194 454.004 111.361 453.864 111.573C453.723 111.786 453.648 112.034 453.647 112.289V112.424C453.647 112.844 453.48 113.246 453.183 113.543C452.886 113.84 452.483 114.007 452.063 114.007C451.643 114.007 451.241 113.84 450.944 113.543C450.647 113.246 450.48 112.844 450.48 112.424V112.353C450.474 112.091 450.389 111.836 450.237 111.623C450.084 111.41 449.871 111.248 449.625 111.157C449.386 111.052 449.121 111.02 448.865 111.067C448.608 111.113 448.371 111.236 448.184 111.418L448.137 111.466C447.99 111.613 447.815 111.73 447.623 111.81C447.431 111.889 447.225 111.93 447.016 111.93C446.808 111.93 446.602 111.889 446.41 111.81C446.218 111.73 446.043 111.613 445.896 111.466C445.749 111.319 445.632 111.144 445.553 110.952C445.473 110.76 445.432 110.554 445.432 110.346C445.432 110.138 445.473 109.932 445.553 109.739C445.632 109.547 445.749 109.373 445.896 109.225L445.944 109.178C446.126 108.991 446.249 108.754 446.295 108.498C446.342 108.241 446.31 107.976 446.205 107.737C446.105 107.503 445.938 107.303 445.726 107.163C445.513 107.022 445.264 106.947 445.01 106.945H444.875C444.455 106.945 444.052 106.779 443.755 106.482C443.458 106.185 443.292 105.782 443.292 105.362C443.292 104.942 443.458 104.54 443.755 104.243C444.052 103.946 444.455 103.779 444.875 103.779H444.946C445.208 103.773 445.462 103.688 445.676 103.535C445.889 103.383 446.051 103.17 446.142 102.924C446.247 102.685 446.278 102.42 446.232 102.163C446.185 101.907 446.063 101.67 445.88 101.483L445.833 101.435C445.686 101.288 445.569 101.114 445.489 100.922C445.41 100.729 445.369 100.523 445.369 100.315C445.369 100.107 445.41 99.9012 445.489 99.709C445.569 99.5167 445.686 99.3421 445.833 99.1951C445.98 99.0479 446.155 98.9311 446.347 98.8514C446.539 98.7717 446.745 98.7307 446.953 98.7307C447.161 98.7307 447.367 98.7717 447.559 98.8514C447.752 98.9311 447.926 99.0479 448.073 99.1951L448.121 99.2426C448.307 99.4251 448.544 99.5475 448.801 99.5941C449.058 99.6406 449.323 99.6092 449.562 99.5038H449.625C449.859 99.4035 450.059 99.2368 450.2 99.0244C450.34 98.812 450.416 98.5632 450.417 98.3084V98.1738C450.417 97.7539 450.583 97.3512 450.88 97.0542C451.177 96.7573 451.58 96.5905 452 96.5905C452.42 96.5905 452.823 96.7573 453.12 97.0542C453.417 97.3512 453.583 97.7539 453.583 98.1738V98.2451C453.584 98.4998 453.66 98.7487 453.8 98.9611C453.941 99.1735 454.141 99.3401 454.375 99.4405C454.614 99.5459 454.879 99.5773 455.135 99.5307C455.392 99.4842 455.629 99.3618 455.816 99.1792L455.863 99.1317C456.01 98.9845 456.185 98.8677 456.377 98.7881C456.569 98.7084 456.775 98.6674 456.984 98.6674C457.192 98.6674 457.398 98.7084 457.59 98.7881C457.782 98.8677 457.957 98.9845 458.104 99.1317C458.251 99.2788 458.368 99.4534 458.447 99.6456C458.527 99.8378 458.568 100.044 458.568 100.252C458.568 100.46 458.527 100.666 458.447 100.858C458.368 101.05 458.251 101.225 458.104 101.372L458.056 101.42C457.874 101.606 457.751 101.843 457.705 102.1C457.658 102.357 457.69 102.622 457.795 102.86V102.924C457.895 103.158 458.062 103.358 458.274 103.498C458.487 103.639 458.736 103.714 458.99 103.715H459.125C459.545 103.715 459.948 103.882 460.245 104.179C460.542 104.476 460.708 104.879 460.708 105.299C460.708 105.719 460.542 106.121 460.245 106.418C459.948 106.715 459.545 106.882 459.125 106.882H459.054C458.799 106.883 458.55 106.959 458.338 107.099C458.125 107.24 457.959 107.44 457.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(10) ? 'wed-number' : undefined}>
            <path d="M412.79 163H406.25V161.289H408.316V156.111H406.25V154.512C406.566 154.512 406.869 154.495 407.158 154.46C407.448 154.42 407.689 154.354 407.882 154.262C408.11 154.153 408.281 154.01 408.395 153.835C408.509 153.659 408.575 153.44 408.593 153.177H410.77V161.289H412.79V163ZM422.653 158.098C422.653 158.923 422.579 159.662 422.43 160.316C422.281 160.965 422.048 161.498 421.732 161.914C421.408 162.34 420.991 162.662 420.482 162.882C419.973 163.097 419.346 163.204 418.6 163.204C417.868 163.204 417.243 163.094 416.725 162.875C416.208 162.656 415.789 162.331 415.468 161.901C415.144 161.471 414.909 160.938 414.764 160.302C414.62 159.662 414.547 158.929 414.547 158.105C414.547 157.254 414.622 156.515 414.771 155.887C414.92 155.26 415.157 154.729 415.482 154.295C415.806 153.865 416.227 153.543 416.745 153.328C417.262 153.113 417.881 153.006 418.6 153.006C419.35 153.006 419.98 153.117 420.489 153.341C420.997 153.56 421.414 153.889 421.739 154.328C422.059 154.758 422.291 155.289 422.436 155.92C422.581 156.548 422.653 157.274 422.653 158.098ZM420.107 158.098C420.107 156.914 419.991 156.072 419.758 155.572C419.526 155.067 419.14 154.815 418.6 154.815C418.061 154.815 417.675 155.067 417.442 155.572C417.21 156.072 417.094 156.918 417.094 158.111C417.094 159.274 417.212 160.112 417.449 160.625C417.686 161.138 418.07 161.395 418.6 161.395C419.131 161.395 419.515 161.138 419.752 160.625C419.989 160.112 420.107 159.269 420.107 158.098Z" fill="#434343" />
          </g>
          {isToothSelected(10) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(10)}
              <g clipPath="url(#clip6_0_1)" transform="translate(0, 20)" display="none">
                <path d="M414 107.674C415.312 107.674 416.375 106.611 416.375 105.299C416.375 103.987 415.312 102.924 414 102.924C412.688 102.924 411.625 103.987 411.625 105.299C411.625 106.611 412.688 107.674 414 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M419.858 107.674C419.753 107.913 419.722 108.177 419.768 108.434C419.815 108.691 419.937 108.928 420.12 109.115L420.167 109.162C420.314 109.309 420.431 109.484 420.511 109.676C420.59 109.868 420.631 110.074 420.631 110.282C420.631 110.49 420.59 110.696 420.511 110.889C420.431 111.081 420.314 111.256 420.167 111.403C420.02 111.55 419.845 111.667 419.653 111.746C419.461 111.826 419.255 111.867 419.047 111.867C418.839 111.867 418.633 111.826 418.441 111.746C418.248 111.667 418.074 111.55 417.927 111.403L417.879 111.355C417.693 111.173 417.456 111.05 417.199 111.004C416.942 110.957 416.677 110.988 416.438 111.094C416.204 111.194 416.004 111.361 415.864 111.573C415.723 111.786 415.648 112.034 415.647 112.289V112.424C415.647 112.844 415.48 113.246 415.183 113.543C414.886 113.84 414.483 114.007 414.063 114.007C413.643 114.007 413.241 113.84 412.944 113.543C412.647 113.246 412.48 112.844 412.48 112.424V112.353C412.474 112.091 412.389 111.836 412.237 111.623C412.084 111.41 411.871 111.248 411.625 111.157C411.386 111.052 411.121 111.02 410.865 111.067C410.608 111.113 410.371 111.236 410.184 111.418L410.137 111.466C409.99 111.613 409.815 111.73 409.623 111.81C409.431 111.889 409.225 111.93 409.016 111.93C408.808 111.93 408.602 111.889 408.41 111.81C408.218 111.73 408.043 111.613 407.896 111.466C407.749 111.319 407.632 111.144 407.553 110.952C407.473 110.76 407.432 110.554 407.432 110.346C407.432 110.138 407.473 109.932 407.553 109.739C407.632 109.547 407.749 109.373 407.896 109.225L407.944 109.178C408.126 108.991 408.249 108.754 408.295 108.498C408.342 108.241 408.31 107.976 408.205 107.737C408.105 107.503 407.938 107.303 407.726 107.163C407.513 107.022 407.264 106.947 407.01 106.945H406.875C406.455 106.945 406.052 106.779 405.755 106.482C405.458 106.185 405.292 105.782 405.292 105.362C405.292 104.942 405.458 104.54 405.755 104.243C406.052 103.946 406.455 103.779 406.875 103.779H406.946C407.208 103.773 407.462 103.688 407.676 103.535C407.889 103.383 408.051 103.17 408.142 102.924C408.247 102.685 408.278 102.42 408.232 102.163C408.185 101.907 408.063 101.67 407.88 101.483L407.833 101.435C407.686 101.288 407.569 101.114 407.489 100.922C407.41 100.729 407.369 100.523 407.369 100.315C407.369 100.107 407.41 99.9012 407.489 99.709C407.569 99.5167 407.686 99.3421 407.833 99.1951C407.98 99.0479 408.155 98.9311 408.347 98.8514C408.539 98.7717 408.745 98.7307 408.953 98.7307C409.161 98.7307 409.367 98.7717 409.559 98.8514C409.752 98.9311 409.926 99.0479 410.073 99.1951L410.121 99.2426C410.307 99.4251 410.544 99.5475 410.801 99.5941C411.058 99.6406 411.323 99.6092 411.562 99.5038H411.625C411.859 99.4035 412.059 99.2368 412.2 99.0244C412.34 98.812 412.416 98.5632 412.417 98.3084V98.1738C412.417 97.7539 412.583 97.3512 412.88 97.0542C413.177 96.7573 413.58 96.5905 414 96.5905C414.42 96.5905 414.823 96.7573 415.12 97.0542C415.417 97.3512 415.583 97.7539 415.583 98.1738V98.2451C415.584 98.4998 415.66 98.7487 415.8 98.9611C415.941 99.1735 416.141 99.3401 416.375 99.4405C416.614 99.5459 416.879 99.5773 417.135 99.5307C417.392 99.4842 417.629 99.3618 417.816 99.1792L417.863 99.1317C418.01 98.9845 418.185 98.8677 418.377 98.7881C418.569 98.7084 418.775 98.6674 418.984 98.6674C419.192 98.6674 419.398 98.7084 419.59 98.7881C419.782 98.8677 419.957 98.9845 420.104 99.1317C420.251 99.2788 420.368 99.4534 420.447 99.6456C420.527 99.8378 420.568 100.044 420.568 100.252C420.568 100.46 420.527 100.666 420.447 100.858C420.368 101.05 420.251 101.225 420.104 101.372L420.056 101.42C419.874 101.606 419.751 101.843 419.705 102.1C419.658 102.357 419.69 102.622 419.795 102.86V102.924C419.895 103.158 420.062 103.358 420.274 103.498C420.487 103.639 420.736 103.714 420.99 103.715H421.125C421.545 103.715 421.948 103.882 422.245 104.179C422.542 104.476 422.708 104.879 422.708 105.299C422.708 105.719 422.542 106.121 422.245 106.418C421.948 106.715 421.545 106.882 421.125 106.882H421.054C420.799 106.883 420.55 106.959 420.338 107.099C420.125 107.24 419.959 107.44 419.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(9) ? 'wed-number' : undefined}>
            <path d="M375.198 157.552C375.198 158.372 375.093 159.136 374.882 159.842C374.672 160.548 374.352 161.142 373.922 161.625C373.457 162.147 372.88 162.539 372.191 162.803C371.503 163.061 370.7 163.191 369.783 163.191C369.459 163.191 369.108 163.171 368.73 163.132C368.353 163.092 368.105 163.057 367.987 163.026V161.098H368.25C368.382 161.16 368.568 161.226 368.809 161.296C369.055 161.366 369.388 161.401 369.81 161.401C370.152 161.401 370.487 161.359 370.816 161.276C371.145 161.188 371.428 161.052 371.665 160.868C371.924 160.671 372.137 160.425 372.303 160.131C372.47 159.833 372.582 159.476 372.639 159.059C372.257 159.278 371.902 159.447 371.573 159.565C371.248 159.68 370.843 159.737 370.356 159.737C369.987 159.737 369.634 159.693 369.296 159.605C368.963 159.513 368.658 159.372 368.382 159.184C368.018 158.925 367.726 158.585 367.507 158.164C367.292 157.739 367.184 157.203 367.184 156.559C367.184 155.51 367.548 154.657 368.276 153.999C369.009 153.337 369.967 153.006 371.152 153.006C371.761 153.006 372.301 153.087 372.77 153.249C373.244 153.407 373.652 153.65 373.994 153.979C374.393 154.357 374.694 154.837 374.896 155.42C375.097 156.004 375.198 156.714 375.198 157.552ZM372.678 157.184C372.678 156.649 372.626 156.21 372.52 155.868C372.419 155.521 372.279 155.254 372.099 155.065C371.972 154.925 371.825 154.824 371.658 154.762C371.492 154.701 371.316 154.67 371.132 154.67C370.961 154.67 370.796 154.701 370.639 154.762C370.485 154.819 370.336 154.92 370.191 155.065C370.055 155.205 369.943 155.39 369.856 155.618C369.772 155.846 369.731 156.118 369.731 156.434C369.731 156.741 369.777 156.999 369.869 157.21C369.961 157.416 370.088 157.581 370.25 157.703C370.404 157.822 370.584 157.905 370.79 157.953C371 158.002 371.229 158.026 371.474 158.026C371.672 158.026 371.886 158.002 372.119 157.953C372.351 157.901 372.531 157.848 372.658 157.796C372.658 157.747 372.661 157.679 372.665 157.592C372.674 157.499 372.678 157.363 372.678 157.184Z" fill="#434343" />
          </g>
          {isToothSelected(9) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(9)}
              <g clipPath="url(#clip7_0_1)" transform="translate(0, 20)" display="none">
                <path d="M371.5 107.674C372.812 107.674 373.875 106.611 373.875 105.299C373.875 103.987 372.812 102.924 371.5 102.924C370.188 102.924 369.125 103.987 369.125 105.299C369.125 106.611 370.188 107.674 371.5 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M377.358 107.674C377.253 107.913 377.222 108.177 377.268 108.434C377.315 108.691 377.437 108.928 377.62 109.115L377.667 109.162C377.814 109.309 377.931 109.484 378.011 109.676C378.09 109.868 378.131 110.074 378.131 110.282C378.131 110.49 378.09 110.696 378.011 110.889C377.931 111.081 377.814 111.256 377.667 111.403C377.52 111.55 377.345 111.667 377.153 111.746C376.961 111.826 376.755 111.867 376.547 111.867C376.339 111.867 376.133 111.826 375.941 111.746C375.748 111.667 375.574 111.55 375.427 111.403L375.379 111.355C375.193 111.173 374.956 111.05 374.699 111.004C374.442 110.957 374.177 110.988 373.938 111.094C373.704 111.194 373.504 111.361 373.364 111.573C373.223 111.786 373.148 112.034 373.147 112.289V112.424C373.147 112.844 372.98 113.246 372.683 113.543C372.386 113.84 371.983 114.007 371.563 114.007C371.143 114.007 370.741 113.84 370.444 113.543C370.147 113.246 369.98 112.844 369.98 112.424V112.353C369.974 112.091 369.889 111.836 369.737 111.623C369.584 111.41 369.371 111.248 369.125 111.157C368.886 111.052 368.621 111.02 368.365 111.067C368.108 111.113 367.871 111.236 367.684 111.418L367.637 111.466C367.49 111.613 367.315 111.73 367.123 111.81C366.931 111.889 366.725 111.93 366.516 111.93C366.308 111.93 366.102 111.889 365.91 111.81C365.718 111.73 365.543 111.613 365.396 111.466C365.249 111.319 365.132 111.144 365.053 110.952C364.973 110.76 364.932 110.554 364.932 110.346C364.932 110.138 364.973 109.932 365.053 109.739C365.132 109.547 365.249 109.373 365.396 109.225L365.444 109.178C365.626 108.991 365.749 108.754 365.795 108.498C365.842 108.241 365.81 107.976 365.705 107.737C365.605 107.503 365.438 107.303 365.226 107.163C365.013 107.022 364.764 106.947 364.51 106.945H364.375C363.955 106.945 363.552 106.779 363.255 106.482C362.958 106.185 362.792 105.782 362.792 105.362C362.792 104.942 362.958 104.54 363.255 104.243C363.552 103.946 363.955 103.779 364.375 103.779H364.446C364.708 103.773 364.962 103.688 365.176 103.535C365.389 103.383 365.551 103.17 365.642 102.924C365.747 102.685 365.778 102.42 365.732 102.163C365.685 101.907 365.563 101.67 365.38 101.483L365.333 101.435C365.186 101.288 365.069 101.114 364.989 100.922C364.91 100.729 364.869 100.523 364.869 100.315C364.869 100.107 364.91 99.9012 364.989 99.709C365.069 99.5167 365.186 99.3421 365.333 99.1951C365.48 99.0479 365.655 98.9311 365.847 98.8514C366.039 98.7717 366.245 98.7307 366.453 98.7307C366.661 98.7307 366.867 98.7717 367.059 98.8514C367.252 98.9311 367.426 99.0479 367.573 99.1951L367.621 99.2426C367.807 99.4251 368.044 99.5475 368.301 99.5941C368.558 99.6406 368.823 99.6092 369.062 99.5038H369.125C369.359 99.4035 369.559 99.2368 369.7 99.0244C369.84 98.812 369.916 98.5632 369.917 98.3084V98.1738C369.917 97.7539 370.083 97.3512 370.38 97.0542C370.677 96.7573 371.08 96.5905 371.5 96.5905C371.92 96.5905 372.323 96.7573 372.62 97.0542C372.917 97.3512 373.083 97.7539 373.083 98.1738V98.2451C373.084 98.4998 373.16 98.7487 373.3 98.9611C373.441 99.1735 373.641 99.3401 373.875 99.4405C374.114 99.5459 374.379 99.5773 374.635 99.5307C374.892 99.4842 375.129 99.3618 375.316 99.1792L375.363 99.1317C375.51 98.9845 375.685 98.8677 375.877 98.7881C376.069 98.7084 376.275 98.6674 376.484 98.6674C376.692 98.6674 376.898 98.7084 377.09 98.7881C377.282 98.8677 377.457 98.9845 377.604 99.1317C377.751 99.2788 377.868 99.4534 377.947 99.6456C378.027 99.8378 378.068 100.044 378.068 100.252C378.068 100.46 378.027 100.666 377.947 100.858C377.868 101.05 377.751 101.225 377.604 101.372L377.556 101.42C377.374 101.606 377.251 101.843 377.205 102.1C377.158 102.357 377.19 102.622 377.295 102.86V102.924C377.395 103.158 377.562 103.358 377.774 103.498C377.987 103.639 378.236 103.714 378.49 103.715H378.625C379.045 103.715 379.448 103.882 379.745 104.179C380.042 104.476 380.208 104.879 380.208 105.299C380.208 105.719 380.042 106.121 379.745 106.418C379.448 106.715 379.045 106.882 378.625 106.882H378.554C378.299 106.883 378.05 106.959 377.838 107.099C377.625 107.24 377.459 107.44 377.358 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(8) ? 'wed-number' : undefined}>
            <path d="M326.429 160.263C326.429 161.131 326.058 161.842 325.317 162.395C324.58 162.947 323.566 163.224 322.277 163.224C321.553 163.224 320.932 163.149 320.415 163C319.897 162.851 319.469 162.645 319.132 162.382C318.798 162.123 318.551 161.82 318.388 161.474C318.23 161.127 318.151 160.754 318.151 160.355C318.151 159.864 318.294 159.429 318.579 159.052C318.869 158.671 319.366 158.337 320.073 158.052V158.013C319.502 157.749 319.083 157.418 318.816 157.019C318.548 156.62 318.415 156.157 318.415 155.631C318.415 154.854 318.774 154.218 319.494 153.723C320.213 153.227 321.149 152.979 322.303 152.979C323.514 152.979 324.461 153.205 325.145 153.657C325.834 154.104 326.178 154.703 326.178 155.453C326.178 155.918 326.034 156.333 325.744 156.697C325.455 157.061 325.012 157.37 324.415 157.624V157.664C325.099 157.923 325.606 158.271 325.935 158.71C326.264 159.149 326.429 159.666 326.429 160.263ZM323.711 155.736C323.711 155.403 323.582 155.137 323.323 154.94C323.069 154.743 322.729 154.644 322.303 154.644C322.145 154.644 321.983 154.664 321.816 154.703C321.654 154.743 321.505 154.8 321.369 154.874C321.242 154.949 321.136 155.047 321.053 155.17C320.97 155.289 320.928 155.425 320.928 155.578C320.928 155.837 321 156.039 321.145 156.184C321.294 156.328 321.535 156.473 321.869 156.618C321.992 156.67 322.158 156.736 322.369 156.815C322.584 156.89 322.843 156.975 323.145 157.072C323.347 156.835 323.492 156.622 323.58 156.434C323.667 156.245 323.711 156.012 323.711 155.736ZM323.915 160.375C323.915 160.059 323.836 159.82 323.678 159.658C323.52 159.495 323.196 159.309 322.704 159.098C322.56 159.033 322.349 158.951 322.073 158.855C321.796 158.758 321.564 158.675 321.375 158.605C321.187 158.776 321.016 158.984 320.862 159.23C320.713 159.471 320.638 159.743 320.638 160.046C320.638 160.502 320.801 160.866 321.125 161.138C321.454 161.406 321.882 161.539 322.408 161.539C322.549 161.539 322.713 161.52 322.902 161.48C323.09 161.436 323.253 161.37 323.389 161.283C323.547 161.182 323.674 161.063 323.77 160.927C323.867 160.791 323.915 160.607 323.915 160.375Z" fill="#434343" />
          </g>
          {isToothSelected(8) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(8)}
              <g clipPath="url(#clip8_0_1)" transform="translate(0, 20)" display="none">
                <path d="M322.5 107.674C323.812 107.674 324.875 106.611 324.875 105.299C324.875 103.987 323.812 102.924 322.5 102.924C321.188 102.924 320.125 103.987 320.125 105.299C320.125 106.611 321.188 107.674 322.5 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M328.358 107.674C328.253 107.913 328.222 108.177 328.268 108.434C328.315 108.691 328.437 108.928 328.62 109.115L328.667 109.162C328.814 109.309 328.931 109.484 329.011 109.676C329.09 109.868 329.131 110.074 329.131 110.282C329.131 110.49 329.09 110.696 329.011 110.889C328.931 111.081 328.814 111.256 328.667 111.403C328.52 111.55 328.345 111.667 328.153 111.746C327.961 111.826 327.755 111.867 327.547 111.867C327.339 111.867 327.133 111.826 326.941 111.746C326.748 111.667 326.574 111.55 326.427 111.403L326.379 111.355C326.193 111.173 325.956 111.05 325.699 111.004C325.442 110.957 325.177 110.988 324.938 111.094C324.704 111.194 324.504 111.361 324.364 111.573C324.223 111.786 324.148 112.034 324.147 112.289V112.424C324.147 112.844 323.98 113.246 323.683 113.543C323.386 113.84 322.983 114.007 322.563 114.007C322.143 114.007 321.741 113.84 321.444 113.543C321.147 113.246 320.98 112.844 320.98 112.424V112.353C320.974 112.091 320.889 111.836 320.737 111.623C320.584 111.41 320.371 111.248 320.125 111.157C319.886 111.052 319.621 111.02 319.365 111.067C319.108 111.113 318.871 111.236 318.684 111.418L318.637 111.466C318.49 111.613 318.315 111.73 318.123 111.81C317.931 111.889 317.725 111.93 317.516 111.93C317.308 111.93 317.102 111.889 316.91 111.81C316.718 111.73 316.543 111.613 316.396 111.466C316.249 111.319 316.132 111.144 316.053 110.952C315.973 110.76 315.932 110.554 315.932 110.346C315.932 110.138 315.973 109.932 316.053 109.739C316.132 109.547 316.249 109.373 316.396 109.225L316.444 109.178C316.626 108.991 316.749 108.754 316.795 108.498C316.842 108.241 316.81 107.976 316.705 107.737C316.605 107.503 316.438 107.303 316.226 107.163C316.013 107.022 315.764 106.947 315.51 106.945H315.375C314.955 106.945 314.552 106.779 314.255 106.482C313.958 106.185 313.792 105.782 313.792 105.362C313.792 104.942 313.958 104.54 314.255 104.243C314.552 103.946 314.955 103.779 315.375 103.779H315.446C315.708 103.773 315.962 103.688 316.176 103.535C316.389 103.383 316.551 103.17 316.642 102.924C316.747 102.685 316.778 102.42 316.732 102.163C316.685 101.907 316.563 101.67 316.38 101.483L316.333 101.435C316.186 101.288 316.069 101.114 315.989 100.922C315.91 100.729 315.869 100.523 315.869 100.315C315.869 100.107 315.91 99.9012 315.989 99.709C316.069 99.5167 316.186 99.3421 316.333 99.1951C316.48 99.0479 316.655 98.9311 316.847 98.8514C317.039 98.7717 317.245 98.7307 317.453 98.7307C317.661 98.7307 317.867 98.7717 318.059 98.8514C318.252 98.9311 318.426 99.0479 318.573 99.1951L318.621 99.2426C318.807 99.4251 319.044 99.5475 319.301 99.5941C319.558 99.6406 319.823 99.6092 320.062 99.5038H320.125C320.359 99.4035 320.559 99.2368 320.7 99.0244C320.84 98.812 320.916 98.5632 320.917 98.3084V98.1738C320.917 97.7539 321.083 97.3512 321.38 97.0542C321.677 96.7573 322.08 96.5905 322.5 96.5905C322.92 96.5905 323.323 96.7573 323.62 97.0542C323.917 97.3512 324.083 97.7539 324.083 98.1738V98.2451C324.084 98.4998 324.16 98.7487 324.3 98.9611C324.441 99.1735 324.641 99.3401 324.875 99.4405C325.114 99.5459 325.379 99.5773 325.635 99.5307C325.892 99.4842 326.129 99.3618 326.316 99.1792L326.363 99.1317C326.51 98.9845 326.685 98.8677 326.877 98.7881C327.069 98.7084 327.275 98.6674 327.484 98.6674C327.692 98.6674 327.898 98.7084 328.09 98.7881C328.282 98.8677 328.457 98.9845 328.604 99.1317C328.751 99.2788 328.868 99.4534 328.947 99.6456C329.027 99.8378 329.068 100.044 329.068 100.252C329.068 100.46 329.027 100.666 328.947 100.858C328.868 101.05 328.751 101.225 328.604 101.372L328.556 101.42C328.374 101.606 328.251 101.843 328.205 102.1C328.158 102.357 328.19 102.622 328.295 102.86V102.924C328.395 103.158 328.562 103.358 328.774 103.498C328.987 103.639 329.236 103.714 329.49 103.715H329.625C330.045 103.715 330.448 103.882 330.745 104.179C331.042 104.476 331.208 104.879 331.208 105.299C331.208 105.719 331.042 106.121 330.745 106.418C330.448 106.715 330.045 106.882 329.625 106.882H329.554C329.299 106.883 329.05 106.959 328.838 107.099C328.625 107.24 328.459 107.44 328.358 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(7) ? 'wed-number' : undefined}>
            <path d="M283.705 155.151L279.27 163H276.454L281.06 155.078H276.026V153.203H283.705V155.151Z" fill="#434343" />
          </g>
          {isToothSelected(7) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(7)}
              <g clipPath="url(#clip9_0_1)" transform="translate(0, 20)" display="none">
                <path d="M280 107.674C281.312 107.674 282.375 106.611 282.375 105.299C282.375 103.987 281.312 102.924 280 102.924C278.688 102.924 277.625 103.987 277.625 105.299C277.625 106.611 278.688 107.674 280 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M285.858 107.674C285.753 107.913 285.722 108.177 285.768 108.434C285.815 108.691 285.937 108.928 286.12 109.115L286.167 109.162C286.314 109.309 286.431 109.484 286.511 109.676C286.59 109.868 286.631 110.074 286.631 110.282C286.631 110.49 286.59 110.696 286.511 110.889C286.431 111.081 286.314 111.256 286.167 111.403C286.02 111.55 285.845 111.667 285.653 111.746C285.461 111.826 285.255 111.867 285.047 111.867C284.839 111.867 284.633 111.826 284.441 111.746C284.248 111.667 284.074 111.55 283.927 111.403L283.879 111.355C283.693 111.173 283.456 111.05 283.199 111.004C282.942 110.957 282.677 110.988 282.438 111.094C282.204 111.194 282.004 111.361 281.864 111.573C281.723 111.786 281.648 112.034 281.647 112.289V112.424C281.647 112.844 281.48 113.246 281.183 113.543C280.886 113.84 280.483 114.007 280.063 114.007C279.643 114.007 279.241 113.84 278.944 113.543C278.647 113.246 278.48 112.844 278.48 112.424V112.353C278.474 112.091 278.389 111.836 278.237 111.623C278.084 111.41 277.871 111.248 277.625 111.157C277.386 111.052 277.121 111.02 276.865 111.067C276.608 111.113 276.371 111.236 276.184 111.418L276.137 111.466C275.99 111.613 275.815 111.73 275.623 111.81C275.431 111.889 275.225 111.93 275.016 111.93C274.808 111.93 274.602 111.889 274.41 111.81C274.218 111.73 274.043 111.613 273.896 111.466C273.749 111.319 273.632 111.144 273.553 110.952C273.473 110.76 273.432 110.554 273.432 110.346C273.432 110.138 273.473 109.932 273.553 109.739C273.632 109.547 273.749 109.373 273.896 109.225L273.944 109.178C274.126 108.991 274.249 108.754 274.295 108.498C274.342 108.241 274.31 107.976 274.205 107.737C274.105 107.503 273.938 107.303 273.726 107.163C273.513 107.022 273.264 106.947 273.01 106.945H272.875C272.455 106.945 272.052 106.779 271.755 106.482C271.458 106.185 271.292 105.782 271.292 105.362C271.292 104.942 271.458 104.54 271.755 104.243C272.052 103.946 272.455 103.779 272.875 103.779H272.946C273.208 103.773 273.462 103.688 273.676 103.535C273.889 103.383 274.051 103.17 274.142 102.924C274.247 102.685 274.278 102.42 274.232 102.163C274.185 101.907 274.063 101.67 273.88 101.483L273.833 101.435C273.686 101.288 273.569 101.114 273.489 100.922C273.41 100.729 273.369 100.523 273.369 100.315C273.369 100.107 273.41 99.9012 273.489 99.709C273.569 99.5167 273.686 99.3421 273.833 99.1951C273.98 99.0479 274.155 98.9311 274.347 98.8514C274.539 98.7717 274.745 98.7307 274.953 98.7307C275.161 98.7307 275.367 98.7717 275.559 98.8514C275.752 98.9311 275.926 99.0479 276.073 99.1951L276.121 99.2426C276.307 99.4251 276.544 99.5475 276.801 99.5941C277.058 99.6406 277.323 99.6092 277.562 99.5038H277.625C277.859 99.4035 278.059 99.2368 278.2 99.0244C278.34 98.812 278.416 98.5632 278.417 98.3084V98.1738C278.417 97.7539 278.583 97.3512 278.88 97.0542C279.177 96.7573 279.58 96.5905 280 96.5905C280.42 96.5905 280.823 96.7573 281.12 97.0542C281.417 97.3512 281.583 97.7539 281.583 98.1738V98.2451C281.584 98.4998 281.66 98.7487 281.8 98.9611C281.941 99.1735 282.141 99.3401 282.375 99.4405C282.614 99.5459 282.879 99.5773 283.135 99.5307C283.392 99.4842 283.629 99.3618 283.816 99.1792L283.863 99.1317C284.01 98.9845 284.185 98.8677 284.377 98.7881C284.569 98.7084 284.775 98.6674 284.984 98.6674C285.192 98.6674 285.398 98.7084 285.59 98.7881C285.782 98.8677 285.957 98.9845 286.104 99.1317C286.251 99.2788 286.368 99.4534 286.447 99.6456C286.527 99.8378 286.568 100.044 286.568 100.252C286.568 100.46 286.527 100.666 286.447 100.858C286.368 101.05 286.251 101.225 286.104 101.372L286.056 101.42C285.874 101.606 285.751 101.843 285.705 102.1C285.658 102.357 285.69 102.622 285.795 102.86V102.924C285.895 103.158 286.062 103.358 286.274 103.498C286.487 103.639 286.736 103.714 286.99 103.715H287.125C287.545 103.715 287.948 103.882 288.245 104.179C288.542 104.476 288.708 104.879 288.708 105.299C288.708 105.719 288.542 106.121 288.245 106.418C287.948 106.715 287.545 106.882 287.125 106.882H287.054C286.799 106.883 286.55 106.959 286.338 107.099C286.125 107.24 285.959 107.44 285.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(6) ? 'wed-number' : undefined}>
            <path d="M245.896 159.664C245.896 160.169 245.803 160.642 245.619 161.085C245.435 161.528 245.176 161.901 244.843 162.204C244.488 162.528 244.075 162.776 243.606 162.947C243.141 163.118 242.595 163.204 241.968 163.204C241.38 163.204 240.842 163.125 240.356 162.967C239.873 162.805 239.459 162.559 239.112 162.23C238.713 161.853 238.408 161.366 238.197 160.77C237.987 160.173 237.882 159.46 237.882 158.631C237.882 157.771 237.98 157.008 238.178 156.341C238.375 155.675 238.698 155.085 239.145 154.572C239.575 154.08 240.132 153.699 240.816 153.427C241.505 153.155 242.323 153.019 243.27 153.019C243.591 153.019 243.941 153.041 244.323 153.085C244.705 153.128 244.953 153.161 245.067 153.183V155.111H244.817C244.698 155.054 244.496 154.99 244.211 154.92C243.931 154.846 243.61 154.808 243.251 154.808C242.408 154.808 241.753 155.015 241.283 155.427C240.814 155.839 240.531 156.414 240.435 157.151C240.772 156.949 241.128 156.787 241.5 156.664C241.878 156.537 242.283 156.473 242.718 156.473C243.099 156.473 243.452 156.517 243.777 156.605C244.106 156.692 244.411 156.833 244.692 157.026C245.056 157.28 245.347 157.622 245.567 158.052C245.786 158.482 245.896 159.019 245.896 159.664ZM242.902 161.145C243.038 160.995 243.145 160.82 243.224 160.618C243.308 160.412 243.349 160.133 243.349 159.783C243.349 159.462 243.303 159.201 243.211 159C243.119 158.793 242.992 158.629 242.83 158.506C242.672 158.383 242.485 158.3 242.27 158.256C242.055 158.208 241.834 158.184 241.606 158.184C241.413 158.184 241.211 158.206 241 158.25C240.79 158.293 240.597 158.348 240.421 158.414C240.421 158.458 240.419 158.53 240.415 158.631C240.41 158.732 240.408 158.859 240.408 159.013C240.408 159.552 240.461 159.998 240.566 160.348C240.676 160.695 240.821 160.96 241 161.145C241.123 161.281 241.268 161.381 241.435 161.447C241.601 161.509 241.781 161.539 241.974 161.539C242.119 161.539 242.279 161.506 242.454 161.441C242.63 161.375 242.779 161.276 242.902 161.145Z" fill="#434343" />
          </g>
          {isToothSelected(6) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(6)}
              <g clipPath="url(#clip10_0_1)" transform="translate(0, 20)" display="none">
                <path d="M242 107.674C243.312 107.674 244.375 106.611 244.375 105.299C244.375 103.987 243.312 102.924 242 102.924C240.688 102.924 239.625 103.987 239.625 105.299C239.625 106.611 240.688 107.674 242 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M247.858 107.674C247.753 107.913 247.722 108.177 247.768 108.434C247.815 108.691 247.937 108.928 248.12 109.115L248.167 109.162C248.314 109.309 248.431 109.484 248.511 109.676C248.59 109.868 248.631 110.074 248.631 110.282C248.631 110.49 248.59 110.696 248.511 110.889C248.431 111.081 248.314 111.256 248.167 111.403C248.02 111.55 247.845 111.667 247.653 111.746C247.461 111.826 247.255 111.867 247.047 111.867C246.839 111.867 246.633 111.826 246.441 111.746C246.248 111.667 246.074 111.55 245.927 111.403L245.879 111.355C245.693 111.173 245.456 111.05 245.199 111.004C244.942 110.957 244.677 110.988 244.438 111.094C244.204 111.194 244.004 111.361 243.864 111.573C243.723 111.786 243.648 112.034 243.647 112.289V112.424C243.647 112.844 243.48 113.246 243.183 113.543C242.886 113.84 242.483 114.007 242.063 114.007C241.643 114.007 241.241 113.84 240.944 113.543C240.647 113.246 240.48 112.844 240.48 112.424V112.353C240.474 112.091 240.389 111.836 240.237 111.623C240.084 111.41 239.871 111.248 239.625 111.157C239.386 111.052 239.121 111.02 238.865 111.067C238.608 111.113 238.371 111.236 238.184 111.418L238.137 111.466C237.99 111.613 237.815 111.73 237.623 111.81C237.431 111.889 237.225 111.93 237.016 111.93C236.808 111.93 236.602 111.889 236.41 111.81C236.218 111.73 236.043 111.613 235.896 111.466C235.749 111.319 235.632 111.144 235.553 110.952C235.473 110.76 235.432 110.554 235.432 110.346C235.432 110.138 235.473 109.932 235.553 109.739C235.632 109.547 235.749 109.373 235.896 109.225L235.944 109.178C236.126 108.991 236.249 108.754 236.295 108.498C236.342 108.241 236.31 107.976 236.205 107.737C236.105 107.503 235.938 107.303 235.726 107.163C235.513 107.022 235.264 106.947 235.01 106.945H234.875C234.455 106.945 234.052 106.779 233.755 106.482C233.458 106.185 233.292 105.782 233.292 105.362C233.292 104.942 233.458 104.54 233.755 104.243C234.052 103.946 234.455 103.779 234.875 103.779H234.946C235.208 103.773 235.462 103.688 235.676 103.535C235.889 103.383 236.051 103.17 236.142 102.924C236.247 102.685 236.278 102.42 236.232 102.163C236.185 101.907 236.063 101.67 235.88 101.483L235.833 101.435C235.686 101.288 235.569 101.114 235.489 100.922C235.41 100.729 235.369 100.523 235.369 100.315C235.369 100.107 235.41 99.9012 235.489 99.709C235.569 99.5167 235.686 99.3421 235.833 99.1951C235.98 99.0479 236.155 98.9311 236.347 98.8514C236.539 98.7717 236.745 98.7307 236.953 98.7307C237.161 98.7307 237.367 98.7717 237.559 98.8514C237.752 98.9311 237.926 99.0479 238.073 99.1951L238.121 99.2426C238.307 99.4251 238.544 99.5475 238.801 99.5941C239.058 99.6406 239.323 99.6092 239.562 99.5038H239.625C239.859 99.4035 240.059 99.2368 240.2 99.0244C240.34 98.812 240.416 98.5632 240.417 98.3084V98.1738C240.417 97.7539 240.583 97.3512 240.88 97.0542C241.177 96.7573 241.58 96.5905 242 96.5905C242.42 96.5905 242.823 96.7573 243.12 97.0542C243.417 97.3512 243.583 97.7539 243.583 98.1738V98.2451C243.584 98.4998 243.66 98.7487 243.8 98.9611C243.941 99.1735 244.141 99.3401 244.375 99.4405C244.614 99.5459 244.879 99.5773 245.135 99.5307C245.392 99.4842 245.629 99.3618 245.816 99.1792L245.863 99.1317C246.01 98.9845 246.185 98.8677 246.377 98.7881C246.569 98.7084 246.775 98.6674 246.984 98.6674C247.192 98.6674 247.398 98.7084 247.59 98.7881C247.782 98.8677 247.957 98.9845 248.104 99.1317C248.251 99.2788 248.368 99.4534 248.447 99.6456C248.527 99.8378 248.568 100.044 248.568 100.252C248.568 100.46 248.527 100.666 248.447 100.858C248.368 101.05 248.251 101.225 248.104 101.372L248.056 101.42C247.874 101.606 247.751 101.843 247.705 102.1C247.658 102.357 247.69 102.622 247.795 102.86V102.924C247.895 103.158 248.062 103.358 248.274 103.498C248.487 103.639 248.736 103.714 248.99 103.715H249.125C249.545 103.715 249.948 103.882 250.245 104.179C250.542 104.476 250.708 104.879 250.708 105.299C250.708 105.719 250.542 106.121 250.245 106.418C249.948 106.715 249.545 106.882 249.125 106.882H249.054C248.799 106.883 248.55 106.959 248.338 107.099C248.125 107.24 247.959 107.44 247.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(5) ? 'wed-number' : undefined}>
            <path d="M207.198 159.684C207.198 160.193 207.102 160.666 206.909 161.105C206.72 161.539 206.444 161.912 206.08 162.224C205.676 162.557 205.211 162.805 204.685 162.967C204.163 163.125 203.566 163.204 202.895 163.204C202.11 163.2 201.445 163.136 200.902 163.013C200.362 162.895 199.921 162.761 199.579 162.612V160.447H199.855C200.255 160.684 200.684 160.881 201.145 161.039C201.606 161.197 202.064 161.276 202.52 161.276C202.796 161.276 203.095 161.245 203.415 161.184C203.74 161.118 203.996 161.002 204.185 160.835C204.334 160.699 204.446 160.561 204.52 160.421C204.599 160.28 204.639 160.063 204.639 159.769C204.639 159.541 204.586 159.346 204.481 159.184C204.38 159.017 204.248 158.883 204.086 158.782C203.849 158.638 203.564 158.543 203.231 158.5C202.897 158.451 202.595 158.427 202.323 158.427C201.928 158.427 201.549 158.462 201.184 158.532C200.825 158.598 200.509 158.664 200.237 158.73H199.948V153.203H206.915V155.078H202.323V156.677C202.459 156.668 202.63 156.662 202.836 156.657C203.046 156.649 203.231 156.644 203.389 156.644C203.928 156.644 204.408 156.697 204.83 156.802C205.255 156.903 205.621 157.045 205.928 157.23C206.328 157.471 206.639 157.791 206.863 158.19C207.086 158.585 207.198 159.083 207.198 159.684Z" fill="#434343" />
          </g>
          {isToothSelected(5) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(5)}
              <g clipPath="url(#clip11_0_1)" transform="translate(0, 20)" display="none">
                <path d="M203.5 107.674C204.812 107.674 205.875 106.611 205.875 105.299C205.875 103.987 204.812 102.924 203.5 102.924C202.188 102.924 201.125 103.987 201.125 105.299C201.125 106.611 202.188 107.674 203.5 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M209.358 107.674C209.253 107.913 209.222 108.177 209.268 108.434C209.315 108.691 209.437 108.928 209.62 109.115L209.667 109.162C209.814 109.309 209.931 109.484 210.011 109.676C210.09 109.868 210.131 110.074 210.131 110.282C210.131 110.49 210.09 110.696 210.011 110.889C209.931 111.081 209.814 111.256 209.667 111.403C209.52 111.55 209.345 111.667 209.153 111.746C208.961 111.826 208.755 111.867 208.547 111.867C208.339 111.867 208.133 111.826 207.941 111.746C207.748 111.667 207.574 111.55 207.427 111.403L207.379 111.355C207.193 111.173 206.956 111.05 206.699 111.004C206.442 110.957 206.177 110.988 205.938 111.094C205.704 111.194 205.504 111.361 205.364 111.573C205.223 111.786 205.148 112.034 205.147 112.289V112.424C205.147 112.844 204.98 113.246 204.683 113.543C204.386 113.84 203.983 114.007 203.563 114.007C203.143 114.007 202.741 113.84 202.444 113.543C202.147 113.246 201.98 112.844 201.98 112.424V112.353C201.974 112.091 201.889 111.836 201.737 111.623C201.584 111.41 201.371 111.248 201.125 111.157C200.886 111.052 200.621 111.02 200.365 111.067C200.108 111.113 199.871 111.236 199.684 111.418L199.637 111.466C199.49 111.613 199.315 111.73 199.123 111.81C198.931 111.889 198.725 111.93 198.516 111.93C198.308 111.93 198.102 111.889 197.91 111.81C197.718 111.73 197.543 111.613 197.396 111.466C197.249 111.319 197.132 111.144 197.053 110.952C196.973 110.76 196.932 110.554 196.932 110.346C196.932 110.138 196.973 109.932 197.053 109.739C197.132 109.547 197.249 109.373 197.396 109.225L197.444 109.178C197.626 108.991 197.749 108.754 197.795 108.498C197.842 108.241 197.81 107.976 197.705 107.737C197.605 107.503 197.438 107.303 197.226 107.163C197.013 107.022 196.764 106.947 196.51 106.945H196.375C195.955 106.945 195.552 106.779 195.255 106.482C194.958 106.185 194.792 105.782 194.792 105.362C194.792 104.942 194.958 104.54 195.255 104.243C195.552 103.946 195.955 103.779 196.375 103.779H196.446C196.708 103.773 196.962 103.688 197.176 103.535C197.389 103.383 197.551 103.17 197.642 102.924C197.747 102.685 197.778 102.42 197.732 102.163C197.685 101.907 197.563 101.67 197.38 101.483L197.333 101.435C197.186 101.288 197.069 101.114 196.989 100.922C196.91 100.729 196.869 100.523 196.869 100.315C196.869 100.107 196.91 99.9012 196.989 99.709C197.069 99.5167 197.186 99.3421 197.333 99.1951C197.48 99.0479 197.655 98.9311 197.847 98.8514C198.039 98.7717 198.245 98.7307 198.453 98.7307C198.661 98.7307 198.867 98.7717 199.059 98.8514C199.252 98.9311 199.426 99.0479 199.573 99.1951L199.621 99.2426C199.807 99.4251 200.044 99.5475 200.301 99.5941C200.558 99.6406 200.823 99.6092 201.062 99.5038H201.125C201.359 99.4035 201.559 99.2368 201.7 99.0244C201.84 98.812 201.916 98.5632 201.917 98.3084V98.1738C201.917 97.7539 202.083 97.3512 202.38 97.0542C202.677 96.7573 203.08 96.5905 203.5 96.5905C203.92 96.5905 204.323 96.7573 204.62 97.0542C204.917 97.3512 205.083 97.7539 205.083 98.1738V98.2451C205.084 98.4998 205.16 98.7487 205.3 98.9611C205.441 99.1735 205.641 99.3401 205.875 99.4405C206.114 99.5459 206.379 99.5773 206.635 99.5307C206.892 99.4842 207.129 99.3618 207.316 99.1792L207.363 99.1317C207.51 98.9845 207.685 98.8677 207.877 98.7881C208.069 98.7084 208.275 98.6674 208.484 98.6674C208.692 98.6674 208.898 98.7084 209.09 98.7881C209.282 98.8677 209.457 98.9845 209.604 99.1317C209.751 99.2788 209.868 99.4534 209.947 99.6456C210.027 99.8378 210.068 100.044 210.068 100.252C210.068 100.46 210.027 100.666 209.947 100.858C209.868 101.05 209.751 101.225 209.604 101.372L209.556 101.42C209.374 101.606 209.251 101.843 209.205 102.1C209.158 102.357 209.19 102.622 209.295 102.86V102.924C209.395 103.158 209.562 103.358 209.774 103.498C209.987 103.639 210.236 103.714 210.49 103.715H210.625C211.045 103.715 211.448 103.882 211.745 104.179C212.042 104.476 212.208 104.879 212.208 105.299C212.208 105.719 212.042 106.121 211.745 106.418C211.448 106.715 211.045 106.882 210.625 106.882H210.554C210.299 106.883 210.05 106.959 209.838 107.099C209.625 107.240 209.459 107.44 209.358 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(4) ? 'wed-number' : undefined}>
            <path d="M170.547 160.743H169.211V163.026H166.797V160.743H162.053V158.888L166.639 153.203H169.211V158.954H170.547V160.743ZM166.797 158.954V155.414L163.948 158.954H166.797Z" fill="#434343" />
          </g>
          {isToothSelected(4) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(4)}
              <g clipPath="url(#clip12_0_1)" transform="translate(0, 20)" display="none">
                <path d="M166.5 107.674C167.812 107.674 168.875 106.611 168.875 105.299C168.875 103.987 167.812 102.924 166.5 102.924C165.188 102.924 164.125 103.987 164.125 105.299C164.125 106.611 165.188 107.674 166.5 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M172.358 107.674C172.253 107.913 172.222 108.177 172.268 108.434C172.315 108.691 172.437 108.928 172.62 109.115L172.667 109.162C172.814 109.309 172.931 109.484 173.011 109.676C173.09 109.868 173.131 110.074 173.131 110.282C173.131 110.49 173.09 110.696 173.011 110.889C172.931 111.081 172.814 111.256 172.667 111.403C172.52 111.55 172.345 111.667 172.153 111.746C171.961 111.826 171.755 111.867 171.547 111.867C171.339 111.867 171.133 111.826 170.941 111.746C170.748 111.667 170.574 111.55 170.427 111.403L170.379 111.355C170.193 111.173 169.956 111.05 169.699 111.004C169.442 110.957 169.177 110.988 168.938 111.094C168.704 111.194 168.504 111.361 168.364 111.573C168.223 111.786 168.148 112.034 168.147 112.289V112.424C168.147 112.844 167.98 113.246 167.683 113.543C167.386 113.84 166.983 114.007 166.563 114.007C166.143 114.007 165.741 113.84 165.444 113.543C165.147 113.246 164.98 112.844 164.98 112.424V112.353C164.974 112.091 164.889 111.836 164.737 111.623C164.584 111.41 164.371 111.248 164.125 111.157C163.886 111.052 163.621 111.02 163.365 111.067C163.108 111.113 162.871 111.236 162.684 111.418L162.637 111.466C162.49 111.613 162.315 111.73 162.123 111.81C161.931 111.889 161.725 111.93 161.516 111.93C161.308 111.93 161.102 111.889 160.91 111.81C160.718 111.73 160.543 111.613 160.396 111.466C160.249 111.319 160.132 111.144 160.053 110.952C159.973 110.76 159.932 110.554 159.932 110.346C159.932 110.138 159.973 109.932 160.053 109.739C160.132 109.547 160.249 109.373 160.396 109.225L160.444 109.178C160.626 108.991 160.749 108.754 160.795 108.498C160.842 108.241 160.81 107.976 160.705 107.737C160.605 107.503 160.438 107.303 160.226 107.163C160.013 107.022 159.764 106.947 159.51 106.945H159.375C158.955 106.945 158.552 106.779 158.255 106.482C157.958 106.185 157.792 105.782 157.792 105.362C157.792 104.942 157.958 104.54 158.255 104.243C158.552 103.946 158.955 103.779 159.375 103.779H159.446C159.708 103.773 159.962 103.688 160.176 103.535C160.389 103.383 160.551 103.17 160.642 102.924C160.747 102.685 160.778 102.42 160.732 102.163C160.685 101.907 160.563 101.67 160.38 101.483L160.333 101.435C160.186 101.288 160.069 101.114 159.989 100.922C159.91 100.729 159.869 100.523 159.869 100.315C159.869 100.107 159.91 99.9012 159.989 99.709C160.069 99.5167 160.186 99.3421 160.333 99.1951C160.48 99.0479 160.655 98.9311 160.847 98.8514C161.039 98.7717 161.245 98.7307 161.453 98.7307C161.661 98.7307 161.867 98.7717 162.059 98.8514C162.252 98.9311 162.426 99.0479 162.573 99.1951L162.621 99.2426C162.807 99.4251 163.044 99.5475 163.301 99.5941C163.558 99.6406 163.823 99.6092 164.062 99.5038H164.125C164.359 99.4035 164.559 99.2368 164.7 99.0244C164.84 98.812 164.916 98.5632 164.917 98.3084V98.1738C164.917 97.7539 165.083 97.3512 165.38 97.0542C165.677 96.7573 166.08 96.5905 166.5 96.5905C166.92 96.5905 167.323 96.7573 167.62 97.0542C167.917 97.3512 168.083 97.7539 168.083 98.1738V98.2451C168.084 98.4998 168.16 98.7487 168.3 98.9611C168.441 99.1735 168.641 99.3401 168.875 99.4405C169.114 99.5459 169.379 99.5773 169.635 99.5307C169.892 99.4842 170.129 99.3618 170.316 99.1792L170.363 99.1317C170.51 98.9845 170.685 98.8677 170.877 98.7881C171.069 98.7084 171.275 98.6674 171.484 98.6674C171.692 98.6674 171.898 98.7084 172.09 98.7881C172.282 98.8677 172.457 98.9845 172.604 99.1317C172.751 99.2788 172.868 99.4534 172.947 99.6456C173.027 99.8378 173.068 100.044 173.068 100.252C173.068 100.46 173.027 100.666 172.947 100.858C172.868 101.05 172.751 101.225 172.604 101.372L172.556 101.42C172.374 101.606 172.251 101.843 172.205 102.1C172.158 102.357 172.19 102.622 172.295 102.86V102.924C172.395 103.158 172.562 103.358 172.774 103.498C172.987 103.639 173.236 103.714 173.49 103.715H173.625C174.045 103.715 174.448 103.882 174.745 104.179C175.042 104.476 175.208 104.879 175.208 105.299C175.208 105.719 175.042 106.121 174.745 106.418C174.448 106.715 174.045 106.882 173.625 106.882H173.554C173.299 106.883 173.05 106.959 172.838 107.099C172.625 107.240 172.459 107.44 172.358 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(3) ? 'wed-number' : undefined}>
            <path d="M123.948 158.407C124.163 158.592 124.334 158.807 124.461 159.052C124.589 159.298 124.652 159.625 124.652 160.033C124.652 160.493 124.56 160.923 124.376 161.322C124.196 161.721 123.917 162.064 123.54 162.349C123.172 162.625 122.737 162.838 122.237 162.987C121.742 163.132 121.139 163.204 120.428 163.204C119.617 163.204 118.919 163.14 118.336 163.013C117.757 162.886 117.285 162.743 116.921 162.585V160.434H117.178C117.555 160.662 118.005 160.859 118.527 161.026C119.053 161.193 119.533 161.276 119.967 161.276C120.222 161.276 120.498 161.256 120.797 161.217C121.095 161.173 121.347 161.081 121.553 160.941C121.715 160.831 121.845 160.699 121.941 160.546C122.038 160.388 122.086 160.162 122.086 159.868C122.086 159.583 122.02 159.364 121.889 159.21C121.757 159.052 121.584 158.94 121.369 158.875C121.154 158.804 120.895 158.767 120.593 158.763C120.29 158.754 120.009 158.75 119.75 158.75H119.211V156.999H119.77C120.112 156.999 120.415 156.988 120.678 156.967C120.941 156.945 121.165 156.894 121.349 156.815C121.542 156.732 121.687 156.622 121.783 156.486C121.88 156.346 121.928 156.142 121.928 155.874C121.928 155.677 121.878 155.519 121.777 155.401C121.676 155.278 121.549 155.181 121.395 155.111C121.224 155.032 121.022 154.979 120.79 154.953C120.557 154.927 120.358 154.914 120.191 154.914C119.779 154.914 119.331 154.986 118.849 155.131C118.366 155.271 117.899 155.475 117.448 155.743H117.204V153.618C117.564 153.473 118.053 153.335 118.671 153.203C119.29 153.067 119.917 152.999 120.553 152.999C121.172 152.999 121.713 153.054 122.178 153.164C122.643 153.269 123.027 153.411 123.30 153.591C123.689 153.806 123.957 154.067 124.132 154.374C124.308 154.681 124.396 155.041 124.396 155.453C124.396 155.997 124.227 156.484 123.889 156.914C123.551 157.339 123.106 157.611 122.553 157.73V157.822C122.777 157.853 123.014 157.914 123.264 158.006C123.514 158.098 123.742 158.232 123.948 158.407Z" fill="#434343" />
          </g>
          {isToothSelected(3) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(3)}
              <g clipPath="url(#clip13_0_1)" transform="translate(0, 20)" display="none">
                <path d="M121 107.674C122.312 107.674 123.375 106.611 123.375 105.299C123.375 103.987 122.312 102.924 121 102.924C119.688 102.924 118.625 103.987 118.625 105.299C118.625 106.611 119.688 107.674 121 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M126.858 107.674C126.753 107.913 126.722 108.177 126.768 108.434C126.815 108.691 126.937 108.928 127.12 109.115L127.167 109.162C127.314 109.309 127.431 109.484 127.511 109.676C127.59 109.868 127.631 110.074 127.631 110.282C127.631 110.49 127.59 110.696 127.511 110.889C127.431 111.081 127.314 111.256 127.167 111.403C127.02 111.55 126.845 111.667 126.653 111.746C126.461 111.826 126.255 111.867 126.047 111.867C125.839 111.867 125.633 111.826 125.441 111.746C125.248 111.667 125.074 111.55 124.927 111.403L124.879 111.355C124.693 111.173 124.456 111.05 124.199 111.004C123.942 110.957 123.677 110.988 123.438 111.094C123.204 111.194 123.004 111.361 122.864 111.573C122.723 111.786 122.648 112.034 122.647 112.289V112.424C122.647 112.844 122.48 113.246 122.183 113.543C121.886 113.84 121.483 114.007 121.063 114.007C120.643 114.007 120.241 113.84 119.944 113.543C119.647 113.246 119.48 112.844 119.48 112.424V112.353C119.474 112.091 119.389 111.836 119.237 111.623C119.084 111.41 118.871 111.248 118.625 111.157C118.386 111.052 118.121 111.02 117.865 111.067C117.608 111.113 117.371 111.236 117.184 111.418L117.137 111.466C116.99 111.613 116.815 111.73 116.623 111.81C116.431 111.889 116.225 111.93 116.016 111.93C115.808 111.93 115.602 111.889 115.41 111.81C115.218 111.73 115.043 111.613 114.896 111.466C114.749 111.319 114.632 111.144 114.553 110.952C114.473 110.76 114.432 110.554 114.432 110.346C114.432 110.138 114.473 109.932 114.553 109.739C114.632 109.547 114.749 109.373 114.896 109.225L114.944 109.178C115.126 108.991 115.249 108.754 115.295 108.498C115.342 108.241 115.31 107.976 115.205 107.737C115.105 107.503 114.938 107.303 114.726 107.163C114.513 107.022 114.264 106.947 114.01 106.945H113.875C113.455 106.945 113.052 106.779 112.755 106.482C112.458 106.185 112.292 105.782 112.292 105.362C112.292 104.942 112.458 104.54 112.755 104.243C113.052 103.946 113.455 103.779 113.875 103.779H113.946C114.208 103.773 114.462 103.688 114.676 103.535C114.889 103.383 115.051 103.17 115.142 102.924C115.247 102.685 115.278 102.42 115.232 102.163C115.185 101.907 115.063 101.67 114.88 101.483L114.833 101.435C114.686 101.288 114.569 101.114 114.489 100.922C114.41 100.729 114.369 100.523 114.369 100.315C114.369 100.107 114.41 99.9012 114.489 99.709C114.569 99.5167 114.686 99.3421 114.833 99.1951C114.98 99.0479 115.155 98.9311 115.347 98.8514C115.539 98.7717 115.745 98.7307 115.953 98.7307C116.161 98.7307 116.367 98.7717 116.559 98.8514C116.752 98.9311 116.926 99.0479 117.073 99.1951L117.121 99.2426C117.307 99.4251 117.544 99.5475 117.801 99.5941C118.058 99.6406 118.323 99.6092 118.562 99.5038H118.625C118.859 99.4035 119.059 99.2368 119.2 99.0244C119.34 98.812 119.416 98.5632 119.417 98.3084V98.1738C119.417 97.7539 119.583 97.3512 119.88 97.0542C120.177 96.7573 120.58 96.5905 121 96.5905C121.42 96.5905 121.823 96.7573 122.12 97.0542C122.417 97.3512 122.583 97.7539 122.583 98.1738V98.2451C122.584 98.4998 122.66 98.7487 122.8 98.9611C122.941 99.1735 123.141 99.3401 123.375 99.4405C123.614 99.5459 123.879 99.5773 124.135 99.5307C124.392 99.4842 124.629 99.3618 124.816 99.1792L124.863 99.1317C125.01 98.9845 125.185 98.8677 125.377 98.7881C125.569 98.7084 125.775 98.6674 125.984 98.6674C126.192 98.6674 126.398 98.7084 126.59 98.7881C126.782 98.8677 126.957 98.9845 127.104 99.1317C127.251 99.2788 127.368 99.4534 127.447 99.6456C127.527 99.8378 127.568 100.044 127.568 100.252C127.568 100.46 127.527 100.666 127.447 100.858C127.368 101.05 127.251 101.225 127.104 101.372L127.056 101.42C126.874 101.606 126.751 101.843 126.705 102.1C126.658 102.357 126.69 102.622 126.795 102.86V102.924C126.895 103.158 127.062 103.358 127.274 103.498C127.487 103.639 127.736 103.714 127.99 103.715H128.125C128.545 103.715 128.948 103.882 129.245 104.179C129.542 104.476 129.708 104.879 129.708 105.299C129.708 105.719 129.542 106.121 129.245 106.418C128.948 106.715 128.545 106.882 128.125 106.882H128.054C127.799 106.883 127.55 106.959 127.338 107.099C127.125 107.24 126.959 107.44 126.858 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(2) ? 'wed-number' : undefined}>
            <path d="M72.9088 163H65.2172V161.381C65.805 160.956 66.3928 160.504 66.9806 160.026C67.5727 159.548 68.0464 159.136 68.4017 158.789C68.9325 158.276 69.3097 157.828 69.5334 157.447C69.7571 157.065 69.869 156.688 69.869 156.315C69.869 155.868 69.7242 155.523 69.4347 155.282C69.1496 155.037 68.7373 154.914 68.1978 154.914C67.7942 154.914 67.3687 154.997 66.9213 155.164C66.4783 155.33 66.066 155.543 65.6844 155.802H65.4738V153.624C65.7853 153.488 66.2436 153.352 66.849 153.216C67.4587 153.08 68.0684 153.012 68.6781 153.012C69.9063 153.012 70.8428 153.271 71.4876 153.789C72.1324 154.302 72.4548 155.03 72.4548 155.973C72.4548 156.591 72.2991 157.179 71.9876 157.736C71.6806 158.293 71.209 158.868 70.573 159.46C70.1738 159.829 69.7725 160.169 69.3689 160.48C68.9654 160.787 68.6781 161.002 68.507 161.125H72.9088V163Z" fill="#434343" />
          </g>
          {isToothSelected(2) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(2)}
              <g clipPath="url(#clip14_0_1)" transform="translate(0, 20)" display="none">
                <path d="M69 107.674C70.3117 107.674 71.375 106.611 71.375 105.299C71.375 103.987 70.3117 102.924 69 102.924C67.6883 102.924 66.625 103.987 66.625 105.299C66.625 106.611 67.6883 107.674 69 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M74.8583 107.674C74.7529 107.913 74.7215 108.177 74.7681 108.434C74.8146 108.691 74.9371 108.928 75.1196 109.115L75.1671 109.162C75.3143 109.309 75.4311 109.484 75.5108 109.676C75.5904 109.868 75.6314 110.074 75.6314 110.282C75.6314 110.49 75.5904 110.696 75.5108 110.889C75.4311 111.081 75.3143 111.256 75.1671 111.403C75.02 111.55 74.8454 111.667 74.6532 111.746C74.461 111.826 74.2549 111.867 74.0469 111.867C73.8388 111.867 73.6328 111.826 73.4405 111.746C73.2483 111.667 73.0737 111.55 72.9267 111.403L72.8792 111.355C72.6926 111.173 72.4556 111.05 72.1988 111.004C71.942 110.957 71.6771 110.988 71.4383 111.094C71.2042 111.194 71.0045 111.361 70.8638 111.573C70.7232 111.786 70.6477 112.034 70.6467 112.289V112.424C70.6467 112.844 70.4798 113.246 70.1829 113.543C69.886 113.84 69.4832 114.007 69.0633 114.007C68.6434 114.007 68.2407 113.84 67.9437 113.543C67.6468 113.246 67.48 112.844 67.48 112.424V112.353C67.4739 112.091 67.389 111.836 67.2366 111.623C67.0841 111.41 66.871 111.248 66.625 111.157C66.3862 111.052 66.1213 111.02 65.8645 111.067C65.6077 111.113 65.3707 111.236 65.1842 111.418L65.1367 111.466C64.9896 111.613 64.815 111.73 64.6228 111.81C64.4306 111.889 64.2245 111.93 64.0164 111.93C63.8084 111.93 63.6023 111.889 63.4101 111.81C63.2179 111.73 63.0433 111.613 62.8962 111.466C62.749 111.319 62.6322 111.144 62.5526 110.952C62.4729 110.76 62.4319 110.554 62.4319 110.346C62.4319 110.138 62.4729 109.932 62.5526 109.739C62.6322 109.547 62.749 109.373 62.8962 109.225L62.9437 109.178C63.1262 108.991 63.2487 108.754 63.2952 108.498C63.3418 108.241 63.3104 107.976 63.205 107.737C63.1046 107.503 62.938 107.303 62.7256 107.163C62.5132 107.022 62.2643 106.947 62.0096 106.945H61.875C61.4551 106.945 61.0523 106.779 60.7554 106.482C60.4585 106.185 60.2917 105.782 60.2917 105.362C60.2917 104.942 60.4585 104.54 60.7554 104.243C61.0523 103.946 61.4551 103.779 61.875 103.779H61.9462C62.2083 103.773 62.4624 103.688 62.6756 103.535C62.8888 103.383 63.0512 103.17 63.1417 102.924C63.247 102.685 63.2785 102.42 63.2319 102.163C63.1853 101.907 63.0629 101.67 62.8804 101.483L62.8329 101.435C62.6857 101.288 62.5689 101.114 62.4892 100.922C62.4095 100.729 62.3685 100.523 62.3685 100.315C62.3685 100.107 62.4095 99.9012 62.4892 99.709C62.5689 99.5167 62.6857 99.3421 62.8329 99.1951C62.98 99.0479 63.1546 98.9311 63.3468 98.8514C63.539 98.7717 63.745 98.7307 63.9531 98.7307C64.1612 98.7307 64.3672 98.7717 64.5594 98.8514C64.7517 98.9311 64.9263 99.0479 65.0733 99.1951L65.1208 99.2426C65.3074 99.4251 65.5444 99.5475 65.8012 99.5941C66.058 99.6406 66.3229 99.6092 66.5617 99.5038H66.625C66.8591 99.4035 67.0588 99.2368 67.1995 99.0244C67.3402 98.812 67.4156 98.5632 67.4167 98.3084V98.1738C67.4167 97.7539 67.5835 97.3512 67.8804 97.0542C68.1773 96.7573 68.5801 96.5905 69 96.5905C69.4199 96.5905 69.8226 96.7573 70.1196 97.0542C70.4165 97.3512 70.5833 97.7539 70.5833 98.1738V98.2451C70.5843 98.4998 70.6598 98.7487 70.8005 98.9611C70.9411 99.1735 71.1408 99.3401 71.375 99.4405C71.6138 99.5459 71.8786 99.5773 72.1355 99.5307C72.3923 99.4842 72.6292 99.3618 72.8158 99.1792L72.8633 99.1317C73.0104 98.9845 73.185 98.8677 73.3772 98.7881C73.5694 98.7084 73.7755 98.6674 73.9835 98.6674C74.1916 98.6674 74.3976 98.7084 74.5899 98.7881C74.7821 98.8677 74.9567 98.9845 75.1037 99.1317C75.251 99.2788 75.3677 99.4534 75.4474 99.6456C75.5271 99.8378 75.5681 100.044 75.5681 100.252C75.5681 100.46 75.5271 100.666 75.4474 100.858C75.3677 101.05 75.251 101.225 75.1037 101.372L75.0562 101.42C74.8737 101.606 74.7513 101.843 74.7047 102.1C74.6582 102.357 74.6896 102.622 74.795 102.86V102.924C74.8953 103.158 75.062 103.358 75.2744 103.498C75.4868 103.639 75.7357 103.714 75.9904 103.715H76.125C76.5449 103.715 76.9476 103.882 77.2446 104.179C77.5415 104.476 77.7083 104.879 77.7083 105.299C77.7083 105.719 77.5415 106.121 77.2446 106.418C76.9476 106.715 76.5449 106.882 76.125 106.882H76.0537C75.799 106.883 75.5501 106.959 75.3377 107.099C75.1253 107.24 74.9587 107.44 74.8583 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <g transform="translate(0, -105)" className={willExtractTeeth.includes(1) ? 'wed-number' : undefined}>
            <path d="M25.2903 163H18.7502V161.289H20.8162V156.111H18.7502V154.512C19.066 154.512 19.3687 154.495 19.6582 154.46C19.9477 154.42 20.1889 154.354 20.3819 154.262C20.61 154.153 20.7811 154.01 20.8951 153.835C21.0092 153.659 21.075 153.44 21.0925 153.177H23.2703V161.289H25.2903V163Z" fill="#434343" />
          </g>
          {isToothSelected(1) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(1)}
              <g clipPath="url(#clip15_0_1)" transform="translate(0, 20)" display="none">
                <path d="M22 107.674C23.3117 107.674 24.375 106.611 24.375 105.299C24.375 103.987 23.3117 102.924 22 102.924C20.6883 102.924 19.625 103.987 19.625 105.299C19.625 106.611 20.6883 107.674 22 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M27.8583 107.674C27.7529 107.913 27.7215 108.177 27.7681 108.434C27.8146 108.691 27.9371 108.928 28.1196 109.115L28.1671 109.162C28.3143 109.309 28.4311 109.484 28.5108 109.676C28.5904 109.868 28.6314 110.074 28.6314 110.282C28.6314 110.49 28.5904 110.696 28.5108 110.889C28.4311 111.081 28.3143 111.256 28.1671 111.403C28.02 111.55 27.8454 111.667 27.6532 111.746C27.461 111.826 27.2549 111.867 27.0469 111.867C26.8388 111.867 26.6328 111.826 26.4405 111.746C26.2483 111.667 26.0737 111.55 25.9267 111.403L25.8792 111.355C25.6926 111.173 25.4556 111.05 25.1988 111.004C24.942 110.957 24.6771 110.988 24.4383 111.094C24.2042 111.194 24.0045 111.361 23.8638 111.573C23.7232 111.786 23.6477 112.034 23.6467 112.289V112.424C23.6467 112.844 23.4798 113.246 23.1829 113.543C22.886 113.84 22.4832 114.007 22.0633 114.007C21.6434 114.007 21.2407 113.84 20.9437 113.543C20.6468 113.246 20.48 112.844 20.48 112.424V112.353C20.4739 112.091 20.389 111.836 20.2366 111.623C20.0841 111.41 19.871 111.248 19.625 111.157C19.3862 111.052 19.1213 111.02 18.8645 111.067C18.6077 111.113 18.3707 111.236 18.1842 111.418L18.1367 111.466C17.9896 111.613 17.815 111.73 17.6228 111.81C17.4306 111.889 17.2245 111.93 17.0164 111.93C16.8084 111.93 16.6023 111.889 16.4101 111.81C16.2179 111.73 16.0433 111.613 15.8962 111.466C15.749 111.319 15.6322 111.144 15.5526 110.952C15.4729 110.76 15.4319 110.554 15.4319 110.346C15.4319 110.138 15.4729 109.932 15.5526 109.739C15.6322 109.547 15.749 109.373 15.8962 109.225L15.9437 109.178C16.1262 108.991 16.2487 108.754 16.2952 108.498C16.3418 108.241 16.3104 107.976 16.205 107.737C16.1046 107.503 15.938 107.303 15.7256 107.163C15.5132 107.022 15.2643 106.947 15.0096 106.945H14.875C14.4551 106.945 14.0523 106.779 13.7554 106.482C13.4585 106.185 13.2917 105.782 13.2917 105.362C13.2917 104.942 13.4585 104.54 13.7554 104.243C14.0523 103.946 14.4551 103.779 14.875 103.779H14.9462C15.2083 103.773 15.4624 103.688 15.6756 103.535C15.8888 103.383 16.0512 103.17 16.1417 102.924C16.247 102.685 16.2785 102.42 16.2319 102.163C16.1853 101.907 16.0629 101.67 15.8804 101.483L15.8329 101.435C15.6857 101.288 15.5689 101.114 15.4892 100.922C15.4095 100.729 15.3685 100.523 15.3685 100.315C15.3685 100.107 15.4095 99.9012 15.4892 99.709C15.5689 99.5167 15.6857 99.3421 15.8329 99.1951C15.98 99.0479 16.1546 98.9311 16.3468 98.8514C16.539 98.7717 16.745 98.7307 16.9531 98.7307C17.1612 98.7307 17.3672 98.7717 17.5594 98.8514C17.7517 98.9311 17.9263 99.0479 18.0733 99.1951L18.1208 99.2426C18.3074 99.4251 18.5444 99.5475 18.8012 99.5941C19.058 99.6406 19.3229 99.6092 19.5617 99.5038H19.625C19.8591 99.4035 20.0588 99.2368 20.1995 99.0244C20.3402 98.812 20.4156 98.5632 20.4167 98.3084V98.1738C20.4167 97.7539 20.5835 97.3512 20.8804 97.0542C21.1773 96.7573 21.5801 96.5905 22 96.5905C22.4199 96.5905 22.8226 96.7573 23.1196 97.0542C23.4165 97.3512 23.5833 97.7539 23.5833 98.1738V98.2451C23.5843 98.4998 23.6598 98.7487 23.8005 98.9611C23.9411 99.1735 24.1408 99.3401 24.375 99.4405C24.6138 99.5459 24.8786 99.5773 25.1355 99.5307C25.3923 99.4842 25.6292 99.3618 25.8158 99.1792L25.8633 99.1317C26.0104 98.9845 26.185 98.8677 26.3772 98.7881C26.5694 98.7084 26.7755 98.6674 26.9835 98.6674C27.1916 98.6674 27.3976 98.7084 27.5899 98.7881C27.7821 98.8677 27.9567 98.9845 28.1037 99.1317C28.251 99.2788 28.3677 99.4534 28.4474 99.6456C28.5271 99.8378 28.5681 100.044 28.5681 100.252C28.5681 100.46 28.5271 100.666 28.4474 100.858C28.3677 101.05 28.251 101.225 28.1037 101.372L28.0562 101.42C27.8737 101.606 27.7513 101.843 27.7047 102.1C27.6582 102.357 27.6896 102.622 27.795 102.86V102.924C27.8953 103.158 28.062 103.358 28.2744 103.498C28.4868 103.639 28.7357 103.714 28.9904 103.715H29.125C29.5449 103.715 29.9476 103.882 30.2446 104.179C30.5415 104.476 30.7083 104.879 30.7083 105.299C30.7083 105.719 30.5415 106.121 30.2446 106.418C29.9476 106.715 29.5449 106.882 29.125 106.882H29.0537C28.799 106.883 28.5501 106.959 28.3377 107.099C28.1253 107.24 27.9587 107.44 27.8583 107.674Z" stroke="#7F7F7F" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
          <defs>
            <pattern id="pattern0_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-16.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern1_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-15.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern2_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-14.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern3_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-13.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern4_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-12.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern5_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-11.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern6_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-10.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern7_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-9.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern8_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-8.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern9_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-7.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern10_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-6.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern11_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-5.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern12_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-4.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern13_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-3.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern14_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-2.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <pattern id="pattern15_0_1" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href="/images/teeth/maxillary/tooth-1.png?v=4" width="1" height="1" preserveAspectRatio="none" />
            </pattern>
            <clipPath id="clip0_0_1">
              <rect width="19" height="19" fill="white" transform="translate(663.5 95.7988)" />
            </clipPath>
            <clipPath id="clip1_0_1">
              <rect width="19" height="19" fill="white" transform="translate(616.5 95.7988)" />
            </clipPath>
            <clipPath id="clip2_0_1">
              <rect width="19" height="19" fill="white" transform="translate(564.5 95.7988)" />
            </clipPath>
            <clipPath id="clip3_0_1">
              <rect width="19" height="19" fill="white" transform="translate(518.5 95.7988)" />
            </clipPath>
            <clipPath id="clip4_0_1">
              <rect width="19" height="19" fill="white" transform="translate(481 95.7988)" />
            </clipPath>
            <clipPath id="clip5_0_1">
              <rect width="19" height="19" fill="white" transform="translate(442.5 95.7988)" />
            </clipPath>
            <clipPath id="clip6_0_1">
              <rect width="19" height="19" fill="white" transform="translate(404.5 95.7988)" />
            </clipPath>
            <clipPath id="clip7_0_1">
              <rect width="19" height="19" fill="white" transform="translate(362 95.7988)" />
            </clipPath>
            <clipPath id="clip8_0_1">
              <rect width="19" height="19" fill="white" transform="translate(313 95.7988)" />
            </clipPath>
            <clipPath id="clip9_0_1">
              <rect width="19" height="19" fill="white" transform="translate(270.5 95.7988)" />
            </clipPath>
            <clipPath id="clip10_0_1">
              <rect width="19" height="19" fill="white" transform="translate(232.5 95.7988)" />
            </clipPath>
            <clipPath id="clip11_0_1">
              <rect width="19" height="19" fill="white" transform="translate(194 95.7988)" />
            </clipPath>
            <clipPath id="clip12_0_1">
              <rect width="19" height="19" fill="white" transform="translate(157 95.7988)" />
            </clipPath>
            <clipPath id="clip13_0_1">
              <rect width="19" height="19" fill="white" transform="translate(111.5 95.7988)" />
            </clipPath>
            <clipPath id="clip14_0_1">
              <rect width="19" height="19" fill="white" transform="translate(59.5 95.7988)" />
            </clipPath>
            <clipPath id="clip15_0_1">
              <rect width="19" height="19" fill="white" transform="translate(12.5 95.7988)" />
            </clipPath>
          </defs>

          {/* Show gear icon and orange circle on hover (for all teeth, rendered on top) */}
          {hoveredTooth !== null && !disabled && !isToothSelected(hoveredTooth) && !hideSelectionIndicators && (
            <>
              {renderSelectionIndicator(hoveredTooth)}
              {/* setting icon hidden per request — flip `false` to re-enable */}
              {false && renderGearIcon(hoveredTooth)}
            </>
          )}
          {/* Splint diamonds between adjacent selected teeth (rendered on top) */}
          {renderSplintDiamonds()}
          {/* Wing retainer icons on empty neighbors of pontics (rendered on top) */}
          {renderWings()}
        </svg>
      </div>
      {hoveredTooth !== null && !disabled && toothHoverTooltip && mousePos && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 36, zIndex: 9999, pointerEvents: 'none' }}
          className="bg-white/90 backdrop-blur-sm text-gray-900 border border-gray-200 text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap"
        >
          {toothHoverTooltip}
        </div>,
        document.body
      )}
      {splintEnabled && hoveredSplintLink !== null && !disabled && mousePos && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 36, zIndex: 9999, pointerEvents: 'none' }}
          className="bg-white/90 backdrop-blur-sm text-gray-900 border border-gray-200 text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap"
        >
          {splintedLinks.includes(hoveredSplintLink)
            ? `Unsplint ${hoveredSplintLink}–${hoveredSplintLink + 1}`
            : `Splint ${hoveredSplintLink}–${hoveredSplintLink + 1}`}
        </div>,
        document.body
      )}
    </>
  )
}
