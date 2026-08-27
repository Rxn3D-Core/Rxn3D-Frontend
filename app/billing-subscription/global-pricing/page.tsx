import { redirect } from "next/navigation"

/** Retired mock page — plans live on billing configuration. */
export default function GlobalPricingPage() {
  redirect("/billing-subscription/billing-configuration")
}
