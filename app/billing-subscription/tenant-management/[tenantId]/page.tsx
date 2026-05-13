"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Download } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type DetailTab = "overview" | "usage-analytics" | "billing-history" | "add-ons" | "settings"

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "usage-analytics", label: "Usage Analytics" },
  { id: "billing-history", label: "Billing History" },
  { id: "add-ons", label: "Add-Ons" },
  { id: "settings", label: "Settings" },
]

const QUICK_ACTIONS = ["Add Bonus Slips", "Upgrade Storage Tier", "Apply Discount", "Send Usage Alert", "Generate Invoice"]

const ACTIVITY = [
  "Slip limit warning sent — 2 hours ago",
  "Payment received — $149.00 — Mar 1, 2026",
  "Storage upgraded to 15 GB — Feb 20, 2026",
  "Plan changed from Starter to Professional",
]
const CUMULATIVE_SERIES = [22, 45, 66, 98, 122, 156, 210]
const DAILY_DISTRIBUTION = [15, 24, 38, 30, 44, 60, 52]
const INVOICES = [
  { invoice: "INV-1042", date: "Mar 1, 2026", amount: "$149.00", status: "Paid" },
  { invoice: "INV-1029", date: "Feb 1, 2026", amount: "$149.00", status: "Paid" },
  { invoice: "INV-1016", date: "Jan 1, 2026", amount: "$149.00", status: "Paid" },
  { invoice: "INV-1003", date: "Dec 1, 2025", amount: "$172.50", status: "Paid" },
  { invoice: "INV-0988", date: "Nov 1, 2025", amount: "$149.00", status: "Paid" },
]

function formatTenantTitle(raw: string): string {
  const normalized = raw.replace(/-/g, " ").trim()
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function TenantManagementDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = (params?.tenantId || "lab-0042").toUpperCase()
  const tenantName = useMemo(() => formatTenantTitle(params?.tenantId || "Precision Dental Arts"), [params?.tenantId])
  const [activeTab, setActiveTab] = useState<DetailTab>("overview")

  return (
    <div className="w-full space-y-3 px-2 py-3 md:px-3 md:py-3">
      <div className="space-y-1">
        <BreadcrumbBar
          items={[
            { label: "Billing & Subscription", href: "/billing-subscription" },
            { label: "Tenant Management", href: "/billing-subscription/tenant-management" },
            { label: "Tenant Overview" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Tenant Overview</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              Drafts
            </Button>
            <Button size="sm" className="h-8 px-3 text-xs">
              + Create New Plan
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-[#1162A8]/40">
        <CardHeader className="space-y-3 px-3 pb-2 pt-3 md:px-4 md:pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Lab Tenants</p>
              <p className="text-base font-semibold">{tenantName}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0B132B] text-xs font-semibold text-white">
                  {tenantId.slice(0, 1)}
                </span>
                <div>
                  <p className="font-medium">{tenantId}</p>
                  <p className="text-xs text-muted-foreground">dr.smith@precisiondental.com</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                Change Plan
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                Suspend Account
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b pt-1">
            {TABS.map((tab) => {
              const active = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "h-8 rounded-t-md px-3 text-xs font-medium transition-colors",
                    active ? "bg-[#1162A8] text-white" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <p>
              <span className="font-medium">Plan:</span> Professional
            </p>
            <p>
              <span className="font-medium">Status:</span> Active
            </p>
            <p>
              <span className="font-medium">Member Since:</span> Jan 2024
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-3 pb-3 md:px-4 md:pb-4">
          {activeTab === "overview" ? (
            <>
              <div className="grid gap-3 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                  <CardHeader className="px-3 pb-2 pt-3">
                    <CardTitle className="text-sm font-semibold">Current Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 px-3 pb-3 text-sm">
                    <InfoRow label="Plan" value="Professional" />
                    <InfoRow label="Monthly Fee" value="$149.00/mo" />
                    <InfoRow label="Billing Cycle" value="Monthly — Renews Apr 15, 2026" />
                    <InfoRow label="User Seats" value="4 of 5 used" />
                    <InfoRow label="Auto-Renew" value="On" />
                    <InfoRow label="Next Invoice Estimate" value="$172.50 (includes overages)" />
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="px-3 pb-2 pt-3">
                    <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 px-3 pb-3">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="block w-full rounded-md border bg-muted/20 px-2 py-1.5 text-left text-sm font-medium hover:bg-muted/40"
                      >
                        {action}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                  <CardHeader className="px-3 pb-2 pt-3">
                    <CardTitle className="text-sm font-semibold">Usage This Cycle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pb-3 text-sm">
                    <div>
                      <p className="font-medium">Slip Usage</p>
                      <p className="text-muted-foreground">93%</p>
                      <p className="text-xs text-muted-foreground">280 of 300 slips used (20 remaining)</p>
                      <p className="text-xs text-muted-foreground">Resets: Apr 1, 2026</p>
                    </div>
                    <div>
                      <p className="font-medium">Storage Usage</p>
                      <p className="text-muted-foreground">83%</p>
                      <p className="text-xs text-muted-foreground">12.4 of 15 GB used (2.6 GB remaining)</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="px-3 pb-2 pt-3">
                    <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 px-3 pb-3 text-sm">
                    {ACTIVITY.map((item) => (
                      <p key={item} className="rounded-md border bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : activeTab === "usage-analytics" ? (
            <UsageAnalyticsPanel />
          ) : activeTab === "billing-history" ? (
            <BillingHistoryPanel />
          ) : activeTab === "settings" ? (
            <SettingsPanel tenantId={tenantId} tenantName={tenantName} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {TABS.find((t) => t.id === activeTab)?.label} content is next in queue.
              </CardContent>
            </Card>
          )}

          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href="/billing-subscription/tenant-management">← Back to tenant list</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsPanel({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [autoRenew, setAutoRenew] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slipAlerts, setSlipAlerts] = useState(true)

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="px-3 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <SettingsToggleRow
            label="Auto-Renew Subscription"
            description="Automatically renew at the end of each billing cycle."
            checked={autoRenew}
            onCheckedChange={setAutoRenew}
          />
          <SettingsToggleRow
            label="Email Notifications"
            description="Receive billing and account update emails."
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
          <SettingsToggleRow
            label="Slip Usage Alerts"
            description="Notify when usage reaches 80% and 95% of limit."
            checked={slipAlerts}
            onCheckedChange={setSlipAlerts}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <InfoField label="Lab Name" value={tenantName} />
          <InfoField label="Lab ID" value={tenantId} />
          <InfoField label="Owner Name" value="Dr. Sarah Mitchell" />
          <InfoField label="Contact Email" value="dr.smith@precisiondental.com" />
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="rounded-md border bg-muted/20 px-3 py-1.5 text-sm font-medium">{value}</div>
    </div>
  )
}

function BillingHistoryPanel() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard label="Invoices (12 months)" value="12" />
        <KpiCard label="Paid total" value="$1,811.50" />
        <KpiCard label="Outstanding" value="$0.00" />
        <KpiCard label="Avg monthly bill" value="$150.95" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-3 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">Billing History</CardTitle>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
            Export
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_0.9fr] border-b bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <p>Invoice</p>
              <p>Date</p>
              <p>Amount</p>
              <p>Status</p>
              <p className="text-right">Action</p>
            </div>
            {INVOICES.map((row) => (
              <div
                key={row.invoice}
                className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_0.9fr] items-center border-b px-3 py-2 text-sm last:border-b-0"
              >
                <p className="font-medium">{row.invoice}</p>
                <p>{row.date}</p>
                <p className="font-medium">{row.amount}</p>
                <p>
                  <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {row.status}
                  </span>
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">All amounts include subscription plus any approved overages.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function UsageAnalyticsPanel() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard label="Usage growth" value="+12%" />
        <KpiCard label="Storage growth" value="+0.3 GB" />
        <KpiCard label="Active users" value="4" />
        <KpiCard label="Forecast" value="+1.2 slips/day" />
      </div>

      <Card>
        <CardHeader className="px-3 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">Cumulative Slip Usage — This Cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-7 gap-2">
            {CUMULATIVE_SERIES.map((value, idx) => (
              <div key={idx} className="space-y-1 text-center">
                <div className="flex h-24 items-end rounded-md bg-muted/30 p-1">
                  <div
                    className="w-full rounded-sm bg-[#1162A8]"
                    style={{ height: `${Math.max(8, Math.round((value / 210) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Mar {idx * 4 + 1}</p>
                <p className="text-[10px] font-medium">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Current utilization: 93% of monthly limit (280 / 300)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">Daily Slip Distribution — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          {DAILY_DISTRIBUTION.map((value, idx) => (
            <div key={idx} className="grid grid-cols-[42px_1fr_42px] items-center gap-2 text-xs">
              <span className="text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}</span>
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div className="h-full rounded bg-emerald-500" style={{ width: `${Math.max(8, (value / 60) * 100)}%` }} />
              </div>
              <span className="text-right font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-xs sm:text-sm">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
