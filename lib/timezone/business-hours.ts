/**
 * Another organisation's weekly hours shown in the viewer's zone (RXN-123 S1, rule 4).
 * Hours are owner clock values; each one is converted on the next date of that weekday in the
 * owner's zone, so DST weeks that differ between zones stay right. When the converted time falls
 * on another day, the label names that day ("Sun 5:00 PM").
 */

import { formatClockTo12HourDisplay, parseClockParts } from "@/utils/time-utils"
import { convertClock, normalizeTimeZone, todayInZone } from "./index"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

/** Next date (today included) of a weekday name such as "Monday", on the owner's calendar. */
export function nextDateOfWeekday(dayName: string, ownerTz: string, now: Date = new Date()): string | null {
  const target = WEEKDAYS.findIndex((d) => d.toLowerCase() === String(dayName).trim().toLowerCase())
  if (target < 0) return null
  const today = todayInZone(ownerTz, now)
  return addDays(today, (target - weekdayOf(today) + 7) % 7)
}

/**
 * One owner clock value (`09:00 am`, `09:00`, ...) on a weekday, as the viewer's clock label.
 * Returns the owner's own label when no conversion is needed or possible.
 */
export function convertWeeklyClock(
  dayName: string,
  clock: string,
  ownerTz: string,
  viewerTz: string,
  now: Date = new Date(),
): string {
  const parts = parseClockParts(clock)
  if (!parts) return clock
  const ownLabel = formatClockTo12HourDisplay(parts.hours, parts.minutes)
  const owner = normalizeTimeZone(ownerTz)
  const viewer = normalizeTimeZone(viewerTz)
  if (owner === viewer) return ownLabel
  const ymd = nextDateOfWeekday(dayName, owner, now)
  if (!ymd) return ownLabel
  const hhmm = `${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}`
  const converted = convertClock(hhmm, owner, viewer, ymd)
  if (!converted) return ownLabel
  const [h, m] = converted.time.split(":").map(Number)
  const label = formatClockTo12HourDisplay(h, m)
  return converted.date === ymd ? label : `${SHORT[weekdayOf(converted.date)]} ${label}`
}

/** "9:00 AM – 5:00 PM" on the owner's clock, or converted to the viewer's zone. */
export function weeklyHoursRange(
  dayName: string,
  start: string,
  end: string,
  ownerTz: string,
  viewerTz: string,
  now: Date = new Date(),
): string {
  return `${convertWeeklyClock(dayName, start, ownerTz, viewerTz, now)} – ${convertWeeklyClock(dayName, end, ownerTz, viewerTz, now)}`
}
