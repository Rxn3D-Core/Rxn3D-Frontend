"use client"

import { useEffect, useState } from "react"
import { isLabLibraryRole, resolveLibraryCustomerId } from "@/lib/customer-scope"

export type AdvanceModeCustomerScope = {
  /** After client reads localStorage (first paint may be pre-hydration) */
  ready: boolean
  isLabAdmin: boolean
  /** When isLabAdmin (lab_admin/lab_user/lab_driver) and `customerId` is resolved */
  labCustomerId: number | undefined
}

/**
 * Tracks lab vs global advance-mode viewers so list queries can omit `customer_id` for superadmin
 * and defer lab-scoped calls until scoped `customer_id` is known (avoids duplicate unscoped+fetched requests).
 */
export function useAdvanceModeCustomerScope(): AdvanceModeCustomerScope {
  const [scope, setScope] = useState<AdvanceModeCustomerScope>({
    ready: false,
    isLabAdmin: false,
    labCustomerId: undefined,
  })

  useEffect(() => {
    const role = localStorage.getItem("role") ?? ""
    const isLabAdmin = isLabLibraryRole(role)
    let labCustomerId: number | undefined
    if (isLabAdmin) {
      const resolved = resolveLibraryCustomerId()
      labCustomerId = resolved != null ? resolved : undefined
    }
    setScope({ ready: true, isLabAdmin, labCustomerId })
  }, [])

  return scope
}

/** Use as `enabled` for advance-mode list queries that scope by lab `customer_id` when viewer is lab_admin. */
export function advanceCustomerListQueriesEnabled(scope: AdvanceModeCustomerScope): boolean {
  if (!scope.ready) return false
  if (!scope.isLabAdmin) return true
  return typeof scope.labCustomerId === "number"
}
