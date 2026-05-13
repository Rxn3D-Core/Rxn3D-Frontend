"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, CalendarDays, Download, Plus, Search } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TenantPlan = "Starter" | "Professional" | "Enterprise" | "Freemium"
type TenantStatus = "Active" | "Warning" | "Limit Reached" | "Suspended"

interface TenantRow {
  id: string
  name: string
  owner: string
  tenantType: "Dental Lab"
  plan: TenantPlan
  slipUsed: number
  slipLimit: number | null
  storageUsedGb: number
  storageLimitGb: number
  status: TenantStatus
}

const TENANTS: TenantRow[] = [
  { id: "LAB-0042", name: "Precision Dental Arts", owner: "Dr. Sarah Mitchell", tenantType: "Dental Lab", plan: "Professional", slipUsed: 280, slipLimit: 300, storageUsedGb: 12.4, storageLimitGb: 15, status: "Active" },
  { id: "LAB-0078", name: "Summit Crown Lab", owner: "James Rivera", tenantType: "Dental Lab", plan: "Enterprise", slipUsed: 450, slipLimit: null, storageUsedGb: 34.2, storageLimitGb: 100, status: "Active" },
  { id: "LAB-0091", name: "Pacific Prosthetics", owner: "Dr. Linda Chen", tenantType: "Dental Lab", plan: "Professional", slipUsed: 295, slipLimit: 300, storageUsedGb: 14.8, storageLimitGb: 15, status: "Warning" },
  { id: "LAB-0105", name: "Bright Smile Ceramics", owner: "Robert Kowalski", tenantType: "Dental Lab", plan: "Starter", slipUsed: 55, slipLimit: 100, storageUsedGb: 2.1, storageLimitGb: 5, status: "Active" },
  { id: "LAB-0112", name: "Elite Dental Studio", owner: "Dr. Mark Tanaka", tenantType: "Dental Lab", plan: "Starter", slipUsed: 100, slipLimit: 100, storageUsedGb: 4.9, storageLimitGb: 5, status: "Limit Reached" },
  { id: "LAB-0120", name: "Artisan Dental Lab", owner: "Patricia Gomez", tenantType: "Dental Lab", plan: "Professional", slipUsed: 180, slipLimit: 300, storageUsedGb: 8.7, storageLimitGb: 15, status: "Active" },
  { id: "LAB-0156", name: "Valley Dental Works", owner: "Dr. Kevin Patel", tenantType: "Dental Lab", plan: "Starter", slipUsed: 88, slipLimit: 100, storageUsedGb: 3.6, storageLimitGb: 5, status: "Warning" },
  { id: "LAB-0170", name: "Crown & Bridge Co.", owner: "Angela Foster", tenantType: "Dental Lab", plan: "Freemium", slipUsed: 8, slipLimit: 20, storageUsedGb: 0.3, storageLimitGb: 1, status: "Active" },
  { id: "LAB-0192", name: "Northstar Dental Lab", owner: "Thomas Nguyen", tenantType: "Dental Lab", plan: "Starter", slipUsed: 63, slipLimit: 100, storageUsedGb: 3.1, storageLimitGb: 5, status: "Active" },
  { id: "LAB-0218", name: "Prime Dental Creations", owner: "Dr. Elena Rossi", tenantType: "Dental Lab", plan: "Professional", slipUsed: 241, slipLimit: 300, storageUsedGb: 11.9, storageLimitGb: 15, status: "Active" },
  { id: "LAB-0249", name: "Apex Lab Solutions", owner: "Harper Cole", tenantType: "Dental Lab", plan: "Enterprise", slipUsed: 520, slipLimit: null, storageUsedGb: 78.4, storageLimitGb: 100, status: "Warning" },
  { id: "LAB-0280", name: "Silverline Dental", owner: "Nathan Blake", tenantType: "Dental Lab", plan: "Freemium", slipUsed: 19, slipLimit: 20, storageUsedGb: 0.8, storageLimitGb: 1, status: "Limit Reached" },
]

type SortKey = "name" | "owner" | "tenantType" | "plan" | "slipUsage" | "storage" | "status"

export default function TenantManagementPage() {
  const [query, setQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<"all" | TenantPlan>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all")
  const [sortBy, setSortBy] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const pageSize = 8

  const stats = useMemo(() => {
    const planCount = TENANTS.reduce<Record<TenantPlan, number>>(
      (acc, tenant) => {
        acc[tenant.plan] += 1
        return acc
      },
      { Starter: 0, Professional: 0, Enterprise: 0, Freemium: 0 },
    )
    return {
      total: TENANTS.length,
      starter: planCount.Starter,
      professional: planCount.Professional,
      enterprise: planCount.Enterprise,
    }
  }, [])

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return TENANTS.filter((tenant) => {
      const matchesQuery =
        !normalizedQuery ||
        tenant.name.toLowerCase().includes(normalizedQuery) ||
        tenant.id.toLowerCase().includes(normalizedQuery) ||
        tenant.owner.toLowerCase().includes(normalizedQuery)
      const matchesPlan = planFilter === "all" || tenant.plan === planFilter
      const matchesStatus = statusFilter === "all" || tenant.status === statusFilter
      return matchesQuery && matchesPlan && matchesStatus
    })
  }, [query, planFilter, statusFilter])

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows]
    rows.sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1
      const aSlip = a.slipLimit === null ? Number.MAX_SAFE_INTEGER : a.slipUsed / a.slipLimit
      const bSlip = b.slipLimit === null ? Number.MAX_SAFE_INTEGER : b.slipUsed / b.slipLimit
      const aStorage = a.storageUsedGb / a.storageLimitGb
      const bStorage = b.storageUsedGb / b.storageLimitGb
      const statusWeight: Record<TenantStatus, number> = {
        Active: 1,
        Warning: 2,
        "Limit Reached": 3,
        Suspended: 4,
      }

      if (sortBy === "name") return a.name.localeCompare(b.name) * factor
      if (sortBy === "owner") return a.owner.localeCompare(b.owner) * factor
      if (sortBy === "tenantType") return a.tenantType.localeCompare(b.tenantType) * factor
      if (sortBy === "plan") return a.plan.localeCompare(b.plan) * factor
      if (sortBy === "slipUsage") return (aSlip - bSlip) * factor
      if (sortBy === "storage") return (aStorage - bStorage) * factor
      return (statusWeight[a.status] - statusWeight[b.status]) * factor
    })
    return rows
  }, [filteredRows, sortBy, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const pagedRows = useMemo(() => {
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, page, totalPages])

  const setSort = (key: SortKey) => {
    setPage(1)
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortBy(key)
    setSortDirection("asc")
  }

  const from = sortedRows.length === 0 ? 0 : (Math.min(page, totalPages) - 1) * pageSize + 1
  const to = Math.min(Math.min(page, totalPages) * pageSize, sortedRows.length)

  return (
    <div className="w-full space-y-3 px-2 py-3 md:px-3 md:py-3">
      <div className="space-y-1">
        <BreadcrumbBar
          items={[
            { label: "Billing & Subscription", href: "/billing-subscription" },
            { label: "Tenant Management" },
          ]}
        />
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Tenant Management</h1>
      </div>

      <Card className="space-y-2 border-[#1162A8]/40">
        <CardHeader className="space-y-3 px-3 pb-0 pt-3 md:px-4 md:pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold md:text-base">Tenants Overview</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button size="sm" className="h-8 gap-1.5 px-3 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add New Tenant
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Active Labs" value={stats.total.toString()} />
            <MetricCard label="Starter Plan" value={stats.starter.toString()} />
            <MetricCard label="Professional Plan" value={stats.professional.toString()} />
            <MetricCard label="Enterprise Plan" value={stats.enterprise.toString()} />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-3 pb-3 pt-0 md:px-4 md:pb-4">
          <div className="flex flex-col gap-2 lg:flex-row">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by lab name, ID, or owner..."
                className="h-8 pl-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
              <Select
                value={planFilter}
                onValueChange={(value: "all" | TenantPlan) => {
                  setPlanFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs sm:min-w-[140px]">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                  <SelectItem value="Freemium">Freemium</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | TenantStatus) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs sm:min-w-[145px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Limit Reached">Limit Reached</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-8 justify-start gap-2 px-3 text-xs sm:min-w-[120px]">
                <CalendarDays className="h-4 w-4" />
                Date Range
              </Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Name" active={sortBy === "name"} onClick={() => setSort("name")} />
                    <SortableHead label="Owner" active={sortBy === "owner"} onClick={() => setSort("owner")} />
                    <SortableHead label="Tenant Type" active={sortBy === "tenantType"} onClick={() => setSort("tenantType")} />
                    <SortableHead label="Plan" active={sortBy === "plan"} onClick={() => setSort("plan")} />
                    <SortableHead label="Slip Usage" active={sortBy === "slipUsage"} onClick={() => setSort("slipUsage")} />
                    <SortableHead label="Storage" active={sortBy === "storage"} onClick={() => setSort("storage")} />
                    <SortableHead label="Status" active={sortBy === "status"} onClick={() => setSort("status")} />
                    <TableHead className="h-9 w-[120px] px-3 py-2 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="min-w-[210px] px-3 py-2">
                        <p className="font-medium leading-tight">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.id}</p>
                      </TableCell>
                      <TableCell className="px-3 py-2">{tenant.owner}</TableCell>
                      <TableCell className="px-3 py-2">{tenant.tenantType}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant="outline">{tenant.plan}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[175px] px-3 py-2">
                        <UsageBar value={getSlipPercent(tenant)} />
                        <p className="mt-1 text-xs text-muted-foreground">{formatSlipUsage(tenant)}</p>
                      </TableCell>
                      <TableCell className="min-w-[175px] px-3 py-2">
                        <UsageBar value={getStoragePercent(tenant)} />
                        <p className="mt-1 text-xs text-muted-foreground">{tenant.storageUsedGb} / {tenant.storageLimitGb} GB</p>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <StatusChip status={tenant.status} />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                          <Link href={`/billing-subscription/tenant-management/${tenant.id.toLowerCase()}`}>View Profile</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 p-2 md:hidden">
              {pagedRows.map((tenant) => (
                <div key={tenant.id} className="space-y-2 rounded-lg border p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.id}</p>
                    </div>
                    <StatusChip status={tenant.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-muted-foreground">Owner</p>
                    <p>{tenant.owner}</p>
                    <p className="text-muted-foreground">Plan</p>
                    <p>{tenant.plan}</p>
                    <p className="text-muted-foreground">Type</p>
                    <p>{tenant.tenantType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Slip usage</p>
                    <UsageBar value={getSlipPercent(tenant)} />
                    <p className="mt-1 text-xs text-muted-foreground">{formatSlipUsage(tenant)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Storage</p>
                    <UsageBar value={getStoragePercent(tenant)} />
                    <p className="mt-1 text-xs text-muted-foreground">{tenant.storageUsedGb} / {tenant.storageLimitGb} GB</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                    <Link href={`/billing-subscription/tenant-management/${tenant.id.toLowerCase()}`}>View Profile</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {from}-{to} of {sortedRows.length} tenants
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Prev
              </Button>
              <span className="px-2 text-xs">Page {Math.min(page, totalPages)} / {totalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SortableHead({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <TableHead className="h-9 px-3 py-2 text-xs">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-left hover:text-foreground">
        <span>{label}</span>
        <ArrowUpDown className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-30")} />
      </button>
    </TableHead>
  )
}

function UsageBar({ value }: { value: number }) {
  const colorClass = value >= 95 ? "bg-red-500" : value >= 85 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  )
}

function StatusChip({ status }: { status: TenantStatus }) {
  const className =
    status === "Active"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "Warning"
        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
        : status === "Limit Reached"
          ? "bg-red-500/15 text-red-700 dark:text-red-300"
          : "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300"
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {status}
    </span>
  )
}

function getSlipPercent(tenant: TenantRow): number {
  if (tenant.slipLimit === null) return 0
  return (tenant.slipUsed / tenant.slipLimit) * 100
}

function getStoragePercent(tenant: TenantRow): number {
  return (tenant.storageUsedGb / tenant.storageLimitGb) * 100
}

function formatSlipUsage(tenant: TenantRow): string {
  if (tenant.slipLimit === null) return `${tenant.slipUsed} (unlimited)`
  return `${tenant.slipUsed}/${tenant.slipLimit}`
}
