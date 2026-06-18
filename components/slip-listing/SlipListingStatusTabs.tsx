import { cn } from "@/lib/utils"

/** Tab label → API `status` filter value. "All" clears the status filter. */
const STATUS_TABS = [
  { label: "In Progress", value: "On process" },
  { label: "On Hold", value: "On hold" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Done", value: "Finished" },
] as const

/** Friendly display labels for raw API `status` values (used by the status dropdown). */
const STATUS_DISPLAY_LABELS: Record<string, string> = {
  "On process": "In Progress",
  "On hold": "On Hold",
  cancelled: "Cancelled",
  Finished: "Done",
}

/** Map a raw API status to its friendly label, falling back to the raw value. */
export function slipListingStatusLabel(apiStatus: string): string {
  return STATUS_DISPLAY_LABELS[apiStatus] ?? apiStatus
}

type SlipListingStatusTabsProps = {
  /** Current API `status` value ("All" when no status filter is active). */
  value: string
  /** Receives the API `status` value, or "All" when the active tab is toggled off. */
  onChange: (apiStatus: string) => void
  className?: string
}

export function SlipListingStatusTabs({ value, onChange, className }: SlipListingStatusTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="tablist">
      {STATUS_TABS.map((tab) => {
        const active = value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(active ? "All" : tab.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-[#1162A8] bg-[#1162A8] text-white"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
