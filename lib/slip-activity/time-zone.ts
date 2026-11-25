/**
 * Slip Activity Monitor time zone (RXN-9, RXN-123): dates and times are shown and filtered in the
 * lab's zone (the viewer's selected lab profile), never the browser's. Every function takes the
 * zone as its last argument and defaults to America/Los_Angeles, the zone of every lab until it
 * chooses another one.
 */

import { DEFAULT_TIME_ZONE, normalizeTimeZone, offsetMinutesAt, todayInZone, zoneAbbreviation } from "@/lib/timezone/index"

/** Default zone; the page passes the lab's zone from `useViewerTimeZone()`. */
export const SLIP_ACTIVITY_TIME_ZONE = DEFAULT_TIME_ZONE

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMin)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

/** Parses `YYYY-MM-DD` as a calendar day (no zone involved); null if invalid. */
export function parseCalendarDay(day: string): { year: number; month: number; day: number } | null {
  const m = DAY_RE.exec(day)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const d = Number(m[3])
  const date = new Date(Date.UTC(year, month - 1, d))
  // Reject overflow such as 2026-02-31.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== d) return null
  return { year, month, day: d }
}

/** Today's calendar day (`YYYY-MM-DD`) in the lab's zone. */
export function slipActivityToday(now: Date = new Date(), timeZone: string = SLIP_ACTIVITY_TIME_ZONE): string {
  return todayInZone(timeZone, now)
}

/**
 * Start (00:00:00) or end (23:59:59) of a calendar day in the lab's zone, as ISO 8601 with that
 * day's offset, e.g. `2026-10-01T00:00:00-07:00`. Null if invalid.
 */
export function slipActivityDayBoundary(
  day: string,
  edge: "start" | "end",
  timeZone: string = SLIP_ACTIVITY_TIME_ZONE,
): string | null {
  const parsed = parseCalendarDay(day)
  if (!parsed) return null
  const tz = normalizeTimeZone(timeZone)
  const [hour, minute, second] = edge === "start" ? [0, 0, 0] : [23, 59, 59]
  const wallAsUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day, hour, minute, second)
  // Resolve the offset at the actual instant; a second pass handles days where the offset changes.
  let offset = offsetMinutesAt(wallAsUtc - offsetMinutesAt(wallAsUtc, tz) * 60_000, tz)
  offset = offsetMinutesAt(wallAsUtc - offset * 60_000, tz)
  return `${day}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(offset)}`
}

/** Zone abbreviation (e.g. PDT, PST, EST) at a given instant. */
export function slipActivityZoneAbbreviation(date: Date, timeZone: string = SLIP_ACTIVITY_TIME_ZONE): string {
  return zoneAbbreviation(timeZone, date)
}

/** Date and time in the lab's zone with its abbreviation, e.g. `Oct 27, 2026, 8:14 AM PDT`. */
export function formatSlipActivityDateTime(
  iso: string,
  locale?: string,
  timeZone: string = SLIP_ACTIVITY_TIME_ZONE,
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const tz = normalizeTimeZone(timeZone)
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tz,
  })
  return `${formatter.format(date)} ${slipActivityZoneAbbreviation(date, tz)}`.trim()
}

/** Compact form for the table, e.g. "09/03/26, 9:24 AM" (lab zone, US order). The full form stays in the tooltip. */
export function formatSlipActivityCompactDateTime(iso: string, timeZone: string = SLIP_ACTIVITY_TIME_ZONE): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: normalizeTimeZone(timeZone),
  }).format(date)
}
