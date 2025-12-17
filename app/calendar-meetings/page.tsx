import { CalendarMeetingView } from "@/components/calendar/calendar-meeting-view"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"

export default function CalendarMeetingsPage() {
  return (
    <div className="flex h-screen bg-[#F9F9F9] overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <div className="container mx-auto py-4">
        <CalendarMeetingView />
      </div>
      </div>
    </div>
  )
}
