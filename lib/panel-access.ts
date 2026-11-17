/**
 * Panel route guard rule (RXN-85). Each panel route group belongs to one side:
 * "lab", "office" or "superadmin". A user on the other side gets a "no permission" page.
 * The side is resolved the way the sidebar picks its menu (`getMenuForProfile`): active
 * customer type first, then the profile role. Superadmin may open lab and office panels;
 * a superadmin acting as lab admin counts as lab. The API is the real control; this only
 * decides what the frontend renders.
 */

import { getPrimaryRole } from "@/lib/get-primary-role"
import { LAB_ROLE_NAMES, OFFICE_ROLE_NAMES, userIsSuperadmin } from "@/lib/permissions"
import { normalizeRoleSlug } from "@/lib/role-utils"

export type Panel = "lab" | "office" | "superadmin"

export interface PanelAccessInput {
  user: { role?: string; roles?: string[] } | null | undefined
  isActingAsLabAdmin: boolean
  /** localStorage `customerType` of the active profile. */
  activeCustomerType: string | null | undefined
  /** Role on the active profile (auth `profileRole`). */
  profileRole?: string | null
}

/** Which side ("lab" or "office") the active profile is on, or null when it cannot be told. */
export function activePanelSide({
  user,
  isActingAsLabAdmin,
  activeCustomerType,
  profileRole,
}: PanelAccessInput): "lab" | "office" | null {
  if (isActingAsLabAdmin) return "lab"
  const type = (activeCustomerType ?? "").toLowerCase()
  if (type === "lab" || type === "office") return type
  const role = normalizeRoleSlug(profileRole) || normalizeRoleSlug(getPrimaryRole(user))
  if ((LAB_ROLE_NAMES as readonly string[]).includes(role)) return "lab"
  if ((OFFICE_ROLE_NAMES as readonly string[]).includes(role)) return "office"
  return null
}

export function canAccessPanel(panel: Panel, input: PanelAccessInput): boolean {
  if (!input.user) return false
  const superadmin = userIsSuperadmin(input.user)
  if (panel === "superadmin") return superadmin
  if (superadmin && !input.isActingAsLabAdmin) return true
  return activePanelSide(input) === panel
}
