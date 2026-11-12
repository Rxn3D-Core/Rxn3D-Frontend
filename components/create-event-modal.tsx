"use client"

import { useState } from "react"
import { X, Clock, Users, MapPin, FileText, Loader2, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CalendarEvent } from "@/lib/types"
import { useHolidays } from "@/contexts/holidays-context"
import { labTimezoneLabel } from "@/lib/lab-timezone"
import { cn } from "@/lib/utils"

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
      timezone: labTimezoneLabel(selectedDate ?? new Date()),
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

  const eventTypes: CalendarEvent["type"][] = ["Holiday", "Birthday", "Appointment"]
  const timezoneLabel = labTimezoneLabel(selectedDate ?? new Date())
  // Borderless field used inside the grouped rows.
  const rowField =
    "h-9 flex-1 rounded-none border-0 bg-transparent px-0 py-0 !shadow-none !ring-0"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 p-0 max-h-[90vh] flex flex-col overflow-hidden sm:rounded-xl"
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-5 py-3 flex-shrink-0">
          <DialogTitle className="text-base font-semibold">Create event</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Scrollable fields; the header and action buttons stay visible */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          {/* Event Title */}
          <Input
            placeholder="Event Title"
            aria-label="Event Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="h-10 rounded-none border-0 border-b px-0 !shadow-none !ring-0 [&_input]:font-medium"
          />

          {/* Event Type */}
          <div role="radiogroup" aria-label="Event type" className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {eventTypes.map((type) => {
              const active = formData.type === type
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFormData({ ...formData, type })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  <span className={`h-2 w-2 rounded-full ${getTagColor(type)}`} />
                  {type}
                </button>
              )
            })}
          </div>

          {/* Date, time and repeat */}
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <Clock className="h-4 w-4 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{formatSelectedDate() || "Event Date"}</div>
                <div className="text-xs text-gray-500">{timezoneLabel}</div>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-gray-700">
                All Day
                <Switch
                  checked={formData.allDay}
                  onCheckedChange={(checked) => setFormData({ ...formData, allDay: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </label>
            </div>

            {!formData.allDay && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Input
                  type="time"
                  aria-label="Start time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-8 flex-1 px-2"
                />
                <span className="text-xs text-gray-500">to</span>
                <Input
                  type="time"
                  aria-label="End time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-8 flex-1 px-2"
                />
              </div>
            )}

            <div className="flex items-center gap-3 px-3 py-1">
              <Repeat className="h-4 w-4 shrink-0 text-blue-600" />
              <Select value={formData.repeat} onValueChange={(value) => setFormData({ ...formData, repeat: value })}>
                <SelectTrigger aria-label="Repeat" className="h-8 flex-1 border-0 px-0 text-sm shadow-none focus:ring-0">
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

            {formData.type === "Holiday" && (
              <label className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700">
                Recurring Holiday
                <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </label>
            )}
          </div>

          {/* People, place and notes */}
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 px-3">
              <Users className="h-4 w-4 shrink-0 text-blue-600" />
              <Input
                placeholder="Invite Users"
                aria-label="Invite Users"
                className={rowField}
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 px-3">
              <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
              <Input
                placeholder="Add Location"
                aria-label="Add Location"
                className={rowField}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="flex items-start gap-3 px-3 py-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <Textarea
                placeholder="Description"
                aria-label="Description"
                className="min-h-0 flex-1 resize-none border-0 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Mark Lab as Closed */}
          <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm font-medium text-gray-900">
            Mark Lab as closed
            <Switch
              checked={formData.markLabClosed}
              onCheckedChange={(checked) => setFormData({ ...formData, markLabClosed: checked })}
              className="data-[state=checked]:bg-blue-600"
            />
          </label>
        </div>

        <div className="flex-shrink-0 border-t bg-gray-50/70 px-5 py-3">
          {/* Error Feedback */}
          {formData.type === "Holiday" && localError && (
            <div className="pb-2 text-xs text-red-600">{localError}</div>
          )}
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-9 px-4" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 px-5 flex items-center gap-2"
              onClick={handleSubmit}
              disabled={!formData.title.trim() || (formData.type === "Holiday" && localLoading)}
            >
              {formData.type === "Holiday" && localLoading && <Loader2 className="animate-spin h-4 w-4" />}
              Save Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
