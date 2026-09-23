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

function forceLogout(): never {
  clearSessionStorage()
  window.location.href = "/login"
  throw new Error("Unauthorized - Redirecting to login")
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

// Global fetch interceptor for handling 401 responses with silent JWT refresh
export function setupGlobalFetchInterceptor() {
  if (typeof window === "undefined") return
  // Avoid double-wrapping in Fast Refresh / HMR
  if ((window as Window & { __rxn3dFetchInterceptorInstalled?: boolean }).__rxn3dFetchInterceptorInstalled) {
    return
  }
  ;(window as Window & { __rxn3dFetchInterceptorInstalled?: boolean }).__rxn3dFetchInterceptorInstalled =
    true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function (...args: FetchArgs) {
    const input = args[0]
    const requestClone =
      typeof Request !== "undefined" && input instanceof Request ? input.clone() : null

    try {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        const requestUrl = getRequestUrl(args[0])

        // Login / refresh / logout 401s must not trigger silent refresh or forced redirect
        if (isAuthExemptUrl(requestUrl)) {
          return response
        }

        if (isRetryAfterRefresh(args[1])) {
          forceLogout()
        }

        const newToken = await refreshAccessToken(originalFetch)
        if (!newToken) {
          forceLogout()
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
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        throw error
      }
      throw error
    }
  }
}

// Initialize the interceptor when this module is imported
if (typeof window !== "undefined") {
  setupGlobalFetchInterceptor()
}
