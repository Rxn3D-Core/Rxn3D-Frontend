import type { ReactNode } from "react"

/** Fixed slot so location column labels align; allows 30×30 hover scale. */
export function SlipListingLocationIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center overflow-visible">
      {children}
    </span>
  )
}
