"use client"

import type { ReactNode, Dispatch, SetStateAction } from "react"
import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Trash2, Save, CheckCircle, AlertCircle, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"


export interface AddOn {
  id: number
  name: string
  code: string
  price?: number | null
  subcategory_id: number
  type: "Upper" | "Lower" | "Both" | null
  status: "Active" | "Inactive"
  sequence: number
  created_at?: string
  updated_at?: string
  subcategory?: AddOnSubCategory
  category_name?: string
  subcategory_name?: string
}

export interface AddOnSubCategory {
  id: number
  name: string
  code: string
  category_id: number
  type: "Upper" | "Lower" | "Both" | null
  status: "Active" | "Inactive"
  sequence: number
  created_at?: string
  updated_at?: string
  category?: AddOnCategory
}

export interface AddOnSubCategoryCreate {
  name: string
  code: string
  category_id: number
  type: "Upper" | "Lower" | "Both"
  sequence: number
  status: "Active" | "Inactive"
}

export interface AddOnCategory {
  id: number
  name: string
  code: string
  type?: "Upper" | "Lower" | "Both" | null
  status: "Active" | "Inactive"
  sequence: number
  created_at?: string
  updated_at?: string
  subcategories?: AddOnSubCategory[]
}

export interface AddOnGroup {
  id: number
  name: string
  description?: string
  status: "Active" | "Inactive"
  sequence: number
  created_at?: string
  updated_at?: string
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
  errors?: Record<string, string[]>
}

type AnimationType = "creating" | "updating" | "deleting" | "success" | "error" | "loading"

interface AddOnsContextState {
  // Add-ons (for backward compatibility, but will be used for categories)
  addOns: AddOn[]
  fetchAddOns: (
    page?: number,
    limit?: number,
    search?: string,
    sortColKey?: keyof AddOn | null | undefined,
    sortDir?: "asc" | "desc"
  ) => Promise<void>
  // Categories
  addOnCategories: AddOnCategory[]
  fetchAddOnCategories: (
    page?: number,
    limit?: number,
    search?: string,
    sortColKey?: string | null,
    sortDir?: "asc" | "desc"
  ) => Promise<void>
  addOnCategoriesPagination: PaginatedResponse<AddOnCategory>["pagination"] | null
  isLoadingAddOnCategories: boolean
  addOnCategoriesError: string | null
  getAddOnCategoryDetail: (id: number) => Promise<AddOnCategory | null>
  // Subcategories
  addOnSubcategories: AddOnSubCategory[]
  fetchAddOnSubcategories: (
    page?: number,
    limit?: number,
    search?: string,
    sortColKey?: string | null,
    sortDir?: "asc" | "desc"
  ) => Promise<void>
  addOnSubcategoriesPagination: PaginatedResponse<AddOnSubCategory>["pagination"] | null
  isLoadingAddOnSubcategories: boolean
  addOnSubcategoriesError: string | null
  getAddOnSubcategoryDetail: (id: number) => Promise<AddOnSubCategory | null>
  createAddOn: (data: Omit<AddOn, "id" | "subcategory" | "category_name" | "subcategory_name">) => Promise<AddOn | null>
  updateAddOn: (
    id: number,
    data: Partial<Omit<AddOn, "id" | "subcategory" | "category_name" | "subcategory_name">>,
  ) => Promise<AddOn | null>
  createAddOnCategory: (data: Omit<AddOnCategory, "id" | "subcategories" | "created_at" | "updated_at">) => Promise<AddOnCategory | null>
  updateAddOnCategory: (
    id: number,
    data: Partial<Omit<AddOnCategory, "id" | "subcategories" | "created_at" | "updated_at">>,
  ) => Promise<AddOnCategory | null>
  updateAddOnSubCategory: (
    id: number,
    data: Partial<Omit<AddOnSubCategory, "id" | "category" | "created_at" | "updated_at">>,
  ) => Promise<AddOnSubCategory | null>
  deleteAddOn: (id: number, isSubcategory?: boolean) => Promise<boolean>
  isLoadingAddOns: boolean
  addOnError: string | null
  addOnPagination: PaginatedResponse<AddOn>["pagination"] | null

  // Categories for dropdowns
  addOnCategoriesForSelect: AddOnCategory[]
  fetchAddOnCategoriesForSelect: () => Promise<void>
  isLoadingCategoriesForSelect: boolean

  // Groups
  addOnGroups: AddOnGroup[]
  fetchAddOnGroups: () => Promise<void>
  createAddOnGroup: (data: Omit<AddOnGroup, "id" | "created_at" | "updated_at">) => Promise<AddOnGroup | null>
  updateAddOnGroup: (
    id: number,
    data: Partial<Omit<AddOnGroup, "id" | "created_at" | "updated_at">>,
  ) => Promise<AddOnGroup | null>
  deleteAddOnGroup: (id: number) => Promise<boolean>
  isLoadingGroups: boolean

  // Animation
  showAnimation: boolean
  animationType: AnimationType | null
  animationMessage: string | null
  triggerAnimation: (type: AnimationType, message?: string, duration?: number) => void

  // Search and pagination
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  sortColumn: keyof AddOn | null | undefined
  setSortColumn: Dispatch<SetStateAction<keyof AddOn | null | undefined>>
  sortDirection: "asc" | "desc"
  setSortDirection: Dispatch<SetStateAction<"asc" | "desc">>
  currentPage: number
  setCurrentPage: Dispatch<SetStateAction<number>>
  itemsPerPage: number
  setItemsPerPage: Dispatch<SetStateAction<number>>

  // Selected items
  selectedItems: number[]
  setSelectedItems: Dispatch<SetStateAction<number[]>>
  clearSelectedItems: () => void
  selectAllItems: (items: AddOn[]) => void

  createAddOnSubCategory: (data: AddOnSubCategoryCreate) => Promise<AddOnSubCategory | null>
}

const AddOnsContext = createContext<AddOnsContextState | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

export function AddOnsCategoryProvider({ children }: { children: ReactNode }) {
  const { user, token: authToken, logout } = useAuth()
  const { toast } = useToast()

  // Add-ons state
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [isLoadingAddOns, setIsLoadingAddOns] = useState(false)
  const [addOnError, setAddOnError] = useState<string | null>(null)
  const [addOnPagination, setAddOnPagination] = useState<PaginatedResponse<AddOn>["pagination"] | null>(null)

  // Categories state
  const [addOnCategories, setAddOnCategories] = useState<AddOnCategory[]>([])
  const [isLoadingAddOnCategories, setIsLoadingAddOnCategories] = useState(false)
  const [addOnCategoriesError, setAddOnCategoriesError] = useState<string | null>(null)
  const [addOnCategoriesPagination, setAddOnCategoriesPagination] = useState<PaginatedResponse<AddOnCategory>["pagination"] | null>(null)

  // Subcategories state
  const [addOnSubcategories, setAddOnSubcategories] = useState<AddOnSubCategory[]>([])
  const [isLoadingAddOnSubcategories, setIsLoadingAddOnSubcategories] = useState(false)
  const [addOnSubcategoriesError, setAddOnSubcategoriesError] = useState<string | null>(null)
  const [addOnSubcategoriesPagination, setAddOnSubcategoriesPagination] = useState<PaginatedResponse<AddOnSubCategory>["pagination"] | null>(null)

  // Categories for dropdowns state
  const [addOnCategoriesForSelect, setAddOnCategoriesForSelect] = useState<AddOnCategory[]>([])
  const [isLoadingCategoriesForSelect, setIsLoadingCategoriesForSelect] = useState(false)

  // Groups state
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<AnimationType | null>(null)
  const [animationMessage, setAnimationMessage] = useState<string | null>(null)

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<AddOnsContextState["sortColumn"]>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Selected items state
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const { currentLanguage } = useLanguage()
  const getAuthHeaders = useCallback(() => {
    if (!authToken) {
      console.warn("Auth token is not available for API request.")
      return null
    }
    return {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }, [authToken])



  // Determine user role and customerId - use state to avoid SSR issues
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLabAdmin, setIsLabAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [customerId, setCustomerId] = useState<number | null>(null)
  
  // Initialize user role on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role")
      setUserRole(role)
      setIsLabAdmin(role === "lab_admin")
      setIsSuperAdmin(role === "superadmin")
    }
  }, [])
  
  // Get customerId from localStorage (similar to product category context)
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

  const triggerAnimation = useCallback((type: AnimationType, message = "", duration = 3000) => {
    setAnimationType(type)
    setAnimationMessage(message)
    setShowAnimation(true)

    if (type === "success" || type === "error") {
      setTimeout(() => {
        setShowAnimation(false)
        setAnimationType(null)
        setAnimationMessage(null)
      }, duration)
    }
  }, [])

    useEffect(() => {
      if (error || successMessage) {
        const timer = setTimeout(() => {
          setError(null)
          setSuccessMessage(null)
        }, 5000)
        return () => clearTimeout(timer)
      }
    }, [error, successMessage])

  const handleApiError = (error: any, operation: string): string => {
    console.error(`Error during ${operation}:`, error)
    let errorMessage = `Failed to ${operation}.`

    if (error.response) {
      if (error.response.status === 401 && logout) {
        errorMessage = "Unauthorized. Please log in again."
        logout()
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message
      }
      if (error.response.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors).flat().join(" ")
        errorMessage = `${errorMessage} ${validationErrors}`.trim()
      }
    } else if (error.message) {
      errorMessage = error.message
    }

    triggerAnimation("error", errorMessage)
    return errorMessage
  }

  const clearSelectedItems = useCallback(() => {
    setSelectedItems([])
  }, [])

  const selectAllItems = useCallback((items: AddOn[]) => {
    setSelectedItems(items.map((item) => item.id))
  }, [])

  // Add a ref to track ongoing requests
  const fetchingRef = useRef(false)

  // Memoize the fetchAddOns function and add duplicate call prevention
  const fetchAddOns = useCallback(
    async (
      page = currentPage,
      limit = itemsPerPage,
      search = searchQuery,
      sortColKey = sortColumn,
      sortDir = sortDirection,
    ) => {
      // Prevent duplicate calls
      if (fetchingRef.current) {
        return
      }

      const headers = getAuthHeaders()
      if (!headers) return

      fetchingRef.current = true
      setIsLoadingAddOns(true)
      setAddOnError(null)

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: limit.toString(),
        })

        if (search) params.append("q", search)
        if (sortColKey && sortColKey !== "category_name" && sortColKey !== "subcategory_name") {
          params.append("order_by", sortColKey as string)
          params.append("sort_direction", sortDir)
        }
        // Pass customer_id if customerId is defined (for lab_admin, superadmin, or other roles)
        if (customerId) {
          params.append("customer_id", customerId.toString())
        }

        const response = await fetch(`${API_BASE_URL}/library/addon-categories?${params.toString()}&language=${currentLanguage}`, { headers })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { data: errorData, status: response.status } }
        }

        const result: ApiResponse<PaginatedResponse<AddOn>> = await response.json()

        if (result.status && result.data) {
          const processedAddOns = result.data.data.map((addon) => ({
            ...addon,
            subcategory_name: addon.subcategory?.name || "N/A",
            category_name: addon.subcategory?.category?.name || "N/A",
          }))
          setAddOns(processedAddOns)
          setAddOnPagination(result.data.pagination)
          clearSelectedItems()
        } else {
          throw new Error(result.message || "Failed to fetch add-ons")
        }
      } catch (error: any) {
        const errorMsg = handleApiError(error, "fetch add-ons")
        setAddOnError(errorMsg)
      } finally {
        setIsLoadingAddOns(false)
        fetchingRef.current = false
      }
    },
    [
      currentPage,
      itemsPerPage,
      searchQuery,
      sortColumn,
      sortDirection,
      getAuthHeaders,
      clearSelectedItems,
      currentLanguage,
      isLabAdmin,
      customerId,
    ],
  )

  const createAddOn = async (data: Omit<AddOn, "id" | "subcategory" | "category_name" | "subcategory_name">) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("creating", "Creating add-on category...") 

    try {
      // Add customer_id if customerId is defined
      let payload: any = { ...data }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(`${API_BASE_URL}/library/addon-categories`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<AddOn> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to create add-on" }
        throw { response: { data: errorData, status: response.status } }
      }
      fetchAddOns(currentPage, itemsPerPage, searchQuery, sortColumn, sortDirection)
      setSuccessMessage(`Successfully created ${data.name}`)
      setShowAnimation(false) 
      setAnimationType(null)
      setAnimationMessage(null)
      return result.data
    } catch (error: any) {
      triggerAnimation("error", error.message || "Failed to create add-on. Please try again.") // <-- Show error animation
      toast({
        title: "Error",
        description: error.message || "Failed to create add-on. Please try again.",
        variant: "destructive",
      })
      return null
    }
  }

  const updateAddOn = async (
    id: number,
    data: Partial<Omit<AddOn, "id" | "subcategory" | "category_name" | "subcategory_name">>,
  ) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("updating", "Updating add-on...")

    try {
      // Add customer_id if customerId is defined
      let payload: any = { ...data }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(`${API_BASE_URL}/library/addon-categories/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<AddOn> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to update add-on" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on updated successfully!")
      fetchAddOns(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      return result.data
    } catch (error: any) {
      handleApiError(error, "update add-on")
      return null
    }
  }

  const deleteAddOn = async (id: number, isSubcategory: boolean = false) => {
    const headers = getAuthHeaders()
    if (!headers) return false

    triggerAnimation("deleting", isSubcategory ? "Deleting add-on subcategory..." : "Deleting add-on category...")

    try {
      // Add customer_id as query param if customerId is defined
      const endpoint = isSubcategory ? "addon-subcategories" : "addon-categories"
      let url = `${API_BASE_URL}/library/${endpoint}/${id}`
      if (customerId) {
        url += `?customer_id=${customerId}`
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      })

      if (response.status === 204) {
        triggerAnimation("success", isSubcategory ? "Add-on subcategory deleted successfully!" : "Add-on category deleted successfully!")
        // Refresh the appropriate list
        if (isSubcategory) {
          fetchAddOnSubcategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
        } else {
          fetchAddOnCategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
        }
        return true
      }

      const result: ApiResponse<null> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || `Failed to delete add-on ${isSubcategory ? "subcategory" : "category"}` }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || (isSubcategory ? "Add-on subcategory deleted successfully!" : "Add-on category deleted successfully!"))
      // Refresh the appropriate list
      if (isSubcategory) {
        fetchAddOnSubcategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      } else {
        fetchAddOnCategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      }
      return true
    } catch (error: any) {
      handleApiError(error, `delete add-on ${isSubcategory ? "subcategory" : "category"}`)
      return false
    }
  }

  // Create addon category
  const createAddOnCategory = async (data: Omit<AddOnCategory, "id" | "subcategories" | "created_at" | "updated_at">) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("creating", "Creating add-on category...")

    try {
      // Add customer_id if customerId is defined
      let payload: any = { ...data }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(`${API_BASE_URL}/library/addon-categories`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<AddOnCategory> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to create add-on category" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on category created successfully!")
      fetchAddOnCategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      fetchAddOnCategoriesForSelect()
      return result.data
    } catch (error: any) {
      handleApiError(error, "create add-on category")
      return null
    }
  }

  // Update addon category
  const updateAddOnCategory = async (
    id: number,
    data: Partial<Omit<AddOnCategory, "id" | "subcategories" | "created_at" | "updated_at">>,
  ) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("updating", "Updating add-on category...")

    try {
      // Add customer_id if customerId is defined
      let payload: any = { ...data }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(`${API_BASE_URL}/library/addon-categories/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<AddOnCategory> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to update add-on category" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on category updated successfully!")
      fetchAddOnCategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      fetchAddOnCategoriesForSelect()
      return result.data
    } catch (error: any) {
      handleApiError(error, "update add-on category")
      return null
    }
  }

  // Update addon subcategory
  const updateAddOnSubCategory = async (
    id: number,
    data: Partial<Omit<AddOnSubCategory, "id" | "category" | "created_at" | "updated_at">>,
  ) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("updating", "Updating add-on subcategory...")

    try {
      // Add customer_id if customerId is defined
      let payload: any = { ...data }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(`${API_BASE_URL}/library/addon-subcategories/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<AddOnSubCategory> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to update add-on subcategory" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on subcategory updated successfully!")
      fetchAddOnSubcategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      fetchAddOnCategoriesForSelect()
      return result.data
    } catch (error: any) {
      handleApiError(error, "update add-on subcategory")
      return null
    }
  }

  // Add this function in the AddOnsProvider component, after the other CRUD operations
  const createAddOnSubCategory = async (data: AddOnSubCategoryCreate) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("creating", "Creating sub-category...")

    try {
      // Add customer_id if customerId is defined
      let payload: any = { ...data }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(`${API_BASE_URL}/library/addon-subcategories`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<AddOnSubCategory> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to create sub-category" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on Sub-category created successfully!")
      setSuccessMessage(`Successfully created ${data.name}`)
      fetchAddOnSubcategories(currentPage, itemsPerPage, searchQuery, sortColumn as string, sortDirection)
      fetchAddOnCategoriesForSelect()
      return result.data
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "Failed to create add-on sub category . Please try again.",
            variant: "destructive",
          })
      return null
    }
  }

  // Fetch addon categories only (top-level, no parent_id)
  const fetchAddOnCategories = useCallback(
    async (
      page = currentPage,
      limit = itemsPerPage,
      search = searchQuery,
      sortColKey = sortColumn,
      sortDir = sortDirection,
    ) => {
      const headers = getAuthHeaders()
      if (!headers) return

      setIsLoadingAddOnCategories(true)
      setAddOnCategoriesError(null)

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: limit.toString(),
        })

        if (search) params.append("q", search)
        if (sortColKey && typeof sortColKey === "string") {
          params.append("order_by", sortColKey)
          params.append("sort_direction", sortDir)
        }
        // Pass customer_id if customerId is defined (for lab_admin, superadmin, or other roles)
        if (customerId) {
          params.append("customer_id", customerId.toString())
        }
        params.append("language", currentLanguage)

        const response = await fetch(`${API_BASE_URL}/library/addon-categories?${params.toString()}`, { headers })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { data: errorData, status: response.status } }
        }

        const result: ApiResponse<PaginatedResponse<AddOnCategory>> = await response.json()

        if (result.status && result.data) {
          setAddOnCategories(result.data.data)
          setAddOnCategoriesPagination(result.data.pagination)
          clearSelectedItems()
        } else {
          throw new Error(result.message || "Failed to fetch add-on categories")
        }
      } catch (error: any) {
        const errorMsg = handleApiError(error, "fetch add-on categories")
        setAddOnCategoriesError(errorMsg)
        setAddOnCategories([])
        setAddOnCategoriesPagination(null)
      } finally {
        setIsLoadingAddOnCategories(false)
      }
    },
    [
      currentPage,
      itemsPerPage,
      searchQuery,
      sortColumn,
      sortDirection,
      getAuthHeaders,
      clearSelectedItems,
      currentLanguage,
      isLabAdmin,
      customerId,
    ],
  )

  // Fetch addon subcategories only (with parent_id)
  const fetchAddOnSubcategories = useCallback(
    async (
      page = currentPage,
      limit = itemsPerPage,
      search = searchQuery,
      sortColKey = sortColumn,
      sortDir = sortDirection,
    ) => {
      const headers = getAuthHeaders()
      if (!headers) return

      setIsLoadingAddOnSubcategories(true)
      setAddOnSubcategoriesError(null)

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: limit.toString(),
        })

        if (search) params.append("q", search)
        if (sortColKey && typeof sortColKey === "string") {
          params.append("order_by", sortColKey)
          params.append("sort_direction", sortDir)
        }
        // Pass customer_id if customerId is defined (for lab_admin, superadmin, or other roles)
        if (customerId) {
          params.append("customer_id", customerId.toString())
        }
        params.append("language", currentLanguage)

        const response = await fetch(`${API_BASE_URL}/library/addon-subcategories?${params.toString()}`, { headers })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { data: errorData, status: response.status } }
        }

        const result: ApiResponse<PaginatedResponse<AddOnSubCategory>> = await response.json()

        if (result.status && result.data) {
          setAddOnSubcategories(result.data.data)
          setAddOnSubcategoriesPagination(result.data.pagination)
          clearSelectedItems()
        } else {
          throw new Error(result.message || "Failed to fetch add-on subcategories")
        }
      } catch (error: any) {
        const errorMsg = handleApiError(error, "fetch add-on subcategories")
        setAddOnSubcategoriesError(errorMsg)
        setAddOnSubcategories([])
        setAddOnSubcategoriesPagination(null)
      } finally {
        setIsLoadingAddOnSubcategories(false)
      }
    },
    [
      currentPage,
      itemsPerPage,
      searchQuery,
      sortColumn,
      sortDirection,
      getAuthHeaders,
      clearSelectedItems,
      currentLanguage,
      isLabAdmin,
      customerId,
    ],
  )

  // Get addon category detail
  const getAddOnCategoryDetail = useCallback(
    async (id: number): Promise<AddOnCategory | null> => {
      const headers = getAuthHeaders()
      if (!headers) return null

      try {
        let url = `${API_BASE_URL}/library/addon-categories/${id}?language=${currentLanguage}`
        
        // Add customer_id if available
        if (customerId) {
          url += `&customer_id=${customerId}`
        }
        
        const response = await fetch(url, {
          headers,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { data: errorData, status: response.status } }
        }

        const result: ApiResponse<AddOnCategory> = await response.json()
        return result.status && result.data ? result.data : null
      } catch (error: any) {
        handleApiError(error, "fetch add-on category detail")
        return null
      }
    },
    [getAuthHeaders, currentLanguage, handleApiError, customerId],
  )

  // Get addon subcategory detail
  const getAddOnSubcategoryDetail = useCallback(
    async (id: number): Promise<AddOnSubCategory | null> => {
      const headers = getAuthHeaders()
      if (!headers) return null

      try {
        let url = `${API_BASE_URL}/library/addon-subcategories/${id}?language=${currentLanguage}`
        
        // Add customer_id if available
        if (customerId) {
          url += `&customer_id=${customerId}`
        }
        
        const response = await fetch(url, {
          headers,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { data: errorData, status: response.status } }
        }

        const result: ApiResponse<AddOnSubCategory> = await response.json()
        return result.status && result.data ? result.data : null
      } catch (error: any) {
        handleApiError(error, "fetch add-on subcategory detail")
        return null
      }
    },
    [getAuthHeaders, currentLanguage, handleApiError, customerId],
  )

  // Categories operations
  const fetchAddOnCategoriesForSelect = useCallback(async () => {
    const headers = getAuthHeaders()
    if (!headers) return

    setIsLoadingCategoriesForSelect(true)

    try {
      const response = await fetch(`${API_BASE_URL}/library/addon-categories?include=subcategories&limit=500`, {
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw { response: { data: errorData, status: response.status } }
      }

      const result: ApiResponse<PaginatedResponse<AddOnCategory> | AddOnCategory[]> = await response.json()
      let categoriesData: AddOnCategory[] = []

      if (result.status) {
        if ("pagination" in result.data) {
          categoriesData = (result.data as PaginatedResponse<AddOnCategory>).data
        } else {
          categoriesData = result.data as AddOnCategory[]
        }
        setAddOnCategoriesForSelect(categoriesData)
      } else {
        throw new Error(result.message || "Failed to fetch add-on categories")
      }
    } catch (error: any) {
      handleApiError(error, "fetch add-on categories")
    } finally {
      setIsLoadingCategoriesForSelect(false)
    }
  }, [authToken, getAuthHeaders, logout, triggerAnimation])

  // Add similar protection for fetchAddOnGroups
  const fetchAddOnGroups = useCallback(async () => {
    const headers = getAuthHeaders()
    if (!headers) return

    // Prevent duplicate calls if already loaded
    if (addOnGroups.length > 0 && !isLoadingGroups) {
      return
    }

    setIsLoadingGroups(true)

    try {
      const response = await fetch(`${API_BASE_URL}/library/groups?type=Addon`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw { response: { data: errorData, status: response.status } }
      }

      const result: ApiResponse<PaginatedResponse<AddOnGroup> | AddOnGroup[]> = await response.json()
      let groupsData: AddOnGroup[] = []

      if (result.status) {
        if ("pagination" in result.data) {
          groupsData = (result.data as PaginatedResponse<AddOnGroup>).data
        } else {
          groupsData = result.data as AddOnGroup[]
        }
        setAddOnGroups(groupsData)
      } else {
        throw new Error(result.message || "Failed to fetch add-on groups")
      }
    } catch (error: any) {
      handleApiError(error, "fetch add-on groups")
    } finally {
      setIsLoadingGroups(false)
    }
  }, [getAuthHeaders, addOnGroups.length, isLoadingGroups])

  const createAddOnGroup = async (data: Omit<AddOnGroup, "id" | "created_at" | "updated_at">) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("creating", "Creating add-on group...")

    try {
      const response = await fetch(`${API_BASE_URL}/library/groups?type=Addon`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })

      const result: ApiResponse<AddOnGroup> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to create add-on group" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on group created successfully!")
      fetchAddOnGroups()
      return result.data
    } catch (error: any) {
      handleApiError(error, "create add-on group")
      return null
    }
  }

  const updateAddOnGroup = async (id: number, data: Partial<Omit<AddOnGroup, "id" | "created_at" | "updated_at">>) => {
    const headers = getAuthHeaders()
    if (!headers) return null

    triggerAnimation("updating", "Updating add-on group...")

    try {
      const response = await fetch(`${API_BASE_URL}/library/groups?type=Addon/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      })

      const result: ApiResponse<AddOnGroup> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to update add-on group" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on group updated successfully!")
      fetchAddOnGroups()
      return result.data
    } catch (error: any) {
      handleApiError(error, "update add-on group")
      return null
    }
  }

  const deleteAddOnGroup = async (id: number) => {
    const headers = getAuthHeaders()
    if (!headers) return false

    triggerAnimation("deleting", "Deleting add-on group...")

    try {
      const response = await fetch(`${API_BASE_URL}/library/groups?type=Addon/${id}`, {
        method: "DELETE",
        headers,
      })

      if (response.status === 204) {
        triggerAnimation("success", "Add-on group deleted successfully!")
        fetchAddOnGroups()
        return true
      }

      const result: ApiResponse<null> = await response.json()

      if (!response.ok || !result.status) {
        const errorData = result.errors
          ? { errors: result.errors, message: result.message }
          : { message: result.message || "Failed to delete add-on group" }
        throw { response: { data: errorData, status: response.status } }
      }

      triggerAnimation("success", result.message || "Add-on group deleted successfully!")
      fetchAddOnGroups()
      return true
    } catch (error: any) {
      handleApiError(error, "delete add-on group")
      return false
    }
  }

  // Add to the contextValue object
  const contextValue: AddOnsContextState = {
    // Add-ons (for backward compatibility)
    addOns,
    fetchAddOns,
    createAddOn,
    updateAddOn,
    deleteAddOn,
    isLoadingAddOns,
    addOnError,
    addOnPagination,

    // Categories
    addOnCategories,
    fetchAddOnCategories,
    addOnCategoriesPagination,
    isLoadingAddOnCategories,
    addOnCategoriesError,
    getAddOnCategoryDetail,
    createAddOnCategory,
    updateAddOnCategory,

    // Subcategories
    addOnSubcategories,
    fetchAddOnSubcategories,
    addOnSubcategoriesPagination,
    isLoadingAddOnSubcategories,
    addOnSubcategoriesError,
    getAddOnSubcategoryDetail,
    updateAddOnSubCategory,

    // Categories for dropdowns
    addOnCategoriesForSelect,
    fetchAddOnCategoriesForSelect,
    isLoadingCategoriesForSelect,

    // Groups
    addOnGroups,
    fetchAddOnGroups,
    createAddOnGroup,
    updateAddOnGroup,
    deleteAddOnGroup,
    isLoadingGroups,

    // Animation
    showAnimation,
    animationType,
    animationMessage,
    triggerAnimation,

    // Search and pagination
    searchQuery,
    setSearchQuery,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // Selected items
    selectedItems,
    setSelectedItems,
    clearSelectedItems,
    selectAllItems,
    createAddOnSubCategory,
  }

  return (
    <AddOnsContext.Provider value={contextValue}>
      {children}
      {showAnimation && animationType && <AnimationOverlay type={animationType} message={animationMessage} />}
    </AddOnsContext.Provider>
  )
}

export const useAddOns = (): AddOnsContextState => {
  const context = useContext(AddOnsContext)
  if (context === undefined) {
    throw new Error("useAddOns must be used within an AddOnsProvider")
  }
  return context
}

// Animation Overlay Component
interface AnimationOverlayProps {
  type: AnimationType
  message?: string | null
}

const AnimationOverlay: React.FC<AnimationOverlayProps> = ({ type, message }) => {
  let iconElement: ReactNode = null
  let titleText = ""
  let defaultMessage = ""

  switch (type) {
    case "creating":
      iconElement = <Save className="h-16 w-16 animate-bounce text-[#1162a8]" />
      titleText = "Creating Add-on Category..."
      defaultMessage = "Please wait while we create your add-on."
      break
    case "updating":
      iconElement = <Package className="h-16 w-16 animate-pulse text-[#1162a8]" />
      titleText = "Updating Add-on Category..."
      defaultMessage = "Please wait while we update your add-on."
      break
    case "deleting":
      iconElement = <Trash2 className="h-16 w-16 animate-pulse text-red-500" />
      titleText = "Deleting Add-on Category..."
      defaultMessage = "Please wait while we delete the add-on."
      break
    case "success":
      iconElement = <CheckCircle className="h-16 w-16 text-green-500" />
      titleText = "Success!"
      defaultMessage = "Your operation has been completed successfully."
      break
    case "error":
      iconElement = <AlertCircle className="h-16 w-16 text-red-500" />
      titleText = "Error"
      defaultMessage = "There was a problem with your request. Please try again."
      break
    case "loading":
      iconElement = <Loader2 className="h-16 w-16 animate-spin text-[#1162a8]" />
      titleText = "Loading..."
      defaultMessage = "Please wait."
      break
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-xs sm:max-w-md text-center">
        {iconElement && <div className="mb-4">{iconElement}</div>}
        <p className="text-lg font-medium mb-2">{titleText}</p>
        <p className="text-sm text-[#a19d9d]">{message || defaultMessage}</p>
      </div>
    </div>
  )
}
