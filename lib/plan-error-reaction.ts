import { FEATURE_KEYS, PLAN_ERROR_CODES } from "./entitlements"

/** Window event the fetch interceptor fires to show the upgrade toast (see FetchInterceptorBootstrap). */
export const PLAN_UPGRADE_NOTICE_EVENT = "plan-upgrade-notice"

export type PlanErrorInfo = { code: string; featureKey: string | null }

/** Plan error from a 402/403 response body, or null when it is not one (the entitlements call is never one). */
export function readPlanError(status: number, requestUrl: string, body: unknown): PlanErrorInfo | null {
  if (status !== 402 && status !== 403) return null
  if (requestUrl.includes("/entitlements")) return null
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const code = String(b.error ?? b.code ?? "").toLowerCase()
  if (!PLAN_ERROR_CODES.includes(code as (typeof PLAN_ERROR_CODES)[number])) return null
  const featureKey = typeof b.feature_key === "string" ? b.feature_key : null
  return { code, featureKey }
}

/**
 * Hitting the monthly slip limit keeps today's redirect to the subscriptions page.
 * Every other plan error (background or optional requests) shows an upgrade message instead.
 */
export function planErrorReaction(
  error: PlanErrorInfo,
  pathname: string,
  subscriptionsPath: string,
): "redirect" | "notify" | "none" {
  if (pathname.startsWith(subscriptionsPath)) return "none"
  if (error.code === "plan_limit_exceeded" && error.featureKey === FEATURE_KEYS.slipCreationMonthlyLimit) {
    return "redirect"
  }
  return "notify"
}

/** Returns a gate that lets one notice through per `windowMs`, so a burst of failing requests shows one toast. */
export function createNoticeDeduper(windowMs: number): (now: number) => boolean {
  let last = Number.NEGATIVE_INFINITY
  return (now: number) => {
    if (now - last < windowMs) return false
    last = now
    return true
  }
}
