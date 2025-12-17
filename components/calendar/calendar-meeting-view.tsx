"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/calendar/calendar"
import { MeetingForm } from "@/components/calendar/meeting-form"
import { MeetingDetails } from "@/components/calendar/meeting-details"
import { MeetingReminders } from "@/components/calendar/meeting-reminders"
import type { Meeting } from "@/types/meeting"

// Sample data
const sampleMeetings: Meeting[] = [
  {
    id: "1",
    title: "Team Standup",
    date: new Date(),
    startTime: "09:00",
    endTime: "09:30",
    description: "Daily team standup meeting",
    attendees: "John Doe, Jane Smith, Bob Johnson",
    location: "Conference Room A",
    reminderSet: true,
  },
  {
    id: "2",
    title: "Client Meeting",
    date: new Date(),
    startTime: "11:00",
    endTime: "12:00",
    description: "Discuss project requirements with client",
    attendees: "John Doe, Client Representative",
    location: "Zoom",
    reminderSet: false,
  },
  {
    id: "3",
    title: "Lunch Break",
    date: new Date(),
    startTime: "12:30",
    endTime: "13:30",
    description: "Team lunch",
    attendees: "All team members",
    location: "Cafeteria",
    reminderSet: false,
  },
  {
    id: "4",
    title: "Project Review",
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    startTime: "10:00",
    endTime: "11:00",
    description: "Review project progress",
    attendees: "John Doe, Jane Smith, Project Manager",
    location: "Conference Room B",
    reminderSet: true,
  },
]

export function CalendarMeetingView() {
  const [meetings, setMeetings] = useState<Meeting[]>(sampleMeetings)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isAddingMeeting, setIsAddingMeeting] = useState(false)
  const [isEditingMeeting, setIsEditingMeeting] = useState(false)
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">("month")

  // Filter meetings for the selected date
  const filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.date.getDate() === selectedDate.getDate() &&
      meeting.date.getMonth() === selectedDate.getMonth() &&
      meeting.date.getFullYear() === selectedDate.getFullYear(),
  )

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedMeeting(null)
  }

  const handleMeetingSelect = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setIsAddingMeeting(false)
    setIsEditingMeeting(false)
  }

  const handleAddMeeting = () => {
    setIsAddingMeeting(true)
    setSelectedMeeting(null)
    setIsEditingMeeting(false)
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setIsEditingMeeting(true)
    setIsAddingMeeting(false)
  }

  const handleDeleteMeeting = (id: string) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      setMeetings(meetings.filter((meeting) => meeting.id !== id))
      if (selectedMeeting && selectedMeeting.id === id) {
        setSelectedMeeting(null)
      }
    }
  }

  const handleSaveMeeting = (meeting: Meeting) => {
    if (isEditingMeeting) {
      // Update existing meeting
      setMeetings(meetings.map((m) => (m.id === meeting.id ? meeting : m)))
    } else {
      // Add new meeting
      const newMeeting = {
        ...meeting,
        id: String(Date.now()),
      }
      setMeetings([...meetings, newMeeting])
    }
    setIsAddingMeeting(false)
    setIsEditingMeeting(false)
    setSelectedMeeting(null)
  }

  const handleCancelForm = () => {
    setIsAddingMeeting(false)
    setIsEditingMeeting(false)
  }

  const handleViewChange = (view: "month" | "week" | "day") => {
    setCurrentView(view)
  }

  return (
    <div className="flex flex-col">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(new Date())}>
            <CalendarIcon className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate)
                if (currentView === "month") {
                  newDate.setMonth(newDate.getMonth() - 1)
                } else if (currentView === "week") {
                  newDate.setDate(newDate.getDate() - 7)
                } else {
                  newDate.setDate(newDate.getDate() - 1)
                }
                setSelectedDate(newDate)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate)
                if (currentView === "month") {
                  newDate.setMonth(newDate.getMonth() + 1)
                } else if (currentView === "week") {
                  newDate.setDate(newDate.getDate() + 7)
                } else {
                  newDate.setDate(newDate.getDate() + 1)
                }
                setSelectedDate(newDate)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Replace TabsList with a button group */}
          <div className="bg-muted rounded-md p-1 flex">
            <Button
              variant={currentView === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewChange("month")}
              className="rounded-md"
            >
              Month
            </Button>
            <Button
              variant={currentView === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewChange("week")}
              className="rounded-md"
            >
              Week
            </Button>
            <Button
              variant={currentView === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewChange("day")}
              className="rounded-md"
            >
              Day
            </Button>
          </div>
          <Button onClick={handleAddMeeting} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-1" /> Create
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-l-lg border-r p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="text-center mb-2">
            <Button
              variant="outline"
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleAddMeeting}
            >
              <Plus className="h-4 w-4 mr-2" /> Create
            </Button>
          </div>

          {/* Mini Calendar */}
          <div className="p-2 border rounded-md bg-white">
            <div className="text-sm font-medium mb-2">Mini Calendar</div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div key={i} className="text-gray-500">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - date.getDay() + i)
                const isToday = date.toDateString() === new Date().toDateString()
                const isSelected = date.toDateString() === selectedDate.toDateString()
                return (
                  <div
                    key={i}
                    className={`
                      cursor-pointer rounded-full w-6 h-6 flex items-center justify-center text-xs
                      ${isToday ? "bg-blue-100 text-blue-800" : ""}
                      ${isSelected ? "bg-blue-600 text-white" : ""}
                      ${!isToday && !isSelected ? "hover:bg-gray-100" : ""}
                    `}
                    onClick={() => setSelectedDate(new Date(date))}
                  >
                    {date.getDate()}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <MeetingReminders meetings={meetings} />

          {/* My Calendars */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-medium mb-2">My Calendars</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-blue-500 mr-2"></div>
                <span className="text-sm">Meetings</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-green-500 mr-2"></div>
                <span className="text-sm">Personal</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-purple-500 mr-2"></div>
                <span className="text-sm">Holidays</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 bg-white rounded-r-lg border overflow-hidden">
          {/* Replace Tabs with conditional rendering */}
          <div className="h-full">
            {currentView === "month" && (
              <div className="h-full p-4">
                <Calendar
                  meetings={meetings}
                  onDateSelect={handleDateSelect}
                  onMeetingSelect={handleMeetingSelect}
                  view="month"
                  selectedDate={selectedDate}
                />
              </div>
            )}
            {currentView === "week" && (
              <div className="h-full p-4">
                <Calendar
                  meetings={meetings}
                  onDateSelect={handleDateSelect}
                  onMeetingSelect={handleMeetingSelect}
                  view="week"
                  selectedDate={selectedDate}
                />
              </div>
            )}
            {currentView === "day" && (
              <div className="h-full p-4">
                <Calendar
                  meetings={meetings}
                  onDateSelect={handleDateSelect}
                  onMeetingSelect={handleMeetingSelect}
                  view="day"
                  selectedDate={selectedDate}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Form or Details */}
      {(isAddingMeeting || isEditingMeeting || selectedMeeting) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            {isAddingMeeting && (
              <MeetingForm
                initialMeeting={{ date: selectedDate }}
                onSave={handleSaveMeeting}
                onCancel={handleCancelForm}
              />
            )}
            {isEditingMeeting && selectedMeeting && (
              <MeetingForm
                initialMeeting={selectedMeeting}
                onSave={handleSaveMeeting}
                onCancel={handleCancelForm}
                isEditMode
              />
            )}
            {selectedMeeting && !isEditingMeeting && !isAddingMeeting && (
              <MeetingDetails
                meeting={selectedMeeting}
                onEdit={() => handleEditMeeting(selectedMeeting)}
                onDelete={() => handleDeleteMeeting(selectedMeeting.id)}
                onClose={() => setSelectedMeeting(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
