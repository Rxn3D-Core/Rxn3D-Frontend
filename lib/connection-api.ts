import type { Connection, ConnectionsResponse } from "@/contexts/connection-context"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface ConnectionsPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number | null
  to: number | null
}

export interface ConnectionsQueryParams {
  userId?: number
  page?: number
  perPage?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

/** Active lab/office customer id from localStorage (matches set-customer-id / profile switch). */
export function getActiveCustomerId(): number | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("customerId")
  if (stored) {
    const parsed = Number(stored)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }

  try {
    const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
    const id = selectedLocation?.id
    if (id != null && Number(id) > 0) return Number(id)
  } catch {
    // ignore malformed selectedLocation
  }

  return null
}

export function buildConnectionsUrl(params: ConnectionsQueryParams = {}): string {
  const query = new URLSearchParams()
  const customerId = getActiveCustomerId()

  if (customerId) {
    query.append("customer_id", customerId.toString())
  }
  if (params.userId) {
    query.append("user_id", params.userId.toString())
  }
  if (params.page) {
    query.append("page", params.page.toString())
  }
  if (params.perPage) {
    query.append("per_page", params.perPage.toString())
  }
  if (params.search?.trim()) {
    query.append("search", params.search.trim())
  }
  if (params.sortBy) {
    query.append("sort_by", params.sortBy)
  }
  if (params.sortOrder) {
    query.append("sort_order", params.sortOrder)
  }

  const qs = query.toString()
  return `${API_BASE_URL}/connections${qs ? `?${qs}` : ""}`
}

export async function fetchConnectionsApi(
  params: ConnectionsQueryParams = {},
): Promise<ConnectionsResponse> {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No authentication token found")
  }

  const response = await fetch(buildConnectionsUrl(params), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (response.status === 401) {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.status}`)
  }

  return response.json()
}

export const DEFAULT_CONNECTIONS_PER_PAGE = 50
export const DASHBOARD_CONNECTIONS_PER_PAGE = 10
