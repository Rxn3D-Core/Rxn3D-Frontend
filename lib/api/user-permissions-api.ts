import { clearSessionStorage } from "@/lib/clear-session-storage"
import { appendCustomerIdQuery, resolveApiCustomerId } from "@/lib/customer-scope"
import {
  computeDirectPermissionsToSave,
  normalizeAvailablePermissions,
  type AvailablePermissionsPayload,
} from "@/lib/permissions"

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

export type UserPermissionDetail = {
  user_id: number
  customer_id?: number
  user_name?: string
  direct_permissions: string[]
  override_permissions: string[]
  role_permissions: string[]
  all_permissions: string[]
  effective_permissions: string[]
  roles: string[]
}

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function normalizeUserPermissionDetail(
  data: Record<string, unknown>,
  userId: number,
): UserPermissionDetail {
  const override = Array.isArray(data.override_permissions)
    ? (data.override_permissions as string[])
    : Array.isArray(data.direct_permissions)
      ? (data.direct_permissions as string[])
      : []

  const effective = Array.isArray(data.effective_permissions)
    ? (data.effective_permissions as string[])
    : Array.isArray(data.all_permissions)
      ? (data.all_permissions as string[])
      : []

  return {
    user_id: typeof data.user_id === "number" ? data.user_id : userId,
    customer_id: typeof data.customer_id === "number" ? data.customer_id : undefined,
    user_name: typeof data.user_name === "string" ? data.user_name : undefined,
    direct_permissions: override,
    override_permissions: override,
    role_permissions: Array.isArray(data.role_permissions) ? (data.role_permissions as string[]) : [],
    all_permissions: effective,
    effective_permissions: effective,
    roles: Array.isArray(data.roles) ? (data.roles as string[]) : [],
  }
}

function requireCustomerId(customerId?: string | number | null): number {
  const resolved = resolveApiCustomerId(customerId)
  if (!resolved) {
    throw new Error("customer_id is required for this operation")
  }
  const parsed = Number(resolved)
  if (Number.isNaN(parsed)) {
    throw new Error("customer_id is invalid")
  }
  return parsed
}

/** GET /users/permissions/available?customer_id={labId} */
export async function fetchAvailablePermissions(
  customerId?: string | number | null,
): Promise<AvailablePermissionsPayload> {
  const scopedCustomerId = resolveApiCustomerId(customerId)
  const url = appendCustomerIdQuery("/users/permissions/available", scopedCustomerId)
  const response = await fetch(ensureAbsoluteUrl(url), {
    method: "GET",
    headers: getBearerHeaders(),
  })
  const result = await parseJsonResponse<unknown>(response)
  return normalizeAvailablePermissions(result)
}

/** GET /users/{userId}/permissions?customer_id={labId} */
export async function fetchUserPermissionDetail(
  userId: number,
  customerId?: string | number | null,
): Promise<UserPermissionDetail> {
  const scopedCustomerId = resolveApiCustomerId(customerId)
  const url = appendCustomerIdQuery(`/users/${userId}/permissions`, scopedCustomerId)
  const response = await fetch(ensureAbsoluteUrl(url), {
    method: "GET",
    headers: getBearerHeaders(),
  })
  const result = await parseJsonResponse<UserPermissionDetail | { data: UserPermissionDetail }>(response)
  const data = unwrapData(result) as Record<string, unknown>
  return normalizeUserPermissionDetail(data, userId)
}

/** PUT /users/{userId}/permissions — replaces override permissions for one lab */
export async function updateUserOverridePermissions(
  userId: number,
  permissions: string[],
  customerId?: string | number | null,
): Promise<UserPermissionDetail> {
  const cid = requireCustomerId(customerId)
  const response = await fetch(ensureAbsoluteUrl(`/users/${userId}/permissions`), {
    method: "PUT",
    headers: getBearerHeaders(),
    body: JSON.stringify({ customer_id: cid, permissions }),
  })
  await parseJsonResponse<unknown>(response)
  return fetchUserPermissionDetail(userId, cid)
}

/** @deprecated Use updateUserOverridePermissions */
export async function updateUserDirectPermissions(
  userId: number,
  permissions: string[],
  customerId?: string | number | null,
): Promise<UserPermissionDetail> {
  return updateUserOverridePermissions(userId, permissions, customerId)
}

/** Load role + override split, compute override extras, and PUT. */
export async function persistUserOverridePermissions(
  userId: number,
  selected: string[],
  customerId?: string | number | null,
): Promise<UserPermissionDetail> {
  const detail = await fetchUserPermissionDetail(userId, customerId)
  const overrides = computeDirectPermissionsToSave(selected, detail.role_permissions ?? [])
  return updateUserOverridePermissions(userId, overrides, customerId ?? detail.customer_id)
}

/**
 * Save user override permissions for one customer profile.
 * `overridePermissions` must be the override list only (not role template grants).
 */
export async function persistUserPermissions(
  userId: number,
  overridePermissions: string[],
  customerId?: string | number | null,
): Promise<UserPermissionDetail> {
  const cid = requireCustomerId(customerId)
  return updateUserOverridePermissions(userId, overridePermissions, cid)
}

/**
 * Save from create/edit modals where `selected` may be a full template or override list.
 * Computes override extras against role grants when needed.
 */
export async function persistUserDirectPermissions(
  userId: number,
  selected: string[],
  customerId?: string | number | null,
): Promise<UserPermissionDetail> {
  return persistUserOverridePermissions(userId, selected, customerId)
}
