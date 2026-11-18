/**
 * Cell formatting shared by the Charge Management slip (stage) invoice list and the RXN-90 product invoice list,
 * so both listings render money, dates, U/L and statuses the same way.
 */

/** Money cell: "—" for empty or unparsable values. */
export function formatChargeMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
}

/** "Upper" / "Lower" (product type or arch) -> "U" / "L". */
export function mapProductType(ul: string | null | undefined): string {
  if (!ul) return "—"
  const t = ul.toLowerCase()
  if (t.includes("upper")) return "U"
  if (t.includes("lower")) return "L"
  return ul
}

export function mapInvoiceStatusToLabel(status: string | null | undefined): string {
  if (!status) return "—"
  const s = status.toLowerCase()
  if (s === "pending") return "Pending"
  if (s === "unbilled") return "Unbilled"
  if (s === "checked") return "Checked"
  if (s === "billed") return "Billed"
  if (s === "paid") return "Paid"
  if (s === "refunded") return "Refunded"
  if (s === "disputed") return "Disputed"
  if (s === "sent") return "Sent"
  if (s === "overdue") return "Overdue"
  if (s === "cancelled") return "Cancelled"
  return status
}

/** Badge colours for the status labels above. */
export function chargeStatusBadgeClass(status: string): string {
  switch (status) {
    case "Checked":
      return "bg-[#D4F4DD] text-[#14804A]"
    case "Billed":
      return "bg-[#E5E7EB] text-[#6B7280]"
    case "Paid":
    case "Pending":
      return "bg-[#D4F4DD] text-[#14804A]"
    case "Refunded":
      return "bg-[#FFD6D9] text-[#E12D39]"
    case "Disputed":
    case "Overdue":
      return "bg-[#FFECCC] text-[#CC6600]"
    case "Unbilled":
      return "bg-[#E5E7EB] text-[#4B5563]"
    case "Cancelled":
      return "bg-[#E5E7EB] text-[#4B5563]"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

/** Row tint used by the slip listing: billed green, checked blue, otherwise zebra. */
export function chargeRowClass(statusLabel: string, index: number): string {
  const s = statusLabel.toLowerCase()
  if (s === "billed") return "bg-green-100/70 hover:bg-green-100/70"
  if (s === "checked") return "bg-blue-100/70 hover:bg-blue-100/70"
  return index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
}
