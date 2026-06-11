"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Expand,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  createBillingConfigPlan,
  deleteBillingConfigPlan,
  listBillingConfigPlans,
  listPlanSubscribers,
  updateBillingConfigPlan,
  type BillingConfigPlan,
  type BillingConfigPlanPayload,
  type PlanSubscriber,
  type PriceFrequency,
} from "@/lib/api/billing-config-plans"
import {
  listCreditBooks,
  createCreditBook,
  updateCreditBook,
  deleteCreditBook,
  type CreditBook,
  type CreditBookPayload,
} from "@/lib/api/billing-config-credits"
import {
  listStorageTiers,
  createStorageTier,
  updateStorageTier,
  deleteStorageTier,
  type StorageTier,
  type StorageTierPayload,
} from "@/lib/api/billing-config-storage"
import {
  listAddons,
  createAddon,
  updateAddon,
  deleteAddon,
  type Addon,
  type AddonPayload,
} from "@/lib/api/billing-config-addons"
import { cn } from "@/lib/utils"


const PLAN_CARDS = [
  {
    key: "plan_freemium",
    name: "Freemium",
    badge: "Acquisition",
    monthly: "$0.00/mo",
    includedSlips: "20 (one-time)",
    overageRate: "N/A — Blocked",
    includedStorage: "2 GB",
    maxUsers: "1",
    prioritySupport: false,
    customBranding: false,
    activeLabs: "12 active labs",
    style: "default",
  },
  {
    key: "plan_starter",
    name: "Starter",
    badge: "Growth",
    monthly: "$49.00/mo",
    includedSlips: "100/month",
    overageRate: "$0.50/slip",
    includedStorage: "5 GB",
    maxUsers: "2",
    prioritySupport: false,
    customBranding: false,
    activeLabs: "89 active labs",
    style: "success",
  },
  {
    key: "plan_professional",
    name: "Professional",
    badge: "Most Popular",
    monthly: "$149.00/mo",
    includedSlips: "300/month",
    overageRate: "$0.50/slip",
    includedStorage: "15 GB",
    maxUsers: "5",
    prioritySupport: true,
    customBranding: false,
    activeLabs: "41 active labs",
    style: "highlight",
  },
  {
    key: "plan_enterprise",
    name: "Enterprise",
    badge: "Premium",
    monthly: "Custom Pricing",
    includedSlips: "Unlimited",
    overageRate: "N/A",
    includedStorage: "100 GB+",
    maxUsers: "Unlimited",
    prioritySupport: true,
    customBranding: true,
    activeLabs: "5 active labs",
    style: "enterprise",
  },
] as const

type WizardStep = "plan-details" | "pricing-billing" | "modules-limits" | "review-publish"
type WizardFormErrors = Record<string, string>
type PlanCardModel = (typeof PLAN_CARDS)[number] & { sourcePlan?: BillingConfigPlan }

const MODULE_OPTIONS = [
  "3D App Module",
  "Authentication & User Management",
  "API Scanner Module",
  "Billing Module",
  "Customer Service Module",
  "Driver App Module",
  "File Management Module",
  "Lab Admin Module",
  "Product Management Module",
  "Slip Management Module",
]
const BILLING_FREQUENCIES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "semi-annual", label: "Semi-Annual" },
  { id: "annual", label: "Annual" },
] as const

type PlanPriceRow = BillingConfigPlanPayload["pricing"]["prices"][number]

const LEAD_PRICE_FREQUENCY_ORDER: PriceFrequency[] = ["monthly", "quarterly", "semi_annual", "annual"]

/** Price shown on plan cards: default tier if flagged, else first known frequency in a stable order. */
function pickLeadPriceRow(prices: PlanPriceRow[] | undefined): PlanPriceRow | null {
  if (!prices?.length) return null
  return prices[0] ?? null
}

function formatLeadPlanPrice(currency: string | undefined, entry: PlanPriceRow | null): string {
  if (!entry) return "—"
  const numericPrice = typeof entry.price === "string" ? parseFloat(entry.price) : entry.price
  if (typeof numericPrice !== "number" || Number.isNaN(numericPrice)) return "—"

  const cur = (currency || "usd").toUpperCase()
  const amount = cur === "USD" ? `$${numericPrice.toFixed(2)}` : `${cur} ${numericPrice.toFixed(2)}`
  switch (entry.frequency) {
    case "monthly":
      return `${amount}/mo`
    case "quarterly":
      return `${amount}/qtr`
    case "semi_annual":
      return `${amount}/6 mo`
    case "annual":
      return `${amount}/yr`
    default:
      return amount
  }
}

function ConfigRowCard({
  title,
  description,
  value,
  status,
  onEdit,
  onDelete,
}: {
  title: string
  description: string
  value: string
  status: "Active" | "Disabled"
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums">{value}</span>
          {onEdit && (
            <button onClick={onEdit} className="text-[#1162A8] hover:text-[#0d4a7e]">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-rose-500 hover:text-rose-700">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            status === "Active" ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-muted text-muted-foreground",
          )}
        >
          {status}
        </span>
      </div>
    </div>
  )
}

function PlanCard({ plan, onDelete, onEdit, onViewSubscribers }: { plan: PlanCardModel; onDelete: (id: number) => void; onEdit: (plan: PlanCardModel) => void; onViewSubscribers?: (planId: number, planName: string) => void }) {
  const isEnterprise = plan.style === "enterprise"
  const isHighlighted = plan.style === "highlight"
  const isSuccess = plan.style === "success"

  const headerBg = isEnterprise
    ? "bg-[#1E2939]"
    : isHighlighted
      ? "bg-[#EEF2FF]"
      : isSuccess
        ? "bg-[#F0FDF4]"
        : "bg-[#F9FAFB]"

  const badgeStyle = isEnterprise
    ? "bg-[#FFFBEB] text-[#BB4D00]"
    : isHighlighted
      ? "bg-[#EEF2FF] text-[#1162A8]"
      : isSuccess
        ? "bg-[#F0FDF4] text-[#008236]"
        : "bg-white text-[#434343]"

  const titleColor = isEnterprise ? "text-white" : "text-[#101828]"
  const priceColor = isEnterprise ? "text-[#D1D5DC]" : "text-[#434343]"

  const isFreemium = plan.style === "default"

  const featureRows = isFreemium
    ? [
        { label: "Included Slips", value: plan.includedSlips },
        { label: "Included Storage", value: plan.includedStorage },
        { label: "Max User Seats", value: plan.maxUsers },
        { label: "Priority Support", value: plan.prioritySupport, icon: plan.prioritySupport ? ("check" as const) : ("cross" as const) },
        { label: "Custom Branding", value: plan.customBranding, icon: plan.customBranding ? ("check" as const) : ("cross" as const) },
      ]
    : isEnterprise
      ? [
          { label: "Included Slips", value: plan.includedSlips },
          { label: "Overage Rate", value: "N/A" },
          { label: "Continuous Rate", value: "Negotiated" },
          { label: "Included Storage", value: plan.includedStorage },
          { label: "Max User Seats", value: plan.maxUsers },
          { label: "Priority Support", value: plan.prioritySupport, icon: plan.prioritySupport ? ("check" as const) : ("cross" as const) },
          { label: "Custom Branding", value: plan.customBranding, icon: plan.customBranding ? ("check" as const) : ("cross" as const) },
        ]
      : [
          { label: "Included Slips", value: plan.includedSlips },
          { label: "Standard Overage", value: plan.overageRate },
          { label: "Continuous Rate", value: isHighlighted ? "$0.45/slip" : "N/A" },
          { label: "Included Storage", value: plan.includedStorage },
          { label: "Max User Seats", value: plan.maxUsers },
          { label: "Priority Support", value: plan.prioritySupport, icon: plan.prioritySupport ? ("check" as const) : ("cross" as const) },
          { label: "Custom Branding", value: plan.customBranding, icon: plan.customBranding ? ("check" as const) : ("cross" as const) },
        ] as Array<{ label: string; value: string | boolean; icon?: "check" | "cross" }>

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[14px] border bg-white",
        isHighlighted
          ? "border-[rgba(79,70,229,0.3)] shadow-[0_0_0_1px_rgba(79,70,229,0.1),0_2px_12px_rgba(79,70,229,0.12)]"
          : "border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
      )}
    >
      {/* Card header */}
      <div className={cn("flex flex-col gap-1 px-5 pb-4 pt-5", headerBg)}>
        <div className="flex items-center justify-between">
          <span className={cn("text-[19px] font-bold leading-7", titleColor)}>{plan.name}</span>
          <span className={cn("rounded-full px-3 py-0.5 text-[13px] font-medium", badgeStyle)}>
            {isHighlighted ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3" />
                {plan.badge}
              </span>
            ) : (
              plan.badge
            )}
          </span>
        </div>
        <p className={cn(plan.monthly === "Custom Pricing" ? "text-[20px] font-semibold leading-9 opacity-80" : "text-[23px] font-bold leading-9", priceColor)}>{plan.monthly}</p>
      </div>

      {/* Feature rows */}
      <div className="flex flex-1 flex-col">
        {featureRows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-5 py-3",
              i % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]",
            )}
          >
            <span className="text-[13px] text-[#777777]">{row.label}</span>
            <div className="flex items-center gap-1">
              {row.icon === "check" ? <Check className="h-4 w-4 text-[#34C759]" /> : null}
              {row.icon === "cross" ? <X className="h-4 w-4 text-[#CF0202]" /> : null}
              {typeof row.value === "string" ? (
                <span className="text-[14px] font-medium text-[#434343]">{row.value}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(plan) }}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1162A8] hover:text-[#0d4a7e]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Plan
          </button>
          {plan.sourcePlan?.id ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-rose-500 hover:text-rose-700"
              onClick={(e) => {
                e.stopPropagation()
                if (plan.sourcePlan?.id) onDelete(plan.sourcePlan.id)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {plan.sourcePlan?.id && onViewSubscribers ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewSubscribers(plan.sourcePlan!.id!, plan.name) }}
            className="text-[13px] text-[#1162A8] underline-offset-2 hover:underline"
          >
            {plan.activeLabs}
          </button>
        ) : (
          <span className="text-[13px] text-[#777777]">{plan.activeLabs}</span>
        )}
      </div>
    </div>
  )
}

function FeatureRow({ label, value, icon }: { label: string; value: string; icon?: "check" | "cross" }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      <p className="text-[13px] leading-tight">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon === "check" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
        {icon === "cross" ? <X className="h-3.5 w-3.5 text-rose-500" /> : null}
        <span className="text-[13px] font-semibold leading-tight text-[#2f343b] dark:text-slate-100">{value}</span>
      </div>
    </div>
  )
}

export default function BillingConfigurationPage() {
  const [openWizard, setOpenWizard] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null)
  const [editingPlanName, setEditingPlanName] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>("plan-details")
  const [plans, setPlans] = useState<BillingConfigPlan[]>([])
  const [isPlansLoading, setIsPlansLoading] = useState(false)
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false)
  const [isPlanDeleting, setIsPlanDeleting] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<number | null>(null)
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)
  const [planStatusMessage, setPlanStatusMessage] = useState("")
  const [moduleSearch, setModuleSearch] = useState("")
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "Slip Management Module",
    "Billing Module",
    "Lab Admin Module",
  ])
  const [planName, setPlanName] = useState("")
  const [planDescription, setPlanDescription] = useState("")
  const [badgeLabel, setBadgeLabel] = useState("")
  const [displayOrder, setDisplayOrder] = useState("")
  const [isDraftVisible, setIsDraftVisible] = useState(true)
  const [selectedBillingFrequencies, setSelectedBillingFrequencies] = useState<string[]>(["monthly"])
  const [pricingByFrequency, setPricingByFrequency] = useState<Record<string, string>>({
    monthly: "0.00",
    quarterly: "0.00",
    "semi-annual": "0.00",
    annual: "0.00",
  })
  const [trialEnabled, setTrialEnabled] = useState(true)
  const [trialDays, setTrialDays] = useState("")
  const [trialAccessMode, setTrialAccessMode] = useState<"full-access" | "feature-limited">("full-access")
  const [requirePaymentForTrial, setRequirePaymentForTrial] = useState(false)
  const [overageEnabled, setOverageEnabled] = useState(true)
  const [standardOverageRate, setStandardOverageRate] = useState("0.00")
  const [discountedContinuousRate, setDiscountedContinuousRate] = useState("0.00")
  const [overageBillingMethod, setOverageBillingMethod] = useState<"end-cycle" | "real-time">("end-cycle")
  const [monthlySlipAllocation, setMonthlySlipAllocation] = useState("")
  const [includedStorageGb, setIncludedStorageGb] = useState("")
  const [maxAdminSeat, setMaxAdminSeat] = useState("")
  const [maxUserSeat, setMaxUserSeat] = useState("")
  const [enforcementAtSlip, setEnforcementAtSlip] = useState("block-new-case-creation")
  const [enforcementAtStorage, setEnforcementAtStorage] = useState("block-new-file-uploads")
  const [gracePeriodDays, setGracePeriodDays] = useState("15")
  const [slipResetMode, setSlipResetMode] = useState<"reset-each-cycle" | "carry-over">("reset-each-cycle")
  const [formErrors, setFormErrors] = useState<WizardFormErrors>({})
  const [openRuleModal, setOpenRuleModal] = useState(false)
  const [ruleKey, setRuleKey] = useState("")
  const [ruleType, setRuleType] = useState("Boolean")
  const [ruleValue, setRuleValue] = useState("")
  const [ruleDescription, setRuleDescription] = useState("")
  const [tenantOverrideAllowed, setTenantOverrideAllowed] = useState(false)
  const [ruleEffective, setRuleEffective] = useState<"immediately" | "scheduled">("immediately")
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({})
  const [publishMode, setPublishMode] = useState<"immediately" | "scheduled" | "draft">("immediately")
  const [launchDate, setLaunchDate] = useState("")
  const [launchHour, setLaunchHour] = useState(8)
  const [launchMinute, setLaunchMinute] = useState(0)
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [openCreditBookModal, setOpenCreditBookModal] = useState(false)
  const [openStorageTierModal, setOpenStorageTierModal] = useState(false)
  const [openAddonModal, setOpenAddonModal] = useState(false)
  const [creditBookErrors, setCreditBookErrors] = useState<Record<string, string>>({})
  const [storageTierErrors, setStorageTierErrors] = useState<Record<string, string>>({})
  const [addonErrors, setAddonErrors] = useState<Record<string, string>>({})
  const [creditBooks, setCreditBooks] = useState<CreditBook[]>([])
  const [isCreditsLoading, setIsCreditsLoading] = useState(false)
  const [editingCreditBookId, setEditingCreditBookId] = useState<number | null>(null)
  const [isCreditSubmitting, setIsCreditSubmitting] = useState(false)
  const [openCreditDeleteConfirm, setOpenCreditDeleteConfirm] = useState(false)
  const [creditToDelete, setCreditToDelete] = useState<number | null>(null)

  const [creditBookForm, setCreditBookForm] = useState({
    name: "",
    price: "",
    slip_amount: "",
    active: true,
  })
  const [storageTiers, setStorageTiers] = useState<StorageTier[]>([])
  const [isStorageLoading, setIsStorageLoading] = useState(false)
  const [editingStorageTierId, setEditingStorageTierId] = useState<number | null>(null)
  const [isStorageSubmitting, setIsStorageSubmitting] = useState(false)
  const [openStorageDeleteConfirm, setOpenStorageDeleteConfirm] = useState(false)
  const [storageToDelete, setStorageToDelete] = useState<number | null>(null)

  const [storageTierForm, setStorageTierForm] = useState({
    name: "",
    storage_gb: "",
    monthly_fee: "",
    active: true,
  })
  const [addons, setAddons] = useState<Addon[]>([])
  const [isAddonsLoading, setIsAddonsLoading] = useState(false)
  const [editingAddonId, setEditingAddonId] = useState<number | null>(null)
  const [isAddonSubmitting, setIsAddonSubmitting] = useState(false)
  const [openAddonDeleteConfirm, setOpenAddonDeleteConfirm] = useState(false)
  const [addonToDelete, setAddonToDelete] = useState<number | null>(null)

  const [addonForm, setAddonForm] = useState({
    name: "",
    monthly_fee: "",
    config: '{\n  "hosting": true,\n  "custom_domain": true,\n  "branding": true\n}',
    active: true,
  })

  const [openSubscribersModal, setOpenSubscribersModal] = useState(false)
  const [subscribersModalPlan, setSubscribersModalPlan] = useState<{ id: number; name: string } | null>(null)
  const [subscribers, setSubscribers] = useState<PlanSubscriber[]>([])
  const [isSubscribersLoading, setIsSubscribersLoading] = useState(false)

  const openSubscribers = async (planId: number, planName: string) => {
    setSubscribersModalPlan({ id: planId, name: planName })
    setSubscribers([])
    setOpenSubscribersModal(true)
    setIsSubscribersLoading(true)
    try {
      const data = await listPlanSubscribers(planId)
      setSubscribers(data)
    } catch {
      setSubscribers([])
    } finally {
      setIsSubscribersLoading(false)
    }
  }

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase()
    if (!q) return MODULE_OPTIONS
    return MODULE_OPTIONS.filter((m) => m.toLowerCase().includes(q))
  }, [moduleSearch])

  const fetchPlans = async () => {
    setIsPlansLoading(true)
    try {
      const data = await listBillingConfigPlans()
      setPlans(data)
      setPlanStatusMessage("")
    } catch (error: any) {
      setPlanStatusMessage(error?.message || "Failed to fetch plans.")
    } finally {
      setIsPlansLoading(false)
    }
  }

  const fetchCreditBooks = async () => {
    setIsCreditsLoading(true)
    try {
      const data = await listCreditBooks()
      setCreditBooks(data)
    } catch (error) {
      console.error("Failed to fetch credit books", error)
    } finally {
      setIsCreditsLoading(false)
    }
  }

  const fetchStorageTiers = async () => {
    setIsStorageLoading(true)
    try {
      const data = await listStorageTiers()
      setStorageTiers(data)
    } catch (error) {
      console.error("Failed to fetch storage tiers", error)
    } finally {
      setIsStorageLoading(false)
    }
  }

  const fetchAddons = async () => {
    setIsAddonsLoading(true)
    try {
      const data = await listAddons()
      setAddons(data)
    } catch (error) {
      console.error("Failed to fetch addons", error)
    } finally {
      setIsAddonsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchCreditBooks()
    fetchStorageTiers()
    fetchAddons()
  }, [])

  const mapFrequencyToApi = (frequencyId: string): BillingConfigPlanPayload["pricing"]["prices"][number]["frequency"] => {
    if (frequencyId === "semi-annual") return "semi_annual"
    if (frequencyId === "quarterly") return "quarterly"
    if (frequencyId === "annual") return "annual"
    return "monthly"
  }

  const mapToPlanCards = (apiPlans: BillingConfigPlan[]): PlanCardModel[] => {
    return apiPlans.map((plan) => {
      const lead = pickLeadPriceRow(plan.pricing?.prices)
      let priceDisplay = formatLeadPlanPrice(plan.pricing?.currency, lead)
      const isEnterprise = plan.name.toLowerCase().includes("enterprise")
      if (isEnterprise) {
        const numericPrice = lead ? (typeof lead.price === "string" ? parseFloat(lead.price) : lead.price) : null
        if (priceDisplay === "—" || numericPrice === null || numericPrice === 0) {
          priceDisplay = "Custom Pricing"
        }
      }
      const nameLower = plan.name.toLowerCase()
      const style: PlanCardModel["style"] =
        nameLower.includes("enterprise") ? "enterprise" : nameLower.includes("professional") ? "highlight" : nameLower.includes("starter") ? "success" : "default"

      return {
        key: `plan_${plan.id}`,
        name: plan.name,
        badge: plan.badge_label || (style === "enterprise" ? "Premium" : style === "highlight" ? "Most Popular" : style === "success" ? "Growth" : "Acquisition"),
        monthly: priceDisplay,
        includedSlips: plan.feature_limits?.slip_capacity ? `${plan.feature_limits.slip_capacity}/month` : "N/A",
        overageRate: plan.overage_policy?.standard_rate ? `$${Number(plan.overage_policy.standard_rate).toFixed(2)}/slip` : "N/A",
        includedStorage: plan.feature_limits?.included_storage_gb ? `${plan.feature_limits.included_storage_gb} GB` : "N/A",
        maxUsers: plan.feature_limits?.max_user_seats ? `${plan.feature_limits.max_user_seats}` : "N/A",
        prioritySupport: style === "enterprise" || style === "highlight",
        customBranding: style === "enterprise",
        activeLabs: plan.active_labs_count !== undefined ? `${plan.active_labs_count} active labs` : "— labs",
        style,
        sourcePlan: plan,
      }
    })
  }

  const planCards = useMemo(() => mapToPlanCards(plans), [plans])

  const resetPlanWizardForm = () => {
    setPlanName("")
    setPlanDescription("")
    setBadgeLabel("")
    setDisplayOrder("")
    setIsDraftVisible(true)
    setSelectedBillingFrequencies(["monthly"])
    setPricingByFrequency({ monthly: "0.00", quarterly: "0.00", "semi-annual": "0.00", annual: "0.00" })
    setTrialEnabled(true)
    setTrialDays("")
    setTrialAccessMode("full-access")
    setRequirePaymentForTrial(false)
    setOverageEnabled(true)
    setStandardOverageRate("0.00")
    setDiscountedContinuousRate("0.00")
    setOverageBillingMethod("end-cycle")
    setMonthlySlipAllocation("")
    setIncludedStorageGb("")
    setMaxAdminSeat("")
    setMaxUserSeat("")
    setSlipResetMode("reset-each-cycle")
    setSelectedModules(["Slip Management Module", "Billing Module", "Lab Admin Module"])
    setEnforcementAtSlip("block-new-case-creation")
    setEnforcementAtStorage("block-new-file-uploads")
    setGracePeriodDays("15")
  }

  const hydratePlanWizardForm = (plan: BillingConfigPlan) => {
    setPlanName(plan.name || "")
    setPlanDescription(plan.description || "")
    setBadgeLabel(plan.badge_label || "")
    setDisplayOrder(plan.display_order?.toString() || "")
    setIsDraftVisible(plan.status === "draft")
    const frequencies = (plan.pricing?.prices || []).map((p) => (p.frequency === "semi_annual" ? "semi-annual" : p.frequency))
    setSelectedBillingFrequencies(frequencies.length ? frequencies : ["monthly"])
    const priceMap: Record<string, string> = { monthly: "0.00", quarterly: "0.00", "semi-annual": "0.00", annual: "0.00" }
    ;(plan.pricing?.prices || []).forEach((p) => {
      const key = p.frequency === "semi_annual" ? "semi-annual" : p.frequency
      priceMap[key] = String(p.price)
    })
    setPricingByFrequency(priceMap)
    setTrialEnabled(Boolean(plan.trial?.enabled))
    setTrialDays(plan.trial?.trial_days?.toString() || "")
    setTrialAccessMode(plan.trial?.access_mode === "feature_limited" ? "feature-limited" : "full-access")
    setRequirePaymentForTrial(Boolean(plan.trial?.requires_payment_method))
    setOverageEnabled(Boolean(plan.overage_policy?.enabled))
    setStandardOverageRate(plan.overage_policy?.standard_rate?.toString() || "0.00")
    setDiscountedContinuousRate(plan.overage_policy?.discounted_continuous_rate?.toString() || "0.00")
    setOverageBillingMethod(plan.overage_policy?.billing_method === "real_time" ? "real-time" : "end-cycle")
    setMonthlySlipAllocation(plan.feature_limits?.slip_capacity?.toString() || "")
    setIncludedStorageGb(plan.feature_limits?.included_storage_gb?.toString() || "")
    setMaxAdminSeat(plan.feature_limits?.max_admin_seats?.toString() || "")
    setMaxUserSeat(plan.feature_limits?.max_user_seats?.toString() || "")
    setSlipResetMode(plan.feature_limits?.capacity_type === "carry_over_unused" ? "carry-over" : "reset-each-cycle")
    const moduleNames = (plan.module_ids || []).map((id) => MODULE_OPTIONS[id - 1]).filter(Boolean)
    setSelectedModules(moduleNames.length ? moduleNames : [])
    setEnforcementAtSlip(
      plan.enforcement?.at_slip_limit === "allow_overage_standard_rate"
        ? "allow-overage-standard"
        : plan.enforcement?.at_slip_limit === "warning_only"
          ? "warning-only"
          : "block-new-case-creation",
    )
    setEnforcementAtStorage(
      plan.enforcement?.at_storage_limit === "allow_with_overage_charges"
        ? "allow-overage-charge"
        : plan.enforcement?.at_storage_limit === "warning_only"
          ? "warning-only"
          : "block-new-file-uploads",
    )
    setGracePeriodDays(plan.enforcement?.grace_period_days?.toString() || "15")
  }

  const openCreate = () => {
    setEditingPlanId(null)
    setEditingPlanName(null)
    resetPlanWizardForm()
    setWizardStep("plan-details")
    setOpenWizard(true)
    setFormErrors({})
    setPlanStatusMessage("")
  }

  const openEdit = (card: PlanCardModel) => {
    setEditingPlanId(card.sourcePlan?.id ?? null)
    setEditingPlanName(card.name)
    if (card.sourcePlan) hydratePlanWizardForm(card.sourcePlan)
    setWizardStep("plan-details")
    setOpenWizard(true)
    setFormErrors({})
    setPlanStatusMessage("")
  }

  const nextStep = () => {
    const errors: WizardFormErrors = {}

    if (wizardStep === "plan-details") {
      if (!planName.trim()) errors.planName = "Plan name is required."
      if (!displayOrder.trim()) errors.displayOrder = "Display order is required."
      if (displayOrder && Number.isNaN(Number(displayOrder))) errors.displayOrder = "Display order must be a number."
    }

    if (wizardStep === "pricing-billing") {
      if (selectedBillingFrequencies.length === 0) {
        errors.selectedBillingFrequencies = "Select at least one billing frequency."
      }
      selectedBillingFrequencies.forEach((frequencyId) => {
        const raw = pricingByFrequency[frequencyId]
        const price = raw === "" || raw === undefined ? 0 : Number(raw)
        if (Number.isNaN(price) || !Number.isFinite(price)) {
          errors[`price-${frequencyId}`] = "Enter a valid price."
        }
      })
      if (trialEnabled && trialDays !== "" && Number.isNaN(Number(trialDays))) {
        errors.trialDays = "Enter a valid number of trial days."
      }
      if (overageEnabled) {
        const standard = Number(standardOverageRate)
        const discounted = Number(discountedContinuousRate)
        if (Number.isNaN(standard) || !Number.isFinite(standard)) {
          errors.standardOverageRate = "Enter a valid standard overage rate."
        }
        if (Number.isNaN(discounted) || !Number.isFinite(discounted)) {
          errors.discountedContinuousRate = "Enter a valid discounted rate."
        }
      }
    }

    if (wizardStep === "modules-limits") {
      if (gracePeriodDays.trim() && (Number.isNaN(Number(gracePeriodDays)) || !Number.isFinite(Number(gracePeriodDays)))) {
        errors.gracePeriodDays = "Grace period must be a valid number."
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    if (wizardStep === "plan-details") setWizardStep("pricing-billing")
    else if (wizardStep === "pricing-billing") setWizardStep("modules-limits")
    else if (wizardStep === "modules-limits") setWizardStep("review-publish")
  }

  const prevStep = () => {
    if (wizardStep === "review-publish") setWizardStep("modules-limits")
    else if (wizardStep === "modules-limits") setWizardStep("pricing-billing")
    else if (wizardStep === "pricing-billing") setWizardStep("plan-details")
  }

  const toggleModule = (moduleName: string, checked: boolean) => {
    setSelectedModules((prev) =>
      checked ? [...prev, moduleName] : prev.filter((item) => item !== moduleName),
    )
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.selectedModules
      return next
    })
  }

  const toggleBillingFrequency = (frequencyId: string, checked: boolean) => {
    setSelectedBillingFrequencies((prev) => {
      if (checked) {
        if (prev.includes(frequencyId)) return prev
        return [...prev, frequencyId]
      }
      return prev.filter((id) => id !== frequencyId)
    })
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.selectedBillingFrequencies
      return next
    })
  }

  const updateFrequencyPrice = (frequencyId: string, value: string) => {
    setPricingByFrequency((prev) => ({ ...prev, [frequencyId]: value }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next[`price-${frequencyId}`]
      return next
    })
  }

  const buildPlanPayload = (): BillingConfigPlanPayload => {
    const prices = selectedBillingFrequencies.map((frequencyId, index) => {
      const raw = pricingByFrequency[frequencyId]
      const price = raw === "" || raw === undefined ? 0 : Number(raw)
      return {
        frequency: mapFrequencyToApi(frequencyId),
        price: Number.isFinite(price) ? price : 0,
        is_default: index === 0,
      }
    })
    const moduleIds = selectedModules
      .map((moduleName) => MODULE_OPTIONS.indexOf(moduleName) + 1)
      .filter((id) => id > 0)

    return {
      name: planName.trim(),
      description: planDescription.trim() || undefined,
      badge_label: badgeLabel.trim() || undefined,
      display_order: Number(displayOrder),
      status: isDraftVisible ? "draft" : "active",
      feature_limits: {
        slip_capacity: Number(monthlySlipAllocation || 0),
        capacity_type: slipResetMode === "carry-over" ? "carry_over_unused" : "reset_each_cycle",
        included_storage_gb: Number(includedStorageGb || 0),
        max_admin_seats: Number(maxAdminSeat || 0),
        max_user_seats: Number(maxUserSeat || 0),
      },
      pricing: {
        currency: "usd",
        prices,
      },
      trial: {
        enabled: trialEnabled,
        trial_days: trialDays ? Number(trialDays) : undefined,
        access_mode: trialAccessMode === "feature-limited" ? "feature_limited" : "full_access",
        requires_payment_method: requirePaymentForTrial,
      },
      overage_policy: {
        enabled: overageEnabled,
        standard_rate: Number(standardOverageRate || 0),
        discounted_continuous_rate: Number(discountedContinuousRate || 0),
        billing_method: overageBillingMethod === "real-time" ? "real_time" : "end_of_cycle",
      },
      module_ids: moduleIds,
      enforcement: {
        at_slip_limit:
          enforcementAtSlip === "allow-overage-standard"
            ? "allow_overage_standard_rate"
            : enforcementAtSlip === "warning-only"
              ? "warning_only"
              : "block_new_case_creation",
        at_storage_limit:
          enforcementAtStorage === "allow-overage-charge"
            ? "allow_with_overage_charges"
            : enforcementAtStorage === "warning-only"
              ? "warning_only"
              : "block_new_file_upload",
        grace_period_days: Number(gracePeriodDays || 0),
      },
    }
  }

  const confirmDelete = (id: number) => {
    setPlanToDelete(id)
    setOpenDeleteConfirm(true)
  }

  const handleDeletePlan = async () => {
    if (!planToDelete) return
    setIsPlanDeleting(true)
    try {
      await deleteBillingConfigPlan(planToDelete)
      setPlanStatusMessage("Plan deleted successfully.")
      await fetchPlans()
      setOpenDeleteConfirm(false)
      setPlanToDelete(null)
    } catch (error: any) {
      setPlanStatusMessage(error?.message || "Failed to delete plan.")
    } finally {
      setIsPlanDeleting(false)
    }
  }

  const submitPlan = async () => {
    setIsPlanSubmitting(true)
    try {
      const payload = buildPlanPayload()
      if (editingPlanId) {
        await updateBillingConfigPlan(editingPlanId, payload)
        setPlanStatusMessage("Plan updated successfully.")
      } else {
        await createBillingConfigPlan(payload)
        setPlanStatusMessage("Plan created successfully.")
      }
      await fetchPlans()
      setOpenWizard(false)
    } catch (error: any) {
      setPlanStatusMessage(error?.message || "Failed to save plan.")
    } finally {
      setIsPlanSubmitting(false)
    }
  }

  const submitRule = () => {
    const errors: Record<string, string> = {}
    if (!ruleKey.trim()) errors.ruleKey = "Rule key is required."
    if (!ruleValue.trim()) errors.ruleValue = "Value is required."
    if (!ruleDescription.trim()) errors.ruleDescription = "Description is required."
    if (Object.keys(errors).length > 0) {
      setRuleErrors(errors)
      return
    }
    setRuleErrors({})
    setOpenRuleModal(false)
  }



  const openAddonCreate = () => {
    setEditingAddonId(null)
    setAddonForm({
      name: "",
      monthly_fee: "",
      config: '{\n  "hosting": true,\n  "custom_domain": true,\n  "branding": true\n}',
      active: true,
    })
    setAddonErrors({})
    setOpenAddonModal(true)
  }

  const openAddonEdit = (addon: Addon) => {
    setEditingAddonId(addon.id)
    setAddonForm({
      name: addon.name,
      monthly_fee: String(addon.monthly_fee),
      config: JSON.stringify(addon.config, null, 2),
      active: addon.active,
    })
    setAddonErrors({})
    setOpenAddonModal(true)
  }

  const confirmDeleteAddon = (id: number) => {
    setAddonToDelete(id)
    setOpenAddonDeleteConfirm(true)
  }

  const handleDeleteAddon = async () => {
    if (!addonToDelete) return
    try {
      await deleteAddon(addonToDelete)
      await fetchAddons()
      setOpenAddonDeleteConfirm(false)
      setAddonToDelete(null)
    } catch (error) {
      console.error("Failed to delete addon", error)
    }
  }

  const submitAddon = async () => {
    const errors: Record<string, string> = {}
    if (!addonForm.name.trim()) errors.name = "Name is required."
    if (!addonForm.monthly_fee.trim()) errors.monthly_fee = "Monthly fee is required."
    if (!addonForm.config.trim()) errors.config = "Config is required."

    if (Object.keys(errors).length > 0) {
      setAddonErrors(errors)
      return
    }

    setIsAddonSubmitting(true)
    try {
      const payload: AddonPayload = {
        name: addonForm.name,
        monthly_fee: parseFloat(addonForm.monthly_fee) || 0,
        config: JSON.parse(addonForm.config),
        active: addonForm.active,
      }

      if (editingAddonId) {
        await updateAddon(editingAddonId, payload)
      } else {
        await createAddon(payload)
      }

      await fetchAddons()
      setOpenAddonModal(false)
    } catch (error) {
      console.error("Failed to submit addon", error)
      setAddonErrors({ config: "Invalid JSON format." })
    } finally {
      setIsAddonSubmitting(false)
    }
  }

  const openCreditCreate = () => {
    setEditingCreditBookId(null)
    setCreditBookForm({
      name: "",
      price: "",
      slip_amount: "",
      active: true,
    })
    setCreditBookErrors({})
    setOpenCreditBookModal(true)
  }

  const openCreditEdit = (book: CreditBook) => {
    setEditingCreditBookId(book.id)
    setCreditBookForm({
      name: book.name,
      price: String(book.price),
      slip_amount: String(book.slip_amount),
      active: book.active,
    })
    setCreditBookErrors({})
    setOpenCreditBookModal(true)
  }

  const confirmDeleteCredit = (id: number) => {
    setCreditToDelete(id)
    setOpenCreditDeleteConfirm(true)
  }

  const handleDeleteCredit = async () => {
    if (!creditToDelete) return
    try {
      await deleteCreditBook(creditToDelete)
      await fetchCreditBooks()
      setOpenCreditDeleteConfirm(false)
      setCreditToDelete(null)
    } catch (error) {
      console.error("Failed to delete credit book", error)
    }
  }

  const submitCreditBook = async () => {
    const errors: Record<string, string> = {}
    if (!creditBookForm.name.trim()) errors.name = "Name is required."
    if (!creditBookForm.price.trim()) errors.price = "Price is required."
    if (!creditBookForm.slip_amount.trim()) errors.slip_amount = "Slip amount is required."

    if (Object.keys(errors).length > 0) {
      setCreditBookErrors(errors)
      return
    }

    setIsCreditSubmitting(true)
    try {
      const payload: CreditBookPayload = {
        name: creditBookForm.name,
        price: parseFloat(creditBookForm.price) || 0,
        slip_amount: parseInt(creditBookForm.slip_amount) || 0,
        active: creditBookForm.active,
      }

      if (editingCreditBookId) {
        await updateCreditBook(editingCreditBookId, payload)
      } else {
        await createCreditBook(payload)
      }

      await fetchCreditBooks()
      setOpenCreditBookModal(false)
    } catch (error) {
      console.error("Failed to submit credit book", error)
    } finally {
      setIsCreditSubmitting(false)
    }
  }

  const openStorageCreate = () => {
    setEditingStorageTierId(null)
    setStorageTierForm({
      name: "",
      storage_gb: "",
      monthly_fee: "",
      active: true,
    })
    setStorageTierErrors({})
    setOpenStorageTierModal(true)
  }

  const openStorageEdit = (tier: StorageTier) => {
    setEditingStorageTierId(tier.id)
    setStorageTierForm({
      name: tier.name,
      storage_gb: String(tier.storage_gb),
      monthly_fee: String(tier.monthly_fee),
      active: tier.active,
    })
    setStorageTierErrors({})
    setOpenStorageTierModal(true)
  }

  const confirmDeleteStorage = (id: number) => {
    setStorageToDelete(id)
    setOpenStorageDeleteConfirm(true)
  }

  const handleDeleteStorage = async () => {
    if (!storageToDelete) return
    try {
      await deleteStorageTier(storageToDelete)
      await fetchStorageTiers()
      setOpenStorageDeleteConfirm(false)
      setStorageToDelete(null)
    } catch (error) {
      console.error("Failed to delete storage tier", error)
    }
  }

  const submitStorageTier = async () => {
    const errors: Record<string, string> = {}
    if (!storageTierForm.name.trim()) errors.name = "Name is required."
    if (!storageTierForm.storage_gb.trim()) errors.storage_gb = "Storage capacity is required."
    if (!storageTierForm.monthly_fee.trim()) errors.monthly_fee = "Monthly fee is required."

    if (Object.keys(errors).length > 0) {
      setStorageTierErrors(errors)
      return
    }

    setIsStorageSubmitting(true)
    try {
      const payload: StorageTierPayload = {
        name: storageTierForm.name,
        storage_gb: parseInt(storageTierForm.storage_gb) || 0,
        monthly_fee: parseFloat(storageTierForm.monthly_fee) || 0,
        active: storageTierForm.active,
      }

      if (editingStorageTierId) {
        await updateStorageTier(editingStorageTierId, payload)
      } else {
        await createStorageTier(payload)
      }

      await fetchStorageTiers()
      setOpenStorageTierModal(false)
    } catch (error) {
      console.error("Failed to submit storage tier", error)
    } finally {
      setIsStorageSubmitting(false)
    }
  }


  return (
    <div className="w-full space-y-3 px-2 py-3 md:px-3">
      <div className="space-y-2">
        <BreadcrumbBar
          items={[
            { label: "Billing & Subscription", href: "/billing-subscription" },
            { label: "Global Configurations" },
          ]}
        />
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Billing and subscription control</h1>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-md bg-muted/40 p-1 md:inline-flex md:w-auto">
          {(
            [
              ["plans", "Plan Tiers"],
              ["rules", "Freemium Inclusions"],
              ["credits", "Promotional Offers"],
              ["storage", "Storage tiers"],
              ["addons", "Add-ons"],
            ] as const
          ).map(([id, label]) => (
            <TabsTrigger
              key={id}
              value={id}
              className="h-8 rounded-md px-3 text-xs font-medium data-[state=active]:bg-[#1162A8] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="plans" className="mt-0 space-y-3 outline-none">
          <Card className="border-[#1162A8]/40">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pb-3 pt-5">
              <div>
                <CardTitle className="text-[18px] font-bold text-[#101828]">Global Pricing</CardTitle>
                <CardDescription className="mt-1 text-[13px] text-[#777777]">Last updated: Mar 3, 2026 by admin@platform.com</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border border-[#D0D5DD] px-4 text-[13px] font-medium text-[#434343] hover:bg-[#F9FAFB]"
                  type="button"
                >
                  Drafts
                </Button>
                <Button
                  size="sm"
                  className="h-9 rounded-lg bg-[#1162A8] px-4 text-[13px] font-medium text-white hover:bg-[#0d4a7e]"
                  type="button"
                  onClick={openCreate}
                >
                  + Create New Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {planCards.map((plan) => (
                  <div
                    key={plan.key}
                    className="h-full cursor-pointer text-left"
                  >
                    <PlanCard plan={plan} onDelete={confirmDelete} onEdit={openEdit} onViewSubscribers={openSubscribers} />
                  </div>
                ))}
              </div>

              {isPlansLoading ? <p className="text-xs text-muted-foreground">Loading plans...</p> : null}
              <div className="grid gap-2 md:grid-cols-3">
                <Card className="shadow-none">
                  <CardContent className="px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Average Revenue Per Lab</p>
                    <p className="text-sm font-semibold">$118.42/mo</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Plan Distribution</p>
                    <p className="text-sm font-semibold">63% Starter, 29% Pro, 4% Enterprise, 4% Free</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Upgrade Rate This Quarter</p>
                    <p className="text-sm font-semibold">12.3%</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {planStatusMessage ? <p className="text-xs text-muted-foreground">{planStatusMessage}</p> : null}
        </TabsContent>

        <TabsContent value="rules" className="mt-0 space-y-3 outline-none">
          <Card className="border-[#1162A8]/25">
            <CardHeader className="px-3 pb-2 pt-3">
              <CardTitle className="text-base">Rules (Global)</CardTitle>
              <CardDescription className="text-xs">
                Define billing rules and behavior applied across plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <ConfigRowCard
                title="Standard overage rate"
                description="Applies when plan overage is blank; charge per slip beyond plan cap."
                value="$0.50 / slip"
                status="Active"
              />
              <ConfigRowCard
                title="Continuous rate mode"
                description="If enabled, charges overage on a rolling basis instead of monthly reset."
                value="N/A"
                status="Disabled"
              />
              <ConfigRowCard
                title="Proration on plan change"
                description="Calculate credits/charges based on remaining days in cycle."
                value="Enabled"
                status="Active"
              />
              <ConfigRowCard
                title="Grace threshold"
                description="Allow small overages before charging (e.g., 2 slips)."
                value="2 slips"
                status="Active"
              />
              <Button type="button" className="h-8 px-3 text-xs" onClick={() => setOpenRuleModal(true)}>
                Create Rules
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="mt-0 space-y-3 outline-none">
          {isCreditsLoading ? (
            <p className="text-xs text-muted-foreground">Loading credit books...</p>
          ) : creditBooks.length > 0 ? (
            creditBooks.map((book) => (
              <ConfigRowCard
                key={book.id}
                title={book.name}
                description={`${book.slip_amount} slips included.`}
                value={`$${book.price}`}
                status={book.active ? "Active" : "Disabled"}
                onEdit={() => openCreditEdit(book)}
                onDelete={() => confirmDeleteCredit(book.id)}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No credit books configured.</p>
          )}
          <Button type="button" className="h-8 px-3 text-xs" onClick={openCreditCreate}>
            + Create credit book
          </Button>
        </TabsContent>

        <TabsContent value="storage" className="mt-0 space-y-3 outline-none">
          {isStorageLoading ? (
            <p className="text-xs text-muted-foreground">Loading storage tiers...</p>
          ) : storageTiers.length > 0 ? (
            storageTiers.map((tier) => (
              <ConfigRowCard
                key={tier.id}
                title={tier.name}
                description={`${tier.storage_gb} GB storage.`}
                value={`$${tier.monthly_fee} / mo`}
                status={tier.active ? "Active" : "Disabled"}
                onEdit={() => openStorageEdit(tier)}
                onDelete={() => confirmDeleteStorage(tier.id)}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No storage tiers configured.</p>
          )}
          <Button type="button" className="h-8 px-3 text-xs" onClick={openStorageCreate}>
            + Create storage tier
          </Button>
        </TabsContent>

        <TabsContent value="addons" className="mt-0 space-y-3 outline-none">
          {isAddonsLoading ? (
            <p className="text-xs text-muted-foreground">Loading add-ons...</p>
          ) : addons.length > 0 ? (
            addons.map((addon) => (
              <ConfigRowCard
                key={addon.id}
                title={addon.name}
                description="Optional add-on module."
                value={`$${addon.monthly_fee} / mo`}
                status={addon.active ? "Active" : "Disabled"}
                onEdit={() => openAddonEdit(addon)}
                onDelete={() => confirmDeleteAddon(addon.id)}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No add-ons configured.</p>
          )}
          <Button type="button" className="h-8 px-3 text-xs" onClick={openAddonCreate}>
            + Create add-on
          </Button>
        </TabsContent>
      </Tabs>

      <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
        <Link href="/billing-subscription">← Back to billing hub</Link>
      </Button>

      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className="max-w-md rounded-xl p-0">
          <div className="p-6">
            <DialogTitle className="text-lg font-semibold">Delete Plan</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this plan? This action cannot be undone and will permanently remove the plan from the catalog.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setOpenDeleteConfirm(false)}
              disabled={isPlanDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={isPlanDeleting}
            >
              {isPlanDeleting ? "Deleting..." : "Delete Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openWizard} onOpenChange={setOpenWizard}>
        <DialogContent
          className="max-h-[92dvh] max-w-[92vw] overflow-y-auto rounded-xl border border-border bg-background p-0 md:max-w-3xl"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b px-4 py-2.5 md:px-5">
            <DialogTitle className="text-3xl:md text-xl font-semibold">
              {editingPlanName ? `Edit ${editingPlanName} Plan` : "New Subscription Plan"}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Expand className="h-4 w-4" />
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="space-y-3 px-4 py-3 md:px-5">
            <div className="flex flex-wrap gap-2 border-b pb-2">
              <WizardTab label="Plan Details" active={wizardStep === "plan-details"} onClick={() => setWizardStep("plan-details")} />
              <WizardTab label="Pricing & Billing" active={wizardStep === "pricing-billing"} onClick={() => setWizardStep("pricing-billing")} />
              <WizardTab
                label="Feature Inclusions & Limits"
                active={wizardStep === "modules-limits"}
                onClick={() => setWizardStep("modules-limits")}
              />
              <WizardTab label="Review & Publish" active={wizardStep === "review-publish"} onClick={() => setWizardStep("review-publish")} />
            </div>

            {wizardStep === "plan-details" ? (
              <div className="space-y-3">
                <Input
                  label="Plan Name"
                  placeholder="e.g. Professional Plus"
                  value={planName}
                  onChange={(e) => {
                    setPlanName(e.target.value)
                    setFormErrors((prev) => {
                      const next = { ...prev }
                      delete next.planName
                      return next
                    })
                  }}
                  validationState={formErrors.planName ? "error" : "default"}
                  errorMessage={formErrors.planName}
                />
                <LabeledTextarea
                  label="Plan Description"
                  placeholder="Describe who this plan is for and what makes it valuable."
                  value={planDescription}
                  onChange={(e) => {
                    setPlanDescription(e.target.value)
                    setFormErrors((prev) => {
                      const next = { ...prev }
                      delete next.planDescription
                      return next
                    })
                  }}
                  error={formErrors.planDescription}
                />
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    label="Badge Label"
                    placeholder="e.g. Most Popular, Best Value"
                    value={badgeLabel}
                    onChange={(e) => setBadgeLabel(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    {["#0E67BA", "#30C95E", "#F0C400", "#D40000"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="h-8 w-8 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    label="Display Order"
                    placeholder="Controls position on the pricing page. Lower = first."
                    value={displayOrder}
                    onChange={(e) => {
                      setDisplayOrder(e.target.value)
                      setFormErrors((prev) => {
                        const next = { ...prev }
                        delete next.displayOrder
                        return next
                      })
                    }}
                    validationState={formErrors.displayOrder ? "error" : "default"}
                    errorMessage={formErrors.displayOrder}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Visibility</span>
                    <Switch checked={isDraftVisible} onCheckedChange={setIsDraftVisible} />
                    <span className="text-sm text-muted-foreground">Draft</span>
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === "pricing-billing" ? (
              <div className="space-y-4">
                <section className="space-y-2 border-y py-3">
                  <p className="text-sm font-semibold">Billing Frequency</p>
                  <div className="flex flex-wrap gap-5">
                    {BILLING_FREQUENCIES.map((frequency) => (
                      <label key={frequency.id} className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedBillingFrequencies.includes(frequency.id)}
                          onCheckedChange={(checked) => toggleBillingFrequency(frequency.id, checked === true)}
                        />
                        {frequency.label}
                      </label>
                    ))}
                  </div>
                  {formErrors.selectedBillingFrequencies ? (
                    <p className="text-xs text-[#CF0202]">{formErrors.selectedBillingFrequencies}</p>
                  ) : null}
                  {selectedBillingFrequencies.length > 0 ? (
                    <div className="grid gap-3 pt-1 md:grid-cols-2">
                      {selectedBillingFrequencies.map((frequencyId) => {
                        const frequency = BILLING_FREQUENCIES.find((item) => item.id === frequencyId)
                        return (
                          <div key={frequencyId}>
                            <Input
                              label={`${frequency?.label} Base Price`}
                              value={`$ ${pricingByFrequency[frequencyId] ?? ""}`}
                              onChange={(e) => {
                                const sanitized = e.target.value.replace("$", "").trim()
                                updateFrequencyPrice(frequencyId, sanitized)
                              }}
                              placeholder="$ 0.00"
                              validationState={formErrors[`price-${frequencyId}`] ? "error" : "default"}
                              errorMessage={formErrors[`price-${frequencyId}`]}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select at least one billing frequency to configure pricing.
                    </p>
                  )}
                </section>

                <section className="space-y-2 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">Trial Period</p>
                    <Switch checked={trialEnabled} onCheckedChange={setTrialEnabled} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <Input
                      label="Trial Days"
                      placeholder="0"
                      value={trialDays}
                      onChange={(e) => {
                        setTrialDays(e.target.value)
                        setFormErrors((prev) => {
                          const next = { ...prev }
                          delete next.trialDays
                          return next
                        })
                      }}
                      validationState={formErrors.trialDays ? "error" : "default"}
                      errorMessage={formErrors.trialDays}
                    />
                    <RadioGroup
                      value={trialAccessMode}
                      onValueChange={(value: "full-access" | "feature-limited") => setTrialAccessMode(value)}
                      className="flex items-center gap-4 md:col-span-2"
                    >
                      <label className="inline-flex items-center gap-2 text-sm">
                        <RadioGroupItem value="full-access" />
                        Full access
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <RadioGroupItem value="feature-limited" />
                        Feature-limited
                      </label>
                    </RadioGroup>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox checked={requirePaymentForTrial} onCheckedChange={(checked) => setRequirePaymentForTrial(checked === true)} />
                    Require payment method for trial
                  </label>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">Enable Slip Overages</p>
                    <Switch checked={overageEnabled} onCheckedChange={setOverageEnabled} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      label="Standard Overage Rate"
                      placeholder="$ 0.00 / slip"
                      value={standardOverageRate}
                      onChange={(e) => {
                        setStandardOverageRate(e.target.value)
                        setFormErrors((prev) => {
                          const next = { ...prev }
                          delete next.standardOverageRate
                          return next
                        })
                      }}
                      validationState={formErrors.standardOverageRate ? "error" : "default"}
                      errorMessage={formErrors.standardOverageRate}
                    />
                    <Input
                      label="Discounted Continuous Rate"
                      placeholder="$ 0.00 / slip"
                      value={discountedContinuousRate}
                      onChange={(e) => {
                        setDiscountedContinuousRate(e.target.value)
                        setFormErrors((prev) => {
                          const next = { ...prev }
                          delete next.discountedContinuousRate
                          return next
                        })
                      }}
                      validationState={formErrors.discountedContinuousRate ? "error" : "default"}
                      errorMessage={formErrors.discountedContinuousRate}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-5 text-sm">
                    <span className="font-medium">Overage Billing Method</span>
                    <RadioGroup
                      value={overageBillingMethod}
                      onValueChange={(value: "end-cycle" | "real-time") => setOverageBillingMethod(value)}
                      className="flex items-center gap-5"
                    >
                      <label className="inline-flex items-center gap-2">
                        <RadioGroupItem value="end-cycle" />
                        Charge at end billing cycle
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <RadioGroupItem value="real-time" />
                        Charge in real time
                      </label>
                    </RadioGroup>
                  </div>
                </section>
              </div>
            ) : null}

            {wizardStep === "modules-limits" ? (
              <div className="space-y-4">
                <div className="space-y-3 border-b pb-3">
                  <p className="text-sm font-semibold">Slip Allocation</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      label="Monthly Slip allocation"
                      placeholder="Enter 0 for pay-per-slip or -1 for unlimited"
                      value={monthlySlipAllocation}
                      onChange={(e) => setMonthlySlipAllocation(e.target.value)}
                    />
                    <RadioGroup
                      value={slipResetMode}
                      onValueChange={(value: "reset-each-cycle" | "carry-over") => setSlipResetMode(value)}
                      className="flex items-center gap-6 md:col-span-2"
                    >
                      <label className="inline-flex items-center gap-2 text-sm">
                        <RadioGroupItem value="reset-each-cycle" />
                        Reset to each cycle
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <RadioGroupItem value="carry-over" />
                        Carry over unused slips
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      label="Included storage (GB)"
                      placeholder="15"
                      value={includedStorageGb}
                      onChange={(e) => setIncludedStorageGb(e.target.value)}
                    />
                    <Input
                      label="Max admin seat (or -1)"
                      placeholder="Enter -1 for unlimited"
                      value={maxAdminSeat}
                      onChange={(e) => setMaxAdminSeat(e.target.value)}
                    />
                    <Input
                      label="Max user seat (or -1)"
                      placeholder="Enter -1 for unlimited"
                      value={maxUserSeat}
                      onChange={(e) => setMaxUserSeat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Module Selection</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      placeholder="Search module"
                      className="pl-9"
                    />
                  </div>
                  <div className="grid max-h-56 gap-2 overflow-auto rounded-md border p-3 md:grid-cols-2">
                    {filteredModules.map((moduleName) => (
                      <label key={moduleName} className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedModules.includes(moduleName)}
                          onCheckedChange={(checked) => toggleModule(moduleName, checked === true)}
                        />
                        {moduleName}
                      </label>
                    ))}
                  </div>
                  {formErrors.selectedModules ? <p className="text-xs text-[#CF0202]">{formErrors.selectedModules}</p> : null}
                </div>

                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-semibold">Enforcement behavior</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">At slip limit</p>
                      <Select value={enforcementAtSlip} onValueChange={setEnforcementAtSlip}>
                        <SelectTrigger><SelectValue placeholder="At slip limit" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="block-new-case-creation">Block new case creation</SelectItem>
                          <SelectItem value="allow-overage-standard">Allow overage at standard rate</SelectItem>
                          <SelectItem value="warning-only">Warning only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">At storage limit</p>
                      <Select value={enforcementAtStorage} onValueChange={setEnforcementAtStorage}>
                        <SelectTrigger><SelectValue placeholder="At storage limit" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="block-new-file-uploads">Block new file uploads</SelectItem>
                          <SelectItem value="allow-overage-charge">Allow with overage charges</SelectItem>
                          <SelectItem value="warning-only">Warning only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      label="Grace period after limit (days)"
                      placeholder="15"
                      value={gracePeriodDays}
                      onChange={(e) => {
                        setGracePeriodDays(e.target.value)
                        setFormErrors((prev) => {
                          const next = { ...prev }
                          delete next.gracePeriodDays
                          return next
                        })
                      }}
                      validationState={formErrors.gracePeriodDays ? "error" : "default"}
                      errorMessage={formErrors.gracePeriodDays}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === "review-publish" ? (
              <div className="space-y-4">
                <div className="space-y-2 rounded-md border p-3">
                  <SectionHeader title="Plan Details" onEdit={() => setWizardStep("plan-details")} />
                  <ReviewRow label="Plan Name" value={planName || "Sample Plan Name"} />
                  <ReviewRow label="Visibility" value={isDraftVisible ? "Draft" : "Active"} />
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <SectionHeader title="Pricing & Billing" onEdit={() => setWizardStep("pricing-billing")} />
                  {selectedBillingFrequencies.map((freq) => (
                    <ReviewRow
                      key={freq}
                      label={`${freq.charAt(0).toUpperCase() + freq.slice(1)} Base Price`}
                      value={`$ ${pricingByFrequency[freq] || "0.00"}`}
                    />
                  ))}
                  <ReviewRow label="Trial Days" value={trialEnabled ? `${trialDays} days` : "No trial"} />
                  <ReviewRow label="Standard Overage Rate" value={`$ ${standardOverageRate}`} />
                  <ReviewRow label="Discounted Continuous Rate" value={`$ ${discountedContinuousRate}`} />
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <SectionHeader title="Feature Inclusions & Limits" onEdit={() => setWizardStep("modules-limits")} />
                  <ReviewRow label="Monthly Slip Allocation" value={monthlySlipAllocation === "-1" ? "Unlimited" : (monthlySlipAllocation || "0")} />
                  <ReviewRow label="Included Storage" value={`${includedStorageGb || "0"} GB`} />
                  <ReviewRow label="Max Admin Seats" value={maxAdminSeat === "-1" ? "Unlimited" : (maxAdminSeat || "0")} />
                  <ReviewRow label="Max User Seats" value={maxUserSeat === "-1" ? "Unlimited" : (maxUserSeat || "0")} />
                </div>
                <div className="space-y-3 rounded-md border p-3">
                  <SectionHeader title="Payment Gateway setup" />
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Input placeholder="Auto-create Stripe price" />
                    <Input placeholder="Link existing Stripe price ID" />
                    <Button variant="outline" className="h-10 px-4">Validate</Button>
                  </div>
                </div>
                <div className="space-y-3 rounded-md border p-3">
                  <SectionHeader title="Publish Options" />
                  <RadioGroup
                    value={publishMode}
                    onValueChange={(v) => {
                      setPublishMode(v as "immediately" | "scheduled" | "draft")
                      setCalendarOpen(v === "scheduled")
                    }}
                    className="space-y-2"
                  >
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <RadioGroupItem value="immediately" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Publish Immediately</p>
                        <p className="text-xs text-muted-foreground">Plan becomes available for tenant assignment right away</p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <RadioGroupItem value="scheduled" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Schedule Publish</p>
                        <p className="text-xs text-muted-foreground">Plan activates automatically at the specified date</p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <RadioGroupItem value="draft" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Save as Draft</p>
                        <p className="text-xs text-muted-foreground">Save all settings but do not make available yet</p>
                      </div>
                    </label>
                  </RadioGroup>

                  {publishMode === "scheduled" && (
                    <div className="mt-3 flex items-center gap-3 rounded-md border bg-white px-4 py-3">
                      <svg className="h-[18px] w-[18px] shrink-0 text-[#1162A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" d="M12 6v6l4 2" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Launch Date"
                        readOnly
                        value={launchDate}
                        className="h-11 flex-1 cursor-pointer rounded-md border border-[#545F71] bg-white px-3.5 text-sm text-[#545F71] placeholder:text-[#B4B0B0] focus:outline-none"
                        onClick={() => setCalendarOpen(true)}
                      />
                      <input
                        type="text"
                        readOnly
                        value={`${String(launchHour).padStart(2, "0")}:${String(launchMinute).padStart(2, "0")}`}
                        className="h-11 w-[140px] cursor-pointer rounded-md border border-[#545F71] bg-white px-3.5 text-sm text-[#545F71] focus:outline-none"
                        onClick={() => setCalendarOpen(true)}
                      />
                    </div>
                  )}

                  {/* Calendar modal — floating card, no backdrop */}
                  {calendarOpen && (
                    <>
                      {/* invisible full-screen layer to catch outside clicks */}
                      <div className="fixed inset-0 z-[199]" onClick={() => setCalendarOpen(false)} />
                      <div className="fixed z-[200] flex items-start justify-center" style={{ inset: 0, pointerEvents: "none" }}>
                        <div
                          className="pointer-events-auto mt-[20vh] w-[514px] rounded-[10px] border border-gray-200 bg-white shadow-[9px_7px_21.5px_rgba(0,0,0,0.25)]"
                          style={{ padding: "30px 20px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Date + time row */}
                          <div className="mb-3 flex items-center gap-3">
                            <svg className="h-[18px] w-[18px] shrink-0 text-[#1162A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <circle cx="12" cy="12" r="10" />
                              <path strokeLinecap="round" d="M12 6v6l4 2" />
                            </svg>
                            <input
                              type="text"
                              placeholder="Launch Date"
                              readOnly
                              value={launchDate}
                              className="h-12 flex-1 cursor-pointer rounded-md border border-[#545F71] bg-white px-3.5 text-sm text-[#545F71] placeholder:text-[#B4B0B0] focus:outline-none"
                            />
                            {/* Time picker trigger */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setTimePickerOpen((o) => !o)}
                                className="flex h-12 w-[183px] items-center justify-between rounded-md border border-[#545F71] bg-white px-3.5 text-sm text-[#545F71] focus:outline-none"
                              >
                                <span>{`${String(launchHour).padStart(2, "0")}:${String(launchMinute).padStart(2, "0")}`}</span>
                                <ChevronDown className={`h-4 w-4 text-[#545F71] transition-transform ${timePickerOpen ? "rotate-180" : ""}`} />
                              </button>

                              {timePickerOpen && (
                                <div className="absolute right-0 top-[calc(100%+6px)] z-[210] flex w-[183px] flex-col items-center gap-0 rounded-[10px] border border-gray-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                                  {/* Header */}
                                  <div className="w-full rounded-t-[10px] bg-[#1162A8] px-4 py-2 text-center text-xs font-medium text-white">
                                    Select Time
                                  </div>

                                  {/* Hour + minute spinners */}
                                  <div className="flex w-full items-center justify-center gap-2 px-4 py-4">
                                    {/* Hour column */}
                                    <div className="flex flex-col items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setLaunchHour((h) => (h + 1) % 24)}
                                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#F2F4F7]"
                                      >
                                        <ChevronDown className="h-4 w-4 rotate-180 text-[#1162A8]" />
                                      </button>
                                      <div className="flex h-10 w-12 items-center justify-center rounded-md border border-[#545F71] text-lg font-medium text-[#545F71]">
                                        {String(launchHour).padStart(2, "0")}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setLaunchHour((h) => (h - 1 + 24) % 24)}
                                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#F2F4F7]"
                                      >
                                        <ChevronDown className="h-4 w-4 text-[#1162A8]" />
                                      </button>
                                    </div>

                                    <span className="text-xl font-medium text-[#545F71]">:</span>

                                    {/* Minute column */}
                                    <div className="flex flex-col items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setLaunchMinute((m) => (m + 5) % 60)}
                                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#F2F4F7]"
                                      >
                                        <ChevronDown className="h-4 w-4 rotate-180 text-[#1162A8]" />
                                      </button>
                                      <div className="flex h-10 w-12 items-center justify-center rounded-md border border-[#545F71] text-lg font-medium text-[#545F71]">
                                        {String(launchMinute).padStart(2, "0")}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setLaunchMinute((m) => (m - 5 + 60) % 60)}
                                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#F2F4F7]"
                                      >
                                        <ChevronDown className="h-4 w-4 text-[#1162A8]" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Done button */}
                                  <button
                                    type="button"
                                    onClick={() => setTimePickerOpen(false)}
                                    className="mb-3 rounded-md bg-[#1162A8] px-6 py-1.5 text-sm font-medium text-white hover:bg-[#0E4676]"
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Calendar grid */}
                          <div className="overflow-hidden rounded-[16px]">
                            {/* Month + nav */}
                            <div className="flex items-center justify-between px-2 py-3">
                              <span className="text-[16px] font-medium text-black">
                                {calendarDate.toLocaleString("default", { month: "long", year: "numeric" }).toUpperCase()}
                              </span>
                              <div className="flex items-center gap-5">
                                <button
                                  type="button"
                                  onClick={() => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                                  className="flex h-5 w-5 items-center justify-center text-black"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                                  className="flex h-5 w-5 items-center justify-center text-black"
                                >
                                  <ChevronDown className="h-4 w-4 rotate-180" />
                                </button>
                              </div>
                            </div>

                            {/* Day-of-week headers */}
                            <div className="grid grid-cols-7 bg-[#1162A8]">
                              {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d, i) => (
                                <div
                                  key={d}
                                  className={`flex h-[64px] items-center justify-center font-['Inter'] text-[16.07px] font-medium tracking-[-0.02em] text-white ${i === 0 || i === 6 ? "bg-[#0E4676]" : ""}`}
                                >
                                  {d}
                                </div>
                              ))}
                            </div>

                            {/* Day cells */}
                            <div className="grid grid-cols-7">
                              {(() => {
                                const year = calendarDate.getFullYear()
                                const month = calendarDate.getMonth()
                                const firstDay = new Date(year, month, 1).getDay()
                                const daysInMonth = new Date(year, month + 1, 0).getDate()
                                const prevMonthDays = new Date(year, month, 0).getDate()
                                const cells: { day: number; current: boolean; colIndex: number }[] = []

                                for (let i = 0; i < firstDay; i++) {
                                  cells.push({ day: prevMonthDays - firstDay + 1 + i, current: false, colIndex: i })
                                }
                                for (let d = 1; d <= daysInMonth; d++) {
                                  cells.push({ day: d, current: true, colIndex: (firstDay + d - 1) % 7 })
                                }
                                const remaining = (7 - (cells.length % 7)) % 7
                                for (let d = 1; d <= remaining; d++) {
                                  cells.push({ day: d, current: false, colIndex: cells.length % 7 })
                                }

                                return cells.map((cell, idx) => {
                                  const isWeekend = cell.colIndex === 0 || cell.colIndex === 6
                                  const dateStr = cell.current
                                    ? `${calendarDate.toLocaleString("default", { month: "long" })} ${cell.day}, ${year}`
                                    : ""
                                  const isSelected = cell.current && dateStr === launchDate
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={!cell.current}
                                      onClick={() => {
                                        if (!cell.current) return
                                        setLaunchDate(dateStr)
                                        setCalendarOpen(false)
                                      }}
                                      className={[
                                        "flex h-[64px] items-center justify-center font-['Inter'] text-[16.07px] font-medium tracking-[-0.02em] transition-colors",
                                        isSelected
                                          ? "bg-[#1162A8] text-white"
                                          : isWeekend
                                            ? "bg-[#E2E2E2] text-black"
                                            : "bg-[#F2F4F7] text-black",
                                        !cell.current ? "!text-[#ADC0DC]" : "",
                                        cell.current && !isSelected ? "hover:bg-[#c8ddf0]" : "",
                                      ].join(" ")}
                                    >
                                      {cell.day}
                                    </button>
                                  )
                                })
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div>
              {wizardStep !== "plan-details" ? (
                <Button variant="ghost" className="h-9 px-2 text-sm" onClick={prevStep}>
                  Back
                </Button>
              ) : (
                <DialogClose asChild>
                  <Button variant="ghost" className="h-9 px-2 text-sm">Cancel</Button>
                </DialogClose>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 px-4 text-sm"
                onClick={() => setIsDraftVisible(true)}
                disabled={isPlanSubmitting}
              >
                Save as Draft
              </Button>
              {wizardStep !== "review-publish" ? (
                <Button className="h-9 px-4 text-sm" onClick={nextStep} disabled={isPlanSubmitting}>
                  {wizardStep === "plan-details" ? "Next: Pricing & Billing" : wizardStep === "pricing-billing" ? "Inclusions & Limits" : "Review & Publish"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button className="h-9 px-4 text-sm" onClick={submitPlan} disabled={isPlanSubmitting}>
                  {isPlanSubmitting ? "Saving..." : "Review & Publish"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openRuleModal} onOpenChange={setOpenRuleModal}>
        <DialogContent className="max-h-[90dvh] max-w-[94vw] overflow-y-auto rounded-xl p-0 md:max-w-2xl">
          <div className="border-b px-4 py-3">
            <DialogTitle className="text-lg font-semibold">Add New Rule</DialogTitle>
          </div>
          <div className="space-y-3 px-4 py-3">
            <Input
              label="Rule Key"
              placeholder="e.g., slip_carryover_allowed"
              value={ruleKey}
              onChange={(e) => {
                setRuleKey(e.target.value)
                setRuleErrors((prev) => ({ ...prev, ruleKey: "" }))
              }}
              validationState={ruleErrors.ruleKey ? "error" : "default"}
              errorMessage={ruleErrors.ruleKey}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Value Type</p>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boolean">Boolean</SelectItem>
                    <SelectItem value="Number">Number</SelectItem>
                    <SelectItem value="String">String</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Value"
                placeholder="false"
                value={ruleValue}
                onChange={(e) => {
                  setRuleValue(e.target.value)
                  setRuleErrors((prev) => ({ ...prev, ruleValue: "" }))
                }}
                validationState={ruleErrors.ruleValue ? "error" : "default"}
                errorMessage={ruleErrors.ruleValue}
              />
            </div>
            <LabeledTextarea
              label="Description"
              placeholder="What does this rule control?"
              value={ruleDescription}
              onChange={(e) => {
                setRuleDescription(e.target.value)
                setRuleErrors((prev) => ({ ...prev, ruleDescription: "" }))
              }}
              error={ruleErrors.ruleDescription}
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={tenantOverrideAllowed}
                onCheckedChange={(checked) => setTenantOverrideAllowed(checked === true)}
              />
              Tenant Override Allowed
            </label>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Effective</p>
              <RadioGroup
                value={ruleEffective}
                onValueChange={(value: "immediately" | "scheduled") => setRuleEffective(value)}
                className="flex items-center gap-5"
              >
                <label className="inline-flex items-center gap-2 text-sm">
                  <RadioGroupItem value="immediately" />
                  Immediately
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <RadioGroupItem value="scheduled" />
                  Scheduled
                </label>
              </RadioGroup>
            </div>
            <p className="text-xs text-muted-foreground">Caution: this rule can affect all tenants globally.</p>
          </div>
          <div className="flex items-center gap-2 border-t px-4 py-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-8 px-3 text-xs">Cancel</Button>
            </DialogClose>
            <Button className="h-8 px-3 text-xs" onClick={submitRule}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreditBookModal} onOpenChange={setOpenCreditBookModal}>
        <DialogContent className="max-h-[90dvh] max-w-[94vw] overflow-y-auto rounded-xl p-0 md:max-w-2xl">
          <div className="border-b px-4 py-3">
            <DialogTitle className="text-lg font-semibold">
              {editingCreditBookId ? "Edit Credit Book" : "Create New Credit Book"}
            </DialogTitle>
          </div>
          <div className="space-y-3 px-4 py-3">
            <Input
              label="Book Name *"
              placeholder="e.g. 50 Slip Credit Book"
              value={creditBookForm.name}
              onChange={(e) => setCreditBookForm((p) => ({ ...p, name: e.target.value }))}
              validationState={creditBookErrors.name ? "error" : "default"}
              errorMessage={creditBookErrors.name}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Price *"
                placeholder="25.00"
                value={creditBookForm.price}
                onChange={(e) => setCreditBookForm((p) => ({ ...p, price: e.target.value }))}
                validationState={creditBookErrors.price ? "error" : "default"}
                errorMessage={creditBookErrors.price}
              />
              <Input
                label="Slip Amount *"
                placeholder="50"
                value={creditBookForm.slip_amount}
                onChange={(e) => setCreditBookForm((p) => ({ ...p, slip_amount: e.target.value }))}
                validationState={creditBookErrors.slip_amount ? "error" : "default"}
                errorMessage={creditBookErrors.slip_amount}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={creditBookForm.active}
                onCheckedChange={(checked) => setCreditBookForm((p) => ({ ...p, active: checked === true }))}
              />
              Active
            </label>
          </div>
          <div className="flex items-center gap-2 border-t px-4 py-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-8 px-3 text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button className="h-8 px-3 text-xs" onClick={submitCreditBook} disabled={isCreditSubmitting}>
              {isCreditSubmitting ? "Saving..." : editingCreditBookId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreditDeleteConfirm} onOpenChange={setOpenCreditDeleteConfirm}>
        <DialogContent className="max-w-md rounded-xl p-0">
          <div className="p-6">
            <DialogTitle className="text-lg font-semibold">Delete Credit Book</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this credit book? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setOpenCreditDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCredit}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openStorageTierModal} onOpenChange={setOpenStorageTierModal}>
        <DialogContent className="max-h-[90dvh] max-w-[94vw] overflow-y-auto rounded-xl p-0 md:max-w-2xl">
          <div className="border-b px-4 py-3">
            <DialogTitle className="text-lg font-semibold">
              {editingStorageTierId ? "Edit Storage Tier" : "Create New Storage Tier"}
            </DialogTitle>
          </div>
          <div className="space-y-3 px-4 py-3">
            <Input
              label="Tier Name *"
              placeholder="e.g. 100GB Storage Tier"
              value={storageTierForm.name}
              onChange={(e) => setStorageTierForm((p) => ({ ...p, name: e.target.value }))}
              validationState={storageTierErrors.name ? "error" : "default"}
              errorMessage={storageTierErrors.name}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Storage GB *"
                placeholder="100"
                value={storageTierForm.storage_gb}
                onChange={(e) => setStorageTierForm((p) => ({ ...p, storage_gb: e.target.value }))}
                validationState={storageTierErrors.storage_gb ? "error" : "default"}
                errorMessage={storageTierErrors.storage_gb}
              />
              <Input
                label="Monthly Fee *"
                placeholder="9.99"
                value={storageTierForm.monthly_fee}
                onChange={(e) => setStorageTierForm((p) => ({ ...p, monthly_fee: e.target.value }))}
                validationState={storageTierErrors.monthly_fee ? "error" : "default"}
                errorMessage={storageTierErrors.monthly_fee}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={storageTierForm.active}
                onCheckedChange={(checked) => setStorageTierForm((p) => ({ ...p, active: checked === true }))}
              />
              Active
            </label>
          </div>
          <div className="flex items-center gap-2 border-t px-4 py-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-8 px-3 text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button className="h-8 px-3 text-xs" onClick={submitStorageTier} disabled={isStorageSubmitting}>
              {isStorageSubmitting ? "Saving..." : editingStorageTierId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openStorageDeleteConfirm} onOpenChange={setOpenStorageDeleteConfirm}>
        <DialogContent className="max-w-md rounded-xl p-0">
          <div className="p-6">
            <DialogTitle className="text-lg font-semibold">Delete Storage Tier</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this storage tier? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setOpenStorageDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStorage}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddonModal} onOpenChange={setOpenAddonModal}>
        <DialogContent className="max-h-[90dvh] max-w-[94vw] overflow-y-auto rounded-xl p-0 md:max-w-2xl">
          <div className="border-b px-4 py-3">
            <DialogTitle className="text-lg font-semibold">
              {editingAddonId ? "Edit Add-On" : "Create New Add-On"}
            </DialogTitle>
          </div>
          <div className="space-y-3 px-4 py-3">
            <Input
              label="Add-On Name *"
              placeholder="e.g. Website Hosting"
              value={addonForm.name}
              onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))}
              validationState={addonErrors.name ? "error" : "default"}
              errorMessage={addonErrors.name}
            />
            <Input
              label="Monthly Fee *"
              placeholder="29.99"
              value={addonForm.monthly_fee}
              onChange={(e) => setAddonForm((p) => ({ ...p, monthly_fee: e.target.value }))}
              validationState={addonErrors.monthly_fee ? "error" : "default"}
              errorMessage={addonErrors.monthly_fee}
            />
            <LabeledTextarea
              label="Config (JSON) *"
              value={addonForm.config}
              onChange={(e) => setAddonForm((p) => ({ ...p, config: e.target.value }))}
              error={addonErrors.config}
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={addonForm.active}
                onCheckedChange={(checked) => setAddonForm((p) => ({ ...p, active: checked === true }))}
              />
              Active
            </label>
          </div>
          <div className="flex items-center gap-2 border-t px-4 py-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-8 px-3 text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button className="h-8 px-3 text-xs" onClick={submitAddon} disabled={isAddonSubmitting}>
              {isAddonSubmitting ? "Saving..." : editingAddonId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddonDeleteConfirm} onOpenChange={setOpenAddonDeleteConfirm}>
        <DialogContent className="max-w-md rounded-xl p-0">
          <div className="p-6">
            <DialogTitle className="text-lg font-semibold">Delete Add-On</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this add-on? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setOpenAddonDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAddon}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSubscribersModal} onOpenChange={setOpenSubscribersModal}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-base font-semibold">
            Active Labs — {subscribersModalPlan?.name}
          </DialogTitle>
          {isSubscribersLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : subscribers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No active labs on this plan.</div>
          ) : (
            <div className="mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-[#E5E7EB]">
              {subscribers.map((sub, i) => (
                <div
                  key={sub.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-3",
                    i % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#101828]">{sub.name}</p>
                    <p className="truncate text-[12px] text-[#777777]">{sub.email}</p>
                  </div>
                  <span
                    className={cn(
                      "ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
                      sub.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WizardTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-none border-b-2 px-2 text-sm font-medium",
        active ? "border-[#1162A8] text-[#1162A8]" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}

function SectionHeader({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold">{title}</p>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-xs font-medium text-[#1162A8] hover:underline">
          Edit
        </button>
      )}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function LabeledTextarea({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  error?: string
}) {
  return (
    <div className="space-y-1">
      <div className={cn("rounded-md border border-input px-3 pb-2 pt-2", error && "border-[#CF0202]")}>
        <span className="bg-background px-1 text-xs text-muted-foreground">{label}</span>
        <Textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-1 min-h-[96px] border-0 p-0 focus-visible:ring-0"
        />
      </div>
      {error ? <p className="text-xs text-[#CF0202]">{error}</p> : null}
    </div>
  )
}
