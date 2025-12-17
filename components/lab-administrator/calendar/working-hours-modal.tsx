"use client"

import { useState } from "react"
import { X, Moon, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"

interface WorkingDay {
  day: string
  enabled: boolean
  startTime: string
  endTime: string
}

interface WorkingHoursModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkingHoursModal({ open, onOpenChange }: WorkingHoursModalProps) {
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([
    { day: "Monday", enabled: true, startTime: "08:00", endTime: "17:00" },
    { day: "Tuesday", enabled: true, startTime: "08:00", endTime: "17:00" },
    { day: "Wednesday", enabled: true, startTime: "08:00", endTime: "17:00" },
    { day: "Thursday", enabled: true, startTime: "08:00", endTime: "17:00" },
    { day: "Friday", enabled: true, startTime: "08:00", endTime: "17:00" },
    { day: "Saturday", enabled: false, startTime: "", endTime: "" },
    { day: "Sunday", enabled: false, startTime: "", endTime: "" },
  ])

  const toggleDay = (index: number) => {
    const updatedDays = [...workingDays]
    updatedDays[index].enabled = !updatedDays[index].enabled
    setWorkingDays(updatedDays)
  }

  const updateTime = (index: number, field: "startTime" | "endTime", value: string) => {
    const updatedDays = [...workingDays]
    updatedDays[index][field] = value
    setWorkingDays(updatedDays)
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "pm" : "am"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour.toString().padStart(2, "0")} : ${minutes} ${ampm}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 p-0 h-6 w-6"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {workingDays.map((item, index) => (
            <div key={item.day} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Switch
                  checked={item.enabled}
                  onCheckedChange={() => toggleDay(index)}
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className="font-medium text-lg w-24">{item.day}</span>
              </div>

              {item.enabled ? (
                <div className="flex items-center gap-4">
                  <Input
                    type="time"
                    value={item.startTime}
                    onChange={(e) => updateTime(index, "startTime", e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-gray-400 text-lg">——</span>
                  <Input
                    type="time"
                    value={item.endTime}
                    onChange={(e) => updateTime(index, "endTime", e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <Edit className="h-4 w-4 text-gray-400 cursor-pointer" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <Moon className="h-5 w-5" />
                  <span className="text-lg">Closed</span>
                </div>
              )}
            </div>
          ))}

          <div className="pt-4 border-t space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Time zone:</span>
              <span className="font-medium">Phoenix, Arizona (GMT -7)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Holidays:</span>
              <span className="font-medium">All Federal Holidays</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onOpenChange(false)}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
