const TOKEN_KEY = "token"
const AUTH_TOKEN_COOKIE = "auth_token"
const USER_KEY = "user"
const TOKEN_EXPIRES_AT_KEY = "tokenExpiresAt"

function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; samesite=lax`
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=lax`
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export const getUserData = (): any | null => {
  if (typeof window === "undefined") return null
  const userJson = localStorage.getItem(USER_KEY)
  try {
    return userJson ? JSON.parse(userJson) : null
  } catch (e) {
    console.error("Error parsing user data from localStorage", e)
    return null
  }
}

export const getTokenExpiresAt = (): number | null => {
  if (typeof window === "undefined") return null
  const expiresAtStr = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)
  return expiresAtStr ? parseInt(expiresAtStr, 10) : null
}

export const setAuthTokenAndUser = (token: string, user: any, expiresInSeconds?: number): void => {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))

  if (expiresInSeconds) {
    const expiresAt = Date.now() + expiresInSeconds * 1000
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString())
  } else {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      if (payload.exp) {
        const expiresAt = payload.exp * 1000
        localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString())
      } else {
        localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
      }
    } catch (e) {
      console.warn("Could not parse expiry from token for localStorage, removing expiry time.", e)
      localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
    }
  }

  // Keep both cookie names in sync (legacy auth_token + auth-storage token)
  setCookie(TOKEN_KEY, token)
  setCookie(AUTH_TOKEN_COOKIE, token)
}

export const clearAuthData = (): void => {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
  clearCookie(TOKEN_KEY)
  clearCookie(AUTH_TOKEN_COOKIE)
}
