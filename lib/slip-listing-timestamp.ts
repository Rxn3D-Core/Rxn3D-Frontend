import { toZonedWallDate } from "@/lib/timezone/index"

/**
 * Lab slip listing timestamp copy: `01/23/25 @ 1:23 pm`
 * Passes through values that already include `@` (API `timestamp` field, Pacific wall time).
 * With `timeZone` (RXN-123), an instant such as `created_at_iso` is shown in that zone, the
 * viewer's selected profile; without it the device zone is used, as before.
 */
export function formatSlipListingTimestamp(value: string, timeZone?: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "—"
  if (trimmed.includes("@")) return trimmed

  const d = timeZone ? toZonedWallDate(trimmed, timeZone) : new Date(trimmed)
  if (!d || Number.isNaN(d.getTime())) return trimmed

  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  const time = d
    .toLocaleTimeString(timeZone ? "en-US" : undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase()

  return `${month}/${day}/${year} @ ${time}`
}
