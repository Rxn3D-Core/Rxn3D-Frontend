"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  getPlanFeatures,
  listFeatureCatalog,
  updatePlanFeatures,
  type FeatureCatalogRow,
  type PlanFeatureRow,
} from "@/lib/api/billing-config-entitlements"
import { listBillingConfigPlans } from "@/lib/api/billing-config-plans"

export function PlanFeatureMatrixEditor() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Array<{ id: number; name: string }>>([])
  const [catalog, setCatalog] = useState<FeatureCatalogRow[]>([])
  const [planId, setPlanId] = useState<number | null>(null)
  const [rows, setRows] = useState<PlanFeatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [planList, catalogRows] = await Promise.all([listBillingConfigPlans(), listFeatureCatalog()])
      setPlans(planList.map((plan) => ({ id: plan.id, name: plan.name })))
      setCatalog(catalogRows)
      setPlanId((current) => current ?? planList[0]?.id ?? null)
    } catch (error: any) {
      toast({ title: "Could not load feature matrix", description: error?.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!planId) return
    void getPlanFeatures(planId)
      .then(setRows)
      .catch((error) =>
        toast({ title: "Could not load plan features", description: error?.message, variant: "destructive" }),
      )
  }, [planId, toast])

  function valueFor(key: string): PlanFeatureRow {
    return rows.find((row) => row.feature_key === key) ?? { feature_key: key, value: "", included_in_trial: false }
  }

  function patch(key: string, next: Partial<PlanFeatureRow>) {
    setRows((current) => {
      const existing = current.find((row) => row.feature_key === key)
      if (!existing) return [...current, { feature_key: key, ...next }]
      return current.map((row) => (row.feature_key === key ? { ...row, ...next } : row))
    })
  }

  async function save() {
    if (!planId) return
    setSaving(true)
    try {
      const payload = rows.map((row) => ({
        ...row,
        included_in_trial: Boolean(row.included_in_trial),
      }))
      await updatePlanFeatures(planId, payload)
      toast({ title: "Plan features saved" })
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plan feature matrix</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={planId ? String(planId) : ""} onValueChange={(value) => setPlanId(Number(value))}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={String(plan.id)}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void save()} disabled={saving || !planId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save matrix
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <div className="space-y-2">
            {catalog.map((feature) => {
              const row = valueFor(feature.key)
              return (
                <div key={feature.key} className="grid items-center gap-2 rounded-lg border px-3 py-2 md:grid-cols-[2fr_1fr_auto]">
                  <div>
                    <p className="text-sm font-medium">{feature.name}</p>
                    <p className="text-xs text-slate-500">{feature.key}</p>
                  </div>
                  <Input
                    value={String(row.value ?? "")}
                    onChange={(e) => patch(feature.key, { value: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={Boolean(row.included_in_trial)}
                      onCheckedChange={(checked) => patch(feature.key, { included_in_trial: Boolean(checked) })}
                    />
                    Trial
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
