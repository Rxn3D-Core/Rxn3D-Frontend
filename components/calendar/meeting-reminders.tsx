"use client"

import { useEffect, useState } from "react"
import type { Meeting } from "@/types/meeting"
import { Bell, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface MeetingRemindersProps {
  meetings: Meeting[]
}

export function MeetingReminders({ meetings }: MeetingRemindersProps) {
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([])

  useEffect(() => {
    // Get upcoming meetings (today and tomorrow)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    const upcoming = meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.date)
      return meetingDate >= now && meetingDate <= tomorrow
    })

    // Sort by date
    const sorted = upcoming.sort((a, b) => {
      const aDate = new Date(a.date)
      const bDate = new Date(b.date)
      return aDate.getTime() - bDate.getTime()
    })

    setUpcomingMeetings(sorted)
  }, [meetings])

  if (upcomingMeetings.length === 0) {
    return (
      <div className="border rounded-md p-3">
        <h3 className="text-sm font-medium mb-2 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-gray-500" />
          Upcoming Events
        </h3>
        <p className="text-sm text-gray-500">No upcoming events in the next 24 hours</p>
      </div>
    )
  }

  return (
    <div className="border rounded-md p-3">
      <h3 className="text-sm font-medium mb-2 flex items-center">
        <Bell className="h-4 w-4 mr-2 text-gray-500" />
        Upcoming Events
      </h3>
      <div className="space-y-3">
        {upcomingMeetings.map((meeting) => {
          const meetingDate = new Date(meeting.date)
          const isToday =
            meetingDate.getDate() === new Date().getDate() &&
            meetingDate.getMonth() === new Date().getMonth() &&
            meetingDate.getFullYear() === new Date().getFullYear()

          return (
            <div
              key={meeting.id}
              className={cn("p-2 border rounded-md", isToday ? "border-blue-200 bg-blue-50" : "border-gray-200")}
            >
              <h4 className="font-medium text-sm truncate">{meeting.title}</h4>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  {isToday ? "Today" : "Tomorrow"}, {meeting.startTime}
                </span>
              </div>
              {meeting.location && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate">{meeting.location}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
