import { persistRefreshedToken } from "./token-refresh"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export type ValidateSessionAPIResult = {
  isValid: boolean
  isActuallyExpired?: boolean
  shouldRefresh?: boolean
  isCriticalFailure?: boolean
  error?: string
}

export const validateSessionAPI = async (token: string): Promise<ValidateSessionAPIResult> => {
  if (!token) {
    return { isValid: false, error: "No token provided", isCriticalFailure: true }
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/validate_token`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}))
      if (errorData.error === "token_expired" || errorData.message?.toLowerCase().includes("expired")) {
        return { isValid: false, isActuallyExpired: true, shouldRefresh: true, error: "Token expired (API)" }
      }
      return { isValid: false, error: "Invalid token (401 API)", isCriticalFailure: true }
    }
    if (!response.ok) {
      return { isValid: false, error: `Validation API failed: ${response.status}` }
    }
    return { isValid: true }
  } catch (error) {
    console.warn("Session validation API network error:", error)
    return { isValid: false, error: "Network error during API validation" }
  }
}

export type RefreshTokenAPIResult = {
  success: boolean
  newToken?: string
  newExpiresIn?: number
  error?: string
  isCriticalFailure?: boolean
}

export const refreshTokenAPI = async (currentToken: string): Promise<RefreshTokenAPIResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh_token`, {
      method: "GET",
      headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: errorData.message || errorData.error || `Refresh rejected: ${response.status}`,
          isCriticalFailure: true,
        }
      }
      return {
        success: false,
        error: errorData.message || errorData.error || `Refresh failed: ${response.status}`,
      }
    }

    const data = await response.json()
    const accessToken: string | undefined = data?.data?.access_token ?? data?.access_token
    const expiresIn: number | undefined = data?.data?.expires_in ?? data?.expires_in

    if (accessToken) {
      persistRefreshedToken(accessToken, expiresIn)
      return { success: true, newToken: accessToken, newExpiresIn: expiresIn }
    }
    return { success: false, error: "No new token in refresh response" }
  } catch (error) {
    console.error("Token refresh API network error:", error)
    return { success: false, error: "Network error during token refresh" }
  }
}
