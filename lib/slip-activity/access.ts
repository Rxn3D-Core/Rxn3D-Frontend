/**
 * Slip Activity Monitor access rule (RXN-7): lab_admin, lab_user and lab_driver on the
 * active lab profile only. Superadmin is always refused, including "acting as lab admin"
 * (the raw user is still a superadmin). Office and doctor profiles are refused.
 * The backend `lab.side` middleware is the real control; this only decides what to render.
 */

import { LAB_ROLE_NAMES, roleOnCustomer, userIsSuperadmin } from "@/lib/permissions"
import { normalizeRoleSlug } from "@/lib/role-utils"

export interface LabSideAccessInput {
  user:
    | {
        role?: string
        roles?: string[]
        customers?: Array<{ id: number | string; type?: string; role?: unknown }>
      }
    | null
    | undefined
  /** localStorage `customerId`. */
  activeCustomerId: string | number | null | undefined
  /** localStorage `customerType`. */
  activeCustomerType: string | null | undefined
  /** localStorage `role` (active profile role), used when the customer entry has no role. */
  storedRole?: string | null
}

export function canAccessSlipActivity({
  user,
  activeCustomerId,
  activeCustomerType,
  storedRole,
}: LabSideAccessInput): boolean {
  if (!user) return false
  if (userIsSuperadmin(user)) return false
  if (activeCustomerId == null || activeCustomerId === "") return false

  const customer = user.customers?.find((c) => Number(c.id) === Number(activeCustomerId))
  const type = (customer?.type ?? activeCustomerType ?? "").toLowerCase()
  if (type !== "lab") return false

  const role = roleOnCustomer(user.customers, activeCustomerId) ?? (normalizeRoleSlug(storedRole) || null)
  return !!role && (LAB_ROLE_NAMES as readonly string[]).includes(role)
}
