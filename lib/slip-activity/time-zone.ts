/**
 * Slip Activity Monitor time zone (RXN-9): all dates and times are shown and filtered
 * in the server's zone, never the browser's. Matches the backend export header
 * "Date/time (America/Los_Angeles)".
 */

export const SLIP_ACTIVITY_TIME_ZONE = "America/Los_Angeles"

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

interface WallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SLIP_ACTIVITY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

const abbreviationFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SLIP_ACTIVITY_TIME_ZONE,
  timeZoneName: "short",
})

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function wallTimeAt(instant: number): WallTime {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(partsFormatter.formatToParts(instant).find((p) => p.type === type)?.value)
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") }
}

/** Zone offset in minutes (e.g. -420 for -07:00) at a UTC instant. */
function offsetMinutesAt(instant: number): number {
  const w = wallTimeAt(instant)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000)
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

/** Today's calendar day (`YYYY-MM-DD`) in the slip activity zone. */
export function slipActivityToday(now: Date = new Date()): string {
  const w = wallTimeAt(now.getTime())
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`
}

/**
 * Start (00:00:00) or end (23:59:59) of a calendar day in the slip activity zone,
 * as ISO 8601 with that day's offset, e.g. `2026-10-01T00:00:00-07:00`. Null if invalid.
 */
export function slipActivityDayBoundary(day: string, edge: "start" | "end"): string | null {
  const parsed = parseCalendarDay(day)
  if (!parsed) return null
  const [hour, minute, second] = edge === "start" ? [0, 0, 0] : [23, 59, 59]
  const wallAsUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day, hour, minute, second)
  // Resolve the offset at the actual instant; a second pass handles days where the offset changes.
  let offset = offsetMinutesAt(wallAsUtc - offsetMinutesAt(wallAsUtc) * 60_000)
  offset = offsetMinutesAt(wallAsUtc - offset * 60_000)
  return `${day}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(offset)}`
}

/** Zone abbreviation (PDT or PST) at a given instant. */
export function slipActivityZoneAbbreviation(date: Date): string {
  return abbreviationFormatter.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? ""
}

/** Date and time in the slip activity zone with its abbreviation, e.g. `Oct 27, 2026, 8:14 AM PDT`. */
export function formatSlipActivityDateTime(iso: string, locale?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: SLIP_ACTIVITY_TIME_ZONE,
  })
  return `${formatter.format(date)} ${slipActivityZoneAbbreviation(date)}`.trim()
}
