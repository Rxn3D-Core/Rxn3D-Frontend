import { clearSessionStorage } from '../clear-session-storage'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to ensure URL is absolute
const ensureAbsoluteUrl = (url: string): string => {
  if (!API_BASE_URL) {
    console.error('API_BASE_URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL environment variable.')
    throw new Error('API_BASE_URL is not configured')
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = url.startsWith('/') ? url : `/${url}`
  
  return `${baseUrl}${path}`
}

/** Build an absolute API URL from a path (e.g. `/slip/listing/lab`). */
export function buildApiUrl(path: string): string {
  return ensureAbsoluteUrl(path)
}

const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

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

const handleHardUnauthorized = () => {
  if (typeof window === 'undefined') return
  // Silent refresh already attempted by lib/fetch-interceptor.ts
  clearSessionStorage()
  window.location.href = '/login'
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ data: T }> {
  const response = await fetch(url, init)

  if (!response.ok) {
    if (response.status === 401) {
      handleHardUnauthorized()
      throw new Error('Unauthorized')
    }
    const errorBody = await response.json().catch(() => null)
    const message = errorBody?.message || `HTTP error! status: ${response.status}`
    throw new Error(message)
  }

  const result = await response.json()
  return { data: result.data || result }
}

interface ApiClient {
  get: <T>(url: string, options?: { params?: Record<string, any> }) => Promise<{ data: T }>
  post: <T>(url: string, data?: any) => Promise<{ data: T }>
  put: <T>(url: string, data?: any) => Promise<{ data: T }>
  patch: <T>(url: string, data?: any) => Promise<{ data: T }>
  delete: <T>(url: string) => Promise<{ data: T }>
}

export const apiClient: ApiClient = {
  get: async <T>(url: string, options?: { params?: Record<string, any> }): Promise<{ data: T }> => {
    const queryString = buildQueryString(options?.params)
    const fullUrl = `${ensureAbsoluteUrl(url)}${queryString}`
    return requestJson<T>(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
  },

  post: async <T>(url: string, data?: any): Promise<{ data: T }> => {
    return requestJson<T>(ensureAbsoluteUrl(url), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  put: async <T>(url: string, data?: any): Promise<{ data: T }> => {
    return requestJson<T>(ensureAbsoluteUrl(url), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  patch: async <T>(url: string, data?: any): Promise<{ data: T }> => {
    return requestJson<T>(ensureAbsoluteUrl(url), {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  delete: async <T>(url: string): Promise<{ data: T }> => {
    return requestJson<T>(ensureAbsoluteUrl(url), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
  },
}
