"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Package, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context" 
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import { get } from "http"

// Define Zod schemas
const CasePanPayloadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  status: z.string().optional(),
  color_code: z.string().min(1, "Color code is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  quantity: z.number().optional(), // Add quantity field for lab_admin
})

const CasePanResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      code: z.string(),
      status: z.string(),
      color_code: z.string(),
      description: z.string(),
      type: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
    })
  ),
  pagination: z.object({
    total: z.number(),
    per_page: z.number(),
    current_page: z.number(),
    last_page: z.number(),
  }),
})


// Define types based on actual API response
export interface CasePan {
  id: number
  name: string
  code: string
  status: string
  color_code: string
  description: string
  type: string
  quantity?: number // Add quantity field (optional for backward compatibility)
  created_at: string
  updated_at: string
}


export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type CasePanPayload = z.infer<typeof CasePanPayloadSchema>
export type CasePanResponse = z.infer<typeof CasePanResponseSchema>


type ProductLibraryContextType = {
  casePans: CasePan[]
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
  fetchCasePans: (page?: number, perPage?: number, customCustomerId?: string | number) => Promise<void>
  createCasePan: (payload: CasePanPayload) => Promise<void>
  updateCasePan: (id: number, payload: Partial<CasePanPayload>) => Promise<void>
  deleteCasePan: (id: number) => Promise<void>
  bulkDeleteCasePans: (ids: number[]) => Promise<void>
  getCasePanDetail: (id: number) => Promise<any>

  // UI state management
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  clearMessages: () => void
  clearSelection: () => void

  casePanDetail: any
  isDetailLoading: boolean
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 25,
  current_page: 1,
  last_page: 1,
}

const ProductLibraryContext = createContext<ProductLibraryContextType | undefined>(undefined)

export const useProductLibrary = () => {
  const context = useContext(ProductLibraryContext)
  if (context === undefined) {
    throw new Error("useProductLibrary must be used within a ProductLibraryProvider")
  }
  return context
}

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const ProductLibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [casePans, setCasePans] = useState<CasePan[]>([])
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
  const [casePanDetail, setCasePanDetail] = useState<any>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMountedRef = useRef(true)

  const { toast } = useToast()

  // Helper to get user role
  
  const userRole = localStorage.getItem("role")
  const isLabAdmin = userRole === "lab_admin"
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

  // Clear animation after it completes
  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false)
        setAnimationType(null)
      }, 3000)
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
    if (!token) throw new Error(t("authenticationTokenNotFound") || "Authentication token not found.")
    return token
  }

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  const fetchCasePans = useCallback(
    async (page = 1, perPage = 25, customCustomerId?: string | number) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        // Prepare parameters
        const params = {
          per_page: perPage,
          status: "Active",
          order_by: sortColumn || "name",
          sort_by: sortDirection || "asc",
          lang: currentLanguage,
        } as Record<string, any>;

        if (page > 1) {
          params.page = page
        }
        if (searchQuery) {
          params.q = searchQuery
        }

        // Add customer_id if lab_admin
        const cid = customerId || customCustomerId
        if (isLabAdmin && cid) {
          params.customer_id = cid
        }

        let response;
        const urlParams = new URLSearchParams();
        if (isLabAdmin && cid) {
         
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) urlParams.append(key, String(value));
          });
          response = await fetch( `${API_BASE_URL}/library/case-pans?${urlParams.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } else {
          // GET for others
          const urlParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) urlParams.append(key, String(value));
          });
          response = await fetch(
            `${API_BASE_URL}/library/case-pans?${urlParams.toString()}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        }

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          setError(t("failedToFetchCasePans") || "Failed to fetch case pans.")
          throw new Error(t("failedToFetchCasePans") || "Failed to fetch case pans.")
        }

        const responseData = await response.json()
        const items = responseData.data.data
        const pagination = responseData.data.pagination

        setCasePans(items || [])
        setPagination(pagination || defaultPagination)
      } catch (error: any) {
        console.error("Error fetching case pans:", error)
        setError(error.message || t("failedToFetchCasePans") || "Failed to fetch case pans")
        toast({
          title: t("error") || "Error",
          description: t("failedToFetchCasePans") || "Failed to fetch case pans. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [searchQuery, sortColumn, sortDirection, currentLanguage, isLabAdmin, customerId, toast, t],
  )

  const createCasePan = useCallback(
    async (payload: CasePanPayload) => {
      CasePanPayloadSchema.parse(payload)
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)
      try {
        const token = getAuthToken()
        
        // Ensure quantity is properly formatted if present
        const formattedPayload = {
          ...payload,
          ...(payload.quantity !== undefined && { quantity: Number(payload.quantity) })
        }
        
        // Add customer_id if lab_admin
        if (isLabAdmin && customerId) {
          formattedPayload.customer_id = customerId
        }
        
        const response = await fetch(`${API_BASE_URL}/library/case-pans`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedPayload),
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
              title: "error",
              description: result?.error_description || t("somethingWentWrong") || "Something went wrong",
              variant: "destructive",
            })
            }

            setAnimationType("error")
            setError(result?.error_description || t("failedToCreateCasePan") || "Failed to create case pan.")
            return
        }

        const result = await response.json()

      
        setSuccessMessage(`Successfully created ${payload.name}`)

        // Refresh the case pans list
        await fetchCasePans()
      } catch (err: any) {
        console.error("Error creating case pan:", err)
        setAnimationType("error")
        setError(err.message || t("failedToCreateCasePanPleaseTryAgain") || "Failed to create case pan. Please try again.")

        toast({
          title: t("error") || "Error",
          description: err.message || t("failedToCreateCasePanPleaseTryAgain") || "Failed to create case pan. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchCasePans, isLabAdmin, customerId, t],
  )

  const updateCasePan = useCallback(
    async (id: number, payload: Partial<CasePanPayload>) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("updating")
      setError(null)

      try {
        const token = getAuthToken()
        
        // Add customer_id if lab_admin
        const formattedPayload = { ...payload }
        if (isLabAdmin && customerId) {
          formattedPayload.customer_id = customerId
        }
        
        const response = await fetch(`${API_BASE_URL}/library/case-pans/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedPayload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.error_description || t("failedToUpdateCasePan") || "Failed to update case pan.")

          toast({
            title: t("error") || "Error",
            description: result?.error_description || t("failedToUpdateCasePan") || "Failed to update case pan.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: t("casePanUpdated", "Case Pan Updated"),
          description: t("casePanUpdatedSuccessfully", "Case pan updated successfully"),
          variant: "default",
        })

        setSuccessMessage(t("casePanUpdatedSuccessfully", "Case pan updated successfully"))

        // Refresh the case pans list
        await fetchCasePans()
      } catch (err: any) {
        console.error("Error updating case pan:", err)
        setAnimationType("error")
        setError(err.message || t("failedToUpdateCasePanPleaseTryAgain", "Failed to update case pan. Please try again."))

        toast({
          title: t("error") || "Error",
          description: err.message || t("failedToUpdateCasePanPleaseTryAgain", "Failed to update case pan. Please try again."),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchCasePans, t, isLabAdmin, customerId],
  )

  const deleteCasePan = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      try {
        const token = getAuthToken()
        
        // Add customer_id as query param if lab_admin
        let url = `${API_BASE_URL}/library/case-pans/${id}`;
        if (isLabAdmin && customerId) {
          url += `?customer_id=${customerId}`;
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
          setError(result?.message || t("failedToDeleteCasePan") || "Failed to delete case pan.")

          toast({
            title: t("error") || "Error",
            description: result?.message || t("failedToDeleteCasePan") || "Failed to delete case pan.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: t("casePanDeleted") || "Case Pan Deleted",
          description: t("casePanDeletedSuccessfully") || "Case pan has been successfully deleted.",
        })

        setSuccessMessage(t("casePanDeletedSuccessfully") || "Case pan deleted successfully")

        // Remove from selected items if it was selected
        setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))

        // Refresh the case pans list
        await fetchCasePans()
      } catch (err: any) {
        console.error("Error deleting case pan:", err)
        setAnimationType("error")
        setError(err.message || t("failedToDeleteCasePanPleaseTryAgain") || "Failed to delete case pan. Please try again.")

        toast({
          title: t("error") || "Error",
          description: err.message || t("failedToDeleteCasePanPleaseTryAgain") || "Failed to delete case pan. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchCasePans, t, isLabAdmin, customerId],
  )

  const bulkDeleteCasePans = useCallback(
    async (ids: number[]) => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)

      try {
        const token = getAuthToken()
        
        // Create the payload with ids and customer_id if needed
        const payload = { ids };
        if (isLabAdmin && customerId) {
          payload.customer_id = customerId;
        }
        
        const response = await fetch(`${API_BASE_URL}/library/case-pans/bulk-delete`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          const result = await response.json()
          setAnimationType("error")
          setError(result?.message || t("failedToDeleteCasePans") || "Failed to delete case pans.")

          toast({
            title: t("error") || "Error",
            description: result?.message || t("failedToDeleteCasePans") || "Failed to delete case pans.",
            variant: "destructive",
          })
          return
        }

        setAnimationType("success")
        toast({
          title: t("casePansDeleted") || "Case Pans Deleted",
          description: t("successfullyDeletedCasePans", { count: ids.length }) || `Successfully deleted ${ids.length} case pan(s).`,
        })

        setSuccessMessage(
          t("successfullyDeletedCasePans", { count: ids.length }) || `Successfully deleted ${ids.length} case pan(s)`
        )

        // Clear selection
        setSelectedItems([])

        // Refresh the case pans list
        await fetchCasePans()
      } catch (err: any) {
        console.error("Error bulk deleting case pans:", err)
        setAnimationType("error")
        setError(err.message || t("failedToDeleteCasePansPleaseTryAgain") || "Failed to delete case pans. Please try again.")

        toast({
          title: t("error") || "Error",
          description: err.message || t("failedToDeleteCasePansPleaseTryAgain") || "Failed to delete case pans. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchCasePans, t, isLabAdmin, customerId],
  )

  const getCasePanDetail = useCallback(
    async (id: number) => {
      setIsDetailLoading(true)
      setCasePanDetail(null)
      try {
        const token = getAuthToken()
        const lang = currentLanguage
        let url = `${API_BASE_URL}/library/case-pans/${id}?lang=${lang}`
        if (isLabAdmin && customerId) {
          url += `&customer_id=${customerId}`
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
            return
          }
          setCasePanDetail(null)
          throw new Error(t("failedToFetchCasePanDetail") || "Failed to fetch case pan detail.")
        }
        const result = await response.json()
        setCasePanDetail(result.data)
        return result.data
      } catch (error: any) {
        setCasePanDetail(null)
        setError(error.message || t("failedToFetchCasePanDetail") || "Failed to fetch case pan detail.")
        return null
      } finally {
        setIsDetailLoading(false)
      }
    },
    [currentLanguage, isLabAdmin, customerId, t],
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const contextValue = useMemo(() => ({
    casePans,
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
    fetchCasePans,
    createCasePan,
    updateCasePan,
    deleteCasePan,
    bulkDeleteCasePans,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setSelectedItems,
    clearMessages,
    clearSelection,
    getCasePanDetail,
    casePanDetail,
    isDetailLoading,
  }), [
    casePans,
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
    fetchCasePans,
    createCasePan,
    updateCasePan,
    deleteCasePan,
    bulkDeleteCasePans,
    getCasePanDetail,
    casePanDetail,
    isDetailLoading,
  ])

  return (
    <ProductLibraryContext.Provider value={contextValue}>
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
                <p className="text-lg font-medium mb-2">Creating Case Pan...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we create your case pan.</p>
              </>
            )}

            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Package className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Updating Case Pan...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we update your case pan.</p>
              </>
            )}

            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  <Trash2 className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Deleting Case Pan...</p>
                <p className="text-sm text-[#a19d9d] text-center">Please wait while we delete the case pan(s).</p>
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
    </ProductLibraryContext.Provider>
  )
}
