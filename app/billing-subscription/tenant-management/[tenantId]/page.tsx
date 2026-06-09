"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Download, ExternalLink, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listSlipUsageFallbackRecords } from "@/lib/api/billing-subscription"
import { listStorageTiers, type StorageTier } from "@/lib/api/billing-config-storage"
import { getPlanMonthlyFee } from "@/lib/billing-subscription/plan-helpers"
import {
  applySuperadminPlanChange,
  cancelSuperadminCustomerAddOn,
  cancelSuperadminStorageTier,
  enableSuperadminCustomerAddOn,
  loadSuperadminBillingTenantDetail,
  startSuperadminStorageTierCheckout,
} from "@/lib/superadmin-billing/tenant-loaders"
import type { SuperadminBillingTenantDetail } from "@/lib/superadmin-billing/tenant-data"
import { cn } from "@/lib/utils"

type DetailTab = "overview" | "usage-analytics" | "billing-history" | "add-ons" | "settings"

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "usage-analytics", label: "Usage Analytics" },
  { id: "billing-history", label: "Billing History" },
  { id: "add-ons", label: "Add-Ons" },
  { id: "settings", label: "Settings" },
]

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function buildUsageCharts(records: Array<{ timestamp?: string | null; created_at?: string | null }>, detail: SuperadminBillingTenantDetail | null) {
  const periodStart = detail?.usage.billingPeriodStart ? new Date(detail.usage.billingPeriodStart) : null
  const periodEnd = detail?.usage.billingPeriodEnd ? new Date(detail.usage.billingPeriodEnd) : null

  if (!periodStart || !periodEnd || Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return { cumulative: [], daily: [] }
  }

  const dailyMap = new Map<string, number>()
  const cursor = new Date(periodStart)
  while (cursor <= periodEnd) {
    const key = cursor.toISOString().slice(0, 10)
    dailyMap.set(key, 0)
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const record of records) {
    const raw = record.timestamp || record.created_at
    if (!raw) continue
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) continue
    if (date < periodStart || date > periodEnd) continue
    const key = date.toISOString().slice(0, 10)
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
  }

  let runningTotal = 0
  const daily = Array.from(dailyMap.entries()).map(([key, value]) => ({
    label: formatDateLabel(key),
    fullDate: key,
    slips: value,
  }))
  const cumulative = daily.map((item) => {
    runningTotal += item.slips
    return {
      label: item.label,
      fullDate: item.fullDate,
      slips: runningTotal,
    }
  })

  return { cumulative, daily }
}

export default function TenantManagementDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const customerId = Number.parseInt(params?.tenantId || "", 10)
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<DetailTab>("overview")
  const [detail, setDetail] = useState<SuperadminBillingTenantDetail | null>(null)
  const [billingProfileId, setBillingProfileId] = useState<number | null>(null)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
  const [catalogPlans, setCatalogPlans] = useState<any[]>([])
  const [storageTiers, setStorageTiers] = useState<StorageTier[]>([])
  const [customerStorageTierId, setCustomerStorageTierId] = useState<number | null>(null)
  const [supports, setSupports] = useState({
    suspendAccount: false,
    bonusSlips: false,
    settingsPersistence: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [storageDialogOpen, setStorageDialogOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [selectedStorageTierId, setSelectedStorageTierId] = useState<number | null>(null)
  const [usageCharts, setUsageCharts] = useState<{ cumulative: Array<{ label: string; fullDate: string; slips: number }>; daily: Array<{ label: string; fullDate: string; slips: number }> }>({
    cumulative: [],
    daily: [],
  })

  const loadDetail = useCallback(async () => {
    if (!customerId) {
      setError("Invalid tenant id.")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const [result, storageTierCatalog, slipRecords] = await Promise.all([
        loadSuperadminBillingTenantDetail(customerId),
        listStorageTiers().catch(() => []),
        listSlipUsageFallbackRecords(customerId, { perPage: 200 }).catch(() => []),
      ])

      setDetail(result.detail)
      setBillingProfileId(result.billingProfile?.id ?? null)
      setCurrentPlanId(result.billingProfile?.billing_plan_id ?? null)
      setCatalogPlans(result.catalogPlans)
      setStorageTiers(storageTierCatalog.filter((tier) => tier.active))
      setCustomerStorageTierId(result.storageTier?.id ?? null)
      setSupports(result.supports)
      setUsageCharts(buildUsageCharts(slipRecords, result.detail))
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load tenant billing details.")
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const selectedPlan = useMemo(
    () => catalogPlans.find((plan) => plan.id === selectedPlanId) ?? null,
    [catalogPlans, selectedPlanId],
  )

  const currentPlan = useMemo(
    () => catalogPlans.find((plan) => plan.id === currentPlanId) ?? null,
    [catalogPlans, currentPlanId],
  )

  const availablePlans = useMemo(() => {
    return catalogPlans.filter((plan) => plan.id !== currentPlanId)
  }, [catalogPlans, currentPlanId])

  const selectedStorageTier = useMemo(
    () => storageTiers.find((tier) => tier.id === selectedStorageTierId) ?? null,
    [selectedStorageTierId, storageTiers],
  )

  const handlePlanChange = async () => {
    if (!billingProfileId || !selectedPlan) return
    try {
      setIsMutating(true)
      await applySuperadminPlanChange({
        profileId: billingProfileId,
        targetPlanId: selectedPlan.id,
        currentMonthlyFee: getPlanMonthlyFee(currentPlan),
        targetMonthlyFee: getPlanMonthlyFee(selectedPlan),
      })
      setPlanDialogOpen(false)
      setSelectedPlanId(null)
      toast({ title: "Plan updated", description: "The tenant subscription plan was updated successfully." })
      await loadDetail()
    } catch (mutationError: any) {
      toast({
        title: "Plan update failed",
        description: mutationError?.message || "Unable to change the tenant plan right now.",
        variant: "destructive",
      })
    } finally {
      setIsMutating(false)
    }
  }

  const handleStorageUpgrade = async () => {
    if (!selectedStorageTier || !detail) return
    try {
      setIsMutating(true)
      const response = await startSuperadminStorageTierCheckout({
        customerId: detail.header.customerId,
        billingStorageTierId: selectedStorageTier.id,
        successUrl: `${window.location.origin}/billing-subscription/tenant-management/${detail.header.customerId}`,
        cancelUrl: `${window.location.origin}/billing-subscription/tenant-management/${detail.header.customerId}`,
      })
      if (response.url) {
        window.location.href = response.url
        return
      }
      throw new Error(response.message || "Storage checkout URL was not returned.")
    } catch (mutationError: any) {
      toast({
        title: "Storage upgrade failed",
        description: mutationError?.message || "Unable to start the storage upgrade flow.",
        variant: "destructive",
      })
      setIsMutating(false)
    }
  }

  const handleCancelStorageTier = async () => {
    if (!customerStorageTierId) return
    try {
      setIsMutating(true)
      await cancelSuperadminStorageTier(customerStorageTierId)
      toast({ title: "Storage tier cancelled", description: "The storage-tier subscription was cancelled." })
      await loadDetail()
    } catch (mutationError: any) {
      toast({
        title: "Storage tier cancellation failed",
        description: mutationError?.message || "Unable to cancel the storage-tier subscription.",
        variant: "destructive",
      })
    } finally {
      setIsMutating(false)
    }
  }

  const handleToggleAddOn = async (addOn: SuperadminBillingTenantDetail["addOns"][number]) => {
    try {
      setIsMutating(true)
      if (addOn.active && addOn.customerAddOnId) {
        await cancelSuperadminCustomerAddOn(addOn.customerAddOnId)
      } else {
        await enableSuperadminCustomerAddOn({
          customerId,
          billingAddOnId: addOn.id,
        })
      }
      toast({
        title: addOn.active ? "Add-on disabled" : "Add-on enabled",
        description: `${addOn.name} was ${addOn.active ? "cancelled" : "activated"} successfully.`,
      })
      await loadDetail()
    } catch (mutationError: any) {
      toast({
        title: "Add-on update failed",
        description: mutationError?.message || "Unable to update the add-on right now.",
        variant: "destructive",
      })
    } finally {
      setIsMutating(false)
    }
  }

  const announceGap = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive",
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 bg-[#f6f7fb] px-4 py-4 md:px-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="space-y-4 bg-[#f6f7fb] px-4 py-4 md:px-6">
        <BreadcrumbBar
          items={[
            { label: "Billing & Subscription", href: "/billing-subscription" },
            { label: "Tenant Management", href: "/billing-subscription/tenant-management" },
            { label: "Tenant Overview" },
          ]}
        />
        <Card className="border-rose-200">
          <CardContent className="p-6 text-sm text-rose-600">{error || "Tenant billing data was not found."}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-[#f6f7fb] px-4 py-4 md:px-6">
      <div className="space-y-1">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <BreadcrumbBar
              items={[
                { label: "Billing & Subscription", href: "/billing-subscription" },
                { label: "Tenant Management", href: "/billing-subscription/tenant-management" },
                { label: "Tenant Overview" },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900">Billing and Subscription Control</h1>
          </div>

          <Link
            href="/billing-subscription/tenant-management"
            className="text-sm font-medium text-[#1567b8] hover:text-[#0f579c] md:pt-1"
          >
            ← Back to tenant list
          </Link>
        </div>
      </div>

      <Card className="border-[#dbe4f0] shadow-sm">
        <CardContent className="space-y-6 p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Lab Tenants</p>
              <div>
                <h2 className="text-3xl font-semibold text-slate-900">{detail.header.labName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {detail.header.labCode} · {detail.header.ownerName} · {detail.header.ownerEmail}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-10 rounded-xl border-[#d4dcea]" onClick={() => setPlanDialogOpen(true)} disabled={!billingProfileId || isMutating}>
                Change Plan
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-[#d4dcea]"
                onClick={() =>
                  announceGap(
                    "Suspend Account requires backend support",
                    "The backend currently exposes plan cancellation but not a true suspend/resume contract, so this superadmin control remains blocked.",
                  )
                }
              >
                Suspend Account
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#e7edf6] pb-3">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-[#1567b8] text-white" : "text-slate-700 hover:bg-[#edf3fb]",
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 rounded-2xl border border-[#e3eaf4] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-slate-800 md:grid-cols-3">
            <p>Plan: {detail.subscription.planName}</p>
            <p>Status: {detail.header.status}</p>
            <p>Member Since: {detail.header.memberSinceLabel}</p>
          </div>

          {activeTab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-5">
              <Card className="xl:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-slate-900">Current Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Plan" value={detail.subscription.planName} />
                  <InfoRow label="Monthly Fee" value={detail.subscription.monthlyFeeLabel} />
                  <InfoRow label="Billing Cycle" value={`Monthly — Renews ${detail.subscription.nextRenewalLabel}`} />
                  <InfoRow label="User Seats" value={detail.subscription.seatUsageLabel} />
                  <InfoRow label="Auto-Renew" value={detail.subscription.autoRenewLabel} />
                  <InfoRow label="Next Invoice Estimate" value={detail.subscription.nextInvoiceEstimate} />
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-slate-900">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ActionButton
                    label="Add Bonus Slips"
                    onClick={() =>
                      announceGap(
                        "Bonus slips require a backend grant API",
                        "No verified superadmin bonus-slip or manual credit grant endpoint is currently available, so this action remains blocked.",
                      )
                    }
                  />
                  <ActionButton label="Upgrade Storage Tier" onClick={() => setStorageDialogOpen(true)} />
                  <ActionButton
                    label="Generate Invoice"
                    onClick={() => {
                      const latestInvoice = detail.invoices[0]
                      if (latestInvoice?.downloadUrl) {
                        window.open(latestInvoice.downloadUrl, "_blank", "noopener,noreferrer")
                        return
                      }
                      announceGap("Invoice unavailable", "No downloadable invoice URL was returned for this tenant.")
                    }}
                  />
                  <ActionButton
                    label="Send Usage Alert"
                    onClick={() =>
                      announceGap(
                        "Usage alert automation is not wired",
                        "This control is visible for the superadmin workflow, but there is no verified backend alert endpoint yet.",
                      )
                    }
                  />
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-slate-900">Usage This Cycle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <UsageSummaryBlock
                    title="Slip Usage"
                    label={detail.usage.slipUsageLabel}
                    percent={detail.usage.slipUsagePercent}
                    subtitle={detail.usage.billingPeriodEnd ? `Resets ${formatDateLabel(detail.usage.billingPeriodEnd)}` : "Billing period reset unavailable"}
                  />
                  <UsageSummaryBlock
                    title="Storage Usage"
                    label={detail.usage.storageUsageLabel}
                    percent={detail.usage.storageUsagePercent}
                    subtitle={customerStorageTierId ? "Includes active storage-tier subscription" : "Using plan-included storage"}
                  />
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-slate-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detail.activity.length === 0 ? (
                    <p className="text-sm text-slate-500">No recent billing activity is available yet.</p>
                  ) : (
                    detail.activity.map((item, index) => (
                      <div key={`${item.kind}-${index}`} className="rounded-xl border border-[#e7edf6] bg-white px-3 py-2 text-sm">
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-slate-500">{item.timestamp ? formatDateLabel(item.timestamp) : "Live update"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === "usage-analytics" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <KpiCard title="Slip Usage" value={detail.usage.slipUsageLabel} subtitle={`${Math.round(detail.usage.slipUsagePercent ?? 0)}% of limit`} />
                <KpiCard title="Storage Usage" value={detail.usage.storageUsageLabel} subtitle={`${Math.round(detail.usage.storageUsagePercent ?? 0)}% of limit`} />
                <KpiCard title="Current Plan" value={detail.subscription.planName} subtitle={detail.subscription.monthlyFeeLabel} />
                <KpiCard title="Renewal" value={detail.subscription.nextRenewalLabel} subtitle="Next billing checkpoint" />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Cumulative Slip Usage — This Cycle</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageCharts.cumulative}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf6" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="slips" stroke="#1567b8" fill="#d9ecff" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Daily Slip Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageCharts.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf6" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="slips" fill="#1567b8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === "billing-history" ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Billing History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.invoices.length === 0 ? (
                  <p className="text-sm text-slate-500">No billing invoices are available for this tenant yet.</p>
                ) : (
                  detail.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col gap-3 rounded-xl border border-[#e7edf6] p-4 md:flex-row md:items-center md:justify-between">
                      <div className="grid gap-1">
                        <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-slate-500">{invoice.dateLabel}</p>
                      </div>
                      <div className="grid gap-1 text-sm md:text-right">
                        <p className="font-semibold text-slate-900">{invoice.amountLabel}</p>
                        <p className="text-slate-500">{invoice.statusLabel}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl border-[#d4dcea]"
                          onClick={() => {
                            if (invoice.downloadUrl) {
                              window.open(invoice.downloadUrl, "_blank", "noopener,noreferrer")
                              return
                            }
                            announceGap("Invoice unavailable", "This invoice does not include a hosted or PDF URL.")
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl border-[#d4dcea]"
                          onClick={() => {
                            if (invoice.downloadUrl) {
                              window.open(invoice.downloadUrl, "_blank", "noopener,noreferrer")
                              return
                            }
                            announceGap("Invoice unavailable", "This invoice does not include a downloadable URL.")
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "add-ons" ? (
            <div className="space-y-3">
              {detail.addOns.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-slate-500">No add-ons are available for this tenant yet.</CardContent>
                </Card>
              ) : (
                detail.addOns.map((addOn) => (
                  <Card key={addOn.id}>
                    <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{addOn.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{addOn.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-semibold text-slate-900">{addOn.monthlyFeeLabel}/mo</p>
                          <p className="text-sm text-slate-500">{addOn.status}</p>
                        </div>
                        <Switch checked={addOn.active} onCheckedChange={() => void handleToggleAddOn(addOn)} disabled={isMutating} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DisabledSetting
                    label="Auto-Renew Subscription"
                    description="Visible in the superadmin workspace, but persistence is blocked until a dedicated backend setting is exposed."
                  />
                  <DisabledSetting
                    label="Email Notifications"
                    description="Visible in the superadmin workspace, but no verified billing-notification setting endpoint exists yet."
                  />
                  <DisabledSetting
                    label="Slip Usage Alerts"
                    description="Visible in the superadmin workspace, but no verified alert-preference endpoint exists yet."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <ReadOnlyField label="Lab Name" value={detail.header.labName} />
                  <ReadOnlyField label="Lab ID" value={detail.header.labCode} />
                  <ReadOnlyField label="Owner Name" value={detail.header.ownerName} />
                  <ReadOnlyField label="Contact Email" value={detail.header.ownerEmail} />
                  <ReadOnlyField label="Current Plan" value={detail.subscription.planName} />
                  <ReadOnlyField label="Next Renewal" value={detail.subscription.nextRenewalLabel} />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Internal Notes</label>
                    <Textarea readOnly value="Superadmin billing settings are currently read-only until persistence endpoints are verified." className="min-h-[120px] bg-slate-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border-[#dbe4f0]">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Select a new plan for {detail.header.labName}. This action uses the live billing-profile upgrade/downgrade endpoints.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#e7edf6] bg-[#f8fbff] p-4">
              <p className="text-sm text-slate-500">Current Plan</p>
              <p className="text-xl font-semibold text-slate-900">{detail.subscription.planName}</p>
              <p className="text-sm text-slate-500">{detail.subscription.monthlyFeeLabel}/month</p>
            </div>
            <div className="grid gap-3">
              {availablePlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    selectedPlanId === plan.id ? "border-[#1567b8] bg-[#f8fbff]" : "border-[#e7edf6] bg-white hover:bg-[#f8fbff]",
                  )}
                >
                  <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                    }).format(getPlanMonthlyFee(plan))}
                    /month
                  </p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-[#d4dcea]" onClick={() => setPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-[#1567b8] hover:bg-[#0f579c]" onClick={() => void handlePlanChange()} disabled={!selectedPlanId || isMutating}>
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Plan Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={storageDialogOpen} onOpenChange={setStorageDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-[#dbe4f0]">
          <DialogHeader>
            <DialogTitle>Upgrade Storage Tier</DialogTitle>
            <DialogDescription>Select a live storage-tier plan for this tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {storageTiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedStorageTierId(tier.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                  selectedStorageTierId === tier.id ? "border-[#1567b8] bg-[#f8fbff]" : "border-[#e7edf6] bg-white hover:bg-[#f8fbff]",
                )}
              >
                <div>
                  <p className="text-lg font-semibold text-slate-900">{tier.name}</p>
                  <p className="text-sm text-slate-500">{tier.storage_gb} GB storage</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">${Number(tier.monthly_fee).toFixed(2)}/mo</p>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            {customerStorageTierId ? (
              <Button variant="outline" className="rounded-xl border-[#d4dcea]" onClick={() => void handleCancelStorageTier()} disabled={isMutating}>
                Cancel Current Storage Tier
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-xl border-[#d4dcea]" onClick={() => setStorageDialogOpen(false)}>
              Close
            </Button>
            <Button className="rounded-xl bg-[#1567b8] hover:bg-[#0f579c]" onClick={() => void handleStorageUpgrade()} disabled={!selectedStorageTierId || isMutating}>
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[180px_1fr]">
      <p className="font-medium text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[#e7edf6] bg-[#f8fbff] px-4 py-3 text-left text-base font-semibold text-slate-900 transition-colors hover:bg-[#edf3fb]"
    >
      {label}
    </button>
  )
}

function UsageSummaryBlock({
  title,
  label,
  percent,
  subtitle,
}: {
  title: string
  label: string
  percent: number | null
  subtitle: string
}) {
  const safePercent = Math.max(0, Math.min(percent ?? 0, 100))
  return (
    <div className="space-y-2">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="text-base font-semibold text-slate-800">{label}</p>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#e7edf6]">
        <div
          className={cn(
            "h-full rounded-full",
            safePercent >= 95 ? "bg-[#ff5d5d]" : safePercent >= 80 ? "bg-[#f4bf00]" : "bg-[#1ed760]",
          )}
          style={{ width: `${safePercent}%` }}
        />
      </div>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function DisabledSetting({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#e7edf6] p-4">
      <div className="max-w-2xl">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <Switch checked={false} disabled />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Input readOnly value={value} className="bg-slate-50" />
    </div>
  )
}
