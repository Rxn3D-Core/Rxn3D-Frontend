// The lab calendar shows times in Pacific time. This is a fixed label for now;
// it is not read from the lab's settings.
export const LAB_TIME_ZONE = "America/Los_Angeles"

/** "PST" or "PDT", whichever applies on the given date. */
export function labTimezoneAbbreviation(date: Date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: LAB_TIME_ZONE, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")
  return part?.value ?? "PT"
}

/** For example "PST · Los Angeles / Las Vegas". */
export function labTimezoneLabel(date: Date = new Date()): string {
  return `${labTimezoneAbbreviation(date)} · Los Angeles / Las Vegas`
}

/** Label for a calendar day given as "YYYY-MM-DD"; falls back to today if the date is missing or invalid. */
export function labTimezoneLabelForDay(isoDate?: string): string {
  const date = isoDate ? new Date(`${isoDate.slice(0, 10)}T12:00:00`) : new Date()
  return labTimezoneLabel(Number.isNaN(date.getTime()) ? new Date() : date)
}
