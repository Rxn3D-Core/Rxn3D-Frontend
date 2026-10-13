import { clearSessionStorage } from "./clear-session-storage"
import { PLAN_ERROR_CODES } from "./entitlements"
import { PLAN_SUBSCRIPTIONS_PATH } from "./plan-guard"
import {
  getRequestUrl,
  isAuthExemptUrl,
  refreshAccessToken,
  withAuthorizationHeader,
} from "./token-refresh"

type FetchArgs = Parameters<typeof fetch>

type InterceptorWindow = Window & {
  __rxn3dOriginalFetch?: typeof fetch
  __rxn3dFetchInterceptorVersion?: number
}

/** Bump so HMR re-wraps fetch when this file changes. */
const INTERCEPTOR_VERSION = 7

function restoreImpersonatorSessionOrNull(): string | null {
  try {
    const wasImpersonating = localStorage.getItem("isImpersonating") === "true"
    const backupToken = localStorage.getItem("impersonator_token")
    const backupUser = localStorage.getItem("impersonator_user")
    if (!wasImpersonating || !backupToken || !backupUser) {
      return null
    }

    localStorage.setItem("token", backupToken)
    localStorage.setItem("user", backupUser)
    localStorage.removeItem("isImpersonating")
    localStorage.removeItem("impersonator_token")
    localStorage.removeItem("impersonator_user")
    localStorage.removeItem("customerId")
    localStorage.removeItem("customerType")
    localStorage.removeItem("selectedLocation")
    localStorage.removeItem("role")
    localStorage.removeItem("profilePermissions")
    document.cookie = `token=${backupToken}; path=/; samesite=lax`
    document.cookie = `auth_token=${backupToken}; path=/; samesite=lax`
    return "/case-management"
  } catch {
    return null
  }
}

/**
 * Original redirect behavior (window.location), without throw —
 * throws caused the Next.js bottom-left ghost error overlay.
 * Hang so callers never reach their own throw/redirect fallbacks.
 */
function forceLogout(): Promise<Response> {
  const restorePath = restoreImpersonatorSessionOrNull()
  if (restorePath) {
    window.location.href = restorePath
    return new Promise(() => {})
  }

  clearSessionStorage()
  window.location.href = "/login"
  return new Promise(() => {})
}

function isRetryAfterRefresh(init?: RequestInit): boolean {
  return Boolean(
    init && (init as RequestInit & { __isRetryAfterRefresh?: boolean }).__isRetryAfterRefresh,
  )
}

function rebuildFetchArgs(
  args: FetchArgs,
  accessToken: string,
  requestClone: Request | null,
): FetchArgs {
  const [, init] = args

  if (requestClone) {
    const headers = new Headers(requestClone.headers)
    headers.set("Authorization", `Bearer ${accessToken}`)
    return [new Request(requestClone, { headers }), withAuthorizationHeader(init, accessToken)]
  }

  return [args[0], withAuthorizationHeader(init, accessToken)]
}

export function setupGlobalFetchInterceptor() {
  if (typeof window === "undefined") return

  const w = window as InterceptorWindow
  if (w.__rxn3dFetchInterceptorVersion === INTERCEPTOR_VERSION) {
    return
  }

  const originalFetch = (w.__rxn3dOriginalFetch ?? window.fetch.bind(window)) as typeof fetch
  w.__rxn3dOriginalFetch = originalFetch
  w.__rxn3dFetchInterceptorVersion = INTERCEPTOR_VERSION

  window.fetch = async function (...args: FetchArgs) {
    const input = args[0]
    const requestClone =
      typeof Request !== "undefined" && input instanceof Request ? input.clone() : null

    const response = await originalFetch(...args)

    if (response.status === 401) {
      const requestUrl = getRequestUrl(args[0])

      if (isAuthExemptUrl(requestUrl)) {
        return response
      }

      if (isRetryAfterRefresh(args[1])) {
        return forceLogout()
      }

      // Live support session JWTs cannot be refreshed.
      const liveImpersonation =
        localStorage.getItem("isImpersonating") === "true" &&
        Boolean(localStorage.getItem("impersonator_token"))
      if (liveImpersonation) {
        return forceLogout()
      }

      // Stale flag from a prior support session — clear and refresh normally.
      if (localStorage.getItem("isImpersonating") === "true") {
        localStorage.removeItem("isImpersonating")
        localStorage.removeItem("impersonator_user")
        localStorage.removeItem("originalUser")
        localStorage.removeItem("originalToken")
      }

      const newToken = await refreshAccessToken(originalFetch)
      if (!newToken) {
        return forceLogout()
      }

      return originalFetch(...rebuildFetchArgs(args, newToken, requestClone))
    }

    if (response.status === 402 || response.status === 403) {
      const requestUrl = getRequestUrl(args[0])
      if (!requestUrl.includes("/entitlements")) {
        const body = await response.clone().json().catch(() => null)
        const code = String(body?.error ?? body?.code ?? "").toLowerCase()
        if (PLAN_ERROR_CODES.includes(code as (typeof PLAN_ERROR_CODES)[number])) {
          window.dispatchEvent(new Event("plan-entitlement-changed"))
          if (!window.location.pathname.startsWith(PLAN_SUBSCRIPTIONS_PATH)) {
            window.location.assign(PLAN_SUBSCRIPTIONS_PATH)
          }
        }
      }
    }

    return response
  }
}
