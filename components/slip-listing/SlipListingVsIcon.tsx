import { cn } from "@/lib/utils"
import {
  SLIP_LISTING_ICON_BASE_CLASS,
  SLIP_LISTING_ICON_HOVER_CLASS,
} from "@/components/slip-listing/slip-listing-icon-hover"

type SlipListingVsIconProps = {
  src: string
  className?: string
  hover?: boolean
}

/**
 * Virtual-slip icon glyph for listing rows (22×22, 30×30 on hover).
 * Use inside a `group` button for hover scale.
 */
export function SlipListingVsIcon({
  src,
  className,
  hover = true,
}: SlipListingVsIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled SVG/PNG glyphs
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn(
        SLIP_LISTING_ICON_BASE_CLASS,
        hover && SLIP_LISTING_ICON_HOVER_CLASS,
        className
      )}
    />
  )
}
