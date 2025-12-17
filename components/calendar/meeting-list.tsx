"use client"

import type { Meeting } from "@/types/meeting"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface MeetingListProps {
  meetings: Meeting[]
  onMeetingSelect: (meeting: Meeting) => void
  onEditMeeting: (meeting: Meeting) => void
  onDeleteMeeting: (id: string) => void
  selectedMeetingId?: string
}

export function MeetingList({
  meetings,
  onMeetingSelect,
  onEditMeeting,
  onDeleteMeeting,
  selectedMeetingId,
}: MeetingListProps) {
  if (meetings.length === 0) {
    return <div className="text-center py-8 text-gray-500">No events scheduled for this day</div>
  }

  // Sort meetings by start time
  const sortedMeetings = [...meetings].sort((a, b) => {
    const aTime = a.startTime.split(":").map(Number)
    const bTime = b.startTime.split(":").map(Number)
    return aTime[0] * 60 + aTime[1] - (bTime[0] * 60 + bTime[1])
  })

  return (
    <div className="space-y-2">
      {sortedMeetings.map((meeting) => (
        <div
          key={meeting.id}
          className={cn(
            "p-3 border rounded-md cursor-pointer transition-colors",
            selectedMeetingId === meeting.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50",
          )}
          onClick={() => onMeetingSelect(meeting)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{meeting.title}</h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  {meeting.startTime} - {meeting.endTime}
                </span>
              </div>
              {meeting.location && (
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{meeting.location}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditMeeting(meeting)
                }}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteMeeting(meeting.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
