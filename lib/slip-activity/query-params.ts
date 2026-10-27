/**
 * Slip Activity Monitor: UI filters -> API query strings (contract: RXN-7).
 * Dates in the UI are local calendar days (`YYYY-MM-DD`); the API takes ISO 8601
 * datetimes with offset, both bounds inclusive.
 */

import type {
  SlipActivityExportFormat,
  SlipActivityFilters,
} from "@/types/slip-activity"

export const SLIP_ACTIVITY_DEFAULT_PER_PAGE = 25
export const SLIP_ACTIVITY_DEFAULT_RANGE_DAYS = 30
/** Backend refuses `to - from` over 366 days; stay one day inside that. */
export const SLIP_ACTIVITY_MAX_RANGE_DAYS = 365

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function parseLocalDay(day: string): Date | null {
  const m = DAY_RE.exec(day)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  // Reject overflow such as 2026-02-31.
  if (date.getFullYear() !== Number(m[1]) || date.getMonth() !== Number(m[2]) - 1 || date.getDate() !== Number(m[3])) {
    return null
  }
  return date
}

/** `YYYY-MM-DD` for a Date in local time. */
export function toLocalDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** ISO 8601 with the local offset, e.g. `2026-10-01T00:00:00-07:00`. */
export function toIsoWithOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMin)
  return (
    `${toLocalDay(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/** Start (00:00:00) or end (23:59:59) of a local day as ISO with offset; null if the day is invalid. */
export function localDayBoundary(day: string, edge: "start" | "end"): string | null {
  const date = parseLocalDay(day)
  if (!date) return null
  if (edge === "end") date.setHours(23, 59, 59, 0)
  return toIsoWithOffset(date)
}

export function defaultSlipActivityFilters(now: Date = new Date()): SlipActivityFilters {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - SLIP_ACTIVITY_DEFAULT_RANGE_DAYS)
  return {
    fromDate: toLocalDay(from),
    toDate: toLocalDay(now),
    locationIds: [],
    page: 1,
    perPage: SLIP_ACTIVITY_DEFAULT_PER_PAGE,
  }
}

export type SlipActivityRangeError = "invalidDate" | "fromAfterTo" | "rangeTooLong"

export function validateSlipActivityRange(fromDate: string, toDate: string): SlipActivityRangeError | null {
  const from = parseLocalDay(fromDate)
  const to = parseLocalDay(toDate)
  if (!from || !to) return "invalidDate"
  if (from.getTime() > to.getTime()) return "fromAfterTo"
  // Calendar-day difference, safe across DST changes.
  const days = Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
    Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86_400_000)
  if (days > SLIP_ACTIVITY_MAX_RANGE_DAYS) return "rangeTooLong"
  return null
}

function appendFilterParams(params: URLSearchParams, filters: SlipActivityFilters): void {
  const from = localDayBoundary(filters.fromDate, "start")
  const to = localDayBoundary(filters.toDate, "end")
  if (from) params.append("from", from)
  if (to) params.append("to", to)
  const ids = [...new Set(filters.locationIds)].sort((a, b) => a - b)
  for (const id of ids) params.append("location_ids[]", String(id))
  // A row matches when its from- OR to-status is selected (user decision, RXN-7).
  if (ids.length) params.append("match", "either")
}

/** Query string (no leading `?`) for `GET /v1/slip-activity/events`. */
export function buildSlipActivityEventsQuery(filters: SlipActivityFilters): string {
  const params = new URLSearchParams()
  appendFilterParams(params, filters)
  params.append("page", String(filters.page))
  params.append("per_page", String(filters.perPage))
  return params.toString()
}

/** Query string (no leading `?`) for `GET /v1/slip-activity/events/export`. */
export function buildSlipActivityExportQuery(
  filters: SlipActivityFilters,
  format: SlipActivityExportFormat,
  tz?: string | null,
): string {
  const params = new URLSearchParams()
  appendFilterParams(params, filters)
  params.append("format", format)
  if (tz) params.append("tz", tz)
  return params.toString()
}

/** The browser cannot read `Content-Disposition` cross-origin, so the file is named here. */
export function slipActivityExportFilename(
  filters: Pick<SlipActivityFilters, "fromDate" | "toDate">,
  format: SlipActivityExportFormat,
): string {
  return `slip-activity_${filters.fromDate}_${filters.toDate}.${format}`
}
