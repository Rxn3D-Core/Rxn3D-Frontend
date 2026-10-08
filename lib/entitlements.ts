/**
 * Plan feature keys and helpers. Names must match backend FeatureKey / FeatureCatalog.
 */

export const FEATURE_KEYS = {
  slipCreationMonthlyLimit: "slip.creation.monthly_limit",
  slipOverageEnabled: "slip.overage.enabled",
  connectionsOfficeLimit: "connections.office_limit",
  trackingLocationsLimit: "tracking.locations_limit",
  slipDueRushDate: "slip.due_rush_date",
  attachmentsBasic: "attachments.basic",
  attachmentsAdvanced: "attachments.advanced",
  storageLimitGb: "storage.limit_gb",
  seatsAdminLimit: "seats.admin_limit",
  seatsUserLimit: "seats.user_limit",
  productManagement: "product.management",
  productGlobalLibraryImport: "product.global_library_import",
  productLibraryCloneScope: "product.library_clone_scope",
  productAdvanceMode: "product.advance_mode",
  tools3dViewer: "tools.3d_viewer",
  reportsDashboard: "reports.dashboard",
  billingChargeManagement: "billing.charge_management",
  billingStatements: "billing.statements",
  productionAccess: "production.access",
  slipSettings: "slip.settings",
  systemSettings: "system.settings",
  trackingCasePan: "tracking.case_pan",
  trackingDriverScanning: "tracking.driver_scanning",
  slipPaperSlip: "slip.paper_slip",
  slipVirtualSlip: "slip.virtual_slip",
  accessCustomRoles: "access.custom_roles",
  supportPriority: "support.priority",
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

export type EntitlementRow = {
  key: string
  name?: string
  description?: string
  value_type?: string
  value: unknown
  plan_value?: unknown
  addon_bonus?: number
  is_unlimited?: boolean
  source?: string
}

export type EntitlementUsage = {
  plan_limit?: number | string
  addon_bonus?: number
  effective_limit?: number | string
  used?: number
  remaining?: number | null
  credit_balance?: number
  is_unlimited?: boolean
}

export type TrialPayload = {
  status: string
  plan_name?: string
  started_at?: string | null
  ends_at?: string | null
  days_remaining?: number
  features?: Array<{ key: string; value: unknown; source: string }>
}

export type EntitlementsPayload = {
  lab_id?: number
  plan?: { id: number; name: string; monthly_fee?: number } | null
  on_trial?: boolean
  can_purchase_addons?: boolean
  continuous_charging_enabled?: boolean
  features?: EntitlementRow[]
  usage?: Record<string, EntitlementUsage>
  trial?: TrialPayload | null
  addon_groups?: Record<string, unknown>
}

export function normalizeEntitlements(payload: unknown): EntitlementRow[] {
  if (!payload || typeof payload !== "object") return []
  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root
  const features = data.features
  if (!Array.isArray(features)) return []
  return features.filter((row): row is EntitlementRow => !!row && typeof row === "object" && "key" in row)
}

export function entitlementsByKey(rows: EntitlementRow[]): Record<string, EntitlementRow> {
  return Object.fromEntries(rows.map((row) => [row.key, row]))
}

export function hasFeature(
  features: Record<string, EntitlementRow> | EntitlementRow[] | null | undefined,
  key: string,
  required?: unknown,
): boolean {
  if (!key) return true
  const map = Array.isArray(features) ? entitlementsByKey(features) : features ?? {}
  const row = map[key]
  if (!row) return false
  if (row.is_unlimited) return true
  if (required !== undefined) return row.value === required || String(row.value) === String(required)
  const value = row.value
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value > 0
  if (value === "unlimited") return true
  return !["", "none", "false", "0", null, undefined].includes(value as string)
}

export const PLAN_ERROR_CODES = ["plan_limit_exceeded", "feature_not_available", "addon_not_available"] as const

export function isPlanError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const maybe = error as Record<string, unknown>
  const code = String(maybe.error ?? maybe.code ?? "").toLowerCase()
  if (PLAN_ERROR_CODES.includes(code as (typeof PLAN_ERROR_CODES)[number])) return true
  const status = maybe.status ?? maybe.status_code
  return status === 402 || status === 403
}
