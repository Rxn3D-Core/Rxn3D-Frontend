"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Download, Send } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSuperadminInvoice, type SuperadminInvoice } from "@/lib/api/superadmin-invoices"

function fmtCurrency(val: string | number | null | undefined, currency = "USD"): string {
  const n = Number(val ?? 0)
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)
}

function fmtDateLong(val: string | null | undefined): string {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtDateShort(val: string | null | undefined): string {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase()
  if (s === "paid") return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
  if (s === "open" || s === "pending") return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
  if (s === "uncollectible" || s === "overdue") return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>
  if (s === "void" || s === "voided") return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Voided</Badge>
  return <Badge variant="outline">{status ?? "Unknown"}</Badge>
}

interface InvoiceLineItem {
  description: string
  qty: number
  unitPrice: number
  amount: number
}

function buildLineItems(inv: SuperadminInvoice): InvoiceLineItem[] {
  const meta = inv.metadata as Record<string, unknown> | null
  const lines = meta?.lines as InvoiceLineItem[] | undefined
  if (Array.isArray(lines) && lines.length > 0) return lines
  return [
    {
      description: "Subscription",
      qty: 1,
      unitPrice: Number(inv.amount_due ?? inv.amount_paid ?? 0),
      amount: Number(inv.amount_due ?? inv.amount_paid ?? 0),
    },
  ]
}

function buildPaymentHistory(inv: SuperadminInvoice) {
  const events: { color: string; text: string }[] = []
  if (inv.invoice_created_at) {
    events.push({ color: "bg-gray-400", text: `${fmtDateLong(inv.invoice_created_at)} · Invoice generated automatically` })
  }
  if (inv.paid_at) {
    events.push({ color: "bg-green-500", text: `${fmtDateLong(inv.paid_at)} · Payment successful — Stripe charge` })
    if (inv.customer?.email) {
      events.push({ color: "bg-blue-400", text: `Receipt sent to ${inv.customer.email}` })
    }
  }
  return events
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const [invoice, setInvoice] = useState<SuperadminInvoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    getSuperadminInvoice(id)
      .then(setInvoice)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load invoice"))
      .finally(() => setIsLoading(false))
  }, [id])

  const invoiceLabel = invoice?.stripe_invoice_id ?? `INV-${id}`
  const lineItems = invoice ? buildLineItems(invoice) : []
  const paymentHistory = invoice ? buildPaymentHistory(invoice) : []
  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0)
  const amountPaid = Number(invoice?.amount_paid ?? 0)
  const amountDue = Number(invoice?.amount_due ?? 0)
  const currency = invoice?.currency ?? "USD"
  const status = (invoice?.status ?? "").toLowerCase()
  const isVoided = status === "void" || status === "voided"

  return (
    <div className="flex flex-col gap-6 p-6">
      <BreadcrumbBar
        items={[
          { label: "Billing & Subscription Control", href: "/billing-subscription/billing-configuration" },
          { label: "Invoicing", href: "/billing-subscription/invoicing" },
          { label: invoiceLabel },
        ]}
      />

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/billing-subscription/invoicing" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Invoices
          </Link>
          <span>›</span>
          <span className="text-foreground font-medium">{invoiceLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {invoice?.invoice_pdf && (
            <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </a>
          )}
          <Button variant="outline" className="gap-2" disabled>
            <Send className="h-4 w-4" /> Send to Lab
          </Button>
          {!isVoided && status !== "paid" && (
            <Button disabled>Record Payment</Button>
          )}
          {!isVoided && (
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" disabled>
              Void Invoice
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Loading invoice…</div>
      ) : invoice ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          {/* Left — Invoice document */}
          <Card className="rounded-xl">
            <CardContent className="p-8">
              {/* Invoice header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">INVOICE</p>
                  <p className="text-sm text-muted-foreground">DentalPlatform Inc. · 123 Platform Way, Suite 400 · San Francisco, CA 94102</p>
                  <p className="text-sm font-semibold mt-1">billing@rxn3d.com</p>
                </div>
                <div>{statusBadge(invoice.status)}</div>
              </div>

              {/* Invoice meta */}
              <div className="text-sm text-muted-foreground space-y-0.5 mb-5">
                <p><span className="font-medium text-foreground">Invoice #:</span> {invoiceLabel}</p>
                <p>
                  <span className="font-medium text-foreground">Issue Date:</span> {fmtDateShort(invoice.invoice_created_at)}
                  {" · "}
                  <span className="font-medium text-foreground">Due Date:</span> {fmtDateShort(invoice.invoice_created_at)}
                </p>
              </div>

              {/* Bill to */}
              {invoice.customer && (
                <div className="mb-6 text-sm">
                  <p className="font-medium text-muted-foreground mb-0.5">BILL TO:</p>
                  <p className="font-medium">{invoice.customer.name}</p>
                  <p className="text-muted-foreground">{invoice.customer.email}</p>
                </div>
              )}

              {/* Line items table */}
              <div className="rounded-md border overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Unit Price</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-right">{item.qty}</td>
                        <td className="px-4 py-3 text-right">{fmtCurrency(item.unitPrice, currency)}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmtCurrency(item.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="ml-auto w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmtCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total</span>
                  <span>{fmtCurrency(amountDue || subtotal, currency)}</span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid</span>
                    <span>{fmtCurrency(amountPaid, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Balance Due</span>
                  <span>{fmtCurrency(Math.max(0, (amountDue || subtotal) - amountPaid), currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right — Side panel */}
          <div className="flex flex-col gap-4">
            {/* Active Dunning */}
            <Card className="rounded-xl">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-sm font-semibold">Active Dunning</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {status === "uncollectible" || status === "overdue" ? (
                  <>
                    <p className="text-sm text-orange-600">Attempt 2/4 · Next retry: —</p>
                    <p className="text-sm text-orange-600">Attempt 3/4 · Email sent —</p>
                    <Link href="/billing-subscription/dunning-workflows" className="text-sm text-blue-600 hover:underline block mt-1">
                      View All Dunning Workflows
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No active dunning for this invoice.</p>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="rounded-xl">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-sm font-semibold">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {paymentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment history.</p>
                ) : (
                  <ul className="space-y-2">
                    {paymentHistory.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${e.color}`} />
                        <span className="text-muted-foreground">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Related Information */}
            <Card className="rounded-xl">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-sm font-semibold">Related Information</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-1 text-sm text-muted-foreground">
                {invoice.stripe_invoice_id && (
                  <p><span className="font-medium text-foreground">Stripe Invoice ID:</span> {invoice.stripe_invoice_id}</p>
                )}
                {invoice.stripe_customer_id && (
                  <p><span className="font-medium text-foreground">Stripe Customer ID:</span> {invoice.stripe_customer_id}</p>
                )}
                {invoice.stripe_subscription_id && (
                  <p><span className="font-medium text-foreground">Subscription ID:</span> {invoice.stripe_subscription_id}</p>
                )}
                {invoice.amount_paid != null && invoice.amount_due != null && (
                  <p>
                    Net Revenue: {fmtCurrency(Number(invoice.amount_paid ?? 0), currency)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
