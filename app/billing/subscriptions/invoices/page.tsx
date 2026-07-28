"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Calendar as CalendarIcon, Download, ExternalLink } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { type SubscriptionInvoice, listSubscriptionInvoices } from "@/lib/api/billing-subscription"
import { resolveBillingCustomerId } from "@/lib/billing-subscription/customer-context"
import {
  collectDownloadableInvoiceUrls,
  filterSubscriptionInvoices,
  getSubscriptionInvoiceDisplayAmount,
  paginateSubscriptionInvoices,
} from "@/lib/billing-subscription/subscription-invoices"
import { formatBillingDate, formatCurrency } from "@/lib/billing-subscription/plan-helpers"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type InvoiceStatusOption = "all" | "paid" | "pending" | "failed" | "refunded"

type FilterDraft = {
  from: string
  to: string
  status: InvoiceStatusOption
}

const PAGE_SIZE = 10

const DEFAULT_FILTERS: FilterDraft = {
  from: "",
  to: "",
  status: "all",
}

const STATUS_OPTIONS: Array<{ value: InvoiceStatusOption; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
]

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined
  try {
    return parseISO(value)
  } catch {
    return undefined
  }
}

function formatDateInput(date?: Date): string {
  return date ? format(date, "yyyy-MM-dd") : ""
}

function formatDateTriggerValue(value: string, placeholder: string): string {
  const parsed = parseDateInput(value)
  return parsed ? format(parsed, "yyyy-MM-dd") : placeholder
}

function getStatusPillClasses(status?: string | null): string {
  switch ((status ?? "").trim().toLowerCase()) {
    case "paid":
      return "bg-[#DDF7EA] text-[#22A75A]"
    case "failed":
      return "bg-[#FCE3E3] text-[#EB4D4D]"
    case "pending":
      return "bg-[#FEF0DA] text-[#FF9900]"
    case "refunded":
      return "bg-[#E5E7EB] text-[#6B7280]"
    default:
      return "bg-[#E9EEF5] text-[#4B5563]"
  }
}

function formatStatusLabel(status?: string | null): string {
  if (!status) return "Unknown"
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function getInvoiceDownloadUrl(invoice: SubscriptionInvoice): string | null {
  return invoice.invoice_pdf || invoice.hosted_invoice_url || null
}

function getInvoiceHostedUrl(invoice: SubscriptionInvoice): string | null {
  return invoice.hosted_invoice_url || null
}

function getInvoiceDateLabel(value?: string | null): string {
  return value ? formatBillingDate(value) : "—"
}

function openInvoiceLinks(urls: string[]) {
  urls.forEach((url, index) => {
    window.setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer")
    }, index * 120)
  })
}

function FilterDateField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  const selectedDate = parseDateInput(value)

  return (
    <div className="min-w-[170px]">
      <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between rounded-md border-[#D9E1EC] px-3 text-sm font-normal text-[#111827] hover:bg-white"
          >
            <span>{formatDateTriggerValue(value, placeholder)}</span>
            <CalendarIcon className="ml-3 h-4 w-4 shrink-0 text-[#6B7280]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(formatDateInput(date))}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default function SubscriptionInvoicesPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([])
  const [draftFilters, setDraftFilters] = useState<FilterDraft>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterDraft>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const customerId = resolveBillingCustomerId(user, typeof window !== "undefined" ? window.localStorage : null)

    if (!customerId && user === null) return

    if (!customerId) {
      setInvoices([])
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(null)

    listSubscriptionInvoices(customerId)
      .then((response) => {
        if (!isMounted) return
        setInvoices(response)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Failed to load invoices"
        setError(message)
        setInvoices([])
      })
      .finally(() => {
        if (!isMounted) return
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  const filteredInvoices = useMemo(
    () =>
      filterSubscriptionInvoices(invoices, {
        from: appliedFilters.from,
        to: appliedFilters.to,
        status: appliedFilters.status,
      }),
    [invoices, appliedFilters]
  )

  const paginatedInvoices = useMemo(
    () =>
      paginateSubscriptionInvoices(filteredInvoices, {
        page,
        pageSize: PAGE_SIZE,
      }),
    [filteredInvoices, page]
  )

  useEffect(() => {
    setPage(1)
  }, [appliedFilters])

  const downloadableUrls = useMemo(
    () => collectDownloadableInvoiceUrls(filteredInvoices),
    [filteredInvoices]
  )

  const rangeStart = filteredInvoices.length === 0 ? 0 : (paginatedInvoices.page - 1) * PAGE_SIZE + 1
  const rangeEnd = filteredInvoices.length === 0 ? 0 : Math.min(rangeStart + paginatedInvoices.items.length - 1, filteredInvoices.length)

  return (
    <div className="min-h-full bg-[#F6F6F6] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/billing/subscriptions"
              className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#1162A8] transition-colors hover:text-[#0D4C83]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to subscriptions
            </Link>
            <h1 className="text-[2.25rem] font-semibold leading-none tracking-[-0.02em] text-[#111827]">Invoices</h1>
            <p className="mt-1.5 text-base text-[#6B7280]">View and download all your billing records.</p>
          </div>

          <Button
            variant="outline"
            className="h-10 gap-2 self-start border-[#D9E1EC] px-4 text-sm text-[#111827] hover:border-[#1162A8] hover:bg-white"
            onClick={() => openInvoiceLinks(downloadableUrls)}
            disabled={downloadableUrls.length === 0}
          >
            <Download className="h-4 w-4" />
            Download All
          </Button>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-[0_2px_18px_rgba(15,23,42,0.04)]">
          <div className="border-b border-[#E7EDF4] px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-end gap-3">
              <FilterDateField
                label="Date From"
                value={draftFilters.from}
                placeholder="Start date"
                onChange={(value) => setDraftFilters((current) => ({ ...current, from: value }))}
              />
              <FilterDateField
                label="Date To"
                value={draftFilters.to}
                placeholder="End date"
                onChange={(value) => setDraftFilters((current) => ({ ...current, to: value }))}
              />
              <div className="min-w-[190px]">
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Status</label>
                <Select
                  value={draftFilters.status}
                  onValueChange={(value: InvoiceStatusOption) =>
                    setDraftFilters((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-md border border-[#D9E1EC] bg-white px-3 text-left text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="h-10 min-w-[124px] self-end px-4 text-sm"
                onClick={() => setAppliedFilters(draftFilters)}
              >
                Apply Filter
              </Button>
              <button
                type="button"
                className="h-10 self-end px-1 text-sm font-medium text-[#1162A8] transition-colors hover:text-[#0D4C83]"
                onClick={() => {
                  setDraftFilters(DEFAULT_FILTERS)
                  setAppliedFilters(DEFAULT_FILTERS)
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-white text-left">
                  {["Invoice #", "Dates", "Amounts", "Status", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-[#E7EDF4] px-4 py-4 text-sm font-semibold text-[#6B7280] first:pl-5"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#6B7280]">
                      Loading invoices...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#CF0202]">
                      {error}
                    </td>
                  </tr>
                ) : paginatedInvoices.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#6B7280]">
                      No invoices matched the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.items.map((invoice) => {
                    const downloadUrl = getInvoiceDownloadUrl(invoice)
                    const hostedInvoiceUrl = getInvoiceHostedUrl(invoice)

                    return (
                      <tr key={invoice.id} className="bg-white">
                        <td className="border-b border-[#E7EDF4] px-4 py-4 first:pl-5">
                          <p className="text-[15px] font-semibold text-[#111827]">
                            {invoice.invoice_number || `INV-${invoice.id}`}
                          </p>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {invoice.customer?.name || invoice.customer?.email || "Subscription billing"}
                          </p>
                        </td>
                        <td className="border-b border-[#E7EDF4] px-4 py-4 text-[14px] text-[#6B7280]">
                          <p>
                            Created: <span className="text-[#111827]">{getInvoiceDateLabel(invoice.created_at)}</span>
                          </p>
                          <p>
                            Paid: <span className="text-[#111827]">{getInvoiceDateLabel(invoice.paid_at)}</span>
                          </p>
                        </td>
                        <td className="border-b border-[#E7EDF4] px-4 py-4 text-[14px] text-[#6B7280]">
                          <p>
                            Paid:{" "}
                            <span className="font-semibold text-[#111827]">
                              {formatCurrency(invoice.amount_paid, invoice.currency || "USD")}
                            </span>
                          </p>
                          <p>
                            Due:{" "}
                            <span className="font-semibold text-[#111827]">
                              {formatCurrency(invoice.amount_due ?? getSubscriptionInvoiceDisplayAmount(invoice), invoice.currency || "USD")}
                            </span>
                          </p>
                        </td>
                        <td className="border-b border-[#E7EDF4] px-4 py-4">
                          <span
                            className={`inline-flex min-w-[96px] justify-center rounded-full px-3 py-1 text-sm font-semibold ${getStatusPillClasses(invoice.status)}`}
                          >
                            {formatStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="border-b border-[#E7EDF4] px-4 py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              href={`/billing/subscriptions/invoices/${invoice.id}`}
                              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1162A8] transition-colors hover:text-[#0D4C83]"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View
                            </Link>
                            {hostedInvoiceUrl ? (
                              <a
                                href={hostedInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1162A8] transition-colors hover:text-[#0D4C83]"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Hosted
                              </a>
                            ) : null}
                            {downloadUrl ? (
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#D9E1EC] px-4 text-[15px] font-medium text-[#374151] transition-colors hover:border-[#1162A8] hover:text-[#1162A8]"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            ) : (
                              <span className="inline-flex h-10 items-center rounded-lg border border-[#E5E7EB] px-4 text-[15px] text-[#9CA3AF]">
                                Download
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#E7EDF4] px-5 py-4 text-sm text-[#6B7280] md:flex-row md:items-center md:justify-between">
            <p>
              Showing {rangeStart}-{rangeEnd} of {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-3 self-end">
              <Button
                variant="outline"
                className="h-10 gap-2 border-[#D9E1EC] px-4 text-sm text-[#6B7280] hover:bg-white"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={paginatedInvoices.page <= 1}
              >
                Prev
              </Button>
              <Button
                className="h-10 gap-2 px-4 text-sm"
                onClick={() => setPage((current) => Math.min(paginatedInvoices.totalPages, current + 1))}
                disabled={paginatedInvoices.page >= paginatedInvoices.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
