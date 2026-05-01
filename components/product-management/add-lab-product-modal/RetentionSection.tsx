"use client"

import React, { useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, Info, AlertCircle, Plus, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ProductCreateForm } from "@/lib/schemas"
import type { RetentionOption } from "@/services/retention-options-api"
import type { RetentionOptionsCatalogState } from "@/hooks/use-retention-options-catalog"

/** Open create retention option sibling to the product modal (avoids nested dialog issues). */
export type RetentionOptionCreateRequestContext = {
  catalogCustomerId: number | null
}

type RetentionOptionFormRow = NonNullable<ProductCreateForm["retention_options"]>[number]

export function RetentionSection({
  control: _control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  retentions,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection: _handleToggleSelection,
  userRole = "",
  catalogCustomerId = null,
  retentionOptionsCatalog,
  onRequestRetentionOptionCreate,
}: {
  control: any
  watch: any
  setValue: any
  sections: any
  toggleSection: any
  getValidationError: any
  retentions: any
  sectionHasErrors: any
  expandedSections: any
  toggleExpanded: any
  handleToggleSelection: any
  userRole?: string
  catalogCustomerId?: number | null
  /** Loaded when the modal opens (parent prefetch) — avoids fetching on tab visit. */
  retentionOptionsCatalog: RetentionOptionsCatalogState
  /**
   * When set, "+ Add Retention option" opens `CreateRetentionOptionModal` in the parent (recommended).
   * Otherwise falls back to navigating to the retention-option library page.
   */
  onRequestRetentionOptionCreate?: (ctx: RetentionOptionCreateRequestContext) => void
}) {
  const watchedRetentions = watch("retentions") || []
  const watchedRetentionOptions = (watch("retention_options") || []) as RetentionOptionFormRow[]
  const isLabAdmin = userRole === "lab_admin"
  const retentionEnabled = sections.retention !== false

  const retentionCatalog = retentionOptionsCatalog.items
  const optionsLoading = retentionOptionsCatalog.isLoading
  const optionsError = retentionOptionsCatalog.error

  const retentionOptionManageHref =
    typeof catalogCustomerId === "number" && catalogCustomerId > 0
      ? "/lab-product-library/retention-option"
      : "/global-product-library/retention-option"

  React.useEffect(() => {
    setValue("apply_retention_mechanism", retentionEnabled ? "Yes" : "No", { shouldDirty: false })
  }, [retentionEnabled, setValue])

  const isRetentionSelected = (retentionId: number) =>
    watchedRetentions.some((ret: Record<string, unknown>) => Number(ret.retention_id) === retentionId)

  const getSelectedRetention = (retentionId: number) =>
    watchedRetentions.find((ret: Record<string, unknown>) => Number(ret.retention_id) === retentionId)

  const handlePriceChange = (retentionId: number, value: string) => {
    const priceValue = value === "" ? 0 : parseFloat(value) || 0
    setValue(
      "retentions",
      watchedRetentions.map((ret: Record<string, unknown>) =>
        Number(ret.retention_id) === retentionId ? { ...ret, price: priceValue } : ret,
      ),
      { shouldDirty: true },
    )
  }

  const retentionOptionLinkedSet = useMemo(() => {
    const ids = watchedRetentionOptions
      .map((r) => Number(r.retention_option_id))
      .filter((n) => Number.isFinite(n))
    return new Set(ids)
  }, [watchedRetentionOptions])

  const toggleRetentionOption = useCallback(
    (optionId: number, checked: boolean) => {
      const prev = ((watch("retention_options") || []) as RetentionOptionFormRow[]) || []
      if (checked) {
        if (prev.some((p) => p.retention_option_id === optionId)) return
        setValue(
          "retention_options",
          [...prev, { retention_option_id: optionId, sequence: prev.length + 1, status: "Active" as const }],
          { shouldDirty: true },
        )
      } else {
        const next = prev
          .filter((p) => p.retention_option_id !== optionId)
          .map((p, idx) => ({ ...p, sequence: idx + 1 }))
        setValue("retention_options", next, { shouldDirty: true })
      }
    },
    [setValue, watch],
  )

  const retentionTagLabels = useCallback((opt: RetentionOption) => {
    const raw = opt.retentions
    if (!Array.isArray(raw) || raw.length === 0) return []
    return raw.map((r: Record<string, unknown>) => {
      const nested = r.retention
      const nestedName =
        nested && typeof nested === "object" && "name" in nested && typeof (nested as { name?: unknown }).name === "string"
          ? (nested as { name: string }).name
          : null
      return typeof r.name === "string"
        ? r.name
        : nestedName !== null
          ? nestedName
          : `Retention ${String(r.id ?? r.retention_id ?? "")}`
    })
  }, [])

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Switch
            checked={sections.retention !== false}
            onCheckedChange={(checked) => {
              toggleSection("retention")
              setValue("apply_retention_mechanism", checked ? "Yes" : "No", { shouldDirty: true })
            }}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <span className="font-medium">Retention</span>
          {sectionHasErrors(["retentions"]) && <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-sm text-gray-400 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#1162a8] focus-visible:ring-offset-1"
                  aria-label="About retention for this product"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left">
                <p className="text-sm font-medium">Does retention mechanism apply to this product?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When off, linked retentions stay saved on the product; slips use{" "}
                  <span className="font-medium">has retention = No</span>.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedRetentions.length === 0 ? "opacity-80" : ""}`}
          >
            <strong>{watchedRetentions.length} types</strong>
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-violet-50 text-violet-800 ${watchedRetentionOptions.length === 0 ? "opacity-80" : ""}`}
          >
            <strong>{watchedRetentionOptions.length} options</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sections.retention === false ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="rounded-md bg-gradient-to-r from-violet-600 to-[#1162a8] text-white border-0 opacity-50"
            >
              <Plus className="h-4 w-4 mr-1.5 shrink-0" />
              Add Retention option
            </Button>
          ) : onRequestRetentionOptionCreate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md bg-gradient-to-r from-violet-600 to-[#1162a8] text-white border-0 hover:opacity-90"
              onClick={() =>
                onRequestRetentionOptionCreate({
                  catalogCustomerId:
                    typeof catalogCustomerId === "number" && catalogCustomerId > 0 ? catalogCustomerId : null,
                })
              }
            >
              <Plus className="h-4 w-4 mr-1.5 shrink-0" />
              Add Retention option
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md bg-gradient-to-r from-violet-600 to-[#1162a8] text-white border-0 hover:opacity-90"
              asChild
            >
              <Link href={retentionOptionManageHref}>
                <Plus className="h-4 w-4 mr-1.5 shrink-0 inline" />
                Add Retention option
              </Link>
            </Button>
          )}
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.retention ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("retention")}
          />
        </div>
      </div>
      {expandedSections.retention && (
        <div className="px-6 pb-6">
          {/* Keep lists visible when switched off — match spec: faded + non-interactive, do not hide. */}
          <div
            className={cn(
              "rounded-lg border border-dashed border-muted-foreground/25 p-4 transition-colors",
              sections.retention === false && "opacity-50 pointer-events-none select-none saturate-[0.65]",
            )}
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left — retention types (product links) */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Select how this restoration will be retained
                  </Label>
                  <div className="flex flex-col gap-3">
                    {retentions.map((retention: { id: number; name: string }) => {
                      const isSelected = isRetentionSelected(retention.id)
                      const selectedRetention = getSelectedRetention(retention.id)

                      return (
                        <div key={retention.id} className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              value={retention.id}
                              checked={isSelected}
                              onChange={(e) => {
                                const isChecked = e.target.checked
                                if (isChecked) {
                                  const newRetention: Record<string, unknown> = {
                                    retention_id: retention.id,
                                    sequence: watchedRetentions.length + 1,
                                    status: "Active",
                                  }
                                  if (isLabAdmin) newRetention.price = 0
                                  setValue(
                                    "retentions",
                                    [...watchedRetentions, newRetention],
                                    { shouldDirty: true },
                                  )
                                } else {
                                  const updatedRetentions = watchedRetentions
                                    .filter((ret: Record<string, unknown>) => Number(ret.retention_id) !== retention.id)
                                    .map((ret: Record<string, unknown>, index: number) => ({
                                      ...ret,
                                      sequence: index + 1,
                                    }))
                                  setValue("retentions", updatedRetentions, { shouldDirty: true })
                                }
                              }}
                              className="accent-[#1162a8] w-5 h-5"
                            />
                            <span>{retention.name}</span>
                          </label>
                          {isSelected && isLabAdmin && selectedRetention && (
                            <div className="ml-7 flex items-center gap-2">
                              <Label
                                htmlFor={`retention-price-${retention.id}`}
                                className="text-sm text-gray-600 w-20"
                              >
                                Additional price:
                              </Label>
                              <div className="relative w-36">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                  $
                                </span>
                                <Input
                                  id={`retention-price-${retention.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={(() => {
                                    const raw = (selectedRetention as { price?: unknown }).price
                                    if (raw === undefined || raw === null || raw === "") return ""
                                    const n =
                                      typeof raw === "number"
                                        ? raw
                                        : parseFloat(String(raw).replace(/,/g, ""))
                                    return Number.isFinite(n) ? n : ""
                                  })()}
                                  onChange={(e) => handlePriceChange(retention.id, e.target.value)}
                                  placeholder="0.00"
                                  className="pl-7"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right — retention options (catalog checkboxes → retention_options payload) */}
                <div className="rounded-lg border border-gray-100 bg-muted/20 p-4 min-h-[200px]">
                  <Label className="text-sm font-medium mb-2 block text-gray-900">
                    Retention options linked
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose which implant / prep / pontic behaviors apply. Tags show linked retention types from the catalog.
                  </p>
                  {optionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                      Loading options…
                    </div>
                  ) : optionsError ? (
                    <p className="text-sm text-destructive py-4">{optionsError}</p>
                  ) : retentionCatalog.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No active retention options in this catalog.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {retentionCatalog.map((opt) => {
                        const linked = retentionOptionLinkedSet.has(Number(opt.id))
                        const tags = retentionTagLabels(opt)
                        return (
                          <li
                            key={opt.id}
                            className={cn(
                              "rounded-lg border px-3 py-2 bg-white transition-colors",
                              linked ? "border-[#1162a8]/40" : "border-gray-200",
                            )}
                          >
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={linked}
                                onChange={(e) => toggleRetentionOption(opt.id, e.target.checked)}
                                className="accent-[#1162a8] w-5 h-5 mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-gray-900">{opt.name}</span>
                                {tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {tags.map((t, i) => (
                                      <Badge key={`${opt.id}-${i}`} variant="secondary" className="text-xs font-normal">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-1">No retention types linked on catalog row.</p>
                                )}
                              </div>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
            </div>
          </div>
          <ValidationError message={getValidationError("retentions")} />
        </div>
      )}
    </div>
  )
}
