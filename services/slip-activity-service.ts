/**
 * Slip Activity Monitor API (contract: RXN-7, `/api/v1/slip-activity`).
 *
 * Uses a small fetch wrapper instead of `ApiService.request` because the page must tell a
 * 403 (access denied state) apart from other errors, and `ApiService` drops the HTTP status.
 * Same token, same `customer_id` scoping and same 401 handling as `ApiService`.
 */

import { clearSessionStorage } from "@/lib/clear-session-storage"
import { appendCustomerIdQuery } from "@/lib/customer-scope"
import {
  buildSlipActivityEventsQuery,
  buildSlipActivityExportQuery,
} from "@/lib/slip-activity/query-params"
import type {
  SlipActivityEventsResponse,
  SlipActivityExportFormat,
  SlipActivityFilters,
  SlipActivityStatusesResponse,
} from "@/types/slip-activity"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
// NEXT_PUBLIC_API_BASE_URL already ends in /v1 (see .env.example), so no /v1 here.
const BASE = "/slip-activity"

export class SlipActivityApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "SlipActivityApiError"
    this.status = status
  }
}

export function isSlipActivityForbidden(error: unknown): boolean {
  return error instanceof SlipActivityApiError && error.status === 403
}

async function slipActivityFetch(endpoint: string): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const response = await fetch(`${API_BASE_URL}${appendCustomerIdQuery(endpoint)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (response.status === 401) {
    // lib/fetch-interceptor.ts already tried a refresh; same hard failure as ApiService.
    clearSessionStorage()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new SlipActivityApiError("Unauthorized - Redirecting to login", 401)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new SlipActivityApiError(body?.message || `HTTP error! status: ${response.status}`, response.status)
  }

  return response
}

export async function fetchSlipActivityStatuses(): Promise<SlipActivityStatusesResponse> {
  const response = await slipActivityFetch(`${BASE}/statuses`)
  return response.json()
}

export async function fetchSlipActivityEvents(filters: SlipActivityFilters): Promise<SlipActivityEventsResponse> {
  const response = await slipActivityFetch(`${BASE}/events?${buildSlipActivityEventsQuery(filters)}`)
  return response.json()
}

/** All rows matching the filters as a file (CSV or XLSX). */
export async function fetchSlipActivityExport(
  filters: SlipActivityFilters,
  format: SlipActivityExportFormat,
): Promise<Blob> {
  const response = await slipActivityFetch(`${BASE}/events/export?${buildSlipActivityExportQuery(filters, format)}`)
  return response.blob()
}
