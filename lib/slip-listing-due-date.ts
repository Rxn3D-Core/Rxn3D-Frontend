export type SlipListingDueDateTone = "overdue" | "today" | "upcoming" | "empty"

export type SlipListingDueDateDisplay = {
  label: string
  tone: SlipListingDueDateTone
}

export type SlipListingBusinessHour = {
  day: string
  is_open: boolean
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatMmDd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${month}/${day}`
}

function formatIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Lab working days after `from` up to and including `to` (both local days).
 * Mirrors the backend DeliveryDateService: open business-hour days (Mon-Fri when
 * none are configured) that are not Lab holidays (exact YYYY-MM-DD dates).
 */
function countLabWorkingDaysBetween(
  from: Date,
  to: Date,
  businessHours?: readonly SlipListingBusinessHour[] | null,
  holidays?: readonly string[] | null,
): number {
  const configuredDays = businessHours?.length
    ? new Set(businessHours.filter((hour) => hour.is_open).map((hour) => hour.day.toLowerCase()))
    : new Set(WEEKDAYS.slice(0, 5))
  const holidayDays = new Set((holidays ?? []).map((date) => date.slice(0, 10)))

  let count = 0
  const current = new Date(from)
  current.setDate(current.getDate() + 1)
  while (current.getTime() <= to.getTime()) {
    const weekday = WEEKDAYS[(current.getDay() + 6) % 7]
    if (configuredDays.has(weekday) && !holidayDays.has(formatIsoDay(current))) count += 1
    current.setDate(current.getDate() + 1)
  }
  return count
}

/** Count Lab working days after the due date through the current local date. */
export function countSlipListingOverdueWorkingDays(
  dueDate: Date,
  now: Date = new Date(),
  businessHours?: readonly SlipListingBusinessHour[] | null,
  holidays?: readonly string[] | null,
): number {
  const today = startOfLocalDay(now)
  const due = startOfLocalDay(dueDate)
  if (due.getTime() >= today.getTime()) return 0
  return countLabWorkingDaysBetween(due, today, businessHours, holidays)
}

/** Count Lab working days after the current local date up to and including the due date. */
export function countSlipListingUpcomingWorkingDays(
  dueDate: Date,
  now: Date = new Date(),
  businessHours?: readonly SlipListingBusinessHour[] | null,
  holidays?: readonly string[] | null,
): number {
  const today = startOfLocalDay(now)
  const due = startOfLocalDay(dueDate)
  if (due.getTime() <= today.getTime()) return 0
  return countLabWorkingDaysBetween(today, due, businessHours, holidays)
}

/** Case Management counts both future countdowns and overdue ages in Lab working days. */
export function formatCaseManagementDueDate(
  dueDate: Date,
  now: Date = new Date(),
  businessHours?: readonly SlipListingBusinessHour[] | null,
  holidays?: readonly string[] | null,
): string {
  const due = startOfLocalDay(dueDate)
  const today = startOfLocalDay(now)
  const mmdd = formatMmDd(due)

  if (due.getTime() < today.getTime()) {
    return `${countSlipListingOverdueWorkingDays(due, today, businessHours, holidays)}d ago · ${mmdd}`
  }
  if (due.getTime() === today.getTime()) return `Today · ${mmdd}`
  return `${countSlipListingUpcomingWorkingDays(due, today, businessHours, holidays)}d · ${mmdd}`
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
