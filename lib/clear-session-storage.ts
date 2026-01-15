/**
 * Utility function to clear all session-related localStorage items
 * This should be called when user logs out or is redirected to login
 */
export function clearSessionStorage(): void {
  if (typeof window === "undefined") return

  // List of session-related keys to remove
  const sessionKeys = [
    "token",
    "user",
    "tokenExpiresAt",
    "library_token",
    "customerId",
    "customerid", // lowercase variant
    "customerType",
    "customerLogo",
    "selectedLocation",
    "selectedLabId",
    "role",
    "sessionHistory",
    "labAdminHistory",
    "originalUser", // for impersonation
    "originalToken", // for impersonation
    "isImpersonating", // for impersonation
  ]

  // Remove all session keys
  sessionKeys.forEach((key) => {
    localStorage.removeItem(key)
  })

  // Clear all customer logo caches (customerLogo_*)
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith("customerLogo_")) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error("Error clearing customer logo caches:", error)
  }

  // Clear auth cookie
  try {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=lax"
  } catch (error) {
    console.error("Error clearing auth cookie:", error)
  }
}
