/**
 * Mirrors backend validation for Advance Field `charge_scope`:
 * `'per_case' | 'per_tooth' | 'per_slip' | 'per_arch'`
 */
export const ADVANCE_FIELD_CHARGE_SCOPES = ["per_case", "per_tooth", "per_slip", "per_arch"] as const
export type AdvanceFieldChargeScope = (typeof ADVANCE_FIELD_CHARGE_SCOPES)[number]

const SCOPE_ALLOW = new Set<string>(ADVANCE_FIELD_CHARGE_SCOPES)

/** Accepts persisted API strings and legacy hyphen / per_unit shapes from older UI. */
export function parseAdvanceFieldChargeScopeFromApi(raw: unknown): AdvanceFieldChargeScope {
  if (typeof raw !== "string") return "per_case"
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_")
  if (SCOPE_ALLOW.has(normalized)) return normalized as AdvanceFieldChargeScope
  if (normalized === "per_unit") return "per_tooth"
  return "per_case"
}

export function isAdvanceFieldChargeScope(v: string): v is AdvanceFieldChargeScope {
  return SCOPE_ALLOW.has(v)
}

/** Alias for payloads / form submit (same rules as parsing API responses). */
export const normalizeAdvanceFieldChargeScopeForSubmit = parseAdvanceFieldChargeScopeFromApi
