import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface FetchUsersParams {
  status?: string
  role?: string
}

interface User {
  id: number
  uuid: string
  customer_id?: number
  role?: string
  roles?: string[]
  first_name: string
  last_name: string
  email: string
  mobile?: string
  image?: string
  status: string
  username?: string
  description?: string
  department_id?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  permissions?: any[]
  customers?: any[]
  is_email_verified?: boolean
  selected_location_id?: number | null
}

interface UsersResponse {
  data: User[]
  pagination?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

const fetchUsers = async (params?: FetchUsersParams): Promise<UsersResponse> => {
  const customerId = localStorage.getItem("customerId")
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No authentication token found")
  }

  const queryParams = new URLSearchParams()
  
  if (params?.status) queryParams.append("status", params.status)
  if (params?.role) queryParams.append("role", params.role)
  if (customerId) queryParams.append("customer_id", customerId)
  
  const url = `${API_BASE_URL}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  
  const response = await fetch(url, {
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
    throw new Error("Failed to fetch users")
  }

  const result = await response.json()
  return result
}

export function useFetchUsersQuery(params?: FetchUsersParams) {
  const router = useRouter()
  const { toast } = useToast()

  return useQuery({
    queryKey: ["users", params],
    queryFn: () => fetchUsers(params),
    enabled: !!localStorage.getItem("token"), // Only run if token exists
    retry: (failureCount, error: any) => {
      if (error?.message === "Unauthorized") {
        // Clear token and redirect to login
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.replace("/login")
        return false
      }
      return failureCount < 3
    },
    onError: (error: any) => {
      if (error?.message === "Unauthorized") {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to fetch users",
          variant: "destructive",
        })
      }
    },
  })
}

// Update User mutation
const updateUser = async ({ userId, data }: { userId: number; data: { status?: string } }): Promise<User> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No authentication token found")
  }

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (response.status === 401) {
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    throw new Error("Failed to update user")
  }

  const result = await response.json()
  return result
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      // Invalidate users queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["users"] })
      
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
        variant: "default",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update user",
        variant: "destructive",
      })
    },
  })
}

// Set Customer ID mutation
const setCustomerId = async (customerId: number): Promise<{ token: string }> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No authentication token found")
  }

  const response = await fetch(`${API_BASE_URL}/set-customer-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ customer_id: customerId }),
  })

  if (response.status === 401) {
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    throw new Error("Failed to set customer ID")
  }

  const result = await response.json()
  return result
}

export function useSetCustomerIdMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: setCustomerId,
    onSuccess: (result) => {
      // Update token in localStorage
      localStorage.setItem("token", result.token)
      
      toast({
        title: "Customer Set",
        description: "Customer ID has been set successfully.",
        variant: "default",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to set customer ID",
        variant: "destructive",
      })
    },
  })
}
