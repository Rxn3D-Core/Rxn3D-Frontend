"use client"

import type { Meeting } from "@/types/meeting"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Trash2, MapPin, Users, Clock, Bell, BellOff, X } from "lucide-react"

interface MeetingDetailsProps {
  meeting: Meeting
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function MeetingDetails({ meeting, onEdit, onDelete, onClose }: MeetingDetailsProps) {
  const formatAttendees = (attendees: string) => {
    return attendees.split(",").map((attendee) => attendee.trim())
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle>{meeting.title}</CardTitle>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm">
          <Clock className="h-4 w-4 mr-2 text-blue-500" />
          <span>
            {meeting.date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            , {meeting.startTime} - {meeting.endTime}
          </span>
        </div>

        {meeting.location && (
          <div className="flex items-center text-sm">
            <MapPin className="h-4 w-4 mr-2 text-red-500" />
            <span>{meeting.location}</span>
          </div>
        )}

        {meeting.attendees && (
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-green-500" />
              <span>Attendees</span>
            </div>
            <ul className="list-disc list-inside pl-6 text-sm">
              {formatAttendees(meeting.attendees).map((attendee, index) => (
                <li key={index}>{attendee}</li>
              ))}
            </ul>
          </div>
        )}

        {meeting.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Description</h3>
            <p className="text-sm whitespace-pre-wrap">{meeting.description}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // Toggle reminder functionality would go here
            // For now, we'll just show an alert
            alert(`Reminder ${meeting.reminderSet ? "disabled" : "set"} for "${meeting.title}"`)
          }}
        >
          {meeting.reminderSet ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Disable Reminder
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Set Reminder
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
