"use client"

import Link from "next/link"
import { useEffect, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Info, AlertCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Control, UseFormWatch, UseFormSetValue } from "react-hook-form"
import type { ProductCreateForm, Extraction } from "@/lib/schemas"
import type { RetentionOptionsCatalogState } from "@/hooks/use-retention-options-catalog"
import { RetentionSection, type RetentionOptionCreateRequestContext } from "./RetentionSection"
import { ExtractionsSection } from "./ExtractionsSection"
import { ProductToothChartPreview } from "@/components/product-management/product-tooth-chart-preview"
import {
  createInitialDefaultToothChart,
  defaultToothChartSignature,
  normalizeDefaultToothChartEntries,
  resolveCatalogDefaultExtractionId,
  type ProductDefaultToothChartEntry,
} from "@/lib/product-default-tooth-chart"
import {
  catalogRetentionOptionToItem,
  resolveActiveProductExtractions,
} from "@/lib/product-tooth-chart-preview-state"
import { resolveRetentionOptionChartType } from "@/components/case-design-center/utils/retentionOptionChartType"
import { cn } from "@/lib/utils"

export interface ToothChartConfigurationsSectionProps {
  control: Control<ProductCreateForm>
  watch: UseFormWatch<ProductCreateForm>
  setValue: UseFormSetValue<ProductCreateForm>
  sections: {
    retention?: boolean
    extractions?: boolean
  }
  toggleSection: (section: string) => void
  getValidationError: (fieldName: string) => string | undefined
  sectionHasErrors: (sectionFields: string[]) => boolean
  expandedSections: Record<string, boolean>
  toggleExpanded: (section: string) => void
  retentions: Array<{ id: number; name: string }>
  retentionOptionsCatalog: RetentionOptionsCatalogState
  allExtractions?: Extraction[]
  isExtractionsLoading?: boolean
  apiOppositeExtractionCount?: number
  editingProductKey?: string | number | null
  userRole?: string
  catalogCustomerId?: number | null
  onRequestRetentionOptionCreate?: (ctx: RetentionOptionCreateRequestContext) => void
  handleToggleSelection?: (field: string, id: number, checked: boolean) => void
}

export function ToothChartConfigurationsSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  retentions,
  retentionOptionsCatalog,
  allExtractions = [],
  isExtractionsLoading = false,
  apiOppositeExtractionCount = 0,
  editingProductKey = null,
  userRole = "",
  catalogCustomerId = null,
  onRequestRetentionOptionCreate,
  handleToggleSelection,
}: ToothChartConfigurationsSectionProps) {
  const watchedRetentions = watch("retentions") || []
  const watchedRetentionOptions = watch("retention_options") || []
  const watchedExtractions = watch("extractions") || []
  const defaultToothChartEnabled = watch("enable_default_tooth_chart") === "Yes"
  const defaultToothChart = (watch("default_tooth_chart") || []) as ProductDefaultToothChartEntry[]
  const allowSelectOnlyImplant = watch("allow_select_only_implant") === "Yes"

  const retentionEnabled = sections.retention !== false
  const extractionsEnabled = sections.extractions !== false

  const hasImplantRetentionOptionLinked = useMemo(() => {
    if (!retentionEnabled) return false
    const linkedIds = new Set(
      (watchedRetentionOptions as Array<{ retention_option_id: number; status?: string }>)
        .filter((row) => row.status !== "Inactive")
        .map((row) => Number(row.retention_option_id))
        .filter((id) => Number.isFinite(id)),
    )
    if (linkedIds.size === 0) return false
    return retentionOptionsCatalog.items.some((opt) => {
      if (!linkedIds.has(Number(opt.id))) return false
      return resolveRetentionOptionChartType(catalogRetentionOptionToItem(opt)) === "Implant"
    })
  }, [retentionEnabled, watchedRetentionOptions, retentionOptionsCatalog.items])

  // Clear the implant-only flag when Implant option is unlinked or chart is off.
  useEffect(() => {
    if (!defaultToothChartEnabled || !hasImplantRetentionOptionLinked) {
      if (allowSelectOnlyImplant) {
        setValue("allow_select_only_implant", "No", { shouldDirty: true })
      }
    }
  }, [
    defaultToothChartEnabled,
    hasImplantRetentionOptionLinked,
    allowSelectOnlyImplant,
    setValue,
  ])

  const resolvedExtractionsForInit = useMemo(
    () =>
      extractionsEnabled
        ? resolveActiveProductExtractions(
            watchedExtractions as Array<{ extraction_id: number; status?: string }>,
            allExtractions,
          )
        : [],
    [extractionsEnabled, watchedExtractions, allExtractions],
  )

  const catalogDefaultExtractionId = useMemo(
    () => resolveCatalogDefaultExtractionId(resolvedExtractionsForInit),
    [resolvedExtractionsForInit],
  )

  const handleDefaultToothChartToggle = (checked: boolean) => {
    setValue("enable_default_tooth_chart", checked ? "Yes" : "No", { shouldDirty: true })
    if (!checked) {
      setValue("allow_select_only_implant", "No", { shouldDirty: true })
    }
    if (checked && (!defaultToothChart || defaultToothChart.length === 0)) {
      if (catalogDefaultExtractionId != null) {
        setValue(
          "default_tooth_chart",
          createInitialDefaultToothChart(catalogDefaultExtractionId),
          { shouldDirty: true },
        )
      }
    }
  }

  const handleDefaultToothChartChange = (entries: ProductDefaultToothChartEntry[]) => {
    setValue("default_tooth_chart", entries, { shouldDirty: true })
  }

  const handleAllowSelectOnlyImplantChange = (checked: boolean) => {
    setValue("allow_select_only_implant", checked ? "Yes" : "No", { shouldDirty: true })
  }

  const defaultChartSig = useMemo(
    () => defaultToothChartSignature(defaultToothChart),
    [defaultToothChart],
  )

  // When Missing teeth (or other Def row) is set but chart was initialized before catalog resolved,
  // backfill all 32 teeth with the catalog default extraction id.
  useEffect(() => {
    if (!defaultToothChartEnabled || catalogDefaultExtractionId == null) return

    const normalized = normalizeDefaultToothChartEntries(
      defaultToothChart,
      catalogDefaultExtractionId,
    )
    const allUnset = normalized.every(
      (row) =>
        row.retention_option_id == null &&
        row.extraction_id == null &&
        row.chart_type == null,
    )
    if (!allUnset && defaultToothChart.length > 0) return

    const initialized = createInitialDefaultToothChart(catalogDefaultExtractionId)
    if (defaultToothChartSignature(initialized) === defaultChartSig) return

    setValue("default_tooth_chart", initialized, { shouldDirty: true })
  }, [
    defaultToothChartEnabled,
    catalogDefaultExtractionId,
    defaultChartSig,
    defaultToothChart.length,
    setValue,
  ])

  const retentionOptionManageHref =
    typeof catalogCustomerId === "number" && catalogCustomerId > 0
      ? "/lab-product-library/retention-option"
      : "/global-product-library/retention-option"

  const activeExtractionsCount = (watchedExtractions as Array<{ status?: string }>).filter(
    (row) => row.status === "Active",
  ).length

  const contentGridClass = useMemo(() => {
    if (defaultToothChartEnabled) {
      if (retentionEnabled && extractionsEnabled) {
        return "xl:grid-cols-[minmax(168px,192px)_minmax(260px,0.72fr)_minmax(360px,1.45fr)]"
      }
      if (retentionEnabled) {
        return "xl:grid-cols-[minmax(168px,192px)_minmax(360px,1fr)]"
      }
      if (extractionsEnabled) {
        return "xl:grid-cols-[minmax(280px,0.85fr)_minmax(360px,1.15fr)]"
      }
      return "xl:grid-cols-1"
    }

    // Chart off: hide preview column and let retention / extractions use the full row.
    if (retentionEnabled && extractionsEnabled) {
      return "xl:grid-cols-[minmax(200px,260px)_minmax(0,1fr)]"
    }
    return "xl:grid-cols-1"
  }, [retentionEnabled, extractionsEnabled, defaultToothChartEnabled])

  /** Cramped middle column only when the chart preview is also on. */
  const extractionsCompact = defaultToothChartEnabled

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Switch
              id="tooth-chart-retention-toggle"
              checked={retentionEnabled}
              onCheckedChange={(checked) => {
                toggleSection("retention")
                setValue("apply_retention_mechanism", checked ? "Yes" : "No", { shouldDirty: true })
              }}
              className="data-[state=checked]:bg-[#1162a8]"
            />
            <label htmlFor="tooth-chart-retention-toggle" className="text-sm font-medium cursor-pointer">
              Retention
            </label>
            {sectionHasErrors(["retentions"]) ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            ) : (
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
                      When off, linked retentions stay saved; slips use has retention = No.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8]">
              <strong>{watchedRetentions.length} types</strong>
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-violet-50 text-violet-800">
              <strong>{watchedRetentionOptions.length} options</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="tooth-chart-extractions-toggle"
              checked={extractionsEnabled}
              onCheckedChange={() => toggleSection("extractions")}
              className="data-[state=checked]:bg-[#1162a8]"
            />
            <label htmlFor="tooth-chart-extractions-toggle" className="text-sm font-medium cursor-pointer">
              Extractions
            </label>
            {sectionHasErrors(["extractions"]) ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <Info className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8]">
              <strong>{activeExtractionsCount} selected</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="tooth-chart-default-toggle"
              checked={defaultToothChartEnabled}
              onCheckedChange={handleDefaultToothChartToggle}
              disabled={!retentionEnabled && !extractionsEnabled}
              className="data-[state=checked]:bg-[#1162a8]"
            />
            <label
              htmlFor="tooth-chart-default-toggle"
              className={cn(
                "text-sm font-medium cursor-pointer",
                !retentionEnabled && !extractionsEnabled && "text-muted-foreground cursor-not-allowed",
              )}
            >
              Default tooth chart
            </label>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-sm text-gray-400 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#1162a8] focus-visible:ring-offset-1"
                    aria-label="About default tooth chart"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left">
                  <p className="text-sm font-medium">Save a default chart for all 32 teeth</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When on, configure retention or extraction per tooth. Selections are saved with the product and sent to the API.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {retentionEnabled ? (
          onRequestRetentionOptionCreate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className=" hidden rounded-md bg-gradient-to-r from-violet-600 to-[#1162a8] text-white border-0 hover:opacity-90 shrink-0"
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
              className="hidden rounded-md bg-gradient-to-r from-violet-600 to-[#1162a8] text-white border-0 hover:opacity-90 shrink-0"
              asChild
            >
              <Link href={retentionOptionManageHref}>
                <Plus className="h-4 w-4 mr-1.5 shrink-0 inline" />
                Add Retention option
              </Link>
            </Button>
          )
        ) : null}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4 items-start",
          defaultToothChartEnabled ? "min-h-[360px]" : "min-h-0",
          contentGridClass,
        )}
      >
        {retentionEnabled ? (
          <div
            className={cn(
              "min-h-[280px] w-full",
              defaultToothChartEnabled ? "max-w-[192px] xl:max-w-none" : "max-w-none",
            )}
          >
            <RetentionSection
              control={control}
              watch={watch}
              setValue={setValue}
              sections={sections}
              toggleSection={toggleSection}
              getValidationError={getValidationError}
              retentions={retentions}
              sectionHasErrors={sectionHasErrors}
              expandedSections={expandedSections}
              toggleExpanded={toggleExpanded}
              handleToggleSelection={handleToggleSelection}
              userRole={userRole}
              catalogCustomerId={catalogCustomerId}
              retentionOptionsCatalog={retentionOptionsCatalog}
              onRequestRetentionOptionCreate={onRequestRetentionOptionCreate}
              embedded
              layout="stacked"
              hideToggle
              compact={defaultToothChartEnabled}
            />
          </div>
        ) : null}

        {extractionsEnabled ? (
          <div className="min-h-[280px] rounded-lg border border-gray-200 bg-white overflow-hidden min-w-0">
            <ExtractionsSection
              key={editingProductKey != null ? `ext-${editingProductKey}` : "ext-new"}
              control={control}
              watch={watch}
              setValue={setValue}
              getValidationError={getValidationError}
              sectionHasErrors={sectionHasErrors}
              sections={sections}
              toggleSection={toggleSection}
              expandedSections={expandedSections}
              toggleExpanded={toggleExpanded}
              allExtractions={allExtractions}
              isExtractionsLoading={isExtractionsLoading}
              apiOppositeExtractionCount={apiOppositeExtractionCount}
              editingProductKey={editingProductKey}
              embedded
              compact={extractionsCompact}
              hideToggle
            />
          </div>
        ) : null}

        {defaultToothChartEnabled ? (
          <ProductToothChartPreview
            retentionEnabled={retentionEnabled}
            extractionsEnabled={extractionsEnabled}
            linkedRetentionOptionIds={(
              watchedRetentionOptions as Array<{ retention_option_id: number; status?: string }>
            )
              .filter((row) => row.status !== "Inactive")
              .map((row) => Number(row.retention_option_id))}
            retentionCatalog={retentionOptionsCatalog.items}
            productExtractions={
              watchedExtractions as Array<{
                extraction_id: number
                status?: string
                is_default?: "Yes" | "No"
                max_teeth?: number | null
              }>
            }
            allExtractions={allExtractions}
            isExtractionsLoading={isExtractionsLoading}
            defaultToothChartEnabled
            defaultToothChart={defaultToothChart}
            onDefaultToothChartChange={handleDefaultToothChartChange}
            showAllowSelectOnlyImplant={hasImplantRetentionOptionLinked}
            allowSelectOnlyImplant={allowSelectOnlyImplant}
            onAllowSelectOnlyImplantChange={handleAllowSelectOnlyImplantChange}
            fillAvailable
          />
        ) : null}
      </div>
    </div>
  )
}
