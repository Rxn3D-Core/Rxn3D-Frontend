"use client"

import { useState, useEffect } from "react"
import { useCustomer } from "@/contexts/customer-context"
import { useAuth } from "@/contexts/auth-context"
import OverviewTab from "@/components/lab-administrator/lab-profile-overview"
import { OperatingHoursTab } from "@/components/lab-administrator/lab-profile-operating-hours"
import { PickupDeliveryTab } from "@/components/lab-administrator/lab-profile-pickup-delivery"
import ActivityLogTab from "@/components/lab-administrator/lab-profile-activity-log"
import { LabProfileSidebar } from "@/components/lab-administrator/lab-profile-sidebar"
import LabProfileTabs from "@/components/lab-administrator/lab-profile-tabs"

// Sample activities data - this would need to come from a separate API
const activities = [
  {
    id: "1",
    user: "James Cagney",
    action: "Changed Location",
    target: "Case #50029385",
    details: '"On route to lab" → To: "In lab"',
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
  {
    id: "4",
    user: "James Cagney",
    action: "Invited Office",
    target: "Sunrise Modern Dentistry",
    details: "Email: dr.rivera@sunrisemoderm.com",
    timestamp: "2024-01-26, 10:42 PM",
  },
  {
    id: "5",
    user: "James Cagney",
    action: "Uploaded File",
    target: "Case #50029388",
    details: "File: lowerarch.stl",
    timestamp: "2024-01-26, 6:08 PM",
  },
]

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "operating-hours", label: "Operating Hours" },
  { id: "pickup-delivery", label: "Pick up & Delivery" },
  { id: "activity-log", label: "Activity Log" },
]

export default function LabProfile() {
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

  // Transform API data to component format
  const transformedData = customerProfile ? {
    labData: {
      name: customerProfile.name,
      type: customerProfile.type === "lab" ? "Dental Lab" : "Office",
      email: customerProfile.email,
      address: (() => {
        // Clean postal_code to remove country name if present
        let postalCode = customerProfile.postal_code || ''
        if (customerProfile.country?.name && postalCode.includes(customerProfile.country.name)) {
          postalCode = postalCode.replace(customerProfile.country.name, '').trim()
        }
        // Build address string
        const parts = [
          customerProfile.address,
          customerProfile.city,
          customerProfile.country?.name || '',
          postalCode
        ].filter(Boolean)
        return parts.join(', ')
      })(),
        stateName: customerProfile.state?.name || "",
        stateId: customerProfile.state?.id ?? null,
        countryName: customerProfile.country?.name || "",
        countryId: customerProfile.country?.id ?? null,
      phone: customerProfile.default_admin?.phone || "",
      id: customerProfile.id.toString(),
      number: customerProfile.default_admin?.work_number || "",
      website: customerProfile.website || "",
      contactName: customerProfile.default_admin ? `${customerProfile.default_admin.first_name} ${customerProfile.default_admin.last_name}` : "",
      contactEmail: customerProfile.default_admin?.email || "",
      contactNumber: customerProfile.default_admin?.phone || "",
      joiningDate: new Date(customerProfile.created_at).toLocaleDateString("en-US", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      position: customerProfile.users?.[0]?.role?.name?.replace('_', ' ') || "Lab Admin",
      logo_url: customerProfile.logo_url || "",
      release_casepan: customerProfile.release_casepan || "",
    },
    hoursData: {
      workingDays: customerProfile.business_settings?.business_hours?.map(hour => ({
        day: hour.day.charAt(0).toUpperCase() + hour.day.slice(1),
        enabled: hour.is_open,
        startTime: hour.open_time 
          ? new Date(hour.open_time).toString() !== "Invalid Date"
            ? new Date(hour.open_time).toLocaleTimeString("en-US", { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })
            : ""
          : "",
        endTime: hour.close_time 
          ? new Date(hour.close_time).toString() !== "Invalid Date"
            ? new Date(hour.close_time).toLocaleTimeString("en-US", { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })
            : ""
          : "",
      })) || [],
      timezone: customerProfile.state?.name || "Unknown Timezone",
      holidays: "All Federal Holidays",
    },
    pickupData: {
      serviceArea: `${customerProfile.city}, ${customerProfile.state?.name || ''} ${customerProfile.country?.name || ''}`,
      pickupDays: "Lab hours",
      cutOffTime: customerProfile.business_settings?.case_schedule && customerProfile.business_settings.case_schedule.default_pickup_time
        ? new Date(customerProfile.business_settings.case_schedule.default_pickup_time).toString() !== "Invalid Date"
          ? new Date(customerProfile.business_settings.case_schedule.default_pickup_time).toLocaleTimeString("en-US", { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })
          : ""
        : "10:30 am",
      frequency: "Daily",
      window: "10:00 am - 2:00 pm",
    },
    deliveryData: {
      serviceArea: `${customerProfile.city}, ${customerProfile.state?.name || ''} ${customerProfile.country?.name || ''}`,
      deliveryDays: "Lab hours",
      defaultTime: customerProfile.business_settings?.case_schedule && customerProfile.business_settings.case_schedule.default_delivery_time
        ? new Date(customerProfile.business_settings.case_schedule.default_delivery_time).toString() !== "Invalid Date"
          ? new Date(customerProfile.business_settings.case_schedule.default_delivery_time).toLocaleTimeString("en-US", { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })
          : ""
        : "4:00 pm",
      window: "3:00 pm - 6:00 pm",
    },
    rushSettings: {
      enabled: customerProfile.business_settings?.case_schedule?.enable_rush_cases || false,
      description: "Allow users to request expedited processing.",
      rush_type: customerProfile.business_settings?.case_schedule?.rush_type as "fixed" | "flexible" | undefined,
      fixed_turnaround_days: customerProfile.business_settings?.case_schedule?.fixed_turnaround_days,
      fixed_rush_fee_percentage: customerProfile.business_settings?.case_schedule?.fixed_rush_fee_percentage,
    },
  } : null

  const renderTabContent = () => {
    if (isProfileLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex space-x-1.5">
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
            ></div>
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
              style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}
            ></div>
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
              style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}
            ></div>
          </div>
        </div>
      )
    }

    if (profileError) {
      return <div className="flex items-center justify-center h-64 text-red-500">Error: {profileError}</div>
    }

    if (!transformedData) {
      return <div className="flex items-center justify-center h-64">No data available</div>
    }

    // Get customer ID helper function
    const getCustomerId = (): number | null => {
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        return parseInt(storedCustomerId, 10)
      }
      if (user?.customers && user.customers.length > 0) {
        return user.customers[0].id
      }
      if (user?.customer_id) {
        return user.customer_id
      }
      return null
    }

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab 
            labData={transformedData.labData}
            onProfileUpdate={() => {
              // Refresh customer profile after update
              const customerId = getCustomerId()
              if (customerId) {
                fetchCustomerProfile(customerId)
              }
            }}
          />
        )
      case "operating-hours":
        return (
          <OperatingHoursTab 
            hoursData={transformedData.hoursData}
            customerId={getCustomerId()}
            customerType={customerProfile?.type as "lab" | "office"}
            onUpdate={() => {
              const customerId = getCustomerId()
              if (customerId) {
                fetchCustomerProfile(customerId)
              }
            }}
          />
        )
      case "pickup-delivery":
        return (
          <PickupDeliveryTab 
            pickupData={transformedData.pickupData} 
            deliveryData={transformedData.deliveryData} 
            rushSettings={transformedData.rushSettings}
            customerId={getCustomerId()}
            onUpdate={() => {
              const customerId = getCustomerId()
              if (customerId) {
                fetchCustomerProfile(customerId)
              }
            }}
          />
        )
      case "activity-log":
        return <ActivityLogTab activities={activities} />
      default:
        return <OverviewTab labData={transformedData.labData} />
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      {transformedData && <LabProfileSidebar labData={transformedData.labData} />}
      <div className="flex-1 flex flex-col">
        <LabProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-auto bg-gray-50">{renderTabContent()}</div>
      </div>
    </div>
  )
}
