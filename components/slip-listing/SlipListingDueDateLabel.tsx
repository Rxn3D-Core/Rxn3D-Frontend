import { cn } from "@/lib/utils"
import {
  formatSlipListingDueDate,
  formatSlipListingDueDateCompact,
  type SlipListingDueDateTone,
} from "@/lib/slip-listing-due-date"

const TONE_TEXT_CLASSES: Record<SlipListingDueDateTone, string> = {
  overdue: "text-red-600",
  today: "text-green-600",
  upcoming: "text-[#1162A8]",
  empty: "text-gray-400",
}

type SlipListingDueDateLabelProps = {
  dueDate: string
  /** "compact" renders "7d · 06/24"; "full" (default) renders "7 days to 06/24". */
  variant?: "full" | "compact"
  className?: string
}

export function SlipListingDueDateLabel({ dueDate, variant = "full", className }: SlipListingDueDateLabelProps) {
  const { label, tone } =
    variant === "compact"
      ? formatSlipListingDueDateCompact(dueDate)
      : formatSlipListingDueDate(dueDate)

  return (
    <span className={cn("text-base font-normal whitespace-nowrap", TONE_TEXT_CLASSES[tone], className)}>
      {label}
    </span>
  )
}
