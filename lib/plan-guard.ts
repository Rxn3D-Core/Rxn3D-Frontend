import { isPlanError } from "@/lib/entitlements"

export const PLAN_SUBSCRIPTIONS_PATH = "/billing/subscriptions"

export function redirectToSubscriptions(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("plan-entitlement-changed"))
  window.location.assign(PLAN_SUBSCRIPTIONS_PATH)
}

export function handlePlanError(error: unknown): boolean {
  if (!isPlanError(error)) return false
  redirectToSubscriptions()
  return true
}

export { isPlanError }
