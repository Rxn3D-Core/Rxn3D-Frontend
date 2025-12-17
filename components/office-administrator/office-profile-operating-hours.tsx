"use client"

import { useState } from "react"
import { Edit, Moon } from "lucide-react"
import { Switch } from "@/components/ui/switch"

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
}

export function OperatingHoursTab({ hoursData }: OperatingHoursTabProps) {
  const [workingDays, setWorkingDays] = useState(hoursData.workingDays)

  const toggleDay = (index: number) => {
    const updatedDays = [...workingDays]
    updatedDays[index].enabled = !updatedDays[index].enabled
    setWorkingDays(updatedDays)
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const timeParts = time.split(":")
    if (timeParts.length !== 2) return ""
    
    const [hours, minutes] = timeParts
    if (!hours || !minutes) return ""
    
    const hour = Number.parseInt(hours)
    if (isNaN(hour)) return ""
    
    const ampm = hour >= 12 ? "pm" : "am"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour.toString().padStart(2, "0")}:${minutes.padStart(2, "0")} ${ampm}`
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-6">Office Hours</h3>

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
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-gray-900">{formatTime(day.startTime)}</span>
                      <span className="text-gray-400">——</span>
                      <span className="text-gray-900">{formatTime(day.endTime)}</span>
                      <Edit className="h-4 w-4 text-gray-400 cursor-pointer ml-2" />
                    </div>
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
