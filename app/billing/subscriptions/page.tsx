"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { UpgradeModal } from "@/components/upgrade-modal"
import { 
  getCustomerBillingProfile, 
  listBillingCatalogPlans, 
  createBillingCheckoutSession,
  type BillingProfile 
} from "@/lib/api/billing-profiles"
import { Download, CreditCard, ExternalLink, DollarSign, Check, Loader2, ArrowRight } from "lucide-react"

type SubscriptionState = "loading" | "no-subscription" | "active" | "cancelled" | "error"

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const [view, setView] = useState<"overview" | "plans">("overview")
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("loading")
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null)
  const [catalogPlans, setCatalogPlans] = useState<any[]>([])
  const [currentPlanDetails, setCurrentPlanDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const hasFetchedRef = useRef(false)
  const [resolvedCustomerId, setResolvedCustomerId] = useState<number | null>(null)

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Fetch billing profile once on mount
  useEffect(() => {
    // Check for success session from Stripe
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has("session_id")) {
        setShowSuccessMessage(true)
        // Clean up URL
        const newUrl = window.location.pathname
        window.history.replaceState({}, "", newUrl)
      }
    }

    // Prevent double-fetch (React strict mode or user object settling)
    if (hasFetchedRef.current) return

    const resolveCustomerId = (): number | null => {
      if (typeof window === "undefined") return null
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) return parseInt(storedCustomerId, 10)
      if (user?.customers && user.customers.length > 0) return user.customers[0].id
      if (user?.customer_id) return user.customer_id
      return null
    }

    const customerId = resolveCustomerId()
    setResolvedCustomerId(customerId)

    // If user hasn't loaded yet (null) and no localStorage fallback, wait
    if (!customerId && user === null) return

    // Mark as fetched so we don't re-run
    hasFetchedRef.current = true

    if (!customerId) {
      setSubscriptionState("no-subscription")
      return
    }

    const fetchBillingData = async () => {
      try {
        setSubscriptionState("loading")
        const result = await getCustomerBillingProfile(customerId)

        if (!result.has_plan || !result.data) {
          setSubscriptionState("no-subscription")
          return
        }

        const profile = result.data
        setBillingProfile(profile)

        if (profile.plan) {
          setCurrentPlanDetails(profile.plan)
        }

        if (profile.status === "active" || profile.status === "trialing") {
          setSubscriptionState("active")
        } else if (profile.status === "cancelled" || profile.status === "suspended") {
          setSubscriptionState("cancelled")
        } else {
          setSubscriptionState("active")
        }
      } catch (err: any) {
        console.error("Error fetching billing profile:", err)
        setError(err.message || "Failed to load subscription data")
        setSubscriptionState("error")
      }
    }

    fetchBillingData()
  }, [user])

  // Fetch available plans
  const fetchCatalogPlans = useCallback(async () => {
    try {
      const plans = await listBillingCatalogPlans()
      setCatalogPlans(plans)
    } catch (err) {
      console.error("Error fetching catalog plans:", err)
    }
  }, [])

  // Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!billingProfile?.id) return
    
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel your subscription? Your features will remain active until the end of the current billing period."
    )
    
    if (!confirmCancel) return

    try {
      setIsProcessing(true)
      // Note: You might need to import cancelSubscription from @/lib/api/billing-profiles
      // I'll ensure it's imported at the top
      const { cancelSubscription } = await import("@/lib/api/billing-profiles")
      await cancelSubscription(billingProfile.id)
      
      // Refresh state
      window.location.reload()
    } catch (err: any) {
      console.error("Cancellation Error:", err)
      setError(err.message || "Failed to cancel subscription. Please contact support.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Plan Selection (Stripe Checkout)
  const handlePlanSelection = async (planId: number) => {
    if (!resolvedCustomerId) {
      setError("Unable to identify customer. Please try logging in again.")
      return
    }

    try {
      setIsProcessing(true)
      const successUrl = `${window.location.origin}/billing/subscriptions`
      const cancelUrl = `${window.location.origin}/billing/subscriptions`

      const response = await createBillingCheckoutSession({
        customer_id: resolvedCustomerId,
        billing_plan_id: planId,
        frequency: "monthly",
        success_url: successUrl,
        cancel_url: cancelUrl
      })

      if (response.success && response.url) {
        window.location.href = response.url
      } else {
        throw new Error("Failed to generate checkout session")
      }
    } catch (err: any) {
      console.error("Stripe Checkout Error:", err)
      setError(err.message || "Something went wrong while starting the checkout. Please try again.")
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
              const isPopular = plan.badge_label?.toLowerCase() === "popular"

              // Get monthly price
              let monthlyPrice: string | number = plan.monthly_fee ?? "Custom"
              if (plan.pricing?.prices) {
                const monthPrice = plan.pricing.prices.find((p: any) => p.frequency === "monthly") || plan.pricing.prices[0]
                if (monthPrice) monthlyPrice = monthPrice.price
              }

              // Build limits text
              const slipLimit = plan.feature_limits?.slip_capacity
              const adminSeats = plan.feature_limits?.max_admin_seats
              const userSeats = plan.feature_limits?.max_user_seats
              const limitsText = `${slipLimit ? slipLimit.toLocaleString() : 'Unlimited'} cases/month · ${adminSeats || 1} admin seat, ${userSeats === -1 || userSeats === null ? 'unlimited' : userSeats} users`

              // Default features if not provided by API
              const defaultFeaturesMap: Record<string, string[]> = {
                "starter": ["Slip management", "Basic reporting", "Email support", "Standard integrations"],
                "business": ["Everything in Starter", "Advanced reporting", "Priority support", "Dunning workflows", "Stripe + QuickBooks"],
                "professional": ["Everything in Business", "Custom dunning rules", "Dedicated support", "All integrations", "API access"],
                "enterprise": ["Everything in Professional", "Custom integrations", "SLA guarantee", "Onboarding manager", "Custom contracts"]
              }
              const features = plan.description ? [plan.description] : (defaultFeaturesMap[plan.name.toLowerCase()] || ["Standard production access", "Core reporting", "Regular support"])

              // Button logic
              let buttonText = "Choose Plan"
              const hasActivePlan = !!billingProfile?.billing_plan_id && (billingProfile?.status === "active" || billingProfile?.status === "trialing")

              if (plan.name.toLowerCase() === "enterprise") {
                buttonText = "Contact Sales"
              } else if (isCurrent) {
                buttonText = "Your current plan"
              } else if (!hasActivePlan) {
                buttonText = `Buy ${plan.name}`
              } else {
                const currentFee = currentPlanDetails?.monthly_fee ?? 0
                const planFee = plan.monthly_fee ?? 0
                if (planFee > currentFee) {
                  buttonText = `Upgrade to ${plan.name}`
                } else {
                  buttonText = `Downgrade to ${plan.name}`
                }
              }

              // Determine badge text
              let displayBadge = plan.badge_label
              if (!displayBadge) {
                if (plan.name.toLowerCase().includes("starter") || monthlyPrice === 0 || monthlyPrice === "0.00") {
                  displayBadge = "Starter, Free"
                } else if (plan.name.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("business")) {
                  displayBadge = "Pro"
                }
              }

              return (
                <PlanCard
                  key={plan.id}
                  name={plan.name}
                  price={monthlyPrice}
                  limits={limitsText}
                  features={features}
                  buttonText={buttonText}
                  buttonVariant={isPopular || (!isCurrent && (plan.monthly_fee ?? 0) > (currentPlanDetails?.monthly_fee ?? 0)) ? "solid" : "outline"}
                  isCurrent={isCurrent}
                  isPopular={isPopular}
                  badgeText={displayBadge}
                  onClick={() => handlePlanSelection(plan.id)}
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
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No active subscription state → "No active subscription" UI
  if (subscriptionState === "no-subscription" || subscriptionState === "cancelled") {
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
            <h2 className="text-xl font-bold text-gray-900 mb-1">No active subscription</h2>
            <p className="text-sm text-gray-500 mb-6">
              Choose a plan to unlock your lab&apos;s full potential
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-2 mb-8">
              {[
                "Unlimited scan sessions",
                "Team member access",
                "Advanced analytics",
                "Priority support",
                "Custom integrations",
                "Export & reporting tools",
              ].map((feature) => (
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
  const planName = currentPlanDetails?.name || billingProfile?.plan?.name || "Business plan"
  const planPricing = currentPlanDetails?.pricing || billingProfile?.plan?.pricing
  const featureLimits = currentPlanDetails?.feature_limits || billingProfile?.plan?.feature_limits

  // Derive pricing text
  let priceText = "$99 / month"
  if (planPricing?.prices) {
    const defaultPrice = planPricing.prices.find((p: any) => p.is_default) || planPricing.prices[0]
    if (defaultPrice) {
      priceText = `$${Number(defaultPrice.price).toLocaleString()} / ${defaultPrice.frequency || "month"}`
    }
  } else if (currentPlanDetails?.monthly_fee !== undefined || billingProfile?.plan?.monthly_fee !== undefined) {
    const fee = currentPlanDetails?.monthly_fee ?? billingProfile?.plan?.monthly_fee
    priceText = `$${Number(fee).toLocaleString()} / month`
  }

  const slipCapacity = featureLimits?.slip_capacity || 2000
  const maxAdminSeats = featureLimits?.max_admin_seats || 2
  const maxUserSeats = featureLimits?.max_user_seats

  // Usage calculation
  const usageCount = billingProfile?.usage_count || 0
  const usagePercent = slipCapacity > 0 ? Math.min((usageCount / slipCapacity) * 100, 100) : 0

  // Billing period
  const nextBillingDate = billingProfile?.current_period_end
    ? new Date(billingProfile.current_period_end).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
    : "08/25/25"

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-3">
        <span>Billing</span>
        <span className="mx-1">-</span>
        <span className="text-gray-700 font-medium">Subscription</span>
      </div>

      {/* Success Message Alert */}
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
              {priceText}, {slipCapacity.toLocaleString()} cases / month
            </p>
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
            <p className="text-xs text-gray-500">{usagePercent.toFixed(1)}% used</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${usagePercent}%`,
                backgroundColor: usagePercent >= 90 ? "#EF4444" : usagePercent >= 75 ? "#FF9900" : "#3B82F6",
              }}
            />
          </div>
          <button className="w-full bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">
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
            <p className="text-xs text-gray-500">Charged {defaultPrice?.frequency || "monthly"}</p>
          </div>
          <button className="w-full bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">
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
                <button className="inline-flex items-center px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-orange-50" style={{ borderColor: "#FFD080", color: "#9A671B" }}>
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
            <button className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">
              <CreditCard className="h-3.5 w-3.5" />
              Update Billing Info
            </button>
            <button 
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
              Cancel Subscription
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Primary Card */}
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-800">•••• •••• •••• 4242</span>
                </div>
                <span className="text-amber-400 text-sm">★</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">Expires 12/27</p>
              <button className="inline-flex items-center gap-1 text-[11px] bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors">
                <ExternalLink className="h-3 w-3" />
                Update via Stripe
              </button>
            </div>

            {/* Secondary Card 1 */}
            <div className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-800">•••• •••• •••• 5489</span>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-200 transition-colors">Use as Default</span>
              </div>
              <p className="text-[11px] text-gray-500">Expires 08/30</p>
            </div>

            {/* Secondary Card 2 */}
            <div className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-800">•••• •••• •••• 4751</span>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-200 transition-colors">Use as Default</span>
              </div>
              <p className="text-[11px] text-gray-500">Expires 03/28</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
          <button className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors">
            <Download className="h-3.5 w-3.5" />
            Download all Invoice
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-xs font-medium text-gray-900">INV-9042-RXN</p>
              <p className="text-[11px] text-gray-500">Jul 10, 2025 • $99.00</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors">
                <ExternalLink className="h-3 w-3" />
                View
              </button>
              <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors">
                <Download className="h-3 w-3" />
                Download
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-xs font-medium text-gray-900">INV-8765-RXN</p>
              <p className="text-[11px] text-gray-500">Jun 10, 2025 • $99.00</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors">
                <ExternalLink className="h-3 w-3" />
                View
              </button>
              <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors">
                <Download className="h-3 w-3" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
