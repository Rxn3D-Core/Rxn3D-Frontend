import Link from "next/link"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { cn } from "@/lib/utils"
import { SlipListingVsIcon } from "@/components/slip-listing/SlipListingVsIcon"
import { slipListingIconButtonClass } from "@/components/slip-listing/slip-listing-icon-hover"

export const SLIP_LISTING_VIEW_VIRTUAL_SLIP_ICON =
  "/icons/slip-listing/view-virtual-slip.svg"

type SlipListingViewSlipLinkProps = {
  slipId: number
  className?: string
}

export function SlipListingViewSlipLink({
  slipId,
  className,
}: SlipListingViewSlipLinkProps) {
  return (
    <Link
      href={buildVirtualSlipV2Path(slipId)}
      className={cn(
        slipListingIconButtonClass(
          "inline-flex h-[30px] w-[30px] items-center justify-center p-0"
        ),
        className
      )}
      title="View virtual slip"
      aria-label="View virtual slip"
      onClick={(e) => e.stopPropagation()}
    >
      <SlipListingVsIcon src={SLIP_LISTING_VIEW_VIRTUAL_SLIP_ICON} />
    </Link>
  )
}
