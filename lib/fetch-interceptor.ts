import { clearSessionStorage } from "./clear-session-storage"
import { PLAN_ERROR_CODES } from "./entitlements"
import { PLAN_SUBSCRIPTIONS_PATH } from "./plan-guard"

// Global fetch interceptor for handling 401 responses
export function setupGlobalFetchInterceptor() {
  if (typeof window === 'undefined') return

  const originalFetch = window.fetch

  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args)
      
      // Handle 401 Unauthorized responses
      if (response.status === 401) {
        // Clear all session data
        clearSessionStorage()
        
        // Redirect to login page
        window.location.href = '/login'
        
        // Throw error to prevent further processing
        throw new Error('Unauthorized - Redirecting to login')
      }

      if (response.status === 402 || response.status === 403) {
        const requestUrl = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? ""
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
      // Re-throw 401 errors (they're already handled)
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        throw error
      }
      
      // Re-throw other errors
      throw error
    }
  }
}

// Initialize the interceptor when this module is imported
if (typeof window !== 'undefined') {
  setupGlobalFetchInterceptor()
} 