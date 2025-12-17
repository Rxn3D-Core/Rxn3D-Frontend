"use client"

import { useState } from "react"
import { X, Clock, Users, MapPin, FileText, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import type { CalendarEvent } from "@/lib/types"
import { useHolidays } from "@/contexts/holidays-context"

interface CreateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date | null
  onCreateEvent?: (eventData: Partial<CalendarEvent>) => void
}

export function CreateEventModal({ open, onOpenChange, selectedDate, onCreateEvent }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    type: "Holiday" as CalendarEvent["type"],
    startTime: "08:00",
    endTime: "08:30",
    allDay: true,
    user: "",
    location: "",
    description: "",
    repeat: "no-repeat",
    markLabClosed: true,
    is_recurring: false,
  })
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { createHoliday, loading, error } = useHolidays()

  const handleSubmit = async () => {
    if (!formData.title.trim()) return
    setLocalError(null)
    if (formData.type === "Holiday") {
      setLocalLoading(true)
      // Prepare payload for createHoliday
      const dateStr = selectedDate
        ? selectedDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
      const payload = {
        name: formData.title,
        date: dateStr,
        is_recurring: formData.is_recurring,
        description: formData.description,
        // customer_id is handled in context
      }
      const result = await createHoliday(payload as any)
      setLocalLoading(false)
      if (!result) {
        setLocalError(error || "Failed to create holiday.")
        return
      }
      resetForm()
      onOpenChange(false)
      return
    }

    const formatTimeForDisplay = () => {
      if (formData.allDay) return undefined
      return `${formatTime(formData.startTime)} — ${formatTime(formData.endTime)}`
    }

    const eventData: Partial<CalendarEvent> = {
      title: formData.title,
      type: formData.type,
      time: formatTimeForDisplay(),
      allDay: formData.allDay,
      user: formData.user,
      location: formData.location,
      description: formData.description,
      timezone: "GMT - 7 Phoenix",
      is_recurring: formData.is_recurring,
    }

    onCreateEvent?.(eventData)
    resetForm()
    onOpenChange(false)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "pm" : "am"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour.toString().padStart(2, "0")}:${minutes} ${ampm}`
  }

  const resetForm = () => {
    setFormData({
      title: "",
      type: "Holiday",
      startTime: "08:00",
      endTime: "08:30",
      allDay: true,
      user: "",
      location: "",
      description: "",
      repeat: "no-repeat",
      markLabClosed: true,
      is_recurring: false,
    })
  }

  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ""
    return selectedDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const getTagColor = (type: string) => {
    switch (type) {
      case "Holiday":
        return "bg-yellow-400"
      case "Birthday":
        return "bg-blue-500"
      case "Appointment":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="flex flex-row items-center justify-between p-0">
          <span className="text-lg font-semibold">Create event</span>
          <Button variant="ghost" size="sm" className="p-1 h-8 w-8" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Title */}
          <div>
            <Input
              placeholder="Event Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-lg border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>

          {/* Event Type Tag */}
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 ${getTagColor(formData.type)} rounded-full`} />
            <Select
              value={formData.type}
              onValueChange={(value: CalendarEvent["type"]) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="border-0 p-0 h-auto font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Holiday">Holiday</SelectItem>
                <SelectItem value="Birthday">Birthday</SelectItem>
                <SelectItem value="Appointment">Appointment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <Input
                value={formatSelectedDate()}
                readOnly
                className="border border-gray-300 rounded-md"
                placeholder="Event Date"
              />
            </div>
            {!formData.allDay && (
              <>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-32 border border-gray-300 rounded-md text-center"
                />
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-32 border border-gray-300 rounded-md text-center"
                />
              </>
            )}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.allDay}
                onCheckedChange={(checked) => setFormData({ ...formData, allDay: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="font-medium">All Day</span>
            </div>
            <span className="text-blue-600 font-medium">GMT - 7 Phoenix</span>
          </div>

          {/* Repeat */}
          <div>
            <Select value={formData.repeat} onValueChange={(value) => setFormData({ ...formData, repeat: value })}>
              <SelectTrigger className="border border-gray-300 rounded-md">
                <SelectValue placeholder="Does not Repeat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-repeat">Does not Repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Holiday Toggle */}
          {formData.type === "Holiday" && (
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="font-medium">Recurring Holiday</span>
            </div>
          )}

          {/* Invite Users */}
          <div className="flex items-center gap-4">
            <Users className="h-5 w-5 text-blue-600" />
            <Input
              placeholder="Invite Users"
              className="flex-1 border-0 px-0 focus-visible:ring-0"
              value={formData.user}
              onChange={(e) => setFormData({ ...formData, user: e.target.value })}
            />
          </div>

          {/* Add Location */}
          <div className="flex items-center gap-4">
            <MapPin className="h-5 w-5 text-blue-600" />
            <Input
              placeholder="Add Location"
              className="flex-1 border-0 px-0 focus-visible:ring-0"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="flex items-start gap-4">
            <FileText className="h-5 w-5 text-blue-600 mt-1" />
            <Textarea
              placeholder="Description"
              className="flex-1 border-0 px-0 resize-none focus-visible:ring-0"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Mark Lab as Closed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.markLabClosed}
                onCheckedChange={(checked) => setFormData({ ...formData, markLabClosed: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="font-medium">Mark Lab as closed</span>
            </div>
          </div>

          {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 px-8 flex items-center gap-2" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 px-8 flex items-center gap-2"
              onClick={handleSubmit}
              disabled={!formData.title.trim() || (formData.type === "Holiday" && localLoading)}
            >
              {formData.type === "Holiday" && localLoading && <Loader2 className="animate-spin h-4 w-4" />}
              Save Event
            </Button>
            </div>
          {/* Error Feedback */}
          {formData.type === "Holiday" && localError && (
            <div className="text-red-600 text-sm pt-2">{localError}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
