/**
 * Attach active lab/office profile (`customer_id`) to API URLs so backend permission middleware
 * resolves the correct profile. See docs/permissions/README.md
 */

import { isLabCustomerContext, normalizeRoleSlug } from "@/lib/role-utils"

const LAB_LIBRARY_ROLES = new Set(["lab_admin", "lab_user", "lab_driver"])

/** True for lab_admin, lab_user, and lab_driver (any lab staff role). */
export function isLabLibraryRole(role?: string | null): boolean {
  return LAB_LIBRARY_ROLES.has(normalizeRoleSlug(role))
}

export function userHasLabLibraryRole(
  user?: { roles?: string[]; role?: string } | null,
): boolean {
  if (!user) return false
  const roles = user.roles?.length ? user.roles : user.role ? [user.role] : []
  return roles.some((role) => isLabLibraryRole(role))
}

export function getActiveCustomerId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("customerId")
}

/**
 * Active profile customer id for slip listing and other profile-scoped APIs.
 * Uses the switched profile in localStorage (`customerId`), not selected lab id.
 * For lab-owned product/library APIs only, use `resolveLibraryCustomerId` instead.
 */
export function resolveListingCustomerId(): number | null {
  if (typeof window === "undefined") return null

  try {
    const fromStorage = getActiveCustomerId()
    if (fromStorage) {
      const parsed = Number(fromStorage)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }

    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null
    const id =
      user?.customer_id ??
      user?.customer?.id ??
      user?.customers?.[0]?.id

    return typeof id === "number" && id > 0 ? id : null
  } catch {
    return null
  }
}

/**
 * Customer id for product / library APIs.
 * Lab staff (lab_admin, lab_user, lab_driver) and lab customer context use the active
 * profile `customerId` — without this, lab_user requests omit customer_id and return
 * global/superadmin catalog data.
 */
export function resolveLibraryCustomerId(
  user?: {
    roles?: string[]
    role?: string
    customers?: Array<{ id: number }>
    customer_id?: number
    customer?: { id: number }
  } | null,
): number | null {
  if (typeof window === "undefined") return null

  const storedRole = localStorage.getItem("role")
  const roles = [
    ...(user?.roles ?? []),
    ...(user?.role ? [user.role] : []),
    ...(storedRole ? [storedRole] : []),
  ]
  const isSuperAdmin = roles.some((role) => normalizeRoleSlug(role) === "superadmin")
  const isLabStaff =
    roles.some((role) => isLabLibraryRole(role)) || isLabCustomerContext()

  if (isLabStaff || isSuperAdmin) {
    const fromStorage = getActiveCustomerId()
    if (fromStorage) {
      const parsed = Number(fromStorage)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }

    const fromUser =
      user?.customer_id ??
      user?.customer?.id ??
      user?.customers?.find((customer) => customer.id)?.id
    if (typeof fromUser === "number" && fromUser > 0) return fromUser

    return resolveListingCustomerId()
  }

  const selectedLabId = localStorage.getItem("selectedLabId")
  if (selectedLabId) {
    const parsed = Number(selectedLabId)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
}

/** Active profile customer id for permission-scoped API calls. */
export function resolveApiCustomerId(customerId?: string | number | null): string | null {
  if (customerId != null && customerId !== "") {
    return String(customerId)
  }
  return getActiveCustomerId()
}

export function appendCustomerIdQuery(
  endpoint: string,
  customerId?: string | number | null,
): string {
  if (endpoint.includes("customer_id=")) return endpoint

  const id =
    customerId != null && customerId !== ""
      ? String(customerId)
      : getActiveCustomerId()

  if (!id) return endpoint

  const separator = endpoint.includes("?") ? "&" : "?"
  return `${endpoint}${separator}customer_id=${encodeURIComponent(id)}`
}
