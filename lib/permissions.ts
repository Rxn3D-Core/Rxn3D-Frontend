/**
 * Profile-scoped permission helpers.
 * Permission names must match backend `PermissionCatalog` — see docs/permissions/README.md
 */

import {
  getActiveCustomerType,
  isLabCustomerContext,
  isOfficeCustomerContext,
} from "@/lib/role-utils"

export type PermissionsApiPayload =
  | string[]
  | {
      permissions?: string[]
      all_permissions?: string[]
      customer_permissions?: string[]
      data?: {
        permissions?: string[]
        all_permissions?: string[]
        customer_permissions?: string[]
        grouped?: Record<string, string[]>
        lab_role_bundle?: string[]
        lab_role_names?: string[]
        total_count?: number
      }
    }
  | null
  | undefined

export type AvailablePermissionsPayload = {
  permissions?: string[]
  grouped?: Record<string, string[]>
  lab_role_bundle?: string[]
  lab_role_names?: string[]
  office_role_bundle?: string[]
  office_role_names?: string[]
  total_count?: number
}

/** Extract a flat permission list from login, /users/permissions, or nested API envelopes. */
export function normalizePermissionsResponse(payload: PermissionsApiPayload): string[] {
  if (!payload) return []
  if (Array.isArray(payload)) {
    return payload.filter((p): p is string => typeof p === "string" && p.length > 0)
  }

  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root

  for (const key of ["permissions", "all_permissions", "customer_permissions"] as const) {
    const list = data[key]
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((p): p is string => typeof p === "string" && p.length > 0)
    }
  }

  return []
}

export function normalizeAvailablePermissions(payload: unknown): AvailablePermissionsPayload {
  if (!payload || typeof payload !== "object") return {}
  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root

  return {
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter((p): p is string => typeof p === "string")
      : undefined,
    grouped:
      data.grouped && typeof data.grouped === "object" && !Array.isArray(data.grouped)
        ? (data.grouped as Record<string, string[]>)
        : undefined,
    lab_role_bundle: Array.isArray(data.lab_role_bundle)
      ? data.lab_role_bundle.filter((p): p is string => typeof p === "string")
      : undefined,
    lab_role_names: Array.isArray(data.lab_role_names)
      ? data.lab_role_names.filter((p): p is string => typeof p === "string")
      : undefined,
    office_role_bundle: Array.isArray(data.office_role_bundle)
      ? data.office_role_bundle.filter((p): p is string => typeof p === "string")
      : undefined,
    office_role_names: Array.isArray(data.office_role_names)
      ? data.office_role_names.filter((p): p is string => typeof p === "string")
      : undefined,
    total_count: typeof data.total_count === "number" ? data.total_count : undefined,
  }
}

export function permissionsFromCustomer(
  customers: Array<{ id: number; permissions?: string[] }> | undefined,
  customerId: number,
): string[] {
  const match = customers?.find((c) => c.id === customerId)
  return match?.permissions?.filter(Boolean) ?? []
}

export function hasPermission(
  permissions: string[] | Set<string> | null | undefined,
  permission: string,
  isSuperadmin = false,
): boolean {
  if (isSuperadmin) return true
  if (!permission) return false
  if (!permissions) return false
  if (permissions instanceof Set) return permissions.has(permission)
  return permissions.includes(permission)
}

export function hasAnyPermission(
  permissions: string[] | Set<string> | null | undefined,
  required: string[],
  isSuperadmin = false,
): boolean {
  if (isSuperadmin) return true
  if (!required.length) return true
  return required.some((p) => hasPermission(permissions, p, false))
}

export function toPermissionSet(permissions: string[] | null | undefined): Set<string> {
  return new Set(permissions ?? [])
}

/** Roles that load profile-scoped permissions from the API. */
export const PROFILE_SCOPED_ROLES = [
  "lab_admin",
  "lab_user",
  "office_admin",
  "office_user",
  "doctor_admin",
  "doctor",
] as const

export function userIsSuperadmin(user?: { roles?: string[]; role?: string } | null): boolean {
  if (!user) return false
  if (user.roles?.includes("superadmin")) return true
  return user.role === "superadmin"
}

export const LAB_ROLE_NAMES = ["lab_admin", "lab_user", "lab_driver"] as const

export const OFFICE_ROLE_NAMES = [
  "office_admin",
  "office_user",
  "doctor_admin",
  "doctor",
] as const

export function isLabRoleName(role: string): boolean {
  return (LAB_ROLE_NAMES as readonly string[]).includes(role)
}

export function isOfficeRoleName(role: string): boolean {
  return (OFFICE_ROLE_NAMES as readonly string[]).includes(role)
}

/** Direct permissions to persist — extras beyond what the user's role already grants. */
export function computeDirectPermissionsToSave(
  selected: string[],
  rolePermissions: string[],
): string[] {
  const roleSet = new Set(rolePermissions)
  return selected.filter((permission) => !roleSet.has(permission))
}

/** Default effective permissions when only a role is known (before user is created). */
export function defaultPermissionsForRole(
  role: string,
  labRoleBundle: string[],
): string[] {
  if (isLabRoleName(role)) {
    return [...labRoleBundle]
  }
  return []
}

/** Role slugs relevant to the active customer profile (null = show all, e.g. superadmin). */
export function roleNamesForActiveContext(isSuperadmin = false): readonly string[] | null {
  if (isSuperadmin) return null
  if (isLabCustomerContext()) return LAB_ROLE_NAMES
  if (isOfficeCustomerContext()) return OFFICE_ROLE_NAMES
  return null
}

export function roleMatchesActiveContext(roleName: string, isSuperadmin = false): boolean {
  const allowed = roleNamesForActiveContext(isSuperadmin)
  if (!allowed) return true
  return allowed.includes(roleName)
}

function filterGroupedToBundle(
  grouped: Record<string, string[]>,
  bundle: string[],
): Record<string, string[]> {
  const bundleSet = new Set(bundle)
  const result: Record<string, string[]> = {}
  for (const [group, permissions] of Object.entries(grouped)) {
    const kept = permissions.filter((permission) => bundleSet.has(permission))
    if (kept.length > 0) result[group] = kept
  }
  return result
}

/** Limit catalog / assignment UI to permissions for the active profile. */
export function filterGroupedForActiveContext(
  grouped: Record<string, string[]>,
  labRoleBundle: string[],
  isSuperadmin = false,
  officeRoleBundle: string[] = [],
): Record<string, string[]> {
  if (isSuperadmin) return grouped

  if (isLabCustomerContext() && labRoleBundle.length > 0) {
    return filterGroupedToBundle(grouped, labRoleBundle)
  }

  if (isOfficeCustomerContext()) {
    if (officeRoleBundle.length > 0) {
      return filterGroupedToBundle(grouped, officeRoleBundle)
    }
    if (labRoleBundle.length > 0) {
      const labOnly = new Set(labRoleBundle)
      const result: Record<string, string[]> = {}
      for (const [group, permissions] of Object.entries(grouped)) {
        const kept = permissions.filter((permission) => !labOnly.has(permission))
        if (kept.length > 0) result[group] = kept
      }
      return result
    }
  }

  return grouped
}

export function profileScopeLabel(): string {
  const type = getActiveCustomerType()
  if (type === "lab") return "Lab"
  if (type === "office") return "Office"
  return "Profile"
}
