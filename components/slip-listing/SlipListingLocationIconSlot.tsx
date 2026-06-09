import type { ReactNode } from "react"

/** Fixed-width slot so location column labels align across varying icon widths. */
export function SlipListingLocationIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 w-6 flex-shrink-0 items-center justify-center [&_img]:max-h-5 [&_img]:max-w-full [&_img]:object-contain [&_svg]:max-h-5 [&_svg]:max-w-full">
      {children}
    </span>
  )
}
