"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type {
  BusinessHour,
  BusinessSettingsPayload,
  BusinessSettingsResponse,
  CaseScheduleSettings,
  CaseSchedulePayload,
} from "@/types/business-settings"
import { convertTo24Hour } from "@/utils/time-utils"
import { OnboardingApiService } from "@/lib/api-onboarding"

interface BusinessSettingsContextType {
  // State
  workingDays: Record<string, boolean>
  businessHours: Record<string, { fromTime: string; toTime: string }>
  caseSchedule: CaseScheduleSettings
  isLoading: boolean
  error: string | null

  // Actions
  setWorkingDay: (day: string, enabled: boolean) => void
  setBusinessHour: (day: string, fromTime: string, toTime: string) => void
  setCaseSchedule: (settings: Partial<CaseScheduleSettings>) => void
  submitBusinessSettings: (customerId: number, customerType: string) => Promise<BusinessSettingsResponse | null>
  resetError: () => void
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | undefined>(undefined)

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext)
  if (context === undefined) {
    throw new Error("useBusinessSettings must be used within a BusinessSettingsProvider")
  }
  return context
}

interface BusinessSettingsProviderProps {
  children: ReactNode
}

export function BusinessSettingsProvider({ children }: BusinessSettingsProviderProps) {
  const [workingDays, setWorkingDaysState] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  })

  // Store times in 24-hour format
  const [businessHours, setBusinessHoursState] = useState<Record<string, { fromTime: string; toTime: string }>>({
    monday: { fromTime: "08:00", toTime: "16:00" },
    tuesday: { fromTime: "08:00", toTime: "16:00" },
    wednesday: { fromTime: "08:00", toTime: "16:00" },
    thursday: { fromTime: "08:00", toTime: "16:00" },
    friday: { fromTime: "08:00", toTime: "16:00" },
    saturday: { fromTime: "08:00", toTime: "16:00" },
    sunday: { fromTime: "08:00", toTime: "16:00" },
  })

  // Store times in 24-hour format
  const [caseSchedule, setCaseScheduleState] = useState<CaseScheduleSettings>({
    defaultPickupTime: "10:30",
    defaultDeliveryTime: "16:00",
    enableRush: false,
    turnaroundType: "fixed",
    rushFeeType: "fixed",
    fixedTurnaroundDays: 3,
    fixedRushFeePercent: 50,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setWorkingDay = useCallback((day: string, enabled: boolean) => {
    setWorkingDaysState((prev) => ({
      ...prev,
      [day]: enabled,
    }))
  }, [])

  // Convert incoming 12-hour times to 24-hour format before storing
  const setBusinessHour = useCallback((day: string, fromTime12h: string, toTime12h: string) => {
    
    const fromTime24h = convertTo24Hour(fromTime12h)
    const toTime24h = convertTo24Hour(toTime12h)
    setBusinessHoursState((prev) => ({
      ...prev,
      [day]: { fromTime: fromTime24h, toTime: toTime24h },
    }))
  }, [])

  // Convert incoming 12-hour times to 24-hour format before storing
  const setCaseSchedule = useCallback((settings: Partial<CaseScheduleSettings>) => {
    setCaseScheduleState((prev) => {
      const newSettings = { ...prev, ...settings }
      
      // Convert time fields to 24-hour format if they're provided
      if (settings.defaultPickupTime) {
        newSettings.defaultPickupTime = convertTo24Hour(settings.defaultPickupTime)
      }
      if (settings.defaultDeliveryTime) {
        newSettings.defaultDeliveryTime = convertTo24Hour(settings.defaultDeliveryTime)
      }
      
      return newSettings
    })
  }, [])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  const submitBusinessSettings = useCallback(
    async (customerId: number, customerType: string): Promise<BusinessSettingsResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        // Business hours are already in 24-hour format, no conversion needed
        const businessHoursArray: BusinessHour[] = Object.entries(workingDays).map(([day, isOpen]) => {
          const dayHours = businessHours[day]

          if (isOpen && dayHours) {
            return {
              day,
              is_open: true,
              open_time: dayHours.fromTime, // Already in 24-hour format
              close_time: dayHours.toTime, // Already in 24-hour format
            }
          } else {
            return {
              day,
              is_open: false,
            }
          }
        })

        const payload: BusinessSettingsPayload = {
          customer_id: customerId,
          customer_type: customerType,
          business_hours: businessHoursArray,
        }

        // Only include case_schedule if customer_type is "Lab" (case-sensitive check)
        if (customerType.toLowerCase() === "lab") {
          const caseSchedulePayload: CaseSchedulePayload = {
            default_pickup_time: caseSchedule.defaultPickupTime, // Already in 24-hour format
            default_delivery_time: caseSchedule.defaultDeliveryTime, // Already in 24-hour format
            enable_rush_cases: caseSchedule.enableRush,
            rush_type: caseSchedule.turnaroundType,
          }

          if (caseSchedule.turnaroundType === "fixed") {
            caseSchedulePayload.fixed_turnaround_days = caseSchedule.fixedTurnaroundDays
            caseSchedulePayload.fixed_rush_fee_percentage = caseSchedule.fixedRushFeePercent
          }

          payload.case_schedule = caseSchedulePayload
        }

       

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/business-settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("library_token") || ""}`
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: BusinessSettingsResponse = await response.json()
        
        // Mark business hours setup as completed
        try {
          await OnboardingApiService.markBusinessHoursSetupCompleted(customerId)
        } catch (onboardingError) {
          console.error('Error marking business hours as complete:', onboardingError)
          // Don't fail the entire operation if this fails
        }
        
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred while saving business settings"
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [workingDays, businessHours, caseSchedule],
  )

  const value: BusinessSettingsContextType = {
    workingDays,
    businessHours,
    caseSchedule,
    isLoading,
    error,
    setWorkingDay,
    setBusinessHour,
    setCaseSchedule,
    submitBusinessSettings,
    resetError,
  }

  return <BusinessSettingsContext.Provider value={value}>{children}</BusinessSettingsContext.Provider>
}
