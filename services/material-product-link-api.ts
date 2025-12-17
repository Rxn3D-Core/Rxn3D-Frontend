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

export interface LinkMaterialProductPayload {
  material_id: number
  variation_id?: number | null
  price?: number | null
}

export interface LinkMaterialProductItemPayload {
  id: number
  materials: LinkMaterialProductPayload[]
}

export interface LinkMaterialsProductsPayload {
  customer_id?: number
  products: LinkMaterialProductItemPayload[]
}

export interface LinkMaterialsProductsResponse {
  success?: boolean
  status?: boolean
  message: string
  data?: any
}

/**
 * Link materials to products
 * POST /library/materials/link-products
 */
export const linkMaterialsToProducts = async (
  payload: LinkMaterialsProductsPayload
): Promise<LinkMaterialsProductsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/materials/link-products`, {
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
      throw new Error(json.message || `Failed to link materials to products: ${response.status}`)
    }

    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking materials to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking materials to products
 *
 * @param selectedMaterialIds - Array of selected material IDs
 * @param selectedProductIds - Array of selected product IDs
 * @param products - Full product data
 * @param materials - Full material data
 * @param variationSelections - Optional map of product-material combinations to variation IDs
 *                              Key format: "{productId}-{materialId}", Value: variation_id
 * @param uploadedImages - Optional map of uploaded images (for tracking purposes)
 * @param imagePreviews - Optional map of image preview URLs (includes variation image URLs)
 */
export const buildMaterialLinkPayload = (
  selectedMaterialIds: number[],
  selectedProductIds: number[],
  products: any[],
  materials: any[],
  variationSelections?: Record<string, number | null>,
  uploadedImages?: Record<string, File>,
  imagePreviews?: Record<string, string>
): LinkMaterialsProductsPayload => {
  const customerId = getCustomerId()

  if (!customerId) {
    throw new Error('Customer ID not found')
  }

  const productsPayload: LinkMaterialProductItemPayload[] = selectedProductIds.map((productId) => {
    const materialsPayload: LinkMaterialProductPayload[] = selectedMaterialIds.map((materialId) => {
      const imageKey = `${productId}-${materialId}`

      // Check if a specific variation was selected for this product-material combination
      const variationId = variationSelections?.[imageKey] ?? null

      // Get material price from lab_material if available
      const material = materials.find((m: any) => m.id === materialId)
      const price = material?.lab_material?.price ? parseFloat(material.lab_material.price) : null

      return {
        material_id: materialId,
        variation_id: variationId,
        price: price,
      }
    })

    return {
      id: productId,
      materials: materialsPayload,
    }
  })

  return {
    customer_id: customerId,
    products: productsPayload,
  }
}




