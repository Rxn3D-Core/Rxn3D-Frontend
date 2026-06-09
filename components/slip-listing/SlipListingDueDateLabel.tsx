import { cn } from "@/lib/utils"
import {
  formatSlipListingDueDate,
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
  className?: string
}

export function SlipListingDueDateLabel({ dueDate, className }: SlipListingDueDateLabelProps) {
  const { label, tone } = formatSlipListingDueDate(dueDate)

  return (
    <span className={cn("text-base font-normal whitespace-nowrap", TONE_TEXT_CLASSES[tone], className)}>
      {label}
    </span>
  )
}
