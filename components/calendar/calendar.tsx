"use client"

import type React from "react"
import type { Meeting } from "@/types/meeting"
import { cn } from "@/lib/utils"

interface CalendarProps {
  meetings: Meeting[]
  onDateSelect: (date: Date) => void
  onMeetingSelect: (meeting: Meeting) => void
  view: "month" | "week" | "day"
  selectedDate: Date
}

export function Calendar({ meetings, onDateSelect, onMeetingSelect, view, selectedDate }: CalendarProps) {
  // Helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const handleDateClick = (date: Date) => {
    onDateSelect(date)
  }

  const handleMeetingClick = (e: React.MouseEvent, meeting: Meeting) => {
    e.stopPropagation()
    onMeetingSelect(meeting)
  }

  // Get meetings for a specific date
  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(
      (meeting) =>
        meeting.date.getDate() === date.getDate() &&
        meeting.date.getMonth() === date.getMonth() &&
        meeting.date.getFullYear() === date.getFullYear(),
    )
  }

  // Month view rendering
  const renderMonthView = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-100 bg-gray-50"></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear()
      const isSelected =
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()

      // Filter meetings for this day
      const dayMeetings = getMeetingsForDate(date)

      days.push(
        <div
          key={day}
          className={cn(
            "h-24 border border-gray-100 p-1 overflow-hidden cursor-pointer transition-colors",
            isToday ? "bg-blue-50" : "hover:bg-gray-50",
            isSelected ? "ring-2 ring-blue-500 ring-inset" : "",
          )}
          onClick={() => handleDateClick(date)}
        >
          <div className="flex justify-between items-start">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                isToday ? "bg-blue-500 text-white" : "text-gray-700",
              )}
            >
              {day}
            </span>
          </div>
          <div className="mt-1 space-y-1 max-h-[calc(100%-1.5rem)] overflow-hidden">
            {dayMeetings.slice(0, 2).map((meeting) => (
              <div
                key={meeting.id}
                className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate"
                onClick={(e) => handleMeetingClick(e, meeting)}
              >
                {meeting.startTime} {meeting.title}
              </div>
            ))}
            {dayMeetings.length > 2 && <div className="text-xs text-gray-500">+{dayMeetings.length - 2} more</div>}
          </div>
        </div>,
      )
    }

    return (
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-medium py-2 bg-gray-50 text-gray-500 text-sm">
            {day}
          </div>
        ))}
        {days}
      </div>
    )
  }

  // Week view rendering
  const renderWeekView = () => {
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())

    const hours = []
    const weekDays = []

    // Create the week days header
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)

      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear()

      weekDays.push(
        <div key={i} className={cn("text-center border-b border-gray-200 py-2", isToday ? "bg-blue-50" : "")}>
          <div className="text-sm font-medium">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
          <div
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
              isToday ? "bg-blue-500 text-white" : "",
            )}
          >
            {date.getDate()}
          </div>
        </div>,
      )
    }

    // Create time slots for each hour
    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`

      const hourRow = []

      // Time label column
      hourRow.push(
        <div key="time" className="text-right pr-2 text-xs text-gray-500 w-16">
          {hourLabel}
        </div>,
      )

      // Day columns
      for (let day = 0; day < 7; day++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + day)
        date.setHours(hour, 0, 0, 0)

        // Find meetings that start in this hour
        const hourMeetings = meetings.filter((meeting) => {
          const meetingDate = new Date(meeting.date)
          const [meetingHours] = meeting.startTime.split(":").map(Number)

          return (
            meetingDate.getDate() === date.getDate() &&
            meetingDate.getMonth() === date.getMonth() &&
            meetingDate.getFullYear() === date.getFullYear() &&
            meetingHours === hour
          )
        })

        hourRow.push(
          <div
            key={day}
            className="border-l border-b border-gray-200 relative h-12"
            onClick={() => {
              const newDate = new Date(date)
              handleDateClick(newDate)
            }}
          >
            {hourMeetings.map((meeting) => {
              const [startHour, startMinute] = meeting.startTime.split(":").map(Number)
              const [endHour, endMinute] = meeting.endTime.split(":").map(Number)

              // Calculate duration in minutes
              const durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)

              // Calculate height based on duration (1 hour = 48px)
              const height = Math.max(20, (durationMinutes / 60) * 48)

              // Calculate top position based on start minute (1 minute = 0.8px)
              const top = (startMinute / 60) * 48

              return (
                <div
                  key={meeting.id}
                  className="absolute left-0 right-0 mx-1 rounded px-1 text-xs truncate bg-blue-100 text-blue-800 cursor-pointer"
                  style={{ top: `${top}px`, height: `${height}px` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMeetingSelect(meeting)
                  }}
                >
                  {meeting.title}
                </div>
              )
            })}
          </div>,
        )
      }

      hours.push(
        <div key={hour} className="flex">
          {hourRow}
        </div>,
      )
    }

    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="flex sticky top-0 z-10 bg-white">
          <div className="w-16"></div>
          {weekDays}
        </div>
        <div className="flex-1 overflow-y-auto">{hours}</div>
      </div>
    )
  }

  // Day view rendering
  const renderDayView = () => {
    const hours = []

    // Create time slots for each hour
    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`

      // Find meetings that start in this hour
      const hourMeetings = meetings.filter((meeting) => {
        const meetingDate = new Date(meeting.date)
        const [meetingHours] = meeting.startTime.split(":").map(Number)

        return (
          meetingDate.getDate() === selectedDate.getDate() &&
          meetingDate.getMonth() === selectedDate.getMonth() &&
          meetingDate.getFullYear() === selectedDate.getFullYear() &&
          meetingHours === hour
        )
      })

      hours.push(
        <div key={hour} className="flex border-b border-gray-200">
          <div className="text-right pr-2 text-xs text-gray-500 w-16 py-2">{hourLabel}</div>
          <div className="flex-1 relative h-16">
            {hourMeetings.map((meeting) => {
              const [startHour, startMinute] = meeting.startTime.split(":").map(Number)
              const [endHour, endMinute] = meeting.endTime.split(":").map(Number)

              // Calculate duration in minutes
              const durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)

              // Calculate height based on duration (1 hour = 64px)
              const height = Math.max(24, (durationMinutes / 60) * 64)

              // Calculate top position based on start minute (1 minute = 1.067px)
              const top = (startMinute / 60) * 64

              return (
                <div
                  key={meeting.id}
                  className="absolute left-0 right-0 mx-2 rounded px-2 py-1 bg-blue-100 text-blue-800 cursor-pointer"
                  style={{ top: `${top}px`, height: `${height}px` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMeetingSelect(meeting)
                  }}
                >
                  <div className="font-medium">{meeting.title}</div>
                  <div className="text-xs">
                    {meeting.startTime} - {meeting.endTime}
                    {meeting.location && ` • ${meeting.location}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>,
      )
    }

    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="text-center py-2 border-b border-gray-200 font-medium">
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="flex-1 overflow-y-auto">{hours}</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden">
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}
    </div>
  )
}
