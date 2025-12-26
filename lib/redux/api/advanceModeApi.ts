import { apiSlice } from "./apiSlice"

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

// Advance Mode API
export const advanceModeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== CATEGORIES =====
    getAdvanceCategories: builder.query<PaginatedResponse<AdvanceCategory>, PaginationParams>({
      query: (params = {}) => {
        // Get role and customerId from localStorage for lab_admin
        let customerId = params.customer_id
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
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params.q) queryParams.append('q', params.q)
        if (params.status) queryParams.append('status', params.status)
        if (params.order_by) queryParams.append('order_by', params.order_by)
        if (params.sort_by) queryParams.append('sort_by', params.sort_by)
        // Add customer_id if role is lab_admin and customerId is available
        if (customerId) queryParams.append('customer_id', customerId.toString())

        return `/library/advance/categories?${queryParams.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'AdvanceCategories' as const, id })),
              { type: 'AdvanceCategories', id: 'LIST' },
            ]
          : [{ type: 'AdvanceCategories', id: 'LIST' }],
    }),

    getAdvanceCategory: builder.query<ApiResponse<AdvanceCategory>, number>({
      query: (id) => `/library/advance/categories/${id}`,
      providesTags: (result, error, id) => [{ type: 'AdvanceCategories', id }],
    }),

    createAdvanceCategory: builder.mutation<ApiResponse<AdvanceCategory>, {
      name: string
      code: string
      image?: string
      customer_id?: number | null
    }>({
      query: (data) => ({
        url: '/library/advance/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'AdvanceCategories', id: 'LIST' }],
    }),

    updateAdvanceCategory: builder.mutation<ApiResponse<AdvanceCategory>, {
      id: number
      name?: string
      code?: string
      image?: string
      sequence?: number
    }>({
      query: ({ id, ...data }) => ({
        url: `/library/advance/categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdvanceCategories', id },
        { type: 'AdvanceCategories', id: 'LIST' },
      ],
    }),

    deleteAdvanceCategory: builder.mutation<ApiResponse<null>, number>({
      query: (id) => ({
        url: `/library/advance/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'AdvanceCategories', id },
        { type: 'AdvanceCategories', id: 'LIST' },
      ],
    }),

    linkCategoryProducts: builder.mutation<ApiResponse<null>, {
      id: number
      product_ids: number[]
    }>({
      query: ({ id, product_ids }) => ({
        url: `/library/advance/categories/${id}/link-products`,
        method: 'POST',
        body: { product_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'AdvanceCategories', id }],
    }),

    linkCategoryToCategories: builder.mutation<ApiResponse<null>, {
      id: number
      category_ids: number[]
    }>({
      query: ({ id, category_ids }) => ({
        url: `/library/advance/categories/${id}/link-categories`,
        method: 'POST',
        body: { category_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'AdvanceCategories', id }],
    }),

    updateCategoryStatus: builder.mutation<ApiResponse<AdvanceCategory>, {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
    }>({
      query: ({ id, status, customer_id }) => ({
        url: `/library/advance/categories/${id}/status`,
        method: 'PATCH',
        body: { status, customer_id },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdvanceCategories', id },
        { type: 'AdvanceCategories', id: 'LIST' },
      ],
    }),

    // ===== SUBCATEGORIES =====
    getAdvanceSubcategories: builder.query<PaginatedResponse<AdvanceSubcategory>, PaginationParams & { advance_category_id?: number }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params.q) queryParams.append('q', params.q)
        if (params.status) queryParams.append('status', params.status)
        if (params.order_by) queryParams.append('order_by', params.order_by)
        if (params.sort_by) queryParams.append('sort_by', params.sort_by)
        if (params.customer_id) queryParams.append('customer_id', params.customer_id.toString())
        if (params.advance_category_id) queryParams.append('advance_category_id', params.advance_category_id.toString())

        return `/library/advance/subcategories?${queryParams.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'AdvanceSubcategories' as const, id })),
              { type: 'AdvanceSubcategories', id: 'LIST' },
            ]
          : [{ type: 'AdvanceSubcategories', id: 'LIST' }],
    }),

    getAdvanceSubcategory: builder.query<ApiResponse<AdvanceSubcategory>, number>({
      query: (id) => `/library/advance/subcategories/${id}`,
      providesTags: (result, error, id) => [{ type: 'AdvanceSubcategories', id }],
    }),

    createAdvanceSubcategory: builder.mutation<ApiResponse<AdvanceSubcategory>, {
      name: string
      code: string
      advance_category_id: number
      image?: string
      customer_id?: number | null
    }>({
      query: (data) => ({
        url: '/library/advance/subcategories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'AdvanceSubcategories', id: 'LIST' }],
    }),

    updateAdvanceSubcategory: builder.mutation<ApiResponse<AdvanceSubcategory>, {
      id: number
      name?: string
      code?: string
      advance_category_id?: number
      image?: string
      sequence?: number
    }>({
      query: ({ id, ...data }) => ({
        url: `/library/advance/subcategories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdvanceSubcategories', id },
        { type: 'AdvanceSubcategories', id: 'LIST' },
      ],
    }),

    deleteAdvanceSubcategory: builder.mutation<ApiResponse<null>, number>({
      query: (id) => ({
        url: `/library/advance/subcategories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'AdvanceSubcategories', id },
        { type: 'AdvanceSubcategories', id: 'LIST' },
      ],
    }),

    linkSubcategoryProducts: builder.mutation<ApiResponse<null>, {
      id: number
      product_ids: number[]
    }>({
      query: ({ id, product_ids }) => ({
        url: `/library/advance/subcategories/${id}/link-products`,
        method: 'POST',
        body: { product_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'AdvanceSubcategories', id }],
    }),

    updateSubcategoryStatus: builder.mutation<ApiResponse<AdvanceSubcategory>, {
      id: number
      status: 'Active' | 'Inactive'
      customer_id?: number
    }>({
      query: ({ id, status, customer_id }) => ({
        url: `/library/advance/subcategories/${id}/status`,
        method: 'PATCH',
        body: { status, customer_id },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdvanceSubcategories', id },
        { type: 'AdvanceSubcategories', id: 'LIST' },
      ],
    }),

    // ===== FIELDS =====
    getAdvanceFields: builder.query<PaginatedResponse<AdvanceField>, PaginationParams & {
      advance_category_id?: number
      advance_subcategory_id?: number
    }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params.q) queryParams.append('q', params.q)
        if (params.status) queryParams.append('status', params.status)
        if (params.order_by) queryParams.append('order_by', params.order_by)
        if (params.sort_by) queryParams.append('sort_by', params.sort_by)
        if (params.advance_category_id) queryParams.append('advance_category_id', params.advance_category_id.toString())
        if (params.advance_subcategory_id) queryParams.append('advance_subcategory_id', params.advance_subcategory_id.toString())

        return `/library/advance/fields?${queryParams.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'AdvanceFields' as const, id })),
              { type: 'AdvanceFields', id: 'LIST' },
            ]
          : [{ type: 'AdvanceFields', id: 'LIST' }],
    }),

    getAdvanceField: builder.query<ApiResponse<AdvanceField>, number>({
      query: (id) => `/library/advance/fields/${id}`,
      providesTags: (result, error, id) => [{ type: 'AdvanceFields', id }],
    }),

    createAdvanceField: builder.mutation<ApiResponse<AdvanceField>, {
      name: string
      description?: string
      image?: string
      advance_category_id: number
      advance_subcategory_id?: number | null
      field_type: string
      is_required?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_selected_option' | null
      price?: number | null
      charge_scope?: string | null
      options?: Array<{
        name: string
        image?: string
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
    }>({
      query: (data) => ({
        url: '/library/advance/fields',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'AdvanceFields', id: 'LIST' }],
    }),

    updateAdvanceField: builder.mutation<ApiResponse<AdvanceField>, {
      id: number
      name?: string
      description?: string
      image?: string
      advance_category_id?: number
      advance_subcategory_id?: number | null
      field_type?: string
      is_required?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_selected_option' | null
      price?: number | null
      charge_scope?: string | null
      sequence?: number
    }>({
      query: ({ id, ...data }) => ({
        url: `/library/advance/fields/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdvanceFields', id },
        { type: 'AdvanceFields', id: 'LIST' },
      ],
    }),

    deleteAdvanceField: builder.mutation<ApiResponse<null>, number>({
      query: (id) => ({
        url: `/library/advance/fields/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'AdvanceFields', id },
        { type: 'AdvanceFields', id: 'LIST' },
      ],
    }),

    linkFieldProducts: builder.mutation<ApiResponse<null>, {
      id: number
      product_ids: number[]
    }>({
      query: ({ id, product_ids }) => ({
        url: `/library/advance/fields/${id}/link-products`,
        method: 'POST',
        body: { product_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'AdvanceFields', id }],
    }),

    // Field Options
    addFieldOption: builder.mutation<ApiResponse<FieldOption>, {
      field_id: number
      name: string
      image?: string
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
    }>({
      query: ({ field_id, ...data }) => ({
        url: `/library/advance/fields/${field_id}/options`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { field_id }) => [{ type: 'AdvanceFields', id: field_id }],
    }),

    updateFieldOption: builder.mutation<ApiResponse<FieldOption>, {
      field_id: number
      option_id: number
      name?: string
      image?: string
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
    }>({
      query: ({ field_id, option_id, ...data }) => ({
        url: `/library/advance/fields/${field_id}/options/${option_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { field_id }) => [{ type: 'AdvanceFields', id: field_id }],
    }),

    deleteFieldOption: builder.mutation<ApiResponse<null>, {
      field_id: number
      option_id: number
    }>({
      query: ({ field_id, option_id }) => ({
        url: `/library/advance/fields/${field_id}/options/${option_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { field_id }) => [{ type: 'AdvanceFields', id: field_id }],
    }),

    updateFieldOptionStatus: builder.mutation<ApiResponse<FieldOption>, {
      field_id: number
      option_id: number
      status: 'Active' | 'Inactive'
    }>({
      query: ({ field_id, option_id, status }) => ({
        url: `/library/advance/fields/${field_id}/options/${option_id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { field_id }) => [{ type: 'AdvanceFields', id: field_id }],
    }),

    // ===== IMPLANTS =====
    getImplants: builder.query<PaginatedResponse<Implant>, PaginationParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params.q) queryParams.append('q', params.q)
        if (params.status) queryParams.append('status', params.status)
        if (params.order_by) queryParams.append('order_by', params.order_by)
        if (params.sort_by) queryParams.append('sort_by', params.sort_by)

        return `/library/implants?${queryParams.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Implants' as const, id })),
              { type: 'Implants', id: 'LIST' },
            ]
          : [{ type: 'Implants', id: 'LIST' }],
    }),

    getImplant: builder.query<ApiResponse<Implant>, number>({
      query: (id) => `/library/implants/${id}`,
      providesTags: (result, error, id) => [{ type: 'Implants', id }],
    }),

    createImplant: builder.mutation<ApiResponse<Implant>, {
      brand_name: string
      system_name: string
      code: string
      image?: string
      description?: string
      allow_user_input?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
      platforms?: Array<{
        name: string
        image?: string
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
    }>({
      query: (data) => ({
        url: '/library/implants',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Implants', id: 'LIST' }],
    }),

    updateImplant: builder.mutation<ApiResponse<Implant>, {
      id: number
      brand_name?: string
      system_name?: string
      code?: string
      image?: string
      description?: string
      allow_user_input?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
    }>({
      query: ({ id, ...data }) => ({
        url: `/library/implants/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Implants', id },
        { type: 'Implants', id: 'LIST' },
      ],
    }),

    deleteImplant: builder.mutation<ApiResponse<null>, number>({
      query: (id) => ({
        url: `/library/implants/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Implants', id },
        { type: 'Implants', id: 'LIST' },
      ],
    }),

    linkImplantProducts: builder.mutation<ApiResponse<null>, {
      id: number
      product_ids: number[]
    }>({
      query: ({ id, product_ids }) => ({
        url: `/library/implants/${id}/link-products`,
        method: 'POST',
        body: { product_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Implants', id }],
    }),

    updateImplantStatus: builder.mutation<ApiResponse<Implant>, {
      id: number
      status: 'Active' | 'Inactive'
    }>({
      query: ({ id, status }) => ({
        url: `/library/implants/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Implants', id },
        { type: 'Implants', id: 'LIST' },
      ],
    }),

    // Implant Platforms
    addImplantPlatform: builder.mutation<ApiResponse<ImplantPlatform>, {
      implant_id: number
      name: string
      image?: string
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
    }>({
      query: ({ implant_id, ...data }) => ({
        url: `/library/implants/${implant_id}/platforms`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { implant_id }) => [{ type: 'Implants', id: implant_id }],
    }),

    updateImplantPlatform: builder.mutation<ApiResponse<ImplantPlatform>, {
      implant_id: number
      platform_id: number
      name?: string
      image?: string
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
    }>({
      query: ({ implant_id, platform_id, ...data }) => ({
        url: `/library/implants/${implant_id}/platforms/${platform_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { implant_id }) => [{ type: 'Implants', id: implant_id }],
    }),

    deleteImplantPlatform: builder.mutation<ApiResponse<null>, {
      implant_id: number
      platform_id: number
    }>({
      query: ({ implant_id, platform_id }) => ({
        url: `/library/implants/${implant_id}/platforms/${platform_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { implant_id }) => [{ type: 'Implants', id: implant_id }],
    }),

    updateImplantPlatformStatus: builder.mutation<ApiResponse<ImplantPlatform>, {
      implant_id: number
      platform_id: number
      status: 'Active' | 'Inactive'
    }>({
      query: ({ implant_id, platform_id, status }) => ({
        url: `/library/implants/${implant_id}/platforms/${platform_id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { implant_id }) => [{ type: 'Implants', id: implant_id }],
    }),

    // ===== ABUTMENTS =====
    getAbutments: builder.query<PaginatedResponse<Abutment>, PaginationParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params.q) queryParams.append('q', params.q)
        if (params.status) queryParams.append('status', params.status)
        if (params.order_by) queryParams.append('order_by', params.order_by)
        if (params.sort_by) queryParams.append('sort_by', params.sort_by)

        return `/library/abutments?${queryParams.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Abutments' as const, id })),
              { type: 'Abutments', id: 'LIST' },
            ]
          : [{ type: 'Abutments', id: 'LIST' }],
    }),

    getAbutment: builder.query<ApiResponse<Abutment>, number>({
      query: (id) => `/library/abutments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Abutments', id }],
    }),

    createAbutment: builder.mutation<ApiResponse<Abutment>, {
      brand_name: string
      system_name: string
      code: string
      image?: string
      description?: string
      allow_user_input?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
      platforms?: Array<{
        name: string
        image?: string
        is_default?: 'Yes' | 'No'
        price?: number
        sequence?: number
      }>
    }>({
      query: (data) => ({
        url: '/library/abutments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Abutments', id: 'LIST' }],
    }),

    updateAbutment: builder.mutation<ApiResponse<Abutment>, {
      id: number
      brand_name?: string
      system_name?: string
      code?: string
      image?: string
      description?: string
      allow_user_input?: 'Yes' | 'No'
      has_additional_pricing?: 'Yes' | 'No'
      charge_type?: 'once_per_field' | 'per_platform_option' | null
      price?: number | null
      charge_scope?: string | null
    }>({
      query: ({ id, ...data }) => ({
        url: `/library/abutments/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Abutments', id },
        { type: 'Abutments', id: 'LIST' },
      ],
    }),

    deleteAbutment: builder.mutation<ApiResponse<null>, number>({
      query: (id) => ({
        url: `/library/abutments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Abutments', id },
        { type: 'Abutments', id: 'LIST' },
      ],
    }),

    linkAbutmentProducts: builder.mutation<ApiResponse<null>, {
      id: number
      product_ids: number[]
    }>({
      query: ({ id, product_ids }) => ({
        url: `/library/abutments/${id}/link-products`,
        method: 'POST',
        body: { product_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Abutments', id }],
    }),

    updateAbutmentStatus: builder.mutation<ApiResponse<Abutment>, {
      id: number
      status: 'Active' | 'Inactive'
    }>({
      query: ({ id, status }) => ({
        url: `/library/abutments/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Abutments', id },
        { type: 'Abutments', id: 'LIST' },
      ],
    }),

    // Abutment Platforms
    addAbutmentPlatform: builder.mutation<ApiResponse<AbutmentPlatform>, {
      abutment_id: number
      name: string
      image?: string
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
    }>({
      query: ({ abutment_id, ...data }) => ({
        url: `/library/abutments/${abutment_id}/platforms`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { abutment_id }) => [{ type: 'Abutments', id: abutment_id }],
    }),

    updateAbutmentPlatform: builder.mutation<ApiResponse<AbutmentPlatform>, {
      abutment_id: number
      platform_id: number
      name?: string
      image?: string
      is_default?: 'Yes' | 'No'
      price?: number
      sequence?: number
    }>({
      query: ({ abutment_id, platform_id, ...data }) => ({
        url: `/library/abutments/${abutment_id}/platforms/${platform_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { abutment_id }) => [{ type: 'Abutments', id: abutment_id }],
    }),

    deleteAbutmentPlatform: builder.mutation<ApiResponse<null>, {
      abutment_id: number
      platform_id: number
    }>({
      query: ({ abutment_id, platform_id }) => ({
        url: `/library/abutments/${abutment_id}/platforms/${platform_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { abutment_id }) => [{ type: 'Abutments', id: abutment_id }],
    }),

    updateAbutmentPlatformStatus: builder.mutation<ApiResponse<AbutmentPlatform>, {
      abutment_id: number
      platform_id: number
      status: 'Active' | 'Inactive'
    }>({
      query: ({ abutment_id, platform_id, status }) => ({
        url: `/library/abutments/${abutment_id}/platforms/${platform_id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { abutment_id }) => [{ type: 'Abutments', id: abutment_id }],
    }),
  }),
})

// Export hooks for usage in functional components
export const {
  // Categories
  useGetAdvanceCategoriesQuery,
  useGetAdvanceCategoryQuery,
  useCreateAdvanceCategoryMutation,
  useUpdateAdvanceCategoryMutation,
  useDeleteAdvanceCategoryMutation,
  useLinkCategoryProductsMutation,
  useLinkCategoryToCategoriesMutation,
  useUpdateCategoryStatusMutation,

  // Subcategories
  useGetAdvanceSubcategoriesQuery,
  useGetAdvanceSubcategoryQuery,
  useCreateAdvanceSubcategoryMutation,
  useUpdateAdvanceSubcategoryMutation,
  useDeleteAdvanceSubcategoryMutation,
  useLinkSubcategoryProductsMutation,
  useUpdateSubcategoryStatusMutation,

  // Fields
  useGetAdvanceFieldsQuery,
  useGetAdvanceFieldQuery,
  useCreateAdvanceFieldMutation,
  useUpdateAdvanceFieldMutation,
  useDeleteAdvanceFieldMutation,
  useLinkFieldProductsMutation,
  useAddFieldOptionMutation,
  useUpdateFieldOptionMutation,
  useDeleteFieldOptionMutation,
  useUpdateFieldOptionStatusMutation,

  // Implants
  useGetImplantsQuery,
  useGetImplantQuery,
  useCreateImplantMutation,
  useUpdateImplantMutation,
  useDeleteImplantMutation,
  useLinkImplantProductsMutation,
  useUpdateImplantStatusMutation,
  useAddImplantPlatformMutation,
  useUpdateImplantPlatformMutation,
  useDeleteImplantPlatformMutation,
  useUpdateImplantPlatformStatusMutation,

  // Abutments
  useGetAbutmentsQuery,
  useGetAbutmentQuery,
  useCreateAbutmentMutation,
  useUpdateAbutmentMutation,
  useDeleteAbutmentMutation,
  useLinkAbutmentProductsMutation,
  useUpdateAbutmentStatusMutation,
  useAddAbutmentPlatformMutation,
  useUpdateAbutmentPlatformMutation,
  useDeleteAbutmentPlatformMutation,
  useUpdateAbutmentPlatformStatusMutation,
} = advanceModeApi
