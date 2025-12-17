"use client"

import { useState } from "react"
import { CalendarSidebar } from "@/components/lab-administrator/calendar/calendar-sidebar"
import { CalendarHeader } from "@/components/lab-administrator/calendar/calendar-header"
import { CalendarGrid } from "@/components/lab-administrator/calendar/calendar-grid"
import { ListView } from "@/components/lab-administrator/calendar/list-view"
import { WorkingHoursModal } from "@/components/lab-administrator/calendar/working-hours-modal"
import { useHolidays } from "@/contexts";

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "list">("month")
  const [showWorkingHours, setShowWorkingHours] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const { holidays, loading, error } = useHolidays();

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  return (
    <>
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
