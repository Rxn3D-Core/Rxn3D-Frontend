"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteBillingConfigPlan,
  listPlanSubscribers,
  type BillingConfigPlan,
  type BillingConfigPlanPayload,
  type PlanSubscriber,
  type PriceFrequency,
  type SaveMode,
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
import { PlanFeatureMatrixEditor } from "@/components/billing-subscription/plan-feature-matrix-editor"
import { CapacityAddonManager } from "@/components/billing-subscription/capacity-addon-manager"
import { PlanEditorDialog } from "@/components/billing-subscription/plan-editor/plan-editor-dialog"
import {
  PlanCardActions,
  PlanCardBadges,
  PlanCardNotification,
} from "@/components/billing-subscription/plan-editor/plan-card-status"
import { billingConfigKeys, useBillingConfigPlans, useCancelPlanSchedule, useDiscardPlanVersion } from "@/hooks/use-plan-editor"
import { useToast } from "@/hooks/use-toast"
import { parseApiError, type CardAction, type EditorStep } from "@/lib/billing/plan-editor"


type PlanCardModel = {
  key: string
  name: string
  badge: string
  monthly: string
  includedSlips: string
  overageRate: string
  continuousRate: string
  includedStorage: string
  maxUsers: string
  activeLabs: string
  previewBgColor?: string
  sourcePlan?: BillingConfigPlan
}

type PlanPriceRow = BillingConfigPlanPayload["pricing"]["prices"][number]

const LEAD_PRICE_FREQUENCY_ORDER: PriceFrequency[] = ["monthly", "quarterly", "semi_annual", "annual"]

/** Price shown on plan cards: default tier if flagged, else first known frequency in a stable order. */
function pickLeadPriceRow(prices: PlanPriceRow[] | undefined): PlanPriceRow | null {
  if (!prices?.length) return null
  const defaultRow = prices.find((p) => p.is_default)
  if (defaultRow) return defaultRow
  const byFrequencyOrder = LEAD_PRICE_FREQUENCY_ORDER
    .map((frequency) => prices.find((p) => p.frequency === frequency))
    .find((p): p is PlanPriceRow => Boolean(p))
  return byFrequencyOrder ?? prices[0] ?? null
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

function formatPlanLimit(value?: number | null, suffix = ""): string {
  if (value === undefined || value === null) return "N/A"
  if (value < 0) return "Unlimited"
  return `${value}${suffix}`
}

function formatOverageRate(rate?: number | null, enabled?: boolean): string {
  if (!enabled || rate == null) return "N/A"
  return `$${Number(rate).toFixed(2)}/slip`
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

function PlanCard({
  plan,
  onDelete,
  onEdit,
  onViewSubscribers,
  onAction,
}: {
  plan: PlanCardModel
  onDelete: (id: number) => void
  onEdit: (plan: PlanCardModel) => void
  onViewSubscribers?: (planId: number, planName: string) => void
  onAction?: (plan: BillingConfigPlan, action: CardAction) => void
}) {
  const featureRows = [
    { label: "Included Slips", value: plan.includedSlips },
    { label: "Standard Overage", value: plan.overageRate },
    { label: "Continuous Rate", value: plan.continuousRate },
    { label: "Included Storage", value: plan.includedStorage },
    { label: "Max User Seats", value: plan.maxUsers },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div
        className={cn("flex flex-col gap-1 px-5 pb-4 pt-5", !plan.previewBgColor && "bg-[#F9FAFB]")}
        style={plan.previewBgColor ? { backgroundColor: plan.previewBgColor } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[19px] font-bold leading-7 text-[#101828]">{plan.name}</span>
          {plan.badge ? (
            <span className="rounded-full bg-white px-3 py-0.5 text-[13px] font-medium text-[#434343]">
              {plan.badge}
            </span>
          ) : null}
        </div>
        <p className="text-[23px] font-bold leading-9 text-[#434343]">{plan.monthly}</p>
        {plan.sourcePlan ? <PlanCardBadges plan={plan.sourcePlan} /> : null}
      </div>

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
            <span className="text-[14px] font-medium text-[#434343]">{row.value}</span>
          </div>
        ))}
      </div>

      {plan.sourcePlan ? <PlanCardNotification plan={plan.sourcePlan} /> : null}
      {plan.sourcePlan && onAction ? (
        <PlanCardActions plan={plan.sourcePlan} onAction={(action) => onAction(plan.sourcePlan as BillingConfigPlan, action)} />
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(plan) }}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1162A8] hover:text-[#0d4a7e]"
            data-testid={plan.sourcePlan ? `plan-card-edit-${plan.sourcePlan.id}` : undefined}
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

export default function BillingConfigurationPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [planListStatus, setPlanListStatus] = useState<"active" | "draft">("active")
  const plansQuery = useBillingConfigPlans(planListStatus)
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data])
  const isPlansLoading = plansQuery.isLoading
  const [editor, setEditor] = useState<{
    key: number
    planId: number | null
    planName?: string
    planStatus?: BillingConfigPlan["status"]
    initialStep?: EditorStep
    initialMode?: SaveMode
  } | null>(null)
  const [planToDiscard, setPlanToDiscard] = useState<BillingConfigPlan | null>(null)
  const cancelScheduleMutation = useCancelPlanSchedule()
  const discardMutation = useDiscardPlanVersion()
  const queryClient = useQueryClient()
  const [isPlanDeleting, setIsPlanDeleting] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<number | null>(null)
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)
  const [planStatusMessage, setPlanStatusMessage] = useState("")
  const [openRuleModal, setOpenRuleModal] = useState(false)
  const [ruleKey, setRuleKey] = useState("")
  const [ruleType, setRuleType] = useState("Boolean")
  const [ruleValue, setRuleValue] = useState("")
  const [ruleDescription, setRuleDescription] = useState("")
  const [tenantOverrideAllowed, setTenantOverrideAllowed] = useState(false)
  const [ruleEffective, setRuleEffective] = useState<"immediately" | "scheduled">("immediately")
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({})
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
    fetchCreditBooks()
    fetchStorageTiers()
    fetchAddons()
  }, [])

  const mapToPlanCards = (apiPlans: BillingConfigPlan[]): PlanCardModel[] => {
    return apiPlans.map((plan) => {
      const lead = pickLeadPriceRow(plan.pricing?.prices)
      const overageEnabled = Boolean(plan.overage_policy?.enabled)
      return {
        key: `plan_${plan.id}`,
        name: plan.name,
        badge: plan.badge_label || "",
        monthly: formatLeadPlanPrice(plan.pricing?.currency, lead),
        includedSlips: formatPlanLimit(plan.feature_limits?.slip_capacity, "/month"),
        overageRate: formatOverageRate(plan.overage_policy?.standard_rate, overageEnabled),
        continuousRate: formatOverageRate(plan.overage_policy?.discounted_continuous_rate, overageEnabled),
        includedStorage: formatPlanLimit(plan.feature_limits?.included_storage_gb, " GB"),
        maxUsers: formatPlanLimit(plan.feature_limits?.max_user_seats),
        activeLabs: plan.active_labs_count !== undefined ? `${plan.active_labs_count} active labs` : "— labs",
        previewBgColor: plan.preview_bg_color,
        sourcePlan: plan,
      }
    })
  }

  const planCards = useMemo(() => mapToPlanCards(plans), [plans])

  const planSummary = useMemo(() => {
    const totalLabs = plans.reduce((sum, plan) => sum + (plan.active_labs_count ?? 0), 0)
    const revenue = plans.reduce((sum, plan) => {
      const lead = pickLeadPriceRow(plan.pricing?.prices)
      const price = lead ? Number(lead.price) || 0 : 0
      return sum + price * (plan.active_labs_count ?? 0)
    }, 0)
    const distribution =
      totalLabs === 0
        ? "No subscribers yet"
        : plans
            .map((plan) => {
              const count = plan.active_labs_count ?? 0
              const percent = Math.round((count / totalLabs) * 100)
              return `${percent}% ${plan.name}`
            })
            .join(", ")
    return {
      arpu: totalLabs > 0 ? revenue / totalLabs : 0,
      distribution,
    }
  }, [plans])

  const openEditor = (plan: BillingConfigPlan | null, initialStep?: EditorStep, initialMode?: SaveMode) => {
    setEditor({
      key: Date.now(),
      planId: plan?.id ?? null,
      planName: plan?.name,
      planStatus: plan?.status,
      initialStep,
      initialMode,
    })
  }

  const openCreate = () => openEditor(null)
  const openEdit = (card: PlanCardModel) => {
    if (card.sourcePlan) openEditor(card.sourcePlan)
  }

  const handleCardAction = (plan: BillingConfigPlan, action: CardAction) => {
    if (action === "edit") openEditor(plan)
    else if (action === "publish_now") openEditor(plan, "review", "publish_now")
    else if (action === "reschedule") openEditor(plan, "review", "schedule")
    else if (action === "discard") setPlanToDiscard(plan)
    else if (action === "cancel_schedule") {
      cancelScheduleMutation.mutate(plan.id, {
        onSuccess: () => toast({ title: t("planEditor.toast.scheduleCancelled", { name: plan.name }) }),
        onError: (error) => toast({ title: t("planEditor.toast.actionFailed"), description: parseApiError(error).message, variant: "destructive" }),
      })
    }
  }

  const confirmDiscard = () => {
    if (!planToDiscard) return
    const plan = planToDiscard
    discardMutation.mutate(plan.id, {
      onSuccess: () => {
        toast({ title: t("planEditor.toast.discarded", { name: plan.name }) })
        setPlanToDiscard(null)
      },
      onError: (error) => toast({ title: t("planEditor.toast.actionFailed"), description: parseApiError(error).message, variant: "destructive" }),
    })
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
      await queryClient.invalidateQueries({ queryKey: billingConfigKeys.all })
      setOpenDeleteConfirm(false)
      setPlanToDelete(null)
    } catch (error: any) {
      setPlanStatusMessage(error?.message || "Failed to delete plan.")
    } finally {
      setIsPlanDeleting(false)
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
            { label: "Billing & Subscription" },
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
              ["features", "Feature Matrix"],
              ["rules", "Global Inclusions"],
              ["credits", "Promotional Offers"],
              ["storage", "Storage tiers"],
              ["addons", "Add-ons"],
              ["capacity", "Capacity Packs"],
            ] as const
          ).map(([id, label]) => (
            <TabsTrigger
              key={id}
              value={id}
              className="h-8 rounded-md px-3 text-xs font-medium data-[state=active]:bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] data-[state=active]:text-white data-[state=active]:shadow-sm"
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
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 rounded-lg border border-[#D0D5DD] px-4 text-[13px] font-medium text-[#434343] hover:bg-[#F9FAFB]",
                    planListStatus === "draft" && "border-[#1162A8] bg-[#1162A8]/10 text-[#1162A8]",
                  )}
                  type="button"
                  aria-pressed={planListStatus === "draft"}
                  onClick={() => setPlanListStatus((current) => (current === "draft" ? "active" : "draft"))}
                  data-testid="plan-list-drafts-toggle"
                >
                  {planListStatus === "draft" ? t("planEditor.list.showLive") : t("planEditor.list.drafts")}
                </Button>
                <Button
                  size="sm"
                  className="h-9 rounded-lg bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] px-4 text-[13px] font-medium text-white hover:bg-[#0d4a7e]"
                  type="button"
                  onClick={openCreate}
                  data-testid="plan-list-create"
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
                    <PlanCard
                      plan={plan}
                      onDelete={confirmDelete}
                      onEdit={openEdit}
                      onViewSubscribers={openSubscribers}
                      onAction={handleCardAction}
                    />
                  </div>
                ))}
              </div>

              {planListStatus === "draft" ? (
                <p className="text-xs text-muted-foreground" data-testid="plan-list-drafts-hint">{t("planEditor.list.draftsHint")}</p>
              ) : null}
              {isPlansLoading ? <p className="text-xs text-muted-foreground">Loading plans...</p> : null}
              {plansQuery.isError ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-[#CF0202]">
                  {t("planEditor.list.loadFailed")}
                  <Button type="button" size="sm" variant="outline" onClick={() => void plansQuery.refetch()}>
                    {t("planEditor.actions.tryAgain")}
                  </Button>
                </p>
              ) : null}
              {!isPlansLoading && !plansQuery.isError && planCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {planListStatus === "draft" ? t("planEditor.list.noDrafts") : "No plans in the database yet. Create a plan to get started."}
                </p>
              ) : null}
              <div className="grid gap-2 md:grid-cols-2">
                <Card className="shadow-none">
                  <CardContent className="px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Average Revenue Per Lab</p>
                    <p className="text-sm font-semibold">${planSummary.arpu.toFixed(2)}/mo</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardContent className="px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Plan Distribution</p>
                    <p className="text-sm font-semibold">{planSummary.distribution}</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {planStatusMessage ? <p className="text-xs text-muted-foreground">{planStatusMessage}</p> : null}
        </TabsContent>

        <TabsContent value="features" className="mt-0 space-y-3 outline-none">
          <PlanFeatureMatrixEditor />
        </TabsContent>

        <TabsContent value="capacity" className="mt-0 space-y-3 outline-none">
          <CapacityAddonManager />
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

      {editor ? (
        <PlanEditorDialog
          key={editor.key}
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null)
          }}
          planId={editor.planId}
          planName={editor.planName}
          planStatus={editor.planStatus}
          initialStep={editor.initialStep}
          initialMode={editor.initialMode}
        />
      ) : null}

      <Dialog open={planToDiscard !== null} onOpenChange={(open) => !open && !discardMutation.isPending && setPlanToDiscard(null)}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md rounded-xl p-0" data-testid="plan-discard-confirm">
          <div className="p-6">
            <DialogTitle className="text-lg font-semibold">{t("planEditor.discard.title")}</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("planEditor.discard.body", { name: planToDiscard?.name ?? "" })}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setPlanToDiscard(null)} disabled={discardMutation.isPending}>
              {t("planEditor.actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDiscard} disabled={discardMutation.isPending} data-testid="plan-discard-confirm-button">
              {discardMutation.isPending ? t("planEditor.actions.saving") : t("planEditor.discard.confirm")}
            </Button>
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
