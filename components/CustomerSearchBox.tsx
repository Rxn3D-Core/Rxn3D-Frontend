"use client"

import { Input } from "@/components/ui/input"
import { Mail, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useCustomer } from "@/contexts/customer-context"
import { useToast } from "@/components/ui/use-toast"
import { useInvitation } from "@/contexts/invitation-context"
import { EntityType } from "@/contexts/invitation-context"
import { useAuth } from "@/contexts/auth-context"
interface Customer {
  id: number
  name: string
  email: string
  city: string
  postal_code: string
  status: number
  type: string
}

interface CustomerSearchBoxProps {
  type: "Office" | "Lab" | "User"
  placeholder?: string
  onSelect: (customer: Customer) => void
  isLoading?: boolean
  showProfile?: boolean
  searchState?: {
    query: string
    setQuery: (query: string) => void
  }
}

export function CustomerSearchBox({
  type,
  placeholder = "Search...",
  onSelect,
  isLoading = false,
  showProfile = true,
  searchState,
}: CustomerSearchBoxProps) {
  const [showSearchResults, setShowSearchResults] = useState(false)
  const { searchQuery, setSearchQuery, searchResults, handleSearch, clearSearch } = useCustomer()

  const { sendInvitation } = useInvitation()
  const { toast } = useToast()
  const { user } = useAuth()

  // Use local state if searchState is provided, otherwise use context
  const query = searchState?.query ?? searchQuery
  const setQuery = searchState?.setQuery ?? setSearchQuery

  useEffect(() => {
    if (query.trim().length >= 2) {
      handleSearch(type, query)
    }
  }, [query, type])

  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case 1: // Active
        return "bg-[#c3f2cf] text-[#119933]"
      case 2: // On Hold
        return "bg-[#fff3e1] text-[#ff9500]"
      case 3: // Pending
        return "bg-[#eeeeee] text-[#a19d9d]"
      case 4: // Rejected
        return "bg-[#f8dddd] text-[#eb0303]"
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return "Connected"
      case 2:
        return "On Hold"
      case 3:
        return "Pending"
      case 4:
        return "Reconnect"
      default:
        return "Unknown"
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    setQuery(customer.name)
    setShowSearchResults(false)
    clearSearch()
    onSelect(customer)
  }

  const handleSendInvitation = async (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation()
  
    try {
      const entityType: EntityType =
        type === "Office" ? "Office" :
        type === "Lab" ? "Lab" : "Supplier"
  
      const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
      const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id
  
      await sendInvitation({
        name: customer.name,
        email: customer.email,
        invited_by: invitedBy,
        type: entityType,
      })
  
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${customer.name}`,
      })
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast({
        title: "Error",
        description: `Failed to send invitation. Please try again.`,
        variant: "destructive",
      })
    }
  }
  
  

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        className="pl-4 pr-10 border border-gray-300 rounded"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSearchResults(true)}
        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
      />
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

      {/* Search Results Dropdown */}
      {showSearchResults && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-2 text-center">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((customer) => (
              <div
                key={customer.id}
                className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 flex items-center justify-between"
                onClick={() => handleCustomerSelect(customer)}
              >
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold text-blue-600">{customer.name}</span>
                  <span>–</span>
                  <span>
                    {[
                      customer.address,
                      customer.city,
                      customer.country,
                      customer.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>

                <Mail
                  size={20}
                  className="text-gray-600 hover:text-blue-500 cursor-pointer ml-4"
                  onClick={(e) => handleSendInvitation(customer, e)}
                />
              </div>

            ))
          ) : (
            <div className="p-2 text-center text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}

