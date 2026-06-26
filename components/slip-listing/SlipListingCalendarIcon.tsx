import { cn } from "@/lib/utils"
import {
  SLIP_LISTING_ICON_BASE_CLASS,
  SLIP_LISTING_ICON_HOVER_CLASS,
} from "@/components/slip-listing/slip-listing-icon-hover"

export const SLIP_LISTING_CALENDAR_ICON_SRC = "/icons/slip-listing/calendar.png"

type SlipListingCalendarIconProps = {
  className?: string
  /** Set false for filter triggers that are not inside a `group` button. */
  hover?: boolean
}

/** Colorful calendar glyph used on slip listing filters, due-date actions, and change-date modal. */
export function SlipListingCalendarIcon({
  className,
  hover = true,
}: SlipListingCalendarIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled PNG asset
    <img
      src={SLIP_LISTING_CALENDAR_ICON_SRC}
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
