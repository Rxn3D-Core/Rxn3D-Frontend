export { handlePlanError, isPlanError, redirectToSubscriptions, PLAN_SUBSCRIPTIONS_PATH } from "./plan-guard"

export const LAB_SLIP_LIMIT_MESSAGE =
  "Slip creation limit reached. Your lab has no active plan capacity and no credits left. Please subscribe to a plan or buy credit books to continue."

export const OFFICE_LAB_UNAVAILABLE_MESSAGE =
  "This lab has no active plan capacity and no credits, so it cannot accept new slips. Please choose another lab or ask the lab to subscribe or buy credit books."

type PrimitiveRecord = Record<string, unknown>

export interface SlipCreationEligibility {
  canCreate: boolean
  reason: "limit_exceeded" | "unknown"
}

export class SlipCreationApiError extends Error {
  status?: number
  code?: string
  errors?: Record<string, string[]>

  constructor(message: string, options?: { status?: number; code?: string; errors?: Record<string, string[]> }) {
    super(message)
    this.name = "SlipCreationApiError"
    this.status = options?.status
    this.code = options?.code
    this.errors = options?.errors
  }
}

function readNumber(source: PrimitiveRecord | null | undefined, keys: string[]): number | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function readBoolean(source: PrimitiveRecord | null | undefined, keys: string[]): boolean | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "boolean") return value
    if (typeof value === "number") return value === 1
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()
      if (["true", "yes", "1", "active"].includes(normalized)) return true
      if (["false", "no", "0", "inactive"].includes(normalized)) return false
    }
  }
  return null
}

function pickEntity(source: unknown): PrimitiveRecord | null {
  if (!source || typeof source !== "object") return null
  const obj = source as PrimitiveRecord
  const nested = (obj.lab ?? obj.office) as PrimitiveRecord | undefined
  return nested && typeof nested === "object" ? nested : obj
}

export function resolveSlipCreationEligibility(source: unknown): SlipCreationEligibility {
  const root = (source && typeof source === "object" ? (source as PrimitiveRecord) : null)
  const entity = pickEntity(source)

  const explicitBlocked = readBoolean(root, ["can_accept_slips", "can_create_slip"]) === false
    || readBoolean(entity, ["can_accept_slips", "can_create_slip"]) === false

  if (explicitBlocked) {
    return { canCreate: false, reason: "limit_exceeded" }
  }

  const availableCredits = readNumber(root, ["available_credits", "remaining_credits", "credit_balance"])
    ?? readNumber(entity, ["available_credits", "remaining_credits", "credit_balance"])

  const remainingCapacity = readNumber(
    root,
    ["remaining_subscription_capacity", "remaining_plan_capacity", "remaining_capacity", "remaining_slips"]
  ) ?? readNumber(
    entity,
    ["remaining_subscription_capacity", "remaining_plan_capacity", "remaining_capacity", "remaining_slips"]
  )

  const hasActiveSubscription = readBoolean(
    root,
    ["has_active_subscription", "is_subscription_active", "active_subscription", "hasActiveSubscription"]
  ) ?? readBoolean(
    entity,
    ["has_active_subscription", "is_subscription_active", "active_subscription", "hasActiveSubscription"]
  )

  if (remainingCapacity !== null && availableCredits !== null) {
    return { canCreate: remainingCapacity > 0 || availableCredits > 0, reason: "limit_exceeded" }
  }

  if (hasActiveSubscription === false && availableCredits !== null) {
    return { canCreate: availableCredits > 0, reason: "limit_exceeded" }
  }

  return { canCreate: true, reason: "unknown" }
}

export function isSlipLimitExceededError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const maybeError = error as { status?: unknown; code?: unknown; message?: unknown }
  const code = typeof maybeError.code === "string" ? maybeError.code.toLowerCase() : ""
  if (code === "slip_limit_exceeded") return true
  if (typeof maybeError.status === "number" && maybeError.status === 402) return true
  const msg = typeof maybeError.message === "string" ? maybeError.message.toLowerCase() : ""
  return msg.includes("slip_limit_exceeded")
}
