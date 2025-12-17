"use client"

import { useState } from "react"
import { X, Clock, Users, MapPin, FileText, Trash2, Edit, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import type { CalendarEvent } from "@/lib/types"
import { useHolidays } from "@/contexts/holidays-context"
import { Loader2 } from "lucide-react"

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  onDelete?: (eventId: string) => void
  onEdit?: (event: CalendarEvent) => void
  onSave?: (event: CalendarEvent) => void
}

export function EventModal({ open, onOpenChange, event, onDelete, onEdit, onSave }: EventModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedEvent, setEditedEvent] = useState<CalendarEvent | null>(null)
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { updateHoliday, loading, error } = useHolidays()

  // Initialize edited event when modal opens or event changes
  useState(() => {
    if (event) {
      setEditedEvent({ ...event })
    }
  }, [event])

  if (!event) return null

  const currentEvent = editedEvent || event

  const handleEdit = () => {
    setEditedEvent({ ...event })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editedEvent) return
    setLocalError(null)
    if (editedEvent.type === "Holiday" && editedEvent.id?.startsWith("holiday-")) {
      setLocalLoading(true)
      // Extract holiday ID from event.id (format: holiday-123)
      const holidayIdStr = editedEvent.id.replace("holiday-", "")
      const holidayId = Number(holidayIdStr)
      const payload = {
        name: editedEvent.title,
        date: editedEvent.date,
        is_recurring: Boolean(editedEvent.is_recurring),
        description: editedEvent.description || "",
      }
      const result = await updateHoliday(holidayId, payload)
      setLocalLoading(false)
      if (!result) {
        setLocalError(error || "Failed to update holiday.")
        return
      }
      setIsEditing(false)
      return
    }
    if (onSave) {
      onSave(editedEvent)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedEvent({ ...event })
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (event.id && onDelete) {
      onDelete(event.id)
    }
  }

  const updateField = (field: keyof CalendarEvent, value: any) => {
    if (editedEvent) {
      setEditedEvent({ ...editedEvent, [field]: value })
    }
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "Holiday":
        return "bg-yellow-400"
      case "Birthday":
        return "bg-blue-500"
      case "Appointment":
        return "bg-red-500"
      case "Working Hours":
        return "bg-green-500"
      default:
        return "bg-gray-400"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  const formatFullAddress = (location: string) => {
    if (location === "Greater Las Vegas Dental") {
      return "8867 W Flamingo Rd STE 100, Las Vegas NV"
    }
    return location
  }

  const parseTimeRange = (timeRange?: string) => {
    if (!timeRange) return { startTime: "09:00", endTime: "10:00" }

    // Parse "09:00 am — 10:00 am" format
    const parts = timeRange.split(" — ")
    if (parts.length === 2) {
      const start = convertTo24Hour(parts[0].trim())
      const end = convertTo24Hour(parts[1].trim())
      return { startTime: start, endTime: end }
    }

    return { startTime: "09:00", endTime: "10:00" }
  }

  const convertTo24Hour = (time12h: string) => {
    const [time, modifier] = time12h.split(" ")
    let [hours, minutes] = time.split(":")

    if (hours === "12") {
      hours = "00"
    }

    if (modifier?.toLowerCase() === "pm") {
      hours = (Number.parseInt(hours, 10) + 12).toString()
    }

    return `${hours.padStart(2, "0")}:${minutes}`
  }

  const formatTimeDisplay = (startTime: string, endTime: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":")
      const hour = Number.parseInt(hours)
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour.toString().padStart(2, "0")}:${minutes} ${ampm}`
    }

    return `${formatTime(startTime)} — ${formatTime(endTime)}`
  }

  const { startTime, endTime } = parseTimeRange(currentEvent.time)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b flex-shrink-0">
          <div></div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8 text-green-600" onClick={handleSave} disabled={localLoading}>
                  {editedEvent?.type === "Holiday" && localLoading && <Loader2 className="animate-spin h-4 w-4" />}
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8" onClick={handleCancel}>
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8" onClick={handleEdit}>
                  <Edit className="h-4 w-4 text-gray-600" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8 text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Error Feedback */}
        {isEditing && editedEvent?.type === "Holiday" && localError && (
          <div className="text-red-600 text-sm pt-2">{localError}</div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {/* Event Title */}
            <div className="pt-2">
              {isEditing ? (
                <Input
                  value={currentEvent.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="text-xl font-semibold border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
                  placeholder="Event Title"
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900">{currentEvent.title}</h2>
              )}
            </div>

            {/* Event Type */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 ${getBadgeColor(currentEvent.type)} rounded-full`} />
              {isEditing ? (
                <Select
                  value={currentEvent.type}
                  onValueChange={(value: CalendarEvent["type"]) => updateField("type", value)}
                >
                  <SelectTrigger className="border-0 p-0 h-auto font-medium w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Birthday">Birthday</SelectItem>
                    <SelectItem value="Appointment">Appointment</SelectItem>
                    <SelectItem value="Working Hours">Working Hours</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-medium text-gray-900">{currentEvent.type}</span>
              )}
            </div>

            {/* Date and Time */}
            <div className="flex items-center gap-4">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Input
                      type="date"
                      value={currentEvent.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      className="border border-gray-300 rounded-md w-40"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{formatDate(currentEvent.date)}</span>
                  )}
                </div>

                {!currentEvent.allDay && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => {
                            const newTimeRange = formatTimeDisplay(e.target.value, endTime)
                            updateField("time", newTimeRange)
                          }}
                          className="w-24 border border-gray-300 rounded-md text-sm"
                        />
                        <span className="text-gray-400">—</span>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            const newTimeRange = formatTimeDisplay(startTime, e.target.value)
                            updateField("time", newTimeRange)
                          }}
                          className="w-24 border border-gray-300 rounded-md text-sm"
                        />
                      </>
                    ) : (
                      <span className="text-gray-900">{currentEvent.time}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={currentEvent.allDay || false}
                  onCheckedChange={(checked) => updateField("allDay", checked)}
                  disabled={!isEditing}
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className="font-medium text-gray-900">All Day</span>
              </div>
              <span className="text-blue-600 font-medium">{currentEvent.timezone || "GMT - 7 Phoenix"}</span>
            </div>

            {/* Repeat */}
            <div>
              <span className="text-gray-500">Does not Repeat</span>
            </div>

            {/* User */}
            <div className="flex items-center gap-4">
              <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
              {isEditing ? (
                <Input
                  value={currentEvent.user || ""}
                  onChange={(e) => updateField("user", e.target.value)}
                  className="flex-1 border-0 px-0 focus-visible:ring-0"
                  placeholder="Assign user"
                />
              ) : (
                <span className="text-gray-900 font-medium">{currentEvent.user || "No user assigned"}</span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-start gap-4">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={currentEvent.location || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    className="border-0 px-0 focus-visible:ring-0 w-full"
                    placeholder="Add location"
                  />
                ) : currentEvent.location ? (
                  <div>
                    <div className="font-medium text-gray-900">{currentEvent.location}</div>
                    <div className="text-gray-500 text-sm">{formatFullAddress(currentEvent.location)}</div>
                  </div>
                ) : (
                  <span className="text-gray-500">No location</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start gap-4">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {isEditing ? (
                  <Textarea
                    value={currentEvent.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    className="border-0 px-0 resize-none focus-visible:ring-0 w-full"
                    placeholder="Add description"
                    rows={3}
                  />
                ) : (
                  <span className="text-gray-900">{currentEvent.description || "No description"}</span>
                )}
              </div>
            </div>

            {/* Mark Lab as Closed */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={currentEvent.type === "Holiday"}
                  disabled={!isEditing}
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className="font-medium text-gray-900">Mark Lab as closed</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
