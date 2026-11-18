/**
 * RXN-90 pure helpers for product-based invoicing (no React, no I/O) so they run under node:test.
 */
import type {
  CancellationChoice,
  ChargeFrequency,
  InvoicingMode,
  PartialType,
  ProductInvoiceListItem,
  ProductInvoiceProduct,
  ProductInvoiceSection,
} from "@/types/product-invoicing"

export const INVOICING_MODES: readonly InvoicingMode[] = ["stage", "product"]
export const CHARGE_FREQUENCIES: readonly ChargeFrequency[] = ["per_stage", "per_case"]
export const PRODUCT_INVOICE_STATUSES = ["pending", "checked", "billed", "paid", "overdue"] as const

/** API money (string "12.50", number, null) -> number; anything unparsable is 0. */
export function toMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function formatMoney(value: unknown): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(toMoney(value))
}

export function normalizeInvoicingMode(raw: unknown): InvoicingMode {
  return raw === "product" ? "product" : "stage"
}

/** Missing or unknown values keep today's behavior (`per_stage`). */
export function normalizeChargeFrequency(raw: unknown): ChargeFrequency {
  return raw === "per_case" ? "per_case" : "per_stage"
}

/**
 * Line price, regenerate and cancellation decisions are allowed only while the invoice is pending/checked and off any
 * statement. The show payload's `is_locked`, when sent, is the backend's own answer and wins.
 */
export function isProductInvoiceEditable(invoice: {
  status?: string | null
  on_statement?: boolean | null
  is_locked?: boolean | null
}): boolean {
  if (invoice.is_locked === true) return false
  const status = (invoice.status ?? "").toLowerCase()
  return (status === "pending" || status === "checked") && !invoice.on_statement
}

/** Delete is allowed only for a pending invoice that is not on a statement. */
export function isProductInvoiceDeletable(invoice: {
  status?: string | null
  on_statement?: boolean | null
  is_locked?: boolean | null
}): boolean {
  if (invoice.is_locked === true) return false
  return (invoice.status ?? "").toLowerCase() === "pending" && !invoice.on_statement
}

export interface CancellationInput {
  choice: CancellationChoice
  partialType?: PartialType | null
  /** Raw text from the input; parsed here so the dialog can validate as the user types. */
  partialValue?: string | number | null
  fullAmount: string | number
}

export type CancellationInputError =
  | "partialTypeRequired"
  | "partialValueRequired"
  | "partialValuePositive"
  | "percentMax"
  | "amountMax"

/** Mirrors the PUT cancellation-billing validation so the dialog can block bad input before the request. */
export function validateCancellationInput(input: CancellationInput): CancellationInputError | null {
  if (input.choice !== "partial") return null
  if (input.partialType !== "amount" && input.partialType !== "percent") return "partialTypeRequired"
  const raw = input.partialValue
  if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) return "partialValueRequired"
  const value = typeof raw === "number" ? raw : Number.parseFloat(raw)
  if (!Number.isFinite(value) || value <= 0) return "partialValuePositive"
  if (input.partialType === "percent" && value > 100) return "percentMax"
  if (input.partialType === "amount" && value > toMoney(input.fullAmount) + 0.0001) return "amountMax"
  return null
}

/**
 * Amount the lab will charge for a cancelled product (same rule as the backend):
 * full = full_amount, partial amount = value, partial percent = round(full * value / 100, 2), none = 0.
 * Invalid input returns null so the dialog shows no preview.
 */
export function computeCancellationCharge(input: CancellationInput): number | null {
  if (validateCancellationInput(input)) return null
  const full = toMoney(input.fullAmount)
  if (input.choice === "none") return 0
  if (input.choice === "full") return roundMoney(full)
  const value = toMoney(input.partialValue)
  return input.partialType === "percent" ? roundMoney((full * value) / 100) : roundMoney(value)
}

/** Stage sections in display order: stage sections by sequence (then id), cancellation sections last. */
export function orderSections(sections: ProductInvoiceSection[]): ProductInvoiceSection[] {
  return [...sections].sort((a, b) => {
    const kindA = a.kind === "cancellation" ? 1 : 0
    const kindB = b.kind === "cancellation" ? 1 : 0
    if (kindA !== kindB) return kindA - kindB
    const seqA = a.stage_sequence ?? Number.MAX_SAFE_INTEGER
    const seqB = b.stage_sequence ?? Number.MAX_SAFE_INTEGER
    if (seqA !== seqB) return seqA - seqB
    return a.id - b.id
  })
}

/** Sum of a product's sections that count toward the invoice (reference sections are display only). */
export function sumBillableSections(sections: ProductInvoiceSection[]): number {
  return roundMoney(sections.reduce((sum, s) => (s.is_reference ? sum : sum + toMoney(s.section_total)), 0))
}

/** Invoice total computed from its products; used to flag a mismatch with the header total. */
export function sumInvoiceProducts(products: ProductInvoiceProduct[]): number {
  return roundMoney(products.reduce((sum, p) => sum + sumBillableSections(p.sections ?? []), 0))
}

/**
 * Statement generation from the Product invoices list: every selected invoice must belong to one office
 * and not already be on a statement. Returns the office id, or an error code.
 */
export function resolveStatementSelection(
  rows: Array<Pick<ProductInvoiceListItem, "office_id" | "on_statement">>,
): { officeId: number } | { error: "empty" | "mixedOffices" | "alreadyOnStatement" } {
  if (rows.length === 0) return { error: "empty" }
  if (rows.some((r) => r.on_statement)) return { error: "alreadyOnStatement" }
  const offices = new Set(rows.map((r) => r.office_id))
  if (offices.size !== 1) return { error: "mixedOffices" }
  const [officeId] = Array.from(offices)
  if (typeof officeId !== "number") return { error: "mixedOffices" }
  return { officeId }
}

/** A statement row that came from a product invoice (one line per product, stage "All stages"). */
export function isProductInvoiceStatementItem(item: {
  source?: string | null
  product_invoice_id?: number | null
} | null | undefined): boolean {
  if (!item) return false
  return item.source === "product_invoice" || (item.product_invoice_id != null && item.product_invoice_id !== 0)
}

/**
 * Best message from an API error body. Handles both envelopes the backend uses:
 * business rules `{ success:false, message, error, errors? }` and FormRequest validation
 * `{ status:false, message, data:{ field:[...] } }`. A field message beats the generic one.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback
  const b = body as { message?: unknown; errors?: unknown; data?: unknown }
  for (const bag of [b.errors, b.data]) {
    if (bag && typeof bag === "object" && !Array.isArray(bag)) {
      for (const value of Object.values(bag as Record<string, unknown>)) {
        const first = Array.isArray(value) ? value[0] : value
        if (typeof first === "string" && first.trim()) return first
      }
    }
  }
  return typeof b.message === "string" && b.message.trim() ? b.message : fallback
}
