import { cn } from "@/lib/utils"

type SlipListingRowClassOptions = {
  selected: boolean
  rush?: boolean
}

/** Full-row background for slip listing tables (rush highlight, selection, hover). */
export function slipListingRowClassName({ selected, rush }: SlipListingRowClassOptions): string {
  return cn(
    "group relative transition-all duration-150",
    selected
      ? "bg-blue-50 border-l-4 border-blue-500"
      : rush
        ? "bg-orange-50 hover:bg-orange-100"
        : "hover:bg-gray-50",
  )
}
