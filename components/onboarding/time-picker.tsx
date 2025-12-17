"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState("12")
  const [minute, setMinute] = useState("00")
  const [period, setPeriod] = useState<"am" | "pm">("am")

  const hourInputRef = useRef<HTMLInputElement>(null)
  const minuteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!value) {
      setHour("12")
      setMinute("00")
      setPeriod("am")
      return
    }
  
    try {
      const cleanedValue = value.trim().replace(/\s*:\s*/, ":")
      const parts = cleanedValue.split(" ")
  
      if (parts.length < 2) {
        console.warn("Invalid time format for TimePicker useEffect:", value)
        setHour("12")
        setMinute("00")
        setPeriod("am")
        return
      }
  
      const [hourMinuteRaw, periodRaw] = parts 
      const [hStr = "12", mStr = "00"] = hourMinuteRaw.split(":")
  
      // Defensive parsing and fallback
      const hourParsed = Number.parseInt(hStr, 10)
      const minuteParsed = Number.parseInt(mStr, 10)
  
      const validHour = !isNaN(hourParsed) && hourParsed >= 1 && hourParsed <= 12 ? hourParsed : 12
      const validMinute = !isNaN(minuteParsed) && minuteParsed >= 0 && minuteParsed <= 59 ? minuteParsed : 0
  
      const period = periodRaw?.toLowerCase() === "pm" ? "pm" : "am"
      setHour(validHour.toString())
      setMinute(validMinute.toString().padStart(2, "0"))
      setPeriod(period)
    } catch (error) {
      console.error("Failed to parse value in TimePicker useEffect:", value, error)
      setHour("12")
      setMinute("00")
      setPeriod("am")
    }
  }, [value])
  

  const handleApply = () => {
    let h = parseInt(hour, 10)
    let m = parseInt(minute, 10)
  
    h = isNaN(h) ? 12 : Math.max(1, Math.min(12, h))
    m = isNaN(m) ? 0 : Math.max(0, Math.min(59, m))
  
    const formattedHour = h.toString().padStart(2, "0")
    const formattedMinute = m.toString().padStart(2, "0")
  
    onChange(`${formattedHour}:${formattedMinute} ${period}`)
    setOpen(false)
  }
  
  
  

  const handleClear = () => {
    setHour("12")
    setMinute("00")
    setPeriod("am")
    onChange("")
  }

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "")
    setHour(val)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "")
    setMinute(val)
  }

  const handleHourBlur = () => {
    const h = Number.parseInt(hour)
    setHour(!isNaN(h) ? Math.max(1, Math.min(12, h)).toString() : "12")
  }

  const handleMinuteBlur = () => {
    const m = Number.parseInt(minute)
    setMinute(!isNaN(m) ? Math.max(0, Math.min(59, m)).toString().padStart(2, "0") : "00")
  }

  const increment = (val: number, max: number, min: number) => (val + 1 > max ? min : val + 1)
  const decrement = (val: number, max: number, min: number) => (val - 1 < min ? max : val - 1)

  const incrementHour = () => {
    const h = Number.parseInt(hour) || 12
    setHour(increment(h, 12, 1).toString())
  }

  const decrementHour = () => {
    const h = Number.parseInt(hour) || 12
    setHour(decrement(h, 12, 1).toString())
  }

  const incrementMinute = () => {
    const m = Number.parseInt(minute) || 0
    setMinute(increment(m, 59, 0).toString().padStart(2, "0"))
  }

  const decrementMinute = () => {
    const m = Number.parseInt(minute) || 0
    setMinute(decrement(m, 59, 0).toString().padStart(2, "0"))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input value={value || ""} readOnly className={cn("pr-10", className)} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full text-[#1162a8]"
            onClick={() => setOpen(true)}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-center text-gray-500">
            <div>Hour</div>
            <div>Minute</div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {/* Hour Picker */}
            <div className="flex-1 flex flex-col items-center">
              <button className="p-1 text-[#1162a8]" onClick={incrementHour} type="button">
                ▲
              </button>
              <div className="bg-[#f2f8ff] rounded w-full">
                <input
                  ref={hourInputRef}
                  type="text"
                  value={hour}
                  onChange={handleHourChange}
                  onBlur={handleHourBlur}
                  className="w-full text-center bg-transparent text-[#1162a8] text-5xl font-bold h-16 focus:outline-none"
                  maxLength={2}
                />
              </div>
              <button className="p-1 text-[#1162a8]" onClick={decrementHour} type="button">
                ▼
              </button>
            </div>

            {/* Minute Picker */}
            <div className="flex-1 flex flex-col items-center">
              <button className="p-1 text-[#1162a8]" onClick={incrementMinute} type="button">
                ▲
              </button>
              <div className="bg-[#f2f8ff] rounded w-full">
                <input
                  ref={minuteInputRef}
                  type="text"
                  value={minute}
                  onChange={handleMinuteChange}
                  onBlur={handleMinuteBlur}
                  className="w-full text-center bg-transparent text-[#1162a8] text-5xl font-bold h-16 focus:outline-none"
                  maxLength={2}
                />
              </div>
              <button className="p-1 text-[#1162a8]" onClick={decrementMinute} type="button">
                ▼
              </button>
            </div>

            {/* AM/PM Toggle */}
            <div className="flex flex-col gap-2">
              {["am", "pm"].map((p) => (
                <button
                  key={p}
                  className={`px-4 py-2 rounded text-white ${period === p ? "bg-[#1162a8]" : "bg-gray-300"}`}
                  onClick={() => setPeriod(p as "am" | "pm")}
                  type="button"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              className="bg-[#f2f8ff] border-[#f2f8ff] hover:bg-[#dfeefb]"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button className="bg-[#1162a8] hover:bg-[#1162a8]/90 text-white" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
