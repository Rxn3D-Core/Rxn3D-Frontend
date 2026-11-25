"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { CUTOFF_WARNING_WINDOW_MINUTES, resolveUpcomingCutoff } from "@/lib/timezone/cutoff"
import { useViewerTimeZone } from "@/lib/timezone/use-viewer-time-zone"

export { CUTOFF_WARNING_WINDOW_MINUTES, resolveUpcomingCutoff }

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  return now
}

/** True when now is within 10 minutes before any provided cut-off, on the lab's clock (RXN-123). */
export function useIsWithinCutoffWarningWindow(
  cutoffTime?: string | null,
  cutoffTime2?: string | null,
  labTimeZone?: string | null
): boolean {
  const now = useNow()
  return resolveUpcomingCutoff([cutoffTime, cutoffTime2], now, labTimeZone ?? undefined) != null
}

interface SubmitCutoffBannerProps {
  /**
   * Lab cut-off clock (`case_schedule.default_pickup_time` or `effective_pickup_cutoff_time`:
   * `HH:mm[:ss]`, ISO, or `h:mm AM/PM`) in the lab's zone. Banner shows only when within
   * 10 minutes before this cut-off; otherwise nothing is rendered.
   */
  cutoffTime?: string | null
  /** Optional second cut-off (same formats). Banner uses the nearest upcoming one. */
  cutoffTime2?: string | null
  /** The lab's IANA zone; missing means America/Los_Angeles. */
  labTimeZone?: string | null
  /** Compact layout for the slip header. */
  compact?: boolean
}

export function SubmitCutoffBanner({
  cutoffTime,
  cutoffTime2,
  labTimeZone,
  compact = false,
}: SubmitCutoffBannerProps) {
  const now = useNow()
  const viewerTimeZone = useViewerTimeZone()

  const upcoming = resolveUpcomingCutoff([cutoffTime, cutoffTime2], now, labTimeZone ?? undefined, viewerTimeZone)
  if (!upcoming) return null

  const className = compact
    ? "flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 max-w-[320px]"
    : "flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"

  return (
    <div role="alert" className={className} data-testid="submit-cutoff-banner">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
      <span>
        Please submit 10 mins before cut-off time (
        <strong data-testid="submit-cutoff-banner-time">
          {upcoming.label} {upcoming.zone}
        </strong>
        ) so we can keep the due date. You have <strong>{upcoming.minutesLeft} min</strong> left.
      </span>
    </div>
  )
}
