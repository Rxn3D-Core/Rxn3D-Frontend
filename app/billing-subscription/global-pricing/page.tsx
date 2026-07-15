"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { PLAN_TIER_PRESETS, type PlanTierCardModel } from "@/lib/billing-subscription/plan-tier-presets"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

function Badge({ label, variant }: { label: string; variant: PlanTierCardModel["badgeVariant"] }) {
  const styles: Record<PlanTierCardModel["badgeVariant"], string> = {
    muted: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    primary: "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)]/15 text-[#1162A8]",
    premium: "bg-amber-500/20 text-amber-900 dark:text-amber-200",
  }
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", styles[variant])}>{label}</span>
  )
}

function PlanTierCard({ plan }: { plan: PlanTierCardModel }) {
  const isEnterprise = plan.id === "enterprise"
  return (
    <Card
      className={cn(
        "flex min-w-[260px] flex-1 flex-col border-border/90 sm:min-w-[280px]",
        plan.highlighted && "border-[#1162A8]/50 bg-[#1162A8]/[0.04] ring-1 ring-[#1162A8]/20",
        isEnterprise && "border-zinc-800 bg-zinc-900 text-zinc-50 dark:border-zinc-700",
      )}
    >
      <CardHeader className={cn("space-y-3 pb-4", isEnterprise && "border-b border-zinc-700/80")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={cn("text-lg font-semibold", isEnterprise && "text-white")}>{plan.name}</p>
            <p className={cn("mt-1 text-2xl font-bold tracking-tight", isEnterprise ? "text-white" : "text-foreground")}>
              {plan.monthlyLabel}
            </p>
          </div>
          <Badge label={plan.badge} variant={plan.badgeVariant} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2.5 text-sm">
        {plan.lines.map((line) => {
          const neg = line.toLowerCase().includes("not included")
          const pos =
            line.toLowerCase().includes("included") &&
            !line.toLowerCase().includes("not included") &&
            (line.toLowerCase().includes("driver") || line.toLowerCase().includes("unlimited") || line.toLowerCase().includes("custom"))
          return (
            <div key={line} className="flex gap-2">
              {neg ? (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500/90" aria-hidden />
              ) : pos ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              ) : (
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
              )}
              <span className={cn("leading-snug", isEnterprise ? "text-zinc-200" : "text-muted-foreground")}>{line}</span>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className={cn("flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between", isEnterprise && "border-zinc-700/80")}>
        <button
          type="button"
          className={cn(
            "text-sm font-medium text-[#1162A8] underline-offset-4 hover:underline",
            isEnterprise && "text-sky-300 hover:text-sky-200",
          )}
        >
          Edit plan
        </button>
        <span className={cn("text-xs text-muted-foreground", isEnterprise && "text-zinc-400")}>{plan.activeLabsLabel}</span>
      </CardFooter>
    </Card>
  )
}

export default function GlobalPricingPage() {
  const [pricingTab, setPricingTab] = useState("tiers")

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <BreadcrumbBar
            items={[
              { label: "Billing & Subscription", href: "/billing-subscription" },
              { label: "Global pricing" },
            ]}
          />
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Global pricing</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Plan cards use framework defaults until subscription APIs load live counts and editable fields.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" disabled>
            Drafts
          </Button>
          <Button size="sm" className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:bg-[#0d5290]" type="button" disabled>
            + Create new plan
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Last updated: — (API)</p>

      <Tabs value={pricingTab} onValueChange={setPricingTab} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1 md:inline-flex md:w-auto">
          <TabsTrigger value="tiers" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Plan tiers
          </TabsTrigger>
          <TabsTrigger value="freemium" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Freemium inclusions
          </TabsTrigger>
          <TabsTrigger value="promos" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Promotional offers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="mt-0 space-y-6 outline-none">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:flex-wrap md:snap-none md:overflow-visible">
            {PLAN_TIER_PRESETS.map((plan) => (
              <div key={plan.id} className="shrink-0 snap-start md:snap-none">
                <PlanTierCard plan={plan} />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <p className="text-sm font-medium">Average revenue / lab</p>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">— / mo (API)</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <p className="text-sm font-medium">Plan distribution</p>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">— (API)</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <p className="text-sm font-medium">Upgrade rate (quarter)</p>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">— (API)</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="freemium" className="mt-0 outline-none">
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Freemium inclusion rules (e.g. slip grant on signup) will load here from the subscription service.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promos" className="mt-0 outline-none">
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Promotional offers and campaigns will load here from the subscription service.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
