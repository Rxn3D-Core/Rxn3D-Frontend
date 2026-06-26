"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { redirect, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { clearSessionStorage } from "@/lib/clear-session-storage"
import { isCustomerProfileOnboardingWizardComplete } from "@/lib/customer-onboarding-complete"
import { getPostLoginLandingPath } from "@/lib/auth/post-login-landing"
import { appendCustomerIdQuery, getActiveCustomerId } from "@/lib/customer-scope"
import { reloadAppAfterProfileSwitch } from "@/lib/profile-switch"
import {
  hasAnyPermission as checkAnyPermission,
  hasPermission as checkPermission,
  normalizeAvailablePermissions,
  normalizePermissionsResponse,
  parsePermissionsProfile,
  permissionsFromCustomer,
  roleOnCustomer,
  userIsSuperadmin,
  type AvailablePermissionsPayload,
} from "@/lib/permissions"
import { formatUserStatusForApi } from "@/lib/user-status"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const setCookie = (name: string, value: string, days = 30) => {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `; expires=${date.toUTCString()}`
  document.cookie = `${name}=${value}${expires}; path=/; samesite=lax`
}

type User = {
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
  avatar?: string
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
    permissions?: string[]
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

type SessionHistoryItem = {
  identifier: string
  timestamp: number
  displayName?: string
}

type AuthData = {
  access_token: string
  token_type: string
  expires_in: number
  permissions: any[]
  user: User
}

type AuthContextType = {
  user: User | null
  token: string | null
  login: (identifier: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  error: string | null
  clearError: () => void
  setAuthFromData: (authData: AuthData, identifier?: string) => boolean
  updateSessionUser: (partial: Partial<User>) => void
  sessionHistory: SessionHistoryItem[]
  clearSessionHistory: () => void
  isNewUser: boolean
  setOnboardingComplete: () => void
  resetPasswordConfirm: (
    token: string,
    password: string,
    password_confirmation: string,
    email: string,
  ) => Promise<boolean>
  forgotPassword: (email: string) => Promise<boolean>
  setupAccount: (
    token: string,
    password: string,
    password_confirmation: string,
    email: string,
    verification_token: string,
  ) => Promise<boolean>
  fetchUsers: (params?: {
    status?: string
    role?: string
    customer_id?: string
    department_id?: string
    q?: string
    per_page?: number
    order_by?: string
    sort_by?: "asc" | "desc"
    page?: number
  }) => Promise<any>
  updateUser: (userId: number, data: {
    first_name?: string
    last_name?: string
    phone?: string
    work_number?: string
    status?: string
    department_ids?: number[]
    customer_id?: number
  }) => Promise<any>
  createUser: (userData: FormData | {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    work_number?: string;
    customer_id: string;
    role: string;
    is_doctor: boolean;
    department_ids: number[];
    license_number?: string;
    signature?: any;
  }) => Promise<any>
  updateUserDetails: (userId: number, userData: {
    first_name: string;
    last_name: string;
    phone: string;
    work_number?: string;
    status: string;
    department_ids?: number[];
  }) => Promise<any>
  deleteUser: (userId: number) => Promise<any>
  fetchUserById: (userId: number, customerId?: string) => Promise<any>
  fetchUserActivity: (userId: number, params?: { per_page?: number; page?: number }) => Promise<any>
  getUserPermissions: (customerId?: string) => Promise<any>
  getAvailablePermissions: (customerId?: string) => Promise<AvailablePermissionsPayload>
  fetchUserPermissionDetail: (
    userId: number,
    customerId?: string,
  ) => Promise<import("@/lib/api/user-permissions-api").UserPermissionDetail>
  updateUserDirectPermissions: (
    userId: number,
    permissions: string[],
    customerId?: string,
  ) => Promise<import("@/lib/api/user-permissions-api").UserPermissionDetail>
  /** Effective permissions for the active customer profile (alias: permissions). */
  profilePermissions: string[]
  permissions: string[]
  selectedCustomerId: number | null
  profileRole: string | null
  rolePermissions: string[]
  overridePermissions: string[]
  isSuperadmin: boolean
  refreshProfilePermissions: (customerId?: string) => Promise<string[]>
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  setCustomerId: (
    customerId: number,
    options?: { reload?: boolean; redirectTo?: string },
  ) => Promise<boolean>
  isAuthenticated: boolean
  checkAuthAndRedirect: () => boolean
  impersonateUser: (userId: number) => Promise<boolean>
  stopImpersonation: () => void
  isImpersonating: boolean
  originalUser: User | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MAX_SESSION_HISTORY = 3

// Roles that should see the multi-location screen
const MULTI_LOCATION_ROLES = ["lab_admin", "lab_user", "office_admin", "office_user"]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([])
  const [isNewUser, setIsNewUser] = useState(false)
  const [originalUser, setOriginalUser] = useState<User | null>(null)
  const [originalToken, setOriginalToken] = useState<string | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [profilePermissions, setProfilePermissions] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("profilePermissions")
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch {
      return []
    }
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem("customerId")
    if (!stored) return null
    const parsed = Number(stored)
    return Number.isNaN(parsed) ? null : parsed
  })
  const [profileRole, setProfileRole] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("role")
  })
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [overridePermissions, setOverridePermissions] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  /** After a successful POST /set-customer-id, skip duplicate calls for the same id. */
  const syncedCustomerIdRef = useRef<number | null>(null)
  const setCustomerIdInFlightRef = useRef<Promise<boolean> | null>(null)
  const userRef = useRef(user)
  const lastPermissionsFetchKeyRef = useRef<string | null>(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const isSuperadmin = userIsSuperadmin(user)

  const applyPermissionsProfile = useCallback(
    (snapshot: ReturnType<typeof parsePermissionsProfile>) => {
      setProfilePermissions(snapshot.permissions)
      setRolePermissions(snapshot.role_permissions)
      setOverridePermissions(snapshot.override_permissions)
      if (snapshot.role) {
        setProfileRole(snapshot.role)
        localStorage.setItem("role", snapshot.role)
      }
      if (typeof snapshot.customer_id === "number") {
        setSelectedCustomerId(snapshot.customer_id)
        localStorage.setItem("customerId", String(snapshot.customer_id))
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("profilePermissions", JSON.stringify(snapshot.permissions))
        localStorage.setItem("rolePermissions", JSON.stringify(snapshot.role_permissions))
        localStorage.setItem("overridePermissions", JSON.stringify(snapshot.override_permissions))
      }
    },
    [],
  )

  const applyProfilePermissions = useCallback((permissions: string[]) => {
    setProfilePermissions(permissions)
    if (typeof window !== "undefined") {
      localStorage.setItem("profilePermissions", JSON.stringify(permissions))
    }
  }, [])

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user")
      if (storedUser && storedUser !== "undefined") {
        const parsed = JSON.parse(storedUser) as User
        const avatarUrl = parsed.avatar ?? parsed.image
        if (avatarUrl && !parsed.image) {
          parsed.image = avatarUrl
        }
        if (avatarUrl && !parsed.avatar) {
          parsed.avatar = avatarUrl
        }
        setUser(parsed)
      }

      const storedToken = localStorage.getItem("token")
      if (storedToken && storedToken !== "undefined") {
        setToken(storedToken)
      }

      const storedSessionHistory = localStorage.getItem("sessionHistory")
      if (storedSessionHistory && storedSessionHistory !== "undefined") {
        setSessionHistory(JSON.parse(storedSessionHistory))
      }

      // Onboarding status is now tracked via API, not localStorage
    } catch (e) {
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      localStorage.removeItem("sessionHistory")
    }
    setIsLoading(false)
  }, [])

  // Sync localStorage when user object changes (e.g., after onboarding completion)
  useEffect(() => {
    if (!user) return
    
    // Update customerId in localStorage if user has customer_id but localStorage doesn't
    if (user.customer_id && typeof window !== "undefined") {
      const storedCustomerId = localStorage.getItem("customerId")
      if (!storedCustomerId || storedCustomerId !== String(user.customer_id)) {
        localStorage.setItem("customerId", String(user.customer_id))
        
        // Also set customerType if available
        if (user.customer?.type) {
          localStorage.setItem("customerType", user.customer.type)
        } else if (user.customers && user.customers.length > 0) {
          localStorage.setItem("customerType", user.customers[0].type)
        }
      }
    }
    
    // Update role in localStorage if it changed
    const userRoles = user.roles || (user.role ? [user.role] : [])
    if (userRoles.length === 1) {
      const currentRole = localStorage.getItem("role")
      if (currentRole !== userRoles[0]) {
        localStorage.setItem("role", userRoles[0])
      }
    } else if (userRoles.length > 1) {
      const currentRole = localStorage.getItem("role")
      const rolesString = JSON.stringify(userRoles)
      if (currentRole !== rolesString) {
        localStorage.setItem("role", rolesString)
      }
    } else if (user.role) {
      const currentRole = localStorage.getItem("role")
      if (currentRole !== user.role) {
        localStorage.setItem("role", user.role)
      }
    }
  }, [user])

  const checkIfNewUser = (currentUser: User): boolean => {
    if (!currentUser.created_at) return false
    const creationDate = new Date(currentUser.created_at)
    const today = new Date()
    const timeDiff = today.getTime() - creationDate.getTime()
    const daysDiff = timeDiff / (1000 * 3600 * 24)
    return daysDiff < 30
  }

  useEffect(() => {
    if (user) setIsNewUser(checkIfNewUser(user))
  }, [user])

  const setOnboardingComplete = () => {
    // Note: Onboarding completion is now tracked via API
    // This function is kept for backward compatibility
    setIsNewUser(false)
  }

  // Check if user is authenticated
  const isAuthenticated = !!(user && token)

  // Function to check auth and redirect if unauthorized
  const checkAuthAndRedirect = useCallback((): boolean => {
    if (!isAuthenticated) {
      router.replace("/login")
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive",
      })
      return false
    }
    return true
  }, [isAuthenticated, router, toast])

  // Handle unauthorized responses
  const handleUnauthorized = useCallback(() => {
    setUser(null)
    setToken(null)
    clearSessionStorage()
    router.replace("/login")
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
    })
  }, [router, toast])

  // Update session history
  const updateSessionHistory = (identifier: string, user?: User) => {
    // Create new session item
    const newSession: SessionHistoryItem = {
      identifier,
      timestamp: Date.now(),
      displayName: user ? `${user.first_name} ${user.last_name}` : undefined,
    }

    // Remove existing entry with same identifier if exists
    const filteredHistory = sessionHistory.filter((session) => session.identifier !== identifier)

    // Add new session at the beginning and limit to MAX_SESSION_HISTORY items
    const updatedHistory = [newSession, ...filteredHistory].slice(0, MAX_SESSION_HISTORY)

    // Update state and localStorage
    setSessionHistory(updatedHistory)
    localStorage.setItem("sessionHistory", JSON.stringify(updatedHistory))
  }

  // Clear session history
  const clearSessionHistory = useCallback(() => {
    setSessionHistory([])
    localStorage.removeItem("sessionHistory")
  }, [])

  // Clear any auth error message
  const clearError = () => setError(null)

  // Fetch and store customer logo_url in localStorage
  const fetchCustomerLogo = async (customerId: number, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const responseData = await response.json()
        const logoUrl = responseData.data?.logo_url || null
        if (logoUrl) {
          localStorage.setItem(`customerLogo_${customerId}`, logoUrl)
          // Also store for the current customer
          localStorage.setItem("customerLogo", logoUrl)
        } else {
          // Remove cache if logo is null
          localStorage.removeItem(`customerLogo_${customerId}`)
          localStorage.removeItem("customerLogo")
        }
      }
    } catch (err) {
      console.error("Error fetching customer logo during login:", err)
      // Don't block login if logo fetch fails
    }
  }

  // Apply AuthData to app state, localStorage and navigate accordingly
  const setAuthFromData = (authData: AuthData, identifier?: string): boolean => {
    try {
      setToken(authData.access_token)
      // Navigation is no longer blocked for unverified emails to support auto-login flows.
      // Verification status can be handled via UI banners if needed.

      // Set customerId from multiple possible sources for newly onboarded users
      let customerIdToStore: number | null = null
      let customerTypeToStore: string | null = null
      
      if (authData.user.customers && authData.user.customers.length > 0) {
        const firstCustomer = authData.user.customers[0]
        customerIdToStore = firstCustomer.id
        customerTypeToStore = firstCustomer.type
      } else if (authData.user.customer_id) {
        // Fallback for newly onboarded users who might not have customers array yet
        customerIdToStore = authData.user.customer_id
        // Try to get customer type from user object
        customerTypeToStore = authData.user.customer?.type || null
      } else if (authData.user.customer?.id) {
        // Another fallback option
        customerIdToStore = authData.user.customer.id
        customerTypeToStore = authData.user.customer.type || null
      }
      
      // Store customerId and customerType if we found one
      if (customerIdToStore) {
        localStorage.setItem("customerId", String(customerIdToStore))
        if (customerTypeToStore) {
          localStorage.setItem("customerType", customerTypeToStore)
        }
        localStorage.setItem("library_token", authData.access_token)
        
        // Fetch and store logo_url for the customer
        fetchCustomerLogo(customerIdToStore, authData.access_token)
      }

      localStorage.setItem("token", authData.access_token)
      setCookie("auth_token", authData.access_token)

      const avatarUrl =
        (authData.user as User & { avatar?: string }).avatar ?? authData.user.image
      const userWithAvatar: User = {
        ...authData.user,
        ...(avatarUrl
          ? { image: avatarUrl, avatar: avatarUrl }
          : {}),
      }

      setUser(userWithAvatar)
      if (identifier) updateSessionHistory(identifier, userWithAvatar)

      const loginPermissions =
        normalizePermissionsResponse(authData.permissions) ||
        (customerIdToStore
          ? permissionsFromCustomer(authData.user.customers, customerIdToStore)
          : [])
      if (customerIdToStore) {
        setSelectedCustomerId(customerIdToStore)
        const roleOnProfile = roleOnCustomer(authData.user.customers, customerIdToStore)
        if (roleOnProfile) {
          setProfileRole(roleOnProfile)
          localStorage.setItem("role", roleOnProfile)
        }
      }
      if (loginPermissions.length > 0) {
        applyProfilePermissions(loginPermissions)
      }
      const userRoles = authData.user.roles || (authData.user.role ? [authData.user.role] : [])
      const shouldSeeMultiLocation = userRoles.some((role) => MULTI_LOCATION_ROLES.includes(role))
      const isSuperAdmin = userRoles.includes("superadmin")
      localStorage.setItem("user", JSON.stringify(userWithAvatar))
      // Store role(s) in localStorage as 'role' (string if one, array if multiple)
      if (Array.isArray(authData.user.roles) && authData.user.roles.length === 1) {
        localStorage.setItem("role", authData.user.roles[0])
      } else if (Array.isArray(authData.user.roles) && authData.user.roles.length > 1) {
        localStorage.setItem("role", JSON.stringify(authData.user.roles))
      } else if (authData.user.role) {
        localStorage.setItem("role", authData.user.role)
      } else {
        localStorage.removeItem("role")
      }

      // Check onboarding status from login response before redirecting
      // Get the primary customer (first customer with is_primary=true or 1, or first customer)
      let primaryCustomer: any = null
      try {
        if (authData.user?.customers && Array.isArray(authData.user.customers) && authData.user.customers.length > 0) {
          // is_primary can be true (boolean) or 1 (number) from the API
          primaryCustomer = authData.user.customers.find((c: any) => {
            return c?.is_primary === true || c?.is_primary === 1 || c?.is_primary === "1"
          }) || authData.user.customers[0]
        } else if (authData.user?.customer) {
          // Fallback to user.customer if customers array is not available
          primaryCustomer = authData.user.customer
        }
      } catch (err) {
        console.error("Error getting primary customer:", err)
        primaryCustomer = null
      }

      // Check if onboarding wizard is finished (office: business hours sufficient; lab: onboarding + hours)
      const isOnboardingComplete = isCustomerProfileOnboardingWizardComplete(primaryCustomer)

      // Honor a safe internal ?redirect= target (e.g. returning to an invitation accept link)
      try {
        if (typeof window !== "undefined") {
          const redirectTarget = new URLSearchParams(window.location.search).get("redirect")
          if (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) {
            router.replace(redirectTarget)
            return true
          }
        }
      } catch (e) {
        // Ignore and fall through to the default landing logic
      }

      // Navigate based on onboarding status - PRIORITIZE onboarding check
      // Only redirect to dashboard/multi-location if onboarding is complete
      try {
        // Get customers array to check count
        const customers = authData.user?.customers || []
        const hasMultipleLocations = customers.length > 1

        // Helper function to set single location and redirect
        const handleSingleLocation = async (singleCustomer: any) => {
          try {
            // Call API to set customer ID
            const response = await fetch(`${API_BASE_URL}/set-customer-id`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authData.access_token}`,
              },
              body: JSON.stringify({ customer_id: singleCustomer.id }),
            })

            if (response.ok) {
              const result = await response.json()
              localStorage.setItem("token", result.token)
              localStorage.setItem("customerId", singleCustomer.id.toString())
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
              setToken(result.token)
              syncedCustomerIdRef.current = singleCustomer.id
              lastPermissionsFetchKeyRef.current = null

              // Update user object with customer_id
              const updatedUser = {
                ...authData.user,
                customer_id: singleCustomer.id,
              }
              setUser(updatedUser)
              localStorage.setItem("user", JSON.stringify(updatedUser))

              // Fetch and store logo for the customer
              fetchCustomerLogo(singleCustomer.id, result.token)
            } else {
              // If API fails, still set localStorage as fallback
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
              localStorage.setItem("customerId", singleCustomer.id.toString())
            }
          } catch (error) {
            console.error("Failed to set customer ID:", error)
            // Fallback: still set localStorage
            localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
            localStorage.setItem("customerId", singleCustomer.id.toString())
          }
        }

        // Superadmin bypasses onboarding check
        if (isSuperAdmin) {
          if (shouldSeeMultiLocation && hasMultipleLocations) {
            router.replace("/multiple-location")
          } else {
            // Single location or no multi-location role - go directly to dashboard
            if (shouldSeeMultiLocation && customers.length === 1) {
              // Set the single location automatically via API
              handleSingleLocation(customers[0]).then(() => {
                router.replace("/dashboard")
              })
            } else {
              router.replace("/dashboard")
            }
          }
          return true
        }

        // If we have a customer, check onboarding status first
        if (primaryCustomer) {
          // Check if onboarding is NOT complete
          if (!isOnboardingComplete) {
            setTimeout(() => {
              router.push("/onboarding/business-hours")
            }, 100)
            return true
          } else {
            // Onboarding is complete - safe to go to the role's landing page
            const landingPath = getPostLoginLandingPath(userRoles)
if (shouldSeeMultiLocation && hasMultipleLocations) {
              router.replace("/multiple-location")
            } else {
              // Single location or no multi-location role - go directly to landing page
              if (shouldSeeMultiLocation && customers.length === 1) {
                // Set the single location automatically via API
                handleSingleLocation(customers[0]).then(() => {
                  router.replace(landingPath)
                })
              } else {
                router.replace(landingPath)
              }
            }
            return true
          }
        } else {
          // No customer associated - redirect to onboarding as fallback
          // Don't redirect to dashboard if we can't verify onboarding status
          console.log('No primary customer found, redirecting to onboarding')
          router.replace("/onboarding/business-hours")
          return true
        }
      } catch (navError) {
        console.error("Navigation error:", navError)
        // On error, redirect to onboarding instead of dashboard to be safe
        router.replace("/onboarding/business-hours")
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${authData.user.first_name || "User"}!`,
        variant: "default",
      })

      return true
    } catch (err) {
      console.error("setAuthFromData error:", err)
      return false
    }
  }

  const updateSessionUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...partial }
      localStorage.setItem("user", JSON.stringify(updated))
      return updated
    })
  }, [])

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setError(null)
    try {
      const result = await import("@/hooks/use-login").then((m) => m.loginUser({ identifier, password }))

      // result is AuthData
      const authData: AuthData = result

      // Reuse shared helper to apply auth data and handle navigation
      return setAuthFromData(authData, identifier)
    } catch (err: any) {
      console.error("Login error:", err)
      if (err?.message === "Unauthorized") {
        handleUnauthorized()
        return false
      }
      const errorMsg = err?.message || "An error occurred during login. Please try again."
      setError(errorMsg)
      return false
    }
  }

  const resetPasswordConfirm = async (
    token: string,
    password: string,
    password_confirmation: string,
    email: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password, password_confirmation, email }),
      })

      // Handle unauthorized
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      const result = await response.json()

      if (!response.ok || result.success === false) {
        const errorPayload = {
          message: result?.error_description || result?.message || "Reset password failed",
          errors: result?.errors || null,
          status: result?.status_code || response.status,
        }
        throw errorPayload
      }

      return true
    } catch (error: any) {
      console.error("Reset password failed:", error)
      throw error
    }
  }

  const setupAccount = async (
    token: string,
    password: string,
    password_confirmation: string,
    email: string,
    verification_token: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/registration/setup-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password, password_confirmation, email, verification_token }),
      })

      // Handle unauthorized
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      const result = await response.json()

      if (!response.ok || result.success === false) {
        const errorPayload = {
          message: result?.error || "Setup Account failed",
          errors: result?.errors || null,
          status: result?.status_code || response.status,
        }
        throw errorPayload
      }

      return true
    } catch (error: any) {
      console.error("Setup Account failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem("token")

      if (token) {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        // Handle unauthorized
        if (response.status === 401) {
          handleUnauthorized()
          return
        }
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      setToken(null)
      setProfilePermissions([])
      setSelectedCustomerId(null)
      setProfileRole(null)
      setRolePermissions([])
      setOverridePermissions([])
      syncedCustomerIdRef.current = null
      setCustomerIdInFlightRef.current = null
      lastPermissionsFetchKeyRef.current = null
      clearSessionStorage()

      router.replace("/login")

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      })
    }
  }

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error("Failed to send password reset email")
      }

      return true
    } catch (error) {
      console.error("Forgot password error:", error)
      throw error
    }
  }

  const fetchUsers = useCallback(async (params?: {
    status?: string
    role?: string
    customer_id?: string
    department_id?: string
    q?: string
    per_page?: number
    order_by?: string
    sort_by?: "asc" | "desc"
    page?: number
  }): Promise<any> => {
    try {
      const superadmin = userIsSuperadmin(userRef.current)
      const customerId =
        params?.customer_id ?? (!superadmin ? localStorage.getItem("customerId") : null)
      const queryParams = new URLSearchParams();
      
      if (params?.status) queryParams.append("status", formatUserStatusForApi(params.status));
      if (params?.role) queryParams.append("role", params.role);
      if (params?.department_id) queryParams.append("department_id", params.department_id);
      if (params?.q) queryParams.append("q", params.q);
      if (params?.per_page) queryParams.append("per_page", String(params.per_page));
      if (params?.order_by) queryParams.append("order_by", params.order_by);
      if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
      if (params?.page) queryParams.append("page", String(params.page));
      
      // Always include customer_id if it exists (required for office_admin role)
      if (customerId) {
        queryParams.append("customer_id", String(customerId));
      }
      
      const url = `${API_BASE_URL}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
  
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Forbidden: You don't have permission to access this resource");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch users");
      }
  
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Fetch users error:", error);
      throw error;
    }
  }, [handleUnauthorized]);

  const updateUser = useCallback(async (userId: number, data: {
    first_name?: string
    last_name?: string
    phone?: string
    work_number?: string
    status?: string
    department_ids?: number[]
    customer_id?: number
  }): Promise<any> => {
    try {
      const customerId = data.customer_id ?? (localStorage.getItem("customerId") ? Number(localStorage.getItem("customerId")) : undefined)
      const payload = {
        ...data,
        ...(data.status !== undefined ? { status: formatUserStatusForApi(data.status) } : {}),
        ...(customerId !== undefined ? { customer_id: customerId } : {}),
      }
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update user")
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }, [handleUnauthorized]);

  const deleteUser = useCallback(async (userId: number): Promise<any> => {
    try {
      const customerId = localStorage.getItem("customerId")
      const queryParams = new URLSearchParams()
      if (customerId) {
        queryParams.append("customer_id", customerId)
      }
      const url = `${API_BASE_URL}/users/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to delete user")
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }, [handleUnauthorized])

  const fetchUserById = useCallback(async (userId: number, customerId?: string): Promise<any> => {
    try {
      const resolvedCustomerId = customerId || localStorage.getItem("customerId") || undefined
      const queryParams = new URLSearchParams()
      if (resolvedCustomerId) {
        queryParams.append("customer_id", resolvedCustomerId)
      }
      const url = `${API_BASE_URL}/users/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch user details")
      }

      return await response.json()
    } catch (error) {
      console.error("Fetch user by id error:", error)
      throw error
    }
  }, [handleUnauthorized])

  const fetchUserActivity = useCallback(async (userId: number, params?: { per_page?: number; page?: number }): Promise<any> => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append("user_id", String(userId))
      if (params?.per_page) queryParams.append("per_page", String(params.per_page))
      if (params?.page) queryParams.append("page", String(params.page))
      const url = `${API_BASE_URL}/audits?${queryParams.toString()}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch user activity")
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }, [handleUnauthorized])

  const getUserPermissions = useCallback(async (customerId?: string): Promise<any> => {
    try {
      const url = appendCustomerIdQuery(
        `${API_BASE_URL}/users/permissions`,
        customerId ?? getActiveCustomerId(),
      )
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch user permissions")
      }

      return await response.json()
    } catch (error) {
      console.error("Get user permissions error:", error)
      throw error
    }
  }, [handleUnauthorized])

  const refreshProfilePermissions = useCallback(
    async (customerId?: string): Promise<string[]> => {
      if (userIsSuperadmin(userRef.current)) {
        applyPermissionsProfile({
          permissions: [],
          role_permissions: [],
          override_permissions: [],
          role: "superadmin",
        })
        return []
      }

      const id = customerId ?? getActiveCustomerId()
      if (!id) {
        applyPermissionsProfile({
          permissions: [],
          role_permissions: [],
          override_permissions: [],
        })
        return []
      }

      const result = await getUserPermissions(id)
      const snapshot = parsePermissionsProfile(result)
      const roleFromCustomers = roleOnCustomer(userRef.current?.customers, Number(id))
      applyPermissionsProfile({
        ...snapshot,
        role: snapshot.role ?? roleFromCustomers,
        customer_id: snapshot.customer_id ?? Number(id),
      })
      return snapshot.permissions
    },
    [getUserPermissions, applyPermissionsProfile],
  )

  const getAvailablePermissions = useCallback(async (customerId?: string): Promise<AvailablePermissionsPayload> => {
    const { fetchAvailablePermissions } = await import("@/lib/api/user-permissions-api")
    return fetchAvailablePermissions(customerId ?? getActiveCustomerId())
  }, [])

  const fetchUserPermissionDetail = useCallback(async (userId: number, customerId?: string) => {
    const { fetchUserPermissionDetail: fetchDetail } = await import("@/lib/api/user-permissions-api")
    return fetchDetail(userId, customerId ?? getActiveCustomerId())
  }, [])

  const updateUserDirectPermissions = useCallback(
    async (userId: number, permissions: string[], customerId?: string) => {
      const { updateUserOverridePermissions } = await import("@/lib/api/user-permissions-api")
      return updateUserOverridePermissions(userId, permissions, customerId ?? getActiveCustomerId())
    },
    [],
  )

  const hasPermission = useCallback(
    (permission: string) => checkPermission(profilePermissions, permission, isSuperadmin),
    [profilePermissions, isSuperadmin],
  )

  const hasAnyPermission = useCallback(
    (permissions: string[]) => checkAnyPermission(profilePermissions, permissions, isSuperadmin),
    [profilePermissions, isSuperadmin],
  )

  const createUser = useCallback(async (userData: FormData | {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    work_number?: string;
    customer_id: string;
    role: string;
    is_doctor: boolean;
    department_ids: number[];
    license_number?: string;
    signature?: any;
  }): Promise<any> => {
    try {
      const isFormData = userData instanceof FormData;
      
      const headers: HeadersInit = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      
      // Only set Content-Type for JSON, let browser set it for FormData (with boundary)
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers,
        body: isFormData ? userData : JSON.stringify(userData),
      });

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create user");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Create user error:", error);
      throw error;
    }
  }, [handleUnauthorized]);

  const updateUserDetails = useCallback(async (userId: number, userData: {
    first_name: string;
    last_name: string;
    phone: string;
    work_number?: string;
    status: string;
    department_ids?: number[];
  }): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...userData,
          status: formatUserStatusForApi(userData.status),
        }),
      });

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update user");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Update user details error:", error);
      throw error;
    }
  }, [handleUnauthorized]);

  const setCustomerId = useCallback(
    async (
      customerId: number,
      options?: { reload?: boolean; redirectTo?: string },
    ): Promise<boolean> => {
      const shouldReload = options?.reload === true

      if (!shouldReload && syncedCustomerIdRef.current === customerId) {
        return true
      }

      if (setCustomerIdInFlightRef.current) {
        return setCustomerIdInFlightRef.current
      }

      const run = (async (): Promise<boolean> => {
        try {
          const authToken = token ?? localStorage.getItem("token")
          if (!authToken) {
            throw new Error("Not authenticated")
          }

          const response = await fetch(`${API_BASE_URL}/set-customer-id`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ customer_id: customerId }),
          })

          if (response.status === 401) {
            handleUnauthorized()
            throw new Error("Unauthorized")
          }

          if (!response.ok) {
            throw new Error("Failed to set customer ID")
          }

          const result = await response.json()
          localStorage.setItem("token", result.token)
          localStorage.setItem("customerId", String(customerId))
          setSelectedCustomerId(customerId)
          setToken(result.token)
          syncedCustomerIdRef.current = customerId
          lastPermissionsFetchKeyRef.current = null

          const currentUser = userRef.current
          if (currentUser) {
            const roleOnProfile = roleOnCustomer(currentUser.customers, customerId)
            if (roleOnProfile) {
              setProfileRole(roleOnProfile)
              localStorage.setItem("role", roleOnProfile)
            }
            const selectedCustomer = currentUser.customers?.find((c) => c.id === customerId)
            if (selectedCustomer?.type) {
              localStorage.setItem("customerType", selectedCustomer.type)
            }
            if (selectedCustomer) {
              localStorage.setItem("selectedLocation", JSON.stringify(selectedCustomer))
            }
            const updatedUser = {
              ...currentUser,
              customer_id: customerId,
            }
            setUser(updatedUser)
            localStorage.setItem("user", JSON.stringify(updatedUser))
          }

          fetchCustomerLogo(customerId, result.token)

          try {
            await refreshProfilePermissions(String(customerId))
          } catch (permError) {
            console.error("Failed to refresh permissions after profile switch:", permError)
          }

          if (shouldReload) {
            reloadAppAfterProfileSwitch(options?.redirectTo ?? "/dashboard")
          }

          return true
        } finally {
          setCustomerIdInFlightRef.current = null
        }
      })()

      setCustomerIdInFlightRef.current = run
      return run
    },
    [token, handleUnauthorized, refreshProfilePermissions],
  )

  // Impersonate a user
  const impersonateUser = async (userId: number): Promise<boolean> => {
    try {
      // Store the original user and token
      if (user && token && !isImpersonating) {
        setOriginalUser(user)
        setOriginalToken(token)
        localStorage.setItem("originalUser", JSON.stringify(user))
        localStorage.setItem("originalToken", token)
      }

      // Get customerId from localStorage
      const customerId = localStorage.getItem("customerId")

      // Build URL with customerId parameter if available
      const queryParams = new URLSearchParams()
      if (customerId) {
        queryParams.append("customer_id", customerId)
      }
      const url = `${API_BASE_URL}/users/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

      // Fetch the user to impersonate
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch user details (${response.status})`)
      }

      const result = await response.json()
      const impersonatedUser = result.data || result

      // Update the current user to the impersonated user
      setUser(impersonatedUser)
      setIsImpersonating(true)
      localStorage.setItem("user", JSON.stringify(impersonatedUser))
      localStorage.setItem("isImpersonating", "true")

      toast({
        title: "Viewing as User",
        description: `You are now viewing as ${impersonatedUser.first_name} ${impersonatedUser.last_name}`,
        variant: "default",
      })

      // Navigate to dashboard to see user's perspective
      router.push("/dashboard")

      return true
    } catch (error: any) {
      console.error("Impersonate user error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to impersonate user",
        variant: "destructive",
      })
      return false
    }
  }

  // Stop impersonation and restore original user
  const stopImpersonation = () => {
    const storedOriginalUser = localStorage.getItem("originalUser")
    const storedOriginalToken = localStorage.getItem("originalToken")

    if (storedOriginalUser && storedOriginalToken) {
      const parsedOriginalUser = JSON.parse(storedOriginalUser)
      setUser(parsedOriginalUser)
      setToken(storedOriginalToken)
      setIsImpersonating(false)

      localStorage.setItem("user", storedOriginalUser)
      localStorage.setItem("token", storedOriginalToken)
      localStorage.removeItem("originalUser")
      localStorage.removeItem("originalToken")
      localStorage.removeItem("isImpersonating")

      toast({
        title: "Impersonation Stopped",
        description: `You are now viewing as ${parsedOriginalUser.first_name} ${parsedOriginalUser.last_name}`,
        variant: "default",
      })

      router.push("/office-administrator/user-management")
    } else if (originalUser && originalToken) {
      setUser(originalUser)
      setToken(originalToken)
      setIsImpersonating(false)

      localStorage.setItem("user", JSON.stringify(originalUser))
      localStorage.setItem("token", originalToken)
      localStorage.removeItem("originalUser")
      localStorage.removeItem("originalToken")
      localStorage.removeItem("isImpersonating")

      toast({
        title: "Impersonation Stopped",
        description: `You are now viewing as ${originalUser.first_name} ${originalUser.last_name}`,
        variant: "default",
      })

      router.push("/office-administrator/user-management")
    }
  }

  // Refresh profile permissions when session is restored (e.g. page reload)
  useEffect(() => {
    if (!user || !token || isSuperadmin) return
    const customerId = getActiveCustomerId()
    if (!customerId) return

    const fetchKey = `${user.id}:${token}:${customerId}`
    if (lastPermissionsFetchKeyRef.current === fetchKey) return
    lastPermissionsFetchKeyRef.current = fetchKey

    const fromCustomers = permissionsFromCustomer(user.customers, Number(customerId))
    if (fromCustomers.length > 0) {
      applyProfilePermissions(fromCustomers)
    }

    refreshProfilePermissions(customerId).catch(() => {})
  }, [user?.id, token, isSuperadmin, refreshProfilePermissions, applyProfilePermissions, user?.customers])

  // Load impersonation state on mount
  useEffect(() => {
    const storedIsImpersonating = localStorage.getItem("isImpersonating")
    if (storedIsImpersonating === "true") {
      setIsImpersonating(true)

      const storedOriginalUser = localStorage.getItem("originalUser")
      const storedOriginalToken = localStorage.getItem("originalToken")

      if (storedOriginalUser && storedOriginalToken) {
        setOriginalUser(JSON.parse(storedOriginalUser))
        setOriginalToken(storedOriginalToken)
      }
    }
  }, [])

  //set api customer
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        error,
        clearError,
        setAuthFromData,
        updateSessionUser,
        sessionHistory,
        clearSessionHistory,
        isNewUser,
        setOnboardingComplete,
        resetPasswordConfirm,
        forgotPassword,
        setupAccount,
        fetchUsers,
        updateUser,
        createUser,
        updateUserDetails,
        deleteUser,
        fetchUserById,
        fetchUserActivity,
        getUserPermissions,
        getAvailablePermissions,
        fetchUserPermissionDetail,
        updateUserDirectPermissions,
        profilePermissions,
        permissions: profilePermissions,
        selectedCustomerId,
        profileRole,
        rolePermissions,
        overridePermissions,
        isSuperadmin,
        refreshProfilePermissions,
        hasPermission,
        hasAnyPermission,
        setCustomerId,
        isAuthenticated,
        checkAuthAndRedirect,
        impersonateUser,
        stopImpersonation,
        isImpersonating,
        originalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
