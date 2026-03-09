"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Award, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "./language-context"
// Define types based on actual API response
export interface Shade {
  id?: number // ID is optional for new shades
  name: string
  status: string
  sequence: number
  brand_id?: number // Brand ID to filter by system_name
  created_at?: string
  updated_at?: string
}

export interface TeethShadeBrand {
  id: number
  name: string
  system_name: string
  status: string
  sequence: number
  brand_color?: string
  created_at: string
  updated_at: string
  shades: Shade[]
}

export interface TeethShadeGroup {
  id: number
  name: string
  status: string
  sequence: number
  created_at: string
  updated_at: string
}

export interface ShadePayload {
  name: string
  status: string
  sequence: number
}

export interface TeethShadeBrandPayload {
  name: string
  system_name: string
  sequence: number
  status: string
  brand_color?: string
  shades: ShadePayload[]
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface TeethShadeBrandResponse {
  status: boolean
  message: string
  data: {
    data: TeethShadeBrand[]
    pagination: PaginationInfo
  }
}

export interface TeethShadeGroupResponse {
  status: boolean
  message: string
  data: {
    data: TeethShadeGroup[]
    pagination?: PaginationInfo
  }
}

type TeethShadesContextType = {
  teethShadeBrands: TeethShadeBrand[]
  teethShadeGroups: TeethShadeGroup[]
  isLoading: boolean
  isGroupsLoading: boolean
  error: string | null
  successMessage: string | null
  showAnimation: boolean
  animationType: string | null
  pagination: PaginationInfo
  searchQuery: string
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null
  selectedItems: number[]
  statusFilter: string

  // CRUD operations
  fetchTeethShadeBrands: (page?: number, perPage?: number) => Promise<void>
  fetchTeethShadeGroups: () => Promise<void>
  createTeethShadeBrand: (payload: TeethShadeBrandPayload) => Promise<boolean>
  updateTeethShadeBrand: (id: number, payload: Partial<TeethShadeBrandPayload>) => Promise<boolean>
  deleteTeethShadeBrand: (id: number) => Promise<boolean>
  bulkDeleteTeethShadeBrands: (ids: number[]) => Promise<boolean>
  createTeethShadeGroup: (payload: { name: string; status: string; sequence: number }) => Promise<boolean>

  // UI state management
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  setStatusFilter: (status: string) => void
  clearMessages: () => void
  clearSelection: () => void
  fetchAvailableShades: () => Promise<Shade[]>
  createCustomShade: (payload: {
    brand_id: number
    name: string
    sequence: number
    status: string
  }) => Promise<boolean>
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

const TeethShadesContext = createContext<TeethShadesContextType | undefined>(undefined)

export const useTeethShades = () => {
  const context = useContext(TeethShadesContext)
  if (context === undefined) {
    throw new Error("useTeethShades must be used within a TeethShadesProvider")
  }
  return context
}

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const TeethShadesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token: authToken, user } = useAuth() // Get token from AuthContext

  // Determine user role and customerId
  const userRole = localStorage.getItem("role")
  
  const isLabAdmin = userRole === "lab_admin"
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

  const [teethShadeBrands, setTeethShadeBrands] = useState<TeethShadeBrand[]>([])
  const [teethShadeGroups, setTeethShadeGroups] = useState<TeethShadeGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGroupsLoading, setIsGroupsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<"creating" | "updating" | "deleting" | "success" | "error" | null>(
    null,
  )
  const [pagination, setPagination] = useState<PaginationInfo>(defaultPagination)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const { currentLanguage } = useLanguage() 

  const { toast } = useToast()

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  // Clear animation after it completes
  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false)
        setAnimationType(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showAnimation])

  // Clear messages after a delay
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const fetchTeethShadeBrands = useCallback(
    async (page?: number, perPage?: number) => {
      setIsLoading(true)
      setError(null)

      if (!authToken) {
        setError("Authentication required to fetch teeth shade brands.")
        setTeethShadeBrands([])
        setPagination(defaultPagination)
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return
      }

      try {
        const params = new URLSearchParams()

        if (perPage != null) {
          params.append("per_page", perPage.toString())
        }

        if (page != null && page > 1) {
          params.append("page", page.toString())
        }

        if (searchQuery) {
          params.append("q", searchQuery)
        }

        if (statusFilter) {
          params.append("status", statusFilter)
        }

        if (sortColumn && sortDirection) {
          params.append("order_by", sortColumn)
          params.append("sort_by", sortDirection)
        } else {
          params.append("order_by", "sequence")
          params.append("sort_by", "asc")
        }

        // Pass customer_id if isLabAdmin and customerId is defined
        if (isLabAdmin && customerId) {
          params.append("customer_id", customerId.toString())
        }

        const response = await fetch(`${API_BASE_URL}/library/teeth-shade-brands?${params}&lang=${currentLanguage}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
         
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          if (response.status === 401) {
            setError("Unauthorized: Token is invalid or expired.")
          } else {
            setError("Failed to fetch teeth shade brands.")
          }
          throw new Error("Failed to fetch teeth shade brands.")
        }

        const result: TeethShadeBrandResponse = await response.json()
        // Handle both paginated ({ data: { data: [], pagination: {} } }) and non-paginated ({ data: [] }) responses
        const brands = Array.isArray(result.data) ? result.data : (result.data?.data || [])
        setTeethShadeBrands(brands)
        if (!Array.isArray(result.data) && result.data?.pagination) {
          setPagination(result.data.pagination)
        }
      } catch (error: any) {
        console.error("Error fetching teeth shade brands:", error)
        setError(error.message || "Failed to fetch teeth shade brands")
        toast({
          title: "Error",
          description: "Failed to fetch teeth shade brands. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, searchQuery, sortColumn, sortDirection, statusFilter, toast, currentLanguage, isLabAdmin, customerId],
  )

  const fetchTeethShadeGroups = useCallback(async () => {
    setIsGroupsLoading(true)
    setError(null)

    if (!authToken) {
      setError("Authentication required to fetch teeth shade groups.")
      setTeethShadeGroups([])
      setIsGroupsLoading(false)
      toast({
        title: "Authentication Error",
        description: "No authentication token found. Please log in.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/library/groups?type=TeethShade`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
       
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return
        }
        if (response.status === 401) {
          setError("Unauthorized: Token is invalid or expired.")
        } else {
          setError("Failed to fetch teeth shade groups.")
        }
        throw new Error("Failed to fetch teeth shade groups.")
      }

      const result: TeethShadeGroupResponse = await response.json()
      setTeethShadeGroups(result.data.data || [])
    } catch (error: any) {
      console.error("Error fetching teeth shade groups:", error)
      setError(error.message || "Failed to fetch teeth shade groups")
      toast({
        title: "Error",
        description: "Failed to fetch teeth shade groups. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGroupsLoading(false)
    }
  }, [authToken, toast, currentLanguage])

  const createTeethShadeBrand = useCallback(
    async (payload: TeethShadeBrandPayload): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      if (!authToken) {
        setError("Authentication required to create teeth shade brand.")
        setAnimationType("error")
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return false
      }

      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/teeth-shade-brands`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json()
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]: [string, any]) => {
              if (Array.isArray(messages)) {
                messages.forEach((message) => {
                  toast({
                    title: `Validation Error - ${field}`,
                    description: message,
                    variant: "destructive",
                  })
                })
              }
            })
          } else {
            toast({
              title: "Error",
              description: result?.message || "Something went wrong",
              variant: "destructive",
            })
          }

          setAnimationType("error")
          setError(result?.message || "Failed to create teeth shade brand.")
          return false
        }

        const result = await response.json()

        toast({
          title: "Teeth Shade Brand Created",
          description: `Successfully created ${payload.name}`,
          variant: "default",
        })

        setSuccessMessage(`Successfully created ${payload.name}`)

        await fetchTeethShadeBrands() // Refresh the list
        return true
      } catch (err: any) {
        console.error("Error creating teeth shade brand:", err)
        setAnimationType("error")
        setError(err.message || "Failed to create teeth shade brand. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to create teeth shade brand. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchTeethShadeBrands, isLabAdmin, customerId],
  )

  const updateTeethShadeBrand = useCallback(
    async (id: number, payload: Partial<TeethShadeBrandPayload>): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("updating")
      setError(null)

      if (!authToken) {
        setError("Authentication required to update teeth shade brand.")
        setAnimationType("error")
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return false
      }

      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/teeth-shade-brands/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to update teeth shade brand.")

          toast({
            title: "Error",
            description: result?.message || "Failed to update teeth shade brand.",
            variant: "destructive",
          })
          return false
        }

        setAnimationType("success")
        toast({
          title: "Teeth Shade Brand Updated",
          description: "Teeth shade brand updated successfully",
          variant: "default",
        })

        setSuccessMessage("Teeth shade brand updated successfully")

        await fetchTeethShadeBrands() // Refresh the list
        return true
      } catch (err: any) {
        console.error("Error updating teeth shade brand:", err)
        setAnimationType("error")
        setError(err.message || "Failed to update teeth shade brand. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to update teeth shade brand. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchTeethShadeBrands, isLabAdmin, customerId],
  )

  const deleteTeethShadeBrand = useCallback(
    async (id: number): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      if (!authToken) {
        setError("Authentication required to delete teeth shade brand.")
        setAnimationType("error")
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return false
      }

      try {
        let url = `${API_BASE_URL}/library/teeth-shade-brands/${id}`
        if (isLabAdmin && customerId) {
          url += `?customer_id=${customerId}`
        }
        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to delete teeth shade brand.")

          toast({
            title: "Error",
            description: result?.message || "Failed to delete teeth shade brand.",
            variant: "destructive",
          })
          return false
        }

        setAnimationType("success")
        toast({
          title: "Teeth Shade Brand Deleted",
          description: "Teeth shade brand has been successfully deleted.",
        })

        setSuccessMessage("Teeth shade brand deleted successfully")

        setSelectedItems((prev) => prev.filter((itemId) => itemId !== id)) // Remove from selected
        await fetchTeethShadeBrands() // Refresh the list
        return true
      } catch (err: any) {
        console.error("Error deleting teeth shade brand:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete teeth shade brand. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to delete teeth shade brand. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchTeethShadeBrands, isLabAdmin, customerId],
  )

  const bulkDeleteTeethShadeBrands = useCallback(
    async (ids: number[]): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      if (!authToken) {
        setError("Authentication required to bulk delete teeth shade brands.")
        setAnimationType("error")
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return false
      }

      try {
        const bodyPayload = {
          ids,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/teeth-shade-brands/bulk-delete`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to bulk delete teeth shade brands.")

          toast({
            title: "Error",
            description: result?.message || "Failed to bulk delete teeth shade brands.",
            variant: "destructive",
          })
          return false
        }

        setAnimationType("success")
        toast({
          title: "Teeth Shade Brands Deleted",
          description: `Successfully deleted ${ids.length} teeth shade brand(s).`,
        })

        setSuccessMessage(`Successfully deleted ${ids.length} teeth shade brand(s)`)

        setSelectedItems([]) // Clear selection
        await fetchTeethShadeBrands() // Refresh the list
        return true
      } catch (err: any) {
        console.error("Error bulk deleting teeth shade brands:", err)
        setAnimationType("error")
        setError(err.message || "Failed to bulk delete teeth shade brands. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to bulk delete teeth shade brands. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchTeethShadeBrands, isLabAdmin, customerId],
  )

  const createTeethShadeGroup = useCallback(
    async (payload: { name: string; status: string; sequence: number }): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      if (!authToken) {
        setError("Authentication required to create teeth shade group.")
        setAnimationType("error")
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return false
      }

      try {
        const response = await fetch(`${API_BASE_URL}/library/teeth-shade-groups`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json()
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]: [string, any]) => {
              if (Array.isArray(messages)) {
                messages.forEach((message) => {
                  toast({
                    title: `Validation Error - ${field}`,
                    description: message,
                    variant: "destructive",
                  })
                })
              }
            })
          } else {
            toast({
              title: "Error",
              description: result?.message || "Something went wrong",
              variant: "destructive",
            })
          }

          setAnimationType("error")
          setError(result?.message || "Failed to create teeth shade group.")
          return false
        }

        const result = await response.json()

        toast({
          title: "Teeth Shade Group Created",
          description: `Successfully created ${payload.name}`,
          variant: "default",
        })

        setSuccessMessage(`Successfully created ${payload.name}`)

        await fetchTeethShadeGroups() // Refresh the list
        return true
      } catch (err: any) {
        console.error("Error creating teeth shade group:", err)
        setAnimationType("error")
        setError(err.message || "Failed to create teeth shade group. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to create teeth shade group. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchTeethShadeGroups],
  )

  // Add custom shade to a specific brand
  const createCustomShade = useCallback(
    async (payload: {
      brand_id: number
      name: string
      sequence: number
      status: string
    }): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      if (!authToken) {
        setError("Authentication required to create custom shade.")
        setAnimationType("error")
        setIsLoading(false)
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        })
        return false
      }

      try {
        const response = await fetch(`${API_BASE_URL}/library/teeth-shades`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json()
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]: [string, any]) => {
              if (Array.isArray(messages)) {
                messages.forEach((message) => {
                  toast({
                    title: `Validation Error - ${field}`,
                    description: message,
                    variant: "destructive",
                  })
                })
              }
            })
          } else {
            toast({
              title: "Error",
              description: result?.message || "Failed to create custom shade",
              variant: "destructive",
            })
          }

          setAnimationType("error")
          setError(result?.message || "Failed to create custom shade.")
          return false
        }

        const result = await response.json()

        toast({
          title: "Custom Shade Created",
          description: `Successfully created shade ${payload.name}`,
          variant: "default",
        })

        setSuccessMessage(`Successfully created shade ${payload.name}`)
        setSelectedItems([]) 
        await fetchAvailableShades() 
        setShowAnimation(false) 

        return true
      } catch (err: any) {
        console.error("Error creating custom shade:", err)
        setAnimationType("error")
        setError(err.message || "Failed to create custom shade. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to create custom shade. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast],
  )

  // Fetch all available shades from all brands
  const fetchAvailableShades = useCallback(async (): Promise<Shade[]> => {
    if (!authToken) {
      console.warn("No auth token available for fetching shades")
      return []
    }

    try {
      const response = await fetch(`${API_BASE_URL}/library/teeth-shade-brands?per_page=100`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
       
      })

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin()
          return []
        }
        console.error("Failed to fetch available shades")
        return []
      }

      const result: TeethShadeBrandResponse = await response.json()

      // Extract all unique shades from all brands, including brand_id
      const allShades: Shade[] = []
      const seenShadeNames = new Set<string>()

      result.data.data.forEach((brand) => {
        brand.shades.forEach((shade) => {
          // Create a unique key combining shade name and brand_id to allow same shade name in different systems
          const shadeKey = `${shade.name}-${brand.id}`
          if (!seenShadeNames.has(shadeKey)) {
            seenShadeNames.add(shadeKey)
            allShades.push({
              ...shade,
              brand_id: brand.id,
            })
          }
        })
      })

      // Sort by sequence or name
      return allShades.sort((a, b) => a.sequence - b.sequence)
    } catch (error) {
      console.error("Error fetching available shades:", error)
      return []
    }
  }, [authToken])

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  return (
    <TeethShadesContext.Provider
      value={{
        teethShadeBrands,
        teethShadeGroups,
        isLoading,
        isGroupsLoading,
        error,
        successMessage,
        showAnimation,
        animationType,
        pagination,
        searchQuery,
        sortColumn,
        sortDirection,
        selectedItems,
        statusFilter,
        fetchTeethShadeBrands,
        fetchTeethShadeGroups,
        createTeethShadeBrand,
        updateTeethShadeBrand,
        deleteTeethShadeBrand,
        bulkDeleteTeethShadeBrands,
        createTeethShadeGroup,
        setSearchQuery,
        setSortColumn,
        setSortDirection,
        setSelectedItems,
        setStatusFilter,
        clearMessages,
        clearSelection,
        fetchAvailableShades,
        createCustomShade,
      }}
    >
      {children}

      {/* Animation Overlay */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md">
            {animationType === "creating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Save className="h-16 w-16 animate-bounce" />
                </div>
                <p className="text-lg font-medium mb-2">Creating...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we create your item.</p>
              </>
            )}

            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Save className="h-16 w-16 animate-bounce" />
                </div>
                <p className="text-lg font-medium mb-2">Updating...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we update your item.</p>
              </>
            )}

            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  <Trash2 className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Deleting...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we delete the item(s).</p>
              </>
            )}

            {animationType === "success" && (
              <>
                <div className="mb-4 text-green-500">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">Success!</p>
                <p className="text-sm text-[#a19d9d] text-center">Your operation has been completed successfully.</p>
              </>
            )}

            {animationType === "error" && (
              <>
                <div className="mb-4 text-red-500">
                  <AlertCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">Error</p>
                <p className="text-sm text-[#a19d9d] text-center">
                  There was a problem with your request. Please try again.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </TeethShadesContext.Provider>
  )
}
