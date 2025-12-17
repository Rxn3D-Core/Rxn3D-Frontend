"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Mail, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { get } from "http"

// Define types
export type EntityType = "Office" | "Lab" | "Supplier" | "Doctor"
export type InvitationStatus = "Pending" | "Accepted" | "Rejected" | "Expired" | string

export interface Entity {
  id: number
  name: string
  address?: string
  email?: string
  type?: EntityType
  status?: string
  invited_by?: number
  created_at?: string
  updated_at?: string
}

export interface InvitationPayload {
  name: string
  email: string
  invited_by: string
  type: EntityType
}

export interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface InvitationResponse {
  sent: {
    data: Entity[]
    pagination: PaginationInfo
  }
  received: {
    data: Entity[]
    pagination: PaginationInfo
  }
}

type InvitationContextType = {
  sent: {
    data: Entity[]
    pagination: PaginationInfo
  }
  received: {
    data: Entity[]
    pagination: PaginationInfo
  }
  offices: Entity[]
  labs: Entity[]
  suppliers: Entity[]
  doctors: Entity[]
  isLoading: boolean
  error: string | null
  successMessage: string | null
  showAnimation: boolean
  animationType: string | null
  pagination: PaginationInfo
  fetchAllInvitations: (userId: number) => Promise<void>
  sendInvitation: (payload: InvitationPayload) => Promise<boolean>
  addEntity: (entity: Entity, type: EntityType) => void
  removeEntity: (id: number, type: EntityType) => void
  clearMessages: () => void
  resendInvitation: (id: number, email?: string, email_verification_token?: string) => Promise<void>
  deleteInvitation: (id: number) => Promise<void>
  acceptInvitation: (id: number, email?: string) => Promise<void>
  cancelInvitation: (id: number) => Promise<void>
}

const defaultPagination: PaginationInfo = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

const InvitationContext = createContext<InvitationContextType | undefined>(undefined)

export const useInvitation = () => {
  const context = useContext(InvitationContext)
  if (context === undefined) {
    throw new Error("useInvitation must be used within an InvitationProvider")
  }
  return context
}

// Get API base URL from environment variable or use a fallback for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const InvitationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [offices, setOffices] = useState<Entity[]>([])
  const [labs, setLabs] = useState<Entity[]>([])
  const [suppliers, setSuppliers] = useState<Entity[]>([])
  const [doctors, setDoctors] = useState<Entity[]>([])
  const [sent, setSent] = useState<{ data: Entity[]; pagination: PaginationInfo }>({
    data: [],
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  })
  const [received, setReceived] = useState<{ data: Entity[]; pagination: PaginationInfo }>({
    data: [],
    pagination: {
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<"sending" | "success" | "error" | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>(defaultPagination)

  const { toast } = useToast()

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
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  useEffect(() => {
    if (error) {
      setError(error)
    }
  }, [error])

  const getAuthToken = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("library_token")
    if (!token) throw new Error("No authentication token found")
    return token
  }

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    localStorage.removeItem("library_token")
    localStorage.removeItem("customerId")
    localStorage.removeItem("customerid")
    localStorage.removeItem("customerType")
    window.location.href = "/login"
  }

  const handleUnauthorized = (response: Response) => {
    if (response.status === 401) {
      redirectToLogin()
      return true
    }
    return false
  }

  const addEntity = useCallback((entity: Entity, type: EntityType) => {
    switch (type) {
      case "Office":
        setOffices((prev) => [entity, ...prev])
        break
      case "Lab":
        setLabs((prev) => [entity, ...prev])
        break
      case "Supplier":
        setSuppliers((prev) => [entity, ...prev])
        break
      case "Doctor":
        setDoctors((prev) => [entity, ...prev])
        break
    }
  }, [])

  const removeEntity = useCallback((id: number, type: EntityType) => {
    switch (type) {
      case "Office":
        setOffices((prev) => prev.filter((entity) => entity.id !== id))
        break
      case "Lab":
        setLabs((prev) => prev.filter((entity) => entity.id !== id))
        break
      case "Supplier":
        setSuppliers((prev) => prev.filter((entity) => entity.id !== id))
        break
      case "Doctor":
        setDoctors((prev) => prev.filter((entity) => entity.id !== id))
        break
    }
  }, [])

  const clearMessages = useCallback(() => {
    setError(null)
  }, [])

  const fetchAllInvitations = useCallback(
    async (userId: number, page = 1, perPage = 10) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        const response = await fetch(
          `${API_BASE_URL}/invitations?invited_by=${userId}&per_page=${perPage}&page=${page}&order_by=created_at&sort_by=desc`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (handleUnauthorized(response)) return

        const data: InvitationResponse = await response.json()

        // Process sent invitations
        const officeEntities: Entity[] = []
        const labEntities: Entity[] = []
        const supplierEntities: Entity[] = []
        const doctorEntities: Entity[] = []

        // Process sent invitations
        for (const item of data.sent.data || []) {
          const entity: Entity = {
            id: item.id,
            name: item.name,
            email: item.email,
            type: item.type as EntityType,
            status: item.status,
            invited_by: item.invited_by,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }

          switch (item.type) {
            case "Office":
              officeEntities.push(entity)
              break
            case "Lab":
              labEntities.push(entity)
              break
            case "Supplier":
              supplierEntities.push(entity)
              break
            case "Doctor":
              doctorEntities.push(entity)
              break
          }
        }

        // Update the state with the paginated data
        setOffices(officeEntities)
        setLabs(labEntities)
        setSuppliers(supplierEntities)
        setDoctors(doctorEntities)

        // Set received invitations
        setReceived({
          data: data.received.data || [],
          pagination: data.received.pagination || defaultPagination,
        })

        // Set resent invitations (filtering out accepted ones)
        setSent({
          data: data.sent.data || [],
          pagination: data.sent.pagination || defaultPagination,
        })

        // Update pagination state
        setPagination(data.sent.pagination || defaultPagination)
      } catch (error: any) {
        console.error("Error fetching invitations:", error)
        setError(error.message || "Failed to fetch invitations")

        toast({
          title: "Error",
          description: "Failed to fetch invitations. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast],
  )

  const sendInvitation = useCallback(
    async (payload: InvitationPayload): Promise<boolean> => {
      setIsLoading(true)
      setShowAnimation(true)
      setAnimationType("sending")
      setError(null)
      const token = getAuthToken()

      try {
        const response = await fetch(`${API_BASE_URL}/invitations/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (handleUnauthorized(response)) return false

        const result = await response.json()
        if (!response.ok) {
          if (
            response.status === 422 &&
            result?.error_description ===
              "An invitation has already been sent to this email by the same inviter."
          ) {
            toast({
              title: "Duplicate Invitation",
              description: result.error_description,
              variant: "destructive",
            })
            setAnimationType("error")
            setError(result.error_description)

            setError(result.error_description)
            return false
          }

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
          }
          toast({
            title: "Error",
            description: result?.error_description || "Something went wrong",
            variant: "destructive",
          })

          setAnimationType("error")
          setError(result.error_description || "Failed to send invitation.")
          console.error("Error sending invitation:", result)
          return false
        }

        // Success
        const newEntity: Entity = {
          id: result.data?.id || Math.floor(Math.random() * 1000),
          name: payload.name,
          email: payload.email,
          type: payload.type,
          status: "Pending",
          invited_by: Number(payload.invited_by),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        addEntity(newEntity, payload.type)

        setAnimationType("success")
        toast({
          title: "Invitation Sent",
          description: `Successfully invited ${payload.email}`,
          variant: "default",
        })

        setSuccessMessage(`Successfully invited ${payload.email}`)

        // Refresh the invitations list
        await fetchAllInvitations(Number(payload.invited_by))
        localStorage.removeItem("library_token")
        localStorage.removeItem("customerId")
        localStorage.removeItem("customerid")
        localStorage.removeItem("customerType")
        return true
      } catch (err: any) {
        console.error("Error sending invitation:", err)
        setAnimationType("error")
        setError(err.message || err?.error_description || "Failed to send invitation. Please try again.")

        toast({
          title: "Error",
          description: err.message || err?.error_description || "Failed to send invitation. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [toast, addEntity, fetchAllInvitations],
  )

  const resendInvitation = useCallback(
    async (id: number, email?: string, email_verification_token?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        const response = await fetch(`${API_BASE_URL}/invitations/${id}/resend`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        })

        if (handleUnauthorized(response)) return

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.message || "Failed to resend verification email.")
        }

        toast({
          title: "Verification Sent",
          description: `Verification email resent to ${email}`,
        })
      } catch (err: any) {
        setError(err.message)
        toast({
          title: "Resend Invitation Failed",
          description: err.message || "Failed to resend verification.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast],
  )

  const deleteInvitation = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()
        const response = await fetch(`${API_BASE_URL}/invitations/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (handleUnauthorized(response)) return

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.message || "Failed to delete invitation.")
        }

        toast({
          title: "Invitation Deleted",
          description: `Invitation has been successfully deleted.`,
        })
      } catch (err: any) {
        setError(err.message)
        toast({
          title: "Delete Invitation Failed",
          description: err.message || "Failed to delete invitation.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast],
  )

  const acceptInvitation = useCallback(
    async (id: number, email?: string, onSuccess?: () => void) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        const response = await fetch(`${API_BASE_URL}/invitations/${id}/accept`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        })

        if (handleUnauthorized(response)) return

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.message || "Failed to cancel invitation.")
        }

        toast({
          title: "Invitation Accepted",
          description: `The invitation for ${email} has been accepted.`,
        })

        onSuccess?.()
      } catch (err: any) {
        setError(err.message)
        toast({
          title: "Accept Invitation Failed",
          description: err.message || "Failed to accept the invitation.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast],
  )

  const cancelInvitation = useCallback(
    async (id?: number, onSuccess?: () => void) => {
      setIsLoading(true)
      setError(null)

      try {
        const token = getAuthToken()

        const response = await fetch(`${API_BASE_URL}/invitations/${id}/cancel`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (handleUnauthorized(response)) return

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.message || "Failed to delete invitation.")
        }

        toast({
          title: "Invitation Canceled",
          description: `The invitation has been successfully canceled.`,
        })

        onSuccess?.()
      } catch (err: any) {
        setError(err.message)
        toast({
          title: "Cancel Invitation Failed",
          description: err.message || "Failed to cancel the invitation.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast],
  )

  return (
    <InvitationContext.Provider
      value={{
        offices,
        labs,
        suppliers,
        doctors,
        received,
        sent,
        isLoading,
        error,
        successMessage,
        showAnimation,
        animationType,
        pagination,
        sendInvitation,
        addEntity,
        removeEntity,
        clearMessages,
        fetchAllInvitations,
        resendInvitation,
        deleteInvitation,
        acceptInvitation,
        cancelInvitation,
      }}
    >
      {children}

      {/* Animation Overlay */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md">
            {animationType === "sending" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Mail className="h-16 w-16 animate-bounce" />
                </div>
                <p className="text-lg font-medium mb-2">Sending Invitation...</p>
                <p className="text-sm text-[#a19d9d] text-center">
                  Please wait while we send the invitation to connect.
                </p>
              </>
            )}

            {animationType === "success" && (
              <>
                <div className="mb-4 text-green-500">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">Invitation Sent!</p>
                <p className="text-sm text-[#a19d9d] text-center">Your invitation has been sent successfully.</p>
              </>
            )}

            {animationType === "error" && (
              <>
                <div className="mb-4 text-red-500">
                  <AlertCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">Error Sending Invitation</p>
                <p className="text-sm text-[#a19d9d] text-center">
                  There was a problem sending your invitation. Please try again.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </InvitationContext.Provider>
  )
}
