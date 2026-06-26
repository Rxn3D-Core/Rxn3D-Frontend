import { cn } from "@/lib/utils"
import {
  SLIP_LISTING_ICON_BASE_CLASS,
  SLIP_LISTING_ICON_HOVER_CLASS,
} from "@/components/slip-listing/slip-listing-icon-hover"

export const SLIP_LISTING_READY_TO_SEND_ICON_SRC = "/icons/slip-listing/ready-to-send.png"

type SlipListingReadyToSendIconProps = {
  className?: string
  hover?: boolean
}

/** Colorful ready-to-send glyph for slip listing, virtual slip footer, and modal. */
export function SlipListingReadyToSendIcon({
  className,
  hover = true,
}: SlipListingReadyToSendIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled PNG asset
    <img
      src={SLIP_LISTING_READY_TO_SEND_ICON_SRC}
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
