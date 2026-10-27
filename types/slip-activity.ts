/** Slip Activity Monitor API types (contract: RXN-7, `/api/v1/slip-activity`). */

export interface SlipActivityStatus {
  id: number
  name: string
  sequence: number
}

export interface SlipActivityStatusRef {
  id: number
  name: string
}

export interface SlipActivityEvent {
  id: number
  /** ISO 8601 with offset. */
  action_at: string
  slip: { id: number; slip_number: string; case_id: number | null }
  /** Backend RXN-8 (f961d879). Treated as possibly null/blank defensively. */
  patient_name: string | null
  /** Ordering office; null when the case has none. */
  office: SlipActivityStatusRef | null
  from_status: SlipActivityStatusRef
  to_status: SlipActivityStatusRef
  actor: { id: number; name: string } | null
}

export interface SlipActivityPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number | null
  to: number | null
}

export type SlipActivityMatch = "either" | "from" | "to"

export interface SlipActivityStatusesResponse {
  success: boolean
  message: string
  data: SlipActivityStatus[]
}

export interface SlipActivityEventsResponse {
  success: boolean
  message: string
  data: SlipActivityEvent[]
  pagination: SlipActivityPagination
  filters: {
    from: string
    to: string
    location_ids: number[]
    match: SlipActivityMatch
  }
}

/** `sort` values accepted by the events and export endpoints (contract: RXN-13). */
export type SlipActivitySortColumn =
  | "action_at"
  | "slip_number"
  | "patient_name"
  | "office_name"
  | "status"
  | "user_name"

export type SlipActivitySortDirection = "asc" | "desc"

export interface SlipActivitySort {
  sort: SlipActivitySortColumn
  direction: SlipActivitySortDirection
}

/** UI filter state. Dates are local calendar days (`YYYY-MM-DD`). Sort is not kept in the URL. */
export interface SlipActivityFilters extends SlipActivitySort {
  fromDate: string
  toDate: string
  locationIds: number[]
  page: number
  perPage: number
}

export type SlipActivityExportFormat = "csv" | "xlsx"
