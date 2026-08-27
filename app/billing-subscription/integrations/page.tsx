"use client"

import { useState } from "react"
import { ArrowLeft, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type View = "integrations" | "webhooks"

const MOCK_WEBHOOKS = [
  {
    id: 1,
    url: "https://hooks.example.com/stripe",
    events: ["invoice.paid", "invoice.payment_failed"],
    status: "Active",
    lastTriggered: "Mar 1, 2026",
  },
  {
    id: 2,
    url: "https://hooks.example.com/billing",
    events: ["customer.subscription.updated"],
    status: "Active",
    lastTriggered: "Feb 28, 2026",
  },
]

export default function IntegrationsPage() {
  const [view, setView] = useState<View>("integrations")

  return (
    <div className="flex flex-col gap-6 p-6">
      <BreadcrumbBar
        items={[
          { label: "Billing & Subscription Control", href: "/billing-subscription/billing-configuration" },
          { label: "Integrations & Connections" },
        ]}
      />

      {view === "integrations" ? (
        <IntegrationsView onViewWebhooks={() => setView("webhooks")} />
      ) : (
        <WebhooksView onBack={() => setView("integrations")} />
      )}
    </div>
  )
}

function IntegrationsView({ onViewWebhooks }: { onViewWebhooks: () => void }) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations & Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage connected platforms and third-party integrations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Stripe — connected */}
        <Card className="border border-green-200">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Stripe</span>
              <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Payment processing & subscription billing.</p>
            <div className="flex gap-2 mt-auto">
              <Button size="sm" variant="outline" className="flex-1" onClick={onViewWebhooks}>
                Webhooks
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QuickBooks — coming soon */}
        <Card className="border opacity-70">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">QuickBooks</span>
              <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Sync invoices and payments to QuickBooks Online.</p>
            <Button size="sm" variant="outline" disabled className="mt-auto">
              Connect
            </Button>
          </CardContent>
        </Card>

        {/* Xero — coming soon */}
        <Card className="border opacity-70">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Xero</span>
              <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Export transactions to Xero accounting.</p>
            <Button size="sm" variant="outline" disabled className="mt-auto">
              Connect
            </Button>
          </CardContent>
        </Card>

        {/* NetSuite — coming soon */}
        <Card className="border opacity-70">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">NetSuite</span>
              <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Enterprise ERP sync via NetSuite connector.</p>
            <Button size="sm" variant="outline" disabled className="mt-auto">
              Connect
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function WebhooksView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks & API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage webhook endpoints and rotate API credentials.</p>
        </div>
      </div>

      {/* Connected integrations summary */}
      <Card>
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Connected Integrations</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">Stripe</span>
              <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Live</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook endpoints */}
      <Card>
        <CardHeader className="px-6 pt-5 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Webhook Endpoints</CardTitle>
          <Button size="sm" className="gap-1" disabled>
            <Plus className="h-4 w-4" /> Add Endpoint
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_WEBHOOKS.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="pl-6 font-mono text-xs">{wh.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px] font-mono">{e}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 border-green-200">{wh.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{wh.lastTriggered}</TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:underline text-sm">Edit</button>
                      <span className="text-muted-foreground">·</span>
                      <button className="text-red-500 hover:underline text-sm flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold">API Keys</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">Stripe Secret Key</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">sk_live_••••••••••••••••••••••••••••••••</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1" disabled>
              <RotateCcw className="h-3 w-3" /> Rotate
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">Stripe Publishable Key</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">pk_live_••••••••••••••••••••••••••••••••</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1 gap-1" asChild>
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" /> Manage in Stripe
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
