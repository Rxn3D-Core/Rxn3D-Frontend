"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import type { Meeting } from "@/types/meeting"

interface MeetingFormProps {
  initialMeeting?: Partial<Meeting> | null
  onSave: (meeting: Meeting) => void
  onCancel: () => void
  isEditMode?: boolean
}

export function MeetingForm({ initialMeeting, onSave, onCancel, isEditMode = false }: MeetingFormProps) {
  const [meeting, setMeeting] = useState<Partial<Meeting>>({
    title: "",
    date: new Date(),
    startTime: "09:00",
    endTime: "10:00",
    description: "",
    attendees: "",
    location: "",
    ...initialMeeting,
  })

  // Format date for date input
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setMeeting({ ...meeting, [name]: value })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    const newDate = new Date(value)
    if (!isNaN(newDate.getTime())) {
      // Preserve the current time
      const currentDate = meeting.date as Date
      newDate.setHours(currentDate.getHours(), currentDate.getMinutes())
      setMeeting({ ...meeting, date: newDate })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Combine date and time
    const date = meeting.date as Date
    const [startHours, startMinutes] = (meeting.startTime as string).split(":").map(Number)
    const [endHours, endMinutes] = (meeting.endTime as string).split(":").map(Number)

    const startDate = new Date(date)
    startDate.setHours(startHours, startMinutes)

    const endDate = new Date(date)
    endDate.setHours(endHours, endMinutes)

    onSave({
      id: meeting.id || "",
      title: meeting.title || "Untitled Meeting",
      date: startDate,
      startTime: meeting.startTime as string,
      endTime: meeting.endTime as string,
      description: meeting.description || "",
      attendees: meeting.attendees || "",
      location: meeting.location || "",
      reminderSet: meeting.reminderSet || false,
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>{isEditMode ? "Edit event" : "Add event"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={meeting.title || ""}
              onChange={handleChange}
              placeholder="Add title"
              required
              className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formatDateForInput(meeting.date as Date)}
              onChange={handleDateChange}
              required
              className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={meeting.startTime || ""}
                onChange={handleChange}
                required
                className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={meeting.endTime || ""}
                onChange={handleChange}
                required
                className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={meeting.location || ""}
              onChange={handleChange}
              placeholder="Add location"
              className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Guests</Label>
            <Input
              id="attendees"
              name="attendees"
              value={meeting.attendees || ""}
              onChange={handleChange}
              placeholder="Add guests"
              className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={meeting.description || ""}
              onChange={handleChange}
              placeholder="Add description"
              rows={4}
              className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500 resize-none"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {isEditMode ? "Save" : "Create"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
