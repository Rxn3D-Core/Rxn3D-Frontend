"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Award, CheckCircle, AlertCircle, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { useLanguage } from "./language-context"
// Define types based on actual API response
export interface Grade {
  id: number
  name: string
  code: string
  status: string
  sequence: number
  created_at: string
  updated_at: string
  image_url?: string
  is_custom?: "Yes" | "No"
}

export interface GradePayload {
  name: string
  code: string
  status: "Active" | "Inactive"
  sequence: number
  image?: string
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface GradeResponse {
  status: boolean
  message: string
  data: {
    data: Grade[]
    pagination: PaginationInfo
  }
}

type GradesContextType = {
  grades: Grade[]
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
  statusFilter: string
  groupIdFilter: string

  // CRUD operations
  fetchGrades: (page?: number, perPage?: number) => Promise<void>
  fetchGradeDetail: (id: number) => Promise<Grade | null>
  createGrade: (payload: GradePayload) => Promise<boolean> // Changed return type
  updateGrade: (id: number, payload: Partial<GradePayload>) => Promise<boolean> // Changed return type
  deleteGrade: (id: number) => Promise<boolean> // Changed return type
  bulkDeleteGrades: (ids: number[]) => Promise<boolean> // Changed return type

  // UI state management
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setSelectedItems: (items: number[]) => void
  setStatusFilter: (status: string) => void
  setGroupIdFilter: (groupId: string) => void
  clearMessages: () => void
  clearSelection: () => void
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

const GradesContext = createContext<GradesContextType | undefined>(undefined)

export const useGrades = () => {
  const context = useContext(GradesContext)
  if (context === undefined) {
    throw new Error("useGrades must be used within a GradesProvider")
  }
  return context
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const GradesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [grades, setGrades] = useState<Grade[]>([])
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
  const [statusFilter, setStatusFilter] = useState("Active") // Default to Active
  const [groupIdFilter, setGroupIdFilter] = useState("")

  const { toast } = useToast()
  const { token: authToken, user } = useAuth() 
  const { currentLanguage } = useLanguage() 

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
  
  // Get customerId from localStorage (similar to other contexts)
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

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false)
        setAnimationType(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showAnimation])

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const fetchGrades = useCallback(
    async (page = pagination.current_page, perPage = pagination.per_page) => {
      if (!authToken) {
        setError("Authentication token not found. Please log in.")
        setGrades([])
        setPagination(defaultPagination)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          per_page: perPage.toString(),
          page: page.toString(),
          lang: currentLanguage,
        })
        if (searchQuery) params.append("q", searchQuery)
        if (statusFilter) params.append("status", statusFilter)
        if (groupIdFilter) params.append("group_id", groupIdFilter)
        
        // Valid order_by values according to backend: created_at, name, code, sequence
        const validOrderByValues = ["created_at", "name", "code", "sequence"]
        if (sortColumn && sortDirection && validOrderByValues.includes(sortColumn)) {
          params.append("order_by", sortColumn)
          params.append("sort_by", sortDirection)
        } else {
          params.append("order_by", "sequence")
          params.append("sort_by", "asc")
        }

        // Check role directly from localStorage to ensure it's available
        let roleIsLabAdmin = false
        if (typeof window !== "undefined") {
          const role = localStorage.getItem("role")
          roleIsLabAdmin = role === "lab_admin"
        }
        
        // Use lab-grades endpoint for lab_admin, grades endpoint for others
        
        // Only pass customer_id for lab_admin role, get it directly from localStorage
        if (roleIsLabAdmin && typeof window !== "undefined") {
          const storedCustomerId = localStorage.getItem("customerId")
          if (storedCustomerId) {
            params.append("customer_id", storedCustomerId)
          }
        }

        const response = await fetch(`${API_BASE_URL}/library/grades?${params}`, {
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
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.message || `Failed to fetch grades. Status: ${response.status}`)
          throw new Error(errorData.message || `Failed to fetch grades. Status: ${response.status}`)
        }

        const result: GradeResponse = await response.json()
        setGrades(result.data.data || [])
        setPagination(result.data.pagination || defaultPagination)
      } catch (err: any) {
        console.error("Error fetching grades:", err)
        setError(err.message || "Failed to fetch grades")
        toast({
          title: "Error Fetching Grades",
          description: err.message || "Could not retrieve grades. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [
      authToken,
      searchQuery,
      sortColumn,
      sortDirection,
      statusFilter,
      groupIdFilter,
      toast,
      pagination.current_page,
      pagination.per_page,
      currentLanguage,
      isLabAdmin,
    ],
  )

  const fetchGradeDetail = useCallback(
    async (id: number): Promise<Grade | null> => {
      if (!authToken) {
        setError("Authentication token not found. Please log in.")
        return null
      }

      try {
        // Use lab-grades endpoint for lab_admin, grades endpoint for others
        const endpoint = isLabAdmin ? "lab-grades" : "grades"
        // Build URL with lang parameter
        let url = `${API_BASE_URL}/library/${endpoint}/${id}?lang=${currentLanguage}`
        // Always include customer_id if available (for both lab_admin and other roles)
        if (customerId) {
          url += `&customer_id=${customerId}`
        }

        console.log("Fetching grade detail from:", url)
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return null
          }
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.message || `Failed to fetch grade details. Status: ${response.status}`)
          return null
        }

        const result = await response.json()
        const gradeData = result.data || null
        console.log("Grade detail fetched successfully:", gradeData)
        return gradeData
      } catch (err: any) {
        console.error("Error fetching grade detail:", err)
        setError(err.message || "Failed to fetch grade details")
        return null
      }
    },
    [authToken, currentLanguage, customerId, isLabAdmin],
  )

  const createGrade = useCallback(
    async (payload: GradePayload): Promise<boolean> => {
      if (!authToken) {
        setError("Authentication token not found. Please log in.")
        toast({
          title: "Authentication Error",
          description: "Please log in to create a grade.",
          variant: "destructive",
        })
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("creating")
      setError(null)
      setSuccessMessage(null)

      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/grades`, {
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
          const result = await response.json().catch(() => ({ message: "An unknown error occurred" }))
          setAnimationType("error")
          setError(result?.message || "Failed to create grade.")
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]: [string, any]) => {
              if (Array.isArray(messages)) {
                messages.forEach((message) => {
                  toast({ title: `Validation Error: ${field}`, description: message, variant: "destructive" })
                })
              }
            })
          } else {
            toast({
              title: "Error Creating Grade",
              description: result?.message || "Something went wrong",
              variant: "destructive",
            })
          }
          return false 
        }

        toast({ title: "Grade Created", description: `Successfully created ${payload.name}.` })
        setSuccessMessage(`Successfully created ${payload.name}`)
        await fetchGrades() 
        return true 
      } catch (err: any) {
        console.error("Error creating grade:", err)
        setAnimationType("error")
        setError(err.message || "Failed to create grade. Please try again.")
        toast({
          title: "Error Creating Grade",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive",
        })
        return false 
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchGrades, isLabAdmin, customerId],
  )

  const updateGrade = useCallback(
    async (id: number, payload: Partial<GradePayload>): Promise<boolean> => {
      if (!authToken) {
        setError("Authentication token not found. Please log in.")
        toast({
          title: "Authentication Error",
          description: "Please log in to update a grade.",
          variant: "destructive",
        })
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("updating")
      setError(null)
      setSuccessMessage(null)

      try {
        const bodyPayload = {
          ...payload,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/grades/${id}`, {
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
          const result = await response.json().catch(() => ({ message: "An unknown error occurred" }))
          setAnimationType("error")
          setError(result?.message || "Failed to update grade.")
          toast({
            title: "Error Updating Grade",
            description: result?.message || "Something went wrong",
            variant: "destructive",
          })
          return false
        }

        setAnimationType("success")
        toast({ title: "Grade Updated", description: "Grade updated successfully." })
        setSuccessMessage("Grade updated successfully")
        await fetchGrades()
        return true
      } catch (err: any) {
        console.error("Error updating grade:", err)
        setAnimationType("error")
        setError(err.message || "Failed to update grade. Please try again.")
        toast({
          title: "Error Updating Grade",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchGrades, isLabAdmin, customerId],
  )

  const deleteGrade = useCallback(
    async (id: number): Promise<boolean> => {
      if (!authToken) {
        setError("Authentication token not found. Please log in.")
        toast({
          title: "Authentication Error",
          description: "Please log in to delete a grade.",
          variant: "destructive",
        })
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)
      setSuccessMessage(null)

      try {
        let url = `${API_BASE_URL}/library/grades/${id}`
        if (isLabAdmin && customerId) {
          url += `?customer_id=${customerId}`
        }
        const response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        })

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return false
          }
          const result = await response.json().catch(() => ({ message: "An unknown error occurred" }))
          setAnimationType("error")
          setError(result?.message || "Failed to delete grade.")
          toast({
            title: "Error Deleting Grade",
            description: result?.message || "Something went wrong",
            variant: "destructive",
          })
          return false
        }

        setAnimationType("success")
        toast({ title: "Grade Deleted", description: "Grade has been successfully deleted." })
        setSuccessMessage("Grade deleted successfully")
        setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))
        await fetchGrades()
        return true
      } catch (err: any) {
        console.error("Error deleting grade:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete grade. Please try again.")
        toast({
          title: "Error Deleting Grade",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchGrades, isLabAdmin, customerId],
  )

  const bulkDeleteGrades = useCallback(
    async (ids: number[]): Promise<boolean> => {
      if (!authToken) {
        setError("Authentication token not found. Please log in.")
        toast({ title: "Authentication Error", description: "Please log in to delete grades.", variant: "destructive" })
        return false
      }
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("deleting")
      setError(null)
      setSuccessMessage(null)

      try {
        const bodyPayload = {
          ids,
          ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
        }
        const response = await fetch(`${API_BASE_URL}/library/grades/bulk-delete`, {
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
          const result = await response.json().catch(() => ({ message: "An unknown error occurred" }))
          setAnimationType("error")
          setError(result?.message || "Failed to delete grades.")
          toast({
            title: "Error Deleting Grades",
            description: result?.message || "Something went wrong",
            variant: "destructive",
          })
          return false
        }

        setAnimationType("success")
        toast({ title: "Grades Deleted", description: `Successfully deleted ${ids.length} grade(s).` })
        setSuccessMessage(`Successfully deleted ${ids.length} grade(s)`)
        setSelectedItems([])
        await fetchGrades()
        return true
      } catch (err: any) {
        console.error("Error bulk deleting grades:", err)
        setAnimationType("error")
        setError(err.message || "Failed to delete grades. Please try again.")
        toast({
          title: "Error Deleting Grades",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, toast, fetchGrades, isLabAdmin, customerId],
  )

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  return (
    <GradesContext.Provider
      value={{
        grades,
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
        groupIdFilter,
        fetchGrades,
        fetchGradeDetail,
        createGrade,
        updateGrade,
        deleteGrade,
        bulkDeleteGrades,
        setSearchQuery,
        setSortColumn,
        setSortDirection,
        setSelectedItems,
        setStatusFilter,
        setGroupIdFilter,
        clearMessages,
        clearSelection,
      }}
    >
      {children}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          {" "}
          {/* Increased z-index */}
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md text-center">
            {animationType === "creating" && (
              <>
                <Save className="h-16 w-16 animate-bounce mb-4 text-[#1162a8]" />
                <p className="text-lg font-medium mb-2">Creating Grade...</p>
                <p className="text-sm text-gray-500">Please wait while we create your grade.</p>
              </>
            )}
            {animationType === "updating" && (
              <>
                <Award className="h-16 w-16 animate-pulse mb-4 text-[#1162a8]" />
                <p className="text-lg font-medium mb-2">Updating Grade...</p>
                <p className="text-sm text-gray-500">Please wait while we update your grade.</p>
              </>
            )}
            {animationType === "deleting" && (
              <>
                <Trash2 className="h-16 w-16 animate-pulse mb-4 text-red-500" />
                <p className="text-lg font-medium mb-2">Deleting Grade(s)...</p>
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
    </GradesContext.Provider>
  )
}
