"use client"

import { Mail, MapPin, Phone } from "lucide-react"
import { CustomerLogo } from "@/components/customer-logo"
import { useAuth } from "@/contexts/auth-context"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { useEffect } from "react"

interface LabProfileSidebarProps {
  labData: {
    name: string
    type: string
    email: string
    address: string
    phone: string
    logo?: string
  }
}

export function LabProfileSidebar({ labData }: LabProfileSidebarProps) {
  const { user } = useAuth()
  
  // Initialize logo store from localStorage on mount
  const initializeFromStorage = useCustomerLogoStore((state) => state.initializeFromStorage)
  useEffect(() => {
    initializeFromStorage()
  }, [initializeFromStorage])
  
  // Get customer ID for logo display
  const getCustomerId = (): number | null => {
    // First try to get from localStorage
    if (typeof window !== "undefined") {
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        return parseInt(storedCustomerId, 10)
      }
    }

    // Then try to get from user's customers array
    if (user?.customers && user.customers.length > 0) {
      return user.customers[0].id
    }

    // If user has a customer_id property
    if (user?.customer_id) {
      return user.customer_id
    }

    // If user has a customer object
    if (user?.customer?.id) {
      return user.customer.id
    }

    return null
  }

  const customerId = getCustomerId()

  return (
    <div className="w-80 bg-white p-6 border-r">
      <div className="flex flex-col items-center mb-8">
        <div className="w-40 h-40 rounded-full border-2 border-gray-200 flex items-center justify-center mb-4 bg-gray-50 overflow-hidden">
          <CustomerLogo
            customerId={customerId}
            alt={`${labData.name} Logo`}
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-xl font-bold text-center mb-2">{labData.name}</h2>
        <p className="text-gray-600 text-sm mb-4">{labData.type}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{labData.email}</span>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
          <span className="text-sm">{labData.address}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{labData.phone}</span>
        </div>
      </div>
    </div>
  )
}
