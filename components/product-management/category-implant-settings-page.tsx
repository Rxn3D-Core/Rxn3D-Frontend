"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { resolveLibraryCustomerId } from "@/lib/customer-scope"
import {
  IMPLANT_FIELD_KEYS,
  IMPLANT_FIELD_LABELS,
  type CategoryImplantSettingRow,
  type ImplantFieldRequirement,
  type ImplantFieldSettings,
  fetchCategoryImplantSettings,
  saveCategoryImplantSettings,
} from "@/lib/api/category-implant-settings"

const REQUIREMENT_OPTIONS: { value: ImplantFieldRequirement; label: string }[] = [
  { value: "mandatory", label: "Mandatory" },
  { value: "hidden", label: "Don't ask" },
]

export function CategoryImplantSettingsPage({
  requireCustomerId = false,
}: {
  requireCustomerId?: boolean
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<CategoryImplantSettingRow[]>([])
  const [draft, setDraft] = useState<Record<number, ImplantFieldSettings>>({})
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCustomerId(resolveLibraryCustomerId(user))
    setReady(true)
  }, [user])

  useEffect(() => {
    if (!ready) return
    if (requireCustomerId && !customerId) {
      setLoading(true)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchCategoryImplantSettings({ customerId })
      .then((data) => {
        if (cancelled) return
        setRows(data)
        const next: Record<number, ImplantFieldSettings> = {}
        data.forEach((row) => {
          next[row.category_id] = { ...row.fields }
        })
        setDraft(next)
        setActiveCategoryId(data[0]?.category_id ?? null)
      })
      .catch((error: Error) => {
        if (!cancelled) {
          toast({ title: "Error", description: error.message, variant: "destructive" })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ready, customerId, requireCustomerId, toast])

  const activeFields = activeCategoryId != null ? draft[activeCategoryId] : null

  const handleFieldChange = (key: keyof ImplantFieldSettings, value: ImplantFieldRequirement) => {
    if (activeCategoryId == null) return
    setDraft((prev) => ({
      ...prev,
      [activeCategoryId]: {
        ...prev[activeCategoryId],
        [key]: value,
      },
    }))
  }

  const handleSave = async () => {
    if (requireCustomerId && !customerId) {
      toast({
        title: "Error",
        description: "Lab customer is required to save implant settings.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const payload = rows.map((row) => ({
        category_id: row.category_id,
        fields: draft[row.category_id] ?? row.fields,
      }))
      const saved = await saveCategoryImplantSettings(payload, customerId)
      setRows(saved)
      toast({ title: "Saved", description: "Implant field settings updated for each category." })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const tabs = useMemo(
    () => rows.map((row) => ({ id: row.category_id, name: row.category_name })),
    [rows]
  )

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Implant settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Choose which implant fields to ask for on the slip, per product category. Each field is
          either mandatory or not asked. Abutment addons are not configured here — they stay on each
          abutment.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading categories…
        </div>
      ) : tabs.length === 0 ? (
        <p className="text-sm text-gray-500">No product categories found.</p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryId(tab.id)}
                className={`px-3 py-1.5 text-sm whitespace-nowrap border-b-2 ${
                  activeCategoryId === tab.id
                    ? "border-[#1162a8] text-[#1162a8] font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {activeFields && (
            <div className="rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
              {IMPLANT_FIELD_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-gray-900 shrink-0">
                    {IMPLANT_FIELD_LABELS[key]}
                  </p>
                  <RadioGroup
                    value={activeFields[key]}
                    onValueChange={(value) =>
                      handleFieldChange(key, value as ImplantFieldRequirement)
                    }
                    className="flex items-center gap-4"
                  >
                    {REQUIREMENT_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center gap-1.5">
                        <RadioGroupItem value={option.value} id={`${key}-${option.value}`} />
                        <Label
                          htmlFor={`${key}-${option.value}`}
                          className="text-sm font-normal cursor-pointer whitespace-nowrap"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={handleSave}
              disabled={saving || (requireCustomerId && !customerId)}
              className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white"
            >
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
