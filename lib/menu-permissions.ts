import type { MenuItem } from "@/config/sidebar-menu"
import { hasAnyPermission, toPermissionSet } from "@/lib/permissions"

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
