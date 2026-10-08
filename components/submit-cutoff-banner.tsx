"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import {
  DEFAULT_DISPLAY_TIMEZONE,
  formatClockTo12HourDisplay,
  parseClockParts,
} from "@/utils/time-utils"

/** Show the cutoff warning banner only inside this many minutes before cut-off. */
export const CUTOFF_WARNING_WINDOW_MINUTES = 10
/** Lab cut-off is always evaluated in Las Vegas / Los Angeles Pacific time. */
const CUTOFF_TIMEZONE = "America/Los_Angeles"

function getPacificClockParts(date: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CUTOFF_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date)

  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  // Intl can return "24" for midnight in some environments
  return { hours: hours === 24 ? 0 : hours, minutes }
}

export function resolveUpcomingCutoff(
  times: Array<string | null | undefined>,
  now: Date = new Date()
): { minutesLeft: number; label: string } | null {
  const pacificNow = getPacificClockParts(now)
  const nowMinutes = pacificNow.hours * 60 + pacificNow.minutes

  const inWindow = times
    .map((raw) => {
      const parts = parseClockParts(raw)
      if (!parts) return null
      const minutesLeft = parts.hours * 60 + parts.minutes - nowMinutes
      if (minutesLeft <= 0 || minutesLeft > CUTOFF_WARNING_WINDOW_MINUTES) return null
      return {
        minutesLeft,
        label: formatClockTo12HourDisplay(parts.hours, parts.minutes),
      }
    })
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => a.minutesLeft - b.minutesLeft)

  return inWindow[0] ?? null
}

/** True when now is within 10 minutes before any provided cut-off (Pacific). */
export function useIsWithinCutoffWarningWindow(
  cutoffTime?: string | null,
  cutoffTime2?: string | null
): boolean {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  return resolveUpcomingCutoff([cutoffTime, cutoffTime2], now) != null
}

interface SubmitCutoffBannerProps {
  /**
   * Lab cut-off clock (`case_schedule.default_pickup_time`: `HH:mm[:ss]`, ISO, or
   * `h:mm AM/PM`), Pacific Time. Banner shows only when within 10 minutes before
   * this cut-off; otherwise nothing is rendered.
   */
  cutoffTime?: string | null
  /** Optional second cut-off (same formats). Banner uses the nearest upcoming one. */
  cutoffTime2?: string | null
  /** Compact layout for the slip header. */
  compact?: boolean
}

export function SubmitCutoffBanner({
  cutoffTime,
  cutoffTime2,
  compact = false,
}: SubmitCutoffBannerProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  const upcoming = resolveUpcomingCutoff([cutoffTime, cutoffTime2], now)
  if (!upcoming) return null

  const className = compact
    ? "flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 max-w-[320px]"
    : "flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"

  return (
    <div role="alert" className={className}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
      <span>
        Please submit 10 mins before cut-off time (
        <strong>{upcoming.label}</strong> {DEFAULT_DISPLAY_TIMEZONE}) so we can keep the due
        date. You have <strong>{upcoming.minutesLeft} min</strong> left.
      </span>
    </div>
  )
}
