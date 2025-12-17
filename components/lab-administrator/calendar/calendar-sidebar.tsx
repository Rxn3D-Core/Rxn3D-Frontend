"use client"

import { MiniCalendar } from "@/components/mini-calendar"
import { TagsSection } from "@/components/tags-section"

interface CalendarSidebarProps {
  onShowWorkingHours: () => void
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onMonthChange?: (date: Date) => void
}

export function CalendarSidebar({
  onShowWorkingHours,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: CalendarSidebarProps) {
  return (
    <div className="w-80 bg-gray-50 p-4 space-y-4">
      <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} onMonthChange={onMonthChange} />
      <TagsSection onShowWorkingHours={onShowWorkingHours} />
    </div>
  )
}
