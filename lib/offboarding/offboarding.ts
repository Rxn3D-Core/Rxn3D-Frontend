import type {
  OffboardingBlocker,
  OffboardingPreview,
  OffboardingTransferableCase,
  OffboardPayload,
} from "@/types/offboarding"

export const MEMBERSHIP_INACTIVE_ERROR = "membership_inactive"

/** Per-case choice: a doctor id, or null/undefined meaning "use the one for all". */
export type CaseTargets = Record<number, number | null | undefined>

export interface PayloadInput {
  cases: Pick<OffboardingTransferableCase, "case_id">[]
  defaultTargetId: number | null
  caseTargets: CaseTargets
  reason: string
}

/** The doctor a case ends up with, or null when none is chosen yet. */
export function effectiveTarget(caseId: number, defaultTargetId: number | null, caseTargets: CaseTargets): number | null {
  return caseTargets[caseId] ?? defaultTargetId ?? null
}

/** Case ids that still have no doctor. Submit stays disabled while this is not empty. */
export function findUncoveredCaseIds(
  cases: Pick<OffboardingTransferableCase, "case_id">[],
  defaultTargetId: number | null,
  caseTargets: CaseTargets,
): number[] {
  return cases.filter((c) => effectiveTarget(c.case_id, defaultTargetId, caseTargets) === null).map((c) => c.case_id)
}

/**
 * Request body: the default goes in `default_target_doctor_id`; only cases that differ from it
 * are sent in `transfers`. Without a default every case is sent explicitly.
 */
export function buildOffboardPayload({ cases, defaultTargetId, caseTargets, reason }: PayloadInput): OffboardPayload {
  const payload: OffboardPayload = {}
  if (cases.length > 0) {
    const transfers: NonNullable<OffboardPayload["transfers"]> = []
    for (const c of cases) {
      const own = caseTargets[c.case_id] ?? null
      if (own !== null && own !== defaultTargetId) {
        transfers.push({ case_id: c.case_id, target_doctor_id: own })
      }
    }
    if (defaultTargetId !== null) payload.default_target_doctor_id = defaultTargetId
    if (transfers.length > 0) payload.transfers = transfers
  }
  const trimmed = reason.trim()
  if (trimmed) payload.reason = trimmed
  return payload
}

const BLOCKER_KEYS: Record<OffboardingBlocker, string> = {
  last_admin: "offboarding.blockers.last_admin",
  no_eligible_target: "offboarding.blockers.no_eligible_target",
  already_offboarded: "offboarding.blockers.already_offboarded",
}

/** i18n key for a blocker code; unknown codes fall back to the generic error. */
export function blockerMessageKey(code: string): string {
  return BLOCKER_KEYS[code as OffboardingBlocker] ?? "offboarding.errors.generic"
}

/**
 * True when removal cannot proceed: the server says so, or cases need a doctor and none is eligible.
 * (There is no admin fallback: an empty target list always blocks.)
 */
export function blockedBy(preview: OffboardingPreview): OffboardingBlocker[] {
  const codes = [...preview.blockers]
  if (preview.requires_transfer && preview.eligible_targets.length === 0 && !codes.includes("no_eligible_target")) {
    codes.push("no_eligible_target")
  }
  return codes
}

/** Maps 422 `errors` keys (`transfers.N.target_doctor_id`, `default_target_doctor_id`) to case ids / the default picker. */
export function mapValidationErrors(
  errors: Record<string, string[]> | undefined,
  sentTransfers: OffboardPayload["transfers"],
): { default?: string; byCase: Record<number, string> } {
  const out: { default?: string; byCase: Record<number, string> } = { byCase: {} }
  if (!errors) return out
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages?.[0]
    if (!message) continue
    if (key === "default_target_doctor_id") {
      out.default = message
      continue
    }
    const match = /^transfers\.(\d+)\./.exec(key)
    const caseId = match ? sentTransfers?.[Number(match[1])]?.case_id : undefined
    if (caseId !== undefined) out.byCase[caseId] = message
    else out.default = out.default ?? message
  }
  return out
}

/** A 403 `membership_inactive` response (any endpoint) means the selected profile is gone. */
export function isMembershipInactive(status: number, body: unknown): boolean {
  if (status !== 403 || !body || typeof body !== "object") return false
  return (body as Record<string, unknown>).error === MEMBERSHIP_INACTIVE_ERROR
}

/** Profile-scoped keys cleared when the selected organization is no longer accessible. */
export const SELECTED_PROFILE_KEYS = ["customerId", "customerid", "customerType", "selectedLocation", "selectedLabId", "role"] as const

export const PROFILE_SELECTION_PATH = "/multiple-location"

/**
 * Where to send the user after a 403 `membership_inactive`: profile selection when another
 * organization is left, otherwise back to login.
 */
export function membershipInactiveDestination(
  currentCustomerId: number | null,
  customerIds: number[],
): typeof PROFILE_SELECTION_PATH | "/login" {
  const others = customerIds.filter((id) => id !== currentCustomerId)
  return others.length > 0 ? PROFILE_SELECTION_PATH : "/login"
}
