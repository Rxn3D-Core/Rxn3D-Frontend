"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "./auth-context"
import { AlertCircle, Award, CheckCircle, Save, Trash2 } from "lucide-react"
import { useLanguage } from "./language-context"
interface Retention {
  id: number
  name: string
  code: string
  status: string
  sequence: number
  price?: number
  created_at: string
  updated_at: string
}

interface RetentionResponse {
  status: boolean
  message: string
  data: {
    data: Retention[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

interface CreateRetentionPayload {
  name: string
  code?: string
  sequence?: number
  status?: string
  price?: number
}

interface RetentionContextType {
  retentions: Retention[]
  loading: boolean
  showAnimation: boolean
  error: string | null
  isLoading: boolean
  animationType: "creating" | "updating" | "deleting" | "success" | "error" | null
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  fetchRetentions: (page?: number, perPage?: number, search?: string, orderBy?: string, sortBy?: string) => Promise<void>
  createRetention: (data: CreateRetentionPayload) => Promise<boolean>
  deleteRetention: (id: number) => Promise<boolean>
  updateRetention: (id: number, data: Partial<CreateRetentionPayload>) => Promise<boolean>
  refreshRetentions: () => Promise<void>
  clearMessages: () => void
  clearSelection: () => void
  getRetentionDetail: (id: number, customerId?: number) => Promise<Retention | null>
}
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
const RetentionContext = createContext<RetentionContextType | undefined>(undefined)

export function RetentionProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  const [retentions, setRetentions] = useState<Retention[]>([])
  const [loading, setLoading] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<RetentionContextType["animationType"]>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedItems, setSelectedItemsState] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  })

  const { currentLanguage } = useLanguage()

  // Determine user role and customerId
  
  const userRole = localStorage.getItem("role")
  const isLabAdmin = userRole === "lab_admin"
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(
        () => {
          setShowAnimation(false)
          setAnimationType(null)
        },
        animationType === "success" || animationType === "error" ? 3000 : 1500,
      ) 
      return () => clearTimeout(timer)
    }
  }, [showAnimation, animationType])

   useEffect(() => {
      if (error || successMessage) {
        const timer = setTimeout(() => {
          setError(null)
          setSuccessMessage(null)
        }, 5000)
        return () => clearTimeout(timer)
      }
    }, [error, successMessage])

  const fetchRetentions = useCallback(
    async (page = 1, perPage = 10, search = "", orderBy?: string, sortBy?: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          ...(search && { q: search }),
          ...(orderBy && { order_by: orderBy }),
          ...(sortBy && { sort_by: sortBy }),
        })
        // Pass customer_id if isLabAdmin and customerId is defined
        if (isLabAdmin && customerId) {
          params.append("customer_id", customerId.toString())
        }

        const response = await fetch(`${baseUrl}/library/retentions?${params}&lang=${currentLanguage}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: RetentionResponse = await response.json()

        if (result.status) {
          setRetentions(result.data.data)
          setPagination(result.data.pagination)
        } else {
          throw new Error(result.message || "Failed to fetch retentions")
        }
      } catch (error) {
        console.error("Error fetching retentions:", error)
        toast.error("Failed to fetch retentions")
        setRetentions([])
      } finally {
        setLoading(false)
      }
    },
    [token, currentLanguage, isLabAdmin, customerId],
  )

  const createRetention = useCallback(
    async (payload: CreateRetentionPayload): Promise<boolean> => {
      if (!token) {
        toast.error("Authentication Error: You must be logged in to create a retention.")
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${baseUrl}/library/retentions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        })

        const result = await response.json()
        console.log(result)
        if (!result.ok) {
          setAnimationType("error")
          setError(result.error_description || "Failed to create retention.")
          toast.error(result.error_description || "Failed to create retention.")
          throw new Error(result.error_description || "Failed to create retention")
        }
        
        setAnimationType("success")
        setSuccessMessage(result.message || "Retention created successfully")
        toast.success(result.message || "Retention created successfully")
        await fetchRetentions(1, pagination.per_page) 
        return true
      } catch (err: any) {
        console.error("Error creating retention:", err)
        setAnimationType("error")
        setError(err.message)
        toast.error(err.message || "Failed to create retention3")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [token, fetchRetentions, pagination.per_page, isLabAdmin, customerId],
  )

  const deleteRetention = useCallback(
    async (id: number): Promise<boolean> => {
      if (!token) {
        toast.error("Authentication Error: You must be logged in to delete a retention.")
        return false
      }
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/library/retentions/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) {
          setAnimationType("error")
          setError(result.error_description || "Failed to delete retention.")
          toast.error(result.error_description || "Failed to delete retention.")
          return false
        }
        setAnimationType("success")
        toast.success(result.message || "Retention deleted successfully")
        await fetchRetentions(1, pagination.per_page)
        return true
      } catch (err: any) {
        setAnimationType("error")
        setError(err.message)
        toast.error(err.message || "Failed to delete retention")
        return false
      }
    },
    [token, fetchRetentions, pagination.per_page],
  )

  const updateRetention = useCallback(
    async (id: number, payload: Partial<CreateRetentionPayload>): Promise<boolean> => {
      if (!token) {
        toast.error("Authentication Error: You must be logged in to update a retention.")
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("updating")
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/library/retentions/${id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const result = await response.json()
        if (!response.ok) {
          setAnimationType("error")
          setError(result.error_description || "Failed to update retention.")
          toast.error(result.error_description || "Failed to update retention.")
          return false
        }
        setAnimationType("success")
        toast.success(result.message || "Retention updated successfully")
        await fetchRetentions(1, pagination.per_page)
        return true
      } catch (err: any) {
        setAnimationType("error")
        setError(err.message)
        toast.error(err.message || "Failed to update retention")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [token, fetchRetentions, pagination.per_page],
  )

  const getRetentionDetail = useCallback(
    async (id: number, customerId?: number): Promise<Retention | null> => {
      if (!token) {
        toast.error("Authentication Error: You must be logged in to view retention details.")
        return null
      }
      try {
        // Check if user is superadmin
        const userRoles = user?.roles || []
        const userRole = user?.role || ""
        const isSuperAdmin = Array.isArray(userRoles) 
          ? userRoles.includes("superadmin")
          : userRole === "superadmin" || userRoles === "superadmin"

        // Build URL with customer_id query parameter if not superadmin and customerId is provided
        let url = `${baseUrl}/library/retentions/${id}`
        if (!isSuperAdmin && customerId) {
          url += `?customer_id=${customerId}`
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch retention detail (status: ${response.status})`)
        }
        const result = await response.json()
        // API returns { status, message, data }
        if (result.status && result.data) {
          return result.data
        }
        throw new Error(result.message || "Failed to fetch retention detail")
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch retention detail")
        return null
      }
    },
    [token, user]
  )

  const refreshRetentions = useCallback(async () => {
    await fetchRetentions(pagination.current_page, pagination.per_page)
  }, [fetchRetentions, pagination.current_page, pagination.per_page])

    const clearMessages = useCallback(() => {
      setError(null)
      setSuccessMessage(null)
    }, [])
  
    const clearSelection = useCallback(() => {
      setSelectedItemsState([])
    }, [])

  return (
    <RetentionContext.Provider
      value={{
        retentions,
        loading,
        pagination,
        animationType,
        error,
        showAnimation,
        isLoading,
        fetchRetentions,
        createRetention,
        deleteRetention,
        updateRetention,
        refreshRetentions,
        clearMessages,
        clearSelection,
        getRetentionDetail,
      }}
    >
      {children}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          {" "}
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md text-center">
            {animationType === "creating" && (
              <>
                <Save className="h-16 w-16 animate-bounce mb-4 text-[#1162a8]" />
                <p className="text-lg font-medium mb-2">Creating Retention...</p>
                <p className="text-sm text-gray-500">Please wait while we create your grade.</p>
              </>
            )}
            {animationType === "updating" && (
              <>
                <Award className="h-16 w-16 animate-pulse mb-4 text-[#1162a8]" />
                <p className="text-lg font-medium mb-2">Updating Retention...</p>
                <p className="text-sm text-gray-500">Please wait while we update your grade.</p>
              </>
            )}
            {animationType === "deleting" && (
              <>
                <Trash2 className="h-16 w-16 animate-pulse mb-4 text-red-500" />
                <p className="text-lg font-medium mb-2">Deleting Retention(s)...</p>
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
    </RetentionContext.Provider>
  )
}

export function useRetention() {
  const context = useContext(RetentionContext)
  if (context === undefined) {
    throw new Error("useRetention must be used within a RetentionProvider")
  }
  return context
}
