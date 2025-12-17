// Global fetch interceptor for handling 401 responses
export function setupGlobalFetchInterceptor() {
  if (typeof window === 'undefined') return

  const originalFetch = window.fetch

  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args)
      
      // Handle 401 Unauthorized responses
      if (response.status === 401) {
        // Clear all auth data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('customerId')
        
        // Redirect to login page
        window.location.href = '/login'
        
        // Throw error to prevent further processing
        throw new Error('Unauthorized - Redirecting to login')
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