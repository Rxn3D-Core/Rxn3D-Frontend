import React, { useState, useEffect, useMemo, useRef } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form"
import { ValidationError } from "@/components/ui/validation-error"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChevronDown, Info, Plus, AlertCircle, X, Check } from "lucide-react"
import { ProductCreateForm } from "@/lib/schemas"
import { cn } from "@/lib/utils"

interface Grade {
  id: number | string
  name: string
  sequence?: number
  price?: string
}

type WatchedGrade = NonNullable<ProductCreateForm["grades"]>[number]

/** First tooth $ anchor from Product Details (teeth pricing) — matches API “first tooth” for that strategy. */
function getFirstToothAnchorPrice(
  isTeethBased: boolean,
  teethPricingType: string | undefined,
  teethPricePerTooth: unknown,
  teethFirstTooth: unknown,
  teethCustom: unknown,
): number | null {
  if (!isTeethBased) return null
  const t = teethPricingType ?? "same_price"
  if (t === "same_price") {
    const p = parseFloat(String(teethPricePerTooth ?? ""))
    return !isNaN(p) && p > 0 ? p : null
  }
  if (t === "first_tooth_more") {
    const p = parseFloat(String(teethFirstTooth ?? ""))
    return !isNaN(p) && p > 0 ? p : null
  }
  if (t === "custom") {
    const arr = Array.isArray(teethCustom) ? teethCustom : []
    const p = parseFloat(String(arr[0] ?? ""))
    return !isNaN(p) && p > 0 ? p : null
  }
  return null
}

/**
 * Selected grades sorted by master sequence (asc), then custom (negative id) grades.
 * The first row in this order is the “anchor” grade for teeth-based pricing (first-tooth price, 0% markup).
 */
function sortSelectedGradesByMasterOrder(watchedGrades: WatchedGrade[], masterGrades: Grade[]): WatchedGrade[] {
  if (watchedGrades.length === 0) return watchedGrades
  const masterList = Array.isArray(masterGrades) ? masterGrades : []
  const selected = [...watchedGrades]
  selected.sort((a, b) => {
    const aId = a.grade_id
    const bId = b.grade_id
    const aNeg = typeof aId === "number" && aId < 0
    const bNeg = typeof bId === "number" && bId < 0
    if (aNeg && !bNeg) return 1
    if (!aNeg && bNeg) return -1
    if (aNeg && bNeg) return (aId as number) - (bId as number)
    const ma = masterList.find((mg) => mg.id === aId)
    const mb = masterList.find((mg) => mg.id === bId)
    const sa = ma?.sequence ?? 999999
    const sb = mb?.sequence ?? 999999
    if (sa !== sb) return sa - sb
    return String(aId).localeCompare(String(bId))
  })
  return selected
}

function getAnchorGradeId(watchedGrades: WatchedGrade[], masterGrades: Grade[]): number | string | undefined {
  const sorted = sortSelectedGradesByMasterOrder(watchedGrades, masterGrades)
  return sorted[0]?.grade_id
}

/** Teeth-based: non-anchor tier price = anchor × (1 + markup%/100). */
function priceFromAnchorAndMarkupPercent(anchorPrice: number, markupPercentRaw: unknown): string {
  if (!(anchorPrice > 0) || !isFinite(anchorPrice)) return ""
  const s = markupPercentRaw != null ? String(markupPercentRaw).trim() : ""
  if (s === "") return ""
  const m = parseFloat(s)
  if (isNaN(m)) return ""
  const total = anchorPrice * (1 + m / 100)
  if (!isFinite(total) || total <= 0) return ""
  return total.toFixed(2)
}

/** If multiple defaults, keep the first in form order; otherwise leave selection as-is. */
function dedupeDefaultGrades(watchedGrades: WatchedGrade[]): WatchedGrade[] {
  if (watchedGrades.length === 0) return watchedGrades
  const withDefault = watchedGrades.filter((g) => g.is_default === "Yes")
  if (withDefault.length <= 1) return watchedGrades
  const keepId = withDefault[0].grade_id
  return watchedGrades.map((g) => ({
    ...g,
    is_default: g.grade_id === keepId ? "Yes" : "No",
  }))
}

/**
 * Teeth-based: the first selected grade (by master list order) gets the first-tooth anchor price and 0% markup.
 * This is independent of which grade is marked “default” for the product.
 */
function syncTeethAnchorGradePrice(
  grades: WatchedGrade[],
  anchorPrice: number | null,
  masterGrades: Grade[],
): WatchedGrade[] {
  const anchorId = getAnchorGradeId(grades, masterGrades)
  if (anchorId === undefined) return grades
  if (anchorPrice == null || isNaN(anchorPrice) || anchorPrice <= 0) {
    return grades.map((g) => (g.grade_id === anchorId ? { ...g, markup_percent: "" } : g))
  }
  return grades.map((g) => {
    if (g.grade_id === anchorId) {
      return { ...g, markup_percent: "", price: anchorPrice.toFixed(2) }
    }
    return g
  })
}

interface GradesSectionProps {
  /** Kept for API compatibility with parent; grade-based pricing is bound via `watch` / `setValue`. */
  control: Control<ProductCreateForm>
  watch: UseFormWatch<ProductCreateForm>
  setValue: UseFormSetValue<ProductCreateForm>
  sections: Record<string, boolean>
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  grades: { data?: Grade[] } | Grade[]
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: Record<string, boolean>
  toggleExpanded: (section: string) => void
  handleGradeDefaultChange?: (gradeId: number | string, isDefault: "Yes" | "No") => void
  userRole: string
  customGradeNames: Record<number, string>
  setCustomGradeNames: React.Dispatch<React.SetStateAction<Record<number, string>>>
  /** Lab / lab library: selected grades must have valid prices before Next/Save */
  enforceLabGradePricing?: boolean
}

export function GradesSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  grades,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleGradeDefaultChange,
  userRole = "",
  customGradeNames,
  setCustomGradeNames,
  enforceLabGradePricing = false,
}: GradesSectionProps) {
  const watchedGrades = watch("grades") || []
  const watchedHasGradeBasedPricing = watch("has_grade_based_pricing")
  const isTeethBased = watch("is_teeth_based_price") === "Yes"
  const watchedMaxDaysToProcess = watch("max_days_to_process")
  const watchedBasePrice = watch("base_price")
  const teethPricingType = watch("teeth_pricing_type")
  const teethPricePerTooth = watch("teeth_price_per_tooth")
  const teethFirstToothPrice = watch("teeth_first_tooth_price")
  const teethCustomPrices = watch("teeth_custom_prices")

  const masterGradesFlat = useMemo(
    () => (Array.isArray(grades) ? grades : grades?.data) || [],
    [grades],
  )

  const firstToothAnchor = useMemo(
    () =>
      getFirstToothAnchorPrice(
        isTeethBased,
        teethPricingType,
        teethPricePerTooth,
        teethFirstToothPrice,
        teethCustomPrices,
      ),
    [isTeethBased, teethPricingType, teethPricePerTooth, teethFirstToothPrice, teethCustomPrices],
  )

  const teethGradeLock =
    isTeethBased && watchedHasGradeBasedPricing === "Yes"

  const anchorGradeId = useMemo(
    () => getAnchorGradeId(watchedGrades, masterGradesFlat),
    [watchedGrades, masterGradesFlat],
  )

  const gradesRef = useRef<WatchedGrade[]>(watchedGrades)
  gradesRef.current = watchedGrades

  // When first-tooth anchor or teeth strategy changes, re-sync only the anchor (first-by-order) grade to the anchor price.
  useEffect(() => {
    if (!teethGradeLock || watchedGrades.length === 0) return
    let next = dedupeDefaultGrades(watchedGrades)
    next = syncTeethAnchorGradePrice(next, firstToothAnchor, masterGradesFlat)
    if (JSON.stringify(next) !== JSON.stringify(watchedGrades)) {
      setValue("grades", next as NonNullable<ProductCreateForm["grades"]>, { shouldDirty: true })
    }
  }, [
    teethGradeLock,
    firstToothAnchor,
    teethPricingType,
    teethPricePerTooth,
    teethFirstToothPrice,
    teethCustomPrices,
    masterGradesFlat,
    watchedGrades,
    setValue,
  ])

  // Teeth-based: when anchor price or which grade is anchor changes, refresh derived tier prices from markup (does not run on every grade edit — avoids fighting manual price input).
  useEffect(() => {
    if (!teethGradeLock || firstToothAnchor == null || firstToothAnchor <= 0) return
    const watched = gradesRef.current
    if (watched.length === 0) return
    const aid = getAnchorGradeId(watched, masterGradesFlat)
    if (aid === undefined) return
    let changed = false
    const next = watched.map((g) => {
      if (String(g.grade_id) === String(aid)) return g
      const derived = priceFromAnchorAndMarkupPercent(firstToothAnchor, g.markup_percent)
      if (derived === "") return g
      if (g.price === derived) return g
      changed = true
      return { ...g, price: derived }
    })
    if (changed) {
      setValue("grades", next as NonNullable<ProductCreateForm["grades"]>, { shouldDirty: true })
    }
  }, [teethGradeLock, firstToothAnchor, anchorGradeId, masterGradesFlat, setValue])

  // State for custom grade form
  const [showCustomGradeForm, setShowCustomGradeForm] = useState(false)
  const [customGradeName, setCustomGradeName] = useState("")
  const [customGradePrice, setCustomGradePrice] = useState("")
  const [customGradeIsDefault, setCustomGradeIsDefault] = useState(false)

  // Expand grades section when max_days_to_process is inputted
  useEffect(() => {
    if (watchedMaxDaysToProcess !== null && watchedMaxDaysToProcess !== undefined && !expandedSections.grades) {
      toggleExpanded("grades")
    }
  }, [watchedMaxDaysToProcess, expandedSections.grades, toggleExpanded])

  // Prefill lowest grade with base price when grades are available and base price exists
  // Skip when teeth-based: anchor grade sync handles first-by-order grade price.
  useEffect(() => {
    if (isTeethBased) return
    if (
      watchedBasePrice && 
      watchedBasePrice !== "" && 
      watchedGrades.length > 0 &&
      watchedHasGradeBasedPricing === "Yes"
    ) {
      const masterGrades = (Array.isArray(grades) ? grades : grades?.data) || []
      
      // Find selected grades with their sequence from master grades
      const selectedGradesWithSequence = watchedGrades
        .map((watchedGrade) => {
          const masterGrade = masterGrades.find((mg: Grade) => mg.id === watchedGrade.grade_id)
          return {
            watchedGrade,
            sequence: masterGrade?.sequence ?? 999999, // Use high number if sequence not found
            gradeId: watchedGrade.grade_id,
          }
        })
        .filter((item) => item.sequence !== 999999) // Only include grades found in master list
      
      if (selectedGradesWithSequence.length > 0) {
        // Find the grade with the lowest sequence
        const lowestGrade = selectedGradesWithSequence.reduce((lowest, current) => 
          current.sequence < lowest.sequence ? current : lowest
        )
        
        // Only prefill if the price is empty
        if (!lowestGrade.watchedGrade.price || lowestGrade.watchedGrade.price === "") {
          const updated = watchedGrades.map((g) =>
            g.grade_id === lowestGrade.gradeId 
              ? { ...g, price: watchedBasePrice.toString() } 
              : g
          )
          setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, { shouldDirty: true })
        }
      }
    }
  }, [watchedBasePrice, watchedGrades, watchedHasGradeBasedPricing, grades, setValue, isTeethBased])

  // Helper function to check if price value is 0 or invalid
  const isPriceZeroOrInvalid = (price: string | undefined): boolean => {
    if (!price || price === "") return false // Empty is allowed
    const numValue = parseFloat(price)
    return !isNaN(numValue) && numValue <= 0
  }

  // Generate a temporary ID for custom grade (using negative number to avoid conflicts)
  const generateCustomGradeId = (): number => {
    const existingIds = watchedGrades.map((g) => typeof g.grade_id === "number" ? g.grade_id : 0)
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom grade
  const handleAddCustomGrade = () => {
    if (!customGradeName.trim()) {
      return // Don't add if name is empty
    }

    const customGradeId = generateCustomGradeId()
    const newGrade: WatchedGrade = {
      grade_id: customGradeId,
      is_default: customGradeIsDefault ? ("Yes" as const) : ("No" as const),
      price: customGradePrice || "",
    }

    // Store the custom grade name
    setCustomGradeNames((prev) => ({
      ...prev,
      [customGradeId]: customGradeName.trim(),
    }))

    // If setting as default, unset other defaults
    let updated: NonNullable<ProductCreateForm["grades"]>
    if (customGradeIsDefault) {
      updated = watchedGrades.map((g) => ({ ...g, is_default: "No" as const }))
      updated.push(newGrade)
    } else {
      updated = [...watchedGrades, newGrade] as NonNullable<ProductCreateForm["grades"]>
    }

    // Deduplicate if multiple defaults were set
    updated = dedupeDefaultGrades(updated)

    if (teethGradeLock) {
      updated = syncTeethAnchorGradePrice(updated, firstToothAnchor, masterGradesFlat)
    }

    setValue("grades", updated, { shouldDirty: true })
    
    // Reset form
    setCustomGradeName("")
    setCustomGradePrice("")
    setCustomGradeIsDefault(false)
    setShowCustomGradeForm(false)
  }

  // Handle canceling custom grade form
  const handleCancelCustomGrade = () => {
    setCustomGradeName("")
    setCustomGradePrice("")
    setCustomGradeIsDefault(false)
    setShowCustomGradeForm(false)
  }

  // Check if custom grade price is valid
  const customGradePriceError = isPriceZeroOrInvalid(customGradePrice)

  const handleSetDefaultGrade = (gradeId: number | string, isDefault: "Yes" | "No") => {
    let updated: NonNullable<ProductCreateForm["grades"]> = watchedGrades.map((g) => {
      if (g.grade_id === gradeId) {
        return {
          ...g,
          is_default: isDefault,
          price: g.price && g.price !== "" ? g.price : "",
        }
      }
      return { ...g, is_default: "No" as const }
    }) as NonNullable<ProductCreateForm["grades"]>
    // Deduplicate if multiple defaults were set
    updated = dedupeDefaultGrades(updated)

    if (teethGradeLock) {
      updated = syncTeethAnchorGradePrice(updated, firstToothAnchor, masterGradesFlat)
    }
    setValue("grades", updated, { shouldDirty: true, shouldValidate: true })
  }

  // Internal handleToggleSelection that updates form state
  const handleToggleSelection = (
    field: string,
    gradeId: number | string,
    sequence?: number,
    extra?: Partial<WatchedGrade>
  ) => {
    let updated: NonNullable<ProductCreateForm["grades"]> = []
    const isSelected = watchedGrades.some((g) => g.grade_id === gradeId)
    if (isSelected) {
      // Remove grade
      updated = watchedGrades.filter((g) => g.grade_id !== gradeId) as NonNullable<ProductCreateForm["grades"]>
    } else {
      // Add grade without auto-setting default
      updated = [
        ...watchedGrades,
        {
          grade_id: gradeId as number,
          is_default: "No" as const,
          price: extra?.price !== undefined && extra?.price !== "" ? extra.price : "",
        },
      ] as NonNullable<ProductCreateForm["grades"]>
    }

    // Deduplicate if multiple defaults were set
    updated = dedupeDefaultGrades(updated)

    if (teethGradeLock) {
      updated = syncTeethAnchorGradePrice(updated, firstToothAnchor, masterGradesFlat)
    }
    setValue("grades", updated, { shouldDirty: true })
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="grades-section-toggle"
            checked={sections.grades}
            onCheckedChange={(checked) => {
              toggleSection("grades")
              setValue("has_grade_based_pricing", checked ? "Yes" : "No", { shouldDirty: true })
            }}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <label htmlFor="grades-section-toggle" className="font-medium cursor-pointer select-none">
            Grades
          </label>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8] focus-visible:ring-offset-1"
                  aria-label="Grade-based pricing help"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-sm">
                <p className="font-medium">Does this product have grade-based pricing?</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  This switch enables grade-based pricing and the Grades section on the slip. When on, set
                  prices per quality tier (Economy, Standard, etc.) below.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {sectionHasErrors(["grades"]) ? <AlertCircle className="h-4 w-4 text-red-500" /> : null}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedGrades.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedGrades.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.grades ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("grades")}
          />
        </div>
      </div>
      {expandedSections.grades && (
        <div className="px-2 sm:px-6 pb-6">
          <ValidationError message={getValidationError("has_grade_based_pricing")} />
          <ValidationError message={getValidationError("grades")} />
          {/* Grade list — disabled when the single Grades switch is off (sections.grades + has_grade_based_pricing stay in sync) */}
          <div className={cn(!sections.grades && "opacity-50 pointer-events-none select-none")}>
          {/* Hide price input and auto-billing for superadmin */}
          {watchedHasGradeBasedPricing === "Yes" && (
            <>
              <div className="space-y-2">
                {/* Render existing grades from backend */}
                {((Array.isArray(grades) ? grades : grades?.data) || []).map((grade: Grade) => {
                  const isSelected = watchedGrades.some((g) => g.grade_id === grade.id)
                  const isDefault = watchedGrades.find((g) => g.grade_id === grade.id)?.is_default === "Yes"
                  const isAnchorGrade =
                    isSelected &&
                    anchorGradeId !== undefined &&
                    String(grade.id) === String(anchorGradeId)
                  const gradeObj = watchedGrades.find((g) => g.grade_id === grade.id)
                  // Find the index of this grade in the watchedGrades array for validation error lookup
                  const gradeIndexInWatched = watchedGrades.findIndex((g) => g.grade_id === grade.id)
                  // Get validation error for this specific grade's price
                  // Try multiple error path formats (zod/react-hook-form may use different formats)
                  const priceError = gradeIndexInWatched >= 0 
                    ? (getValidationError(`grades.${gradeIndexInWatched}.price`) || 
                       getValidationError(`grades[${gradeIndexInWatched}].price`))
                    : undefined
                  const priceEditableRow =
                    !(teethGradeLock && isAnchorGrade) && userRole !== "superadmin"
                  const anchorPricingMissing =
                    enforceLabGradePricing &&
                    teethGradeLock &&
                    isAnchorGrade &&
                    (firstToothAnchor == null || firstToothAnchor <= 0)
                  const priceMissingLabEditable =
                    enforceLabGradePricing &&
                    isSelected &&
                    priceEditableRow &&
                    String(gradeObj?.price ?? "").trim() === ""
                  const markupTierMissingLab =
                    enforceLabGradePricing &&
                    teethGradeLock &&
                    !isAnchorGrade &&
                    isSelected &&
                    userRole !== "superadmin" &&
                    String(gradeObj?.price ?? "").trim() === ""
                  const isZero = isPriceZeroOrInvalid(gradeObj?.price)
                  const hasPriceError =
                    priceError !== undefined ||
                    isZero ||
                    anchorPricingMissing ||
                    priceMissingLabEditable
                  const inlinePriceMsg =
                    priceError ||
                    (anchorPricingMissing ? "Set per-tooth pricing on Product Details first" : undefined) ||
                    (priceMissingLabEditable ? "Grade price is required" : undefined) ||
                    (isZero ? "Price must be greater than 0" : undefined)
                  return (
                    <div key={grade.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleToggleSelection("grades", grade.id, grade.sequence, {
                              is_default: "No",
                              price: gradeObj?.price || "",
                            })
                          }
                        />
                        <span className={isSelected ? "" : "text-gray-400"}>{grade.name}</span>
                      </label>
                      {/* Hide only the price input for superadmin */}
                      {isSelected && userRole !== "superadmin" && (
                        <div className="relative w-full sm:w-32">
                          {teethGradeLock && isAnchorGrade ? (
                            <div
                              className={cn(
                                "pl-7 h-9 border rounded w-full text-gray-700 flex items-center text-sm",
                                anchorPricingMissing
                                  ? "border-red-500 bg-red-50/50"
                                  : "border-gray-200 bg-gray-50",
                              )}
                              title="First checked grade in list order: matches first tooth price from Product Details (not editable). Independent of default grade."
                            >
                              {firstToothAnchor != null ? firstToothAnchor.toFixed(2) : "—"}
                            </div>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className={`pl-7 h-9 border rounded w-full ${
                                hasPriceError
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                  : "border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                              }`}
                              value={gradeObj?.price || ""}
                              onChange={(e) => {
                                const val = e.target.value
                                const updated = watchedGrades.map((g) =>
                                  g.grade_id === grade.id ? { ...g, price: val } : g
                                )
                                setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }}
                            />
                          )}
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        </div>
                      )}
                      {isSelected && isTeethBased && isAnchorGrade && (
                        <div
                          className="flex h-9 w-28 items-center justify-center rounded border border-gray-200 bg-gray-50 px-2 text-sm text-gray-700"
                          title="Anchor grade (first in list order): 0% markup. Not tied to which grade is default."
                        >
                          0%
                        </div>
                      )}
                      {isSelected && isTeethBased && !isAnchorGrade && userRole !== "superadmin" && (
                        <div className="relative w-full sm:w-28">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Markup %"
                            title="Markup % over anchor (first-in-list) price — price updates automatically"
                            className={cn(
                              "h-9 border rounded w-full px-2",
                              markupTierMissingLab
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                                : "border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]",
                            )}
                            value={gradeObj?.markup_percent ?? ""}
                            onChange={(e) => {
                              const markupStr = e.target.value
                              let nextPrice: string | undefined
                              if (firstToothAnchor != null && firstToothAnchor > 0) {
                                nextPrice =
                                  markupStr.trim() === ""
                                    ? ""
                                    : priceFromAnchorAndMarkupPercent(firstToothAnchor, markupStr)
                              }
                              const updated = watchedGrades.map((g) =>
                                g.grade_id === grade.id
                                  ? {
                                      ...g,
                                      markup_percent: markupStr,
                                      ...(nextPrice !== undefined ? { price: nextPrice } : {}),
                                    }
                                  : g,
                              )
                              setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }}
                          />
                        </div>
                      )}
                      {isSelected && (
                        <Button
                          type="button"
                          variant={isDefault ? "default" : "outline"}
                          size="sm"
                          className={
                            isDefault
                              ? "bg-green-500 text-white hover:bg-green-600 h-8 text-xs rounded-full"
                              : "text-[#1162a8] border-[#1162a8] hover:bg-[#1162a8] hover:text-white h-8 text-xs rounded-full"
                          }
                          onClick={() => handleSetDefaultGrade(grade.id, isDefault ? "No" : "Yes")}
                        >
                          {isDefault ? "Default Grade" : "Set as default grade"}
                        </Button>
                      )}
                      {isSelected && hasPriceError && !!inlinePriceMsg && (
                        <ValidationError message={inlinePriceMsg} className="ml-2 mt-0 flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
                
                {/* Render custom grades that were added */}
                {watchedGrades
                  .filter((g) => typeof g.grade_id === "number" && g.grade_id < 0)
                  .map((customGrade) => {
                    const customGradeId = customGrade.grade_id as number
                    const customName = customGradeNames[customGradeId] || "Custom Grade"
                    const isDefault = customGrade.is_default === "Yes"
                    const isAnchorGrade =
                      anchorGradeId !== undefined && String(customGradeId) === String(anchorGradeId)
                    const gradeIndexInWatched = watchedGrades.findIndex((g) => g.grade_id === customGradeId)
                    const priceError = gradeIndexInWatched >= 0 
                      ? (getValidationError(`grades.${gradeIndexInWatched}.price`) || 
                         getValidationError(`grades[${gradeIndexInWatched}].price`))
                      : undefined
                    const isSelectedCustom = true
                    const priceEditableRow =
                      !(teethGradeLock && isAnchorGrade) && userRole !== "superadmin"
                    const anchorPricingMissing =
                      enforceLabGradePricing &&
                      teethGradeLock &&
                      isAnchorGrade &&
                      (firstToothAnchor == null || firstToothAnchor <= 0)
                    const priceMissingLabEditable =
                      enforceLabGradePricing &&
                      isSelectedCustom &&
                      priceEditableRow &&
                      String(customGrade.price ?? "").trim() === ""
                    const markupTierMissingLab =
                      enforceLabGradePricing &&
                      teethGradeLock &&
                      !isAnchorGrade &&
                      isSelectedCustom &&
                      userRole !== "superadmin" &&
                      String(customGrade.price ?? "").trim() === ""
                    const isZero = isPriceZeroOrInvalid(customGrade.price)
                    const hasPriceError =
                      priceError !== undefined ||
                      isZero ||
                      anchorPricingMissing ||
                      priceMissingLabEditable
                    const inlinePriceMsg =
                      priceError ||
                      (anchorPricingMissing ? "Set per-tooth pricing on Product Details first" : undefined) ||
                      (priceMissingLabEditable ? "Grade price is required" : undefined) ||
                      (isZero ? "Price must be greater than 0" : undefined)

                    return (
                      <div key={customGradeId} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <Checkbox
                            className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                            checked={true}
                            onCheckedChange={() => {
                              // Remove custom grade
                              let updated = watchedGrades.filter((g) => g.grade_id !== customGradeId) as NonNullable<ProductCreateForm["grades"]>
                              updated = dedupeDefaultGrades(updated)

                              if (teethGradeLock) {
                                updated = syncTeethAnchorGradePrice(updated, firstToothAnchor, masterGradesFlat)
                              }
                              setValue("grades", updated, { shouldDirty: true })
                              // Remove from custom names
                              setCustomGradeNames((prev) => {
                                const newNames = { ...prev }
                                delete newNames[customGradeId]
                                return newNames
                              })
                            }}
                          />
                          <span>{customName}</span>
                        </label>
                        {userRole !== "superadmin" && (
                          <div className="relative w-full sm:w-32">
                            {teethGradeLock && isAnchorGrade ? (
                              <div
                                className={cn(
                                  "pl-7 h-9 border rounded w-full text-gray-700 flex items-center text-sm",
                                  anchorPricingMissing
                                    ? "border-red-500 bg-red-50/50"
                                    : "border-gray-200 bg-gray-50",
                                )}
                                title="First checked grade in list order: matches first tooth price from Product Details (not editable). Independent of default grade."
                              >
                                {firstToothAnchor != null ? firstToothAnchor.toFixed(2) : "—"}
                              </div>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className={`pl-7 h-9 border rounded w-full ${
                                  hasPriceError
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                    : "border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                                }`}
                                value={customGrade.price || ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                  const updated = watchedGrades.map((g) =>
                                    g.grade_id === customGradeId ? { ...g, price: val } : g
                                  )
                                  setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                }}
                              />
                            )}
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          </div>
                        )}
                        {isTeethBased && isAnchorGrade && (
                          <div
                            className="flex h-9 w-28 items-center justify-center rounded border border-gray-200 bg-gray-50 px-2 text-sm text-gray-700"
                            title="Anchor grade (first in list order): 0% markup. Not tied to which grade is default."
                          >
                            0%
                          </div>
                        )}
                        {isTeethBased && !isAnchorGrade && userRole !== "superadmin" && (
                          <div className="relative w-full sm:w-28">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Markup %"
                              title="Markup % over anchor (first-in-list) price — price updates automatically"
                              className={cn(
                                "h-9 border rounded w-full px-2",
                                markupTierMissingLab
                                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                                  : "border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]",
                              )}
                              value={customGrade.markup_percent ?? ""}
                              onChange={(e) => {
                                const markupStr = e.target.value
                                let nextPrice: string | undefined
                                if (firstToothAnchor != null && firstToothAnchor > 0) {
                                  nextPrice =
                                    markupStr.trim() === ""
                                      ? ""
                                      : priceFromAnchorAndMarkupPercent(firstToothAnchor, markupStr)
                                }
                                const updated = watchedGrades.map((g) =>
                                  g.grade_id === customGradeId
                                    ? {
                                        ...g,
                                        markup_percent: markupStr,
                                        ...(nextPrice !== undefined ? { price: nextPrice } : {}),
                                      }
                                    : g,
                                )
                                setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }}
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant={isDefault ? "default" : "outline"}
                          size="sm"
                          className={
                            isDefault
                              ? "bg-green-500 text-white hover:bg-green-600 h-8 text-xs rounded-full"
                              : "text-[#1162a8] border-[#1162a8] hover:bg-[#1162a8] hover:text-white h-8 text-xs rounded-full"
                          }
                          onClick={() => handleSetDefaultGrade(customGradeId, isDefault ? "No" : "Yes")}
                        >
                          {isDefault ? "Default Grade" : "Set as default grade"}
                        </Button>
                        {hasPriceError && !!inlinePriceMsg && (
                          <ValidationError message={inlinePriceMsg} className="ml-2 mt-0 flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}
                
                {/* Custom Grade Form */}
                {showCustomGradeForm ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="Enter new grade"
                        className="h-9 border rounded px-3 w-full sm:w-40 text-sm"
                        value={customGradeName}
                        onChange={(e) => setCustomGradeName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {userRole !== "superadmin" && (
                      <div className="relative w-full sm:w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className={`pl-7 h-9 border rounded w-full ${
                            customGradePriceError 
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2" 
                              : "border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                          }`}
                          value={customGradePrice}
                          onChange={(e) => setCustomGradePrice(e.target.value)}
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant={customGradeIsDefault ? "default" : "outline"}
                      size="sm"
                      className={
                        customGradeIsDefault
                          ? "bg-green-500 text-white hover:bg-green-600 h-8 text-xs rounded-full"
                          : "text-[#1162a8] border-[#1162a8] hover:bg-[#1162a8] hover:text-white h-8 text-xs rounded-full"
                      }
                      onClick={() => setCustomGradeIsDefault(!customGradeIsDefault)}
                    >
                      {customGradeIsDefault ? "Default Grade" : "Set as default grade"}
                    </Button>
                    {customGradePriceError && (
                      <ValidationError 
                        message="Price must be greater than 0" 
                        className="ml-2 mt-0 flex-shrink-0" 
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                        onClick={handleAddCustomGrade}
                        disabled={!customGradeName.trim() || customGradePriceError}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                        onClick={handleCancelCustomGrade}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#1162a8] pl-0 flex items-center gap-1"
                    onClick={() => setShowCustomGradeForm(true)}
                  >
                    <Plus className="h-4 w-4" /> Add Custom
                  </Button>
                )}
              </div>
              {/* Auto-billing section hidden */}
              {/* <div className="border-t my-4" />
              {userRole !== "superadmin" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Switch
                    checked={watch("enable_auto_billing") === "Yes"}
                    onCheckedChange={checked => setValue("enable_auto_billing", checked ? "Yes" : "No", { shouldDirty: true })}
                    className="data-[state=checked]:bg-[#1162a8]"
                  />
                  <span className="font-medium text-sm">
                    Enable Auto-billing for completed stages
                  </span>
                  <Info className="h-4 w-4 text-gray-400 ml-1" />
                </div>
              )}
              {userRole !== "superadmin" && watch("enable_auto_billing") === "Yes" && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">Auto bill triggers in</span>
                  <input
                    type="number"
                    className="w-16 h-8 border rounded"
                    value={watch("auto_billing_days") || 31}
                    min="1"
                    max="31"
                    onChange={e => setValue("auto_billing_days", Number(e.target.value), { shouldDirty: true })}
                  />
                  <span className="text-sm">days</span>
                </div>
              )}
              <ValidationError message={getValidationError("auto_billing_days")} /> */}
            </>
          )}
          <ValidationError message={getValidationError("grades")} />
          </div>
        </div>
      )}
    </div>
  )
}
