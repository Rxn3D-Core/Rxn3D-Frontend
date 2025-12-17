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
