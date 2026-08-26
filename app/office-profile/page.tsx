"use client"

import { useState, useEffect } from "react"
import { useCustomer } from "@/contexts/customer-context"
import { useAuth } from "@/contexts/auth-context"
import OverviewTab from "@/components/office-administrator/office-profile-overview"
import { OperatingHoursTab } from "@/components/office-administrator/office-profile-operating-hours"
import ActivityLogTab from "@/components/lab-administrator/lab-profile-activity-log"
import { OfficeProfileSidebar } from "@/components/office-administrator/office-profile-sidebar"
import OfficeProfileTabs from "@/components/office-administrator/office-profile-tabs"
import {
  DEFAULT_CLOSE_TIME_12,
  DEFAULT_OPEN_TIME_12,
  parseBusinessHourTime,
  resolveDisplayTimezone,
} from "@/utils/time-utils"

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "operating-hours", label: "Operating Hours" },
  { id: "activity-log", label: "Activity Log" },
]

export default function OfficeProfile() {
  const [activeTab, setActiveTab] = useState("overview")
  const { user } = useAuth()
  
  // Add error handling for the context
  try {
    var { fetchCustomerProfile, customerProfile, isProfileLoading, profileError } = useCustomer()
  } catch (error) {
    console.error("CustomerContext not available:", error)
    return <div className="flex items-center justify-center h-64 text-red-500">Context not available</div>
  }

  useEffect(() => {
    // Check if fetchCustomerProfile is available
    if (typeof fetchCustomerProfile !== 'function') {
      console.error("fetchCustomerProfile is not a function")
      return
    }

    // Get customer ID from various sources
    const getCustomerId = (): number | null => {
      if (typeof window === "undefined") return null
      
      // First try to get from localStorage (set during login)
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        return parseInt(storedCustomerId, 10)
      }

      // Then try to get from user's customers array
      if (user?.customers && user.customers.length > 0) {
        return user.customers[0].id
      }

      // If user has a customer_id property
      if (user?.customer_id) {
        return user.customer_id
      }

      return null
    }

    const customerId = getCustomerId()
    
    if (customerId) {
      fetchCustomerProfile(customerId)
    } else {
      console.warn("No customer ID found for profile fetching")
    }
  }, [fetchCustomerProfile, user?.customer_id, user?.customers])

  // Transform customer profile data to match expected format
  const transformedOfficeData = customerProfile ? {
    name: customerProfile.name,
    type: customerProfile.type === "office" ? "Dental Office" : "Office",
    email: customerProfile.email,
    address: `${customerProfile.address}, ${customerProfile.city}, ${customerProfile.country?.name || ''} ${customerProfile.postal_code}`,
    phone: customerProfile.default_admin?.phone || "",
    id: customerProfile.id.toString(),
    number: customerProfile.default_admin?.work_number || "",
    website: customerProfile.website || "",
    contactName: customerProfile.default_admin ? 
      `${customerProfile.default_admin.first_name} ${customerProfile.default_admin.last_name}` : "",
    contactEmail: customerProfile.default_admin?.email || "",
    contactNumber: customerProfile.default_admin?.phone || "",
    joiningDate: new Date(customerProfile.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long", 
      day: "numeric"
    }),
    position: customerProfile.users?.[0]?.role?.name?.replace('_', ' ') || "Office Admin",
    logo_url: customerProfile.logo_url || "",
    unique_code: customerProfile.unique_code || "",
    code: customerProfile.code || "",
    city: customerProfile.city || "",
    postal_code: customerProfile.postal_code || "",
    stateName: customerProfile.state?.name || "",
    stateId: customerProfile.state?.id ?? null,
    countryName: customerProfile.country?.name || "",
    countryId: customerProfile.country?.id ?? null,
  } : null

  // Transform business hours data
  const transformedHoursData = customerProfile?.business_settings?.business_hours ? {
    workingDays: customerProfile.business_settings.business_hours.map(hour => ({
      day: hour.day.charAt(0).toUpperCase() + hour.day.slice(1),
      enabled: hour.is_open,
      startTime: parseBusinessHourTime(hour.open_time, hour.is_open ? DEFAULT_OPEN_TIME_12 : ""),
      endTime: parseBusinessHourTime(hour.close_time, hour.is_open ? DEFAULT_CLOSE_TIME_12 : ""),
    })),
    timezone: resolveDisplayTimezone(customerProfile.state?.name),
    holidays: "All Federal Holidays",
  } : null

  const renderTabContent = () => {
    if (isProfileLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>
    }

    if (profileError) {
      return <div className="flex justify-center items-center h-64 text-red-500">Error: {profileError}</div>
    }

    if (!customerProfile || !transformedOfficeData) {
      return <div className="flex justify-center items-center h-64">No office data found</div>
    }

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab 
            officeData={transformedOfficeData}
            onProfileUpdate={() => {
              // Refresh customer profile after update
              const storedCustomerId = localStorage.getItem("customerId")
              const customerId = storedCustomerId ? parseInt(storedCustomerId, 10) : 
                (user?.customers?.[0]?.id || user?.customer_id || null)
              if (customerId) {
                fetchCustomerProfile(customerId)
              }
            }}
          />
        )
      case "operating-hours":
        return <OperatingHoursTab hoursData={transformedHoursData || {
          workingDays: [],
          timezone: resolveDisplayTimezone(null),
          holidays: "All Federal Holidays"
        }} />
      case "activity-log":
        return <ActivityLogTab customerId={customerProfile.id} />
      default:
        return <OverviewTab officeData={transformedOfficeData} />
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      {transformedOfficeData && (
        <OfficeProfileSidebar officeData={transformedOfficeData} />
      )}
      <div className="flex-1 flex flex-col">
        <OfficeProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-auto bg-gray-50">{renderTabContent()}</div>
      </div>
    </div>
  )
}
