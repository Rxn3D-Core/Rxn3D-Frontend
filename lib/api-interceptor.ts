import { useRouter } from "next/navigation"
import { clearSessionStorage } from "./clear-session-storage"

export function setupApiInterceptor() {
  const router = useRouter()

  // Intercept fetch requests
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch(...args)
    
    if (response.status === 401) {
      // Clear all session data
      clearSessionStorage()
      // Redirect to login
      router.replace("/login")
      throw new Error("Unauthorized")
    }
    
    return response
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
    const xhr = this
    const originalOnReadyStateChange = xhr.onreadystatechange
    
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 401) {
        // Clear all session data
        clearSessionStorage()
        // Redirect to login
        router.replace("/login")
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(xhr, arguments as any)
      }
    }
    
    originalXHROpen.call(xhr, method, url, async, username, password)
  }
} 