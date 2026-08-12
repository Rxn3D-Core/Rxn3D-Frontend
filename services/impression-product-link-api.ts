import { resolveLibraryCustomerId } from "@/lib/customer-scope"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

// Helper function to get customer ID for lab library roles
const getCustomerId = (): number | null => resolveLibraryCustomerId()

export interface LinkImpressionProductPayload {
  impression_id: number
  variation_id?: number
}

export interface LinkImpressionProductItemPayload {
  id: number
  impressions: LinkImpressionProductPayload[]
}

export interface LinkImpressionsProductsPayload {
  customer_id: number
  products: LinkImpressionProductItemPayload[]
}

export interface LinkImpressionsProductsResponse {
  success?: boolean
  status?: boolean
  message: string
  data?: any
}

/**
 * Link impressions to products
 * POST /library/impressions/link-products
 */
export const linkImpressionsToProducts = async (
  payload: LinkImpressionsProductsPayload
): Promise<LinkImpressionsProductsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/impressions/link-products`, {
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
      throw new Error(json.message || `Failed to link impressions to products: ${response.status}`)
    }

    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking impressions to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking impressions to products
 */
export const buildImpressionLinkPayload = (
  selectedImpressionIds: number[],
  selectedProductIds: number[],
  products: any[],
  impressions: any[]
): LinkImpressionsProductsPayload => {
  const customerId = getCustomerId()

  if (!customerId) {
    throw new Error('Customer ID not found')
  }

  const productsPayload: LinkImpressionProductItemPayload[] = selectedProductIds.map((productId) => {
    const impressionsPayload: LinkImpressionProductPayload[] = selectedImpressionIds.map((impressionId) => {
      return {
        impression_id: impressionId,
        variation_id: impressionId, // Default to impression_id, adjust if you have variation data
      }
    })

    return {
      id: productId,
      impressions: impressionsPayload,
    }
  })

  return {
    customer_id: customerId,
    products: productsPayload,
  }
}




