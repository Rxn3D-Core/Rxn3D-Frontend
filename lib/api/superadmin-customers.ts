import { buildApiUrl } from "@/lib/api/client"

/** Registered lab or office customer returned by `GET /customers/search`. */
export interface SuperadminCustomer {
  id: number
  name: string
  website: string | null
  address: string
  logo_url: string | null
  city: string
  postal_code: string
  email: string
  type: string
  status: string
  unique_code: string
  created_at: string
  updated_at: string
}

/** @deprecated Prefer `SuperadminCustomer` — kept for existing lab-billing callers. */
export type SuperadminLabCustomer = SuperadminCustomer

export interface SuperadminCustomerProfile extends SuperadminCustomer {
  state?: {
    id: number
    name: string
  }
  country?: {
    id: number
    name: string
  }
  default_admin?: {
    id?: number
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    work_number?: string
    status?: string
  } | null
  users?: Array<{
    id?: number
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    status?: string
    role?: {
      id?: number
      name?: string
    }
  }>
}

/** @deprecated Prefer `SuperadminCustomerProfile`. */
export type SuperadminLabCustomerProfile = SuperadminCustomerProfile

export type SuperadminCustomerType = "lab" | "office"

export interface SearchSuperadminCustomersOptions {
  q?: string
  status?: "Active" | "Inactive"
  per_page?: number
  order_by?: "created_at" | "name"
  sort_by?: "asc" | "desc"
  page?: number
}

/** @deprecated Prefer `SearchSuperadminCustomersOptions`. */
export type SearchLabCustomersOptions = SearchSuperadminCustomersOptions

export interface SearchSuperadminCustomersResponse {
  data: SuperadminCustomer[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/** @deprecated Prefer `SearchSuperadminCustomersResponse`. */
export type SearchLabCustomersResponse = SearchSuperadminCustomersResponse

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }

  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Search registered customers by type via `GET /customers/search`.
 * Superadmin dashboard uses separate calls for `office` and `lab`.
 */
export async function searchSuperadminCustomers(
  type: SuperadminCustomerType,
  options: SearchSuperadminCustomersOptions = {}
): Promise<SearchSuperadminCustomersResponse> {
  const params = new URLSearchParams({
    type,
    per_page: String(options.per_page ?? 100),
    order_by: options.order_by ?? "name",
    sort_by: options.sort_by ?? "asc",
    page: String(options.page ?? 1),
  })

  if (options.q?.trim()) params.append("q", options.q.trim())
  if (options.status) params.append("status", options.status)

  const payload = await fetchJson<{
    data?: SuperadminCustomer[]
    pagination?: SearchSuperadminCustomersResponse["pagination"]
  }>(`/customers/search?${params.toString()}`)

  return {
    data: payload.data ?? [],
    pagination: payload.pagination ?? {
      total: 0,
      per_page: options.per_page ?? 100,
      current_page: options.page ?? 1,
      last_page: 1,
    },
  }
}

/** Registered offices (practices) for the superadmin dashboard. */
export async function searchSuperadminOfficeCustomers(
  options: SearchSuperadminCustomersOptions = {}
): Promise<SearchSuperadminCustomersResponse> {
  return searchSuperadminCustomers("office", options)
}

/** Registered labs for the superadmin dashboard and lab switcher. */
export async function searchSuperadminLabCustomers(
  options: SearchSuperadminCustomersOptions = {}
): Promise<SearchSuperadminCustomersResponse> {
  return searchSuperadminCustomers("lab", options)
}

export async function getSuperadminLabCustomerProfile(
  customerId: number
): Promise<SuperadminCustomerProfile | null> {
  const payload = await fetchJson<{ data?: SuperadminCustomerProfile }>(`/customers/${customerId}`)
  return payload.data ?? null
}
