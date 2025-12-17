const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface BusinessHour {
  day: string
  is_open: boolean
  open_time?: string | null
  close_time?: string | null
}

export interface CaseSchedule {
  default_pickup_time: string
  default_delivery_time: string
  enable_rush_cases?: boolean
  rush_type?: "fixed" | "flexible"
  fixed_turnaround_days?: number
  fixed_rush_fee_percentage?: string
}

export interface BusinessSettingsUpdate {
  customer_id: number
  customer_type: "lab" | "office"
  business_hours?: BusinessHour[]
  case_schedule?: Partial<CaseSchedule>
}

export interface PartialBusinessSettingsUpdate {
  customer_id: number
  customer_type: "lab" | "office"
  business_hours?: Partial<BusinessHour>[]
  case_schedule?: Partial<CaseSchedule>
}

/**
 * Get business settings (business hours and case schedule)
 */
export async function getBusinessSettings(customerId: number): Promise<any> {
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  if (!token) {
    throw new Error("Authentication token not found")
  }

  const response = await fetch(`${API_BASE_URL}/business-settings?customer_id=${customerId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (response.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to get business settings: ${response.status}`)
  }

  const result = await response.json()
  return result
}

/**
 * Update business settings (business hours and case schedule)
 * This function merges current settings with updates and sends only what's needed
 */
export async function updateBusinessSettings(data: PartialBusinessSettingsUpdate): Promise<any> {
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  if (!token) {
    throw new Error("Authentication token not found")
  }

  // Get current settings to merge with updates
  const currentSettings = await getBusinessSettings(data.customer_id)
  
  // Prepare the full update payload
  const updatePayload: BusinessSettingsUpdate = {
    customer_id: data.customer_id,
    customer_type: data.customer_type,
  }

  // Merge business hours: use provided updates or current settings
  if (data.business_hours) {
    // If business_hours provided, use them (must be complete array)
    // Ensure proper format: only include times when is_open is true
    updatePayload.business_hours = (data.business_hours as BusinessHour[]).map((hour) => {
      const result: any = {
        day: hour.day,
        is_open: hour.is_open,
      }
      
      // Only include open_time and close_time if day is open (REQUIRED by backend when is_open is true)
      if (hour.is_open) {
        // Times are REQUIRED when is_open is true - must be in H:i format (HH:mm)
        const openTime = hour.open_time ? convertTo24Hour(String(hour.open_time)) : "09:00"
        const closeTime = hour.close_time ? convertTo24Hour(String(hour.close_time)) : "17:00"
        
        // Ensure times are in correct format (HH:mm) - backend validation requires this
        result.open_time = (openTime && openTime.length === 5 && /^\d{2}:\d{2}$/.test(openTime)) ? openTime : "09:00"
        result.close_time = (closeTime && closeTime.length === 5 && /^\d{2}:\d{2}$/.test(closeTime)) ? closeTime : "17:00"
      }
      // If day is closed (is_open = false), don't include open_time/close_time at all
      // Backend validation: required_if:is_open,true means they're only required when true
      
      return result
    })
  } else {
    // Use current business hours
    updatePayload.business_hours = (currentSettings.business_hours || []).map((hour: any) => {
      const result: any = {
        day: hour.day,
        is_open: hour.is_open,
      }
      
      // Only include times when day is open (REQUIRED by backend when is_open is true)
      if (hour.is_open) {
        // Times are REQUIRED when is_open is true - must be in H:i format (HH:mm)
        const openTime = hour.open_time ? convertTo24Hour(String(hour.open_time)) : "09:00"
        const closeTime = hour.close_time ? convertTo24Hour(String(hour.close_time)) : "17:00"
        
        // Ensure times are in correct format (HH:mm) - backend validation requires this
        result.open_time = (openTime && openTime.length === 5 && /^\d{2}:\d{2}$/.test(openTime)) ? openTime : "09:00"
        result.close_time = (closeTime && closeTime.length === 5 && /^\d{2}:\d{2}$/.test(closeTime)) ? closeTime : "17:00"
      }
      // If day is closed (is_open = false), don't include open_time/close_time at all
      
      return result
    })
  }

  // Merge case schedule: use provided updates or current settings
  if (data.customer_type === "lab") {
    const currentCaseSchedule = currentSettings.case_schedule || {}
    
    // Get pickup time - convert if provided, otherwise use current or default
    let defaultPickupTime = "09:00"
    if (data.case_schedule?.default_pickup_time) {
      const converted = convertTo24Hour(String(data.case_schedule.default_pickup_time))
      if (converted && converted.length === 5) {
        defaultPickupTime = converted
      }
    } else if (currentCaseSchedule.default_pickup_time) {
      const converted = convertTo24Hour(String(currentCaseSchedule.default_pickup_time))
      if (converted && converted.length === 5) {
        defaultPickupTime = converted
      }
    }
    
    // Get delivery time - convert if provided, otherwise use current or default
    let defaultDeliveryTime = "17:00"
    if (data.case_schedule?.default_delivery_time) {
      const converted = convertTo24Hour(String(data.case_schedule.default_delivery_time))
      if (converted && converted.length === 5) {
        defaultDeliveryTime = converted
      }
    } else if (currentCaseSchedule.default_delivery_time) {
      const converted = convertTo24Hour(String(currentCaseSchedule.default_delivery_time))
      if (converted && converted.length === 5) {
        defaultDeliveryTime = converted
      }
    }
    
    updatePayload.case_schedule = {
      default_pickup_time: defaultPickupTime,
      default_delivery_time: defaultDeliveryTime,
      enable_rush_cases: data.case_schedule?.enable_rush_cases !== undefined 
        ? data.case_schedule.enable_rush_cases 
        : (currentCaseSchedule.enable_rush_cases ?? false),
      rush_type: data.case_schedule?.rush_type !== undefined 
        ? data.case_schedule.rush_type 
        : currentCaseSchedule.rush_type,
      fixed_turnaround_days: data.case_schedule?.fixed_turnaround_days !== undefined 
        ? data.case_schedule.fixed_turnaround_days 
        : currentCaseSchedule.fixed_turnaround_days,
      fixed_rush_fee_percentage: data.case_schedule?.fixed_rush_fee_percentage !== undefined 
        ? data.case_schedule.fixed_rush_fee_percentage 
        : currentCaseSchedule.fixed_rush_fee_percentage,
    }
  }

  const response = await fetch(`${API_BASE_URL}/business-settings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatePayload),
  })

  if (response.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update business settings: ${response.status}`)
  }

  const result = await response.json()
  return result.data || result
}

/**
 * Convert time from 12-hour format (e.g., "09:00 AM") to 24-hour format (e.g., "09:00")
 * Also handles 24-hour format and time strings with seconds
 */
export function convertTo24Hour(time: string): string {
  if (!time) return ""
  
  // If already in correct 24-hour format (HH:mm), return as is
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time
  }

  // If in 24-hour format with seconds (HH:mm:ss), strip seconds
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time.substring(0, 5) // Return "HH:mm" part
  }

  // Parse 12-hour format (e.g., "09:00 AM" or "5:30 PM")
  const match = time.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
  if (!match) return ""

  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = match[3]?.toUpperCase()

  // If AM/PM is specified, convert
  if (ampm) {
    if (ampm === "PM" && hours !== 12) {
      hours += 12
    } else if (ampm === "AM" && hours === 12) {
      hours = 0
    }
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`
}

/**
 * Convert time from 24-hour format (e.g., "09:00") to 12-hour format (e.g., "09:00 AM")
 */
export function convertTo12Hour(time: string): string {
  if (!time) return ""
  
  // If already in 12-hour format, return as is
  if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(time)) {
    return time
  }

  // Parse 24-hour format (e.g., "09:00" or "09:00:00")
  const match = time.match(/(\d{2}):(\d{2})/)
  if (!match) return ""

  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = hours >= 12 ? "PM" : "AM"

  if (hours === 0) {
    hours = 12
  } else if (hours > 12) {
    hours -= 12
  }

  return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`
}

