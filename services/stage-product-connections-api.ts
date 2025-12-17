const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

// Type definitions based on the API response
export interface Grade {
  id: number
  name: string
  code: string
}

export interface GradePrice {
  grade: Grade
  price: number
  status: string
}

export interface Product {
  id: number
  name: string
  code: string
}

export interface Stage {
  id: number
  name: string
  code: string
  sequence: number
}

export interface LabData {
  id: number
  sequence: number
  price: number
  days: number | null
  is_releasing_stage: string
  status: string
}

export interface GlobalData {
  id: number
  status: string
  sequence: number
  stage_variation_id: number | null
}

export interface StageProductConnection {
  product: Product
  stage_variation: any | null
  lab_data: LabData
  global_data: GlobalData | null
  grades: GradePrice[]
}

export interface StageWithProducts {
  stage: Stage
  products: StageProductConnection[]
}

export interface StageProductConnectionsResponse {
  status: boolean
  message: string
  data: StageWithProducts[]
}

/**
 * Fetch stage-product connections from the API
 * GET /library/stages/product-connections?customer_id={id} (optional)
 */
export const fetchStageProductConnections = async (
  customerId?: number | null
): Promise<StageProductConnectionsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    // Build URL with optional customer_id parameter
    let url = `${API_BASE_URL}/library/stages/product-connections`
    if (customerId !== null && customerId !== undefined) {
      url += `?customer_id=${customerId}`
    }

    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (response.status === 401) {
      window.location.href = '/login'
      throw new Error('Unauthorized - Redirecting to login')
    }

    const json = await response.json()

    if (!response.ok) {
      const errorMessage = json.message || json.error || `Failed to fetch stage-product connections: ${response.status}`
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: json
      })
      throw new Error(errorMessage)
    }

    return json
  } catch (error: any) {
    console.error('Error fetching stage-product connections:', error)
    throw error
  }
}
