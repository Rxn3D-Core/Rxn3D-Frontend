import type { MenuItem } from "@/config/sidebar-menu"
import { hasAnyPermission, toPermissionSet } from "@/lib/permissions"
import { hasFeature, type EntitlementRow } from "@/lib/entitlements"

/** Filter sidebar items by backend permission names (any match on the item's list). */
export function hasMenuPermission(
  granted: Set<string>,
  required: string[] | undefined,
  isSuperadmin: boolean,
): boolean {
  if (isSuperadmin) return true
  if (required === undefined) return false
  return hasAnyPermission(granted, required, false)
}

export function filterMenuByPermissions(
  items: MenuItem[],
  permissions: string[],
  isSuperadmin: boolean,
): MenuItem[] {
  if (isSuperadmin) return items

  const granted = toPermissionSet(permissions)

  return items
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByPermissions(item.children, permissions, isSuperadmin)
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      }

      if (!hasMenuPermission(granted, item.permission, isSuperadmin)) {
        return null
      }

      return item
    })
    .filter((item): item is MenuItem => item !== null)
}

export function filterMenuByEntitlements(
  items: MenuItem[],
  features: Record<string, EntitlementRow> | EntitlementRow[],
  options?: { unrestricted?: boolean },
): MenuItem[] {
  if (options?.unrestricted) return items

  return items
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByEntitlements(item.children, features, options)
        if (filteredChildren.length === 0 && !item.path) return null
        if (filteredChildren.length === 0 && item.planFeature && !hasFeature(features, item.planFeature, item.planFeatureRequired)) {
          return null
        }
        return { ...item, children: filteredChildren }
      }

      if (item.planFeature && !hasFeature(features, item.planFeature, item.planFeatureRequired)) {
        return null
      }

      return item
    })
    .filter((item): item is MenuItem => item !== null)
}
