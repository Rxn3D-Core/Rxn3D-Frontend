"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { EventModal } from "@/components/event-modal"
import { CreateEventModal } from "@/components/create-event-modal"
import type { CalendarEvent } from "@/lib/types"
import { useHolidays } from "@/contexts/holidays-context"

const nonHolidayEvents: CalendarEvent[] = [
  {
    id: "2",
    title: "Dr. Smith Birthday",
    type: "Birthday",
    date: "2025-01-03",
    allDay: true,
    timezone: "GMT - 7 Phoenix",
    description: "Birthday celebration",
    location: "",
    user: "Dr. Smith",
  },
  {
    id: "4",
    title: "Yasuko Funaki - Crown Prep",
    type: "Appointment",
    date: "2025-01-13",
    time: "09:00 am — 10:00 am",
    user: "Hon Oliva",
    location: "Greater Las Vegas Dental",
    description: "Crown preparation appointment - Please bring impression materials",
    allDay: false,
    timezone: "GMT - 7 Phoenix",
  },
  {
    id: "5",
    title: "Maria Rodriguez - Bridge Fitting",
    type: "Appointment",
    date: "2025-01-15",
    time: "02:00 pm — 03:30 pm",
    user: "Dr. Johnson",
    location: "Sunrise Dental Clinic",
    description: "Bridge fitting and adjustment",
    allDay: false,
    timezone: "GMT - 7 Phoenix",
  },
  {
    id: "6",
    title: "John Davis - Denture Delivery",
    type: "Appointment",
    date: "2025-01-17",
    time: "10:30 am — 11:30 am",
    user: "Dr. Williams",
    location: "Downtown Dental",
    description: "Complete denture delivery and fitting",
    allDay: false,
    timezone: "GMT - 7 Phoenix",
  },
  {
    id: "7",
    title: "Sarah Chen Birthday",
    type: "Birthday",
    date: "2025-01-22",
    allDay: true,
    timezone: "GMT - 7 Phoenix",
    description: "Lab technician birthday",
    location: "",
    user: "Sarah Chen",
  },
  {
    id: "8",
    title: "Equipment Maintenance",
    type: "Appointment",
    date: "2025-01-25",
    time: "08:00 am — 12:00 pm",
    user: "Maintenance Team",
    location: "HMC Innovs Lab",
    description: "Scheduled maintenance for lab equipment",
    allDay: false,
    timezone: "GMT - 7 Phoenix",
  },
  {
    id: "10",
    title: "Robert Johnson - Implant Crown",
    type: "Appointment",
    date: "2025-01-28",
    time: "01:00 pm — 02:00 pm",
    user: "Dr. Anderson",
    location: "Modern Dental Practice",
    description: "Implant crown delivery and occlusion check",
    allDay: false,
    timezone: "GMT - 7 Phoenix",
  },
]

interface CalendarGridProps {
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

export function CalendarGrid({ currentDate = new Date(2025, 0, 1), onDateChange }: CalendarGridProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(nonHolidayEvents)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { holidays } = useHolidays()

  useEffect(() => {
    const holidayEvents: CalendarEvent[] = holidays.map((holiday) => ({
      id: `holiday-${holiday.id}`,
      title: holiday.name,
      type: "Holiday",
      date: holiday.date,
      allDay: true,
      description: holiday.description,
      timezone: "GMT - 7 Phoenix", // This might need to be dynamic
      location: "",
      user: "",
    }))
    setEvents([...nonHolidayEvents, ...holidayEvents])
  }, [holidays])

  const daysOfWeek = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"]

  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Get the first Monday of the calendar view
    const startDate = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(startDate.getDate() - daysToSubtract)

    const calendarDays = []
    const currentDate = new Date(startDate)

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === month
      const dayEvents = getEventsForDate(currentDate)

      calendarDays.push({
        date: currentDate.getDate(),
        fullDate: new Date(currentDate),
        isCurrentMonth,
        events: dayEvents,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return calendarDays
  }

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return events.filter((event) => event.date === dateString)
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "Birthday":
        return "bg-blue-100 text-blue-800 border-l-4 border-blue-500"
      case "Holiday":
        return "bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500"
      case "Appointment":
        return "bg-red-100 text-red-800 border-l-4 border-red-500"
      default:
        return "bg-gray-100 text-gray-800 border-l-4 border-gray-500"
    }
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleDayClick = (day: any) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.fullDate)
      setShowCreateModal(true)
      onDateChange?.(day.fullDate)
    }
  }

  const handleCreateEvent = (eventData: Partial<CalendarEvent>) => {
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: eventData.title || "New Event",
      type: eventData.type || "Appointment",
      date: selectedDate?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
      time: eventData.time,
      user: eventData.user,
      location: eventData.location,
      description: eventData.description,
      allDay: eventData.allDay || false,
      timezone: eventData.timezone || "GMT - 7 Phoenix",
    }

    setEvents((prev) => [...prev, newEvent])
    setShowCreateModal(false)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
    setShowEventModal(false)
  }

  const calendarDays = getCalendarDays(currentDate)
  const today = new Date()
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  return (
    <>
      <div className="bg-white">
        <div className="grid grid-cols-7 border-b">
          {daysOfWeek.map((day) => (
            <div key={day} className="p-4 text-center font-medium text-gray-500 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const isToday = isSameDay(day.fullDate, today)
            return (
              <div
                key={index}
                className={cn(
                  "min-h-32 p-2 border-r border-b last:border-r-0 cursor-pointer transition-colors",
                  !day.isCurrentMonth && "text-gray-400 bg-gray-50",
                  day.isCurrentMonth && !isToday && "hover:bg-blue-50",
                  isToday && "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className={cn(
                  "font-medium text-lg mb-2",
                  !day.isCurrentMonth && "text-gray-400",
                  isToday && "text-white font-bold"
                )}>{day.date}</div>
                {day.events && day.events.length > 0 && (
                  <div className="space-y-1">
                    {day.events.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={cn(
                          "text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                          getEventColor(event.type),
                        )}
                        onClick={(e) => handleEventClick(event, e)}
                        title={`${event.title}${event.time ? ` - ${event.time}` : ""}`}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {event.time && <div className="text-xs opacity-75">{event.time}</div>}
                      </div>
                    ))}
                    {day.events.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">+{day.events.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={selectedEvent}
        onDelete={handleDeleteEvent}
      />

      <CreateEventModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        selectedDate={selectedDate}
        onCreateEvent={handleCreateEvent}
      />
    </>
  )
}
