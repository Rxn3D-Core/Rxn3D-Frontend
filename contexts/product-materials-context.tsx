"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Package, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "./language-context"
import { useAuth } from "@/contexts/auth-context"

// Define types based on actual API response
export interface Material {
  id: number
  name: string
  code: string
  status: string
  sequence: number
  image_url?: string | null
  lab_material?: {
    image_url?: string | null
    price?: number | string | null
    status?: string | null
  }
  created_at: string
  updated_at: string
}

export interface MaterialPayload {
  name: string
  code?: string
  sequence?: number
  status?: string
  price?: number
  image?: string | null
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface MaterialResponse {
  data: Material[]
  pagination: PaginationInfo
}

type MaterialsContextType = {
  materials: Material[]
  isLoading: boolean
  error: string | null
  successMessage: string | null
  showAnimation: boolean
  animationType: string | null
  pagination: PaginationInfo
  searchQuery: string
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null
  selectedItems: number[]
  filterName: string
  filterStatus: string

  // CRUD operations
  fetchMaterials: (page?: number, perPage?: number) => Promise<void>
  createMaterial: (payload: MaterialPayload) => Promise<void>
  updateMaterial: (id: number, payload: Partial<MaterialPayload>) => Promise<void>
  deleteMaterial: (id: number) => Promise<void>
  bulkDeleteMaterials: (ids: number[]) => Promise<void>
  getMaterialDetail: (id: number) => Promise<any | null> // <-- add this

  // UI state management
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  setFilterName: (name: string) => void
  setFilterStatus: (status: string) => void
  clearMessages: () => void
  clearSelection: () => void

  // Add user and userRole to context type
  user?: any
  userRole?: string
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined)

export const useMaterials = () => {
  const context = useContext(MaterialsContext)
  if (context === undefined) {
    throw new Error("useMaterials must be used within a MaterialsProvider")
  }
  return context
}

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const MaterialsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(false)
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
  const [filterName, setFilterName] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")

  const { toast } = useToast()
  const { currentLanguage } = useLanguage()
  const { token: authToken, user } = useAuth()

  // Determine user role and customerId
  
  const userRole = localStorage.getItem("role")
  const isLabAdmin = userRole === "lab_admin"
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

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

  const getAuthToken = () => {
    const token = localStorage.getItem("token")
    if (!token) throw new Error("No authentication token found")
    return token
  }

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  const fetchMaterials = useCallback(
    async (page = 1, perPage = 10) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        const params = new URLSearchParams({
          per_page: perPage.toString(),
        })

        // Add page parameter if not the first page
        if (page > 1) {
          params.append("page", page.toString())
        }

        // Add search query parameter
        if (searchQuery) {
          params.append("q", searchQuery)
        }

        // Add filterName and filterStatus to params if set
        if (filterName) {
          params.append("name", filterName)
        }
        if (filterStatus) {
          params.append("status", filterStatus)
        }

        // Add sorting parameters
        if (sortColumn && sortDirection) {
          params.append("order_by", sortColumn)
          params.append("sort_by", sortDirection)
        } else {
          // Default sorting
          params.append("order_by", "name")
          params.append("sort_by", "asc")
        }

        // Pass customer_id if isLabAdmin and customerId is defined
        if (isLabAdmin && customerId) {
          params.append("customer_id", customerId.toString())
        }

        const response = await fetch(`${API_BASE_URL}/library/materials?${params}&lang=${currentLanguage}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          setError("Failed to fetch materials.")
          throw new Error("Failed to fetch materials.")
        }

        const result = await response.json()
        const materialsArr = result.data?.data || []
        const paginationObj = result.data?.pagination || defaultPagination
        setMaterials(materialsArr)
        setPagination(paginationObj)
      } catch (error: any) {
        console.error("Error fetching materials:", error)
        setError(error.message || "Failed to fetch materials")
        toast({
          title: "Error",
          description: "Failed to fetch materials. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [
      searchQuery,
      sortColumn,
      sortDirection,
      toast,
      currentLanguage,
      isLabAdmin,
      customerId,
      filterName,
      filterStatus,
    ],
  )

  const createMaterial = useCallback(
    async (payload: MaterialPayload) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      try {
        const token = getAuthToken()
        // Always send price (default to 0 if not present)
        const bodyPayload = {
          ...payload,
          sequence: payload.sequence || 1,
          status: payload.status || "Active",
          price: typeof payload.price === "number" ? payload.price : 0,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/materials`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
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
          setError(result?.message || "Failed to create material.")
          return
        }

        const result = await response.json()

        toast({
          title: "Material Created",
          description: `Successfully created ${payload.name}`,
          variant: "default",
        })

        setSuccessMessage(`Successfully created ${payload.name}`)

        if (result?.data && result.data.id) {
          setMaterials((prev) => [
            {
              id: result.data.id,
              name: result.data.name,
              code: result.data.code,
              status: result.data.status,
              sequence: result.data.sequence,
              created_at: result.data.created_at,
              updated_at: result.data.updated_at,
            },
            ...prev,
          ])
        } 
        await fetchMaterials()
      } catch (err: any) {
        console.error("Error creating material:", err)
        setAnimationType("error")
        setError(err.message || "Failed to create material. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to create material. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchMaterials, isLabAdmin, customerId],
  )

  const updateMaterial = useCallback(
    async (id: number, payload: Partial<MaterialPayload>) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("updating")
      setError(null)

      try {
        const token = getAuthToken()
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/materials/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to update material.")

          toast({
            title: "Error",
            description: result?.message || "Failed to update material.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: "Material Updated",
          description: "Material updated successfully",
          variant: "default",
        })

        setSuccessMessage("Material updated successfully")

        // Refresh the materials list
        await fetchMaterials()
      } catch (err: any) {
        console.error("Error updating material:", err)
        setAnimationType("error")
        setError(err.message || "Failed to update material. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to update material. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchMaterials, isLabAdmin, customerId],
  )

  const deleteMaterial = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      try {
        const token = getAuthToken()
        let url = `${API_BASE_URL}/library/materials/${id}`
        if (isLabAdmin && customerId) {
          url += `?customer_id=${customerId}`
        }
        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to delete material.")

          toast({
            title: "Error",
            description: result?.message || "Failed to delete material.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: "Material Deleted",
          description: "Material has been successfully deleted.",
        })

        setSuccessMessage("Material deleted successfully")

        // Remove from selected items if it was selected
        setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))

        // Refresh the materials list
        await fetchMaterials()
      } catch (err: any) {
        console.error("Error deleting material:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete material. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to delete material. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchMaterials, isLabAdmin, customerId],
  )

  const bulkDeleteMaterials = useCallback(
    async (ids: number[]) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      try {
        const token = getAuthToken()
        const bodyPayload = {
          ids,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/materials/bulk-delete`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to delete materials.")

          toast({
            title: "Error",
            description: result?.message || "Failed to delete materials.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: "Materials Deleted",
          description: `Successfully deleted ${ids.length} material(s).`,
        })

        setSuccessMessage(`Successfully deleted ${ids.length} material(s)`)

        // Clear selection
        setSelectedItems([])

        // Refresh the materials list
        await fetchMaterials()
      } catch (err: any) {
        console.error("Error bulk deleting materials:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete materials. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to delete materials. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchMaterials, isLabAdmin, customerId],
  )

  const getMaterialDetail = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        let url = `${API_BASE_URL}/library/materials/${id}`
        if (isLabAdmin && customerId) {
          url += `?customer_id=${customerId}`
        }
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return null
          }
          setError("Failed to fetch material detail.")
          return null
        }
        const result = await response.json()
        return result?.data || null
      } catch (err: any) {
        setError(err.message || "Failed to fetch material detail.")
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isLabAdmin, customerId]
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  return (
    <MaterialsContext.Provider
      value={{
        materials,
        isLoading,
        error,
        successMessage,
        showAnimation,
        animationType,
        pagination,
        searchQuery,
        sortColumn,
        sortDirection,
        selectedItems,
        filterName,
        setFilterName,
        filterStatus,
        setFilterStatus,
        fetchMaterials,
        createMaterial,
        updateMaterial,
        deleteMaterial,
        bulkDeleteMaterials,
        getMaterialDetail, // <-- add here
        setSearchQuery,
        setSortColumn,
        setSortDirection,
        setSelectedItems,
        clearMessages,
        clearSelection,
        // Expose user and userRole
        user,
        userRole,
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
                <p className="text-lg font-medium mb-2">Creating Material...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we create your material.</p>
              </>
            )}

            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Package className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Updating Material...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we update your material.</p>
              </>
            )}

            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  <Trash2 className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Deleting Material...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we delete the material(s).</p>
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
    </MaterialsContext.Provider>
  )
}
