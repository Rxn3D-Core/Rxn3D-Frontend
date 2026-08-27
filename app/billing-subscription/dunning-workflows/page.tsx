"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listSuperadminInvoices, type SuperadminInvoice } from "@/lib/api/superadmin-invoices"

type DunningStep = {
  label: string
  day: number
  desc: string
  action: string
  color: string
}

const DEFAULT_DUNNING_STEPS: DunningStep[] = [
  { label: "D0",  day: 0,  desc: "Payment Fails",           action: "Automatic retry",       color: "bg-red-500" },
  { label: "D1",  day: 1,  desc: "Retry #1 Automatic",      action: "Auto retry",            color: "bg-blue-700" },
  { label: "D3",  day: 3,  desc: "Retry #2 + Email",        action: "Retry + email notice",  color: "bg-blue-700" },
  { label: "D7",  day: 7,  desc: "Retry #3 + Urgent Email", action: "Retry + urgent email",  color: "bg-yellow-500" },
  { label: "D14", day: 14, desc: "Final + Warning",          action: "Final retry + warning", color: "bg-red-700" },
  { label: "D21", day: 21, desc: "Account Suspended",        action: "Suspend account",       color: "bg-gray-800" },
]

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function inferDunningStep(inv: SuperadminInvoice): { step: string; nextAction: string; status: "Active" | "Escalated" } {
  const days = daysSince(inv.invoice_created_at)
  if (days >= 21) return { step: "D21 – Suspended",   nextAction: "—",                     status: "Escalated" }
  if (days >= 14) return { step: "D14 – Warning",     nextAction: `Day ${days + 7}`,        status: "Escalated" }
  if (days >= 7)  return { step: "D7 – Retry #3",     nextAction: `Day ${days + 7}`,        status: "Active" }
  if (days >= 3)  return { step: "D3 – Email",         nextAction: `Day ${days + 4}`,        status: "Active" }
  if (days >= 1)  return { step: "D1 – Auto Retry",   nextAction: `Day ${days + 2}`,        status: "Active" }
  return              { step: "D0 – Failed",          nextAction: "Tomorrow",               status: "Active" }
}

export default function DunningWorkflowsPage() {
  const [steps, setSteps] = useState<DunningStep[]>(DEFAULT_DUNNING_STEPS)
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<DunningStep[]>([])
  const [overdueInvoices, setOverdueInvoices] = useState<SuperadminInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    listSuperadminInvoices({ status: "uncollectible", per_page: 50 })
      .then(({ data }) => setOverdueInvoices(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load workflows"))
      .finally(() => setIsLoading(false))
  }, [])

  function openEdit() {
    setDraft(steps.map((s) => ({ ...s })))
    setEditOpen(true)
  }

  function updateDraft(index: number, field: keyof DunningStep, value: string | number) {
    setDraft((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  function saveSchedule() {
    setSteps(draft.map((s) => ({ ...s })))
    setEditOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <BreadcrumbBar
        items={[
          { label: "Billing & Subscription Control", href: "/billing-subscription/billing-configuration" },
          { label: "Dunning Workflows" },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dunning Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">Automated payment recovery sequences for failed invoices.</p>
        </div>
        <Button onClick={openEdit}>Edit Schedule</Button>
      </div>

      {/* Stats */}
      {(() => {
        const workflows = overdueInvoices.map((inv) => ({ inv, ...inferDunningStep(inv) }))
        const activeCount = workflows.filter((w) => w.status === "Active").length
        const escalatedCount = workflows.filter((w) => w.status === "Escalated").length
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-l-4 border-l-blue-400">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Active Sequences</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-blue-600">{isLoading ? "…" : activeCount}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-400">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Recovered This Month</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-green-600">—</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-400">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Recovery Rate</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-orange-500">—</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-400">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Escalated to Suspension</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-red-500">{isLoading ? "…" : escalatedCount}</p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Pipeline */}
      <Card>
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold">Dunning Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-start">
                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                  <div className={`h-10 w-10 rounded-full ${step.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {step.label}
                  </div>
                  <p className="text-xs font-medium text-center leading-tight max-w-[90px]">{step.desc}</p>
                  <p className="text-[10px] text-muted-foreground text-center leading-tight max-w-[90px]">{step.action}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="mt-4 h-px w-8 bg-border shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active workflows table */}
      <Card>
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-base font-semibold">Active Workflows</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="flex items-center gap-2 m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Lab Name</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Current Step</TableHead>
                <TableHead>Next Action</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading workflows…</TableCell>
                </TableRow>
              ) : overdueInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No active dunning workflows.</TableCell>
                </TableRow>
              ) : (
                overdueInvoices.map((inv) => {
                  const { step, nextAction, status } = inferDunningStep(inv)
                  const invoiceLabel = inv.stripe_invoice_id ?? `INV-${inv.id}`
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-6 font-medium">{inv.customer?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Link href={`/billing-subscription/invoicing/${inv.id}`} className="text-blue-600 hover:underline">
                          {invoiceLabel}
                        </Link>
                      </TableCell>
                      <TableCell>{step}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{nextAction}</TableCell>
                      <TableCell>
                        {status === "Active" ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">Escalated</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dunning Schedule</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {draft.map((step, i) => (
              <div key={step.label} className="grid grid-cols-3 items-center gap-3 rounded-md border p-3">
                <div className="col-span-3 flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full ${step.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {step.label}
                  </div>
                  <span className="text-sm font-medium">{step.desc}</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Day offset</Label>
                  <Input
                    type="number"
                    min={0}
                    value={step.day}
                    onChange={(e) => updateDraft(i, "day", Number(e.target.value))}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Action description</Label>
                  <Input
                    value={step.action}
                    onChange={(e) => updateDraft(i, "action", e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveSchedule}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
