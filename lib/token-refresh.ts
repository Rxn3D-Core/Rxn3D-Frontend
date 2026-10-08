/**
 * Single-flight access-token refresh for JWT sessions.
 * Uses an optional raw fetch (bypass global interceptor) to avoid refresh loops.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const TOKEN_KEY = "token"
const TOKEN_EXPIRES_AT_KEY = "tokenExpiresAt"
const AUTH_TOKEN_COOKIE = "auth_token"

export const AUTH_REFRESH_PATH = "/auth/refresh_token"
export const AUTH_EXEMPT_PATH_FRAGMENTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh_token",
  "/auth/logout",
  "/forgot-password",
  "/reset-password",
] as const

type FetchLike = typeof fetch

let refreshPromise: Promise<string | null> | null = null

function setTokenCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; samesite=lax`
}

export function persistRefreshedToken(accessToken: string, expiresInSeconds?: number): void {
  if (typeof window === "undefined") return

  localStorage.setItem(TOKEN_KEY, accessToken)

  if (typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)) {
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000))
  } else {
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1] ?? ""))
      if (payload?.exp) {
        localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(payload.exp * 1000))
      }
    } catch {
      // ignore parse errors
    }
  }

  setTokenCookie(TOKEN_KEY, accessToken)
  setTokenCookie(AUTH_TOKEN_COOKIE, accessToken)

  if (localStorage.getItem("library_token")) {
    localStorage.setItem("library_token", accessToken)
  }

  window.dispatchEvent(
    new CustomEvent("auth-token-refreshed", {
      detail: { accessToken, expiresInSeconds },
    }),
  )
}

export function isAuthExemptUrl(url: string): boolean {
  return AUTH_EXEMPT_PATH_FRAGMENTS.some((fragment) => url.includes(fragment))
}

export function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (typeof Request !== "undefined" && input instanceof Request) return input.url
  return String(input)
}

async function performRefresh(fetchImpl: FetchLike): Promise<string | null> {
  if (typeof window === "undefined") return null

  const currentToken = localStorage.getItem(TOKEN_KEY)
  if (!currentToken) return null

  try {
    const response = await fetchImpl(`${API_BASE_URL}${AUTH_REFRESH_PATH}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) return null

    const result = await response.json().catch(() => null)
    const accessToken: string | undefined =
      result?.data?.access_token ?? result?.access_token
    const expiresIn: number | undefined =
      result?.data?.expires_in ?? result?.expires_in

    if (!accessToken) return null

    persistRefreshedToken(accessToken, expiresIn)
    return accessToken
  } catch {
    return null
  }
}

/**
 * Refresh the access token once; concurrent callers share the same promise.
 */
export function refreshAccessToken(fetchImpl?: FetchLike): Promise<string | null> {
  const impl = fetchImpl ?? fetch
  if (!refreshPromise) {
    refreshPromise = performRefresh(impl).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export function withAuthorizationHeader(
  init: RequestInit | undefined,
  accessToken: string,
): RequestInit & { __isRetryAfterRefresh: true } {
  const headers = new Headers(init?.headers ?? {})
  headers.set("Authorization", `Bearer ${accessToken}`)
  return {
    ...init,
    headers,
    __isRetryAfterRefresh: true,
  }
}
