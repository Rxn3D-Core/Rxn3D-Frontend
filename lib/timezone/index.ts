/**
 * Per-lab and per-office time zones (RXN-123).
 *
 * Every lab and office has an IANA zone (`customers.timezone`). Instants are shown in the
 * viewer's zone (the selected profile), never the device's. A backend that does not send
 * `timezone` yet means America/Los_Angeles, which is what every customer starts on.
 */

export const DEFAULT_TIME_ZONE = "America/Los_Angeles"

/** Curated choices for the profile dropdown. The backend accepts any valid IANA name. */
export const TIME_ZONE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "America/Los_Angeles", label: "Pacific Time (Las Vegas / Los Angeles)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Phoenix", label: "Mountain Time, no DST (Phoenix)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (Puerto Rico)" },
  { value: "America/Toronto", label: "Eastern Time (Toronto)" },
  { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
  { value: "America/Mexico_City", label: "Central Time (Mexico City)" },
  { value: "Europe/London", label: "UK Time (London)" },
  { value: "Europe/Paris", label: "Central European Time (Paris)" },
  { value: "Europe/Berlin", label: "Central European Time (Berlin)" },
  { value: "Asia/Dubai", label: "Gulf Time (Dubai)" },
  { value: "Asia/Kolkata", label: "India Time (Kolkata)" },
  { value: "Asia/Singapore", label: "Singapore Time" },
  { value: "Asia/Shanghai", label: "China Time (Shanghai)" },
  { value: "Asia/Tokyo", label: "Japan Time (Tokyo)" },
  { value: "Australia/Sydney", label: "Eastern Australia Time (Sydney)" },
]

const IANA_NAME_RE = /^[A-Za-z][A-Za-z_]*(\/[A-Za-z0-9_+-]+)*$/
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const CLOCK_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
const DAY_MS = 86_400_000

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    formatterCache.set(tz, f)
  }
  return f
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** True for a valid IANA zone name such as `America/New_York` (not offsets or abbreviations). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !IANA_NAME_RE.test(tz)) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** The zone, or America/Los_Angeles when it is missing or invalid. */
export function normalizeTimeZone(tz?: string | null): string {
  const v = typeof tz === "string" ? tz.trim() : ""
  return isValidTimeZone(v) ? v : DEFAULT_TIME_ZONE
}

type ViewerUser = {
  customers?: Array<{ id: number; timezone?: string | null }>
  customer_id?: number
  customer?: { id: number; timezone?: string | null }
} | null | undefined

/**
 * The viewer's zone: the selected profile's `timezone` from the login `customers[]`.
 * Falls back to America/Los_Angeles (old backend, superadmin without a profile).
 */
export function resolveViewerTimeZone(user: ViewerUser, selectedCustomerId?: number | string | null): string {
  const customers = Array.isArray(user?.customers) ? user!.customers! : []
  const id = selectedCustomerId != null && selectedCustomerId !== "" ? Number(selectedCustomerId) : NaN
  const selected =
    (Number.isFinite(id) ? customers.find((c) => Number(c.id) === id) : undefined) ??
    (user?.customer_id != null ? customers.find((c) => Number(c.id) === Number(user.customer_id)) : undefined) ??
    (customers.length === 1 ? customers[0] : undefined)
  return normalizeTimeZone(selected?.timezone ?? user?.customer?.timezone)
}

interface WallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function wallTimeAt(instant: number, tz: string): WallTime {
  const parts = partsFormatter(tz).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") }
}

/** Zone offset in minutes (e.g. -300 for -05:00) at a UTC instant. */
export function offsetMinutesAt(instant: number, tz: string): number {
  const w = wallTimeAt(instant, tz)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000)
}

function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMin)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

function parseDay(ymd: string): { year: number; month: number; day: number } | null {
  const m = DAY_RE.exec(ymd)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return { year, month, day }
}

function parseClock(hhmm: string): { hour: number; minute: number; second: number } | null {
  const m = CLOCK_RE.exec(String(hhmm).trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  const second = m[3] ? Number(m[3]) : 0
  if (hour > 23 || minute > 59 || second > 59) return null
  return { hour, minute, second }
}

/** Short zone name at an instant, e.g. `EST`, `PDT`, or `GMT+8` where no abbreviation exists. */
export function zoneAbbreviation(tz: string, date: Date = new Date()): string {
  const zone = normalizeTimeZone(tz)
  const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")
  return part?.value ?? ""
}

/** Human label for a zone, e.g. "Eastern Time (New York)"; the IANA name for zones outside the list. */
export function timeZoneLabel(tz?: string | null): string {
  const zone = normalizeTimeZone(tz)
  const option = TIME_ZONE_OPTIONS.find((o) => o.value === zone)
  if (option) return option.label
  return zone.replace(/_/g, " ")
}

/** Today's calendar day (`YYYY-MM-DD`) in the zone. */
export function todayInZone(tz: string, now: Date = new Date()): string {
  const w = wallTimeAt(now.getTime(), normalizeTimeZone(tz))
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`
}

/**
 * A wall-clock value (`YYYY-MM-DD` + `HH:mm[:ss]`) in a zone, as ISO 8601 with that zone's
 * offset, e.g. `2026-11-27T15:00:00-05:00`. Null when invalid.
 * DST gap (time that does not exist): moves forward by the gap, as PHP/Carbon does.
 * DST overlap (time that happens twice): the first, earlier occurrence.
 */
export function clockToInstant(ymd: string, hhmm: string, tz: string): string | null {
  const day = parseDay(ymd)
  const clock = parseClock(hhmm)
  if (!day || !clock) return null
  const zone = normalizeTimeZone(tz)
  const wallAsUtc = Date.UTC(day.year, day.month - 1, day.day, clock.hour, clock.minute, clock.second)
  const before = offsetMinutesAt(wallAsUtc - DAY_MS, zone)
  const after = offsetMinutesAt(wallAsUtc + DAY_MS, zone)
  const valid = [...new Set([before, after])]
    .map((offset) => ({ offset, instant: wallAsUtc - offset * 60_000 }))
    .filter(({ offset, instant }) => offsetMinutesAt(instant, zone) === offset)
    .sort((a, b) => a.instant - b.instant)
  // Gap: no offset maps back to this wall time; keep the offset from before the change.
  const instant = valid.length ? valid[0].instant : wallAsUtc - before * 60_000
  const offset = offsetMinutesAt(instant, zone)
  const w = wallTimeAt(instant, zone)
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}${formatOffset(offset)}`
}

/**
 * Converts a time-only setting of another organisation (e.g. a cut-off) to another zone,
 * on the given day in the owner's zone. Returns the day and `HH:mm` in the target zone.
 */
export function convertClock(
  hhmm: string,
  fromTz: string,
  toTz: string,
  ymdInFromTz: string,
): { date: string; time: string } | null {
  const iso = clockToInstant(ymdInFromTz, hhmm, fromTz)
  if (!iso) return null
  const w = wallTimeAt(new Date(iso).getTime(), normalizeTimeZone(toTz))
  return { date: `${w.year}-${pad(w.month)}-${pad(w.day)}`, time: `${pad(w.hour)}:${pad(w.minute)}` }
}

export type InstantStyle = "datetime" | "date" | "time"

/**
 * An instant (ISO 8601 with offset) shown in a zone, e.g. `Nov 25, 2026, 11:00 AM EST`.
 * Date-only strings (`YYYY-MM-DD`) are never shifted: they are returned formatted as that day.
 */
export function formatInstant(
  iso: string | null | undefined,
  tz: string,
  style: InstantStyle = "datetime",
  locale = "en-US",
): string {
  if (!iso) return ""
  const zone = normalizeTimeZone(tz)
  const day = parseDay(iso)
  if (day) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
      new Date(Date.UTC(day.year, day.month - 1, day.day)),
    )
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const options: Intl.DateTimeFormatOptions =
    style === "date"
      ? { dateStyle: "medium", timeZone: zone }
      : style === "time"
        ? { hour: "numeric", minute: "2-digit", timeZone: zone }
        : { dateStyle: "medium", timeStyle: "short", timeZone: zone }
  const text = new Intl.DateTimeFormat(locale, options).format(date)
  return style === "date" ? text : `${text} ${zoneAbbreviation(zone, date)}`.trim()
}
