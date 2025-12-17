"use client"

import { useState, useEffect } from "react"
import { Edit, Moon, Save, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { updateBusinessSettings, convertTo24Hour, convertTo12Hour } from "@/lib/api-business-settings"
import { useAuth } from "@/contexts/auth-context"

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

export function OperatingHoursTab({ hoursData, customerId, customerType = "lab", onUpdate }: OperatingHoursTabProps) {
  const [workingDays, setWorkingDays] = useState(hoursData.workingDays)
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Get customer ID if not provided
  const getCustomerId = (): number | null => {
    if (customerId) return customerId
    
    if (typeof window !== "undefined") {
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        return parseInt(storedCustomerId, 10)
      }
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
    setWorkingDays(hoursData.workingDays)
  }, [hoursData])

  const toggleDay = async (index: number) => {
    const updatedDays = [...workingDays]
    const wasEnabled = updatedDays[index].enabled
    updatedDays[index].enabled = !updatedDays[index].enabled
    
    // If disabling, clear times
    if (!updatedDays[index].enabled) {
      updatedDays[index].startTime = ""
      updatedDays[index].endTime = ""
    } else if (!wasEnabled && updatedDays[index].enabled) {
      // If enabling and no times set, set default times
      if (!updatedDays[index].startTime) {
        updatedDays[index].startTime = "09:00 AM"
      }
      if (!updatedDays[index].endTime) {
        updatedDays[index].endTime = "05:00 PM"
      }
    }
    
    setWorkingDays(updatedDays)
    
    // Auto-save on toggle
    await saveBusinessHours(updatedDays)
  }

  const handleEditClick = (index: number) => {
    const day = workingDays[index]
    setEditingDayIndex(index)
    // Convert to 24-hour format for time input (HH:mm)
    setEditStartTime(convertTo24Hour(day.startTime))
    setEditEndTime(convertTo24Hour(day.endTime))
  }

  const handleSaveTime = async () => {
    if (editingDayIndex === null) return

    const updatedDays = [...workingDays]
    updatedDays[editingDayIndex].startTime = convertTo12Hour(editStartTime)
    updatedDays[editingDayIndex].endTime = convertTo12Hour(editEndTime)
    updatedDays[editingDayIndex].enabled = true

    setWorkingDays(updatedDays)
    setEditingDayIndex(null)
    
    await saveBusinessHours(updatedDays)
  }

  const handleCancelEdit = () => {
    setEditingDayIndex(null)
    setEditStartTime("")
    setEditEndTime("")
  }

  const saveBusinessHours = async (daysToSave: typeof workingDays) => {
    const cId = getCustomerId()
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
      // Map days to API format
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
        const result: any = {
          day: dayMap[day.day] || day.day.toLowerCase(),
          is_open: day.enabled,
        }
        
        // If day is open, open_time and close_time are REQUIRED
        if (day.enabled) {
          // Use provided times or default times
          const startTime = day.startTime || "09:00 AM"
          const endTime = day.endTime || "05:00 PM"
          
          const openTime = convertTo24Hour(startTime)
          const closeTime = convertTo24Hour(endTime)
          
          // Ensure times are valid (HH:mm format)
          if (openTime && openTime.length === 5) {
            result.open_time = openTime
          } else {
            result.open_time = "09:00" // Default fallback
          }
          
          if (closeTime && closeTime.length === 5) {
            result.close_time = closeTime
          } else {
            result.close_time = "17:00" // Default fallback
          }
        }
        // If day is closed, don't include open_time/close_time (they'll be null in backend)
        
        return result
      })

      // Only pass business_hours update, case_schedule will be merged from current settings
      await updateBusinessSettings({
        customer_id: cId,
        customer_type: customerType,
        business_hours: businessHours,
      })

      toast({
        title: "Success",
        description: "Business hours updated successfully",
      })

      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error("Error updating business hours:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update business hours",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "pm" : "am"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour.toString().padStart(2, "0")}:${minutes.padStart(2, "0")} ${ampm}`
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-6">Lab Hours</h3>

          <div className="space-y-4">
            {workingDays.map((day, index) => (
              <div key={day.day} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-4 flex-1">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={() => toggleDay(index)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <span className="font-medium text-gray-900 w-24">{day.day}</span>

                  {day.enabled ? (
                    editingDayIndex === index ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="w-32 h-8"
                          disabled={isSaving}
                        />
                        <span className="text-gray-400">——</span>
                        <Input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-32 h-8"
                          disabled={isSaving}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveTime}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <Save className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-gray-900">{formatTime(day.startTime)}</span>
                        <span className="text-gray-400">——</span>
                        <span className="text-gray-900">{formatTime(day.endTime)}</span>
                        <Edit
                          className="h-4 w-4 text-gray-400 cursor-pointer ml-2 hover:text-blue-600"
                          onClick={() => handleEditClick(index)}
                        />
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md flex-1 max-w-32">
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
              <span className="font-medium text-gray-900">{hoursData.timezone}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 w-24">Holidays:</span>
              <span className="font-medium text-gray-900">{hoursData.holidays}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
