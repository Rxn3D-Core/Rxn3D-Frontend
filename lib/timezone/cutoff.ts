/**
 * Pickup cut-off warning (RXN-123 S2). The cut-off is a lab clock value: "now" is compared with it
 * in the lab's zone, and it is shown converted to the viewer's zone with the viewer's abbreviation
 * (a 3:00 PM New York cut-off shows as 12:00 PM PST to a Las Vegas office).
 */

import { formatClockTo12HourDisplay, parseClockParts } from "@/utils/time-utils"
import { DEFAULT_TIME_ZONE, convertClock, normalizeTimeZone, offsetMinutesAt, todayInZone, zoneAbbreviation } from "./index"

/** Show the cut-off warning banner only inside this many minutes before cut-off. */
export const CUTOFF_WARNING_WINDOW_MINUTES = 10

export type UpcomingCutoff = {
  minutesLeft: number
  /** Cut-off on the viewer's clock, e.g. "12:00 PM". */
  label: string
  /** Viewer zone abbreviation at that moment, e.g. "PST". */
  zone: string
  /** Cut-off on the lab's clock, e.g. "3:00 PM". */
  labLabel: string
  /** Lab zone abbreviation, e.g. "EST". */
  labZone: string
}

function clockMinutesInZone(now: Date, tz: string): number {
  const shifted = new Date(now.getTime() + offsetMinutesAt(now.getTime(), tz) * 60_000)
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
}

/**
 * The nearest cut-off that is at most 10 minutes away (and not passed) on the lab's clock.
 * Without zones it behaves as before: everything in America/Los_Angeles.
 */
export function resolveUpcomingCutoff(
  times: Array<string | null | undefined>,
  now: Date = new Date(),
  labTimeZone: string = DEFAULT_TIME_ZONE,
  viewerTimeZone: string = labTimeZone,
): UpcomingCutoff | null {
  const labTz = normalizeTimeZone(labTimeZone)
  const viewerTz = normalizeTimeZone(viewerTimeZone)
  const nowMinutes = clockMinutesInZone(now, labTz)
  const labToday = todayInZone(labTz, now)

  const inWindow = times
    .map((raw) => {
      const parts = parseClockParts(raw)
      if (!parts) return null
      const minutesLeft = parts.hours * 60 + parts.minutes - nowMinutes
      if (minutesLeft <= 0 || minutesLeft > CUTOFF_WARNING_WINDOW_MINUTES) return null
      const hhmm = `${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}`
      const viewer = convertClock(hhmm, labTz, viewerTz, labToday)
      const [vh, vm] = (viewer?.time ?? hhmm).split(":").map(Number)
      const at = new Date(now.getTime() + minutesLeft * 60_000)
      return {
        minutesLeft,
        label: formatClockTo12HourDisplay(vh, vm),
        zone: zoneAbbreviation(viewerTz, at),
        labLabel: formatClockTo12HourDisplay(parts.hours, parts.minutes),
        labZone: zoneAbbreviation(labTz, at),
      }
    })
    .filter((c): c is UpcomingCutoff => c != null)
    .sort((a, b) => a.minutesLeft - b.minutesLeft)

  return inWindow[0] ?? null
}
