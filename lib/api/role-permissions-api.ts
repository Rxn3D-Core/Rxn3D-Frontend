import { clearSessionStorage } from "@/lib/clear-session-storage"
import { appendCustomerIdQuery } from "@/lib/customer-scope"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

function ensureAbsoluteUrl(url: string): string {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not configured")
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = url.startsWith("/") ? url : `/${url}`
  return `${baseUrl}${path}`
}

function getBearerHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      clearSessionStorage()
      window.location.href = "/login"
    }
    throw new Error("Unauthorized")
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && String((body as { message: string }).message)) ||
      `HTTP error! status: ${response.status}`
    throw new Error(message)
  }

  return body as T
}

export type BackendPermission = {
  id: number
  name: string
}

export type BackendRole = {
  id: number
  name: string
  guard_name?: string
  permissions?: BackendPermission[]
}

export type CustomerRoleTemplate = {
  id: number
  name: string
  permissions: string[]
  is_customized: boolean
}

export type CustomerRolePermissionsList = {
  customer_id: number
  roles: CustomerRoleTemplate[]
}

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/** GET /customers/{customerId}/role-permissions */
export async function fetchCustomerRolePermissions(
  customerId: number | string,
): Promise<CustomerRolePermissionsList> {
  const response = await fetch(
    ensureAbsoluteUrl(`/customers/${customerId}/role-permissions`),
    {
      method: "GET",
      headers: getBearerHeaders(),
    },
  )
  const result = await parseJsonResponse<CustomerRolePermissionsList | { data: CustomerRolePermissionsList }>(
    response,
  )
  const data = unwrapData(result)
  return {
    customer_id: data.customer_id ?? Number(customerId),
    roles: data.roles ?? [],
  }
}

/** GET /customers/{customerId}/roles/{roleId}/permissions */
export async function fetchCustomerRolePermissionDetail(
  customerId: number | string,
  roleId: number,
): Promise<CustomerRoleTemplate> {
  const response = await fetch(
    ensureAbsoluteUrl(`/customers/${customerId}/roles/${roleId}/permissions`),
    {
      method: "GET",
      headers: getBearerHeaders(),
    },
  )
  const result = await parseJsonResponse<CustomerRoleTemplate | { data: CustomerRoleTemplate }>(response)
  return unwrapData(result)
}

/** PUT /customers/{customerId}/roles/{roleId}/permissions */
export async function updateCustomerRolePermissions(
  customerId: number | string,
  roleId: number,
  permissions: string[],
): Promise<CustomerRoleTemplate> {
  const response = await fetch(
    ensureAbsoluteUrl(`/customers/${customerId}/roles/${roleId}/permissions`),
    {
      method: "PUT",
      headers: getBearerHeaders(),
      body: JSON.stringify({ permissions }),
    },
  )
  const result = await parseJsonResponse<CustomerRoleTemplate | { data: CustomerRoleTemplate }>(response)
  return unwrapData(result)
}

/** GET /role-permissions/roles — superadmin only (global defaults) */
export async function fetchBackendRoles(): Promise<BackendRole[]> {
  const response = await fetch(ensureAbsoluteUrl("/role-permissions/roles"), {
    method: "GET",
    headers: getBearerHeaders(),
  })
  const result = await parseJsonResponse<BackendRole[] | { data: BackendRole[] }>(response)
  if (Array.isArray(result)) return result
  return result.data ?? []
}

/** PUT /role-permissions/roles/{id} — superadmin global role bundle */
export async function updateBackendRolePermissions(
  roleId: number,
  permissions: string[],
): Promise<BackendRole> {
  const response = await fetch(ensureAbsoluteUrl(`/role-permissions/roles/${roleId}`), {
    method: "PUT",
    headers: getBearerHeaders(),
    body: JSON.stringify({ permissions }),
  })
  return parseJsonResponse<BackendRole>(response)
}
