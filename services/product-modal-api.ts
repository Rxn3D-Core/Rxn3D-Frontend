import { useProductModalStore } from '@/stores/product-modal-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

// Helper function to get customer ID for lab admin
const getCustomerId = () => {
  if (typeof window === 'undefined') return undefined
  
  const role = localStorage.getItem('role')
  if (role === 'lab_admin') {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        return user?.customers?.find((customer: any) => customer.id)?.id
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }
  return undefined
}

// Fetch all categories with caching
export const fetchAllCategoriesWithCache = async (language: string = 'en') => {
  const store = useProductModalStore.getState()
  
  // Check if cache is valid
  if (store.isCategoriesCacheValid(language)) {
    return store.allCategories
  }
  
  // Set loading state
  store.setAllCategoriesLoading(true)
  
  try {
    const token = getAuthToken()
    const customerId = getCustomerId()
    
    const params = new URLSearchParams({ lang: language })
    if (customerId) params.append("customer_id", String(customerId))
    
    const response = await fetch(
      `${API_BASE_URL}/library/categories?${params.toString()}`,
      {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
      }
    )
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || `Failed to fetch all categories (status ${response.status})`)
    }
    
    const responseData = await response.json()
    const categories = responseData.data.data || []
    
    // Store in cache
    store.setAllCategories(categories, language)
    
    return categories
    
  } catch (err: any) {
    console.error('Error fetching categories:', err)
    store.setAllCategoriesError(err.message)
    return []
  }
}

// Fetch subcategories with caching
export const fetchSubcategoriesWithCache = async (categoryId: number, language: string = 'en') => {
  const store = useProductModalStore.getState()
  
  // Check if cache is valid
  if (store.isSubcategoriesCacheValid(categoryId, language)) {
    return store.subcategoriesByCategory[categoryId] || []
  }
  
  // Set loading state
  store.setSubcategoriesLoading(categoryId, true)
  
  try {
    const token = getAuthToken()
    const customerId = getCustomerId()
    
    const params = new URLSearchParams({ 
      lang: language,
      category_id: categoryId.toString()
    })
    
    if (customerId) {
      params.append("customer_id", customerId.toString())
    }
    
    const response = await fetch(
      `${API_BASE_URL}/library/subcategories?${params.toString()}`,
      {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
      }
    )
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || `Failed to fetch subcategories (status ${response.status})`)
    }
    
    const responseData = await response.json()
    const dataArray = responseData.data?.data || []
    
    const subcategories = dataArray.map((subcategory: any) => ({
      id: subcategory.id,
      name: subcategory.name,
      sub_name: subcategory.name,
      code: subcategory.code,
      type: subcategory.type,
      sequence: subcategory.sequence,
      status: subcategory.status,
      parent_id: subcategory.category_id,
      case_pan_id: subcategory.case_pan_id || null,
      color_code: subcategory?.case_pan?.color_code || null,
      created_at: subcategory.created_at,
      updated_at: subcategory.updated_at,
      all_labs: 'All Labs',
      is_custom: subcategory.is_custom,
    }))
    
    // Store in cache
    store.setSubcategories(categoryId, subcategories, language)
    
    return subcategories
    
  } catch (err: any) {
    console.error('Error fetching subcategories:', err)
    store.setSubcategoriesError(categoryId, err.message)
    return []
  }
}

// Fetch products with caching
export const fetchProductsWithCache = async (labId: number, params: Record<string, any>) => {
  const store = useProductModalStore.getState()
  
  // Create a unique key for this request
  const paramsKey = JSON.stringify({ labId, ...params })
  
  // Check if cache is valid
  if (store.isProductsCacheValid(paramsKey)) {
    return store.products[paramsKey] || []
  }
  
  // Set loading state
  store.setProductsLoading(paramsKey, true)
  
  try {
    const token = getAuthToken()
    
    // Determine the correct lab ID based on user role and get customer_id
    let effectiveLabId = labId
    let customerId = null
    
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role")
      const isLabAdmin = role === "lab_admin"
      const isSuperAdmin = role === "superadmin"
      const isOfficeAdmin = role === "office_admin"
      const isDoctor = role === "doctor"
      
      if (isOfficeAdmin || isDoctor) {
        const storedLabId = localStorage.getItem("selectedLabId")
        if (storedLabId) {
          effectiveLabId = Number(storedLabId)
          customerId = effectiveLabId // Use the selectedLabId as customer_id
        }
      } else if (isLabAdmin || isSuperAdmin) {
        // For lab_admin or superadmin, use customerId from localStorage
        const storedCustomerId = localStorage.getItem("customerId")
        if (storedCustomerId) {
          customerId = parseInt(storedCustomerId, 10)
        }
      }
    }
    
    const url = new URL(`/v1/slip/lab/${effectiveLabId}/products`, API_BASE_URL)
    
    // Add customer_id if available
    if (customerId) {
      url.searchParams.append('customer_id', customerId.toString())
    }
    
    // Add other params
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v))
      }
    })
    
    const response = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    
    if (response.status === 401) {
      window.location.href = '/login'
      return []
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }
    
    const json = await response.json()
    const products = json.data || []
    
    // Store in cache
    store.setProducts(paramsKey, products)
    
    return products
    
  } catch (err: any) {
    console.error('Error fetching products:', err)
    store.setProductsError(paramsKey, err.message)
    return []
  }
}

// Clear cache functions
export const clearProductModalCache = () => {
  const store = useProductModalStore.getState()
  store.clearCache()
}

export const clearCategoriesCache = () => {
  const store = useProductModalStore.getState()
  store.clearCategoriesCache()
}

export const clearSubcategoriesCache = (categoryId?: number) => {
  const store = useProductModalStore.getState()
  store.clearSubcategoriesCache(categoryId)
}

export const clearProductsCache = (params?: string) => {
  const store = useProductModalStore.getState()
  store.clearProductsCache(params)
}
