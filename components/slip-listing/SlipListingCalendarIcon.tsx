export const SLIP_LISTING_CALENDAR_ICON_SRC = "/icons/slip-listing/calendar.png"

type SlipListingCalendarIconProps = {
  className?: string
}

/** Colorful calendar glyph used on slip listing filters, due-date actions, and change-date modal. */
export function SlipListingCalendarIcon({ className = "h-4 w-4" }: SlipListingCalendarIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled PNG asset
    <img
      src={SLIP_LISTING_CALENDAR_ICON_SRC}
      alt=""
      aria-hidden
      className={`object-contain flex-shrink-0 ${className}`}
    />
  )
}
