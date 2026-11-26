/**
 * RXN-90: maps a product invoice list row to the same display row the slip (stage) invoice listing uses
 * (office code, patient, U/L, product, grade, stage, base total, add-ons, sub total, R%, gross, due date, status).
 *
 * Field order of preference: the list row's own fields (requested from the backend), then `products[].sections`
 * lines when the row carries them, then "—". One row per product when the list row has `products[]`.
 */
import type {
  ProductInvoiceListAddon,
  ProductInvoiceListItem,
  ProductInvoiceListProduct,
  ProductInvoiceSection,
} from "@/types/product-invoicing"
import {
  formatChargeMoney,
  formatShortDate,
  formatShortDay,
  mapInvoiceStatusToLabel,
  mapProductType,
} from "@/lib/billing/charge-row-format"
import { zonedNow } from "@/lib/timezone/index"
import { readViewerTimeZone } from "@/lib/timezone/viewer"

export type ProductChargeRow = {
  id: string
  invoiceId: number
  invoiceNumber: string
  caseId: number
  slipId: number | null
  officeId: number | null
  officeCode: string
  officeName: string
  patient: string
  ul: string
  product: string
  variation: string
  grade: string
  stage: string
  baseTotal: string
  /** One add-on per line: "Name xQty". */
  addOn: string
  /** Per add-on totals, aligned line by line with `addOn` (same as the slip listing). */
  subTotal: string
  rPercent: string
  gross: string
  /** Numeric gross for selection totals. */
  grossValue: number
  dueDate: string
  status: string
  rawStatus: string
  onStatement: boolean
}

const present = (v: unknown): boolean => v !== undefined && v !== null && v !== ""

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function billable(sections: ProductInvoiceSection[] | null | undefined): ProductInvoiceSection[] {
  return (sections ?? []).filter((s) => !s.is_reference)
}

type AddonAgg = { name: string; qty: number; total: number }

function aggregateAddons(addons: Array<{ name: string; qty: number; total: number }>): AddonAgg[] {
  const byName = new Map<string, AddonAgg>()
  for (const a of addons) {
    const name = a.name.trim()
    if (!name) continue
    const key = name.replace(/\s+/g, " ").toLowerCase()
    const cur = byName.get(key)
    byName.set(key, { name: cur?.name ?? name, qty: (cur?.qty ?? 0) + a.qty, total: round2((cur?.total ?? 0) + a.total) })
  }
  return Array.from(byName.values())
}

function addonsFromList(list: ProductInvoiceListAddon[]): AddonAgg[] {
  return aggregateAddons(
    list.map((a) => {
      const qtyRaw = num(a.quantity)
      const qty = qtyRaw > 0 ? qtyRaw : 1
      const total = present(a.total) ? num(a.total) : num(a.price) * qty
      return { name: String(a.name ?? a.addon_name ?? ""), qty, total }
    }),
  )
}

function addonsFromSections(sections: ProductInvoiceSection[]): AddonAgg[] {
  return aggregateAddons(
    billable(sections).flatMap((s) =>
      (s.lines ?? [])
        .filter((l) => l.line_type === "addon")
        .map((l) => {
          const qtyRaw = num(l.quantity)
          return { name: String(l.name ?? ""), qty: qtyRaw > 0 ? qtyRaw : 1, total: num(l.total) }
        }),
    ),
  )
}

function sumLines(sections: ProductInvoiceSection[], types: string[]): number | null {
  let found = false
  let sum = 0
  for (const s of billable(sections)) {
    for (const l of s.lines ?? []) {
      if (types.includes(l.line_type)) {
        found = true
        sum += num(l.total)
      }
    }
  }
  return found ? round2(sum) : null
}

/** "10%" for one rush rate, "10% / 20%" when stages were rushed at different rates, "—" when none. */
function rushLabel(percent: unknown, fee: unknown, sections: ProductInvoiceSection[]): string {
  if (present(percent) && num(percent) > 0) return `${num(percent)}%`
  const rates = Array.from(
    new Set(billable(sections).filter((s) => num(s.rush_fee) > 0).map((s) => num(s.rush_percentage))),
  ).filter((r) => r > 0)
  if (rates.length > 0) return rates.map((r) => `${r}%`).join(" / ")
  if (present(fee) && num(fee) > 0) return formatChargeMoney(num(fee))
  return "—"
}

function firstSectionValue(sections: ProductInvoiceSection[], key: "grade_name" | "variation_name"): string | null {
  for (const s of billable(sections)) {
    const v = s[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

export function productInvoiceToRows(item: ProductInvoiceListItem): ProductChargeRow[] {
  const products: (ProductInvoiceListProduct | null)[] =
    Array.isArray(item.products) && item.products.length > 0 ? item.products : [null]
  const single = products.length === 1
  const status = mapInvoiceStatusToLabel(item.status)
  const base = {
    invoiceId: item.id,
    invoiceNumber: item.invoice_number,
    caseId: item.case_id,
    slipId: typeof item.slip_id === "number" && item.slip_id > 0 ? item.slip_id : null,
    officeId: typeof item.office_id === "number" ? item.office_id : null,
    officeCode: item.office_code?.trim() || "—",
    officeName: item.office_name?.trim() || "—",
    patient: item.patient_name?.trim() || "—",
    ul: mapProductType(item.arch),
    stage: "All stages",
    // RXN-123: `due_date` is date-only (never shifted); the fallbacks are instants on the viewer's calendar.
    dueDate: item.due_date ? formatShortDay(item.due_date) : formatShortDate(item.finalized_at ?? item.created_at),
    status,
    rawStatus: String(item.status ?? ""),
    onStatement: !!item.on_statement,
  }

  return products.map((p, idx) => {
    // Row-level fields describe the invoice's only product; with several products each block carries its own.
    const src = (p ?? {}) as ProductInvoiceListProduct
    const fallback = single ? item : ({} as ProductInvoiceListItem)
    const sections = src.sections ?? []

    const productName =
      src.product_name?.trim() ||
      fallback.product_name?.trim() ||
      (!p && (item.products_count ?? 1) > 1 ? `${item.products_count} products` : "—")

    const addonsSource = src.addons ?? fallback.addons
    const addons = Array.isArray(addonsSource) ? addonsFromList(addonsSource) : addonsFromSections(sections)

    const baseTotal = present(src.base_total)
      ? num(src.base_total)
      : present(fallback.base_total)
        ? num(fallback.base_total)
        : sumLines(sections, ["stage_base"])

    const grossRaw = present(src.gross_amount)
      ? src.gross_amount
      : present(src.product_total)
        ? src.product_total
        : single
          ? (present(item.gross_amount) ? item.gross_amount : item.total_amount)
          : null

    return {
      ...base,
      id: `pi-${item.id}-${p?.product_id ?? "row"}-${idx}`,
      product: productName,
      variation: src.variation_name?.trim() || fallback.variation_name?.trim() || firstSectionValue(sections, "variation_name") || "—",
      grade: src.grade_name?.trim() || fallback.grade_name?.trim() || firstSectionValue(sections, "grade_name") || "—",
      baseTotal: baseTotal == null ? "—" : formatChargeMoney(baseTotal),
      addOn: addons.length ? addons.map((a) => `${a.name} x${a.qty}`).join("\n") : "—",
      subTotal: addons.length ? addons.map((a) => formatChargeMoney(a.total)).join("\n") : "—",
      rPercent: rushLabel(
        present(src.rush_percentage) ? src.rush_percentage : fallback.rush_percentage,
        present(src.rush_fee) ? src.rush_fee : fallback.rush_fee,
        sections,
      ),
      gross: formatChargeMoney(grossRaw as string | number | null),
      grossValue: num(grossRaw),
    }
  })
}

/** Date presets for the product list (`date_from` / `date_to` on `finalized_at`), as YYYY-MM-DD. */
export type ProductInvoiceDatePreset = "all" | "today" | "this_week" | "this_month" | "last_month" | "this_year"

/** "Today" and the other presets are on the viewer's (selected profile) calendar (RXN-123). */
export function productInvoiceDateRange(
  preset: ProductInvoiceDatePreset,
  now: Date = zonedNow(readViewerTimeZone()),
): { date_from?: string; date_to?: string } {
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (preset) {
    case "today":
      return { date_from: ymd(today), date_to: ymd(today) }
    case "this_week": {
      const start = new Date(today)
      start.setDate(today.getDate() - ((today.getDay() + 6) % 7)) // Monday
      return { date_from: ymd(start), date_to: ymd(today) }
    }
    case "this_month":
      return { date_from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), date_to: ymd(today) }
    case "last_month":
      return {
        date_from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        date_to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    case "this_year":
      return { date_from: ymd(new Date(today.getFullYear(), 0, 1)), date_to: ymd(today) }
    default:
      return {}
  }
}
