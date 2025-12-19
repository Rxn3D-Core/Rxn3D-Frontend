import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// Types
export interface AdvanceCategory {
  id: number
  name: string
  code: string
  status: 'Active' | 'Inactive'
  image_url?: string
  customer_id?: number | null
  is_custom: 'Yes' | 'No'
  sequence: number
  created_at: string
  updated_at: string
  subcategories?: AdvanceSubcategory[]
  products?: any[]
  categories?: any[]
}

export interface AdvanceSubcategory {
  id: number
  name: string
  code: string
  advance_category_id: number
  category?: {
    id: number
    name: string
    code: string
  }
  status: 'Active' | 'Inactive'
  image_url?: string
  customer_id?: number | null
  is_custom: 'Yes' | 'No'
  sequence: number
  created_at: string
  updated_at: string
  products?: any[]
  categories?: any[]
}

export interface FieldOption {
  id?: number
  advance_field_id?: number
  name: string
  image_url?: string | null
  status: 'Active' | 'Inactive'
  is_default: 'Yes' | 'No'
  price?: number | null
  sequence: number
}

export interface AdvanceField {
  id: number
  name: string
  description?: string
  image_url?: string
  advance_category_id: number
  advance_subcategory_id?: number | null
  category?: {
    id: number
    name: string
  }
  subcategory?: {
    id: number
    name: string
  }
  advance_subcategory?: {
    id: number
    name: string
  }
  field_type: string
  is_required: 'Yes' | 'No'
  has_additional_pricing: 'Yes' | 'No'
  charge_type?: 'once_per_field' | 'per_selected_option' | null
  price?: number | null
  charge_scope?: string | null
  sequence: number
  status?: 'Active' | 'Inactive'
  is_custom?: 'Yes' | 'No'
  code?: string
  categories?: any[]
  options?: FieldOption[]
  products?: any[]
  created_at: string
  updated_at: string
}

export interface ImplantPlatform {
  id?: number
  implant_id?: number
  name: string
  image_url?: string | null
  status: 'Active' | 'Inactive'
  is_default: 'Yes' | 'No'
  price?: number | null
  sequence: number
}

export interface Implant {
  id: number
  brand_name: string
  system_name: string
  code: string
  status: 'Active' | 'Inactive'
  image_url?: string
  description?: string
  allow_user_input?: 'Yes' | 'No'
  has_additional_pricing: 'Yes' | 'No'
  charge_type?: 'once_per_implant' | 'per_platform_option' | null
  price?: number | null
  charge_scope?: string | null
  platforms?: ImplantPlatform[]
  products?: any[]
  lab_status?: 'Active' | 'Inactive' | null
  lab_price?: number | null
  created_at: string
  updated_at: string
}

export interface AbutmentPlatform {
  id?: number
  abutment_id?: number
  name: string
  image_url?: string | null
  status: 'Active' | 'Inactive'
  is_default: 'Yes' | 'No'
  price?: number | null
  sequence: number
}

export interface Abutment {
  id: number
  brand_name: string
  system_name: string
  code: string
  status: 'Active' | 'Inactive'
  image_url?: string
  description?: string
  allow_user_input?: 'Yes' | 'No'
  has_additional_pricing: 'Yes' | 'No'
  charge_type?: 'once_per_abutment' | 'per_platform_option' | null
  price?: number | null
  charge_scope?: string | null
  platforms?: AbutmentPlatform[]
  products?: any[]
  lab_status?: 'Active' | 'Inactive' | null
  lab_price?: number | null
  created_at: string
  updated_at: string
}

export interface PaginationParams {
  page?: number
  per_page?: number
  q?: string
  status?: 'Active' | 'Inactive'
  order_by?: string
  sort_by?: 'asc' | 'desc'
  customer_id?: number
  is_custom?: 'Yes' | 'No'
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// ===== CATEGORIES =====

export const useAdvanceCategories = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['advanceCategories', params],
    queryFn: async () => {
      // Get role and customerId from localStorage for lab_admin
      let customerId = params?.customer_id
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin' && !customerId) {
          const storedCustomerId = localStorage.getItem('customerId')
          if (storedCustomerId) {
            customerId = parseInt(storedCustomerId, 10)
          }
        }
      }

      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params?.q) queryParams.append('q', params.q)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.order_by) queryParams.append('order_by', params.order_by)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      // Add customer_id if role is lab_admin and customerId is available
      if (customerId) queryParams.append('customer_id', customerId.toString())
      if (params?.is_custom) queryParams.append('is_custom', params.is_custom)

      const response = await fetch(`${ensureAbsoluteUrl('/library/advance/categories')}?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch categories')
      }

      const result = await response.json()
      // Handle API response structure: { status, message, data: { data: [...], pagination: {...} } }
      if (result.data && result.data.data && Array.isArray(result.data.data)) {
        return {
          data: result.data.data,
          current_page: result.data.pagination?.current_page || 1,
          per_page: result.data.pagination?.per_page || 10,
          total: result.data.pagination?.total || 0,
          last_page: result.data.pagination?.last_page || 1,
        } as PaginatedResponse<AdvanceCategory>
      }
      // Fallback for unwrapped responses
      return (result.data || result) as PaginatedResponse<AdvanceCategory>
    },
  })
}

export const useAdvanceCategory = (id: number, customer_id?: number) => {
  return useQuery({
    queryKey: ['advanceCategory', id, customer_id],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (customer_id) queryParams.append('customer_id', customer_id.toString())

      const url = ensureAbsoluteUrl(`/library/advance/categories/${id}`)
      const response = await fetch(queryParams.toString() ? `${url}?${queryParams.toString()}` : url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch category')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceCategory>
    },
    enabled: !!id,
  })
}

export const useCreateAdvanceCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      code: string
      image?: string
      status: string
      sequence?: number
      customer_id?: number | null
    }) => {
      // Add customer_id only if role is lab_admin
      const payload: any = {
        name: data.name,
        code: data.code,
        status: data.status,
        ...(data.sequence !== undefined && { sequence: data.sequence }),
        ...(data.image && { image: data.image }),
      }

      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            payload.customer_id = parseInt(customerId, 10)
          }
        } else if (data.customer_id !== undefined && data.customer_id !== null) {
          payload.customer_id = data.customer_id
        }
      } else if (data.customer_id !== undefined && data.customer_id !== null) {
        payload.customer_id = data.customer_id
      }

      const response = await fetch(ensureAbsoluteUrl('/library/advance/categories'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to create category')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceCategory>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
    },
  })
}

export const useUpdateAdvanceCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      name?: string
      code?: string
      image?: string
      status?: string
      sequence?: number
      customer_id?: number | null
    }) => {
      // Add customer_id only if role is lab_admin
      const payload: any = { ...data }

      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            payload.customer_id = parseInt(customerId, 10)
          }
        } else if (data.customer_id !== undefined && data.customer_id !== null) {
          payload.customer_id = data.customer_id
        }
      } else if (data.customer_id !== undefined && data.customer_id !== null) {
        payload.customer_id = data.customer_id
      }

      const response = await fetch(ensureAbsoluteUrl(`/library/advance/categories/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to update category')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceCategory>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceCategory', variables.id] })
    },
  })
}

export const useDeleteAdvanceCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/categories/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to delete category')
      }

      const result = await response.json()
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
    },
  })
}

export const useUpdateCategoryStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      customer_id,
    }: {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
    }) => {
      const body: any = { status }
      if (customer_id !== undefined) body.customer_id = customer_id

      const response = await fetch(ensureAbsoluteUrl(`/library/advance/categories/${id}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to update category status')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceCategory>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceCategory', variables.id] })
    },
  })
}

export const useLinkCategoryProducts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      product_ids,
    }: {
      id: number
      product_ids: number[]
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/categories/${id}/link-products`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ product_ids }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to link products to category')
      }

      const result = await response.json()
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceCategory', variables.id] })
    },
  })
}

export const useLinkCategoryCategories = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      category_ids,
    }: {
      id: number
      category_ids: number[]
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/categories/${id}/link-categories`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category_ids }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to link categories to advance category')
      }

      const result = await response.json()
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceCategory', variables.id] })
    },
  })
}

export const useDuplicateAdvanceCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // First fetch the category to duplicate
      const getResponse = await fetch(ensureAbsoluteUrl(`/library/advance/categories/${id}`), {
        headers: getAuthHeaders(),
      })

      if (!getResponse.ok) {
        const error = await getResponse.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch category for duplication')
      }

      const categoryData = await getResponse.json()
      const category = categoryData.data || categoryData

      // Create a new category with modified name and code
      const duplicateData: any = {
        name: `${category.name} (Copy)`,
        code: `${category.code}_COPY`,
        status: category.status,
        sequence: category.sequence || 1,
      }

      // Add customer_id if present
      if (category.customer_id) {
        duplicateData.customer_id = category.customer_id
      }

      // Note: image_url can't be duplicated directly as it requires base64 encoding
      // If needed, the image would need to be fetched and converted to base64

      const createResponse = await fetch(ensureAbsoluteUrl('/library/advance/categories'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(duplicateData),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to duplicate category')
      }

      const result = await createResponse.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceCategory>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceCategories'] })
    },
  })
}

// ===== IMPLANTS =====

export const useImplants = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['implants', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params?.q) queryParams.append('q', params.q)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.order_by) queryParams.append('order_by', params.order_by)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

      // Add customer_id only if role is lab_admin
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            queryParams.append('customer_id', customerId)
          }
        }
      }

      const response = await fetch(`${ensureAbsoluteUrl('/library/implants')}?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch implants')
      }

      const result = await response.json()
      // Handle API response structure: { status, message, data: { data: [...], pagination: {...} } }
      if (result.data) {
        // If response has nested data structure
        if (result.data.data && Array.isArray(result.data.data)) {
          return {
            data: result.data.data,
            current_page: result.data.pagination?.current_page || result.data.current_page || 1,
            per_page: result.data.pagination?.per_page || result.data.per_page || 10,
            total: result.data.pagination?.total || result.data.total || 0,
            last_page: result.data.pagination?.last_page || result.data.last_page || 1,
          } as PaginatedResponse<Implant>
        }
        // If data is directly an array
        if (Array.isArray(result.data)) {
          return result.data as PaginatedResponse<Implant>
        }
      }
      // Fallback: return result as-is if it matches PaginatedResponse structure
      return result as PaginatedResponse<Implant>
    },
  })
}

export const useImplant = (id: number, customer_id?: number) => {
  return useQuery({
    queryKey: ['implant', id, customer_id],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (customer_id !== undefined) {
        queryParams.append('customer_id', customer_id.toString())
      } else if (typeof window !== 'undefined') {
        // Add customer_id only if role is lab_admin
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            queryParams.append('customer_id', customerId)
          }
        }
      }

      const url = ensureAbsoluteUrl(`/library/implants/${id}`)
      const response = await fetch(queryParams.toString() ? `${url}?${queryParams.toString()}` : url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch implant')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<Implant>
    },
    enabled: !!id,
  })
}

export const useCreateImplant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      brand_name: string
      system_name: string
      code: string
      image?: string
      description?: string
      allow_user_input?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_implant' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
      platforms?: Array<{
        name: string
        image?: string
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
    }) => {
      const response = await fetch(ensureAbsoluteUrl('/library/implants'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create implant')
      }

      return response.json() as Promise<ApiResponse<Implant>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
    },
  })
}

export const useUpdateImplant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      brand_name?: string
      system_name?: string
      code?: string
      image?: string
      description?: string
      allow_user_input?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_implant' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
      sequence?: number
      platforms?: Array<{
        id?: number
        name?: string
        image?: string
        status?: 'Active' | 'Inactive'
        is_default?: 'Yes' | 'No'
        price?: number | null
        sequence?: number
      }>
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update implant')
      }

      return response.json() as Promise<ApiResponse<Implant>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.id] })
    },
  })
}

export const useDeleteImplant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete implant')
      }

      return response.json() as Promise<ApiResponse<null>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
    },
  })
}

export const useUpdateImplantStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      customer_id,
      price,
    }: {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
      price?: number
    }) => {
      const body: any = { status }
      if (customer_id !== undefined) body.customer_id = customer_id
      if (price !== undefined) body.price = price

      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${id}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update implant status')
      }

      return response.json() as Promise<ApiResponse<Implant>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.id] })
    },
  })
}

export const useLinkImplantProducts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      product_ids,
    }: {
      id: number
      product_ids: number[]
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${id}/link-products`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ product_ids }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to link products to implant')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.id] })
    },
  })
}

export const useCreateImplantPlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      implantId,
      ...data
    }: {
      implantId: number
      name: string
      status?: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number | null
      sequence: number
      image?: string
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${implantId}/platforms`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create implant platform')
      }

      return response.json() as Promise<ApiResponse<ImplantPlatform>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.implantId] })
    },
  })
}

export const useUpdateImplantPlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      implantId,
      platformId,
      ...data
    }: {
      implantId: number
      platformId: number
      name?: string
      status?: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number | null
      sequence?: number
      image?: string
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${implantId}/platforms/${platformId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update implant platform')
      }

      return response.json() as Promise<ApiResponse<ImplantPlatform>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.implantId] })
    },
  })
}

export const useDeleteImplantPlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      implantId,
      platformId,
    }: {
      implantId: number
      platformId: number
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${implantId}/platforms/${platformId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete implant platform')
      }

      return response.json() as Promise<ApiResponse<null>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.implantId] })
    },
  })
}

export const useUpdateImplantPlatformStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      implantId,
      platformId,
      status,
      customer_id,
      price,
    }: {
      implantId: number
      platformId: number
      status: 'Active' | 'Inactive'
      customer_id?: number
      price?: number
    }) => {
      const body: any = { status }
      if (customer_id !== undefined) body.customer_id = customer_id
      if (price !== undefined) body.price = price

      const response = await fetch(ensureAbsoluteUrl(`/library/implants/${implantId}/platforms/${platformId}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update implant platform status')
      }

      return response.json() as Promise<ApiResponse<ImplantPlatform>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
      queryClient.invalidateQueries({ queryKey: ['implant', variables.implantId] })
    },
  })
}

export const useDuplicateImplant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // First fetch the implant to duplicate
      const getResponse = await fetch(ensureAbsoluteUrl(`/library/implants/${id}`), {
        headers: getAuthHeaders(),
      })

      if (!getResponse.ok) {
        const error = await getResponse.json()
        throw new Error(error.message || 'Failed to fetch implant for duplication')
      }

      const implantData = await getResponse.json()
      const implant = implantData.data || implantData

      // Create a new implant with modified name and code
      const duplicateData: any = {
        brand_name: implant.brand_name,
        system_name: `${implant.system_name} (Copy)`,
        code: `${implant.code}_COPY`,
        status: implant.status,
        description: implant.description,
        has_additional_pricing: implant.has_additional_pricing,
        charge_type: implant.charge_type,
        price: implant.price,
        charge_scope: implant.charge_scope,
        sequence: implant.sequence,
      }

      // Duplicate platforms if they exist
      if (implant.platforms && implant.platforms.length > 0) {
        duplicateData.platforms = implant.platforms.map((platform: ImplantPlatform) => ({
          name: platform.name,
          status: platform.status,
          is_default: platform.is_default,
          price: platform.price,
          sequence: platform.sequence,
        }))
      }

      const createResponse = await fetch(ensureAbsoluteUrl('/library/implants'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(duplicateData),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.message || 'Failed to duplicate implant')
      }

      return createResponse.json() as Promise<ApiResponse<Implant>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implants'] })
    },
  })
}

// ===== SUBCATEGORIES =====

export const useAdvanceSubcategories = (params?: PaginationParams & { advance_category_id?: number }) => {
  return useQuery({
    queryKey: ['advanceSubcategories', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params?.q) queryParams.append('q', params.q)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.order_by) queryParams.append('order_by', params.order_by)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString())
      if (params?.advance_category_id) queryParams.append('advance_category_id', params.advance_category_id.toString())

      const response = await fetch(`${ensureAbsoluteUrl('/library/advance/subcategories')}?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch subcategories')
      }

      const result = await response.json()
      // Handle API response structure: { status, message, data: { data: [...], pagination: {...} } }
      if (result.data && result.data.data && Array.isArray(result.data.data)) {
        return {
          data: result.data.data,
          current_page: result.data.pagination?.current_page || result.data.current_page || 1,
          per_page: result.data.pagination?.per_page || result.data.per_page || 10,
          total: result.data.pagination?.total || result.data.total || 0,
          last_page: result.data.pagination?.last_page || result.data.last_page || 1,
        } as PaginatedResponse<AdvanceSubcategory>
      }
      // Fallback for unwrapped responses
      return (result.data || result) as PaginatedResponse<AdvanceSubcategory>
    },
  })
}

export const useAdvanceSubcategory = (id: number) => {
  return useQuery({
    queryKey: ['advanceSubcategory', id],
    queryFn: async () => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}`), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch subcategory')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceSubcategory>
    },
    enabled: !!id,
  })
}

export const useCreateAdvanceSubcategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      code: string
      advance_category_id: number
      image?: string
      status?: 'Active' | 'Inactive'
      sequence?: number
      customer_id?: number | null
    }) => {
      // Add customer_id only if role is lab_admin
      const payload: any = {
        name: data.name,
        code: data.code,
        advance_category_id: data.advance_category_id,
        ...(data.status && { status: data.status }),
        ...(data.sequence !== undefined && { sequence: data.sequence }),
        ...(data.image && { image: data.image }),
      }

      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            payload.customer_id = parseInt(customerId, 10)
          }
        } else if (data.customer_id !== undefined && data.customer_id !== null) {
          payload.customer_id = data.customer_id
        }
      } else if (data.customer_id !== undefined && data.customer_id !== null) {
        payload.customer_id = data.customer_id
      }

      const response = await fetch(ensureAbsoluteUrl('/library/advance/subcategories'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to create subcategory')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceSubcategory>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
    },
  })
}

export const useUpdateAdvanceSubcategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      name?: string
      code?: string
      advance_category_id?: number
      image?: string
      status?: 'Active' | 'Inactive'
      sequence?: number
      customer_id?: number | null
    }) => {
      // Add customer_id only if role is lab_admin
      const payload: any = { ...data }

      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            payload.customer_id = parseInt(customerId, 10)
          }
        } else if (data.customer_id !== undefined && data.customer_id !== null) {
          payload.customer_id = data.customer_id
        }
      } else if (data.customer_id !== undefined && data.customer_id !== null) {
        payload.customer_id = data.customer_id
      }

      const response = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to update subcategory')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceSubcategory>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategory', variables.id] })
    },
  })
}

export const useDeleteAdvanceSubcategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to delete subcategory')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<null>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
    },
  })
}

export const useUpdateSubcategoryStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      customer_id,
    }: {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, customer_id }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to update subcategory status')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceSubcategory>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategory', variables.id] })
    },
  })
}

export const useLinkSubcategoryProducts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      product_ids,
    }: {
      id: number
      product_ids: number[]
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}/link-products`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ product_ids }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to link products to subcategory')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategory', variables.id] })
    },
  })
}

export const useLinkSubcategoryCategories = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      category_ids,
    }: {
      id: number
      category_ids: number[]
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}/link-categories`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category_ids }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to link categories to subcategory')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategory', variables.id] })
    },
  })
}

export const useDuplicateAdvanceSubcategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // First fetch the subcategory to duplicate
      const getResponse = await fetch(ensureAbsoluteUrl(`/library/advance/subcategories/${id}`), {
        headers: getAuthHeaders(),
      })

      if (!getResponse.ok) {
        const error = await getResponse.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch subcategory for duplication')
      }

      const subcategoryData = await getResponse.json()
      const subcategory = subcategoryData.data || subcategoryData

      // Create a new subcategory with modified name and code
      const duplicateData = {
        name: `${subcategory.name} (Copy)`,
        code: `${subcategory.code}_COPY`,
        advance_category_id: subcategory.advance_category_id,
        status: subcategory.status,
        sequence: subcategory.sequence,
        customer_id: subcategory.customer_id,
      }

      const createResponse = await fetch(ensureAbsoluteUrl('/library/advance/subcategories'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(duplicateData),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to duplicate subcategory')
      }

      const result = await createResponse.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceSubcategory>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceSubcategories'] })
    },
  })
}

// ===== FIELDS =====

export const useAdvanceFields = (params?: PaginationParams & {
  advance_category_id?: number
  advance_subcategory_id?: number
}) => {
  return useQuery({
    queryKey: ['advanceFields', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params?.q) queryParams.append('q', params.q)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.order_by) queryParams.append('order_by', params.order_by)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params?.advance_category_id) queryParams.append('advance_category_id', params.advance_category_id.toString())
      if (params?.advance_subcategory_id) queryParams.append('advance_subcategory_id', params.advance_subcategory_id.toString())

      // Add customer_id only if role is lab_admin
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            queryParams.append('customer_id', customerId)
          }
        }
      }

      const response = await fetch(`${ensureAbsoluteUrl('/library/advance/fields')}?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch fields')
      }

      const result = await response.json()
      // Handle API response structure: { status, message, data: { data: [...], pagination: {...} } }
      if (result.data) {
        // If response has nested data structure
        if (result.data.data && Array.isArray(result.data.data)) {
          return {
            data: result.data.data,
            current_page: result.data.pagination?.current_page || result.data.current_page || 1,
            per_page: result.data.pagination?.per_page || result.data.per_page || 10,
            total: result.data.pagination?.total || result.data.total || 0,
            last_page: result.data.pagination?.last_page || result.data.last_page || 1,
          } as PaginatedResponse<AdvanceField>
        }
        // If data is directly an array
        if (Array.isArray(result.data)) {
          return result.data as PaginatedResponse<AdvanceField>
        }
      }
      // Fallback: return result as-is if it matches PaginatedResponse structure
      return result as PaginatedResponse<AdvanceField>
    },
  })
}

export const useAdvanceField = (id: number, customer_id?: number) => {
  return useQuery({
    queryKey: ['advanceField', id, customer_id],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (customer_id) queryParams.append('customer_id', customer_id.toString())

      const url = ensureAbsoluteUrl(`/library/advance/fields/${id}`)
      const response = await fetch(queryParams.toString() ? `${url}?${queryParams.toString()}` : url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch field')
      }

      const result = await response.json()
      return (result.data ? result : { data: result }) as ApiResponse<AdvanceField>
    },
    enabled: !!id && id > 0, // Only enable when we have a valid ID
    staleTime: 1000, // Consider data fresh for 1 second to prevent duplicate calls
    gcTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchOnMount: true, // Always refetch when component mounts with new ID
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  })
}

export const useCreateAdvanceField = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      image?: string
      advance_category_id?: number
      advance_subcategory_id?: number
      field_type: string
      is_required?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_selected_option' | null
      price?: number | null
      charge_scope?: string | null
      sequence?: number
      options?: Array<{
        name: string
        image?: string
        status?: 'Active' | 'Inactive'
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
      customer_id?: number
    }) => {
      // Add customer_id only if role is lab_admin
      const payload = { ...data }
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            payload.customer_id = parseInt(customerId, 10)
          }
        } else {
          // Remove customer_id if it was passed but user is not lab_admin
          delete payload.customer_id
        }
      }

      const response = await fetch(ensureAbsoluteUrl('/library/advance/fields'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create field')
      }

      return response.json() as Promise<ApiResponse<AdvanceField>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField'] })
    },
  })
}

export const useUpdateAdvanceField = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      name?: string
      description?: string
      image?: string
      advance_category_id?: number
      advance_subcategory_id?: number
      field_type?: string
      is_required?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_selected_option' | null
      price?: number | null
      charge_scope?: string | null
      sequence?: number
      customer_id?: number
      options?: Array<{
        id?: number
        name: string
        image?: string
        status?: 'Active' | 'Inactive'
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
    }) => {
      // Add customer_id only if role is lab_admin
      const payload = { ...data }
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            payload.customer_id = parseInt(customerId, 10)
          }
        } else {
          // Remove customer_id if it was passed but user is not lab_admin
          delete payload.customer_id
        }
      }

      const response = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update field')
      }

      return response.json() as Promise<ApiResponse<AdvanceField>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField', variables.id] })
    },
  })
}

export const useDeleteAdvanceField = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete field')
      }

      return response.json() as Promise<ApiResponse<null>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
    },
  })
}

export const useUpdateFieldStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      customer_id,
    }: {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${id}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, customer_id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update field status')
      }

      return response.json() as Promise<ApiResponse<AdvanceField>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField', variables.id] })
    },
  })
}

export const useLinkFieldProducts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      product_ids,
      customer_id,
    }: {
      id: number
      product_ids: number[]
      customer_id?: number | string | null
    }) => {
      const baseUrl = ensureAbsoluteUrl(`/library/advance/fields/${id}/link-products`)
      const queryParams = new URLSearchParams()
      
      // Add customer_id as query parameter if provided
      if (customer_id) {
        queryParams.append('customer_id', String(customer_id))
      }

      const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ product_ids }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to link products to field')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField', variables.id] })
    },
  })
}

export const useAddFieldOption = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fieldId,
      ...data
    }: {
      fieldId: number
      name: string
      status?: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number | null
      sequence: number
      image?: string
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${fieldId}/options`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add field option')
      }

      return response.json() as Promise<ApiResponse<FieldOption>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField', variables.fieldId] })
    },
  })
}

export const useUpdateFieldOption = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fieldId,
      optionId,
      ...data
    }: {
      fieldId: number
      optionId: number
      name?: string
      status?: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number | null
      sequence?: number
      image?: string
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${fieldId}/options/${optionId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update field option')
      }

      return response.json() as Promise<ApiResponse<FieldOption>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField', variables.fieldId] })
    },
  })
}

export const useDeleteFieldOption = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fieldId,
      optionId,
    }: {
      fieldId: number
      optionId: number
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${fieldId}/options/${optionId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete field option')
      }

      return response.json() as Promise<ApiResponse<null>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
      queryClient.invalidateQueries({ queryKey: ['advanceField', variables.fieldId] })
    },
  })
}

export const useDuplicateAdvanceField = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // First fetch the field to duplicate
      const getResponse = await fetch(ensureAbsoluteUrl(`/library/advance/fields/${id}`), {
        headers: getAuthHeaders(),
      })

      if (!getResponse.ok) {
        const error = await getResponse.json()
        throw new Error(error.message || 'Failed to fetch field for duplication')
      }

      const fieldData = await getResponse.json()
      const field = fieldData.data || fieldData

      // Create a new field with modified name
      const duplicateData: any = {
        name: `${field.name} (Copy)`,
        description: field.description,
        advance_category_id: field.advance_category_id,
        advance_subcategory_id: field.advance_subcategory_id,
        field_type: field.field_type,
        is_required: field.is_required,
        has_additional_pricing: field.has_additional_pricing,
        charge_type: field.charge_type,
        price: field.price,
        charge_scope: field.charge_scope,
        sequence: field.sequence,
      }

      // Duplicate options if they exist
      if (field.options && field.options.length > 0) {
        duplicateData.options = field.options.map((option: FieldOption) => ({
          name: option.name,
          status: option.status,
          is_default: option.is_default,
          price: option.price,
          sequence: option.sequence,
        }))
      }

      const createResponse = await fetch(ensureAbsoluteUrl('/library/advance/fields'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(duplicateData),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.message || 'Failed to duplicate field')
      }

      return createResponse.json() as Promise<ApiResponse<AdvanceField>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceFields'] })
    },
  })
}

// ===== ABUTMENTS =====

export const useAbutments = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['abutments', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params?.q) queryParams.append('q', params.q)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.order_by) queryParams.append('order_by', params.order_by)
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

      // Add customer_id only if role is lab_admin
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            queryParams.append('customer_id', customerId)
          }
        }
      }

      const response = await fetch(`${ensureAbsoluteUrl('/library/abutments')}?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch abutments')
      }

      const result = await response.json()
      // Handle API response structure: { status, message, data: { data: [...], pagination: {...} } }
      if (result.data) {
        // If response has nested data structure
        if (result.data.data && Array.isArray(result.data.data)) {
          return {
            data: result.data.data,
            current_page: result.data.pagination?.current_page || result.data.current_page || 1,
            per_page: result.data.pagination?.per_page || result.data.per_page || 10,
            total: result.data.pagination?.total || result.data.total || 0,
            last_page: result.data.pagination?.last_page || result.data.last_page || 1,
          } as PaginatedResponse<Abutment>
        }
        // If data is directly an array
        if (Array.isArray(result.data)) {
          return result.data as PaginatedResponse<Abutment>
        }
      }
      // Fallback: return result as-is if it matches PaginatedResponse structure
      return result as PaginatedResponse<Abutment>
    },
  })
}

export const useAbutment = (id: number) => {
  return useQuery({
    queryKey: ['abutment', id],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      
      // Add customer_id only if role is lab_admin
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            queryParams.append('customer_id', customerId)
          }
        }
      }

      const url = ensureAbsoluteUrl(`/library/abutments/${id}`)
      const response = await fetch(queryParams.toString() ? `${url}?${queryParams.toString()}` : url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch abutment')
      }

      return response.json() as Promise<ApiResponse<Abutment>>
    },
    enabled: !!id,
  })
}

export const useCreateAbutment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      brand_name: string
      system_name: string
      code: string
      image?: string
      description?: string
      status?: 'Active' | 'Inactive'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_abutment' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
      sequence?: number
      platforms?: Array<{
        name: string
        image?: string
        status?: 'Active' | 'Inactive'
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
    }) => {
      const response = await fetch(ensureAbsoluteUrl('/library/abutments'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create abutment')
      }

      return response.json() as Promise<ApiResponse<Abutment>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
    },
  })
}

export const useUpdateAbutment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      brand_name?: string
      system_name?: string
      code?: string
      image?: string
      description?: string
      status?: 'Active' | 'Inactive'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_abutment' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
      sequence?: number
      platforms?: Array<{
        id?: number
        name?: string
        image?: string
        status?: 'Active' | 'Inactive'
        is_default?: 'Yes' | 'No'
        price?: number | null
        sequence?: number
      }>
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update abutment')
      }

      return response.json() as Promise<ApiResponse<Abutment>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.id] })
    },
  })
}

export const useDeleteAbutment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete abutment')
      }

      return response.json() as Promise<ApiResponse<null>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
    },
  })
}

export const useUpdateAbutmentStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      customer_id,
      price,
    }: {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
      price?: number
    }) => {
      const body: any = { status }
      if (customer_id !== undefined) body.customer_id = customer_id
      if (price !== undefined) body.price = price

      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${id}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update abutment status')
      }

      return response.json() as Promise<ApiResponse<Abutment>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.id] })
    },
  })
}

export const useLinkAbutmentProducts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      product_ids,
    }: {
      id: number
      product_ids: number[]
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${id}/link-products`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ product_ids }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to link products to abutment')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.id] })
    },
  })
}

export const useCreateAbutmentPlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      abutmentId,
      ...data
    }: {
      abutmentId: number
      name: string
      status?: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number | null
      sequence: number
      image?: string
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${abutmentId}/platforms`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create abutment platform')
      }

      return response.json() as Promise<ApiResponse<AbutmentPlatform>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.abutmentId] })
    },
  })
}

export const useUpdateAbutmentPlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      abutmentId,
      platformId,
      ...data
    }: {
      abutmentId: number
      platformId: number
      name?: string
      status?: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number | null
      sequence?: number
      image?: string
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${abutmentId}/platforms/${platformId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update abutment platform')
      }

      return response.json() as Promise<ApiResponse<AbutmentPlatform>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.abutmentId] })
    },
  })
}

export const useDeleteAbutmentPlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      abutmentId,
      platformId,
    }: {
      abutmentId: number
      platformId: number
    }) => {
      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${abutmentId}/platforms/${platformId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete abutment platform')
      }

      return response.json() as Promise<ApiResponse<null>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.abutmentId] })
    },
  })
}

export const useUpdateAbutmentPlatformStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      abutmentId,
      platformId,
      status,
      customer_id,
      price,
    }: {
      abutmentId: number
      platformId: number
      status: 'Active' | 'Inactive'
      customer_id?: number
      price?: number
    }) => {
      const body: any = { status }
      if (customer_id !== undefined) body.customer_id = customer_id
      if (price !== undefined) body.price = price

      const response = await fetch(ensureAbsoluteUrl(`/library/abutments/${abutmentId}/platforms/${platformId}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update abutment platform status')
      }

      return response.json() as Promise<ApiResponse<AbutmentPlatform>>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
      queryClient.invalidateQueries({ queryKey: ['abutment', variables.abutmentId] })
    },
  })
}

export const useDuplicateAbutment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // First fetch the abutment to duplicate
      const getResponse = await fetch(ensureAbsoluteUrl(`/library/abutments/${id}`), {
        headers: getAuthHeaders(),
      })

      if (!getResponse.ok) {
        const error = await getResponse.json()
        throw new Error(error.message || 'Failed to fetch abutment for duplication')
      }

      const abutmentData = await getResponse.json()
      const abutment = abutmentData.data || abutmentData

      // Create a new abutment with modified name and code
      const duplicateData: any = {
        brand_name: abutment.brand_name,
        system_name: `${abutment.system_name} (Copy)`,
        code: `${abutment.code}_COPY`,
        status: abutment.status,
        description: abutment.description,
        has_additional_pricing: abutment.has_additional_pricing,
        charge_type: abutment.charge_type,
        price: abutment.price,
        charge_scope: abutment.charge_scope,
        sequence: abutment.sequence,
      }

      // Duplicate platforms if they exist
      if (abutment.platforms && abutment.platforms.length > 0) {
        duplicateData.platforms = abutment.platforms.map((platform: AbutmentPlatform) => ({
          name: platform.name,
          status: platform.status,
          is_default: platform.is_default,
          price: platform.price,
          sequence: platform.sequence,
        }))
      }

      const createResponse = await fetch(ensureAbsoluteUrl('/library/abutments'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(duplicateData),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.message || 'Failed to duplicate abutment')
      }

      return createResponse.json() as Promise<ApiResponse<Abutment>>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abutments'] })
    },
  })
}

// Utility function for file to base64 conversion
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!validTypes.includes(file.type)) {
    return false
  }

  if (file.size > maxSize) {
    return false
  }

  return true
}
