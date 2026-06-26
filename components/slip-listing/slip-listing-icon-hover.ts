import { cn } from "@/lib/utils"

export const SLIP_LISTING_ICON_SIZE_PX = 22
export const SLIP_LISTING_ICON_HOVER_SIZE_PX = 30

/** Default listing icon box — 22×22. */
export const SLIP_LISTING_ICON_SIZE_CLASS = "h-[22px] w-[22px]"

/** Grows to 30×30 on hover — pair with `group` on the parent button. */
export const SLIP_LISTING_ICON_HOVER_CLASS =
  "transition-transform duration-150 ease-out group-hover:scale-[calc(30/22)]"

export const SLIP_LISTING_ICON_BASE_CLASS = cn(
  SLIP_LISTING_ICON_SIZE_CLASS,
  "object-contain flex-shrink-0"
)

/** Clickable slip-listing icon control (location, attachment, due date). */
export function slipListingIconButtonClass(...extra: (string | undefined)[]) {
  return cn(
    "group flex items-center justify-center overflow-visible rounded p-0.5 transition-colors hover:bg-gray-100",
    ...extra
  )
}

/** Icon button in the actions column — sized for 30×30 hover. */
export function slipListingActionIconButtonClass(...extra: (string | undefined)[]) {
  return cn(
    "group flex h-[30px] w-[30px] items-center justify-center overflow-visible p-0 hover:bg-gray-100",
    ...extra
  )
}
