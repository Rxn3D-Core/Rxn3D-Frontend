import { redirect } from "next/navigation"

/** Hub retired — land on plan tiers / billing configuration. */
export default function BillingSubscriptionIndexPage() {
  redirect("/billing-subscription/billing-configuration")
}
