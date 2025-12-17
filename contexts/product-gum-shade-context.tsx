"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation" // Added import
import { toast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Save, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context" // Added import

// Types
export interface GumShade {
  id: number
  name: string
  status: "Active" | "Inactive"
  sequence: number
  created_at: string
  updated_at: string
}

export interface GumShadeBrand {
  id: number
  name: string
  system_name: string
  status: "Active" | "Inactive"
  sequence: number
  created_at: string
  updated_at: string
  shades: GumShade[]
}

export interface GumShadeGroup {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface GumShadeBrandResponse {
  status: boolean
  message: string
  data: {
    data: GumShadeBrand[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface GumShadeGroupResponse {
  status: boolean
  message: string
  data: {
    data: GumShadeGroup[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface CreateGumShadeBrandPayload {
  name: string
  system_name: string
  sequence: number
  status: "Active" | "Inactive"
  shades: {
    name: string
    sequence: number
    status: "Active" | "Inactive"
  }[]
}

export interface CreateCustomGumShadePayload {
  brand_id: number
  name: string
  sequence: number
  status: "Active" | "Inactive"
}

export interface Pagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface GumShadesContextType {
  // Gum Shade Brands
  gumShadeBrands: GumShadeBrand[]
  isLoading: boolean
  error: string | null
  pagination: Pagination
  searchQuery: string
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null

  // Gum Shade Groups
  gumShadeGroups: GumShadeGroup[]
  isGroupsLoading: boolean

  // Available shades for modal
  availableShades: GumShade[]
  isAvailableShadesLoading: boolean

  // Animation states
  showAnimation: boolean
  animationType: "creating" | "updating" | "deleting" | "success" | "error" | null
  successMessage: string | null

  // Actions
  fetchGumShadeBrands: (
    page?: number,
    perPage?: number,
    search?: string,
    sortCol?: string,
    sortDir?: "asc" | "desc",
  ) => Promise<void>
  fetchGumShadeGroups: () => Promise<void>
  fetchAvailableShades: () => Promise<void>
  createGumShadeBrand: (data: CreateGumShadeBrandPayload) => Promise<boolean>
  updateGumShadeBrand: (id: number, data: Partial<CreateGumShadeBrandPayload>) => Promise<boolean>
  deleteGumShadeBrand: (id: number) => Promise<boolean>
  createGumShadeGroup: (name: string) => Promise<boolean>
  createCustomGumShade: (data: CreateCustomGumShadePayload) => Promise<boolean>

  // State setters
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  clearError: () => void
}

const GumShadesContext = createContext<GumShadesContextType | undefined>(undefined)

export function useGumShades() {
  const context = useContext(GumShadesContext)
  if (context === undefined) {
    throw new Error("useGumShades must be used within a GumShadesProvider")
  }
  return context
}

interface GumShadesProviderProps {
  children: ReactNode
}

export function GumShadesProvider({ children }: GumShadesProviderProps) {
  // Gum Shade Brands state
  const [gumShadeBrands, setGumShadeBrands] = useState<GumShadeBrand[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  })

  // Gum Shade Groups state
  const [gumShadeGroups, setGumShadeGroups] = useState<GumShadeGroup[]>([])
  const [isGroupsLoading, setIsGroupsLoading] = useState(false)

  // Available shades state
  const [availableShades, setAvailableShades] = useState<GumShade[]>([])
  const [isAvailableShadesLoading, setIsAvailableShadesLoading] = useState(false)

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

  // Animation states
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<"creating" | "updating" | "deleting" | "success" | "error" | null>(
      "creating",
    )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
  const { currentLanguage } = useLanguage()
  const router = useRouter() // Initialize router
  const { user } = useAuth() // Use useAuth hook

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false)
        setAnimationType(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showAnimation])

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  // Helper function to handle API errors
  const handleApiError = (error: any, defaultMessage: string) => {
    console.error("API Error:", error)

    if (error.message === "Unauthorized" || error.status === 401) {
      setError("Your session has expired. Please log in again.")
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      })
      return
    }

    const errorMessage = error.response?.data?.message || error.message || defaultMessage
    setError(errorMessage)
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    })
  }

  // Redirect to login helper
  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  // Show animation helper
  const showAnimationWithType = (type: "creating" | "updating" | "deleting" | "success" | "error") => {
    setAnimationType(type)
    setShowAnimation(true)

    if (type === "success" || type === "error") {
      setTimeout(() => {
        setShowAnimation(false)
      }, 2000)
    }
  }

  // Fetch gum shade brands
  const fetchGumShadeBrands = useCallback(
    async (
      page = 1,
      perPage = 10,
      search = "",
      sortCol: string | null = null,
      sortDir: "asc" | "desc" | null = null,
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          ...(search && { search }),
          ...(sortCol && { sort_column: sortCol }),
          ...(sortDir && { sort_direction: sortDir }),
        })

        // Add customer_id if lab_admin with primary customer
        if (user?.roles?.includes("lab_admin") && user?.customers?.length) {
          const primaryCustomer = user.customers.find((customer) => customer.is_primary === 1)
          if (primaryCustomer) {
            params.append("customer_id", primaryCustomer.id.toString())
          }
        }

        const response = await fetch(`${API_BASE_URL}/library/gum-shade-brands?${params}&lang=${currentLanguage}`, {
          method: "GET",
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: GumShadeBrandResponse = await response.json()

        if (result.status) {
          setGumShadeBrands(result.data?.data || [])
          setPagination(result.data.pagination)
        } else {
          throw new Error(result.message || "Failed to fetch gum shade brands")
        }
      } catch (error: any) {
        handleApiError(error, "Failed to fetch gum shade brands")
      } finally {
        setIsLoading(false)
      }
    },
    [API_BASE_URL, currentLanguage, user] // Only include stable values!
  )

  // Fetch gum shade groups
  const fetchGumShadeGroups = useCallback(async () => {
    setIsGroupsLoading(true)

    try {
      let url = `${API_BASE_URL}/library/groups?GumShade`
      // Add customer_id if lab_admin with primary customer
      if (user?.roles?.includes("lab_admin") && user?.customers?.length) {
        const primaryCustomer = user.customers.find((customer) => customer.is_primary === 1)
        if (primaryCustomer) {
          url += `&customer_id=${primaryCustomer.id}`
        }
      }

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: GumShadeGroupResponse = await response.json()

      if (result.status) {
        setGumShadeGroups(result.data.data)
      } else {
        throw new Error(result.message || "Failed to fetch gum shade groups")
      }
    } catch (error: any) {
      console.error("Error fetching gum shade groups:", error)
      toast({
        title: "Error",
        description: "Failed to fetch gum shade groups",
        variant: "destructive",
      })
    } finally {
      setIsGroupsLoading(false)
    }
  }, [API_BASE_URL, getAuthHeaders, handleApiError, currentLanguage, user])

  // Fetch available shades for modal
  const fetchAvailableShades = async () => {
    setIsAvailableShadesLoading(true)

    try {
      let url = `${API_BASE_URL}/library/gum-shade-brands?per_page=10&lang=${currentLanguage}`
      // Add customer_id if lab_admin with primary customer
      if (user?.roles?.includes("lab_admin") && user?.customers?.length) {
        const primaryCustomer = user.customers.find((customer) => customer.is_primary === 1)
        if (primaryCustomer) {
          url += `&customer_id=${primaryCustomer.id}`
        }
      }

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: GumShadeBrandResponse = await response.json()

      if (result.status) {
        // Extract all unique shades from all brands
        const allShades: GumShade[] = []
        const seenShades = new Set<string>()

        result.data.data.forEach((brand) => {
          brand.shades.forEach((shade) => {
            if (!seenShades.has(shade.name.toLowerCase())) {
              seenShades.add(shade.name.toLowerCase())
              allShades.push(shade)
            }
          })
        })

        setAvailableShades(allShades)
      }
    } catch (error: any) {
      console.error("Error fetching available shades:", error)
    } finally {
      setIsAvailableShadesLoading(false)
    }
  }

  // Helper to get gum shade brand detail by ID
  const getGumShadeBrandDetail = async (id: number): Promise<GumShadeBrand | null> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/library/gum-shade-brands/${id}?lang=${currentLanguage}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      )
      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.status && result.data) {
        return result.data as GumShadeBrand
      }
      return null
    } catch (error) {
      console.error("Failed to fetch gum shade brand detail", error)
      return null
    }
  }

  // Create gum shade brand
  const createGumShadeBrand = async (data: CreateGumShadeBrandPayload): Promise<boolean> => {
    showAnimationWithType("creating")
    setError(null)

    try {
      // Add customer_id if user is lab_admin with a primary customer
      let payload: any = { ...data }
      if (user?.roles?.includes("lab_admin") && Array.isArray(user.customers)) {
        const primaryCustomer = user.customers.find((customer) => customer.is_primary === 1)
        if (primaryCustomer) {
          payload.customer_id = primaryCustomer.id
        }
      }

      const response = await fetch(`${API_BASE_URL}/library/gum-shade-brands`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return false
        }
        if (response.status === 422) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Validation error")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.status) {
        setSuccessMessage("Gum shade brand created successfully!")
        // Show success toast
        toast({
          title: "Success",
          description: "Gum shade brand created successfully!",
        })

        // Refresh the list
        await fetchGumShadeBrands(pagination.current_page, pagination.per_page, searchQuery, sortColumn, sortDirection)

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)

        return true
      } else {
        throw new Error(result.message || "Failed to create gum shade brand")
      }
    } catch (error: any) {
      showAnimationWithType("error")
      handleApiError(error, "Failed to create gum shade brand")
      return false
    }
  }

  // Update gum shade brand
  const updateGumShadeBrand = async (id: number, data: Partial<CreateGumShadeBrandPayload>): Promise<boolean> => {
    showAnimationWithType("updating")
    setError(null)

    try {
      const detail = await getGumShadeBrandDetail(id)
      if (!detail) throw new Error("Failed to fetch gum shade brand detail before updating")

      const mergedPayload = {
        name: data.name ?? detail.name,
        system_name: data.system_name ?? detail.system_name,
        sequence: data.sequence ?? detail.sequence,
        status: data.status ?? detail.status,
        shades: data.shades ?? (detail.shades?.map(s => ({
          name: s.name,
          sequence: s.sequence,
          status: s.status,
        })) ?? []),
      }

      const response = await fetch(`${API_BASE_URL}/library/gum-shade-brands/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(mergedPayload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return false
        }
        if (response.status === 422) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Validation error")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.status) {
        showAnimationWithType("success")
        setSuccessMessage("Gum shade brand updated successfully!")

        toast({
          title: "Success",
          description: "Gum shade brand updated successfully!",
        })

        await fetchGumShadeBrands(pagination.current_page, pagination.per_page, searchQuery, sortColumn, sortDirection)

        setTimeout(() => setSuccessMessage(null), 5000)

        return true
      } else {
        throw new Error(result.message || "Failed to update gum shade brand")
      }
    } catch (error: any) {
      showAnimationWithType("error")
      handleApiError(error, "Failed to update gum shade brand")
      return false
    }
  }

  // Delete gum shade brand
  const deleteGumShadeBrand = async (id: number): Promise<boolean> => {
    showAnimationWithType("deleting")
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/library/gum-shade-brands/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return false
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.status) {
        setSuccessMessage("Gum shade brand deleted successfully!")

        toast({
          title: "Success",
          description: "Gum shade brand deleted successfully!",
        })

        await fetchGumShadeBrands(pagination.current_page, pagination.per_page, searchQuery, sortColumn, sortDirection)

        setTimeout(() => setSuccessMessage(null), 5000)

        return true
      } else {
        throw new Error(result.message || "Failed to delete gum shade brand")
      }
    } catch (error: any) {
      showAnimationWithType("error")
      handleApiError(error, "Failed to delete gum shade brand")
      return false
    }
  }

  // Create gum shade group
  const createGumShadeGroup = async (name: string): Promise<boolean> => {
    showAnimationWithType("creating")
    setError(null)

    try {
      // Prepare payload
      let payload: any = { name }
      // If user is lab_admin, add customer_id from primary customer
      if (user?.roles?.includes("lab_admin") && Array.isArray(user.customers)) {
        const primaryCustomer = user.customers.find((customer) => customer.is_primary === 1)
        if (primaryCustomer) {
          payload.customer_id = primaryCustomer.id
        }
      }

      const response = await fetch(`${API_BASE_URL}/library/gum-shade-groups`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return false
        }
        if (response.status === 422) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Validation error")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.status) {
        showAnimationWithType("success")
        setSuccessMessage("Gum shade group created successfully!")

        toast({
          title: "Success",
          description: "Gum shade group created successfully!",
        })

        await fetchGumShadeGroups()
        setTimeout(() => setSuccessMessage(null), 5000)

        return true
      } else {
        throw new Error(result.message || "Failed to create gum shade group")
      }
    } catch (error: any) {
      showAnimationWithType("error")
      handleApiError(error, "Failed to create gum shade group")
      return false
    }
  }

  // Create custom gum shade
  const createCustomGumShade = async (data: CreateCustomGumShadePayload): Promise<boolean> => {
    showAnimationWithType("creating")
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/library/gum-shades`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return false
        }
        if (response.status === 422) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Validation error")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.status) {
        showAnimationWithType("success")
        setSuccessMessage("Custom gum shade created successfully!")

        toast({
          title: "Success",
          description: "Custom gum shade created successfully!",
        })

        // Refresh available shades and brands
        await Promise.all([
          fetchAvailableShades(),
          fetchGumShadeBrands(pagination.current_page, pagination.per_page, searchQuery, sortColumn, sortDirection),
        ])

        setTimeout(() => setSuccessMessage(null), 5000)

        return true
      } else {
        throw new Error(result.message || "Failed to create custom gum shade")
      }
    } catch (error: any) {
      showAnimationWithType("error")
      handleApiError(error, "Failed to create custom gum shade")
      return false
    }
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  const value: GumShadesContextType = {
    // Gum Shade Brands
    gumShadeBrands,
    isLoading,
    error,
    pagination,
    searchQuery,
    sortColumn,
    sortDirection,

    // Gum Shade Groups
    gumShadeGroups,
    isGroupsLoading,

    // Available shades
    availableShades,
    isAvailableShadesLoading,

    // Animation states
    showAnimation,
    animationType,
    successMessage,

    // Actions
    fetchGumShadeBrands,
    fetchGumShadeGroups,
    fetchAvailableShades,
    createGumShadeBrand,
    updateGumShadeBrand,
    deleteGumShadeBrand,
    createGumShadeGroup,
    createCustomGumShade,

    // State setters
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    clearError,
  }

  return (
    <GumShadesContext.Provider value={value}>
      {children}

      {/* Animation Overlay */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          {" "}
          {/* Increased z-index */}
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md text-center">
            {animationType === "creating" && (
              <>
                <Save className="h-16 w-16 animate-bounce mb-4 text-[#1162a8]" />
                <p className="text-lg font-medium mb-2">Creating Gum Shade Brand</p>
                <p className="text-sm text-gray-500">Please wait while we create your grade.</p>
              </>
            )}
            {animationType === "updating" && (
              <>
                <Save className="h-16 w-16 animate-pulse mb-4 text-[#1162a8]" />
                <p className="text-lg font-medium mb-2">Updating Gum Shade Brand</p>
                <p className="text-sm text-gray-500">Please wait while we update your grade.</p>
              </>
            )}
            {animationType === "deleting" && (
              <>
                <Trash2 className="h-16 w-16 animate-pulse mb-4 text-red-500" />
                <p className="text-lg font-medium mb-2">Deleting Gum Shade Brand(s)...</p>
                <p className="text-sm text-gray-500">Please wait while we delete the selected grade(s).</p>
              </>
            )}
            {animationType === "success" && (
              <>
                <CheckCircle className="h-16 w-16 mb-4 text-green-500" />
                <p className="text-lg font-medium mb-2">Success!</p>
                <p className="text-sm text-gray-500">Your operation has been completed successfully.</p>
              </>
            )}
            {animationType === "error" && (
              <>
                <AlertCircle className="h-16 w-16 mb-4 text-red-500" />
                <p className="text-lg font-medium mb-2">Error</p>
                <p className="text-sm text-gray-500">
                  {error || "There was a problem with your request. Please try again."}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </GumShadesContext.Provider>
  )
}
