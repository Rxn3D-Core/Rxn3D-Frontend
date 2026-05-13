"use client"

import Link from "next/link"
import { CreditCard, Globe2, Settings2, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"

export default function BillingSubscriptionHubPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8 pb-12">
      <div className="space-y-2">
        <BreadcrumbBar items={[{ label: "Billing & Subscription" }]} />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Billing & Subscription Control</h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Configure membership plans, global pricing, Stripe-linked plans, and platform billing rules. Tenant (lab) subscription
          management will connect here when APIs are ready.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/billing-subscription/global-pricing" className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8] focus-visible:ring-offset-2">
          <Card className="h-full border-border/80 transition-shadow group-hover:shadow-md">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1162A8]/10 text-[#1162A8]">
                    <Globe2 className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="text-lg">Global pricing</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
              <CardDescription>Plan tiers, freemium inclusions, and promotional offers shown to labs.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Path: /billing-subscription/global-pricing</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/billing-subscription/billing-configuration" className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8] focus-visible:ring-offset-2">
          <Card className="h-full border-border/80 transition-shadow group-hover:shadow-md">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100">
                    <Settings2 className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="text-lg">Billing configuration</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
              <CardDescription>Technical plans table, global rules, credit books, storage tiers, and add-ons.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Path: /billing-subscription/billing-configuration</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base font-medium">Tenant billing (labs)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Per-tenant profile, usage, invoices, add-ons, and plan changes will live under this menu in a follow-up once subscription
          APIs are wired.
        </CardContent>
      </Card>
    </div>
  )
}
