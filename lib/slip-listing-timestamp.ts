/**
 * Lab slip listing timestamp copy: `01/23/25 @ 1:23 pm`
 * Passes through values that already include `@` (API `timestamp` field).
 */
export function formatSlipListingTimestamp(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "—"
  if (trimmed.includes("@")) return trimmed

  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return trimmed

  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  const time = d
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase()

  return `${month}/${day}/${year} @ ${time}`
}
