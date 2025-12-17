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
  status: number
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
  fetchCustomers: (type: "office" | "lab") => Promise<void>,
  officeCustomers: Customer[],
  labCustomers: Customer[],
  fetchCustomerProfile: (customerId: number) => Promise<CustomerProfile | null>,
  customerProfile: CustomerProfile | null,
  isProfileLoading: boolean,
  profileError: string | null,
  updateCustomerProfile: (customerId: number, data: Partial<CustomerProfile>) => Promise<CustomerProfile | null>
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
    async (type: "office" | "lab") => {
      setIsCustomersLoading(true)
      setCustomersError(null)

      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${API_BASE_URL}/customers/search?type=${type}&per_page=25`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`)
        }

        const data = await response.json()
        if (type === "office") {
          setOfficeCustomers(data.data)
        } else {
          setLabCustomers(data.data)
        }
        setCustomers(data.data)
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
        if (data.state?.id !== undefined) updateData.state_id = data.state.id
        if (data.country?.id !== undefined) updateData.country_id = data.country.id

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
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}
