"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  getCustomerBillingProfile,
  listBillingCatalogPlans,
  createBillingCheckoutSession,
  createBillingProfile,
  updateBillingProfile,
  upgradeBillingProfile,
  downgradeBillingProfile,
  cancelSubscription,
  createBillingPortalSession,
  type BillingProfile,
} from "@/lib/api/billing-profiles"
import {
  getBillingUsage,
  getBillingCreditBalance,
  getSlipUsageFallbackCount,
  listSubscriptionInvoices,
  listCustomerAddOns,
  type BillingUsage,
  type SubscriptionInvoice,
  type CustomerAddOn,
} from "@/lib/api/billing-subscription"
import {
  buildPlanFeatures,
  buildPlanLimitsText,
  collectCatalogHighlights,
  formatBillingDate,
  formatCurrency,
  formatPlanPriceLabel,
  getPlanMonthlyFee,
  getSlipCapacity,
  isFreePlan,
  resolveNextBillingPeriodEnd,
  type CatalogPlan,
} from "@/lib/billing-subscription/plan-helpers"
import { resolveUsageCustomerId } from "@/lib/billing-subscription/customer-context"
import {
  Download,
  CreditCard,
  ExternalLink,
  DollarSign,
  Check,
  Loader2,
  ArrowRight,
  CircleHelp,
  TrendingUp,
  Zap,
  Plus,
  UserRound,
} from "lucide-react"
import { getBillingFrequencyLabel, getDefaultBillingPrice } from "./pricing"
import { BillingPeriodDialog } from "./components/billing-period-dialog"
import { CancelSubscriptionDialog } from "./components/cancel-subscription-dialog"
import { UpdateBillingInfoDialog } from "./components/update-billing-info-dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type SubscriptionState = "loading" | "no-subscription" | "active" | "cancelled" | "error"

export default function SubscriptionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [view, setView] = useState<"overview" | "plans">("overview")
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("loading")
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null)
  const [catalogPlans, setCatalogPlans] = useState<CatalogPlan[]>([])
  const [currentPlanDetails, setCurrentPlanDetails] = useState<CatalogPlan | null>(null)
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<SubscriptionInvoice[]>([])
  const [customerAddOns, setCustomerAddOns] = useState<CustomerAddOn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const hasFetchedRef = useRef(false)
  const [resolvedCustomerId, setResolvedCustomerId] = useState<number | null>(null)

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isBillingPeriodDialogOpen, setIsBillingPeriodDialogOpen] = useState(false)
  const [isCancelSubscriptionDialogOpen, setIsCancelSubscriptionDialogOpen] = useState(false)
  const [isUpdateBillingInfoDialogOpen, setIsUpdateBillingInfoDialogOpen] = useState(false)
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false)
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)

  const resolveCustomerId = useCallback(
    (): number | null =>
      resolveUsageCustomerId(user, typeof window !== "undefined" ? window.localStorage : null),
    [user]
  )

  const loadSubscriptionData = useCallback(async (customerId: number) => {
    setSubscriptionState("loading")
    setError(null)

    const [profileResult, usage, credits, invoices, plans, purchasedAddOns] =
      await Promise.all([
        getCustomerBillingProfile(customerId),
        getBillingUsage(customerId).catch(() => null),
        getBillingCreditBalance(customerId).catch(() => null),
        listSubscriptionInvoices(customerId).catch(() => []),
        listBillingCatalogPlans(customerId).catch(() => []),
        listCustomerAddOns(customerId).catch(() => []),
      ])

    if (!profileResult.has_plan || !profileResult.data) {
      setBillingUsage(usage)
      setCreditBalance(credits?.balance ?? credits?.available_credits ?? null)
      setSubscriptionInvoices(invoices)
      setCatalogPlans(plans)
      setCustomerAddOns(purchasedAddOns)
      setBillingProfile(null)
      setCurrentPlanDetails(null)
      setSubscriptionState("no-subscription")
      return
    }

    const profile = profileResult.data
    const rawUsageCount = usage?.slip_count ?? profile.usage_count ?? 0
    let resolvedUsage = usage

    if (rawUsageCount === 0) {
      try {
        const fallbackSlipCount = await getSlipUsageFallbackCount(customerId, {
          periodStart: usage?.period_start ?? profile.current_period_start,
          periodEnd: usage?.period_end ?? profile.current_period_end,
        })

        resolvedUsage = {
          ...(usage ?? {}),
          slip_count: fallbackSlipCount,
          period_start: usage?.period_start ?? profile.current_period_start,
          period_end: usage?.period_end ?? profile.current_period_end,
        }
      } catch (fallbackError) {
        console.error("Error fetching slip usage fallback:", fallbackError)
      }
    }

    setBillingUsage(resolvedUsage)
    setCreditBalance(credits?.balance ?? credits?.available_credits ?? null)
    setSubscriptionInvoices(invoices)
    setCatalogPlans(plans)
    setCustomerAddOns(purchasedAddOns)
    setBillingProfile(profile)

    const planFromCatalog = plans.find((p) => p.id === profile.billing_plan_id)
    setCurrentPlanDetails(planFromCatalog ?? (profile.plan as CatalogPlan) ?? null)

    if (profile.status === "active" || profile.status === "trialing") {
      setSubscriptionState("active")
    } else if (profile.status === "cancelled" || profile.status === "suspended") {
      setSubscriptionState("cancelled")
    } else {
      setSubscriptionState("active")
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has("session_id") || urlParams.get("checkout") === "success") {
        setShowSuccessMessage(true)
        window.history.replaceState({}, "", window.location.pathname)
      }
    }

    if (hasFetchedRef.current) return

    const customerId = resolveCustomerId()
    setResolvedCustomerId(customerId)

    if (!customerId && user === null) return

    hasFetchedRef.current = true

    if (!customerId) {
      setSubscriptionState("no-subscription")
      return
    }

    loadSubscriptionData(customerId).catch((err: unknown) => {
      console.error("Error fetching subscription data:", err)
      const message = err instanceof Error ? err.message : "Failed to load subscription data"
      setError(message)
      setSubscriptionState("error")
    })
  }, [user, resolveCustomerId, loadSubscriptionData])

  const fetchCatalogPlans = useCallback(async () => {
    if (!resolvedCustomerId) return
    try {
      const plans = await listBillingCatalogPlans(resolvedCustomerId)
      setCatalogPlans(plans)
    } catch (err) {
      console.error("Error fetching catalog plans:", err)
    }
  }, [resolvedCustomerId])

  const handleCancelSubscription = async () => {
    if (!billingProfile?.id) return

    try {
      setIsProcessing(true)
      await cancelSubscription(billingProfile.id)
      if (resolvedCustomerId) {
        await loadSubscriptionData(resolvedCustomerId)
      }
    } catch (err: unknown) {
      console.error("Cancellation Error:", err)
      const message = err instanceof Error ? err.message : "Failed to cancel subscription. Please contact support."
      setError(message)
    } finally {
      setIsProcessing(false)
      setIsCancelSubscriptionDialogOpen(false)
    }
  }

  /** Cancelled subscriptions cannot be resumed — open catalog for a new purchase. */
  const handleChooseNewPlan = useCallback(async () => {
    setError(null)
    setIsProcessing(true)
    try {
      await fetchCatalogPlans()
      setView("plans")
    } finally {
      setIsProcessing(false)
    }
  }, [fetchCatalogPlans])

  const openPlanDialog = useCallback(() => {
    void fetchCatalogPlans()
    setIsPlanDialogOpen(true)
  }, [fetchCatalogPlans])

  // Handle Plan Selection (Stripe Checkout)
  const handlePlanSelection = async (planId: number) => {
    if (!resolvedCustomerId) {
      setError("Unable to identify customer. Please try logging in again.")
      return
    }

    const selectedPlan = catalogPlans.find((p) => p.id === planId)
    if (!selectedPlan) {
      setError("Selected plan is no longer available.")
      return
    }

    if (selectedPlan.name.toLowerCase().includes("enterprise")) {
      window.location.href = "mailto:support@rxn3d.com?subject=Enterprise%20plan%20inquiry"
      return
    }

    try {
      setIsProcessing(true)
      setError(null)

      if (isFreePlan(selectedPlan)) {
        const payload = {
          customer_id: resolvedCustomerId,
          billing_plan_id: planId,
          status: "active" as const,
        }
        if (billingProfile?.id) {
          await updateBillingProfile(billingProfile.id, payload)
        } else {
          await createBillingProfile(payload)
        }
        await loadSubscriptionData(resolvedCustomerId)
        setIsPlanDialogOpen(false)
        setView("overview")
        return
      }

      const hasActivePlan =
        !!billingProfile?.billing_plan_id &&
        (billingProfile.status === "active" || billingProfile.status === "trialing")

      if (hasActivePlan && billingProfile?.id && billingProfile.billing_plan_id !== planId) {
        const currentFee = getPlanMonthlyFee(currentPlanDetails)
        const targetFee = getPlanMonthlyFee(selectedPlan)
        const changePayload = { billing_plan_id: planId }

        if (targetFee > currentFee) {
          await upgradeBillingProfile(billingProfile.id, changePayload)
        } else {
          await downgradeBillingProfile(billingProfile.id, changePayload)
        }
        await loadSubscriptionData(resolvedCustomerId)
        setIsPlanDialogOpen(false)
        setView("overview")
        return
      }

      const baseUrl = `${window.location.origin}/billing/subscriptions`
      const response = await createBillingCheckoutSession({
        customer_id: resolvedCustomerId,
        billing_plan_id: planId,
        success_url: `${baseUrl}?checkout=success`,
        cancel_url: `${baseUrl}?checkout=cancel`,
      })

      if (response.success && response.url) {
        window.location.href = response.url
      } else {
        throw new Error("Failed to generate checkout session")
      }
    } catch (err: unknown) {
      console.error("Plan selection error:", err)
      const message =
        err instanceof Error ? err.message : "Something went wrong while updating your plan. Please try again."
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadAllInvoices = () => {
    subscriptionInvoices.forEach((invoice) => {
      if (invoice.invoice_pdf) {
        window.open(invoice.invoice_pdf, "_blank", "noopener,noreferrer")
      }
    })
  }

  const getBillingManagementUrl = (
    profile: BillingProfile | null,
    invoices: SubscriptionInvoice[]
  ): string | null => {
    const explicitKeys = [
      "billing_portal_url",
      "customer_portal_url",
      "portal_url",
      "stripe_portal_url",
      "stripe_customer_portal_url",
      "manage_billing_url",
      "payment_method_update_url",
      "billing_management_url",
      "customer_portal_link",
      "billing_portal_link",
      "portal_link",
    ]

    const excludedKeys = new Set(["hosted_invoice_url", "invoice_pdf"])

    const isInvoiceLikeUrl = (url: string) => /(invoice|receipt|pdf)/i.test(url)

    const findUrlInRecord = (value: unknown, seen = new Set<unknown>()): string | null => {
      if (!value || typeof value !== "object") return null
      if (seen.has(value)) return null
      seen.add(value)

      const record = value as Record<string, unknown>

      for (const key of explicitKeys) {
        const candidate = record[key]
        if (typeof candidate === "string" && candidate.trim() && !isInvoiceLikeUrl(candidate)) {
          return candidate
        }
      }

      for (const [key, candidate] of Object.entries(record)) {
        if (excludedKeys.has(key)) continue

        if (
          typeof candidate === "string" &&
          candidate.trim() &&
          /(portal|billing|manage|payment)/i.test(key) &&
          /(url|link|session)/i.test(key) &&
          !isInvoiceLikeUrl(candidate)
        ) {
          return candidate
        }

        if (
          typeof candidate === "string" &&
          candidate.trim() &&
          /^https?:\/\//i.test(candidate) &&
          !isInvoiceLikeUrl(candidate) &&
          /(stripe|portal|billing|payment|session)/i.test(candidate)
        ) {
          return candidate
        }

        const nested = findUrlInRecord(candidate, seen)
        if (nested) return nested
      }

      return null
    }

    return findUrlInRecord(profile) ?? invoices.map((invoice) => findUrlInRecord(invoice)).find(Boolean) ?? null
  }

  const openBillingManagement = async (url: string | null) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }

    if (!resolvedCustomerId && !billingProfile?.id) {
      toast({
        title: "Billing management unavailable",
        description: "Missing customer billing context for Stripe billing management.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsOpeningBillingPortal(true)
      const portalUrl = await createBillingPortalSession({
        profileId: billingProfile?.id ?? null,
        customerId: resolvedCustomerId,
        returnUrl: typeof window !== "undefined" ? `${window.location.origin}/billing/subscriptions` : null,
      })

      if (portalUrl) {
        window.open(portalUrl, "_blank", "noopener,noreferrer")
        return
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error)
    } finally {
      setIsOpeningBillingPortal(false)
    }

    if (!url) {
      toast({
        title: "Billing management link unavailable",
        description: "The Stripe billing portal endpoint did not return a valid portal URL. If it still fails, the backend portal route is likely erroring.",
        variant: "destructive",
      })
    }
  }

  const getInvoiceDisplayAmount = (invoice: SubscriptionInvoice) =>
    invoice.amount ??
    invoice.amount_paid ??
    invoice.amount_due ??
    invoice.total_amount ??
    invoice.subtotal ??
    null

  // Plan Card Component
  const PlanCard = ({
    name,
    price,
    period = "month",
    limits,
    features,
    buttonText,
    buttonVariant = "outline",
    isCurrent = false,
    isPopular = false,
    badgeText = "",
    currentStatusLabel = "Active Subscription",
    onClick,
    loading = false
  }: {
    name: string
    price: string | number
    period?: string
    limits: string
    features: string[]
    buttonText: string
    buttonVariant?: "outline" | "solid" | "ghost"
    isCurrent?: boolean
    isPopular?: boolean
    badgeText?: string
    currentStatusLabel?: string
    onClick?: () => void
    loading?: boolean
  }) => (
    <div className={`group relative bg-white rounded-2xl border-2 p-8 flex flex-col h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-blue-300 ${
      isCurrent ? 'border-green-500 shadow-md bg-green-50/5' : isPopular ? 'border-blue-500 shadow-lg ring-1 ring-blue-100' : 'border-gray-200 shadow-sm'
    }`}>
      {/* Dynamic Badge/Tag */}
      <div className="mb-4">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
          isCurrent ? 'bg-green-100 text-green-700' : 
          isPopular ? 'bg-blue-100 text-blue-700' : 
          'bg-gray-100 text-gray-500'
        }`}>
          {badgeText || (isCurrent ? "Current Plan" : isPopular ? "Recommended" : name)}
        </span>
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2 leading-tight">{name}</h3>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-4xl font-black text-gray-900">{typeof price === 'number' ? `$${price}` : price}</span>
          {price !== "Custom" && <span className="text-gray-400 font-medium">/{period}</span>}
        </div>
        <p className="text-xs font-medium text-gray-400 leading-relaxed">{limits}</p>
      </div>

      <div className="flex-1 border-t border-gray-100 pt-6 mb-8">
        <ul className="space-y-4">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-0.5 ${isCurrent ? 'bg-green-100' : 'bg-blue-50'}`}>
                <Check className={`h-3 w-3 ${isCurrent ? 'text-green-600' : 'text-blue-500'} stroke-[3px]`} />
              </div>
              <span className="text-[14px] text-gray-600 font-medium leading-snug">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {isCurrent ? (
        <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 font-bold text-sm py-3 rounded-xl border border-green-200">
          <Check className="h-4 w-4 stroke-[3px]" />
          {currentStatusLabel}
        </div>
      ) : (
        <button 
          onClick={onClick}
          disabled={loading}
          className={`w-full py-3.5 px-6 rounded-xl text-sm font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
          buttonVariant === "solid"
            ? "bg-[#1a4f8b] text-white hover:bg-[#163f6e] shadow-lg shadow-blue-900/20"
            : "bg-white border border-gray-200 text-[#1a4f8b] hover:bg-gray-50 hover:border-blue-300"
          } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {buttonText}
        </button>
      )}
    </div>
  )

  const OverviewCard = ({
    title,
    hint,
    children,
    action,
  }: {
    title: string
    hint: string
    children: React.ReactNode
    action: React.ReactNode
  }) => (
    <section className="flex min-h-[208px] flex-col rounded-md border border-[#E4E6EF] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] lg:px-6">
      <div className="flex items-center gap-2 text-[14px] font-normal tracking-[-0.02em] text-black">
        <span>{title}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex h-4 w-4 cursor-default items-center justify-center text-black/80">
              <CircleHelp className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-1 flex-col justify-between pt-5">
        <div>{children}</div>
        <div className="flex justify-center pt-4">{action}</div>
      </div>
    </section>
  )

  const SubtleActionButton = ({
    children,
    onClick,
    className = "",
    disabled = false,
  }: {
    children: React.ReactNode
    onClick?: () => void
    className?: string
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[36px] items-center justify-center rounded-md border border-white bg-white px-5 text-[13px] font-normal tracking-[-0.02em] text-black shadow-[1px_1px_7px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:shadow-[1px_4px_12px_rgba(0,0,0,0.14)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )

  const OverviewCardSkeleton = () => (
    <section className="flex min-h-[208px] flex-col rounded-md border border-[#E4E6EF] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] lg:px-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28 bg-[#E5E7EB]" />
        <Skeleton className="h-4 w-4 rounded-full bg-[#E5E7EB]" />
      </div>
      <div className="flex flex-1 flex-col justify-between pt-5">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40 bg-[#E5E7EB]" />
          <Skeleton className="h-4 w-52 bg-[#E5E7EB]" />
          <Skeleton className="h-4 w-36 bg-[#E5E7EB]" />
          <Skeleton className="h-[5px] w-full rounded-full bg-[#EAEAEB]" />
        </div>
        <div className="flex justify-center pt-4">
          <Skeleton className="h-9 w-full rounded-md bg-[#E5E7EB] sm:w-[210px]" />
        </div>
      </div>
    </section>
  )

  const SubscriptionLoadingSkeleton = () => (
    <div className="w-full max-w-[1880px] bg-[#F9F9F9] px-4 py-4 sm:px-5 lg:px-6">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-10 bg-[#E5E7EB]" />
        <Skeleton className="h-3 w-3 bg-[#E5E7EB]" />
        <Skeleton className="h-3 w-20 bg-[#E5E7EB]" />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <OverviewCardSkeleton />
          <OverviewCardSkeleton />
          <OverviewCardSkeleton />
          <OverviewCardSkeleton />
        </div>
      </div>

      <div className="mt-3 rounded-md border border-[#FFE0B2] bg-[#FFF7ED] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Skeleton className="mt-0.5 h-6 w-6 rounded-md bg-[#FCD9A5]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-72 bg-[#FCD9A5]" />
              <Skeleton className="h-4 w-56 bg-[#FDE7C7]" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-md bg-[#FCD9A5]" />
            <Skeleton className="h-9 w-36 rounded-md bg-[#FDE7C7]" />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-[#E4E6EF] bg-white">
        <div className="px-5 py-5">
          <div className="flex flex-col gap-5">
            <div className="space-y-3">
              <Skeleton className="h-5 w-32 bg-[#E5E7EB]" />
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-8 w-36 rounded-md bg-[#E5E7EB]" />
                <Skeleton className="h-8 w-36 rounded-md bg-[#FEE2E2]" />
              </div>
            </div>
            <div className="w-full max-w-[320px]">
              <div className="h-[124px] rounded-md border border-[#E4E6EF] bg-[#ECECF0] px-[27px] py-[16px]">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40 bg-white/70" />
                  <Skeleton className="h-5 w-24 bg-white/60" />
                  <Skeleton className="mt-5 h-8 w-[183px] rounded-md bg-[#D5D8E1]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E4E6EF] px-5 py-5">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-5 w-20 bg-[#E5E7EB]" />
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <Skeleton className="h-4 w-28 bg-[#E5E7EB]" />
              <Skeleton className="h-9 w-44 rounded-md bg-[#E5E7EB]" />
            </div>
          </div>

          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`invoice-skeleton-${index}`}
                className="flex flex-col gap-3 rounded-md border border-[#E4E6EF] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-[#E5E7EB]" />
                  <Skeleton className="h-4 w-48 bg-[#E5E7EB]" />
                </div>
                <div className="flex flex-wrap items-center gap-5">
                  <Skeleton className="h-4 w-12 bg-[#E5E7EB]" />
                  <Skeleton className="h-4 w-20 bg-[#E5E7EB]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderPlanSelectionContent = ({ onClose, showBackButton = false }: { onClose?: () => void; showBackButton?: boolean } = {}) => (
    <>
      {showBackButton && onClose ? (
        <button
          onClick={onClose}
          className="group mb-4 flex items-center gap-1.5 text-xs text-blue-600 transition-colors hover:text-blue-800"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Subscription
        </button>
      ) : null}

      <div className="mb-10">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-sm text-gray-500">
          {subscriptionState === "cancelled"
            ? "Your previous subscription was cancelled and cannot be resumed. Purchase a new plan to restore full access."
            : "Upgrade, downgrade, or switch plans. Changes take effect based on your billing cycle."}
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {catalogPlans.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Fetching available plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {catalogPlans.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((plan) => {
            const hasActivePlan =
              !!billingProfile?.billing_plan_id &&
              (billingProfile?.status === "active" || billingProfile?.status === "trialing")
            const isLinkedPlan = plan.id === billingProfile?.billing_plan_id
            // Only treat a plan as "current" when the subscription is actually active
            const isCurrent = hasActivePlan && isLinkedPlan
            const isPopular = plan.badge_label?.toLowerCase().includes("popular")
            const monthlyPrice = formatPlanPriceLabel(plan)
            const limitsText = buildPlanLimitsText(plan)
            const features = buildPlanFeatures(plan)

            let buttonText = "Choose Plan"
            if (plan.name.toLowerCase().includes("enterprise")) {
              buttonText = "Contact Sales"
            } else if (isCurrent) {
              buttonText = "Your current plan"
            } else if (!hasActivePlan) {
              if (isFreePlan(plan) && isLinkedPlan && subscriptionState === "cancelled") {
                buttonText = `Continue with ${plan.name}`
              } else if (isFreePlan(plan)) {
                buttonText = `Start ${plan.name}`
              } else {
                buttonText = `Subscribe to ${plan.name}`
              }
            } else {
              const currentFee = getPlanMonthlyFee(currentPlanDetails)
              const planFee = getPlanMonthlyFee(plan)
              buttonText = planFee > currentFee ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`
            }

            let displayBadge = plan.badge_label
            if (!displayBadge) {
              if (isFreePlan(plan)) displayBadge = "Starter, Free"
              else if (isPopular) displayBadge = "Recommended"
            }

            return (
              <PlanCard
                key={plan.id}
                name={plan.name}
                price={monthlyPrice}
                limits={limitsText}
                features={features}
                buttonText={buttonText}
                buttonVariant={
                  isPopular || (!isCurrent && getPlanMonthlyFee(plan) > getPlanMonthlyFee(currentPlanDetails))
                    ? "solid"
                    : "outline"
                }
                isCurrent={isCurrent}
                isPopular={!!isPopular}
                badgeText={displayBadge}
                onClick={isCurrent ? undefined : () => handlePlanSelection(plan.id)}
                loading={isProcessing}
              />
            )
          })}
        </div>
      )}
    </>
  )

  // Loading state
  if (subscriptionState === "loading") {
    return <SubscriptionLoadingSkeleton />
  }

  // Plan Selection View
  if (view === "plans") {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
        {renderPlanSelectionContent({ onClose: () => setView("overview"), showBackButton: true })}
      </div>
    )
  }




  // Error state
  if (subscriptionState === "error") {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-gray-700 font-medium">Unable to load subscription</p>
            <p className="text-xs text-gray-500 max-w-sm">{error}</p>
            <button
              onClick={() => {
                const customerId = resolvedCustomerId ?? resolveCustomerId()
                if (customerId) {
                  loadSubscriptionData(customerId).catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "Failed to load subscription data"
                    setError(message)
                    setSubscriptionState("error")
                  })
                } else {
                  window.location.reload()
                }
              }}
              className="mt-2 px-4 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (subscriptionState === "cancelled") {
    const subscriptionEndedDate = billingProfile?.current_period_end
      ? new Date(billingProfile.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "May 31, 2026"
    const retainedUntilDate = billingProfile?.current_period_end
      ? new Date(new Date(billingProfile.current_period_end).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "June 30, 2026"

    return (
      <div className="flex min-h-[calc(100vh-120px)] w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">

        <div className="mx-auto w-full max-w-[740px] rounded-2xl border border-[#E5E7EB] bg-white px-6 py-8 shadow-sm sm:px-11 sm:py-9">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex rounded-full bg-[#FDECEC] px-7 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#EF4444]">
              Cancelled
            </span>

            <h2 className="mt-5 text-2xl font-bold text-[#111827] sm:text-[22px]">Your subscription has ended</h2>

            <div className="mt-4 space-y-1 text-sm text-[#6B7280]">
              <p>Subscription ended: {subscriptionEndedDate}</p>
              <p>Data retained until: {retainedUntilDate}</p>
            </div>

            <div className="mt-6 flex w-full items-center gap-2 rounded-lg bg-[#FFF4DB] px-4 py-3 text-sm text-[#B7791F]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" stroke="#B7791F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Your data will be permanently deleted after {retainedUntilDate}
            </div>

            <p className="mt-5 max-w-md text-sm text-[#6B7280]">
              Cancelled subscriptions cannot be resumed. Choose a plan to start a new subscription.
            </p>

            <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => void handleChooseNewPlan()}
                disabled={isProcessing}
                className="min-w-[246px] rounded-lg bg-[#1567B8] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#11569A] disabled:opacity-60"
              >
                {isProcessing ? "Loading plans..." : "Choose a Plan"}
              </button>
              <button className="min-w-[156px] rounded-lg border border-[#767676] bg-white px-6 py-3 text-sm font-medium text-[#333333] transition-colors hover:bg-gray-50">
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No active subscription state → "No active subscription" UI
  if (subscriptionState === "no-subscription") {
    const highlights = collectCatalogHighlights(catalogPlans)

    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">

        {/* No Subscription Card */}
        <div className="border-2 border-blue-500 rounded-xl bg-white">
          <div className="flex flex-col items-center py-10 px-6">
            {/* Dollar icon */}
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <DollarSign className="h-7 w-7 text-blue-700" />
            </div>

            {/* Title & subtitle */}
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              No active subscription
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Choose a plan to unlock your lab's full potential.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-2 mb-8">
              {highlights.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* View Plans button */}
            <button
              onClick={() => {
                fetchCatalogPlans()
                setView("plans")
              }}
              className="px-8 py-2.5 bg-[#1a4f8b] text-white text-sm font-medium rounded-lg hover:bg-[#163f6e] transition-colors shadow-sm"
            >
              View Plans
            </button>

            {/* Contact link */}
            <a
              href="#"
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              Questions about pricing? Contact our team
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Active subscription state → Full dashboard UI
  const planName = currentPlanDetails?.name || billingProfile?.plan?.name || "Current plan"
  const planPricing = currentPlanDetails?.pricing || billingProfile?.plan?.pricing
  const featureLimits = currentPlanDetails?.feature_limits || billingProfile?.plan?.feature_limits
  const defaultPrice = getDefaultBillingPrice(planPricing?.prices)
  const billingFrequencyLabel = getBillingFrequencyLabel(planPricing?.prices)

  // Derive pricing text
  let priceText = "$99 / month"
  if (defaultPrice) {
    priceText = `$${Number(defaultPrice.price).toLocaleString()} / ${defaultPrice.frequency || "month"}`
  } else if (currentPlanDetails?.monthly_fee !== undefined || billingProfile?.plan?.monthly_fee !== undefined) {
    const fee = currentPlanDetails?.monthly_fee ?? billingProfile?.plan?.monthly_fee
    priceText = `$${Number(fee).toLocaleString()} / month`
  }

  // Plan allotment (shown on Current plan card) — does not include add-ons/credits.
  const slipCapacity =
    billingUsage?.slip_capacity ||
    getSlipCapacity(currentPlanDetails ?? billingProfile?.plan) ||
    0
  const maxAdminSeats =
    currentPlanDetails?.feature_limits?.max_admin_seats ??
    billingProfile?.plan?.feature_limits?.max_admin_seats ??
    1
  const maxUserSeats =
    currentPlanDetails?.feature_limits?.max_user_seats ??
    billingProfile?.plan?.feature_limits?.max_user_seats

  const usageCount = billingUsage?.slip_count ?? billingProfile?.usage_count ?? 0
  const remainingSlips =
    billingUsage?.remaining_slips ??
    (slipCapacity > 0 ? Math.max(slipCapacity - usageCount, 0) : null)
  // Usage counter denominator: total available this period (used + remaining),
  // so add-ons/extra capacity stay consistent with the "remaining" line.
  const usageLimit =
    remainingSlips != null ? usageCount + remainingSlips : slipCapacity
  const usagePercent =
    usageLimit > 0 ? Math.min((usageCount / usageLimit) * 100, 100) : 0
  const creditUsed = billingUsage?.credit_used ?? 0
  const overageCount = billingUsage?.overage_count ?? 0
  const usagePeriodLabel =
    billingUsage?.period_start || billingUsage?.period_end
      ? `${billingUsage?.period_start ? formatBillingDate(billingUsage.period_start) : "—"}${
          billingUsage?.period_end ? ` – ${formatBillingDate(billingUsage.period_end)}` : ""
        }`
      : null

  const nextBillingPeriodEnd = resolveNextBillingPeriodEnd(
    billingProfile?.current_period_end,
    billingUsage?.period_end,
  )
  const nextBillingDate = formatBillingDate(nextBillingPeriodEnd)
  const statusLabel = billingProfile?.status?.replace("_", " ") ?? "unknown"
  const latestInvoice = subscriptionInvoices[0]
  const paymentUpdateUrl = getBillingManagementUrl(billingProfile, subscriptionInvoices)
  const isLinkPayment = billingProfile?.card_brand === "link"
  const hasCardOnFile = !!billingProfile?.card_last4 || isLinkPayment
  const maskedPaymentMethod = isLinkPayment
    ? "Stripe Link"
    : billingProfile?.card_last4
    ? `•••• •••• •••• ${billingProfile.card_last4}`
    : "No card on file"
  const paymentExpiryLabel = billingProfile?.card_exp_month && billingProfile?.card_exp_year
    ? `Expires ${String(billingProfile.card_exp_month).padStart(2, "0")}/${String(billingProfile.card_exp_year).slice(-2)}`
    : isLinkPayment ? "Managed via Stripe Link" : hasCardOnFile ? "Expires --/--" : "Add a card via Stripe"
  return (
    <TooltipProvider>
      <div className="w-full max-w-[1880px] bg-[#F9F9F9] px-4 py-4 sm:px-5 lg:px-6">

      {/* Success Message Alert */}
      {billingProfile?.status === "past_due" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-semibold text-red-800">
            Payment past due — update your billing information to avoid service interruption.
          </p>
        </div>
      )}

      {showSuccessMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="h-4 w-4" />
            <span className="text-xs font-semibold">Payment successful! Your subscription is now active.</span>
          </div>
          <button onClick={() => setShowSuccessMessage(false)} className="text-green-700 hover:text-green-900">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="space-y-3">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <OverviewCard
            title="Current plan"
            hint={`Your active subscription plan. Includes ${slipCapacity > 0 ? `${slipCapacity.toLocaleString()} slips/month` : "unlimited slips"}, ${maxAdminSeats} admin seat${maxAdminSeats !== 1 ? "s" : ""}, and ${maxUserSeats === -1 || maxUserSeats == null ? "unlimited" : maxUserSeats} user${maxUserSeats === 1 ? "" : "s"}.`}
            action={
              <SubtleActionButton
                onClick={() => {
                  openPlanDialog()
                }}
                className="w-full sm:w-[210px]"
              >
                Upgrade / Downgrade plan
              </SubtleActionButton>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[26px] font-bold leading-none tracking-[-0.02em] text-black">{planName}</h2>
                <TrendingUp className="h-4 w-4 text-black" />
              </div>
              <div className="space-y-0.5 text-[13px] leading-6 tracking-[-0.02em] text-black">
                <p>
                  {priceText}
                  {slipCapacity > 0 ? `, ${slipCapacity.toLocaleString()} slips / month` : ", unlimited slips / month"}
                </p>
                <p>
                  {maxAdminSeats} admin seat{maxAdminSeats !== 1 ? "s" : ""},{" "}
                  {maxUserSeats === -1 || maxUserSeats === null || maxUserSeats === undefined ? "unlimited" : maxUserSeats} user
                  {maxUserSeats === 1 ? "" : "s"}
                </p>
                <p className="capitalize text-black/70">Status: {statusLabel}</p>
              </div>
            </div>
          </OverviewCard>

          <OverviewCard
            title="Usage"
            hint={`Slips created in the current billing period${usagePeriodLabel ? ` (${usagePeriodLabel})` : ""}. ${usageLimit > 0 ? `${usageCount.toLocaleString()} of ${usageLimit.toLocaleString()} available used.` : "Unlimited plan — no monthly slip cap."}${creditBalance != null ? ` ${creditBalance.toLocaleString()} credits available.` : ""}`}
            action={
              <SubtleActionButton onClick={() => router.push("/billing/subscriptions/add-ons")} className="w-full sm:w-[210px]">
                Explore Add-ons
              </SubtleActionButton>
            }
          >
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h2 className="text-[26px] font-bold leading-none tracking-[-0.02em] text-black">
                  {usageLimit > 0
                    ? `${usageCount.toLocaleString()} / ${usageLimit.toLocaleString()}`
                    : usageCount.toLocaleString()}
                </h2>
                <div className="space-y-0.5 text-[13px] leading-6 tracking-[-0.02em] text-black">
                  <p>
                    {usageLimit > 0
                      ? `${usagePercent.toFixed(1)}% used`
                      : "Unlimited plan"}
                    {remainingSlips != null ? ` · ${remainingSlips.toLocaleString()} remaining` : ""}
                  </p>
                  {usagePeriodLabel ? (
                    <p className="text-black/70">{usagePeriodLabel}</p>
                  ) : null}
                  {creditUsed > 0 ? (
                    <p className="text-black/70">{creditUsed.toLocaleString()} credits used</p>
                  ) : null}
                  {overageCount > 0 ? (
                    <p className="text-[#B45309]">{overageCount.toLocaleString()} overage slip{overageCount === 1 ? "" : "s"}</p>
                  ) : null}
                  {creditBalance != null ? (
                    <p className="text-black/70">{creditBalance.toLocaleString()} credits available</p>
                  ) : null}
                </div>
              </div>
              <div className="h-[5px] w-full rounded-full bg-[#EAEAEB]">
                {usageLimit > 0 && (
                  <div
                    className="h-[5px] rounded-full transition-all duration-500"
                    style={{
                      width: `${usagePercent}%`,
                      backgroundColor: usagePercent >= 90 ? "#EF4444" : usagePercent >= 75 ? "#FF9900" : "#3B82F6",
                    }}
                  />
                )}
              </div>
            </div>
          </OverviewCard>

          <OverviewCard
            title="Next billing date"
            hint={`Your next payment is due on ${nextBillingDate}. You are billed ${billingFrequencyLabel}. Charges will be applied to your payment method on file.`}
            action={
              <SubtleActionButton onClick={() => setIsBillingPeriodDialogOpen(true)} className="w-full sm:w-[210px]">
                Edit period
              </SubtleActionButton>
            }
          >
            <div className="space-y-3">
              <h2 className="text-[26px] font-bold leading-none tracking-[-0.02em] text-black">{nextBillingDate}</h2>
              <p className="text-[13px] leading-6 tracking-[-0.02em] text-black">Charged {billingFrequencyLabel}</p>
            </div>
          </OverviewCard>

          {/* Payment Details — custom card to avoid OverviewCard layout constraints */}
          <section className="flex min-h-[208px] flex-col rounded-md border border-[#E4E6EF] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] lg:px-6">
            <div className="flex items-center gap-2 text-[14px] font-normal tracking-[-0.02em] text-black">
              <span>Payment Details</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex h-4 w-4 cursor-default items-center justify-center text-black/80">
                    <CircleHelp className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">
                  Your payment method on file. Update via Stripe to change your card.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-1 flex-col justify-between pt-5">
              {/* Card chip */}
              <div className="flex items-center gap-3 rounded-md border border-[#E4E6EF] bg-[#F5F5F7] px-4 py-3">
                <div className="flex h-9 w-12 items-center justify-center rounded-sm bg-[#1162A8]/10">
                  <CreditCard className="h-5 w-5 text-[#1162A8] stroke-[1.6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-5 tracking-[-0.01em] text-black truncate">{maskedPaymentMethod}</p>
                  <p className="text-[12px] leading-5 text-black/50">{paymentExpiryLabel}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4">
                {paymentUpdateUrl ? (
                  <a
                    href={paymentUpdateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[34px] w-full items-center justify-center gap-2 rounded-md bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-[13px] font-semibold tracking-[-0.01em] text-white shadow-sm transition hover:bg-[#0d4f88]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Update via Stripe
                  </a>
                ) : (
                  <button
                    onClick={() => void openBillingManagement(paymentUpdateUrl)}
                    className="inline-flex h-[34px] w-full items-center justify-center gap-2 rounded-md bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-[13px] font-semibold tracking-[-0.01em] text-white shadow-sm transition hover:bg-[#0d4f88]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Update via Stripe
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsUpdateBillingInfoDialogOpen(true)}
                    className="inline-flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-md border border-[#E4E6EF] bg-white text-[12px] font-medium tracking-[-0.01em] text-black/70 transition hover:bg-gray-50 hover:text-black"
                  >
                    <UserRound className="h-3 w-3" />
                    Billing Info
                  </button>
                  <button
                    onClick={() => setIsCancelSubscriptionDialogOpen(true)}
                    disabled={isProcessing}
                    className="inline-flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-md border border-red-100 bg-white text-[12px] font-medium tracking-[-0.01em] text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Cancel Plan
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Warning Alert (shown when usage is high) */}
      {usagePercent >= 75 && (
        <div className="rounded-md border border-[#FF9900] bg-[#FFF3E1] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-6 w-6 text-[#FF9900]" />
              <div className="space-y-1">
                <p className="text-[15px] font-bold leading-5 tracking-[-0.02em] text-[#9A671B]">
                  You&apos;re close to hitting your monthly limit.
                </p>
                <p className="text-[13px] leading-5 tracking-[-0.02em] text-[#9A671B]">
                  Add more slips or upgrade your plan now to continue production.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  openPlanDialog()
                }}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-md bg-[#FF9900] px-4 text-[13px] font-bold tracking-[-0.02em] text-white shadow-[1px_1px_7px_rgba(0,0,0,0.18)] transition hover:bg-[#eb8d00]"
              >
                <TrendingUp className="h-4 w-4" />
                Upgrade plan
              </button>
              <SubtleActionButton onClick={() => router.push("/billing/subscriptions/add-ons")} className="px-5">
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Explore Add-ons
                </span>
              </SubtleActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="rounded-md border border-[#E4E6EF] bg-white">
        <div className="px-5 py-5">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[15px] font-bold leading-5 tracking-[-0.02em] text-black">Invoices</h3>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <Link
                href="/billing/subscriptions/invoices"
                className="text-[13px] font-medium tracking-[-0.02em] text-[#1162A8] transition hover:text-[#0d4f88]"
              >
                View all invoices
              </Link>
              {subscriptionInvoices.some((inv) => inv.invoice_pdf) && (
                <SubtleActionButton onClick={handleDownloadAllInvoices} className="w-full sm:w-auto">
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download all invoices
                  </span>
                </SubtleActionButton>
              )}
            </div>
          </div>

          {subscriptionInvoices.length === 0 ? (
            <div className="rounded-md border border-[#E4E6EF] px-5 py-6 text-center text-[13px] leading-6 tracking-[-0.02em] text-black/70">
              No subscription invoices yet. Invoices appear here after your first Stripe billing cycle.
            </div>
          ) : (
            <div className="space-y-2.5">
              {subscriptionInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-3 rounded-md border border-[#E4E6EF] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-[13px] font-normal leading-6 tracking-[-0.02em] text-black">
                      {invoice.invoice_number || `Invoice #${invoice.id}`}
                    </p>
                    <p className="text-[13px] leading-6 tracking-[-0.02em] text-[#B4B0B0]">
                      {formatBillingDate(invoice.created_at || invoice.paid_at)} •{" "}
                      {formatCurrency(getInvoiceDisplayAmount(invoice), invoice.currency || "USD")}
                      {invoice.status ? ` • ${invoice.status}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-5">
                    <Link
                      href={`/billing/subscriptions/invoices/${invoice.id}`}
                      className="inline-flex items-center gap-2 text-[13px] font-normal tracking-[-0.02em] text-black transition hover:text-[#1162A8]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Link>
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[13px] font-normal tracking-[-0.02em] text-black transition hover:text-[#1162A8]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BillingPeriodDialog open={isBillingPeriodDialogOpen} onOpenChange={setIsBillingPeriodDialogOpen} />
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent
          onEscapeKeyDown={() => setIsPlanDialogOpen(false)}
          className="max-h-[92vh] w-[min(96vw,1520px)] max-w-none overflow-y-auto rounded-2xl bg-[#F9F9F9] p-6 shadow-2xl"
        >
          {renderPlanSelectionContent()}
        </DialogContent>
      </Dialog>
      <CancelSubscriptionDialog
        open={isCancelSubscriptionDialogOpen}
        onOpenChange={setIsCancelSubscriptionDialogOpen}
        onConfirm={handleCancelSubscription}
        isProcessing={isProcessing}
      />
      <UpdateBillingInfoDialog
        open={isUpdateBillingInfoDialogOpen}
        onOpenChange={setIsUpdateBillingInfoDialogOpen}
        onUpdateStripe={() => void openBillingManagement(paymentUpdateUrl)}
        canManageBilling={!!paymentUpdateUrl || !!resolvedCustomerId || !!billingProfile?.id}
        cardBrand={billingProfile?.card_brand}
        cardLast4={billingProfile?.card_last4}
        cardExpMonth={billingProfile?.card_exp_month}
        cardExpYear={billingProfile?.card_exp_year}
      />
    </div>
    </TooltipProvider>
  )
}
