import { clearSessionStorage } from "@/lib/clear-session-storage"
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
  user_name?: string
  direct_permissions: string[]
  role_permissions: string[]
  all_permissions: string[]
  roles: string[]
}

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/** GET /users/permissions/available */
export async function fetchAvailablePermissions(): Promise<AvailablePermissionsPayload> {
  const response = await fetch(ensureAbsoluteUrl("/users/permissions/available"), {
    method: "GET",
    headers: getBearerHeaders(),
  })
  const result = await parseJsonResponse<unknown>(response)
  return normalizeAvailablePermissions(result)
}

/** GET /users/{userId}/permissions */
export async function fetchUserPermissionDetail(userId: number): Promise<UserPermissionDetail> {
  const response = await fetch(ensureAbsoluteUrl(`/users/${userId}/permissions`), {
    method: "GET",
    headers: getBearerHeaders(),
  })
  const result = await parseJsonResponse<UserPermissionDetail | { data: UserPermissionDetail }>(response)
  const data = unwrapData(result)
  return {
    user_id: data.user_id ?? userId,
    user_name: data.user_name,
    direct_permissions: data.direct_permissions ?? [],
    role_permissions: data.role_permissions ?? [],
    all_permissions: data.all_permissions ?? [],
    roles: data.roles ?? [],
  }
}

/** PUT /users/{userId}/permissions — replaces direct permissions only */
export async function updateUserDirectPermissions(
  userId: number,
  permissions: string[],
): Promise<UserPermissionDetail> {
  const response = await fetch(ensureAbsoluteUrl(`/users/${userId}/permissions`), {
    method: "PUT",
    headers: getBearerHeaders(),
    body: JSON.stringify({ permissions }),
  })
  const result = await parseJsonResponse<{ data?: Partial<UserPermissionDetail> }>(response)
  const data = result.data ?? {}
  return fetchUserPermissionDetail(userId)
}

/** Load current role permissions, compute direct extras, and PUT (including clearing all direct grants). */
export async function persistUserDirectPermissions(
  userId: number,
  selected: string[],
): Promise<UserPermissionDetail> {
  const detail = await fetchUserPermissionDetail(userId)
  const direct = computeDirectPermissionsToSave(selected, detail.role_permissions ?? [])
  return updateUserDirectPermissions(userId, direct)
}
