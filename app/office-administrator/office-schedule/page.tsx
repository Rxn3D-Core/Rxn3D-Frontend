"use client"

import { useState } from "react"
import { CalendarSidebar } from "@/components/lab-administrator/calendar/calendar-sidebar"
import { CalendarHeader } from "@/components/lab-administrator/calendar/calendar-header"
import { CalendarGrid } from "@/components/lab-administrator/calendar/calendar-grid"
import { ListView } from "@/components/lab-administrator/calendar/list-view"
import { WorkingHoursModal } from "@/components/lab-administrator/calendar/working-hours-modal"

export default function OfficeSchedulePage() {
  const [view, setView] = useState<"month" | "week" | "list">("month")
  const [showWorkingHours, setShowWorkingHours] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1)) // January 2025
  const [searchTerm, setSearchTerm] = useState("")

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  return (
    <>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Office Administrator - Schedule</h1>
      </div>
      <div className="flex-1 flex">
        <CalendarSidebar
          onShowWorkingHours={() => setShowWorkingHours(true)}
          selectedDate={currentDate}
          onDateSelect={handleDateChange}
          onMonthChange={handleDateChange}
        />
        <div className="flex-1 flex flex-col">
          <CalendarHeader
            view={view}
            onViewChange={setView}
            currentDate={currentDate}
            onDateChange={handleDateChange}
            onSearch={handleSearch}
          />
          <div className="flex-1 overflow-auto">
            {view === "list" ? (
              <ListView searchTerm={searchTerm} />
            ) : (
              <CalendarGrid currentDate={currentDate} onDateChange={handleDateChange} />
            )}
          </div>
        </div>
      </div>
      <WorkingHoursModal open={showWorkingHours} onOpenChange={setShowWorkingHours} />
    </>
  )
}
