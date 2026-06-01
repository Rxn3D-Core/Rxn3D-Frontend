import type { SubscriptionInvoice } from "@/lib/api/billing-subscription"

export type SubscriptionInvoiceFilters = {
  from?: string
  to?: string
  status?: string
}

export type SubscriptionInvoicePagination = {
  page: number
  pageSize: number
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getInvoiceTimestamp(invoice: SubscriptionInvoice): number {
  return toTimestamp(invoice.created_at ?? invoice.paid_at)
}

function normalizeFilterStatus(value?: string): string {
  return (value ?? "all").trim().toLowerCase()
}

function isWithinDateRange(timestamp: number, from?: string, to?: string): boolean {
  if (!timestamp) return !from && !to

  if (from) {
    const fromTimestamp = toTimestamp(`${from}T00:00:00.000Z`)
    if (timestamp < fromTimestamp) return false
  }

  if (to) {
    const toTimestampValue = toTimestamp(`${to}T23:59:59.999Z`)
    if (timestamp > toTimestampValue) return false
  }

  return true
}

export function filterSubscriptionInvoices(
  invoices: SubscriptionInvoice[],
  filters: SubscriptionInvoiceFilters
): SubscriptionInvoice[] {
  const status = normalizeFilterStatus(filters.status)

  return [...invoices]
    .filter((invoice) => {
      const invoiceStatus = (invoice.status ?? "").trim().toLowerCase()
      if (status !== "all" && status !== "" && invoiceStatus !== status) {
        return false
      }

      return isWithinDateRange(getInvoiceTimestamp(invoice), filters.from, filters.to)
    })
    .sort((left, right) => getInvoiceTimestamp(right) - getInvoiceTimestamp(left))
}

export function paginateSubscriptionInvoices(
  invoices: SubscriptionInvoice[],
  pagination: SubscriptionInvoicePagination
): {
  items: SubscriptionInvoice[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
} {
  const safePageSize = Math.max(1, pagination.pageSize)
  const totalItems = invoices.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const page = Math.min(Math.max(1, pagination.page), totalPages)
  const startIndex = (page - 1) * safePageSize

  return {
    items: invoices.slice(startIndex, startIndex + safePageSize),
    page,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  }
}

export function collectDownloadableInvoiceUrls(invoices: SubscriptionInvoice[]): string[] {
  const urls = new Set<string>()

  for (const invoice of invoices) {
    const candidate = invoice.invoice_pdf || invoice.hosted_invoice_url
    if (candidate) {
      urls.add(candidate)
    }
  }

  return Array.from(urls)
}

export function findSubscriptionInvoiceById(
  invoices: SubscriptionInvoice[],
  invoiceId: string | number
): SubscriptionInvoice | null {
  const targetId = Number.parseInt(String(invoiceId), 10)
  if (Number.isNaN(targetId)) return null
  return invoices.find((invoice) => invoice.id === targetId) ?? null
}

export function getSubscriptionInvoiceDisplayAmount(invoice: SubscriptionInvoice) {
  return (
    invoice.amount ??
    invoice.amount_paid ??
    invoice.amount_due ??
    invoice.total_amount ??
    invoice.subtotal ??
    null
  )
}
