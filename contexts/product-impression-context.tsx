"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Package, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"

// Define types based on actual API response
export interface Impression {
  id: number
  name: string
  code: string
  sequence: number
  url: string
  image_url?: string
  is_digital_impression: string
  status: string
  created_at: string
  updated_at: string
}

export interface ImpressionPayload {
  name: string
  code?: string
  sequence?: number
  url?: string
  image?: string // Base64 encoded image
  is_digital_impression?: string
  status?: string
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface ImpressionsResponse {
  data: Impression[]
  pagination: PaginationInfo
}

type ImpressionsContextType = {
  impressions: Impression[]
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

  // CRUD operations
  fetchImpressions: (page?: number, perPage?: number) => Promise<void>
  createImpression: (payload: ImpressionPayload) => Promise<void>
  updateImpression: (id: number, payload: Partial<ImpressionPayload>) => Promise<void>
  deleteImpression: (id: number) => Promise<void>
  bulkDeleteImpressions: (ids: number[]) => Promise<void>

  // UI state management
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  clearMessages: () => void
  clearSelection: () => void
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

const ImpressionsContext = createContext<ImpressionsContextType | undefined>(undefined)

export const useImpressions = () => {
  const context = useContext(ImpressionsContext)
  if (context === undefined) {
    throw new Error("useImpressions must be used within an ImpressionsProvider")
  }
  return context
}

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const ImpressionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [impressions, setImpressions] = useState<Impression[]>([])
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

  const fetchImpressions = useCallback(
    async (page = 1, perPage = 10) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        const params = new URLSearchParams({
          per_page: perPage.toString(),
          status: "Active", // Default to Active status
        })

        // Add page parameter if not the first page
        if (page > 1) {
          params.append("page", page.toString())
        }

        // Add search query parameter
        if (searchQuery) {
          params.append("q", searchQuery)
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

        const response = await fetch(`${API_BASE_URL}/library/impressions?${params}&lang=${currentLanguage}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            setError("Unauthorized: Token is invalid or expired.")
          } else {
            setError("Failed to fetch impressions.")
          }
          throw new Error("Failed to fetch impressions.")
        }

        const result = await response.json()
        const data: ImpressionsResponse = result.data
        setImpressions(data.data || [])
        setPagination(data.pagination || defaultPagination)
      } catch (error: any) {
        console.error("Error fetching impressions:", error)
        setError(error.message || "Failed to fetch impressions")
        toast({
          title: "Error",
          description: "Failed to fetch impressions. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [searchQuery, sortColumn, sortDirection, toast, currentLanguage, isLabAdmin, customerId],
  )

  const createImpression = useCallback(
    async (payload: ImpressionPayload) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      try {
        const token = getAuthToken()
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/impressions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          const result = await response.json()
          const validationError = new Error(result?.error_description || "Failed to create impression.")
          ;(validationError as any).response = { data: result }
          
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
              description: result?.error_description || "Something went wrong",
              variant: "destructive",
            })
          }

          setAnimationType("error")
          setError(result?.error_description || "Failed to create impression.")
          throw validationError
        }

        const result = await response.json()

        toast({
          title: "Impression Created",
          description: `Successfully created ${payload.name}`,
          variant: "default",
        })

        setSuccessMessage(`Successfully created ${payload.name}`)

        // Refresh the impressions list
        await fetchImpressions()
      } catch (err: any) {
        console.error("Error creating impression:", err)
        setAnimationType("error")
        setError(err.message || "Failed to create impression. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to create impression. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchImpressions, isLabAdmin, customerId],
  )

  const updateImpression = useCallback(
    async (id: number, payload: Partial<ImpressionPayload>) => {
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
        const response = await fetch(`${API_BASE_URL}/library/impressions/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          const result = await response.json()
          const validationError = new Error(result?.error_description || "Failed to update impression.")
          ;(validationError as any).response = { data: result }
          
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
              description: result?.error_description || "Failed to update impression.",
              variant: "destructive",
            })
          }
          
          setAnimationType("error")
          setError(result?.error_description || "Failed to update impression.")
          throw validationError
        }

        setAnimationType("success")
        toast({
          title: "Impression Updated",
          description: "Impression updated successfully",
          variant: "default",
        })

        setSuccessMessage("Impression updated successfully")

        // Refresh the impressions list
        await fetchImpressions()
      } catch (err: any) {
        console.error("Error updating impression:", err)
        setAnimationType("error")
        setError(err.message || "Failed to update impression. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to update impression. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchImpressions, isLabAdmin, customerId],
  )

  const deleteImpression = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      try {
        const token = getAuthToken()
        let url = `${API_BASE_URL}/library/impressions/${id}`
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
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to delete impression.")

          toast({
            title: "Error",
            description: result?.message || "Failed to delete impression.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: "Impression Deleted",
          description: "Impression has been successfully deleted.",
        })

        setSuccessMessage("Impression deleted successfully")

        // Remove from selected items if it was selected
        setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))

        // Refresh the impressions list
        await fetchImpressions()
      } catch (err: any) {
        console.error("Error deleting impression:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete impression. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to delete impression. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchImpressions, isLabAdmin, customerId],
  )

  const bulkDeleteImpressions = useCallback(
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
        const response = await fetch(`${API_BASE_URL}/library/impressions/bulk-delete`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })

        if (!response.ok) {
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || "Failed to delete impressions.")

          toast({
            title: "Error",
            description: result?.message || "Failed to delete impressions.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: "Impressions Deleted",
          description: `Successfully deleted ${ids.length} impression(s).`,
        })

        setSuccessMessage(`Successfully deleted ${ids.length} impression(s)`)

        // Clear selection
        setSelectedItems([])

        // Refresh the impressions list
        await fetchImpressions()
      } catch (err: any) {
        console.error("Error bulk deleting impressions:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete impressions. Please try again.")

        toast({
          title: "Error",
          description: err.message || "Failed to delete impressions. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchImpressions, isLabAdmin, customerId],
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  return (
    <ImpressionsContext.Provider
      value={{
        impressions,
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
        fetchImpressions,
        createImpression,
        updateImpression,
        deleteImpression,
        bulkDeleteImpressions,
        setSearchQuery,
        setSortColumn,
        setSortDirection,
        setSelectedItems,
        clearMessages,
        clearSelection,
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
                <p className="text-lg font-medium mb-2">Creating Impression...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we create your impression.</p>
              </>
            )}

            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Package className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Updating Impression...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we update your impression.</p>
              </>
            )}

            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  <Trash2 className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Deleting Impression...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we delete the impression(s).</p>
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
    </ImpressionsContext.Provider>
  )
}
