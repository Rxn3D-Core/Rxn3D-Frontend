import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TONE_CLASSES = {
  rush: "border-transparent bg-red-600 text-white hover:bg-red-700",
  "in-progress":
    "border-green-200 bg-green-100 text-green-800 hover:border-green-300 hover:bg-green-200",
  "on-hold":
    "border-yellow-200 bg-yellow-100 text-yellow-800 hover:border-yellow-300 hover:bg-yellow-200",
  cancelled:
    "border-gray-200 bg-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-200",
  deleted:
    "border-gray-300 bg-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-300",
  draft:
    "border-gray-200 bg-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-200",
  finished:
    "border-blue-200 bg-blue-100 text-blue-800 hover:border-blue-300 hover:bg-blue-200",
  overdue:
    "border-red-200 bg-red-100 text-red-700 hover:border-red-300 hover:bg-red-200",
} as const

export type SlipListingStatusBadgeTone = keyof typeof TONE_CLASSES

type SlipListingStatusBadgeProps = {
  tone: SlipListingStatusBadgeTone
  children: ReactNode
  size?: "compact" | "comfortable"
  className?: string
}

/** Status pill for slip listings — uses `variant="outline"` so default Badge hover does not clash with custom colors. */
export function SlipListingStatusBadge({
  tone,
  children,
  size = "compact",
  className,
}: SlipListingStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "!rounded-md border font-medium whitespace-nowrap transition-colors",
        size === "compact" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </Badge>
  )
}
