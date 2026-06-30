"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Download, Mail, X } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { type SubscriptionInvoice, listSubscriptionInvoices } from "@/lib/api/billing-subscription"
import { resolveBillingCustomerId } from "@/lib/billing-subscription/customer-context"
import {
  findSubscriptionInvoiceById,
  getSubscriptionInvoiceDisplayAmount,
} from "@/lib/billing-subscription/subscription-invoices"
import { formatBillingDate, formatCurrency } from "@/lib/billing-subscription/plan-helpers"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type InvoiceDetailPageProps = {
  params: {
    invoiceId: string
  }
}

const BILL_FROM = {
  name: "RXn3D Inc.",
  address: "123 Innovation Drive, San Francisco, CA 94105",
  email: "billing@rxn3d.com",
}

function getInvoiceStatusTone(status?: string | null): string {
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

function getInvoiceRetryUrl(invoice: SubscriptionInvoice | null): string | null {
  if (!invoice) return null
  return invoice.hosted_invoice_url || invoice.invoice_pdf || null
}

function buildInvoiceShareHref(invoice: SubscriptionInvoice | null, recipientEmail?: string | null): string {
  const subject = encodeURIComponent(`Invoice ${invoice?.invoice_number || `#${invoice?.id ?? ""}`}`.trim())
  const body = encodeURIComponent(
    [
      "Hi,",
      "",
      `Here is your invoice ${invoice?.invoice_number || ""}.`,
      invoice?.hosted_invoice_url || invoice?.invoice_pdf || "",
      "",
      "Thank you.",
    ]
      .filter(Boolean)
      .join("\n")
  )
  const to = recipientEmail ? encodeURIComponent(recipientEmail) : ""
  return `mailto:${to}?subject=${subject}&body=${body}`
}

export default function SubscriptionInvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null)
  const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false)

  useEffect(() => {
    const customerId = resolveBillingCustomerId(user, typeof window !== "undefined" ? window.localStorage : null)

    if (!customerId && user === null) return

    if (!customerId) {
      setError("Missing billing customer context.")
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(null)

    listSubscriptionInvoices(customerId)
      .then((response) => {
        if (!isMounted) return
        const selectedInvoice = findSubscriptionInvoiceById(response, params.invoiceId)
        if (!selectedInvoice) {
          setError("Invoice not found.")
          setInvoice(null)
          return
        }
        setInvoice(selectedInvoice)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Failed to load invoice"
        setError(message)
        setInvoice(null)
      })
      .finally(() => {
        if (!isMounted) return
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [params.invoiceId, user])

  const invoiceAmount = useMemo(
    () => getSubscriptionInvoiceDisplayAmount(invoice ?? { id: 0 }),
    [invoice]
  )

  const invoiceDate = invoice?.created_at || invoice?.paid_at || null
  const dueDate = invoice?.due_date || invoiceDate
  const billToName = user?.customers?.[0]?.name || user?.customer?.name || "Customer account"
  const billToEmail = user?.email || ""
  const planLabel = user?.customer?.type === "office" ? "Office account" : "Business subscription"
  const retryUrl = getInvoiceRetryUrl(invoice)
  const isFailedInvoice = (invoice?.status ?? "").trim().toLowerCase() === "failed"
  const downloadUrl = invoice?.invoice_pdf || invoice?.hosted_invoice_url || null

  const lineItems = useMemo(
    () =>
      invoice
        ? [
            {
              description: "Subscription billing",
              quantity: 1,
              unitPrice: invoiceAmount,
              amount: invoiceAmount,
            },
          ]
        : [],
    [invoice, invoiceAmount]
  )

  const handleRetryCharge = () => {
    if (!retryUrl) return
    window.open(retryUrl, "_blank", "noopener,noreferrer")
    setIsRetryDialogOpen(false)
  }

  return (
    <div className="min-h-full bg-[#F6F6F6] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px] space-y-4">
        <div>
          <button
            type="button"
            onClick={() => router.push("/billing/subscriptions/invoices")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1162A8] transition-colors hover:text-[#0D4C83]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-10 text-sm text-[#6B7280]">
            Loading invoice...
          </div>
        ) : error || !invoice ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-10 text-sm text-[#CF0202]">
            {error || "Invoice not found."}
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-5 shadow-[0_2px_18px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="grid flex-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[2rem] font-semibold leading-none tracking-[-0.02em] text-[#111827]">
                      {invoice.invoice_number || `INV-${invoice.id}`}
                    </p>
                    <p className="mt-2 text-sm text-[#6B7280]">Invoice Number</p>
                  </div>
                  <div>
                    <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-[#111827] sm:text-[1.5rem]">
                      {formatBillingDate(invoiceDate)}
                    </p>
                    <p className="mt-2 text-sm text-[#6B7280]">Invoice Date</p>
                  </div>
                  <div>
                    <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-[#111827] sm:text-[1.5rem]">
                      {formatBillingDate(dueDate)}
                    </p>
                    <p className="mt-2 text-sm text-[#6B7280]">Due Date</p>
                  </div>
                  <div className="flex items-start sm:items-center">
                    <span
                      className={`inline-flex min-w-[84px] justify-center rounded-full px-4 py-1.5 text-sm font-semibold ${getInvoiceStatusTone(invoice.status)}`}
                    >
                      {formatStatusLabel(invoice.status)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  {billToEmail ? (
                    <a
                      href={buildInvoiceShareHref(invoice, billToEmail)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D9E1EC] bg-white px-4 text-sm font-medium text-[#111827] transition-colors hover:border-[#1162A8] hover:text-[#1162A8]"
                    >
                      <Mail className="h-4 w-4" />
                      Send to Email
                    </a>
                  ) : null}
                  {isFailedInvoice ? (
                    <Button className="h-10 px-4 text-sm" onClick={() => setIsRetryDialogOpen(true)}>
                      Retry Payment
                    </Button>
                  ) : null}
                  {downloadUrl ? (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0D4C83]"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-5 shadow-[0_2px_18px_rgba(15,23,42,0.04)]">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-[#6B7280]">Bill From</p>
                  <p className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[1.5rem]">
                    {BILL_FROM.name}
                  </p>
                  <p className="mt-1 text-base text-[#6B7280]">{BILL_FROM.address}</p>
                  <p className="mt-1 text-base text-[#1162A8]">{BILL_FROM.email}</p>
                </div>
                <div className="border-l-0 border-[#E7EDF4] md:border-l md:pl-7">
                  <p className="text-sm font-semibold text-[#6B7280]">Bill To</p>
                  <p className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[1.5rem]">
                    {billToName}
                  </p>
                  <p className="mt-1 text-base text-[#1162A8]">{billToEmail || "No billing email on file"}</p>
                  <p className="mt-1 text-base text-[#6B7280]">{planLabel}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_18px_rgba(15,23,42,0.04)]">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="border-b border-[#E7EDF4] px-5 py-4 text-left text-sm font-semibold text-[#6B7280]">
                        Description
                      </th>
                      <th className="border-b border-[#E7EDF4] px-5 py-4 text-left text-sm font-semibold text-[#6B7280]">
                        Qty
                      </th>
                      <th className="border-b border-[#E7EDF4] px-5 py-4 text-left text-sm font-semibold text-[#6B7280]">
                        Unit Price
                      </th>
                      <th className="border-b border-[#E7EDF4] px-5 py-4 text-right text-sm font-semibold text-[#6B7280]">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={`${invoice.id}-${index}`}>
                        <td className="border-b border-[#E7EDF4] px-5 py-4 text-[15px] text-[#111827]">
                          {item.description}
                        </td>
                        <td className="border-b border-[#E7EDF4] px-5 py-4 text-[15px] text-[#111827]">
                          {item.quantity}
                        </td>
                        <td className="border-b border-[#E7EDF4] px-5 py-4 text-[15px] text-[#111827]">
                          {formatCurrency(item.unitPrice, invoice.currency || "USD")}
                        </td>
                        <td className="border-b border-[#E7EDF4] px-5 py-4 text-right text-[15px] font-semibold text-[#111827]">
                          {formatCurrency(item.amount, invoice.currency || "USD")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  className={`mx-5 my-5 rounded-xl border px-4 py-3 text-sm font-medium ${
                    isFailedInvoice
                      ? "border-[#F3B8B8] bg-[#FFF1F1] text-[#D92D20]"
                      : "border-[#98F0B2] bg-[#EAFBF0] text-[#16803C]"
                  }`}
                >
                  {isFailedInvoice ? (
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Payment failed for this invoice. Retry the charge to complete payment.
                    </span>
                  ) : (
                    <span>
                      Paid in full — {formatCurrency(invoiceAmount, invoice.currency || "USD")} on{" "}
                      {formatBillingDate(invoice.paid_at || invoiceDate)}
                    </span>
                  )}
                </div>
              </section>

              <aside className="self-start rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-[0_2px_18px_rgba(15,23,42,0.04)]">
                <div className="space-y-3 text-[15px] text-[#6B7280]">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoiceAmount, invoice.currency || "USD")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span>-$0.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax (0%)</span>
                    <span>$0.00</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-[#E7EDF4] pt-3">
                  <div className="flex items-center justify-between text-[1.1rem] font-semibold text-[#111827]">
                    <span>Total</span>
                    <span>{formatCurrency(invoiceAmount, invoice.currency || "USD")}</span>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      <Dialog open={isRetryDialogOpen} onOpenChange={setIsRetryDialogOpen}>
        <DialogContent className="max-w-[820px] overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white p-0" showCloseButton={false}>
          <DialogHeader className="border-b border-[#E7EDF4] px-12 py-10">
            <DialogTitle className="text-[2.2rem] font-semibold tracking-[-0.02em] text-[#111827]">
              Retry Payment
            </DialogTitle>
          </DialogHeader>

          <div className="px-12 py-10">
            <div className="mb-10 flex items-center gap-4 rounded-2xl bg-[#FFF1F1] px-8 py-7 text-[#D92D20]">
              <X className="h-8 w-8" />
              <p className="text-[1.2rem] font-semibold tracking-[-0.02em]">
                Previous payment attempt failed on {formatBillingDate(invoice?.due_date || invoice?.created_at || null)}
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <p className="text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Invoice</p>
                <p className="mt-3 text-[2rem] font-semibold tracking-[-0.02em] text-[#111827]">
                  {invoice?.invoice_number || `INV-${invoice?.id ?? ""}`}
                </p>
                <p className="mt-2 text-[1.1rem] text-[#6B7280]">
                  {formatCurrency(invoiceAmount, invoice?.currency || "USD")} • Due{" "}
                  {formatBillingDate(invoice?.due_date || invoice?.created_at || null)}
                </p>
              </div>

              <div>
                <p className="text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Charge To</p>
                <p className="mt-3 text-[1.2rem] text-[#111827]">
                  Stripe payment method on file <span className="text-[#6B7280]">(default)</span>
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="px-12 pb-10 sm:justify-center sm:space-x-5">
            <Button
              variant="outline"
              className="h-[72px] min-w-[260px] rounded-2xl border-2 border-[#6B7280] text-[1.05rem] text-[#374151] hover:bg-white"
              onClick={() => setIsRetryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-[72px] min-w-[260px] rounded-2xl text-[1.05rem]"
              onClick={handleRetryCharge}
              disabled={!retryUrl}
            >
              Retry Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
