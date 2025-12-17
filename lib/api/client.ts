const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to ensure URL is absolute
const ensureAbsoluteUrl = (url: string): string => {
  // If API_BASE_URL is empty, throw an error
  if (!API_BASE_URL) {
    console.error('API_BASE_URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL environment variable.')
    throw new Error('API_BASE_URL is not configured')
  }
  
  // If URL already starts with http:// or https://, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Ensure API_BASE_URL doesn't end with / and url doesn't start with /
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = url.startsWith('/') ? url : `/${url}`
  
  return `${baseUrl}${path}`
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

// Helper function to build query string from params
const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return ''
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString())
    }
  })
  const queryString = queryParams.toString()
  return queryString ? `?${queryString}` : ''
}

// API Client interface
interface ApiClient {
  get: <T>(url: string, options?: { params?: Record<string, any> }) => Promise<{ data: T }>
  post: <T>(url: string, data?: any) => Promise<{ data: T }>
  put: <T>(url: string, data?: any) => Promise<{ data: T }>
  patch: <T>(url: string, data?: any) => Promise<{ data: T }>
  delete: <T>(url: string) => Promise<{ data: T }>
}

// Create API client
export const apiClient: ApiClient = {
  get: async <T>(url: string, options?: { params?: Record<string, any> }): Promise<{ data: T }> => {
    const queryString = buildQueryString(options?.params)
    const fullUrl = `${ensureAbsoluteUrl(url)}${queryString}`
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Unauthorized')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return { data: result.data || result }
  },

  post: async <T>(url: string, data?: any): Promise<{ data: T }> => {
    const fullUrl = ensureAbsoluteUrl(url)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Unauthorized')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return { data: result.data || result }
  },

  put: async <T>(url: string, data?: any): Promise<{ data: T }> => {
    const fullUrl = ensureAbsoluteUrl(url)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Unauthorized')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return { data: result.data || result }
  },

  patch: async <T>(url: string, data?: any): Promise<{ data: T }> => {
    const fullUrl = ensureAbsoluteUrl(url)
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Unauthorized')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return { data: result.data || result }
  },

  delete: async <T>(url: string): Promise<{ data: T }> => {
    const fullUrl = ensureAbsoluteUrl(url)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Unauthorized')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return { data: result.data || result }
  },
}

