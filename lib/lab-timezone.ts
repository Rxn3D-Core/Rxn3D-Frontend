import { DEFAULT_TIME_ZONE, timeZoneCity, zoneAbbreviation } from "@/lib/timezone/index"

// The lab calendar shows times in the lab's own zone (RXN-123). Callers pass the selected lab's
// zone (`useViewerTimeZone()`); without one it is Pacific time, as before. Labels already saved
// inside event data are kept as they are.
export const LAB_TIME_ZONE = DEFAULT_TIME_ZONE

/** "PST" or "PDT" (or "EST", "EDT", ...), whichever applies on the given date. */
export function labTimezoneAbbreviation(date: Date = new Date(), timeZone: string = LAB_TIME_ZONE): string {
  return zoneAbbreviation(timeZone, date) || "PT"
}

/** For example "PST · Los Angeles / Las Vegas" or "EST · New York". */
export function labTimezoneLabel(date: Date = new Date(), timeZone: string = LAB_TIME_ZONE): string {
  return `${labTimezoneAbbreviation(date, timeZone)} · ${timeZoneCity(timeZone)}`
}

/** Label for a calendar day given as "YYYY-MM-DD"; falls back to today if the date is missing or invalid. */
export function labTimezoneLabelForDay(isoDate?: string, timeZone: string = LAB_TIME_ZONE): string {
  const date = isoDate ? new Date(`${isoDate.slice(0, 10)}T12:00:00Z`) : new Date()
  return labTimezoneLabel(Number.isNaN(date.getTime()) ? new Date() : date, timeZone)
}
