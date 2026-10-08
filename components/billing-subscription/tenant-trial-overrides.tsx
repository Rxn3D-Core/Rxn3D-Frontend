"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  deleteFeatureOverride,
  getCustomerTrial,
  grantCustomerTrial,
  listFeatureCatalog,
  listFeatureOverrides,
  resetCustomerTrial,
  upsertFeatureOverride,
  type FeatureCatalogRow,
  type FeatureOverrideRow,
  type TenantTrialPayload,
} from "@/lib/api/billing-config-entitlements"

function catalogLabel(feature: FeatureCatalogRow) {
  return feature.feature_group ? `${feature.name} (${feature.feature_group})` : feature.name
}

export function TenantTrialOverrides({ customerId }: { customerId: number }) {
  const { toast } = useToast()
  const [trial, setTrial] = useState<TenantTrialPayload>(null)
  const [overrides, setOverrides] = useState<FeatureOverrideRow[]>([])
  const [catalog, setCatalog] = useState<FeatureCatalogRow[]>([])
  const [featureKey, setFeatureKey] = useState("")
  const [value, setValue] = useState("")
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)

  const selectedFeature = useMemo(
    () => catalog.find((feature) => feature.key === featureKey) ?? null,
    [catalog, featureKey],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [trialRow, overrideRows, catalogRows] = await Promise.all([
        getCustomerTrial(customerId),
        listFeatureOverrides(customerId),
        listFeatureCatalog(),
      ])
      setTrial(trialRow)
      setOverrides(overrideRows)
      setCatalog(catalogRows)
      setFeatureKey((current) => current || catalogRows[0]?.key || "")
    } catch (error: any) {
      toast({
        title: "Could not load trial or overrides",
        description: error?.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [customerId, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedFeature) return
    const existing = overrides.find((row) => row.feature_key === selectedFeature.key)
    if (existing) {
      setValue(existing.value ?? "")
      setIsUnlimited(Boolean(existing.is_unlimited))
      return
    }
    setIsUnlimited(false)
    if (selectedFeature.value_type === "boolean") {
      setValue(selectedFeature.default_value === "false" ? "false" : "true")
      return
    }
    if (selectedFeature.value_type === "enum") {
      setValue(selectedFeature.enum_options?.[0] ?? selectedFeature.default_value ?? "")
      return
    }
    setValue(selectedFeature.default_value ?? "")
  }, [selectedFeature, overrides])

  async function run(action: () => Promise<unknown>, success: string) {
    setMutating(true)
    try {
      await action()
      toast({ title: success })
      await load()
    } catch (error: any) {
      toast({ title: "Action failed", description: error?.message, variant: "destructive" })
    } finally {
      setMutating(false)
    }
  }

  function overrideLabel(row: FeatureOverrideRow) {
    const feature = catalog.find((item) => item.key === row.feature_key)
    const name = feature?.name || row.feature_key
    const display = row.is_unlimited ? "unlimited" : row.value ?? "—"
    return `${name}: ${display}`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Growth trial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <>
              <p className="text-sm text-slate-600">
                {trial?.status
                  ? `Status: ${trial.status}${trial.days_remaining != null ? ` · ${trial.days_remaining} days remaining` : ""}`
                  : "No trial on this lab."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={mutating} onClick={() => void run(() => grantCustomerTrial(customerId), "Trial granted")}>
                  Grant trial
                </Button>
                <Button
                  variant="outline"
                  disabled={mutating}
                  onClick={() => void run(() => resetCustomerTrial(customerId), "Trial reset")}
                >
                  Reset trial
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Feature overrides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto_auto]">
            <Select value={featureKey} onValueChange={setFeatureKey} disabled={loading || catalog.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select a feature" />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((feature) => (
                  <SelectItem key={feature.key} value={feature.key}>
                    {catalogLabel(feature)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFeature?.value_type === "boolean" ? (
              <Select value={value || "true"} onValueChange={setValue} disabled={isUnlimited}>
                <SelectTrigger>
                  <SelectValue placeholder="Value" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Included</SelectItem>
                  <SelectItem value="false">Not included</SelectItem>
                </SelectContent>
              </Select>
            ) : selectedFeature?.value_type === "enum" ? (
              <Select value={value} onValueChange={setValue} disabled={isUnlimited}>
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedFeature.enum_options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={selectedFeature?.value_type === "integer" ? "Limit" : "Value"}
                type={selectedFeature?.value_type === "integer" || selectedFeature?.value_type === "decimal" ? "number" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isUnlimited}
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={isUnlimited}
                onCheckedChange={setIsUnlimited}
                disabled={!selectedFeature?.supports_unlimited}
              />
              Unlimited
            </label>
            <Button
              disabled={mutating || !featureKey}
              onClick={() =>
                void run(
                  () =>
                    upsertFeatureOverride(customerId, {
                      feature_key: featureKey,
                      value: isUnlimited ? null : value || null,
                      is_unlimited: isUnlimited,
                    }),
                  "Override saved",
                )
              }
            >
              Save override
            </Button>
          </div>
          {selectedFeature?.description ? (
            <p className="text-sm text-slate-500">{selectedFeature.description}</p>
          ) : null}
          <div className="space-y-2">
            {overrides.map((row) => (
              <div key={row.feature_key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{overrideLabel(row)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={mutating}
                  onClick={() => void run(() => deleteFeatureOverride(customerId, row.feature_key), "Override removed")}
                >
                  Remove
                </Button>
              </div>
            ))}
            {!loading && overrides.length === 0 ? (
              <p className="text-sm text-slate-500">No tenant overrides.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
