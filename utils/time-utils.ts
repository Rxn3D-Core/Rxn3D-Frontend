/** Default lab/office open window when hours are missing. */
export const DEFAULT_OPEN_TIME_12 = "09:00 AM"
export const DEFAULT_CLOSE_TIME_12 = "05:00 PM"
export const DEFAULT_PICKUP_TIME_12 = "10:30 AM"
export const DEFAULT_DELIVERY_TIME_12 = "04:00 PM"

/** Las Vegas and Los Angeles share America/Los_Angeles (Pacific). */
export const DEFAULT_DISPLAY_TIMEZONE = "Pacific Time (Las Vegas / Los Angeles)"

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
