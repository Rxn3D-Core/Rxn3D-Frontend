"use client"

import { Calendar, List, Filter, Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface CalendarHeaderProps {
  view: "month" | "week" | "list"
  onViewChange: (view: "month" | "week" | "list") => void
  currentDate: Date
  onDateChange: (date: Date) => void
  onSearch?: (term: string) => void
}

export function CalendarHeader({ view, onViewChange, currentDate, onDateChange, onSearch }: CalendarHeaderProps) {
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const getViewLabel = () => {
    switch (view) {
      case "month":
        return "Month"
      case "week":
        return "Week"
      case "list":
        return "List"
      default:
        return "Month"
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")} className="hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold min-w-48 text-center">{monthYear}</h1>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")} className="hover:bg-gray-100">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {view === "month" ? (
            <Button
              size="sm"
              onClick={() => onViewChange("month")}
              className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Month
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("month")}
              className="[background:linear-gradient(white,white)_padding-box,linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)_border-box] border-2 border-transparent hover:brightness-110"
            >
              <Calendar className="h-4 w-4 mr-2" style={{ color: "#82298D" }} />
              <span style={{ background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Month</span>
            </Button>
          )}
          {view === "list" ? (
            <Button
              size="sm"
              onClick={() => onViewChange("list")}
              className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("list")}
              className="[background:linear-gradient(white,white)_padding-box,linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)_border-box] border-2 border-transparent hover:brightness-110"
            >
              <List className="h-4 w-4 mr-2" style={{ color: "#82298D" }} />
              <span style={{ background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>List</span>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="[background:linear-gradient(white,white)_padding-box,linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)_border-box] border-2 border-transparent hover:brightness-110"
        >
          <Filter className="h-4 w-4 mr-2" style={{ color: "#82298D" }} />
          <span style={{ background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Filter</span>
        </Button>

        {/* Calendar View Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="[background:linear-gradient(white,white)_padding-box,linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)_border-box] border-2 border-transparent hover:brightness-110 w-32"
            >
              <span style={{ background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{getViewLabel()}</span>
              <ChevronDown className="h-4 w-4 ml-2" style={{ color: "#82298D" }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewChange("month")}>
              <Calendar className="h-4 w-4 mr-2" />
              Month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange("week")}>
              <Calendar className="h-4 w-4 mr-2" />
              Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange("list")}>
              <List className="h-4 w-4 mr-2" />
              List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="[background:linear-gradient(white,white)_padding-box,linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)_border-box] border-2 border-transparent hover:brightness-110"
        >
          <span style={{ background: "linear-gradient(256.66deg,#2AA6DE 0%,#82298D 50%,#C9539F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Today</span>
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search events..." className="pl-10 w-64" onChange={(e) => onSearch?.(e.target.value)} />
        </div>
      </div>
    </div>
  )
}
