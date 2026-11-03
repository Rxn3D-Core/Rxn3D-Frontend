/**
 * Plan gating for Advance Mode (`product.advance_mode`) outside the Advance Mode pages.
 * Callers must not hit `/library/advance/*` unless this returns true: the backend answers
 * 403 `feature_not_available` and the fetch interceptor then redirects to billing.
 */
export type AdvanceModeAccessInput = {
  isSuperadmin: boolean
  isActingAsLabAdmin: boolean
  entitlementsLoading: boolean
  hasAdvanceModeFeature: boolean
}

export function canUseAdvanceMode({
  isSuperadmin,
  isActingAsLabAdmin,
  entitlementsLoading,
  hasAdvanceModeFeature,
}: AdvanceModeAccessInput): boolean {
  // Mirrors PlanRoute: superadmin acting as superadmin is never plan-gated.
  if (isSuperadmin && !isActingAsLabAdmin) return true
  if (entitlementsLoading) return false
  return hasAdvanceModeFeature
}

export const ADVANCE_FIELDS_TAB_ID = "advanceFields"

/** Drops the Advance Field tab when the plan does not include Advance Mode. */
export function withoutAdvanceFieldsTab<T extends { id: string }>(tabs: T[], advanceModeAllowed: boolean): T[] {
  return advanceModeAllowed ? tabs : tabs.filter((tab) => tab.id !== ADVANCE_FIELDS_TAB_ID)
}
