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

export interface StageGradePayload {
  grade_id: number
  price: number
}

export interface ProductStagePayload {
  stage_id: number
  variation_id: number
  grades: StageGradePayload[]
}

export interface LinkProductPayload {
  id: number
  stages: ProductStagePayload[]
}

export interface LinkStagesProductsPayload {
  customer_id: number
  products: LinkProductPayload[]
}

export interface LinkStagesProductsResponse {
  success?: boolean
  status?: boolean  // API returns 'status' instead of 'success'
  message: string
  data?: any
}

/**
 * Link stages to products
 * POST /library/stages/link-products
 */
export const linkStagesToProducts = async (
  payload: LinkStagesProductsPayload
): Promise<LinkStagesProductsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/stages/link-products`, {
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
      throw new Error(json.message || `Failed to link stages to products: ${response.status}`)
    }

    // Normalize response - API returns 'status' but we use 'success'
    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking stages to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking stages to products
 * This helper function constructs the payload based on selected stages and products
 */
export const buildLinkPayload = (
  selectedStageIds: number[],
  selectedProductIds: number[],
  products: any[], // Array of products with their stages
  stages: any[], // Array of stages with their details
  gradePrices?: Record<string, number>, // Editable grade prices keyed by `${productId}-${stageId}-${gradeId}`
  selectedVariationIds?: Record<string, number | null>, // Selected variation IDs keyed by `${productId}-${stageId}`
  grades?: any[] // Array of all available grades
): LinkStagesProductsPayload => {
  const customerId = getCustomerId()

  if (!customerId) {
    throw new Error('Customer ID not found')
  }

  // Build products array
  const productsPayload: LinkProductPayload[] = selectedProductIds.map((productId) => {
    const product = products.find((p) => p.id === productId)

    // Build stages array for this product
    const stagesPayload: ProductStagePayload[] = selectedStageIds.map((stageId) => {
      const stage = stages.find((s) => s.id === stageId)

      // Get variation_id from selectedVariationIds or default to null
      const variationKey = `${productId}-${stageId}`
      const variationId = selectedVariationIds?.[variationKey] || null

      // Build grades array - prioritize edited grade prices
      let gradesPayload: StageGradePayload[] = []

      // If we have grades list, use it to build the payload
      if (grades && grades.length > 0) {
        gradesPayload = grades.map((grade) => {
          const gradeKey = `${productId}-${stageId}-${grade.id}`
          // Use edited price if available, otherwise try to get from existing data
          let price = 0
          
          if (gradePrices && gradePrices[gradeKey] !== undefined) {
            // Use edited grade price
            price = gradePrices[gradeKey]
          } else if (product && product.stages) {
            // Try to get from existing product-stage connection
            const existingStage = product.stages.find((s: any) => s.id === stageId)
            if (existingStage && existingStage.grades) {
              const existingGrade = existingStage.grades.find((g: any) => g.grade?.id === grade.id)
              if (existingGrade) {
                price = parseFloat(existingGrade.price) || 0
              }
            }
          } else if (product && product.grades) {
            // Try to get from product grades
            const productGrade = product.grades.find((g: any) => g.id === grade.id)
            if (productGrade) {
              price = parseFloat(productGrade.price) || 0
            }
          } else if (stage && stage.price !== undefined) {
            // Use stage price as default
            price = parseFloat(stage.price as any) || 0
          }

          return {
            grade_id: grade.id,
            price: price,
          }
        })
      } else {
        // Fallback: try to get grades from existing product data
        if (product && product.stages) {
          const existingStage = product.stages.find((s: any) => s.id === stageId)
          if (existingStage && existingStage.grades) {
            gradesPayload = existingStage.grades.map((gradePrice: any) => {
              const gradeKey = `${productId}-${stageId}-${gradePrice.grade?.id || gradePrice.grade_id}`
              const editedPrice = gradePrices?.[gradeKey]
              return {
                grade_id: gradePrice.grade?.id || gradePrice.grade_id,
                price: editedPrice !== undefined ? editedPrice : (parseFloat(gradePrice.price) || 0),
              }
            })
          }
        }

        // If still no grades, use default structure
        if (gradesPayload.length === 0) {
          if (product && product.grades) {
            gradesPayload = product.grades.map((grade: any) => {
              const gradeKey = `${productId}-${stageId}-${grade.id}`
              const editedPrice = gradePrices?.[gradeKey]
              return {
                grade_id: grade.id,
                price: editedPrice !== undefined ? editedPrice : (parseFloat(stage?.price || grade.price || '0')),
              }
            })
          } else if (stage && stage.price !== undefined) {
            // Use stage price as default for all grades (assuming 4 standard grades)
            const defaultPrice = parseFloat(stage.price as any) || 0
            gradesPayload = [
              { grade_id: 1, price: defaultPrice },
              { grade_id: 2, price: defaultPrice },
              { grade_id: 3, price: defaultPrice },
              { grade_id: 4, price: defaultPrice },
            ]
          }
        }
      }

      return {
        stage_id: stageId,
        variation_id: variationId || stageId, // Fallback to stageId if no variation selected
        grades: gradesPayload,
      }
    })

    return {
      id: productId,
      stages: stagesPayload,
    }
  })

  return {
    customer_id: customerId,
    products: productsPayload,
  }
}
