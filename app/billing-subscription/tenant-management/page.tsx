"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, CalendarDays, Download, Plus, Search } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { loadSuperadminBillingTenantOverview } from "@/lib/superadmin-billing/tenant-loaders"
import type { SuperadminBillingStatus, SuperadminBillingTenantRow } from "@/lib/superadmin-billing/tenant-data"
import { cn } from "@/lib/utils"

type SortKey = "labName" | "ownerName" | "planName" | "slipUsagePercent" | "storageUsagePercent" | "status"

const PAGE_SIZE = 8

export default function TenantManagementPage() {
  const [query, setQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortKey>("labName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<SuperadminBillingTenantRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRows() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await loadSuperadminBillingTenantOverview({
          q: query.trim() || undefined,
          per_page: 25,
          page: 1,
          order_by: "name",
          sort_by: "asc",
        })
        if (cancelled) return
        setRows(result.rows)
      } catch (loadError: any) {
        if (cancelled) return
        setError(loadError?.message || "Failed to load tenant billing data.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    const timeout = window.setTimeout(() => {
      void loadRows()
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesPlan = planFilter === "all" || row.planName === planFilter
      const matchesStatus = statusFilter === "all" || row.status === statusFilter
      return matchesPlan && matchesStatus
    })
  }, [rows, planFilter, statusFilter])

  const sortedRows = useMemo(() => {
    const statusWeight: Record<SuperadminBillingStatus, number> = {
      Active: 1,
      Warning: 2,
      "Limit Reached": 3,
      Suspended: 4,
      "Not Configured": 5,
    }

    return [...filteredRows].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1

      if (sortBy === "labName") return a.labName.localeCompare(b.labName) * direction
      if (sortBy === "ownerName") return a.ownerName.localeCompare(b.ownerName) * direction
      if (sortBy === "planName") return a.planName.localeCompare(b.planName) * direction
      if (sortBy === "slipUsagePercent") return ((a.slipUsagePercent ?? -1) - (b.slipUsagePercent ?? -1)) * direction
      if (sortBy === "storageUsagePercent") return ((a.storageUsagePercent ?? -1) - (b.storageUsagePercent ?? -1)) * direction
      return (statusWeight[a.status] - statusWeight[b.status]) * direction
    })
  }, [filteredRows, sortBy, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedRows.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedRows])

  const stats = useMemo(() => {
    return {
      total: rows.filter((row) => row.status !== "Suspended").length,
      starter: rows.filter((row) => row.planName === "Starter").length,
      professional: rows.filter((row) => row.planName === "Professional").length,
      enterprise: rows.filter((row) => row.planName === "Enterprise").length,
    }
  }, [rows])

  const planOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.planName).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const setSort = (key: SortKey) => {
    setPage(1)
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortBy(key)
    setSortDirection("asc")
  }

  const exportCsv = () => {
    const header = ["Lab Name", "Lab Code", "Owner", "Email", "Plan", "Slip Usage", "Storage", "Status", "Member Since", "Next Renewal"]
    const lines = sortedRows.map((row) =>
      [
        row.labName,
        row.labCode,
        row.ownerName,
        row.ownerEmail,
        row.planName,
        row.slipUsageLabel,
        row.storageUsageLabel,
        row.status,
        row.memberSinceLabel,
        row.nextRenewalLabel,
      ]
        .map((cell) => `"${String(cell ?? "").replace(/"/g, `""`)}`)
        .join('",') + '"',
    )

    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "superadmin-billing-tenants.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const showingFrom = sortedRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(currentPage * PAGE_SIZE, sortedRows.length)

  return (
    <div className="w-full space-y-4 bg-[#f6f7fb] px-4 py-4 md:px-6">
      <div className="space-y-1">
        <BreadcrumbBar
          items={[
            { label: "Billing & Subscription", href: "/billing-subscription" },
            { label: "Tenant Management" },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Billing and Subscription Control</h1>
      </div>

      <Card className="overflow-hidden border-[#dbe4f0] shadow-sm">
        <CardHeader className="space-y-4 bg-white px-4 pb-4 pt-5 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-2xl font-semibold text-slate-900">Tenants Overview</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-10 rounded-xl border-[#d4dcea] text-sm font-semibold" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button asChild className="h-10 rounded-xl bg-[#1567b8] text-sm font-semibold hover:bg-[#0f579c]">
                <Link href="/lab-office-management/invite">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Tenant
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Active Labs" value={String(stats.total)} />
            <MetricCard label="Starter Plan" value={String(stats.starter)} accent="bg-[#e7f7ec] text-[#239455]" />
            <MetricCard label="Professional Plan" value={String(stats.professional)} accent="bg-[#f4ebff] text-[#9b4dff]" />
            <MetricCard label="Enterprise Plan" value={String(stats.enterprise)} accent="bg-[#eff4ff] text-[#2355a4]" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 bg-[#f6f7fb] px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Search by lab name, ID, or owner..."
                className="h-11 rounded-xl border-[#d4dcea] bg-white pl-10"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                value={planFilter}
                onValueChange={(value) => {
                  setPlanFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-11 min-w-[150px] rounded-xl border-[#d4dcea] bg-white">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {planOptions.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-11 min-w-[150px] rounded-xl border-[#d4dcea] bg-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {["Active", "Warning", "Limit Reached", "Suspended", "Not Configured"].map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" disabled className="h-11 justify-start rounded-xl border-[#d4dcea] text-slate-500">
                <CalendarDays className="mr-2 h-4 w-4" />
                Date Range
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white shadow-sm">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-rose-600">{error}</div>
            ) : sortedRows.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No tenant billing records matched the current filters.</div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#eef2f7]">
                        <SortableHead label="Name" active={sortBy === "labName"} onClick={() => setSort("labName")} />
                        <SortableHead label="Owner" active={sortBy === "ownerName"} onClick={() => setSort("ownerName")} />
                        <TableHead className="h-12 text-sm font-semibold text-slate-700">Tenant Type</TableHead>
                        <SortableHead label="Plan" active={sortBy === "planName"} onClick={() => setSort("planName")} />
                        <SortableHead label="Slip Usage" active={sortBy === "slipUsagePercent"} onClick={() => setSort("slipUsagePercent")} />
                        <SortableHead label="Storage" active={sortBy === "storageUsagePercent"} onClick={() => setSort("storageUsagePercent")} />
                        <SortableHead label="Status" active={sortBy === "status"} onClick={() => setSort("status")} />
                        <TableHead className="h-12 text-right text-sm font-semibold text-slate-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((row) => (
                        <TableRow key={row.customerId} className="border-[#eef2f7]">
                          <TableCell className="py-4">
                            <div>
                              <p className="font-semibold text-slate-900">{row.labName}</p>
                              <p className="text-sm text-slate-500">{row.labCode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div>
                              <p className="font-medium text-slate-900">{row.ownerName}</p>
                              <p className="text-sm text-slate-500">{row.ownerEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-slate-700">{row.tenantType}</TableCell>
                          <TableCell className="py-4">
                            <PlanBadge planName={row.planName} />
                          </TableCell>
                          <TableCell className="min-w-[170px] py-4">
                            <UsageBar value={row.slipUsagePercent} />
                            <p className="mt-2 text-sm font-medium text-slate-800">{row.slipUsageLabel}</p>
                          </TableCell>
                          <TableCell className="min-w-[170px] py-4">
                            <UsageBar value={row.storageUsagePercent} />
                            <p className="mt-2 text-sm font-medium text-slate-800">{row.storageUsageLabel}</p>
                          </TableCell>
                          <TableCell className="py-4">
                            <StatusChip status={row.status} />
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <Button asChild variant="outline" className="h-9 rounded-xl border-[#d4dcea]">
                              <Link href={`/billing-subscription/tenant-management/${row.customerId}`}>View Profile</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 p-3 md:hidden">
                  {pagedRows.map((row) => (
                    <div key={row.customerId} className="rounded-xl border border-[#e7edf6] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{row.labName}</p>
                          <p className="text-sm text-slate-500">{row.labCode}</p>
                        </div>
                        <StatusChip status={row.status} />
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <p><span className="text-slate-500">Owner:</span> {row.ownerName}</p>
                        <p><span className="text-slate-500">Plan:</span> {row.planName}</p>
                        <p><span className="text-slate-500">Storage:</span> {row.storageUsageLabel}</p>
                        <p><span className="text-slate-500">Slip usage:</span> {row.slipUsageLabel}</p>
                      </div>
                      <Button asChild variant="outline" className="mt-4 h-9 w-full rounded-xl border-[#d4dcea]">
                        <Link href={`/billing-subscription/tenant-management/${row.customerId}`}>View Profile</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {showingFrom}-{showingTo} of {sortedRows.length} tenants
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="h-9 rounded-xl" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Prev
              </Button>
              <span className="min-w-[88px] text-center text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button variant="ghost" className="h-9 rounded-xl" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  accent = "bg-[#edf3fb] text-[#1567b8]",
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-[#e3eaf4] bg-white p-4 shadow-sm">
      <div className={cn("mb-3 inline-flex rounded-xl px-3 py-2 text-sm font-semibold", accent)}>{value}</div>
      <p className="text-lg font-semibold text-slate-900">{label}</p>
    </div>
  )
}

function SortableHead({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <TableHead className="h-12 text-sm font-semibold text-slate-700">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-2 transition-colors hover:text-slate-900">
        {label}
        <ArrowUpDown className={cn("h-4 w-4", active ? "opacity-100" : "opacity-30")} />
      </button>
    </TableHead>
  )
}

function UsageBar({ value }: { value: number | null }) {
  const safeValue = Math.max(0, Math.min(value ?? 0, 100))
  const barClass =
    safeValue >= 95 ? "bg-[#ff5d5d]" : safeValue >= 80 ? "bg-[#f4bf00]" : "bg-[#1ed760]"

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#e9edf4]">
      <div className={cn("h-full rounded-full", barClass)} style={{ width: `${safeValue}%` }} />
    </div>
  )
}

function StatusChip({ status }: { status: SuperadminBillingStatus }) {
  const className =
    status === "Active"
      ? "bg-[#e7f8ee] text-[#139c52]"
      : status === "Warning"
        ? "bg-[#fff5d8] text-[#bd8c00]"
        : status === "Limit Reached"
          ? "bg-[#ffe4e4] text-[#d83c3c]"
          : status === "Suspended"
            ? "bg-[#f1f3f7] text-[#546173]"
            : "bg-[#eef2f6] text-[#748091]"

  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", className)}>{status}</span>
}

function PlanBadge({ planName }: { planName: string }) {
  const className =
    planName === "Professional"
      ? "bg-[#f6ecff] text-[#6f42c1]"
      : planName === "Starter"
        ? "bg-[#e8f8ef] text-[#0d8c4d]"
        : planName === "Enterprise"
          ? "bg-[#ecf3ff] text-[#2457a6]"
          : "bg-[#f2f4f7] text-[#667085]"

  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", className)}>{planName}</span>
}
