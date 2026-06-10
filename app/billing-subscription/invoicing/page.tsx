"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
} from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listSuperadminInvoices, type SuperadminInvoice } from "@/lib/api/superadmin-invoices"
import { cn } from "@/lib/utils"

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(val: string | number | null | undefined, currency = "USD"): string {
  const n = Number(val ?? 0)
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function invoiceDownloadUrl(inv: SuperadminInvoice): string | null {
  return inv.invoice_pdf ?? inv.hosted_invoice_url ?? null
}

function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase()
  if (s === "paid") return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
  if (s === "open" || s === "pending") return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
  if (s === "uncollectible" || s === "overdue") return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>
  if (s === "void" || s === "voided") return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Voided</Badge>
  return <Badge variant="outline">{status ?? "Unknown"}</Badge>
}

const PAGE_SIZE = 20

// ── Invoices tab ─────────────────────────────────────────────────────────────

function InvoicesTab() {
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

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

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
      if (result.pagination) {
        setTotalPages(result.pagination.last_page)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const totalOutstanding = invoices
    .filter((i) => (i.status ?? "").toLowerCase() !== "paid")
    .reduce((sum, i) => sum + Number(i.amount_due ?? 0), 0)

  const collectedThisMonth = invoices
    .filter((i) => {
      if ((i.status ?? "").toLowerCase() !== "paid") return false
      if (!i.paid_at) return false
      const d = new Date(i.paid_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, i) => sum + Number(i.amount_paid ?? 0), 0)

  const overdue = invoices.filter((i) => {
    const s = (i.status ?? "").toLowerCase()
    return s === "uncollectible" || s === "overdue"
  }).length

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-orange-400">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-orange-500">{fmtCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Collected This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-600">{fmtCurrency(collectedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overdue (&gt;30 days)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-red-500">{overdue}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
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

      {/* Table */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Lab Name</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading invoices…
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const downloadUrl = invoiceDownloadUrl(inv)
                const s = (inv.status ?? "").toLowerCase()
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {inv.stripe_invoice_id ?? `INV-${inv.id}`}
                        </a>
                      ) : (
                        <span>{inv.stripe_invoice_id ?? `INV-${inv.id}`}</span>
                      )}
                    </TableCell>
                    <TableCell>{inv.customer?.name ?? "—"}</TableCell>
                    <TableCell>{fmtDate(inv.invoice_created_at)}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-right">
                      {fmtCurrency(inv.amount_due ?? inv.amount_paid, inv.currency ?? "USD")}
                    </TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {(s === "open" || s === "pending") && (
                          <button className="text-blue-600 hover:underline">Remind</button>
                        )}
                        {(s === "uncollectible" || s === "overdue") && (
                          <>
                            <button className="text-blue-600 hover:underline">Retry</button>
                            <span className="text-muted-foreground">·</span>
                            <button className="text-blue-600 hover:underline">Dunning</button>
                          </>
                        )}
                        {downloadUrl && (
                          <>
                            {(s === "open" || s === "pending" || s === "uncollectible" || s === "overdue") && (
                              <span className="text-muted-foreground">·</span>
                            )}
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        )}
                        {(s === "paid" || s === "void" || s === "voided") && !downloadUrl && (
                          <span className="text-muted-foreground">—</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Dunning Workflows tab (stub) ──────────────────────────────────────────────

const DUNNING_STEPS = [
  { label: "D0", desc: "Payment\nFails", color: "bg-red-500" },
  { label: "D1", desc: "Retry #1\nAutomatic", color: "bg-blue-700" },
  { label: "D3", desc: "Retry #2\n+ Email", color: "bg-blue-700" },
  { label: "D7", desc: "Retry #3 +\nUrgent Email", color: "bg-yellow-500" },
  { label: "D14", desc: "Final +\nWarning", color: "bg-red-700" },
  { label: "D21", desc: "Account\nSuspended", color: "bg-gray-800" },
]

function DunningTab() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Sequences", value: "—", color: "border-l-orange-400" },
          { label: "Recovered This Month", value: "—", color: "border-l-green-400" },
          { label: "Recovery Rate", value: "—", color: "border-l-blue-400" },
          { label: "Escalated to Suspension", value: "—", color: "border-l-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className={cn("border-l-4", stat.color)}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-muted-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
          <CardTitle className="text-base font-semibold">Default Dunning Pipeline</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600">
            Edit Schedule
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {DUNNING_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white",
                      step.color,
                    )}
                  >
                    {step.label}
                  </div>
                  <p className="whitespace-pre-line text-center text-xs text-muted-foreground leading-tight">
                    {step.desc}
                  </p>
                </div>
                {i < DUNNING_STEPS.length - 1 && (
                  <div className="h-px w-8 shrink-0 bg-border mt-[-18px]" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active workflows table (stub) */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Active Workflows</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lab Name</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Next Retry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground text-sm">
                  Dunning workflow automation coming soon.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

// ── Integrations tab ──────────────────────────────────────────────────────────

type WebhookEndpoint = {
  id: number
  url: string
  events: string
  status: "active" | "inactive"
  lastTriggered: string
}

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 1,
    url: "https://api.platform.com/webhooks/stripe",
    events: "payment_intent.succeeded, invoice.paid, +4",
    status: "active",
    lastTriggered: "2 min ago",
  },
  {
    id: 2,
    url: "https://api.platform.com/webhooks/accounting",
    events: "invoice.created, credit.consumed",
    status: "active",
    lastTriggered: "15 min ago",
  },
]

function IntegrationsTab() {
  const [view, setView] = useState<"integrations" | "webhooks">("integrations")

  if (view === "webhooks") {
    return <WebhooksView onBack={() => setView("integrations")} />
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage payment gateway connections, accounting platform sync, and webhook configurations.
      </p>

      {/* Stripe */}
      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-sm">
            S
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Stripe</span>
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                Connected
              </span>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Live Mode</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Webhook: Active</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("webhooks")}>
              Configure Webhooks
            </Button>
            <Button variant="outline" size="sm">
              View Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QuickBooks */}
      <Card className="opacity-70">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white font-bold text-xs">
            QB
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">QuickBooks Online</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
                Not Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Sync invoices, payments, and revenue data.</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground border-muted-foreground/40">
            Coming Soon
          </Badge>
        </CardContent>
      </Card>

      {/* Xero */}
      <Card className="opacity-70">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-sm">
            X
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Xero</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
                Not Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Sync invoices, payments, and revenue recognition events.</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground border-muted-foreground/40">
            Coming Soon
          </Badge>
        </CardContent>
      </Card>

      {/* NetSuite */}
      <Card className="opacity-70">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white font-bold text-xs">
            NS
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">NetSuite</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
                Not Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Connect to Oracle NetSuite for ERP integration.</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground border-muted-foreground/40">
            Coming Soon
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Webhooks sub-view ─────────────────────────────────────────────────────────

function WebhooksView({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 pl-0 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to Integrations
        </Button>
      </div>

      {/* Connected integrations compact */}
      <div className="rounded-md border divide-y">
        {[
          { label: "Stripe", desc: "Connected · Webhook: Active — 12 events received today", connected: true },
          { label: "QuickBooks Online", desc: "Not connected", connected: false },
          { label: "Xero", desc: "Not connected", connected: false },
          { label: "NetSuite", desc: "Not connected", connected: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", item.connected ? "text-green-600" : "text-muted-foreground")}>
                {item.connected ? "Connected" : "Not Connected"}
              </span>
              {item.connected && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Webhook endpoints */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Webhook Endpoints</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_WEBHOOKS.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell>
                    <span className="text-blue-600 text-sm">{wh.url}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{wh.events}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{wh.lastTriggered}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Webhook Endpoint
          </Button>
        </div>
      </div>

      {/* API Keys */}
      <div>
        <h3 className="mb-1 text-sm font-semibold">API Keys &amp; Secrets</h3>
        <p className="mb-3 text-xs text-muted-foreground">API keys are sensitive. Rotation will invalidate all existing keys immediately.</p>
        <div className="space-y-3">
          {[
            { label: "STRIPE SECRET KEY", masked: "sk_live_****...7xRf" },
            { label: "STRIPE PUBLISHABLE KEY", masked: "pk_live_****...3mNp" },
          ].map((key) => (
            <div key={key.label} className="flex items-center gap-4">
              <div className="w-52 shrink-0">
                <p className="text-xs font-semibold text-muted-foreground tracking-wide">{key.label}</p>
                <p className="text-sm font-mono text-blue-600 mt-0.5">{key.masked}</p>
              </div>
              <Button variant="outline" size="sm">
                Rotate
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <BreadcrumbBar
        items={[
          { label: "Billing & Subscription Control", href: "/billing-subscription" },
          { label: "Invoicing" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoicing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage invoices, payment recovery, and accounting integrations.
        </p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="dunning">Dunning Workflows</TabsTrigger>
          <TabsTrigger value="integrations">Integrations &amp; Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>

        <TabsContent value="dunning">
          <DunningTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
