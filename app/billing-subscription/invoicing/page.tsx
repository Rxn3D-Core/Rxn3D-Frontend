"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronLeft, ChevronRight, Download, Search } from "lucide-react"
import Link from "next/link"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listSuperadminInvoices, type SuperadminInvoice } from "@/lib/api/superadmin-invoices"

function fmtCurrency(val: string | number | null | undefined, currency = "USD"): string {
  const n = Number(val ?? 0)
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase()
  if (s === "paid") return <span className="text-green-600 font-medium">Paid</span>
  if (s === "open" || s === "pending") return <span className="text-yellow-600 font-medium">Pending</span>
  if (s === "uncollectible" || s === "overdue") return <span className="text-red-600 font-medium">Overdue</span>
  if (s === "void" || s === "voided") return <span className="text-muted-foreground">Voided</span>
  return <span className="text-muted-foreground">{status ?? "Unknown"}</span>
}

const PAGE_SIZE = 20

export default function InvoicingPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<SuperadminInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listSuperadminInvoices({
        page,
        per_page: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      })
      setInvoices(result.data)
      if (result.pagination) setTotalPages(result.pagination.last_page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { void load() }, [load])

  const totalOutstanding = invoices
    .filter((i) => (i.status ?? "").toLowerCase() !== "paid")
    .reduce((sum, i) => sum + Number(i.amount_due ?? 0), 0)

  const collectedThisMonth = invoices
    .filter((i) => {
      if ((i.status ?? "").toLowerCase() !== "paid" || !i.paid_at) return false
      const d = new Date(i.paid_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, i) => sum + Number(i.amount_paid ?? 0), 0)

  const overdueTotal = invoices
    .filter((i) => {
      const s = (i.status ?? "").toLowerCase()
      return s === "uncollectible" || s === "overdue"
    })
    .reduce((sum, i) => sum + Number(i.amount_due ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <BreadcrumbBar
        items={[
          { label: "Billing & Subscription Control", href: "/billing-subscription" },
          { label: "Invoicing" },
        ]}
      />

      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage invoices, track payments, and configure integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button>Generate Manual Invoice</Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Bulk Export
          </Button>
          <Button variant="outline" asChild>
            <Link href="/billing-subscription/integrations">Integrations</Link>
          </Button>
        </div>
      </div>

      {/* Stat cards — bordered style matching Figma */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-orange-300 rounded-xl">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-orange-500">{fmtCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card className="border border-green-300 rounded-xl">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Collected This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-600">{fmtCurrency(collectedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card className="border border-red-300 rounded-xl">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overdue (&gt;30 days)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-red-500">{fmtCurrency(overdueTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border border-blue-300 rounded-xl">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Days to Payment</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-blue-600">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, lab name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="open">Pending</SelectItem>
            <SelectItem value="uncollectible">Overdue</SelectItem>
            <SelectItem value="void">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="pl-6">Invoice #</TableHead>
              <TableHead>Lab Name</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Loading invoices…
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const s = (inv.status ?? "").toLowerCase()
                const invoiceLabel = inv.stripe_invoice_id ?? `INV-${inv.id}`
                const isOverdue = s === "uncollectible" || s === "overdue"
                return (
                  <TableRow
                    key={inv.id}
                    className={isOverdue ? "border-l-2 border-l-red-400" : undefined}
                  >
                    <TableCell className="pl-6">
                      <Link
                        href={`/billing-subscription/invoicing/${inv.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {invoiceLabel}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{inv.customer?.name ?? "—"}</TableCell>
                    <TableCell>{fmtDate(inv.invoice_created_at)}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{fmtCurrency(inv.amount_due ?? inv.amount_paid, inv.currency ?? "USD")}</TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-2 text-sm">
                        {(s === "open" || s === "pending") && (
                          <button className="text-blue-600 hover:underline">Remind</button>
                        )}
                        {isOverdue && (
                          <>
                            <button className="text-blue-600 hover:underline">Retry</button>
                            <span className="text-muted-foreground">·</span>
                            <Link href="/billing-subscription/dunning-workflows" className="text-blue-600 hover:underline">
                              Dunning
                            </Link>
                          </>
                        )}
                        {s === "paid" && (
                          <>
                            <Link href={`/billing-subscription/invoicing/${inv.id}`} className="text-blue-600 hover:underline">
                              View
                            </Link>
                            {inv.invoice_pdf && (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  Download
                                </a>
                              </>
                            )}
                          </>
                        )}
                        {(s === "void" || s === "voided") && (
                          <Link href={`/billing-subscription/invoicing/${inv.id}`} className="text-blue-600 hover:underline">
                            View
                          </Link>
                        )}
                        {isOverdue && inv.invoice_pdf && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View
                            </a>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
