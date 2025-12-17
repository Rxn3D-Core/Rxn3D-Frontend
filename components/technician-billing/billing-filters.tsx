"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

interface BillingFiltersProps {
  onDateChange: (dates: { start: Date; end: Date }) => void
}

export function BillingFilters({ onDateChange }: BillingFiltersProps) {
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  const handleDateSelect = (date: Date | undefined, isStart: boolean) => {
    if (isStart) {
      setStartDate(date)
    } else {
      setEndDate(date)
    }

    if (date && startDate && !isStart) {
      onDateChange({ start: startDate, end: date })
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "PPP") : "Start date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={startDate} onSelect={(date) => handleDateSelect(date, true)} initialFocus />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, "PPP") : "End date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={endDate} onSelect={(date) => handleDateSelect(date, false)} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )
}
