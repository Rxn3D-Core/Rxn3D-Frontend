import { useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Roles that should see the multi-location screen
const MULTI_LOCATION_ROLES = ["lab_admin", "lab_user", "office_admin", "office_user"]

export interface LoginRequest {
  identifier: string
  password: string
}

export interface AuthData {
  access_token: string
  token_type: string
  expires_in: number
  permissions: any[]
  user: {
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
}

const setCookie = (name: string, value: string, days = 30) => {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `; expires=${date.toUTCString()}`
  document.cookie = `${name}=${value}${expires}; path=/; samesite=lax`
}

// Exported network helper used by AuthProvider and the mutation hook
export const loginUser = async (loginData: LoginRequest): Promise<AuthData> => {
  const isEmail = loginData.identifier.includes("@")
  const payload = isEmail 
    ? { email: loginData.identifier, password: loginData.password } 
    : { username: loginData.identifier, password: loginData.password }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok) {
    if (response.status === 401) {
      // normalize unauthorized
      throw new Error(result.error_description || result.message || "Unauthorized")
    }
    throw new Error(result.error_description || result.message || "Login failed")
  }

  if (!result.data?.access_token) {
    throw new Error("Invalid response from server")
  }

  return result.data
}

export function useLoginMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: loginUser,
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error?.message || "An error occurred during login",
        variant: "destructive",
      })
    },
  })
}
