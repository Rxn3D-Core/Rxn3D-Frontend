"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  type BillingProfile,
} from "@/lib/api/billing-profiles"
import {
  getBillingUsage,
  getBillingCreditBalance,
  listSubscriptionInvoices,
  listBillingCatalogAddOns,
  listCustomerAddOns,
  createAddOnCheckoutSession,
  type BillingUsage,
  type SubscriptionInvoice,
  type CatalogAddOn,
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
  type CatalogPlan,
} from "@/lib/billing-subscription/plan-helpers"
import { Download, CreditCard, ExternalLink, DollarSign, Check, Loader2, ArrowRight } from "lucide-react"
import { getBillingFrequencyLabel, getDefaultBillingPrice } from "./pricing"
import { BillingPeriodDialog } from "./components/billing-period-dialog"
import { CancelSubscriptionDialog } from "./components/cancel-subscription-dialog"
import { ReactivateSubscriptionDialog } from "./components/reactivate-subscription-dialog"
import { UpdateBillingInfoDialog } from "./components/update-billing-info-dialog"

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
  const [catalogAddOns, setCatalogAddOns] = useState<CatalogAddOn[]>([])
  const [customerAddOns, setCustomerAddOns] = useState<CustomerAddOn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const hasFetchedRef = useRef(false)
  const [resolvedCustomerId, setResolvedCustomerId] = useState<number | null>(null)

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isBillingPeriodDialogOpen, setIsBillingPeriodDialogOpen] = useState(false)
  const [isCancelSubscriptionDialogOpen, setIsCancelSubscriptionDialogOpen] = useState(false)
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
  const [isUpdateBillingInfoDialogOpen, setIsUpdateBillingInfoDialogOpen] = useState(false)

  const resolveCustomerId = useCallback((): number | null => {
    if (typeof window === "undefined") return null
    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) return parseInt(storedCustomerId, 10)
    if (user?.customers && user.customers.length > 0) return user.customers[0].id
    if (user?.customer_id) return user.customer_id
    return null
  }, [user])

  const loadSubscriptionData = useCallback(async (customerId: number) => {
    setSubscriptionState("loading")
    setError(null)

    const [profileResult, usage, credits, invoices, plans, addOns, purchasedAddOns] =
      await Promise.all([
        getCustomerBillingProfile(customerId),
        getBillingUsage(customerId).catch(() => null),
        getBillingCreditBalance(customerId).catch(() => null),
        listSubscriptionInvoices(customerId).catch(() => []),
        listBillingCatalogPlans(customerId).catch(() => []),
        listBillingCatalogAddOns(customerId).catch(() => []),
        listCustomerAddOns(customerId).catch(() => []),
      ])

    setBillingUsage(usage)
    setCreditBalance(credits?.balance ?? credits?.available_credits ?? null)
    setSubscriptionInvoices(invoices)
    setCatalogPlans(plans)
    setCatalogAddOns(addOns)
    setCustomerAddOns(purchasedAddOns)

    if (!profileResult.has_plan || !profileResult.data) {
      setBillingProfile(null)
      setCurrentPlanDetails(null)
      setSubscriptionState("no-subscription")
      return
    }

    const profile = profileResult.data
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

  const handleReactivateSubscription = async () => {
    setIsReactivateDialogOpen(false)
    await fetchCatalogPlans()
    setView("plans")
  }

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

  const handleAddOnCheckout = async (addOnId: number) => {
    if (!resolvedCustomerId) return
    try {
      setIsProcessing(true)
      const baseUrl = `${window.location.origin}/billing/subscriptions`
      const response = await createAddOnCheckoutSession({
        customer_id: resolvedCustomerId,
        billing_add_on_id: addOnId,
        success_url: `${baseUrl}?checkout=success`,
        cancel_url: `${baseUrl}?checkout=cancel`,
      })
      if (response.url) {
        window.location.href = response.url
      } else {
        throw new Error(response.message || "Failed to start add-on checkout")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to purchase add-on"
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }

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
          Active Subscription
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

  // Loading state
  if (subscriptionState === "loading") {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading subscription details...</p>
          </div>
        </div>
      </div>
    )
  }

  // Plan Selection View
  if (view === "plans") {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
        {/* Back link */}
        <button
          onClick={() => setView("overview")}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors mb-4 group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Subscription
        </button>

        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
          <p className="text-sm text-gray-500">
            Upgrade, downgrade, or switch plans. Changes take effect based on your billing cycle.
          </p>
        </div>

        {catalogPlans.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-gray-500">Fetching available plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {catalogPlans.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((plan) => {
              const isCurrent = plan.id === billingProfile?.billing_plan_id
              const isPopular = plan.badge_label?.toLowerCase().includes("popular")
              const monthlyPrice = formatPlanPriceLabel(plan)
              const limitsText = buildPlanLimitsText(plan)
              const features = buildPlanFeatures(plan)
              const hasActivePlan =
                !!billingProfile?.billing_plan_id &&
                (billingProfile?.status === "active" || billingProfile?.status === "trialing")

              let buttonText = "Choose Plan"
              if (plan.name.toLowerCase().includes("enterprise")) {
                buttonText = "Contact Sales"
              } else if (isCurrent) {
                buttonText = "Your current plan"
              } else if (!hasActivePlan) {
                buttonText = isFreePlan(plan) ? `Start ${plan.name}` : `Buy ${plan.name}`
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
        <div className="text-xs text-gray-400 mb-4">
          <span>Billing</span>
          <span className="mx-1">-</span>
          <span className="text-gray-700 font-medium">Subscription</span>
        </div>

        <div className="mx-auto max-w-[740px] rounded-2xl border border-[#E5E7EB] bg-white px-6 py-8 shadow-sm sm:px-11 sm:py-9">
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

            <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => setIsReactivateDialogOpen(true)}
                className="min-w-[246px] rounded-lg bg-[#1567B8] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#11569A]"
              >
                Reactivate Subscription
              </button>
              <button className="min-w-[156px] rounded-lg border border-[#767676] bg-white px-6 py-3 text-sm font-medium text-[#333333] transition-colors hover:bg-gray-50">
                Export Data
              </button>
            </div>
          </div>
        </div>

        <ReactivateSubscriptionDialog
          open={isReactivateDialogOpen}
          onOpenChange={setIsReactivateDialogOpen}
          onConfirm={() => void handleReactivateSubscription()}
        />
      </div>
    )
  }

  // No active subscription state → "No active subscription" UI
  if (subscriptionState === "no-subscription") {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-400 mb-4">
          <span>Billing</span>
          <span className="mx-1">-</span>
          <span className="text-gray-700 font-medium">Subscription</span>
        </div>

        {/* No Subscription Card */}
        <div className="border-2 border-blue-500 rounded-xl bg-white">
          <div className="flex flex-col items-center py-10 px-6">
            {/* Dollar icon */}
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <DollarSign className="h-7 w-7 text-blue-700" />
            </div>

            {/* Title & subtitle */}
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {subscriptionState === "cancelled" ? "Subscription cancelled" : "No active subscription"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {subscriptionState === "cancelled"
                ? "Your plan ended. Choose a plan to restore full access."
                : "Choose a plan to unlock your lab's full potential"}
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
  const usagePercent =
    slipCapacity > 0 ? Math.min((usageCount / slipCapacity) * 100, 100) : 0

  const nextBillingDate = formatBillingDate(billingProfile?.current_period_end)
  const statusLabel = billingProfile?.status?.replace("_", " ") ?? "unknown"
  const latestInvoice = subscriptionInvoices[0]
  const paymentUpdateUrl = subscriptionInvoices.find((inv) => inv.hosted_invoice_url)?.hosted_invoice_url

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-3">
        <span>Billing</span>
        <span className="mx-1">-</span>
        <span className="text-gray-700 font-medium">Subscription</span>
      </div>

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

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Current Plan */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">Current plan</h3>
            <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center cursor-help" title="Your current subscription plan">
              <span className="text-[10px] text-gray-400">?</span>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h2 className="text-xl font-bold text-gray-900">{planName}</h2>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {priceText}
              {slipCapacity > 0 ? `, ${slipCapacity.toLocaleString()} cases / month` : ", unlimited cases / month"}
            </p>
            <p className="text-xs text-gray-500 capitalize">Status: {statusLabel}</p>
            <p className="text-xs text-gray-500">
              {maxAdminSeats} admin seat{maxAdminSeats !== 1 ? "s" : ""}, {maxUserSeats === -1 || maxUserSeats === null || maxUserSeats === undefined ? "unlimited" : maxUserSeats} user{maxUserSeats === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => {
              fetchCatalogPlans()
              setView("plans")
            }}
            className="w-full bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            Upgrade / Downgrade plan
          </button>
        </div>

        {/* Usage */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">Usage</h3>
            <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center cursor-help" title="Your current usage this billing period">
              <span className="text-[10px] text-gray-400">?</span>
            </div>
          </div>
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 leading-tight">{usageCount.toLocaleString()}</h2>
            <p className="text-xs text-gray-500">
              {slipCapacity > 0 ? `${usagePercent.toFixed(1)}% used` : "Unlimited plan"}
              {creditBalance != null ? ` · ${creditBalance.toLocaleString()} credits available` : ""}
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
            {slipCapacity > 0 && (
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent >= 90 ? "#EF4444" : usagePercent >= 75 ? "#FF9900" : "#3B82F6",
                }}
              />
            )}
          </div>
          <button
            onClick={() => router.push("/billing/subscriptions/add-ons")}
            className="w-full bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            Explore Add-ons
          </button>
        </div>

        {/* Next Billing Date */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-500">Next billing date</h3>
            <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center cursor-help" title="Your next billing date">
              <span className="text-[10px] text-gray-400">?</span>
            </div>
          </div>
          <div className="mb-3">
            <h2 className="text-3xl font-bold text-gray-900 leading-tight">{nextBillingDate}</h2>
            <p className="text-xs text-gray-500">Charged {billingFrequencyLabel}</p>
          </div>
          <button
            onClick={() => setIsBillingPeriodDialogOpen(true)}
            className="w-full bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            Edit period
          </button>
        </div>
      </div>

      {/* Warning Alert (shown when usage is high) */}
      {usagePercent >= 75 && (
        <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: "#FFF8EB", border: "1px solid #FFE0A3" }}>
          <div className="flex items-start gap-2.5">
            <svg width="20" height="20" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
              <path d="M13.8704 12.8411V4.38275L4.87036 17.6744H11.8704L11.8704 26.1328L20.8704 12.8411L13.8704 12.8411Z" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "#9A671B" }}>
                You&apos;re close to hitting your monthly limit.
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9A671B" }}>
                Add more slips or upgrade your plan now to continue production.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchCatalogPlans()
                    setView("plans")
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#FF9900" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Upgrade plan
                </button>
                <button
                  onClick={() => router.push("/billing/subscriptions/add-ons")}
                  className="inline-flex items-center px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-orange-50"
                  style={{ borderColor: "#FFD080", color: "#9A671B" }}
                >
                  + Explore Add-ons
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details */}
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
        </div>
        <div className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setIsUpdateBillingInfoDialogOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Update Billing Info
            </button>
            <button 
              onClick={() => setIsCancelSubscriptionDialogOpen(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
              Cancel Subscription
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 md:col-span-1">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-800 capitalize">{statusLabel}</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                {billingProfile?.stripe_customer_id
                  ? `Stripe customer ···${billingProfile.stripe_customer_id.slice(-4)}`
                  : "Stripe customer not linked yet"}
              </p>
              {latestInvoice?.hosted_invoice_url && (
                <a
                  href={latestInvoice.hosted_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View latest invoice
                </a>
              )}
            </div>

            {customerAddOns.slice(0, 2).map((item) => (
              <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800">
                    {item.add_on?.name || `Add-on #${item.billing_add_on_id}`}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize">
                    {item.status || "active"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {item.add_on?.monthly_fee != null
                    ? `${formatCurrency(item.add_on.monthly_fee)}/mo`
                    : "Active add-on"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(catalogAddOns.length > 0 || customerAddOns.length > 0) && (
        <div id="subscription-add-ons" className="bg-white rounded-lg shadow-sm border mb-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Add-ons</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {catalogAddOns.map((addOn) => {
              const purchased = customerAddOns.some(
                (item) => item.billing_add_on_id === addOn.id && item.status !== "cancelled"
              )
              return (
                <div key={addOn.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{addOn.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {addOn.description || `${formatCurrency(addOn.monthly_fee)}/month`}
                    </p>
                  </div>
                  {purchased ? (
                    <span className="text-xs text-green-700 font-medium">Active</span>
                  ) : (
                    <button
                      onClick={() => handleAddOnCheckout(addOn.id)}
                      disabled={isProcessing}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                    >
                      Purchase
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
          {subscriptionInvoices.some((inv) => inv.invoice_pdf) && (
            <span className="text-xs text-gray-500">
              {subscriptionInvoices.length} invoice{subscriptionInvoices.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {subscriptionInvoices.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-500">
            No subscription invoices yet. Invoices appear here after your first Stripe billing cycle.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {subscriptionInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {invoice.invoice_number || `Invoice #${invoice.id}`}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatBillingDate(invoice.created_at || invoice.paid_at)} ·{" "}
                    {formatCurrency(invoice.amount, invoice.currency || "USD")}
                    {invoice.status ? ` · ${invoice.status}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {invoice.hosted_invoice_url && (
                    <a
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  )}
                  {invoice.invoice_pdf && (
                    <a
                      href={invoice.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BillingPeriodDialog open={isBillingPeriodDialogOpen} onOpenChange={setIsBillingPeriodDialogOpen} />
      <CancelSubscriptionDialog
        open={isCancelSubscriptionDialogOpen}
        onOpenChange={setIsCancelSubscriptionDialogOpen}
        onConfirm={handleCancelSubscription}
        isProcessing={isProcessing}
      />
      <UpdateBillingInfoDialog
        open={isUpdateBillingInfoDialogOpen}
        onOpenChange={setIsUpdateBillingInfoDialogOpen}
      />
    </div>
  )
}
