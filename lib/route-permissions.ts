/** Backend permission keys used by `PermissionRoute` layout guards. */

export const ROUTE_PERMISSIONS = {
  dashboard: ["view_dashboard"],
  labProfile: ["view_lab", "edit_lab", "manage_lab"],
  officeProfile: ["view_office", "edit_office", "manage_office"],
  caseManagement: ["view_case_details_status", "submit_new_case", "edit_slip"],
  caseDesign: ["submit_new_case", "edit_slip"],
  productLibrary: ["view_product", "create_product", "update_product", "delete_product"],
  businessSettings: ["view_business_setting", "update_business_setting"],
  dashboardSettings: ["manage_dashboard_settings"],
  slipSettings: ["manage_slip_settings"],
  connections: ["get_connections"],
  caseTracking: ["view_case_details_status"],
  billing: ["view_billing", "manage_billing"],
  users: ["view_users", "manage_users"],
} as const
