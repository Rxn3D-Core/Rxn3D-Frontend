"use client"

import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"

/** Common permission capability flags for product and case UIs. */
export function usePermissionCapabilities() {
  const { hasPermission, hasAnyPermission, isSuperadmin } = useAuth()

  return useMemo(
    () => ({
      isSuperadmin,
      canViewDashboard: hasPermission("view_dashboard"),
      canViewProducts: hasPermission("view_product"),
      canCreateProduct: hasPermission("create_product"),
      canUpdateProduct: hasPermission("update_product"),
      canDeleteProduct: hasPermission("delete_product"),
      canManageProducts: hasAnyPermission([
        "create_product",
        "update_product",
        "delete_product",
      ]),
      canViewCases: hasPermission("view_case_details_status"),
      canSubmitCase: hasPermission("submit_new_case"),
      canEditSlip: hasPermission("edit_slip"),
      canCancelCase: hasPermission("cancel_case"),
      canDeleteCase: hasPermission("soft_delete_case"),
      canManageUsers: hasAnyPermission(["manage_users", "create_user", "edit_user"]),
      canViewUsers: hasPermission("view_users"),
      canUpdateRole: hasPermission("update_role"),
      canManageSlipSettings: hasPermission("manage_slip_settings"),
      canManageDashboardSettings: hasPermission("manage_dashboard_settings"),
      canViewBilling: hasAnyPermission(["view_billing", "manage_billing"]),
      canGetConnections: hasPermission("get_connections"),
      canEditCallLogs: hasAnyPermission(["view_call_logs", "edit_call_logs"]),
    }),
    [hasPermission, hasAnyPermission, isSuperadmin],
  )
}
