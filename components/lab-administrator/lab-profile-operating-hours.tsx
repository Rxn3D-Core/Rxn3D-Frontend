"use client"

import { useState, useEffect } from "react"
import { Moon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { updateBusinessSettings, convertTo24Hour, convertTo12Hour } from "@/lib/api-business-settings"
import { useAuth } from "@/contexts/auth-context"
import { TimePicker } from "@/components/onboarding/time-picker"
import { getActiveCustomerId } from "@/lib/customer-scope"
import {
  DEFAULT_CLOSE_TIME_12,
  DEFAULT_OPEN_TIME_12,
  parseBusinessHourTime,
  resolveDisplayTimezone,
} from "@/utils/time-utils"

interface OperatingHoursTabProps {
  hoursData: {
    workingDays: Array<{
      day: string
      enabled: boolean
      startTime: string
      endTime: string
    }>
    timezone: string
    holidays: string
  }
  customerId?: number
  customerType?: "lab" | "office"
  onUpdate?: () => void
}

const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const

function withHourDefaults(days: OperatingHoursTabProps["hoursData"]["workingDays"]) {
  return days.map((day) => ({
    ...day,
    startTime: day.enabled
      ? parseBusinessHourTime(day.startTime, DEFAULT_OPEN_TIME_12) || DEFAULT_OPEN_TIME_12
      : day.startTime,
    endTime: day.enabled
      ? parseBusinessHourTime(day.endTime, DEFAULT_CLOSE_TIME_12) || DEFAULT_CLOSE_TIME_12
      : day.endTime,
  }))
}

function defaultWeek(): OperatingHoursTabProps["hoursData"]["workingDays"] {
  return WEEKDAY_ORDER.map((day) => {
    const isWeekday = day !== "Saturday" && day !== "Sunday"
    return {
      day,
      enabled: isWeekday,
      startTime: isWeekday ? DEFAULT_OPEN_TIME_12 : "",
      endTime: isWeekday ? DEFAULT_CLOSE_TIME_12 : "",
    }
  })
}

export function OperatingHoursTab({ hoursData, customerId, customerType = "lab", onUpdate }: OperatingHoursTabProps) {
  const [workingDays, setWorkingDays] = useState(() =>
    withHourDefaults(hoursData.workingDays.length ? hoursData.workingDays : defaultWeek())
  )
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const timezoneLabel = resolveDisplayTimezone(hoursData.timezone)

  const resolveCustomerId = (): number | null => {
    if (customerId) return customerId
    const stored = getActiveCustomerId()
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (Number.isFinite(parsed)) return parsed
    }
    if (user?.customers && user.customers.length > 0) {
      return user.customers[0].id
    }
    if (user?.customer_id) {
      return user.customer_id
    }
    return null
  }

  useEffect(() => {
    setWorkingDays(withHourDefaults(hoursData.workingDays.length ? hoursData.workingDays : defaultWeek()))
  }, [hoursData])

  const toggleDay = async (index: number) => {
    const updatedDays = [...workingDays]
    const turningOn = !updatedDays[index].enabled
    updatedDays[index].enabled = turningOn

    if (!turningOn) {
      updatedDays[index].startTime = ""
      updatedDays[index].endTime = ""
    } else {
      updatedDays[index].startTime = parseBusinessHourTime(updatedDays[index].startTime, DEFAULT_OPEN_TIME_12) || DEFAULT_OPEN_TIME_12
      updatedDays[index].endTime = parseBusinessHourTime(updatedDays[index].endTime, DEFAULT_CLOSE_TIME_12) || DEFAULT_CLOSE_TIME_12
    }

    setWorkingDays(updatedDays)
    await saveBusinessHours(updatedDays)
  }

  const handleTimeChange = async (index: number, field: "startTime" | "endTime", value: string) => {
    const fallback = field === "startTime" ? DEFAULT_OPEN_TIME_12 : DEFAULT_CLOSE_TIME_12
    const nextValue = value.trim() ? convertTo12Hour(convertTo24Hour(value) || fallback) || fallback : fallback
    const updatedDays = [...workingDays]
    updatedDays[index] = { ...updatedDays[index], [field]: nextValue, enabled: true }
    setWorkingDays(updatedDays)
    await saveBusinessHours(updatedDays)
  }

  const applyToOpenDays = async (sourceIndex: number) => {
    const source = workingDays[sourceIndex]
    const startTime = parseBusinessHourTime(source.startTime, DEFAULT_OPEN_TIME_12) || DEFAULT_OPEN_TIME_12
    const endTime = parseBusinessHourTime(source.endTime, DEFAULT_CLOSE_TIME_12) || DEFAULT_CLOSE_TIME_12
    const updatedDays = workingDays.map((day) =>
      day.enabled ? { ...day, startTime, endTime } : day
    )
    setWorkingDays(updatedDays)
    await saveBusinessHours(updatedDays)
  }

  const saveBusinessHours = async (daysToSave: typeof workingDays) => {
    const cId = resolveCustomerId()
    if (!cId) {
      toast({
        title: "Error",
        description: "Customer ID not found",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const dayMap: { [key: string]: string } = {
        Monday: "monday",
        Tuesday: "tuesday",
        Wednesday: "wednesday",
        Thursday: "thursday",
        Friday: "friday",
        Saturday: "saturday",
        Sunday: "sunday",
      }

      const businessHours = daysToSave.map((day) => {
        const result: { day: string; is_open: boolean; open_time?: string; close_time?: string } = {
          day: dayMap[day.day] || day.day.toLowerCase(),
          is_open: day.enabled,
        }

        if (day.enabled) {
          const startTime = day.startTime || DEFAULT_OPEN_TIME_12
          const endTime = day.endTime || DEFAULT_CLOSE_TIME_12
          const openTime = convertTo24Hour(startTime)
          const closeTime = convertTo24Hour(endTime)
          result.open_time = openTime && openTime.length === 5 ? openTime : "09:00"
          result.close_time = closeTime && closeTime.length === 5 ? closeTime : "17:00"
        }

        return result
      })

      await updateBusinessSettings({
        customer_id: cId,
        customer_type: customerType,
        business_hours: businessHours,
      })

      toast({
        title: "Success",
        description: "Business hours updated successfully",
      })

      onUpdate?.()
    } catch (error: unknown) {
      console.error("Error updating business hours:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update business hours",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold">
              {customerType === "office" ? "Office Hours" : "Lab Hours"}
            </h3>
            <p className="text-sm text-gray-500">Open days default to 9:00 AM – 5:00 PM until you change them.</p>
          </div>

          <div className="space-y-4">
            {workingDays.map((day, index) => (
              <div key={day.day} className="flex items-center justify-between py-2 gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={() => toggleDay(index)}
                    disabled={isSaving}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <span className="font-medium text-gray-900 w-24 shrink-0">{day.day}</span>

                  {day.enabled ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                      <span className="text-xs text-gray-500">From</span>
                      <TimePicker
                        value={day.startTime || DEFAULT_OPEN_TIME_12}
                        onChange={(value) => handleTimeChange(index, "startTime", value)}
                        className="w-36 h-9"
                      />
                      <span className="text-xs text-gray-500">To</span>
                      <TimePicker
                        value={day.endTime || DEFAULT_CLOSE_TIME_12}
                        onChange={(value) => handleTimeChange(index, "endTime", value)}
                        className="w-36 h-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => applyToOpenDays(index)}
                        className="text-xs text-[#1162a8] hover:text-[#1162a8] h-8 px-2"
                      >
                        Apply to open days
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                      <Moon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400 text-sm">Closed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t space-y-3">
            <div className="flex items-center">
              <span className="text-gray-500 w-24">Time zone:</span>
              <span className="font-medium text-gray-900">{timezoneLabel}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 w-24">Holidays:</span>
              <span className="font-medium text-gray-900">{hoursData.holidays || "All Federal Holidays"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
