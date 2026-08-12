import { resolveLibraryCustomerId, isLabLibraryRole } from "@/lib/customer-scope"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

// Helper function to get customer ID for lab library roles
const getCustomerId = (): number | null => resolveLibraryCustomerId()

export interface LinkRetentionProductPayload {
  retention_id: number
  price?: number | null // Optional price (0-999999.99)
}

export interface LinkRetentionProductItemPayload {
  id: number
  retentions: LinkRetentionProductPayload[]
}

export interface LinkRetentionsProductsPayload {
  customer_id?: number | null // Optional: for super admin to specify lab, optional for labs
  products: LinkRetentionProductItemPayload[]
}

export interface LinkRetentionsProductsResponse {
  success?: boolean
  status?: boolean
  message: string
  data?: any
}

/**
 * Link retentions to products
 * POST /library/retentions/link-products
 */
export const linkRetentionsToProducts = async (
  payload: LinkRetentionsProductsPayload
): Promise<LinkRetentionsProductsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/retentions/link-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 401) {
      window.location.href = '/login'
      throw new Error('Unauthorized - Redirecting to login')
    }

    const json = await response.json()

    if (!response.ok) {
      throw new Error(json.message || `Failed to link retentions to products: ${response.status}`)
    }

    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking retentions to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking retentions to products
 * @param selectedRetentionIds - Array of selected retention IDs
 * @param selectedProductIds - Array of selected product IDs
 * @param products - Array of product objects
 * @param retentions - Array of retention objects
 * @param retentionPrices - Optional map of prices: key format `${productId}-${retentionId}`, value is price (number)
 */
export const buildRetentionLinkPayload = (
  selectedRetentionIds: number[],
  selectedProductIds: number[],
  products: any[],
  retentions: any[],
  retentionPrices?: Record<string, number>
): LinkRetentionsProductsPayload => {
  const customerId = getCustomerId()
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null

  // For lab library roles, customer_id is required
  if (isLabLibraryRole(role) && !customerId) {
    throw new Error('Customer ID is required for lab library roles')
  }

  const payload: LinkRetentionsProductsPayload = {
    ...(customerId ? { customer_id: customerId } : {}),
    products: [],
  }

  const productsPayload: LinkRetentionProductItemPayload[] = selectedProductIds.map((productId) => {
    const retentionsPayload: LinkRetentionProductPayload[] = selectedRetentionIds.map((retentionId) => {
      // Get price from retentionPrices map if available
      const priceKey = `${productId}-${retentionId}`
      const price = retentionPrices?.[priceKey] !== undefined ? retentionPrices[priceKey] : null

      return {
        retention_id: retentionId,
        price: price !== null && price !== undefined ? price : null, // Can be null if not set
      }
    })

    return {
      id: productId,
      retentions: retentionsPayload,
    }
  })

  payload.products = productsPayload
  return payload
}




