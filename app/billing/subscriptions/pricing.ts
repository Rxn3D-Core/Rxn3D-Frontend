export type BillingPrice = {
  price?: number | string | null
  frequency?: string | null
  is_default?: boolean | null
}

export function getDefaultBillingPrice(prices?: BillingPrice[] | null): BillingPrice | null {
  if (!prices?.length) return null
  return prices.find((price) => price.is_default) || prices[0] || null
}

export function getBillingFrequencyLabel(prices?: BillingPrice[] | null, fallback = "monthly"): string {
  return getDefaultBillingPrice(prices)?.frequency || fallback
}
