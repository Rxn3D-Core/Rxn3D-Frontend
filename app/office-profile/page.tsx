"use client"

import { useState, useEffect } from "react"
import { useCustomer } from "@/contexts/customer-context"
import { useAuth } from "@/contexts/auth-context"
import OverviewTab from "@/components/office-administrator/office-profile-overview"
import { OperatingHoursTab } from "@/components/office-administrator/office-profile-operating-hours"
import ActivityLogTab from "@/components/office-administrator/office-profile-activity-log"
import { OfficeProfileSidebar } from "@/components/office-administrator/office-profile-sidebar"
import OfficeProfileTabs from "@/components/office-administrator/office-profile-tabs"

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "operating-hours", label: "Operating Hours" },
  { id: "activity-log", label: "Activity Log" },
]

// Mock activities data (replace with real API call when available)
const activities = [
  {
    id: "1",
    user: "James Cagney",
    action: "Changed Location",
    target: "Case #50029385",
    details: '"On route to office" → To: "In office"',
    timestamp: "2024-01-27, 11:42 AM",
  },
  {
    id: "2",
    user: "James Cagney",
    action: "Updated Setting",
    target: "Auto-Billing",
    details: "Enabled for Full Denture Acrylic",
    timestamp: "2024-01-27, 10:26 AM",
  },
  {
    id: "3",
    user: "System",
    action: "Invoice Generated",
    target: "Case #50029392",
    details: "Total: $295.00 - Sent to: office@abc.com",
    timestamp: "2024-01-27, 8:19 AM",
  },
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
  } : null

  // Transform business hours data
  const transformedHoursData = customerProfile?.business_settings?.business_hours ? {
    workingDays: customerProfile.business_settings.business_hours.map(hour => ({
      day: hour.day.charAt(0).toUpperCase() + hour.day.slice(1),
      enabled: hour.is_open,
      startTime: hour.open_time ? new Date(hour.open_time).toLocaleTimeString("en-US", { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }) : "",
      endTime: hour.close_time ? new Date(hour.close_time).toLocaleTimeString("en-US", { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }) : "",
    })),
    timezone: customerProfile.state?.name || "Unknown Timezone",
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
        return <OverviewTab officeData={transformedOfficeData} />
      case "operating-hours":
        return <OperatingHoursTab hoursData={transformedHoursData || {
          workingDays: [],
          timezone: "Unknown Timezone",
          holidays: "All Federal Holidays"
        }} />
      case "activity-log":
        return <ActivityLogTab activities={activities} />
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
