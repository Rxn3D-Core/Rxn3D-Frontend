import { apiClient } from './client'

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
  field_type: string
  is_required: 'Yes' | 'No'
  has_additional_pricing: 'Yes' | 'No'
  charge_type?: 'once_per_field' | 'per_selected_option' | null
  price?: number | null
  charge_scope?: string | null
  sequence: number
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
  allow_user_input: 'Yes' | 'No'
  has_additional_pricing: 'Yes' | 'No'
  charge_type?: 'once_per_field' | 'per_platform_option' | null
  price?: number | null
  charge_scope?: string | null
  platforms?: ImplantPlatform[]
  products?: any[]
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
  allow_user_input: 'Yes' | 'No'
  has_additional_pricing: 'Yes' | 'No'
  charge_type?: 'once_per_field' | 'per_platform_option' | null
  price?: number | null
  charge_scope?: string | null
  platforms?: AbutmentPlatform[]
  products?: any[]
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
}

export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

// ============================================================================
// ADVANCE CATEGORIES API
// ============================================================================

export const advanceCategoriesApi = {
  /**
   * List all advance categories
   */
  list: async (params?: PaginationParams & { is_custom?: 'Yes' | 'No' }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<AdvanceCategory>>>(
      '/library/advance/categories',
      { params }
    )
    return response.data
  },

  /**
   * Get single advance category
   */
  get: async (id: number, customerId?: number) => {
    const response = await apiClient.get<ApiResponse<AdvanceCategory>>(
      `/library/advance/categories/${id}`,
      { params: { customer_id: customerId } }
    )
    return response.data
  },

  /**
   * Create advance category
   */
  create: async (data: {
    name: string
    code: string
    status: 'Active' | 'Inactive'
    sequence?: number
    customer_id?: number | null
    image?: string // base64 encoded
  }) => {
    const response = await apiClient.post<ApiResponse<AdvanceCategory>>(
      '/library/advance/categories',
      data
    )
    return response.data
  },

  /**
   * Update advance category
   */
  update: async (id: number, data: {
    name?: string
    code?: string
    status?: 'Active' | 'Inactive'
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.put<ApiResponse<AdvanceCategory>>(
      `/library/advance/categories/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete advance category
   */
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/advance/categories/${id}`
    )
    return response.data
  },

  /**
   * Link products to category
   */
  linkProducts: async (id: number, productIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/advance/categories/${id}/link-products`,
      { product_ids: productIds }
    )
    return response.data
  },

  /**
   * Link categories to advance category
   */
  linkCategories: async (id: number, categoryIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/advance/categories/${id}/link-categories`,
      { category_ids: categoryIds }
    )
    return response.data
  },

  /**
   * Update category status
   */
  updateStatus: async (id: number, status: 'Active' | 'Inactive', customerId?: number) => {
    const response = await apiClient.patch<ApiResponse<AdvanceCategory>>(
      `/library/advance/categories/${id}/status`,
      { status, customer_id: customerId }
    )
    return response.data
  },
}

// ============================================================================
// ADVANCE SUBCATEGORIES API
// ============================================================================

export const advanceSubcategoriesApi = {
  /**
   * List all advance subcategories
   */
  list: async (params?: PaginationParams & {
    advance_category_id?: number
    is_custom?: 'Yes' | 'No'
  }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<AdvanceSubcategory>>>(
      '/library/advance/subcategories',
      { params }
    )
    return response.data
  },

  /**
   * Get single advance subcategory
   */
  get: async (id: number, customerId?: number) => {
    const response = await apiClient.get<ApiResponse<AdvanceSubcategory>>(
      `/library/advance/subcategories/${id}`,
      { params: { customer_id: customerId } }
    )
    return response.data
  },

  /**
   * Create advance subcategory
   */
  create: async (data: {
    name: string
    code: string
    advance_category_id: number
    status: 'Active' | 'Inactive'
    sequence?: number
    customer_id?: number | null
    image?: string
  }) => {
    const response = await apiClient.post<ApiResponse<AdvanceSubcategory>>(
      '/library/advance/subcategories',
      data
    )
    return response.data
  },

  /**
   * Update advance subcategory
   */
  update: async (id: number, data: {
    name?: string
    code?: string
    advance_category_id?: number
    status?: 'Active' | 'Inactive'
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.put<ApiResponse<AdvanceSubcategory>>(
      `/library/advance/subcategories/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete advance subcategory
   */
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/advance/subcategories/${id}`
    )
    return response.data
  },

  /**
   * Link products to subcategory
   */
  linkProducts: async (id: number, productIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/advance/subcategories/${id}/link-products`,
      { product_ids: productIds }
    )
    return response.data
  },

  /**
   * Link categories to subcategory
   */
  linkCategories: async (id: number, categoryIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/advance/subcategories/${id}/link-categories`,
      { category_ids: categoryIds }
    )
    return response.data
  },

  /**
   * Update subcategory status
   */
  updateStatus: async (id: number, status: 'Active' | 'Inactive', customerId?: number) => {
    const response = await apiClient.patch<ApiResponse<AdvanceSubcategory>>(
      `/library/advance/subcategories/${id}/status`,
      { status, customer_id: customerId }
    )
    return response.data
  },
}

// ============================================================================
// ADVANCE FIELDS API
// ============================================================================

export const advanceFieldsApi = {
  /**
   * List all advance fields
   */
  list: async (params?: PaginationParams & {
    advance_category_id?: number
    advance_subcategory_id?: number
    field_type?: string
    is_custom?: 'Yes' | 'No'
  }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<AdvanceField>>>(
      '/library/advance/fields',
      { params }
    )
    return response.data
  },

  /**
   * Get single advance field
   */
  get: async (id: number, customerId?: number) => {
    const response = await apiClient.get<ApiResponse<AdvanceField>>(
      `/library/advance/fields/${id}`,
      { params: { customer_id: customerId } }
    )
    return response.data
  },

  /**
   * Create advance field
   */
  create: async (data: {
    name: string
    description?: string
    field_type: string
    is_required: 'Yes' | 'No'
    has_additional_pricing: 'Yes' | 'No'
    charge_type?: 'once_per_field' | 'per_selected_option'
    price?: number
    charge_scope?: string
    advance_category_id: number
    advance_subcategory_id?: number
    sequence?: number
    customer_id?: number | null
    image?: string
    options?: {
      name: string
      status: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
      image?: string
    }[]
  }) => {
    const response = await apiClient.post<ApiResponse<AdvanceField>>(
      '/library/advance/fields',
      data
    )
    return response.data
  },

  /**
   * Update advance field
   */
  update: async (id: number, data: {
    name?: string
    description?: string
    is_required?: 'Yes' | 'No'
    has_additional_pricing?: 'Yes' | 'No'
    charge_type?: 'once_per_field' | 'per_selected_option'
    price?: number
    charge_scope?: string
    sequence?: number
    image?: string
    options?: {
      id?: number
      name: string
      status: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
      image?: string
    }[]
  }) => {
    const response = await apiClient.put<ApiResponse<AdvanceField>>(
      `/library/advance/fields/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete advance field
   */
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/advance/fields/${id}`
    )
    return response.data
  },

  /**
   * Link products to field
   */
  linkProducts: async (id: number, productIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/advance/fields/${id}/link-products`,
      { product_ids: productIds }
    )
    return response.data
  },

  /**
   * Add field option
   */
  addOption: async (fieldId: number, data: {
    name: string
    status: 'Active' | 'Inactive'
    is_default?: 'Yes' | 'No'
    price?: number
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.post<ApiResponse<FieldOption>>(
      `/library/advance/fields/${fieldId}/options`,
      data
    )
    return response.data
  },

  /**
   * Update field option
   */
  updateOption: async (fieldId: number, optionId: number, data: {
    name?: string
    status?: 'Active' | 'Inactive'
    is_default?: 'Yes' | 'No'
    price?: number
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.put<ApiResponse<FieldOption>>(
      `/library/advance/fields/${fieldId}/options/${optionId}`,
      data
    )
    return response.data
  },

  /**
   * Delete field option
   */
  deleteOption: async (fieldId: number, optionId: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/advance/fields/${fieldId}/options/${optionId}`
    )
    return response.data
  },

  /**
   * Update field status
   */
  updateStatus: async (id: number, status: 'Active' | 'Inactive', customerId?: number) => {
    const response = await apiClient.patch<ApiResponse<AdvanceField>>(
      `/library/advance/fields/${id}/status`,
      { status, customer_id: customerId }
    )
    return response.data
  },
}

// ============================================================================
// IMPLANTS API
// ============================================================================

export const implantsApi = {
  /**
   * List all implants
   */
  list: async (params?: PaginationParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Implant>>>(
      '/library/implants',
      { params }
    )
    return response.data
  },

  /**
   * Get single implant
   */
  get: async (id: number, customerId?: number) => {
    const response = await apiClient.get<ApiResponse<Implant>>(
      `/library/implants/${id}`,
      { params: { customer_id: customerId } }
    )
    return response.data
  },

  /**
   * Create implant
   */
  create: async (data: {
    brand_name: string
    system_name: string
    code: string
    status: 'Active' | 'Inactive'
    description?: string
    allow_user_input?: 'Yes' | 'No'
    has_additional_pricing?: 'Yes' | 'No'
    charge_type?: 'once_per_field' | 'per_platform_option'
    price?: number
    charge_scope?: string
    image?: string
    platforms?: {
      name: string
      status: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
      image?: string
    }[]
  }) => {
    const response = await apiClient.post<ApiResponse<Implant>>(
      '/library/implants',
      data
    )
    return response.data
  },

  /**
   * Update implant
   */
  update: async (id: number, data: {
    brand_name?: string
    system_name?: string
    code?: string
    status?: 'Active' | 'Inactive'
    description?: string
    allow_user_input?: 'Yes' | 'No'
    has_additional_pricing?: 'Yes' | 'No'
    charge_type?: 'once_per_field' | 'per_platform_option'
    price?: number
    charge_scope?: string
    image?: string
    platforms?: {
      id?: number
      name: string
      status: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
      image?: string
    }[]
  }) => {
    const response = await apiClient.put<ApiResponse<Implant>>(
      `/library/implants/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete implant
   */
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/implants/${id}`
    )
    return response.data
  },

  /**
   * Add platform to implant
   */
  addPlatform: async (implantId: number, data: {
    name: string
    status: 'Active' | 'Inactive'
    is_default?: 'Yes' | 'No'
    price?: number
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.post<ApiResponse<ImplantPlatform>>(
      `/library/implants/${implantId}/platforms`,
      data
    )
    return response.data
  },

  /**
   * Update platform
   */
  updatePlatform: async (implantId: number, platformId: number, data: {
    name?: string
    status?: 'Active' | 'Inactive'
    is_default?: 'Yes' | 'No'
    price?: number
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.put<ApiResponse<ImplantPlatform>>(
      `/library/implants/${implantId}/platforms/${platformId}`,
      data
    )
    return response.data
  },

  /**
   * Delete platform
   */
  deletePlatform: async (implantId: number, platformId: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/implants/${implantId}/platforms/${platformId}`
    )
    return response.data
  },

  /**
   * Link products to implant
   */
  linkProducts: async (id: number, productIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/implants/${id}/link-products`,
      { product_ids: productIds }
    )
    return response.data
  },

  /**
   * Update implant status
   */
  updateStatus: async (id: number, status: 'Active' | 'Inactive', customerId?: number, price?: number) => {
    const response = await apiClient.patch<ApiResponse<Implant>>(
      `/library/implants/${id}/status`,
      { status, customer_id: customerId, price }
    )
    return response.data
  },

  /**
   * Update platform status
   */
  updatePlatformStatus: async (
    implantId: number,
    platformId: number,
    status: 'Active' | 'Inactive',
    customerId?: number,
    price?: number
  ) => {
    const response = await apiClient.patch<ApiResponse<ImplantPlatform>>(
      `/library/implants/${implantId}/platforms/${platformId}/status`,
      { status, customer_id: customerId, price }
    )
    return response.data
  },
}

// ============================================================================
// ABUTMENTS API
// ============================================================================

export const abutmentsApi = {
  /**
   * List all abutments
   */
  list: async (params?: PaginationParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Abutment>>>(
      '/library/abutments',
      { params }
    )
    return response.data
  },

  /**
   * Get single abutment
   */
  get: async (id: number, customerId?: number) => {
    const response = await apiClient.get<ApiResponse<Abutment>>(
      `/library/abutments/${id}`,
      { params: { customer_id: customerId } }
    )
    return response.data
  },

  /**
   * Create abutment
   */
  create: async (data: {
    brand_name: string
    system_name: string
    code: string
    status: 'Active' | 'Inactive'
    description?: string
    allow_user_input?: 'Yes' | 'No'
    has_additional_pricing?: 'Yes' | 'No'
    charge_type?: 'once_per_field' | 'per_platform_option'
    price?: number
    charge_scope?: string
    image?: string
    platforms?: {
      name: string
      status: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
      image?: string
    }[]
  }) => {
    const response = await apiClient.post<ApiResponse<Abutment>>(
      '/library/abutments',
      data
    )
    return response.data
  },

  /**
   * Update abutment
   */
  update: async (id: number, data: {
    brand_name?: string
    system_name?: string
    code?: string
    status?: 'Active' | 'Inactive'
    description?: string
    allow_user_input?: 'Yes' | 'No'
    has_additional_pricing?: 'Yes' | 'No'
    charge_type?: 'once_per_field' | 'per_platform_option'
    price?: number
    charge_scope?: string
    image?: string
    platforms?: {
      id?: number
      name: string
      status: 'Active' | 'Inactive'
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
      image?: string
    }[]
  }) => {
    const response = await apiClient.put<ApiResponse<Abutment>>(
      `/library/abutments/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete abutment
   */
  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/abutments/${id}`
    )
    return response.data
  },

  /**
   * Add platform to abutment
   */
  addPlatform: async (abutmentId: number, data: {
    name: string
    status: 'Active' | 'Inactive'
    is_default?: 'Yes' | 'No'
    price?: number
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.post<ApiResponse<AbutmentPlatform>>(
      `/library/abutments/${abutmentId}/platforms`,
      data
    )
    return response.data
  },

  /**
   * Update platform
   */
  updatePlatform: async (abutmentId: number, platformId: number, data: {
    name?: string
    status?: 'Active' | 'Inactive'
    is_default?: 'Yes' | 'No'
    price?: number
    sequence?: number
    image?: string
  }) => {
    const response = await apiClient.put<ApiResponse<AbutmentPlatform>>(
      `/library/abutments/${abutmentId}/platforms/${platformId}`,
      data
    )
    return response.data
  },

  /**
   * Delete platform
   */
  deletePlatform: async (abutmentId: number, platformId: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/library/abutments/${abutmentId}/platforms/${platformId}`
    )
    return response.data
  },

  /**
   * Link products to abutment
   */
  linkProducts: async (id: number, productIds: number[]) => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/library/abutments/${id}/link-products`,
      { product_ids: productIds }
    )
    return response.data
  },

  /**
   * Update abutment status
   */
  updateStatus: async (id: number, status: 'Active' | 'Inactive', customerId?: number, price?: number) => {
    const response = await apiClient.patch<ApiResponse<Abutment>>(
      `/library/abutments/${id}/status`,
      { status, customer_id: customerId, price }
    )
    return response.data
  },

  /**
   * Update platform status
   */
  updatePlatformStatus: async (
    abutmentId: number,
    platformId: number,
    status: 'Active' | 'Inactive',
    customerId?: number,
    price?: number
  ) => {
    const response = await apiClient.patch<ApiResponse<AbutmentPlatform>>(
      `/library/abutments/${abutmentId}/platforms/${platformId}/status`,
      { status, customer_id: customerId, price }
    )
    return response.data
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert file to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file
 */
export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.')
  }

  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB.')
  }

  return true
}
