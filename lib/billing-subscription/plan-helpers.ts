export type CatalogPlan = {
  id: number
  name: string
  description?: string
  badge_label?: string
  display_order?: number
  monthly_fee?: number | string
  slip_capacity?: number
  storage_included_gb?: number
  feature_limits?: {
    slip_capacity?: number
    included_storage_gb?: number
    max_admin_seats?: number
    max_user_seats?: number
  }
  pricing?: {
    currency?: string
    prices?: Array<{
      frequency: string
      price: number | string
      is_default?: boolean
    }>
  }
  overage_policy?: { standard_rate?: number }
}

export function getPlanMonthlyFee(plan?: CatalogPlan | null): number {
  if (!plan) return 0
  if (plan.pricing?.prices?.length) {
    const defaultPrice =
      plan.pricing.prices.find((p) => p.is_default) ||
      plan.pricing.prices.find((p) => p.frequency === "monthly") ||
      plan.pricing.prices[0]
    if (defaultPrice) return Number(defaultPrice.price) || 0
  }
  return Number(plan.monthly_fee) || 0
}

export function getSlipCapacity(plan?: CatalogPlan | null): number {
  if (!plan) return 0
  return plan.feature_limits?.slip_capacity ?? plan.slip_capacity ?? 0
}

export function getStorageGb(plan?: CatalogPlan | null): number | null {
  if (!plan) return null
  return plan.feature_limits?.included_storage_gb ?? plan.storage_included_gb ?? null
}

export function formatUserSeats(maxUserSeats?: number | null): string {
  if (maxUserSeats === -1 || maxUserSeats == null) return "unlimited"
  return String(maxUserSeats)
}

export function formatPlanPriceLabel(plan?: CatalogPlan | null): string {
  const fee = getPlanMonthlyFee(plan)
  if (fee <= 0) return "Free"
  if (plan?.name?.toLowerCase().includes("enterprise") && !plan.pricing?.prices?.length && !plan.monthly_fee) {
    return "Custom"
  }
  return `$${fee.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function buildPlanLimitsText(plan: CatalogPlan): string {
  const slipLimit = getSlipCapacity(plan)
  const adminSeats = plan.feature_limits?.max_admin_seats ?? 1
  const userSeats = formatUserSeats(plan.feature_limits?.max_user_seats)
  const slipLabel =
    slipLimit === 0 ? "Unlimited" : `${slipLimit.toLocaleString()}`
  return `${slipLabel} cases/month · ${adminSeats} admin seat${adminSeats !== 1 ? "s" : ""}, ${userSeats} user${userSeats === "1" ? "" : "s"}`
}

export function buildPlanFeatures(plan: CatalogPlan): string[] {
  if (plan.description?.trim()) {
    return plan.description
      .split(/[\n•|]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const features: string[] = []
  const slipLimit = getSlipCapacity(plan)
  if (slipLimit === 0) features.push("Unlimited cases per month")
  else if (slipLimit > 0) features.push(`${slipLimit.toLocaleString()} cases per month`)

  const storage = getStorageGb(plan)
  if (storage != null) features.push(`${storage} GB included storage`)

  const overage = plan.overage_policy?.standard_rate
  if (overage != null && Number(overage) > 0) {
    features.push(`Overage at $${Number(overage).toFixed(2)} per case`)
  }

  const adminSeats = plan.feature_limits?.max_admin_seats
  if (adminSeats != null) features.push(`${adminSeats} admin seat${adminSeats !== 1 ? "s" : ""}`)

  if (features.length === 0) {
    return ["Standard production access", "Core reporting", "Regular support"]
  }
  return features
}

export function collectCatalogHighlights(plans: CatalogPlan[]): string[] {
  const highlights = new Set<string>()
  for (const plan of plans) {
    for (const feature of buildPlanFeatures(plan)) {
      highlights.add(feature)
    }
  }
  return Array.from(highlights).slice(0, 6)
}

export function isFreePlan(plan?: CatalogPlan | null): boolean {
  return getPlanMonthlyFee(plan) <= 0
}

export function formatBillingDate(value?: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function resolveNextBillingPeriodEnd(
  profilePeriodEnd?: string | null,
  usagePeriodEnd?: string | null,
): string | null {
  return profilePeriodEnd || usagePeriodEnd || null
}

export function formatCurrency(amount?: number | string | null, currency = "USD"): string {
  const value = Number(amount)
  if (Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value)
}
