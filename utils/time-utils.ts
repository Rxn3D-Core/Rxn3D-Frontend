/** Default lab/office open window when hours are missing. */
export const DEFAULT_OPEN_TIME_12 = "09:00 AM"
export const DEFAULT_CLOSE_TIME_12 = "05:00 PM"
export const DEFAULT_PICKUP_TIME_12 = "10:30 AM"
export const DEFAULT_DELIVERY_TIME_12 = "04:00 PM"

/** Las Vegas and Los Angeles share America/Los_Angeles (Pacific). */
export const DEFAULT_DISPLAY_TIMEZONE = "Pacific Time (Las Vegas / Los Angeles)"

type ClockParts = { hours: number; minutes: number }

/** Parse ISO (`...T16:00:00Z`), `HH:mm[:ss]`, or `h:mm AM/PM` into 24h clock parts. */
export function parseClockParts(raw: string | null | undefined): ClockParts | null {
  if (raw == null || String(raw).trim() === "") return null
  const str = String(raw).trim()

  const iso = /T(\d{2}):(\d{2})/.exec(str)
  if (iso) {
    const hours = Number.parseInt(iso[1], 10)
    const minutes = Number.parseInt(iso[2], 10)
    return Number.isFinite(hours) && Number.isFinite(minutes) ? { hours, minutes } : null
  }

  const twelve = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(str)
  if (twelve) {
    let hours = Number.parseInt(twelve[1], 10)
    const minutes = Number.parseInt(twelve[2], 10)
    const pm = twelve[3].toUpperCase() === "PM"
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
    if (pm && hours < 12) hours += 12
    if (!pm && hours === 12) hours = 0
    return { hours, minutes }
  }

  const hms = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(str)
  if (hms) {
    const hours = Number.parseInt(hms[1], 10)
    const minutes = Number.parseInt(hms[2], 10)
    return Number.isFinite(hours) && Number.isFinite(minutes) ? { hours, minutes } : null
  }

  return null
}

/** True when the value is missing or midnight — slip APIs often store a date-only placeholder. */
export function isPlaceholderDeliveryTime(raw: string | null | undefined): boolean {
  const parts = parseClockParts(raw)
  if (!parts) return true
  return parts.hours === 0 && parts.minutes === 0
}

/** Format clock parts as "4:00 PM" (virtual / paper slip header style). */
export function formatClockTo12HourDisplay(hours: number, minutes: number): string {
  const ampm = hours >= 12 ? "PM" : "AM"
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, "0")} ${ampm}`
}

/**
 * Slip `delivery_time` when it is a real clock; otherwise lab
 * `case_schedule.default_delivery_time`; otherwise 4:00 PM.
 */
export function resolveSlipDeliveryTimeDisplay(
  slipDeliveryTime: string | null | undefined,
  defaultDeliveryTime?: string | null
): string {
  if (!isPlaceholderDeliveryTime(slipDeliveryTime)) {
    const parts = parseClockParts(slipDeliveryTime)
    if (parts) return formatClockTo12HourDisplay(parts.hours, parts.minutes)
  }

  const fromSettings = parseClockParts(defaultDeliveryTime)
  if (fromSettings && !(fromSettings.hours === 0 && fromSettings.minutes === 0)) {
    return formatClockTo12HourDisplay(fromSettings.hours, fromSettings.minutes)
  }

  const fallback = parseClockParts(DEFAULT_DELIVERY_TIME_12)
  return fallback
    ? formatClockTo12HourDisplay(fallback.hours, fallback.minutes)
    : "4:00 PM"
}

/**
 * Turn API hour values (`09:00`, `09:00:00`, ISO, or 12-hour) into TimePicker format.
 * Returns `fallback` when the value is empty or unparseable.
 */
export function parseBusinessHourTime(raw: string | null | undefined, fallback = ""): string {
  if (raw == null || String(raw).trim() === "") return fallback
  const str = String(raw).trim()

  if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(str)) {
    const as24 = convertTo24Hour(str)
    return as24 ? convertTo12Hour(as24) : fallback
  }

  const isoClock = str.match(/T(\d{2}:\d{2})/)
  if (isoClock) return convertTo12Hour(isoClock[1])

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const [h, m] = str.split(":")
    return convertTo12Hour(`${h.padStart(2, "0")}:${m}`)
  }

  return fallback
}

/** Profile used to show state name as timezone; fall back to Pacific when unset or not a timezone. */
export function resolveDisplayTimezone(value?: string | null): string {
  const v = (value || "").trim()
  if (!v || /^unknown/i.test(v)) return DEFAULT_DISPLAY_TIMEZONE
  if (v.includes("/") || /GMT|UTC|Pacific|Eastern|Central|Mountain|Time/i.test(v)) return v
  return DEFAULT_DISPLAY_TIMEZONE
}

export function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number)
  const period = hours >= 12 ? "pm" : "am"
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

  return `${hours12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`
}

export function convertTo24Hour(time12: string): string {
  // Handle both "HH : MM am/pm" and "HH:MM am/pm"
  const cleanedTime12 = time12.replace(/\s*:\s*/, ":").trim() // Converts "HH : MM" to "HH:MM"
  const parts = cleanedTime12.split(" ") // ["HH:MM", "am/pm"]

  if (parts.length < 2) {
    // Fallback for unexpected format, e.g., just "08:00" or invalid input
    const [h, m] = cleanedTime12.split(":").map(Number)
    if (isNaN(h) || isNaN(m)) {
      console.warn(`Invalid time format for convertTo24Hour: ${time12}`)
      return "00:00" // Default to a safe value
    }
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }

  const [timePart, period] = parts // timePart = "HH:MM", period = "am/pm"
  const [hoursStr, minutesStr] = timePart.split(":")

  let hours = Number.parseInt(hoursStr)
  const minutes = Number.parseInt(minutesStr)

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid time format for convertTo24Hour: ${time12}`)
    return "00:00" // Default to a safe value
  }

  if (period.toLowerCase() === "pm" && hours !== 12) {
    hours += 12
  } else if (period.toLowerCase() === "am" && hours === 12) {
    hours = 0
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}
