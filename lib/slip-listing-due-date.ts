export type SlipListingDueDateTone = "overdue" | "today" | "upcoming" | "empty"

export type SlipListingDueDateDisplay = {
  label: string
  tone: SlipListingDueDateTone
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatMmDd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${month}/${day}`
}

/** Parse API / listing due-date strings as a local calendar day (no UTC drift). */
export function parseSlipListingDueDate(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
  }

  const usMatch = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(trimmed)
  if (usMatch) {
    const month = Number(usMatch[1])
    const day = Number(usMatch[2])
    let year = usMatch[3] ? Number(usMatch[3]) : new Date().getFullYear()
    if (year < 100) year += 2000
    return new Date(year, month - 1, day)
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return startOfLocalDay(parsed)
}

/**
 * Lab slip listing due-date copy:
 * - overdue: "{n} days past MM/DD"
 * - today: "Due today MM/DD"
 * - future: "{n} days to MM/DD"
 */
export function formatSlipListingDueDate(
  dueDateRaw: string,
  now: Date = new Date(),
): SlipListingDueDateDisplay {
  const due = parseSlipListingDueDate(dueDateRaw)
  if (!due) {
    return { label: "—", tone: "empty" }
  }

  const today = startOfLocalDay(now)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  const mmdd = formatMmDd(due)

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)} days past ${mmdd}`, tone: "overdue" }
  }
  if (diffDays === 0) {
    return { label: `Due today ${mmdd}`, tone: "today" }
  }
  return { label: `${diffDays} days to ${mmdd}`, tone: "upcoming" }
}

/**
 * Compact due-date copy for the listing table: "{n}d · MM/DD".
 * - overdue: "-3d · MM/DD"  · today: "0d · MM/DD"  · future: "7d · MM/DD"
 */
export function formatSlipListingDueDateCompact(
  dueDateRaw: string,
  now: Date = new Date(),
): SlipListingDueDateDisplay {
  const due = parseSlipListingDueDate(dueDateRaw)
  if (!due) {
    return { label: "—", tone: "empty" }
  }

  const today = startOfLocalDay(now)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  const mmdd = formatMmDd(due)
  const tone: SlipListingDueDateTone =
    diffDays < 0 ? "overdue" : diffDays === 0 ? "today" : "upcoming"

  return { label: `${diffDays}d · ${mmdd}`, tone }
}
