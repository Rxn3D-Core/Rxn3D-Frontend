/**
 * Slip Activity Monitor: UI filters -> API query strings (contract: RXN-7).
 * Dates in the UI are calendar days (`YYYY-MM-DD`) in America/Los_Angeles, never the
 * browser's zone; the API takes ISO 8601 datetimes with offset, both bounds inclusive.
 */

import type {
  SlipActivityExportFormat,
  SlipActivityFilters,
} from "@/types/slip-activity"
import { SLIP_ACTIVITY_DEFAULT_SORT } from "./sort"
import { parseCalendarDay, slipActivityDayBoundary, slipActivityToday } from "./time-zone"

export const SLIP_ACTIVITY_DEFAULT_PER_PAGE = 25
export const SLIP_ACTIVITY_DEFAULT_RANGE_DAYS = 30
/** Backend refuses `to - from` over 366 days; stay one day inside that. */
export const SLIP_ACTIVITY_MAX_RANGE_DAYS = 365
/** Backend rule for `search` (RXN-12): trimmed string, at most 100 characters. */
export const SLIP_ACTIVITY_SEARCH_MAX_LENGTH = 100

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** Default range: the last 30 days up to today, both counted in America/Los_Angeles. */
export function defaultSlipActivityFilters(now: Date = new Date()): SlipActivityFilters {
  const toDate = slipActivityToday(now)
  const today = parseCalendarDay(toDate)!
  const from = new Date(Date.UTC(today.year, today.month - 1, today.day - SLIP_ACTIVITY_DEFAULT_RANGE_DAYS))
  return {
    fromDate: `${from.getUTCFullYear()}-${pad(from.getUTCMonth() + 1)}-${pad(from.getUTCDate())}`,
    toDate,
    locationIds: [],
    search: "",
    page: 1,
    perPage: SLIP_ACTIVITY_DEFAULT_PER_PAGE,
    ...SLIP_ACTIVITY_DEFAULT_SORT,
  }
}

/** Trim, cap at 100 characters, trim again (the cut may end on a space). Empty means "no search". */
export function normalizeSlipActivitySearch(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, SLIP_ACTIVITY_SEARCH_MAX_LENGTH).trim()
}

export type SlipActivityRangeError = "invalidDate" | "fromAfterTo" | "rangeTooLong"

export function validateSlipActivityRange(fromDate: string, toDate: string): SlipActivityRangeError | null {
  const from = parseCalendarDay(fromDate)
  const to = parseCalendarDay(toDate)
  if (!from || !to) return "invalidDate"
  // Calendar-day difference, independent of any zone or DST change.
  const days = Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000)
  if (days < 0) return "fromAfterTo"
  if (days > SLIP_ACTIVITY_MAX_RANGE_DAYS) return "rangeTooLong"
  return null
}

function appendFilterParams(params: URLSearchParams, filters: SlipActivityFilters): void {
  const from = slipActivityDayBoundary(filters.fromDate, "start")
  const to = slipActivityDayBoundary(filters.toDate, "end")
  if (from) params.append("from", from)
  if (to) params.append("to", to)
  const ids = [...new Set(filters.locationIds)].sort((a, b) => a - b)
  for (const id of ids) params.append("location_ids[]", String(id))
  // A row matches when its from- OR to-status is selected (user decision, RXN-7).
  if (ids.length) params.append("match", "either")
  // Matches slip number, patient, office and user name (RXN-12); omitted when empty.
  const search = normalizeSlipActivitySearch(filters.search)
  if (search) params.append("search", search)
  // Server-side sort across all pages (RXN-13); always sent so the export matches the table.
  params.append("sort", filters.sort)
  params.append("direction", filters.direction)
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
): string {
  const params = new URLSearchParams()
  appendFilterParams(params, filters)
  params.append("format", format)
  return params.toString()
}

/** The browser cannot read `Content-Disposition` cross-origin, so the file is named here. */
export function slipActivityExportFilename(
  filters: Pick<SlipActivityFilters, "fromDate" | "toDate">,
  format: SlipActivityExportFormat,
): string {
  return `slip-activity_${filters.fromDate}_${filters.toDate}.${format}`
}
