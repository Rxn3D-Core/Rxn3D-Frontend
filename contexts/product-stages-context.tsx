"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context" // Assuming you have this
import { Award, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useLanguage } from "./language-context"
// --- Types based on API ---
export interface StageConfiguration {
  grade: "Yes" | "No"
  material: "Yes" | "No"
  gum_shade: "Yes" | "No"
  retention: "Yes" | "No"
  impression: "Yes" | "No"
  teeth_shade: "Yes" | "No"
}

export interface Stage {
  id: number
  name: string
  code: string
  status: "Active" | "Inactive"
  is_common: "Yes" | "No"
  sequence: number
  days_to_pickup: number
  days_to_process: number
  days_to_deliver: number
  is_releasing_stage: "Yes" | "No"
  is_stage_with_addons: "Yes" | "No"
  price?: number // Add optional price field
  customer_id: number
  is_custom: "Yes" | "No"
  image_url?: string | null // Add image_url field from API response
  stage_configurations?: StageConfiguration
  lab_stage?: {
    id: number
    customer_id: number
    stage_id: number
    price: string
    status: "Active" | "Inactive"
    created_at: string
    updated_at: string
    deleted_at: string | null
  }
  created_at: string
  updated_at: string
}

export interface StagePayload {
  name: string
  code: string
  status: "Active" | "Inactive"
  is_common: "Yes" | "No"
  sequence: number
  days_to_pickup: number
  days_to_process: number
  days_to_deliver: number
  is_releasing_stage: "Yes" | "No"
  is_stage_with_addons: "Yes" | "No"
  price?: number // Optional price field for lab_admin users
  stage_configurations: StageConfiguration
  image?: string // Optional image field (base64 or URL)
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface StagesListResponse {
  status: boolean
  message: string
  data: {
    data: Stage[]
    pagination: PaginationInfo
  }
}

export interface CreateStageResponse {
  status: boolean
  message: string
  data: Stage // The created stage object
}

export interface StageVariation {
  id: number
  stage_id: number
  name: string
  image_url: string | null
  status: "Active" | "Inactive"
  sequence: number
  is_default: "Yes" | "No"
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StageVariationPayload {
  stage_id: number
  name: string
  image: string // Base64 encoded image
  status?: "Active" | "Inactive"
  sequence?: number
  is_default?: "Yes" | "No"
}

export interface StageVariationUpdatePayload {
  name?: string
  image?: string // Base64 encoded image
  status?: "Active" | "Inactive"
  sequence?: number
  is_default?: "Yes" | "No"
}

// --- Context Type ---
type StagesContextType = {
  stages: Stage[]
  isLoading: boolean
  error: string | null
  successMessage: string | null
  showAnimation: boolean
  animationType: "creating" | "updating" | "deleting" | "success" | "error" | null
  pagination: PaginationInfo
  searchQuery: string
  sortColumn: keyof Stage | string | null
  sortDirection: "asc" | "desc" | null
  selectedItems: number[]
  statusFilter: "Active" | "Inactive" | ""

  fetchStages: (page?: number, perPage?: number) => Promise<void>
  createStage: (payload: StagePayload) => Promise<boolean>
  updateStage: (id: number, payload: Partial<StagePayload>) => Promise<boolean>
  deleteStage: (id: number) => Promise<boolean>
  bulkDeleteStages: (ids: number[]) => Promise<boolean>

  setSearchQuery: (query: string) => void
  setSort: (column: keyof Stage | string | null, direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  setStatusFilter: (status: "Active" | "Inactive" | "") => void
  clearMessages: () => void
  clearSelection: () => void
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

const StagesContext = createContext<StagesContextType | undefined>(undefined)

export const useStages = () => {
  const context = useContext(StagesContext)
  if (context === undefined) {
    throw new Error("useStages must be used within a StagesProvider")
  }
  return context
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export const StagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token: authToken, user } = useAuth()
  const { toast } = useToast()

  // Determine user role and customerId - use state to handle SSR
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLabAdmin, setIsLabAdmin] = useState(false)
  const [customerId, setCustomerId] = useState<number | undefined>(undefined)

  // Initialize role and customerId from localStorage and user object (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role")
      setUserRole(role)
      const labAdmin = role === "lab_admin"
      setIsLabAdmin(labAdmin)
      
      // Set customerId based on role
      if (labAdmin) {
        const customer = user?.customers?.find((customer) => customer.id)
        setCustomerId(customer?.id)
      } else {
        setCustomerId(undefined)
      }
    }
  }, [user?.customers])

  const [stages, setStages] = useState<Stage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<StagesContextType["animationType"]>(null)
  const [pagination, setPagination] = useState<PaginationInfo>(defaultPagination)
  const [searchQuery, setSearchQueryState] = useState("")
  const [sortColumn, setSortColumnState] = useState<keyof Stage | string | null>("name")
  const [sortDirection, setSortDirectionState] = useState<"asc" | "desc" | null>("asc")
  const [selectedItems, setSelectedItemsState] = useState<number[]>([])
  const [statusFilter, setStatusFilterState] = useState<"Active" | "Inactive" | "">("")
  const { currentLanguage } = useLanguage()

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
  }, [showAnimation, animationType, currentLanguage])

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage, currentLanguage])

  const setSort = useCallback((column: keyof Stage | string | null, direction: "asc" | "desc" | null) => {
    setSortColumnState(column)
    setSortDirectionState(direction)
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query)
    setPagination((prev) => ({ ...prev, current_page: 1 })) // Reset to page 1 on search
  }, [])

  const setStatusFilter = useCallback((status: "Active" | "Inactive" | "") => {
    setStatusFilterState(status)
    setPagination((prev) => ({ ...prev, current_page: 1 })) // Reset to page 1 on filter change
  }, [])

  const setSelectedItems = useCallback((items: number[]) => {
    setSelectedItemsState(items)
  }, [])

  const fetchStages = useCallback(
    async (page = pagination.current_page, perPage = pagination.per_page) => {
      if (!authToken) {
        setError("Authentication required to fetch stages.")
        setStages([])
        setPagination(defaultPagination)
        return
      }
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      })
      if (searchQuery) params.append("q", searchQuery)
      if (statusFilter) params.append("status", statusFilter)
      if (sortColumn && sortDirection) {
        params.append("order_by", sortColumn as string)
        params.append("sort_by", sortDirection)
      }
      // Pass customer_id if isLabAdmin and customerId is defined
      if (isLabAdmin && customerId) {
        params.append("customer_id", customerId.toString())
      }

      try {
        const response = await fetch(`${API_BASE_URL}/library/stages?${params.toString()}&lang=${currentLanguage}`, {
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Failed to fetch stages" }))
          throw new Error(errData.message || `HTTP error ${response.status}`)
        }
        const result: StagesListResponse = await response.json()
        setStages(result.data.data || [])
        setPagination(result.data.pagination || defaultPagination)
      } catch (err: any) {
        console.error("Error fetching stages:", err)
        setError(err.message)
        setStages([])
        setPagination(defaultPagination)
        toast({ title: "Error Fetching Stages", description: err.message, variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    },
    [
      authToken,
      searchQuery,
      statusFilter,
      sortColumn,
      sortDirection,
      pagination.current_page,
      pagination.per_page,
      toast,
      currentLanguage,
      isLabAdmin,
      customerId,
    ],
  )

  const createStage = useCallback(
    async (payload: StagePayload): Promise<boolean> => {
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create a stage.",
          variant: "destructive",
        })
        return false
      }
      setIsLoading(true) // Use general loading for now, or specific createLoading
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)

      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/stages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        })
        const result = await response.json()
        if (!response.ok) {
          setAnimationType("error")
          setError(result.message || "Failed to create stage.")
          toast({
            title: "Creation Failed",
            description: result.message || "Could not create the stage.",
            variant: "destructive",
          })
          return false
        }
        setSuccessMessage(result.message || "Stage created successfully!")
        toast({ title: "Stage Created", description: result.message })
        await fetchStages(1, pagination.per_page) // Refresh and go to first page
        return true
      } catch (err: any) {
        console.error("Error creating stage:", err)
        setAnimationType("error")
        setError(err.message)
        toast({ title: "Creation Error", description: err.message, variant: "destructive" })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchStages, pagination.per_page, isLabAdmin, customerId],
  )

  const updateStage = useCallback(
    async (id: number, payload: Partial<StagePayload>): Promise<boolean> => {
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to update a stage.",
          variant: "destructive",
        })
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("updating")
      setError(null)
      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/stages/${id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        })
        const result = await response.json()
        if (!response.ok) {
          setAnimationType("error")
          setError(result.message || "Failed to update stage.")
          toast({
            title: "Update Failed",
            description: result.message || "Could not update the stage.",
            variant: "destructive",
          })
          return false
        }
        setAnimationType("success")
        setSuccessMessage(result.message || "Stage updated successfully!")
        toast({ title: "Stage Updated", description: result.message })
        await fetchStages(pagination.current_page, pagination.per_page) // Refresh current page
        return true
      } catch (err: any) {
        setAnimationType("error")
        setError(err.message)
        toast({ title: "Update Error", description: err.message, variant: "destructive" })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchStages, pagination.current_page, pagination.per_page, isLabAdmin, customerId],
  )

  const deleteStage = useCallback(
    async (id: number): Promise<boolean> => {
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to delete a stage.",
          variant: "destructive",
        })
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)
      try {
        let url = `${API_BASE_URL}/library/stages/${id}`
        if (isLabAdmin && customerId) {
          url += `?customer_id=${customerId}`
        }
        const response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const result = await response.json()
        if (!response.ok) {
          setAnimationType("error")
          setError(result.message || "Failed to delete stage.")
          toast({
            title: "Deletion Failed",
            description: result.message || "Could not delete the stage.",
            variant: "destructive",
          })
          return false
        }
        setAnimationType("success")
        setSuccessMessage(result.message || "Stage deleted successfully!")
        toast({ title: "Stage Deleted", description: result.message })
        setSelectedItemsState((prev) => prev.filter((itemId) => itemId !== id))
        await fetchStages(pagination.current_page, pagination.per_page) // Refresh current page
        return true
      } catch (err: any) {
        setAnimationType("error")
        setError(err.message)
        toast({ title: "Deletion Error", description: err.message, variant: "destructive" })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchStages, pagination.current_page, pagination.per_page, isLabAdmin, customerId],
  )

  const bulkDeleteStages = useCallback(
    async (ids: number[]): Promise<boolean> => {
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to delete stages.",
          variant: "destructive",
        })
        return false
      }
      if (ids.length === 0) return true
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)
      try {
        const bodyPayload = {
          ids,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/stages/bulk-delete`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        })
        const result = await response.json()
        if (!response.ok) {
          setAnimationType("error")
          setError(result.message || "Failed to bulk delete stages.")
          toast({
            title: "Bulk Deletion Failed",
            description: result.message || "Could not delete the stages.",
            variant: "destructive",
          })
          return false
        }
        setAnimationType("success")
        setSuccessMessage(result.message || "Stages deleted successfully!")
        toast({ title: "Stages Deleted", description: result.message })
        setSelectedItemsState([])
        await fetchStages(1, pagination.per_page) // Refresh and go to first page
        return true
      } catch (err: any) {
        setAnimationType("error")
        setError(err.message)
        toast({ title: "Bulk Deletion Error", description: err.message, variant: "destructive" })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchStages, pagination.per_page, isLabAdmin, customerId],
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItemsState([])
  }, [])

  return (
    <StagesContext.Provider
      value={{
        stages,
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
        statusFilter,
        fetchStages,
        createStage,
        updateStage,
        deleteStage,
        bulkDeleteStages,
        setSearchQuery,
        setSort,
        setSelectedItems,
        setStatusFilter,
        clearMessages,
        clearSelection,
      }}
    >
      {children}
      {/* Animation Overlay - Copied from GradesContext, adjust icons/text as needed */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md text-center">
            {animationType === "creating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Save className="h-16 w-16 animate-bounce" />
                </div>
                <p className="text-lg font-medium mb-2">Creating Stage...</p>
                <p className="text-sm text-gray-500">Please wait while we set up the new stage.</p>
              </>
            )}
            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Save className="h-16 w-16 animate-bounce" />
                </div>
                <p className="text-lg font-medium mb-2">Updating Stage...</p>
                <p className="text-sm text-gray-500">Applying your changes to the stage.</p>
              </>
            )}
            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  <Trash2 className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">Deleting Stage(s)...</p>
                <p className="text-sm text-gray-500">Removing the selected stage(s) from the system.</p>
              </>
            )}
            {animationType === "success" && (
              <>
                <div className="mb-4 text-green-500">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">Success!</p>
                <p className="text-sm text-gray-500">{successMessage || "Operation completed successfully."}</p>
              </>
            )}
            {animationType === "error" && (
              <>
                <div className="mb-4 text-red-500">
                  <AlertCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">Error</p>
                <p className="text-sm text-gray-500">{error || "An unexpected error occurred."}</p>
              </>
            )}
          </div>
        </div>
      )}
    </StagesContext.Provider>
  )
}
