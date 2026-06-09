import { buildApiUrl } from "@/lib/api/client"

export interface SuperadminLabCustomer {
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

export interface SuperadminLabCustomerProfile extends SuperadminLabCustomer {
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

export interface SearchLabCustomersOptions {
  q?: string
  status?: "Active" | "Inactive"
  per_page?: number
  order_by?: "created_at" | "name"
  sort_by?: "asc" | "desc"
  page?: number
}

export interface SearchLabCustomersResponse {
  data: SuperadminLabCustomer[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

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

export async function searchSuperadminLabCustomers(
  options: SearchLabCustomersOptions = {}
): Promise<SearchLabCustomersResponse> {
  const params = new URLSearchParams({
    type: "lab",
    per_page: String(options.per_page ?? 8),
    order_by: options.order_by ?? "name",
    sort_by: options.sort_by ?? "asc",
    page: String(options.page ?? 1),
  })

  if (options.q?.trim()) params.append("q", options.q.trim())
  if (options.status) params.append("status", options.status)

  const payload = await fetchJson<{
    data?: SuperadminLabCustomer[]
    pagination?: SearchLabCustomersResponse["pagination"]
  }>(`/customers/search?${params.toString()}`)

  return {
    data: payload.data ?? [],
    pagination: payload.pagination ?? {
      total: 0,
      per_page: options.per_page ?? 8,
      current_page: options.page ?? 1,
      last_page: 1,
    },
  }
}

export async function getSuperadminLabCustomerProfile(
  customerId: number
): Promise<SuperadminLabCustomerProfile | null> {
  const payload = await fetchJson<{ data?: SuperadminLabCustomerProfile }>(`/customers/${customerId}`)
  return payload.data ?? null
}
