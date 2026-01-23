"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { FolderOpen, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { useLanguage } from "@/contexts/language-context" 
import { useAuth } from "@/contexts/auth-context"
import { current } from "@reduxjs/toolkit"

export interface ProductCategory {
  id: number
  name: string
  sub_name?: string // For subcategories from API
  code: string
  type: string
  sequence: number
  status: string
  parent_id: number | null
  case_pan_id?: number | null
  created_at: string
  updated_at: string
  sub_categories?: ProductCategory[]
  is_sub_category?: boolean // Optional helper
  image_url?: string
}

export interface ProductCategoryPayload {
  name: string
  code: string
  type: string
  sequence: number
  status: string
  parent_id?: number | null
  case_pan_id?: number | null
  image?: string
}

export interface SubCategoryPayload extends ProductCategoryPayload {
  parent_id: number
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface ProductCategoryListResponse {
  data: ProductCategory[]
  pagination: PaginationInfo
}

// For the parent dropdown, might not need pagination
export interface ParentDropdownCategoryResponse {
  data: ProductCategory[]
}

type ProductCategoryContextType = {
  // For main list on ProductCategoryPage
  categories: ProductCategory[]
  pagination: PaginationInfo
  isLoading: boolean
  error: string | null
  searchQuery: string
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null
  selectedItems: number[]
  fetchCategories: (
    page?: number,
    perPage?: number,
    query?: string,
    sortCol?: string | null,
    sortDir?: "asc" | "desc" | null,
  ) => Promise<void>
  fetchSubcategories: (
    page?: number,
    perPage?: number,
    query?: string,
    sortCol?: string | null,
    sortDir?: "asc" | "desc" | null,
  ) => Promise<void>
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  clearSelection: () => void

  // For "Nest Sub Category Under" dropdown in AddCategoryModal
  parentDropdownCategories: ProductCategory[]
  isLoadingParentDropdown: boolean
  fetchParentDropdownCategories: () => Promise<void>

  // CRUD and messages
  successMessage: string | null
  showAnimation: boolean
  animationType: string | null
  createCategory: (payload: ProductCategoryPayload) => Promise<boolean> // Returns success status
  createSubCategory: (payload: SubCategoryPayload) => Promise<boolean> // Returns success status
  updateCategory: (id: number, payload: Partial<ProductCategoryPayload>, isSub: boolean) => Promise<boolean> // Returns success status
  deleteCategory: (id: number, isSub: boolean) => Promise<void>
  bulkDeleteCategories: (ids: number[]) => Promise<void> // Assuming a single endpoint for bulk delete
  clearMessages: () => void
  getSubCategoryDetail: (id: number) => Promise<ProductCategory | null>
  getCategoryDetail: (id: number) => Promise<ProductCategory | null>

  // New: all categories API
  allCategories: ProductCategoryApi[]
  allCategoriesLoading: boolean
  allCategoriesError: string | null
  fetchAllCategories: (lang?: string, customerId?: number) => Promise<void>

  // Subcategories by category ID
  subcategoriesByCategory: ProductCategory[]
  subcategoriesLoading: boolean
  subcategoriesError: string | null
  fetchSubcategoriesByCategory: (categoryId: number, lang?: string, customerId?: number) => Promise<void>
}

type ProductCategoryApi = {
  id: number
  name: string
  code: string
  type: string
  sequence: number
  status: string
  customer_id: number | null
  is_custom: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  customer: any
  image_url?: string
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 25,
  current_page: 1,
  last_page: 1,
}

const ProductCategoryContext = createContext<ProductCategoryContextType | undefined>(undefined)

export const useProductCategory = () => {
  const context = useContext(ProductCategoryContext)
  if (context === undefined) {
    throw new Error("useProductCategory must be used within a ProductCategoryProvider")
  }
  return context
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const ProductCategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for main list
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>(defaultPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("asc")
  const [selectedItems, setSelectedItems] = useState<number[]>([])

  // State for parent dropdown in modal
  const [parentDropdownCategories, setParentDropdownCategories] = useState<ProductCategory[]>([])
  const [isLoadingParentDropdown, setIsLoadingParentDropdown] = useState(false)

  // State for messages and animations
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<"creating" | "updating" | "deleting" | "success" | "error" | null>(
    null,
  )
  const { currentLanguage } = useLanguage()
  const { user } = useAuth()

  // Determine user role and customerId - use state to avoid SSR issues
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLabAdmin, setIsLabAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  
  // Initialize user role on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role")
      setUserRole(role)
      setIsLabAdmin(role === "lab_admin")
      setIsSuperAdmin(role === "superadmin")
    }
  }, [])
  
  // Get customerId from localStorage (similar to other pages) - use state to avoid SSR issues
  const [customerId, setCustomerId] = useState<number | null>(null)
  
  useEffect(() => {
    if (typeof window === "undefined") return
    
    let id: number | null = null
    
    if (isLabAdmin || isSuperAdmin) {
      // For lab_admin or superadmin roles, use customer_id from localStorage
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        id = parseInt(storedCustomerId, 10)
      } else if (user?.customers?.length) {
        // Fallback to user.customers if not found in localStorage
        id = user.customers[0]?.id || null
      }
    } else {
      // For other roles, use selectedLabId from localStorage as customer_id
      const storedLabId = localStorage.getItem("selectedLabId")
      if (storedLabId) {
        id = parseInt(storedLabId, 10)
      }
    }
    
    setCustomerId(id)
  }, [isLabAdmin, isSuperAdmin, user?.customers])

  const { toast } = useToast()
  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false)
        setAnimationType(null)
      }, 2000) // Animation display time
      return () => clearTimeout(timer)
    }
  }, [showAnimation])

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000) // Message display time
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const getAuthToken = () => {
    const token = localStorage.getItem("token")
    if (!token) throw new Error("No authentication token found")
    return token
  }

  // Fetch categories only (top-level, no parent_id)
  const fetchCategories = useCallback(
    async (page = 1, perPage = 25, query = searchQuery, sortCol = sortColumn, sortDir = sortDirection) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
        })
        if (query) params.append("q", query)
        if (sortCol && sortDir) {
          params.append("order_by", sortCol)
          params.append("sort_by", sortDir)
        }

        // Pass customer_id if customerId is defined
        if (customerId) {
          params.append("customer_id", customerId.toString())
        }

        const response = await fetch(`${API_BASE_URL}/library/categories?${params.toString()}&lang=${currentLanguage}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to fetch categories (status ${response.status})`)
        }
        const responseData = await response.json();
        const categories = (responseData.data.data || []).map((category: any) => ({
          id: category.id,
          name: category.name,
          code: category.code,
          type: category.type,
          sequence: category.sequence,
          status: category.status,
          parent_id: null, // Categories have no parent
          case_pan_id: category.case_pan_id || null,
          color_code: category?.case_pan?.color_code || null,
          created_at: category.created_at,
          updated_at: category.updated_at,
          all_labs: 'All Labs',
          is_custom: category.is_custom,
          image_url: category.image_url,
        }));
        setCategories(categories);
        setPagination(responseData.data.pagination || defaultPagination);
      } catch (err: any) {
        console.error("Error fetching categories:", err)
        setError(err.message)
        toast({ title: "Error", description: err.message || "Failed to fetch categories.", variant: "destructive" })
        setCategories([])
        setPagination(defaultPagination)
      } finally {
        setIsLoading(false)
      }
    },
    [searchQuery, sortColumn, sortDirection, toast, currentLanguage, isLabAdmin, customerId],
  )

  // Fetch subcategories only (with parent_id)
  const fetchSubcategories = useCallback(
    async (page = 1, perPage = 25, query = searchQuery, sortCol = sortColumn, sortDir = sortDirection) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
        })
        if (query) params.append("q", query)
        if (sortCol && sortDir) {
          params.append("order_by", sortCol)
          params.append("sort_by", sortDir)
        }

        // Pass customer_id if customerId is defined
        if (customerId) {
          params.append("customer_id", customerId.toString())
        }

        const response = await fetch(`${API_BASE_URL}/library/subcategories?${params.toString()}&lang=${currentLanguage}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to fetch subcategories (status ${response.status})`)
        }
        const responseData = await response.json();
        const subcategories = (responseData.data.data || []).map((subcategory: any) => ({
          id: subcategory.id,
          sub_name: subcategory.name,
          name: subcategory.category?.name,
          code: subcategory.code || subcategory.category?.code,
          type: subcategory.type,
          sequence: subcategory.sequence || subcategory.category?.sequence,
          status: subcategory.status,
          parent_id: subcategory.category_id || subcategory.category?.id,
          case_pan_id: subcategory.case_pan_id || subcategory.case_pan?.id || null,
          color_code: subcategory?.case_pan?.color_code || null,
          created_at: subcategory.created_at,
          updated_at: subcategory.updated_at,
          all_labs: 'All Labs',
          is_custom: subcategory.is_custom,
          image_url: subcategory.image_url,
        }));
        setCategories(subcategories);
        setPagination(responseData.data.pagination || defaultPagination);
      } catch (err: any) {
        console.error("Error fetching subcategories:", err)
        setError(err.message)
        toast({ title: "Error", description: err.message || "Failed to fetch subcategories.", variant: "destructive" })
        setCategories([])
        setPagination(defaultPagination)
      } finally {
        setIsLoading(false)
      }
    },
    [searchQuery, sortColumn, sortDirection, toast, currentLanguage, isLabAdmin, customerId],
  )

  const fetchParentDropdownCategories = useCallback(async () => {
    setIsLoadingParentDropdown(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({
        per_page: "100",
        status: "Active",
        lang: currentLanguage,
      })
      
      // Pass customer_id if role is lab_admin and customerId is defined
      if (isLabAdmin && customerId) {
        params.append("customer_id", customerId.toString())
      }
      
      const response = await fetch(
        `${API_BASE_URL}/library/categories?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      )
      if (!response.ok) throw new Error("Failed to fetch categories for dropdown.")
      const responseData = await response.json()
      // Handle the nested structure: responseData.data.data contains the categories array
      const categories = (responseData.data?.data || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        code: cat.code,
        type: cat.type,
        sequence: cat.sequence,
        status: cat.status,
        parent_id: null,
        case_pan_id: cat.case_pan_id || null,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
      }))
      setParentDropdownCategories(categories)
    } catch (err: any) {
      console.error("Error fetching categories for dropdown:", err)
      toast({ title: "Error", description: "Failed to load categories for dropdown.", variant: "destructive" })
      setParentDropdownCategories([])
    } finally {
      setIsLoadingParentDropdown(false)
    }
  }, [toast, currentLanguage, customerId, isLabAdmin])

  const createCategoryInternal = async (
    endpoint: string,
    payload: ProductCategoryPayload | SubCategoryPayload,
    entityName: string,
  ): Promise<boolean> => {
    setIsLoading(true)
    setShowAnimation(true)
    setAnimationType("creating")
    setError(null)
    setSuccessMessage(null)
    try {
      const token = getAuthToken()
      const bodyPayload = {
        ...payload,
        ...(customerId ? { customer_id: customerId } : {}),
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              messages.forEach((message) =>
                toast({ title: `Validation Error - ${field}`, description: message, variant: "destructive" }),
              )
            }
          })
        } else {
          toast({
            title: "Error",
            description: result?.message || `Failed to create ${entityName}.`,
            variant: "destructive",
          })
        }
        setAnimationType("error")
        setError(result?.message || `Failed to create ${entityName}.`)
        return false
      }
      setAnimationType("success")
      toast({ title: `${entityName} Created`, description: result.message || `Successfully created ${payload.name}` })
      setSuccessMessage(result.message || `Successfully created ${payload.name}`)
      await fetchCategories(pagination.current_page, pagination.per_page) // Refresh main list
      await fetchParentDropdownCategories() // Refresh parent dropdown
      return true
    } catch (err: any) {
      console.error(`Error creating ${entityName}:`, err)
      setAnimationType("error")
      setError(err.message || `Failed to create ${entityName}.`)
      toast({ title: "Error", description: err.message || `Failed to create ${entityName}.`, variant: "destructive" })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const createCategory = (payload: ProductCategoryPayload) =>
    createCategoryInternal(`${API_BASE_URL}/library/categories`, payload, "Category")

  const createSubCategory = (payload: SubCategoryPayload) =>
    createCategoryInternal(`${API_BASE_URL}/library/subcategories`, payload, "Sub-category")

  const updateCategory = async (
    id: number,
    payload: Partial<ProductCategoryPayload>,
    isSub: boolean,
  ): Promise<boolean> => {
    setIsLoading(true)
    setShowAnimation(true)
    setAnimationType("updating")
    setError(null)
    setSuccessMessage(null)
    try {
      const token = getAuthToken()
      const apiEndpoint = isSub
        ? `${API_BASE_URL}/library/subcategories/${id}`
        : `${API_BASE_URL}/library/categories/${id}`
      const bodyPayload = {
        ...payload,
        ...(customerId ? { customer_id: customerId } : {}),
      }
      const response = await fetch(apiEndpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      })
      const result = await response.json()
      if (!response.ok) {
        setAnimationType("error")
        setError(result?.message || "Failed to update category.")
        toast({ title: "Error", description: result?.message || "Failed to update category.", variant: "destructive" })
        return false
      }
      setAnimationType("success")
      toast({ title: "Category Updated", description: result.message || "Category updated successfully." })
      setSuccessMessage(result.message || "Category updated successfully")
      await fetchCategories(pagination.current_page, pagination.per_page)
      await fetchParentDropdownCategories()
      return true
    } catch (err: any) {
      console.error("Error updating category:", err)
      setAnimationType("error")
      setError(err.message || "Failed to update category.")
      toast({ title: "Error", description: err.message || "Failed to update category.", variant: "destructive" })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCategory = async (id: number, isSub: boolean) => {
    setIsLoading(true)
    setShowAnimation(true)
    setAnimationType("deleting")
    setError(null)
    setSuccessMessage(null)
    try {
      const token = getAuthToken()
      let endpoint = isSub
        ? `${API_BASE_URL}/library/subcategories/${id}`
        : `${API_BASE_URL}/library/categories/${id}`
      if (customerId) {
        endpoint += `?customer_id=${customerId}`
      }
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) {
        setAnimationType("error")
        setError(result?.message || "Failed to delete category.")
        toast({ title: "Error", description: result?.message || "Failed to delete category.", variant: "destructive" })
        return
      }
      setAnimationType("success")
      toast({ title: "Category Deleted", description: result.message || "Category deleted successfully." })
      setSuccessMessage(result.message || "Category deleted successfully")
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))
      await fetchCategories(pagination.current_page, pagination.per_page)
      await fetchParentDropdownCategories()
    } catch (err: any) {
      console.error("Error deleting category:", err)
      setAnimationType("error")
      setError(err.message || "Failed to delete category.")
      toast({ title: "Error", description: err.message || "Failed to delete category.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const bulkDeleteCategories = async (ids: number[]) => {
    setIsLoading(true)
    setShowAnimation(true)
    setAnimationType("deleting")
    setError(null)
    setSuccessMessage(null)
    try {
      const token = getAuthToken()
      const bodyPayload = {
        ids,
        ...(customerId ? { customer_id: customerId } : {}),
      }
      const response = await fetch(`${API_BASE_URL}/library/categories/bulk-delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      })
      const result = await response.json()
      if (!response.ok) {
        setAnimationType("error")
        setError(result?.message || "Failed to bulk delete categories.")
        toast({
          title: "Error",
          description: result?.message || "Failed to bulk delete categories.",
          variant: "destructive",
        })
        return
      }
      setAnimationType("success")
      toast({ title: "Categories Deleted", description: result.message || `Successfully deleted ${ids.length} items.` })
      setSuccessMessage(result.message || `Successfully deleted ${ids.length} items.`)
      setSelectedItems([])
      await fetchCategories(1, pagination.per_page) // Go to first page after bulk delete
      await fetchParentDropdownCategories()
    } catch (err: any) {
      console.error("Error bulk deleting categories:", err)
      setAnimationType("error")
      setError(err.message || "Failed to bulk delete categories.")
      toast({ title: "Error", description: err.message || "Failed to bulk delete categories.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const getSubCategoryDetail = useCallback(
    async (id: number): Promise<ProductCategory | null> => {
      try {
        const token = getAuthToken()
        let url = `${API_BASE_URL}/library/subcategories/${id}?lang=${currentLanguage}`
        
        // Add customer_id if available
        if (customerId) {
          url += `&customer_id=${customerId}`
        }
        
        const response = await fetch(
          url,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to fetch subcategory detail (status ${response.status})`)
        }
        const result = await response.json()
        // Assuming result.data contains the subcategory detail
        return result.data as ProductCategory
      } catch (err: any) {
        console.error("Error fetching subcategory detail:", err)
        toast({ title: "Error", description: err.message || "Failed to fetch subcategory detail.", variant: "destructive" })
        return null
      }
    },
    [currentLanguage, toast, customerId]
  )

  const getCategoryDetail = useCallback(
    async (id: number): Promise<ProductCategory | null> => {
      try {
        const token = getAuthToken()
        let url = `${API_BASE_URL}/library/categories/${id}?lang=${currentLanguage}`
        
        // Add customer_id if available
        if (customerId) {
          url += `&customer_id=${customerId}`
        }
        
        const response = await fetch(
          url,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to fetch category detail (status ${response.status})`)
        }
        const result = await response.json()
        const category = result.data
        return {
          id: category.id,
          name: category.name,
          code: category.code,
          type: category.type,
          sequence: category.sequence,
          status: category.status,
          parent_id: null,
          case_pan_id: category.case_pan_id || null,
          created_at: category.created_at,
          updated_at: category.updated_at,
          is_custom: category.is_custom,
          image_url: category.image_url,
        } as ProductCategory
      } catch (err: any) {
        console.error("Error fetching category detail:", err)
        toast({ title: "Error", description: err.message || "Failed to fetch category detail.", variant: "destructive" })
        return null
      }
    },
    [currentLanguage, toast, customerId]
  )

  // --- NEW: API for all categories ---
  const [allCategories, setAllCategories] = useState<ProductCategoryApi[]>([])
  const [allCategoriesLoading, setAllCategoriesLoading] = useState(false)
  const [allCategoriesError, setAllCategoriesError] = useState<string | null>(null)

  // --- NEW: API for subcategories by category ID ---
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<ProductCategory[]>([])
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [subcategoriesError, setSubcategoriesError] = useState<string | null>(null)

  // Ref to track if a fetch is in progress to prevent duplicate calls
  const fetchAllCategoriesInProgressRef = useRef<{ lang: string; customerId?: number } | null>(null)
  // Ref to track the last successful fetch parameters
  const lastFetchParamsRef = useRef<{ lang: string; customerId?: number } | null>(null)
  // Ref to track if categories are currently loaded
  const hasCategoriesLoadedRef = useRef<boolean>(false)

  // Fetch all categories (top-level, not subcategories)
  const fetchAllCategories = useCallback(
    async (lang = "en", passedCustomerId?: number) => {
      // Use passed customerId, or get fresh customerId from context
      let customerIdToUse = passedCustomerId
      if (!customerIdToUse) {
        // Get fresh customerId using the same logic
        if (typeof window !== "undefined") {
          if (isLabAdmin || isSuperAdmin) {
            const storedCustomerId = localStorage.getItem("customerId")
            if (storedCustomerId) {
              customerIdToUse = parseInt(storedCustomerId, 10)
            } else if (user?.customers?.length) {
              customerIdToUse = user.customers[0]?.id
            }
          } else {
            const storedLabId = localStorage.getItem("selectedLabId")
            if (storedLabId) {
              customerIdToUse = parseInt(storedLabId, 10)
            }
          }
        }
      }
      
      // Create a unique key for this fetch request
      const fetchKey = `${lang}-${customerIdToUse || 'default'}`
      
      // Check if the same fetch is already in progress
      if (fetchAllCategoriesInProgressRef.current) {
        const currentKey = `${fetchAllCategoriesInProgressRef.current.lang}-${fetchAllCategoriesInProgressRef.current.customerId || 'default'}`
        if (currentKey === fetchKey) {
          // Same fetch is already in progress, skip duplicate call
          return
        }
      }
      
      // Check if we already have data for these exact parameters
      if (lastFetchParamsRef.current && hasCategoriesLoadedRef.current) {
        const lastKey = `${lastFetchParamsRef.current.lang}-${lastFetchParamsRef.current.customerId || 'default'}`
        if (lastKey === fetchKey) {
          // We already have the data for these parameters, skip duplicate call
          return
        }
      }
      
      // Mark this fetch as in progress
      fetchAllCategoriesInProgressRef.current = { lang, customerId: customerIdToUse }
      
      setAllCategoriesLoading(true)
      setAllCategoriesError(null)
      try {
        const token = getAuthToken()
        const params = new URLSearchParams({ lang })
        
        if (customerIdToUse) {
          params.append("customer_id", String(customerIdToUse))
        }
        
        const response = await fetch(
          `${API_BASE_URL}/library/categories?${params.toString()}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }
        )
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to fetch all categories (status ${response.status})`)
        }
        const responseData = await response.json()
        const categoriesData = responseData.data.data || []
        setAllCategories(categoriesData)
        // Store the successful fetch parameters
        lastFetchParamsRef.current = { lang, customerId: customerIdToUse }
        hasCategoriesLoadedRef.current = categoriesData.length > 0
      } catch (err: any) {
        setAllCategories([])
        setAllCategoriesError(err.message)
        hasCategoriesLoadedRef.current = false
      } finally {
        setAllCategoriesLoading(false)
        // Clear the in-progress flag
        fetchAllCategoriesInProgressRef.current = null
      }
    },
    [isLabAdmin, isSuperAdmin, user]
  )

  // Fetch subcategories by category ID
  const fetchSubcategoriesByCategory = useCallback(
    async (categoryId: number, lang = "en", passedCustomerId?: number) => {
      setSubcategoriesLoading(true)
      setSubcategoriesError(null)
      try {
        const token = getAuthToken()
        const params = new URLSearchParams({ 
          lang,
          category_id: categoryId.toString()
        })
        
        // Add customer_id if provided, otherwise use context customerId for lab admin
        const customerIdToUse = passedCustomerId || customerId || undefined
        if (customerIdToUse) {
          params.append("customer_id", customerIdToUse.toString())
        }

        const response = await fetch(
          `${API_BASE_URL}/library/subcategories?${params.toString()}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }
        )
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to fetch subcategories (status ${response.status})`)
        }
        
        const responseData = await response.json()
        
        // Handle empty data case
        const dataArray = responseData.data?.data || []
        
        const subcategories = dataArray.map((subcategory: any) => ({
          id: subcategory.id,
          name: subcategory.name, // The subcategory name is directly in subcategory.name
          sub_name: subcategory.name, // Keep this for backward compatibility
          code: subcategory.code, // The code is directly in subcategory.code
          type: subcategory.type,
          sequence: subcategory.sequence,
          status: subcategory.status,
          parent_id: subcategory.category_id, // Use category_id from the API response
          case_pan_id: subcategory.case_pan_id || null,
          color_code: subcategory?.case_pan?.color_code || null,
          image_url: subcategory.image_url || null,
          created_at: subcategory.created_at,
          updated_at: subcategory.updated_at,
          all_labs: 'All Labs',
          is_custom: subcategory.is_custom,
        }))
        
        setSubcategoriesByCategory(subcategories)
      } catch (err: any) {
        console.error("Error fetching subcategories by category:", err)
        setSubcategoriesByCategory([])
        setSubcategoriesError(err.message)
        toast({ 
          title: "Error", 
          description: err.message || "Failed to fetch subcategories.", 
          variant: "destructive" 
        })
      } finally {
        setSubcategoriesLoading(false)
      }
    },
    [isLabAdmin, customerId, toast]
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  return (
    <ProductCategoryContext.Provider
      value={{
        categories,
        pagination,
        isLoading,
        error,
        searchQuery,
        sortColumn,
        sortDirection,
        selectedItems,
        fetchCategories,
        fetchSubcategories,
        setSearchQuery,
        setSortColumn,
        setSortDirection,
        setSelectedItems,
        clearSelection,
        parentDropdownCategories,
        isLoadingParentDropdown,
        fetchParentDropdownCategories,
        successMessage,
        showAnimation,
        animationType,
        createCategory,
        createSubCategory,
        updateCategory,
        deleteCategory,
        bulkDeleteCategories,
        clearMessages,
        getSubCategoryDetail,
        getCategoryDetail,
        // --- NEW: all categories API ---
        allCategories,
        allCategoriesLoading,
        allCategoriesError,
        fetchAllCategories,
        // --- NEW: subcategories by category API ---
        subcategoriesByCategory,
        subcategoriesLoading,
        subcategoriesError,
        fetchSubcategoriesByCategory,
      }}
    >
      {children}
      {/* Animation Overlay (same as before) */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md">
            {animationType === "creating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  {" "}
                  <Save className="h-16 w-16 animate-bounce" />{" "}
                </div>
                <p className="text-lg font-medium mb-2">Creating Category...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we create your case pan.</p>
              </>
            )}
            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  {" "}
                  <FolderOpen className="h-16 w-16 animate-pulse" />{" "}
                </div>
                <p className="text-lg font-medium mb-2">Updating...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait.</p>
              </>
            )}
            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  {" "}
                  <Trash2 className="h-16 w-16 animate-pulse" />{" "}
                </div>
                <p className="text-lg font-medium mb-2">Deleting...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait.</p>
              </>
            )}
            {animationType === "success" && (
              <>
                <div className="mb-4 text-green-500">
                  {" "}
                  <CheckCircle className="h-16 w-16" />{" "}
                </div>
                <p className="text-lg font-medium mb-2">Success!</p>
                <p className="text-sm text-[#a19d9d] text-center">Operation completed.</p>
              </>
            )}
            {animationType === "error" && (
              <>
                <div className="mb-4 text-red-500">
                  {" "}
                  <AlertCircle className="h-16 w-16" />{" "}
                </div>
                <p className="text-lg font-medium mb-2">Error</p>
                <p className="text-sm text-[#a19d9d] text-center">{error || "An error occurred."}</p>
              </>
            )}
          </div>
        </div>
      )}
    </ProductCategoryContext.Provider>
  )
}
