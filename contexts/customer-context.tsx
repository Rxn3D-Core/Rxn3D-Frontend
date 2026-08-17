"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
import { useAuth } from "./auth-context"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: number
  name: string
  website: string | null
  address: string
  logo_url: string | null
  city: string
  postal_code: string
  email: string
  type: string
  status: string
  code?: string
  unique_code: string
  created_at: string
  updated_at: string
}

interface CustomerProfile extends Customer {
  state?: {
    id: number
    name: string
  }
  country?: {
    id: number
    name: string
  }
  departments?: any[]
  business_settings?: {
    business_hours: Array<{
      id: number
      customer_id: number
      customer_type: string
      day: string
      is_open: boolean
      open_time?: string
      close_time?: string
      created_at: string
      updated_at: string
    }>
    case_schedule: {
      id: number
      customer_id: number
      default_pickup_time: string
      default_delivery_time: string
      enable_rush_cases: boolean
      created_at: string
      updated_at: string
    }
  }
  default_admin?: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    work_number: string
    status: string
  }
  users?: Array<{
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    status: string
    role: {
      id: number
      name: string
    }
    departments: any[]
  }>
}

interface PaginationInfo {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

interface SearchResponse {
  data: Customer[]
  pagination: PaginationInfo
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number
    last_page: number
    links: Array<{
      url: string | null
      label: string
      active: boolean
    }>
    path: string
    per_page: number
    to: number
    total: number
  }
}

interface CustomerContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: Customer[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo
  handleSearch: (type: "Office" | "Lab", queryOverride?: string) => Promise<void>
  clearSearch: () => void
  customers: Customer[]
  isCustomersLoading: boolean
  customersError: string | null,
  fetchCustomers: (type: "office" | "lab", options?: {
    q?: string
    role?: string
    department_id?: number
    status?: "Active" | "Inactive"
    per_page?: number
    order_by?: "created_at" | "name"
    sort_by?: "asc" | "desc"
    page?: number
  }) => Promise<void>,
  officeCustomers: Customer[],
  labCustomers: Customer[],
  fetchCustomerProfile: (customerId: number) => Promise<CustomerProfile | null>,
  customerProfile: CustomerProfile | null,
  isProfileLoading: boolean,
  profileError: string | null,
  updateCustomerProfile: (customerId: number, data: Partial<CustomerProfile>) => Promise<CustomerProfile | null>
  updateCustomerLogo: (customerId: number, logo: File) => Promise<CustomerProfile | null>
  toggleCasePanColorCode: (customerId: number) => Promise<{ customer_id: number; case_pan_color_code: boolean } | null>
  assignCustomerRoleToUser: (payload: {
    customer_id: number
    user_id: number
    role_id: number
    department_id?: number
    is_primary?: boolean
  }) => Promise<any | null>
  removeCustomerRoleFromUser: (customerId: number, userId: number) => Promise<boolean>
  listCustomerDepartments: (customerId: number) => Promise<any[]>
  getCustomerDepartment: (customerId: number, departmentId: number) => Promise<any | null>
  createCustomerDepartment: (customerId: number, payload: {
    name: string
    code: string
    multiple_procedure?: boolean
    status?: "Active" | "Inactive"
    order?: number
  }) => Promise<any | null>
  updateCustomerDepartment: (customerId: number, departmentId: number, payload: {
    name?: string
    code?: string
    multiple_procedure?: boolean
    status?: "Active" | "Inactive"
    order?: number
  }) => Promise<any | null>
  deleteCustomerDepartment: (customerId: number, departmentId: number) => Promise<boolean>
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export function useCustomer(): CustomerContextType {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
}

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    per_page: 25,
    current_page: 1,
    last_page: 1,
  })

  // New state for fetching all customers
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isCustomersLoading, setIsCustomersLoading] = useState(false)
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [officeCustomers, setOfficeCustomers] = useState<Customer[]>([])
  const [labCustomers, setLabCustomers] = useState<Customer[]>([])
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSearch = useCallback(
    async (type: "Office" | "Lab", queryOverride?: string) => {
      const queryToSearch = queryOverride ?? searchQuery
      if (!queryToSearch.trim()) {
        setSearchResults([])
        return
      }
  
      setIsLoading(true)
      setError(null)
  
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("library_token")
        if (!token) {
          throw new Error("No authentication token found")
        }
  
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(
          `${API_BASE_URL}/customers/search?q=${encodeURIComponent(queryToSearch)}&type=${type}&per_page=25`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )
  
        if (!response.ok) {
          throw new Error(`Failed to search customers: ${response.status}`)
        }
  
        const data: SearchResponse = await response.json()
        setSearchResults(data.data)
        setPagination(data.pagination)
      } catch (err: any) {
        setError(err.message || "Failed to perform search")
        toast({
          title: "Error",
          description: err.message || "Failed to perform search",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [searchQuery, toast],
  )
  

  // New function to fetch all customers of a specific type
  const fetchCustomers = useCallback(
    async (type: "office" | "lab", options?: {
      q?: string
      role?: string
      department_id?: number
      status?: "Active" | "Inactive"
      per_page?: number
      order_by?: "created_at" | "name"
      sort_by?: "asc" | "desc"
      page?: number
    }) => {
      setIsCustomersLoading(true)
      setCustomersError(null)

      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const queryParams = new URLSearchParams({
          type,
          per_page: String(options?.per_page ?? 25),
          order_by: options?.order_by ?? "created_at",
          sort_by: options?.sort_by ?? "desc",
        })
        if (options?.q) queryParams.append("q", options.q)
        if (options?.role) queryParams.append("role", options.role)
        if (options?.department_id) queryParams.append("department_id", String(options.department_id))
        if (options?.status) queryParams.append("status", options.status)
        if (options?.page) queryParams.append("page", String(options.page))

        const response = await fetch(`${API_BASE_URL}/customers/search?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`)
        }

        const data: SearchResponse = await response.json()
        if (type === "office") {
          setOfficeCustomers(data.data || [])
        } else {
          setLabCustomers(data.data || [])
        }
        setCustomers(data.data || [])
        if (data.pagination) {
          setPagination(data.pagination)
        }
      } catch (err: any) {
        setCustomersError(err.message || "Failed to fetch customers")
        toast({
          title: "Error",
          description: err.message || "Failed to fetch customers",
          variant: "destructive",
        })
      } finally {
        setIsCustomersLoading(false)
      }
    },
    [toast],
  )

  const fetchCustomerProfile = useCallback(
    async (customerId: number): Promise<CustomerProfile | null> => {
      setIsProfileLoading(true)
      setProfileError(null)

      try {
        const token = localStorage.getItem("token") || localStorage.getItem("library_token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch customer profile: ${response.status}`)
        }

        const data = await response.json()
        setCustomerProfile(data.data)
        return data.data
      } catch (err: any) {
        setProfileError(err.message || "Failed to fetch customer profile")
        toast({
          title: "Error",
          description: err.message || "Failed to fetch customer profile",
          variant: "destructive",
        })
        return null
      } finally {
        setIsProfileLoading(false)
      }
    },
    [toast],
  )

  const updateCustomerProfile = useCallback(
    async (customerId: number, data: Partial<CustomerProfile>): Promise<CustomerProfile | null> => {
      setIsProfileLoading(true)
      setProfileError(null)

      try {
        const token = localStorage.getItem("token") || localStorage.getItem("library_token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        
        // Prepare update payload - only include fillable fields
        const updateData: any = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.website !== undefined) updateData.website = data.website
        if (data.address !== undefined) updateData.address = data.address
        if (data.city !== undefined) updateData.city = data.city
        if (data.postal_code !== undefined) updateData.postal_code = data.postal_code
        if (data.email !== undefined) updateData.email = data.email
        if ((data as any).status !== undefined) updateData.status = (data as any).status
        // Support direct state_id and country_id (preferred) or nested structure
        if ((data as any).state_id !== undefined) {
          updateData.state_id = (data as any).state_id
        } else if (data.state?.id !== undefined) {
          updateData.state_id = data.state.id
        }
        if ((data as any).country_id !== undefined) {
          updateData.country_id = (data as any).country_id
        } else if (data.country?.id !== undefined) {
          updateData.country_id = data.country.id
        }
        // Support release_casepan
        if ((data as any).release_casepan !== undefined) {
          updateData.release_casepan = (data as any).release_casepan
        }
        // Support code
        if ((data as any).code !== undefined) {
          updateData.code = (data as any).code
        }

        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        })

        if (response.status === 401) {
          window.location.href = '/login'
          return null
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to update customer profile: ${response.status}`)
        }

        const result = await response.json()
        const updatedProfile = result.data || result
        
        // Update the customer profile state
        setCustomerProfile(updatedProfile)
        
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        
        return updatedProfile
      } catch (err: any) {
        setProfileError(err.message || "Failed to update customer profile")
        toast({
          title: "Error",
          description: err.message || "Failed to update customer profile",
          variant: "destructive",
        })
        return null
      } finally {
        setIsProfileLoading(false)
      }
    },
    [toast],
  )

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setSearchResults([])
    setError(null)
    setPagination({
      total: 0,
      per_page: 25,
      current_page: 1,
      last_page: 1,
    })
  }, [])

  const updateCustomerLogo = useCallback(
    async (customerId: number, logo: File): Promise<CustomerProfile | null> => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("library_token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const formData = new FormData()
        formData.append("logo", logo)

        const response = await fetch(`${API_BASE_URL}/customers/${customerId}/logo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to update customer logo: ${response.status}`)
        }

        const result = await response.json()
        const updatedProfile = result.data || result
        setCustomerProfile((prev) => (prev ? { ...prev, ...updatedProfile } : updatedProfile))
        return updatedProfile
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to update customer logo",
          variant: "destructive",
        })
        return null
      }
    },
    [toast],
  )

  const toggleCasePanColorCode = useCallback(
    async (customerId: number): Promise<{ customer_id: number; case_pan_color_code: boolean } | null> => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("library_token")
        if (!token) {
          throw new Error("No authentication token found")
        }
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${API_BASE_URL}/customers/toggle-case-pan-color-code`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customer_id: customerId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to toggle case pan color code: ${response.status}`)
        }

        const result = await response.json()
        return result.data || null
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to toggle case pan color code",
          variant: "destructive",
        })
        return null
      }
    },
    [toast],
  )

  const getAuthToken = () => localStorage.getItem("token") || localStorage.getItem("library_token")

  const assignCustomerRoleToUser = useCallback(
    async (payload: {
      customer_id: number
      user_id: number
      role_id: number
      department_id?: number
      is_primary?: boolean
    }): Promise<any | null> => {
      try {
        const token = getAuthToken()
        if (!token) throw new Error("No authentication token found")
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${API_BASE_URL}/customers/${payload.customer_id}/users/${payload.user_id}/role`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to assign customer role")
        }
        return await response.json()
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to assign role", variant: "destructive" })
        return null
      }
    },
    [toast],
  )

  const removeCustomerRoleFromUser = useCallback(async (customerId: number, userId: number): Promise<boolean> => {
    try {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token found")
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/users/${userId}/role`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to remove customer role")
      }
      return true
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove role", variant: "destructive" })
      return false
    }
  }, [toast])

  const listCustomerDepartments = useCallback(async (customerId: number): Promise<any[]> => {
    try {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token found")
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/departments`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch departments")
      }
      return await response.json()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to fetch departments", variant: "destructive" })
      return []
    }
  }, [toast])

  const getCustomerDepartment = useCallback(async (customerId: number, departmentId: number): Promise<any | null> => {
    try {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token found")
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/departments/${departmentId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch department")
      }
      return await response.json()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to fetch department", variant: "destructive" })
      return null
    }
  }, [toast])

  const createCustomerDepartment = useCallback(
    async (customerId: number, payload: {
      name: string
      code: string
      multiple_procedure?: boolean
      status?: "Active" | "Inactive"
      order?: number
    }): Promise<any | null> => {
      try {
        const token = getAuthToken()
        if (!token) throw new Error("No authentication token found")
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}/departments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customer_id: customerId, ...payload }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to create department")
        }
        return await response.json()
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to create department", variant: "destructive" })
        return null
      }
    },
    [toast],
  )

  const updateCustomerDepartment = useCallback(
    async (customerId: number, departmentId: number, payload: {
      name?: string
      code?: string
      multiple_procedure?: boolean
      status?: "Active" | "Inactive"
      order?: number
    }): Promise<any | null> => {
      try {
        const token = getAuthToken()
        if (!token) throw new Error("No authentication token found")
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}/departments/${departmentId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to update department")
        }
        return await response.json()
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to update department", variant: "destructive" })
        return null
      }
    },
    [toast],
  )

  const deleteCustomerDepartment = useCallback(async (customerId: number, departmentId: number): Promise<boolean> => {
    try {
      const token = getAuthToken()
      if (!token) throw new Error("No authentication token found")
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/departments/${departmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to delete department")
      }
      return true
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete department", variant: "destructive" })
      return false
    }
  }, [toast])

  return (
    <CustomerContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        isLoading,
        error,
        pagination,
        handleSearch,
        clearSearch,
        customers,
        fetchCustomers,
        isCustomersLoading,
        customersError,
        officeCustomers,
        labCustomers,
        fetchCustomerProfile,
        customerProfile,
        isProfileLoading,
        profileError,
        updateCustomerProfile,
        updateCustomerLogo,
        toggleCasePanColorCode,
        assignCustomerRoleToUser,
        removeCustomerRoleFromUser,
        listCustomerDepartments,
        getCustomerDepartment,
        createCustomerDepartment,
        updateCustomerDepartment,
        deleteCustomerDepartment,
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}
