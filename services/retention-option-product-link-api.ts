const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

// Helper function to get customer ID
const getCustomerId = () => {
  if (typeof window === 'undefined') return null

  const role = localStorage.getItem('role')
  const isLabAdmin = role === 'lab_admin'
  const isSuperAdmin = role === 'superadmin'
  const isOfficeAdmin = role === 'office_admin'
  const isDoctor = role === 'doctor'

  if (isOfficeAdmin || isDoctor) {
    const selectedLabId = localStorage.getItem('selectedLabId')
    if (selectedLabId) {
      return Number(selectedLabId)
    }
  } else if (isLabAdmin || isSuperAdmin) {
    const customerId = localStorage.getItem('customerId')
    if (customerId) {
      return parseInt(customerId, 10)
    }
  }

  return null
}

export interface LinkRetentionOptionProductPayload {
  product_id: number
  status?: "Active" | "Inactive"
  sequence?: number
}

export interface LinkRetentionOptionCategoryPayload {
  category_id: number
  status?: "Active" | "Inactive"
  sequence?: number
}

export interface LinkRetentionOptionItemPayload {
  id: number
  products: LinkRetentionOptionProductPayload[]
  categories: LinkRetentionOptionCategoryPayload[]
}

export interface LinkRetentionOptionsProductsCategoriesPayload {
  customer_id?: number | null // Optional: for super admin to specify lab, optional for labs
  retention_options: LinkRetentionOptionItemPayload[]
}

export interface LinkRetentionOptionsProductsCategoriesResponse {
  success?: boolean
  status?: boolean
  message: string
  data?: any
}

/**
 * Link retention options to products and categories
 * POST /api/v1/library/retention-options/link-products-categories
 */
export const linkRetentionOptionsToProductsCategories = async (
  payload: LinkRetentionOptionsProductsCategoriesPayload
): Promise<LinkRetentionOptionsProductsCategoriesResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/retention-options/link-products-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized - Redirecting to login')
    }

    const json = await response.json()

    if (!response.ok) {
      throw new Error(json.message || `Failed to link retention options to products: ${response.status}`)
    }

    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking retention options to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking retention options to products
 * @param selectedRetentionOptionIds - Array of selected retention option IDs
 * @param selectedProductIds - Array of selected product IDs
 * @param products - Array of product objects
 * @param retentionOptions - Array of retention option objects
 */
export const buildRetentionOptionLinkPayload = (
  selectedRetentionOptionIds: number[],
  selectedProductIds: number[],
  products: any[],
  retentionOptions: any[]
): LinkRetentionOptionsProductsCategoriesPayload => {
  // Get customer ID and role
  const customerId = getCustomerId()
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const isLabAdmin = role === 'lab_admin'
  const isSuperAdmin = role === 'superadmin'

  // For lab_admin, customer_id is required
  if (isLabAdmin && !customerId) {
    throw new Error('Customer ID is required for lab_admin role')
  }

  // For super admin, customer_id is optional (can be null)
  // For lab_admin, customer_id is required and must be included
  // For other roles, include customer_id if available
  const payload: LinkRetentionOptionsProductsCategoriesPayload = {
    ...(customerId ? { customer_id: customerId } : {}),
    retention_options: [],
  }

  const retentionOptionsPayload: LinkRetentionOptionItemPayload[] = selectedRetentionOptionIds.map((retentionOptionId, index) => {
    const productsPayload: LinkRetentionOptionProductPayload[] = selectedProductIds.map((productId, seqIndex) => {
      return {
        product_id: productId,
        status: "Active" as const,
        sequence: seqIndex + 1,
      }
    })

    return {
      id: retentionOptionId,
      products: productsPayload,
      categories: [], // Empty categories array for now
    }
  })

  payload.retention_options = retentionOptionsPayload
  return payload
}









