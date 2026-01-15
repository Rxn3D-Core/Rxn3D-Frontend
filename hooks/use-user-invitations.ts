import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface UserInvitation {
  token: string
  status: "Pending" | "Accepted" | "Cancelled" | "Expired"
  name: string
  email: string
  role: string
  customer: {
    id: number
    name: string
    type: "office" | "lab"
  }
  expires_at: string
  accepted_at: string | null
  user_exists: boolean
  already_linked: boolean
  requires_doctor_documents: boolean
}

export interface CreateUserInvitationPayload {
  customer_id: number
  name: string
  email: string
  role: string
}

export interface CreateUserInvitationResponse {
  message: string
  data: UserInvitation
}

// Create user invitation
const createUserInvitation = async (payload: CreateUserInvitationPayload): Promise<CreateUserInvitationResponse> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No authentication token found")
  }

  const response = await fetch(`${API_BASE_URL}/user-invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 401) {
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || "Failed to create user invitation")
  }

  return response.json()
}

// Get user invitation by token
const getUserInvitation = async (token: string): Promise<UserInvitation> => {
  const response = await fetch(`${API_BASE_URL}/user-invitations/${token}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || "Failed to fetch invitation")
  }

  return response.json()
}

// Fetch user invitations for a customer (pending invitations)
const fetchUserInvitations = async (customerId: number | null): Promise<UserInvitation[]> => {
  // Return empty array if customerId is null or undefined
  if (!customerId) {
    return []
  }

  // Ensure we're on the client side
  if (typeof window === "undefined") {
    return []
  }

  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No authentication token found")
  }

  // Note: The API documentation doesn't show a list endpoint, but we can infer
  // that invitations might be fetched through a different endpoint or we need to
  // track them separately. For now, we'll create a placeholder that can be updated
  // when the actual endpoint is available.
  
  // Note: The API documentation doesn't show a list endpoint for user invitations.
  // This is a placeholder implementation. You may need to:
  // 1. Create a backend endpoint to list user invitations by customer_id
  // 2. Or track invitations through a different mechanism
  // Use the pending invitations endpoint which supports GET
  try {
    const response = await fetch(`${API_BASE_URL}/user-invitations/pending?customer_id=${customerId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.status === 401) {
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      // If endpoint doesn't exist or method not allowed, return empty array silently
      if (response.status === 404 || response.status === 405) {
        return []
      }
      // Don't throw error for 400/422, just return empty array
      if (response.status === 400 || response.status === 422) {
        return []
      }
      // Only throw for other errors
      const errorText = await response.text().catch(() => "")
      throw new Error(`Failed to fetch user invitations: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    // Ensure we always return an array
    if (Array.isArray(result)) {
      return result
    }
    if (result && Array.isArray(result.data)) {
      return result.data
    }
    return []
  } catch (error: any) {
    // If it's a network error or the endpoint doesn't exist, return empty array
    // Only log non-405 errors to avoid console spam
    if (!error?.message?.includes("405")) {
      console.warn("Failed to fetch user invitations:", error)
    }
    return []
  }
}

export function useCreateUserInvitation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const router = useRouter()

  return useMutation({
    mutationFn: createUserInvitation,
    onSuccess: (data) => {
      // Invalidate user invitations queries
      queryClient.invalidateQueries({ queryKey: ["user-invitations"] })
      // Also invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["users"] })
      
      toast({
        title: "Invitation Sent",
        description: data.message || "User invitation sent successfully.",
        variant: "default",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send user invitation",
        variant: "destructive",
      })
    },
  })
}

export function useGetUserInvitation(token: string) {
  return useQuery({
    queryKey: ["user-invitation", token],
    queryFn: () => getUserInvitation(token),
    enabled: !!token,
  })
}

export function useFetchUserInvitations(customerId: number | null) {
  const { toast } = useToast()
  const router = useRouter()

  return useQuery({
    queryKey: ["user-invitations", customerId],
    queryFn: () => fetchUserInvitations(customerId),
    enabled: customerId !== null && customerId !== undefined && typeof window !== "undefined" && !!localStorage.getItem("token"),
    staleTime: 1000 * 60 * 5, // 5 minutes - prevent unnecessary refetches
    gcTime: 1000 * 60 * 60, // 1 hour
    // Ensure data is always an array to prevent rendering issues
    select: (data) => {
      // Handle various data structures
      if (Array.isArray(data)) {
        return data
      }
      // If data is an object with a data property that's an array
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data
      }
      // If data is an object with a data property that's not an array, return empty
      if (data && typeof data === 'object' && 'data' in data) {
        return []
      }
      // Fallback to empty array for any other case
      return []
    },
    // Provide default data to prevent undefined
    placeholderData: (previousData) => {
      // Preserve previous data if it exists and is valid
      if (Array.isArray(previousData)) {
        return previousData
      }
      return []
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 405 (Method Not Allowed) or 404 (Not Found)
      if (error?.message?.includes("405") || error?.message?.includes("404")) {
        return false
      }
      // Don't retry on 5xx server errors
      if (error?.message?.includes("500") || 
          error?.message?.includes("502") || 
          error?.message?.includes("503") || 
          error?.message?.includes("504")) {
        return false
      }
      if (error?.message === "Unauthorized") {
        // Use setTimeout to avoid calling router during render
        if (typeof window !== "undefined") {
          setTimeout(() => {
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            router.replace("/login")
          }, 0)
        }
        return false
      }
      // Don't retry on network errors
      if (error?.message?.includes("Failed to fetch")) {
        return false
      }
      return failureCount < 2
    },
    onError: (error: any) => {
      // Only show toast for actual errors, not for missing endpoints or 405
      if (error?.message === "Unauthorized") {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })
      }
      // Silently handle other errors (like missing endpoint or 405)
    },
  })
}

