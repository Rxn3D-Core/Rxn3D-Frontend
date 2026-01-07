const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface UserProfileData {
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
  customers?: Array<{
    id: number
    name: string
    type: 'lab' | 'office'
    role?: string
    role_permissions?: string[]
    department_id?: number
    is_primary?: boolean
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
    onboarding_completed_by?: number | null
    business_hours_setup_completed?: boolean
    business_hours_setup_completed_at?: string | null
    business_hours_setup_completed_by?: number | null
  }>
  is_email_verified?: boolean
  selected_location_id?: number | null
  customer?: {
    id: number
    name: string
    type: 'lab' | 'office'
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
    business_hours_setup_completed?: boolean
    business_hours_setup_completed_at?: string | null
  }
}

/**
 * Fetch user profile data from API
 * @param userId - The ID of the user (optional, defaults to current user)
 * @returns The user profile data
 */
export async function fetchUserProfile(userId?: number): Promise<UserProfileData | null> {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication token not found")
    }

    // If no userId provided, try to get current user ID from localStorage
    let targetUserId = userId
    if (!targetUserId) {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        const user = JSON.parse(storedUser)
        targetUserId = user.id
      }
    }

    if (!targetUserId) {
      throw new Error("User ID not found")
    }

    const response = await fetch(`${API_BASE_URL}/users/${targetUserId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile with status: ${response.status}`)
    }

    const responseData = await response.json()
    // Handle different response structures
    const userData = responseData.data || responseData
    
    return userData as UserProfileData
  } catch (error) {
    console.error("Error fetching user profile:", error)
    throw error
  }
}

