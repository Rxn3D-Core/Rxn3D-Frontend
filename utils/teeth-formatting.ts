/**
 * Function to format teeth numbers for display
 * Formats consecutive teeth as ranges (e.g., #4–5) and non-consecutive as individual numbers
 */
export const formatTeethNumbers = (teeth: number[]): string => {
  if (teeth.length === 0) return ""
  const sorted = [...teeth].sort((a, b) => a - b)
  if (sorted.length === 1) return `#${sorted[0]}`

  // Group consecutive teeth into ranges
  const ranges: string[] = []
  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === rangeEnd + 1) {
      // Continue the range
      rangeEnd = sorted[i]
    } else {
      // End the current range and add it to results
      if (rangeStart === rangeEnd) {
        ranges.push(`#${rangeStart}`)
      } else if (rangeEnd === rangeStart + 1) {
        // Only two consecutive teeth, show as individual (e.g., #4, #5)
        ranges.push(`#${rangeStart}, #${rangeEnd}`)
      } else {
        // Three or more consecutive teeth, show as range (e.g., #4–6)
        ranges.push(`#${rangeStart}–${rangeEnd}`)
      }

      // Start a new range
      if (i < sorted.length) {
        rangeStart = sorted[i]
        rangeEnd = sorted[i]
      }
    }
  }

  return ranges.join(", ")
}

/**
 * Function to parse teeth numbers from text (e.g., "#4, #5" or "teeth #4-5" or "#4–5")
 */
export const parseTeethNumbers = (text: string): number[] => {
  const teeth: number[] = []

  // Handle ranges first (both hyphen and en-dash) like #4-5 or #4–5
  const rangePattern = /#(\d+)\s*[-–]\s*#?(\d+)/g
  let rangeMatch
  while ((rangeMatch = rangePattern.exec(text)) !== null) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= 32) {
          teeth.push(i)
        }
      }
    }
  }

  // Match individual teeth numbers like #4, #5, etc.
  const individualPattern = /#(\d+)(?!\s*[-–])/g
  let match
  while ((match = individualPattern.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    if (!isNaN(num) && num >= 1 && num <= 32) {
      teeth.push(num)
    }
  }

  // Remove duplicates and sort
  return [...new Set(teeth)].sort((a, b) => a - b)
}
