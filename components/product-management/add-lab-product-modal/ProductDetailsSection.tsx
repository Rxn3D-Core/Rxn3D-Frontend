import React, { useRef, useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Controller, useWatch } from "react-hook-form"
import { AlertCircle, Info, Plus, PlusCircle, Trash2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateCodeFromName, cn } from "@/lib/utils"
import { productHasAnyJawPhotoUrls } from "@/lib/library-product-api-mapping"
import { ValidationError } from "@/components/ui/validation-error"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { CategoryWithSubcategories } from "@/contexts/product-category-context"

/** Custom per-count pricing: up to 16 teeth (full arch); `sm+` uses 8 columns (row 1: 1–8, row 2: 9–16). */
const MAX_TEETH = 16
const PREVIEW_TEETH_COUNT = 8

// ─── Teeth Pricing Sub-component ─────────────────────────────────────────────

function PricePreviewTable({ prices }: { prices: number[] }) {
  return (
    <div
      className="inline-flex flex-col gap-1 rounded-2xl px-5 py-3 max-w-full"
      style={{
        background: "linear-gradient(#F7F7F7, #F7F7F7) padding-box, linear-gradient(to right, #3b82f6, #a855f7) border-box",
        border: "1.5px solid transparent",
      }}
    >
      <span className="text-black text-sm">Price Preview</span>
      <div className="overflow-x-auto">
        <div className="flex flex-row items-center gap-6 px-2">
          {prices.map((price, i) => (
            <div key={i} className="flex flex-col items-center shrink-0">
              <span className="text-black text-xs text-center whitespace-nowrap">{i + 1} {i === 0 ? "tooth" : "teeth"}</span>
              <span className="text-black text-base font-medium text-center whitespace-nowrap">${price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface TeethPricingSectionProps {
  control: any
  setValue?: (name: string, value: any) => void
  /** Lab: full pricing required. Superadmin: price inputs disabled / optional. */
  pricingValidationMode?: "lab_required" | "superadmin_optional"
  getValidationError?: (field: string) => string | undefined
}

function TeethPricingSection({
  control,
  setValue,
  pricingValidationMode = "lab_required",
  getValidationError = () => undefined,
}: TeethPricingSectionProps) {
  const isLabPricing = pricingValidationMode === "lab_required"
  const isTeethBased = useWatch({ control, name: "is_teeth_based_price" })
  const pricingType = useWatch({ control, name: "teeth_pricing_type" }) ?? "same_price"
  const pricePerTooth = useWatch({ control, name: "teeth_price_per_tooth" }) ?? ""
  const firstToothPrice = useWatch({ control, name: "teeth_first_tooth_price" }) ?? ""
  const additionalToothPrice = useWatch({ control, name: "teeth_additional_tooth_price" }) ?? ""
  const customPrices = useWatch({ control, name: "teeth_custom_prices" }) ?? []

  const setVal = React.useCallback((name: string, value: any) => {
    if (setValue) (setValue as any)(name, value)
  }, [setValue])

  const customPriceInputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  if (isTeethBased !== "Yes") return null

  // Build preview prices
  const samePricePreviews: number[] = (() => {
    const p = parseFloat(String(pricePerTooth))
    if (isNaN(p) || p <= 0) return []
    return Array.from({ length: PREVIEW_TEETH_COUNT }, (_, i) => p * (i + 1))
  })()

  const firstMorePreviews: number[] = (() => {
    const first = parseFloat(String(firstToothPrice))
    const add = parseFloat(String(additionalToothPrice))
    if (isNaN(first) || isNaN(add) || first <= 0) return []
    return Array.from({ length: PREVIEW_TEETH_COUNT }, (_, i) =>
      i === 0 ? first : first + add * i
    )
  })()

  const handleCustomPriceChange = (index: number, value: string) => {
    const updated = [...customPrices]
    updated[index] = value
    setVal("teeth_custom_prices", updated)
  }

  const handleAddCustomSlot = () => {
    if (!isLabPricing) return
    if (customPrices.length >= MAX_TEETH) return
    const newIndex = customPrices.length
    setVal("teeth_custom_prices", [...customPrices, ""])
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const el = customPriceInputRefs.current[newIndex]
        el?.focus()
        if (el && el.value === "") el.select()
      })
    })
  }

  const handleRemoveLastCustomSlot = () => {
    if (!isLabPricing) return
    if (customPrices.length <= 1) return
    setVal("teeth_custom_prices", customPrices.slice(0, -1))
  }

  return (
    <div className="space-y-4 pl-2">
      <p className="text-sm font-medium text-gray-700">How do you charge for this product?</p>

      <Controller
        name="teeth_pricing_type"
        control={control}
        defaultValue="same_price"
        render={({ field }) => (
          <RadioGroup
            value={field.value ?? "same_price"}
            onValueChange={(val) => {
              field.onChange(val)
              // Seed one empty slot when switching to custom for the first time
              if (val === "custom" && (!customPrices || customPrices.length === 0)) {
                setVal("teeth_custom_prices", [""])
              }
            }}
            className="space-y-3"
          >
            {/* ── Option 1: Same price per tooth ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="same_price"
                  id="teeth_pricing-same"
                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                />
                <label htmlFor="teeth_pricing-same" className="text-sm font-medium cursor-pointer">
                  Same price per tooth
                </label>
                {field.value === "same_price" && (
                  <div className="relative ml-2 w-40">
                    <Input
                      label="Price per tooth"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-8"
                      value={pricePerTooth}
                      onChange={(e) => setVal("teeth_price_per_tooth", e.target.value)}
                      disabled={!isLabPricing}
                      validationState={
                        getValidationError("teeth_price_per_tooth")
                          ? "error"
                          : isLabPricing && String(pricePerTooth ?? "").trim() !== ""
                            ? "valid"
                            : "default"
                      }
                      errorMessage={getValidationError("teeth_price_per_tooth")}
                      required={isLabPricing}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none text-sm">
                      $
                    </span>
                  </div>
                )}
              </div>
              {field.value === "same_price" && samePricePreviews.length > 0 && (
                <PricePreviewTable prices={samePricePreviews} />
              )}
            </div>

            {/* ── Option 2: First tooth costs more ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <RadioGroupItem
                  value="first_tooth_more"
                  id="teeth_pricing-first"
                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                />
                <label htmlFor="teeth_pricing-first" className="text-sm font-medium cursor-pointer">
                  First tooth costs more
                </label>
                {field.value === "first_tooth_more" && (
                  <>
                    <div className="relative ml-2 w-40">
                      <Input
                        label="First tooth price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-8"
                        value={firstToothPrice}
                        onChange={(e) => setVal("teeth_first_tooth_price", e.target.value)}
                        disabled={!isLabPricing}
                        validationState={
                          getValidationError("teeth_first_tooth_price")
                            ? "error"
                            : isLabPricing && String(firstToothPrice ?? "").trim() !== ""
                              ? "valid"
                              : "default"
                        }
                        errorMessage={getValidationError("teeth_first_tooth_price")}
                        required={isLabPricing}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none text-sm">
                        $
                      </span>
                    </div>
                    <div className="relative w-48">
                      <Input
                        label="Each additional tooth"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-8"
                        value={additionalToothPrice}
                        onChange={(e) => setVal("teeth_additional_tooth_price", e.target.value)}
                        disabled={!isLabPricing}
                        validationState={getValidationError("teeth_additional_tooth_price") ? "error" : "default"}
                        errorMessage={getValidationError("teeth_additional_tooth_price")}
                        required={isLabPricing}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none text-sm">
                        $
                      </span>
                    </div>
                  </>
                )}
              </div>
              {field.value === "first_tooth_more" && firstMorePreviews.length > 0 && (
                <PricePreviewTable prices={firstMorePreviews} />
              )}
            </div>

            {/* ── Option 3: Custom price for each count ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="custom"
                  id="teeth_pricing-custom"
                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                />
                <label htmlFor="teeth_pricing-custom" className="text-sm font-medium cursor-pointer">
                  Custom price for each count
                </label>
              </div>
              {field.value === "custom" && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "linear-gradient(#F7F7F7, #F7F7F7) padding-box, linear-gradient(to right, #3b82f6, #a855f7) border-box",
                    border: "1.5px solid transparent",
                  }}
                >
                  <div className="max-h-96 overflow-y-auto overflow-x-auto pb-1 [scrollbar-gutter:stable]">
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 min-w-0 pr-1">
                      {customPrices.map((price: string | number, index: number) => {
                        const label =
                          index === 0
                            ? "1 tooth"
                            : index === MAX_TEETH - 1 && customPrices.length === MAX_TEETH
                              ? `${MAX_TEETH} teeth`
                              : `${index + 1} teeth`
                        const isLastSlot = index === customPrices.length - 1
                        const showRemove = isLastSlot && customPrices.length > 1
                        const cellErr = getValidationError(`teeth_custom_prices.${index}`)
                        return (
                          <div key={index} className="flex flex-col gap-1 min-w-0">
                            <span className="text-xs text-gray-500 text-center leading-tight px-0.5">
                              {label}
                            </span>
                            <div className="flex items-stretch gap-1 min-w-0">
                              <div className="relative flex-1 min-w-0">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none text-sm">
                                  $
                                </span>
                                <input
                                  ref={(el) => {
                                    customPriceInputRefs.current[index] = el
                                  }}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!isLabPricing}
                                  className={cn(
                                    "w-full min-w-0 pl-6 pr-1.5 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2",
                                    cellErr
                                      ? "border-[#CF0202] focus:ring-red-400"
                                      : isLabPricing && String(price ?? "").trim() !== ""
                                        ? "border-[#119933] focus:ring-green-400"
                                        : "border-gray-300 focus:ring-blue-400",
                                    !isLabPricing && "opacity-60 cursor-not-allowed bg-gray-50",
                                  )}
                                  value={String(price)}
                                  onChange={(e) => handleCustomPriceChange(index, e.target.value)}
                                />
                              </div>
                              {showRemove && isLabPricing && (
                                <button
                                  type="button"
                                  onClick={handleRemoveLastCustomSlot}
                                  className="shrink-0 h-[42px] w-9 rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center"
                                  title="Remove this tooth count"
                                  aria-label="Remove last tooth price slot"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {customPrices.length < MAX_TEETH && isLabPricing && (
                        <div className="flex flex-col gap-1 min-w-0 justify-end">
                          <span className="text-xs text-transparent text-center select-none" aria-hidden>
                            &nbsp;
                          </span>
                          <button
                            type="button"
                            onClick={handleAddCustomSlot}
                            className="h-[42px] w-full rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ background: "linear-gradient(to right, #a855f7, #3b82f6)" }}
                            title="Add tooth price slot"
                          >
                            <PlusCircle className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {customPrices.length >= MAX_TEETH && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <Info className="h-3 w-3 flex-shrink-0" />
                      Maximum {MAX_TEETH} teeth reached.
                    </p>
                  )}
                </div>
              )}
            </div>
          </RadioGroup>
        )}
      />
    </div>
  )
}

// ─── Jaw Photos Sub-component ─────────────────────────────────────────────────

type JawType = "upper" | "lower" | "both"

interface JawPhotoUploadProps {
  label: string
  jawType: JawType
  value: string | null | undefined
  onChange: (jawType: JawType, base64: string | null) => void
  errorMessage?: string
}

function JawPhotoUpload({ label, jawType, value, onChange, errorMessage }: JawPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => onChange(jawType, reader.result as string)
      reader.readAsDataURL(file)
    }
    // Reset so same file can be re-selected
    e.target.value = ""
  }

  const boxClass = cn(
    "relative flex items-center justify-center border-2 border-dashed rounded-xl h-28 w-28 sm:h-32 sm:w-32 shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group overflow-hidden",
    errorMessage
      ? "border-red-400 hover:border-red-500"
      : "border-gray-300 hover:border-gray-400",
  )

  return (
    <div className="flex flex-col items-center gap-2 max-w-[8rem] sm:max-w-[8.5rem] mx-auto">
      <span className={cn("text-sm font-medium text-center", errorMessage ? "text-red-600" : "text-gray-700")}>
        {label}
      </span>
      <div className={boxClass} onClick={handleClick}>
        {value ? (
          <img
            src={value && value.startsWith("http") ? `${value}${value.includes("?") ? "&" : "?"}t=${new Date().getTime()}` : value || ""}
            alt={label}
            className="max-h-full max-w-full object-contain rounded-lg p-1"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-600 px-1">
            <i className="fas fa-cloud-upload-alt text-xl mb-0.5"></i>
            <span className="text-[10px] font-medium leading-tight text-center">Upload</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
      {errorMessage ? (
        <p className="text-[11px] leading-snug text-red-600 text-center">{errorMessage}</p>
      ) : null}
      {value && (
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => onChange(jawType, null)}
            className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}

interface ShowJawPhotoSectionProps {
  control: any
  jawPhotos: { upper?: string | null; lower?: string | null; both?: string | null }
  onJawPhotoChange: (jawType: JawType, base64: string | null) => void
  getValidationError?: (field: string) => string | undefined
}

function ShowJawPhotoSection({
  control,
  jawPhotos,
  onJawPhotoChange,
  getValidationError = () => undefined,
}: ShowJawPhotoSectionProps) {
  const showJawPhoto = useWatch({ control, name: "show_jaw_photo" })
  const upperErr = getValidationError("jaw_photos.upper")
  const lowerErr = getValidationError("jaw_photos.lower")
  const bothErr = getValidationError("jaw_photos.both")
  const anyJawErr = Boolean(upperErr || lowerErr || bothErr)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Controller
          name="show_jaw_photo"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === "Yes"}
              onCheckedChange={(checked) => field.onChange(checked ? "Yes" : "No")}
              className="data-[state=checked]:bg-[#1162a8]"
            />
          )}
        />
        <label className="text-sm font-medium text-gray-700">Show jaw photo</label>
        {anyJawErr ? <AlertCircle className="h-4 w-4 text-red-500" /> : null}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>When enabled, upper, lower, and both-jaw reference images are required</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {showJawPhoto === "Yes" && (
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-2 justify-items-left">
            <JawPhotoUpload
              label="Upper Jaw"
              jawType="upper"
              value={jawPhotos.upper}
              onChange={onJawPhotoChange}
              errorMessage={upperErr}
            />
            <JawPhotoUpload
              label="Lower Jaw"
              jawType="lower"
              value={jawPhotos.lower}
              onChange={onJawPhotoChange}
              errorMessage={lowerErr}
            />
            <JawPhotoUpload
              label="Both"
              jawType="both"
              value={jawPhotos.both}
              onChange={onJawPhotoChange}
              errorMessage={bothErr}
            />
          </div>
          {anyJawErr ? (
            <ValidationError message="Upload upper, lower, and both jaw photos when Show jaw photo is on." />
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

type ProductDetailsSectionProps = {
  control: any
  register: any
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  currentParentDropdownCategories: Array<{ id: number; name: string }>
  categoriesWithSubcategories?: CategoryWithSubcategories[]
  editingProduct?: any
  onImageChange?: (base64: string | null) => void
  currentImageBase64?: string | null
  userRole?: string
  setValue?: (name: string, value: any) => void
  onSave?: (e?: React.BaseSyntheticEvent) => Promise<void>
  isSaving?: boolean
  onTeethBasedChange?: (checked: boolean) => void
  jawPhotos?: { upper?: string | null; lower?: string | null; both?: string | null }
  onJawPhotoChange?: (jawType: JawType, base64: string | null) => void
  /** Lab products require priced fields; superadmin global products omit pricing validation in UI. */
  pricingValidationMode?: "lab_required" | "superadmin_optional"
}

export function ProductDetailsSection({
  control,
  register,
  sections,
  toggleSection,
  getValidationError,
  currentParentDropdownCategories,
  categoriesWithSubcategories = [],
  editingProduct,
  onImageChange,
  currentImageBase64,
  userRole = "",
  setValue,
  onSave,
  isSaving = false,
  onTeethBasedChange,
  jawPhotos = {},
  onJawPhotoChange,
  pricingValidationMode = "lab_required",
}: ProductDetailsSectionProps) {
  const enforceLabPricing = pricingValidationMode === "lab_required"
  const grades = useWatch({ control, name: "grades" }) || []
  const name = useWatch({ control, name: "name" }) || ""
  const code = useWatch({ control, name: "code" }) || ""
  const basePrice = useWatch({ control, name: "base_price" })
  const selectedCategoryId = useWatch({ control, name: "category_id" }) || null
  const subcategoryId = useWatch({ control, name: "subcategory_id" }) || null
  const isSingleStage = useWatch({ control, name: "is_single_stage" }) || "No"
  const isTeethBasedPrice = useWatch({ control, name: "is_teeth_based_price" })
  const hasGradeBasedPricing = useWatch({ control, name: "has_grade_based_pricing" }) === "Yes"

  /** After user turns off "Charge product per tooth", base price should be editable again (not locked by grades). */
  const [unlockBasePriceAfterTeethOff, setUnlockBasePriceAfterTeethOff] = React.useState(false)
  const prevTeethBasedRef = React.useRef<string | undefined>(undefined)
  const prevEditingProductIdRef = React.useRef<unknown>(editingProduct?.id)

  // Run before the teeth-transition effect so switching products does not look like Yes→No.
  React.useEffect(() => {
    const id = editingProduct?.id
    if (prevEditingProductIdRef.current !== id) {
      prevEditingProductIdRef.current = id
      setUnlockBasePriceAfterTeethOff(false)
      prevTeethBasedRef.current = isTeethBasedPrice
    }
  }, [editingProduct?.id, isTeethBasedPrice])

  React.useEffect(() => {
    const cur = isTeethBasedPrice
    const prev = prevTeethBasedRef.current
    if (prev === "Yes" && cur === "No") {
      setUnlockBasePriceAfterTeethOff(true)
    }
    if (cur === "Yes") {
      setUnlockBasePriceAfterTeethOff(false)
    }
    prevTeethBasedRef.current = cur
  }, [isTeethBasedPrice])
  
  const defaultGrade = grades.find((g: any) => g.is_default === "Yes")
  const defaultGradePrice =
    defaultGrade && defaultGrade.price !== undefined && defaultGrade.price !== null && defaultGrade.price !== ""
      ? String(defaultGrade.price)
      : ""
  
  const isCustomDisabled = userRole !== "superadmin" && editingProduct?.is_custom === "No"

  // Typed wrapper for setValue to avoid TypeScript errors
  const setValueWithOptions = React.useCallback((name: string, value: any, options?: any) => {
    if (setValue) {
      (setValue as any)(name, value, options)
    }
  }, [setValue])

  // When editing, set category_id and subcategory_id from the product's data
  const editingCategoryId = editingProduct?.subcategory?.category_id || editingProduct?.subcategory?.category?.id
  const editingSubcategoryId = editingProduct?.subcategory_id || editingProduct?.subcategory?.id
  const [initialEditDone, setInitialEditDone] = React.useState(false)

  // Reset flag when editingProduct changes
  useEffect(() => {
    setInitialEditDone(false)
  }, [editingProduct])

  // Set both category and subcategory from the product API response
  useEffect(() => {
    if (!initialEditDone && setValue && editingProduct) {
      if (editingCategoryId && !selectedCategoryId) {
        setValueWithOptions("category_id", editingCategoryId, { shouldDirty: false })
      }
      if (editingSubcategoryId && !subcategoryId) {
        setValueWithOptions("subcategory_id", editingSubcategoryId, { shouldDirty: false })
      }
      setInitialEditDone(true)
    }
  }, [editingProduct, editingCategoryId, editingSubcategoryId, initialEditDone, selectedCategoryId, subcategoryId, setValueWithOptions, setValue])

  // Sync conditionally-rendered fields from editingProduct after Controllers mount.
  // min/max_days_to_process only render when is_single_stage === "Yes", so they miss the reset().
  // is_teeth_based_price and show_jaw_photo also need explicit sync since their Controllers may not pick up reset values.
  useEffect(() => {
    if (editingProduct && setValue) {
      if (editingProduct.is_teeth_based_price) {
        setValueWithOptions("is_teeth_based_price", editingProduct.is_teeth_based_price, { shouldDirty: false })
      }
      // Auto-toggle show_jaw_photo ON if the product has any jaw photos, regardless of stored flag
      const effectiveShowJawPhoto = productHasAnyJawPhotoUrls(editingProduct)
        ? "Yes"
        : (editingProduct.show_jaw_photo || "No")
      setValueWithOptions("show_jaw_photo", effectiveShowJawPhoto, { shouldDirty: false })
      if (isSingleStage === "Yes") {
        if (editingProduct.min_days_to_process != null) {
          setValueWithOptions("min_days_to_process", editingProduct.min_days_to_process, { shouldDirty: false })
        }
        if (editingProduct.max_days_to_process != null) {
          setValueWithOptions("max_days_to_process", editingProduct.max_days_to_process, { shouldDirty: false })
        }
      }
    }
  }, [editingProduct, isSingleStage, setValue, setValueWithOptions])

  // Categories list with editing product's category injected as fallback
  const categoriesForDropdown = React.useMemo(() => {
    const cats = (categoriesWithSubcategories || []).map((c: any) => {
      const camel = Array.isArray(c.subcategories) ? c.subcategories : []
      const snake = Array.isArray(c.sub_categories) ? c.sub_categories : []
      const subs = camel.length >= snake.length ? camel : snake
      return { ...c, subcategories: [...subs] }
    })
    if (editingProduct?.subcategory) {
      const editCatId = Number(editingProduct.subcategory.category_id || editingProduct.subcategory.category?.id)
      const editCatName = editingProduct.subcategory.category?.name
      const editSub = { id: editingProduct.subcategory.id, name: editingProduct.subcategory.name, category_id: editCatId }
      const existingCat = cats.find((c: any) => Number(c.id) === Number(editCatId))
      if (existingCat) {
        // Ensure the editing product's subcategory is included in the existing category
        if (!existingCat.subcategories?.some((s: any) => s.id === editSub.id)) {
          existingCat.subcategories.push(editSub)
        }
      } else if (editCatId) {
        // Add the category with the editing product's subcategory as fallback
        cats.push({
          id: editCatId,
          name: editCatName || "",
          code: "",
          subcategories: [editSub]
        })
      }
    }
    // Deduplicate by id in case the API or fallback logic produces duplicates
    const seen = new Set<number>()
    return cats.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [categoriesWithSubcategories, editingProduct])

  // Get available subcategories based on selected category
  const availableSubcategories = React.useMemo(() => {
    if (selectedCategoryId == null || selectedCategoryId === "") return []
    const sid = Number(selectedCategoryId)
    const selectedCategory = categoriesForDropdown.find((cat) => Number(cat.id) === sid)
    const subs = selectedCategory?.subcategories || selectedCategory?.sub_categories || []
    return Array.isArray(subs) ? subs : []
  }, [selectedCategoryId, categoriesForDropdown])

  // Clear subcategory when user manually changes category (not during initial edit)
  const prevCategoryRef = React.useRef<number | null>(null)
  useEffect(() => {
    if (selectedCategoryId && prevCategoryRef.current !== null && prevCategoryRef.current !== selectedCategoryId && subcategoryId) {
      setValueWithOptions("subcategory_id", null, { shouldDirty: true })
    }
    prevCategoryRef.current = selectedCategoryId
  }, [selectedCategoryId, subcategoryId, setValueWithOptions])

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  // Track focus state for fields that need orange/red/green validation
  const [focusedFields, setFocusedFields] = useState<{
    base_price: boolean
    min_days_to_process: boolean
    max_days_to_process: boolean
  }>({
    base_price: false,
    min_days_to_process: false,
    max_days_to_process: false,
  })
  
  // Track if fields have been touched (blurred at least once)
  const [touchedFields, setTouchedFields] = useState<{
    base_price: boolean
    min_days_to_process: boolean
    max_days_to_process: boolean
  }>({
    base_price: false,
    min_days_to_process: false,
    max_days_to_process: false,
  })

  // Initialize image preview: prefer newly uploaded image (currentImageBase64), fall back to existing URL
  useEffect(() => {
    if (currentImageBase64) {
      setImagePreview(currentImageBase64)
    } else if (editingProduct?.image_url) {
      const url = editingProduct.image_url
      // Add cache buster if it's a URL
      const buster = `t=${new Date().getTime()}`
      const finalUrl = url.includes("?") ? `${url}&${buster}` : `${url}?${buster}`
      setImagePreview(finalUrl)
    } else {
      setImagePreview(null)
    }
  }, [currentImageBase64, editingProduct?.image_url])

  // Update base_price when default grade price changes (skip while base price was unlocked after teeth-based was turned off)
  useEffect(() => {
    if (unlockBasePriceAfterTeethOff) return
    if (sections.grades && defaultGradePrice) {
      // Avoid dirtying the form on initial edit hydration if the value already matches.
      // Only mark dirty when we are actually changing the value (e.g., user changed default grade/price).
      const current = basePrice !== null && basePrice !== undefined ? String(basePrice) : ""
      if (current === defaultGradePrice) return
      setValueWithOptions("base_price", defaultGradePrice, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [defaultGradePrice, sections.grades, setValueWithOptions, basePrice, unlockBasePriceAfterTeethOff])

  // Auto-generate code from name when name changes (only for new products, not editing)
  useEffect(() => {
    if (!editingProduct && name && typeof name === "string") {
      const generatedCode = generateCodeFromName(name)
      if (generatedCode) {
        setValueWithOptions("code", generatedCode, { shouldDirty: true })
      }
    }
  }, [name, setValueWithOptions, editingProduct])

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        if (onImageChange) {
          onImageChange(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
      if (onImageChange) {
        onImageChange(null)
      }
    }
  }
  
  const handlePreviewClick = () => {
    if (imagePreview) setShowPreviewModal(true)
  }

  const hasErrors =
    getValidationError("name") ||
    getValidationError("code") ||
    getValidationError("category_id") ||
    getValidationError("subcategory_id") ||
    getValidationError("base_price") ||
    getValidationError("teeth_price_per_tooth") ||
    getValidationError("teeth_first_tooth_price") ||
    getValidationError("teeth_additional_tooth_price") ||
    getValidationError("teeth_custom_prices") ||
    getValidationError("jaw_photos.upper") ||
    getValidationError("jaw_photos.lower") ||
    getValidationError("jaw_photos.both") ||
    Array.from({ length: MAX_TEETH }, (_, i) => getValidationError(`teeth_custom_prices.${i}`)).some(Boolean)

  // Helper function to determine validation state based on focus and value
  const getValidationState = (
    fieldName: "base_price" | "min_days_to_process" | "max_days_to_process",
    value: any,
    isRequired: boolean = true
  ): "default" | "valid" | "warning" | "error" => {
    const hasValue = value !== null && value !== undefined && value !== ""
    const isFocused = focusedFields[fieldName]
    const isTouched = touchedFields[fieldName]
    const hasError = getValidationError(fieldName)

    if (hasError) {
      return "error"
    }

    // Required lab base price: green only when strictly positive (default "0" is not valid)
    if (fieldName === "base_price" && isRequired) {
      const raw = String(value ?? "").trim()
      if (raw !== "") {
        const n = parseFloat(raw)
        if (Number.isFinite(n) && n > 0) {
          return "valid"
        }
        if (!Number.isFinite(n) || n <= 0) {
          if (isFocused) return "warning"
          if (isTouched) return "error"
          return "default"
        }
      }
    } else if (hasValue && !hasError) {
      return "valid"
    }

    // If focused and empty, show orange (warning)
    if (isFocused && !hasValue) {
      return "warning"
    }

    // If blurred (touched) and empty and required, show red (error)
    if (!isFocused && isTouched && !hasValue && isRequired) {
      return "error"
    }

    return "default"
  }

  return (
    <div className="px-4 sm:px-6 py-6 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <Switch
          checked={sections.productDetails}
          onCheckedChange={() => toggleSection("productDetails")}
          className="data-[state=checked]:bg-[#1162a8]"
        />
        <span className="font-semibold text-xl text-gray-900">
          Product Details
        </span>
        {hasErrors && (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
      
      <div className={cn("space-y-6", !sections.productDetails && "opacity-50 pointer-events-none select-none")}>
          {/* Image Upload Section - Full Width on Mobile, Side on Desktop */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Image Upload */}
            <div className="flex flex-col items-center sm:items-start gap-3 flex-shrink-0">
              <div
                className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
                onClick={handleImageClick}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="object-contain h-full w-full rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-600">
                    <i className="fas fa-cloud-upload-alt text-3xl mb-2"></i>
                    <span className="text-xs font-medium">Upload Image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </div>
              <span className="text-xs text-gray-500 text-center sm:text-left max-w-[140px] sm:max-w-[160px]">
                Click to upload product image
              </span>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handlePreviewClick}
                  disabled={!imagePreview}
                  className="w-full sm:w-auto"
                >
                  Preview
                </Button>
                {imagePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      if (onImageChange) {
                        onImageChange(null)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Main Form Fields */}
            <div className="flex-1 space-y-4 w-full">
              {/* Product Name and Product Code - First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}  
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Product Name"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      validationState={getValidationError("name") ? "error" : (name ? "valid" : "default")}
                      required
                      disabled={isCustomDisabled}
                    />
                  )}
                />

                {/* Product Code */}
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Product Code"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      validationState={getValidationError("code") ? "error" : (code ? "valid" : "default")}
                      required
                      disabled={isCustomDisabled}
                    />
                  )}
                />
              </div>

              {/* Category and Subcategory - Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => {
                      const cid = field.value != null && field.value !== "" ? Number(field.value) : NaN
                      const selectedCategory = categoriesForDropdown.find((cat) => Number(cat.id) === cid)
                      const hasValue = !!selectedCategory
                      const hasError = getValidationError("category_id")

                      return (
                        <div className="relative">
                          {(hasValue || hasError) && (
                            <label
                              className={cn(
                                "absolute -top-2 left-3 bg-white px-1 text-xs transition-all z-10",
                                hasError
                                  ? "text-[#CF0202]"
                                  : hasValue
                                    ? "text-[#119933]"
                                    : "text-[#CF0202]"
                              )}
                            >
                              Category *
                            </label>
                          )}
                          <Select
                            value={hasValue ? String(field.value) : ""}
                            onValueChange={(value) => {
                              const numValue = value ? Number(value) : null
                              field.onChange(numValue)
                              // Clear subcategory when category changes
                              setValueWithOptions("subcategory_id", null, { shouldDirty: true })
                            }}
                            disabled={isCustomDisabled}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-14 pt-6 pb-2 rounded-lg border-2 transition-all",
                                hasError
                                  ? "border-[#CF0202]"
                                  : hasValue
                                    ? "border-[#119933]"
                                    : "border-[#E0E0E0]"
                              )}
                            >
                              <SelectValue placeholder={hasValue ? "" : "Select Category *"} />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriesForDropdown?.length > 0 ? (
                                categoriesForDropdown.map((cat) => (
                                  <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-categories" disabled>
                                  No categories available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    }}
                  />
                </div>

                {/* Subcategory Selection */}
                <div className="space-y-2">
                  <Controller
                    name="subcategory_id"
                    control={control}
                    render={({ field }) => {
                      const vid = field.value != null && field.value !== "" ? Number(field.value) : NaN
                      const selectedSubcategory = availableSubcategories.find((sub) => Number(sub.id) === vid)
                      const hasValue = !!selectedSubcategory
                      const hasError = getValidationError("subcategory_id")

                      return (
                        <div className="relative">
                          {(hasValue || hasError) && (
                            <label
                              className={cn(
                                "absolute -top-2 left-3 bg-white px-1 text-xs transition-all z-10",
                                hasError
                                  ? "text-[#CF0202]"
                                  : hasValue
                                    ? "text-[#119933]"
                                    : "text-[#CF0202]"
                              )}
                            >
                              Subcategory *
                            </label>
                          )}
                          <Select
                            value={hasValue ? String(field.value) : ""}
                            onValueChange={(value) => {
                              field.onChange(value ? Number(value) : null)
                            }}
                            disabled={!selectedCategoryId || isCustomDisabled}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-14 pt-6 pb-2 rounded-lg border-2 transition-all",
                                hasError
                                  ? "border-[#CF0202]"
                                  : hasValue
                                    ? "border-[#119933]"
                                    : "border-[#E0E0E0]",
                                (!selectedCategoryId || isCustomDisabled) && "opacity-40 cursor-not-allowed bg-gray-50"
                              )}
                            >
                              <SelectValue
                                placeholder={hasValue ? "" : (selectedCategoryId ? "Select Subcategory *" : "Select category first")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSubcategories.length > 0 ? (
                                availableSubcategories.map((subcat) => (
                                  <SelectItem key={subcat.id} value={String(subcat.id)}>
                                    {subcat.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-subcategories" disabled>
                                  {selectedCategoryId 
                                    ? "No subcategories available" 
                                    : "Please select a category first"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Show Jaw Photo Toggle + Uploads */}
          <ShowJawPhotoSection
            control={control}
            jawPhotos={jawPhotos}
            onJawPhotoChange={onJawPhotoChange ?? (() => {})}
            getValidationError={getValidationError}
          />

          {/* Base Price - Third Row */}
          <div className="grid gap-4 grid-cols-1">
            {/* Base Price */}
            <div className="space-y-2">
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="absolute right-2 top-2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help z-10" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {sections.grades &&
                        defaultGradePrice &&
                        (isTeethBasedPrice === "Yes" ||
                          (hasGradeBasedPricing && !unlockBasePriceAfterTeethOff))
                          ? "Base price is automatically set by the default grade price"
                          : "Enter the base price for this product"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Controller
                  name="base_price"
                  control={control}
                  render={({ field }) => {
                    // Lock when default grade drives base_price: teeth-based, or grade-based (unless user just turned off teeth-based)
                    const isLockedByGrades =
                      sections.grades &&
                      !!defaultGradePrice &&
                      (isTeethBasedPrice === "Yes" ||
                        (hasGradeBasedPricing && !unlockBasePriceAfterTeethOff))
                    const currentValue = isLockedByGrades ? defaultGradePrice : (field.value || "")
                    const hasError = getValidationError("base_price")
                    const validationState = isLockedByGrades
                      ? "disabled"
                      : getValidationState("base_price", currentValue, enforceLabPricing)

                    return (
                      <div className="relative">
                        <Input
                          label={enforceLabPricing ? "Base Price *" : "Base Price"}
                          className={`pl-8 ${
                            isLockedByGrades
                              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentValue}
                          onChange={(e) => field.onChange(e.target.value)}
                          onFocus={() => {
                            if (!isLockedByGrades) {
                              setFocusedFields(prev => ({ ...prev, base_price: true }))
                            }
                          }}
                          onBlur={(e) => {
                            if (!isLockedByGrades) {
                              setFocusedFields(prev => ({ ...prev, base_price: false }))
                              setTouchedFields(prev => ({ ...prev, base_price: true }))
                            }
                            field.onBlur()
                          }}
                          disabled={isLockedByGrades}
                          validationState={validationState}
                          errorMessage={hasError ? getValidationError("base_price") : undefined}
                          required={enforceLabPricing}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
                          $
                        </span>
                      </div>
                    )
                  }}
                />
              </div>
            </div>
          </div>

          {/* Product configuration flags — single row */}
          <div className="flex flex-row flex-wrap gap-x-12 gap-y-4">
            {/* Is Single Stage Radio Button */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Is Single Stage
              </label>
              <Controller
                name="is_single_stage"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value || "No"}
                    onValueChange={(value) => field.onChange(value)}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Yes"
                        id="is_single_stage-yes"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="is_single_stage-yes" className="text-sm font-medium cursor-pointer">
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="No"
                        id="is_single_stage-no"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="is_single_stage-no" className="text-sm font-medium cursor-pointer">
                        No
                      </label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Is Splinted Radio Button */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Is Splinted
              </label>
              <Controller
                name="is_splinted"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value || "No"}
                    onValueChange={(value) => field.onChange(value)}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Yes"
                        id="is_splinted-yes"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="is_splinted-yes" className="text-sm font-medium cursor-pointer">
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="No"
                        id="is_splinted-no"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="is_splinted-no" className="text-sm font-medium cursor-pointer">
                        No
                      </label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Gender Required */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Gender Required
              </label>
              <Controller
                name="gender_required"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value || "No"}
                    onValueChange={(value) => field.onChange(value)}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Yes"
                        id="gender_required-yes"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="gender_required-yes" className="text-sm font-medium cursor-pointer">
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="No"
                        id="gender_required-no"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="gender_required-no" className="text-sm font-medium cursor-pointer">
                        No
                      </label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Age Required */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Age Required
              </label>
              <Controller
                name="age_required"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value || "No"}
                    onValueChange={(value) => field.onChange(value)}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Yes"
                        id="age_required-yes"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="age_required-yes" className="text-sm font-medium cursor-pointer">
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="No"
                        id="age_required-no"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="age_required-no" className="text-sm font-medium cursor-pointer">
                        No
                      </label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          {/* Min and Max Days to Process - Show only when is_single_stage is "Yes" */}
          {isSingleStage === "Yes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Min Days to Process */}
              <div className="space-y-2">
                <Controller
                  name="min_days_to_process"
                  control={control}
                  render={({ field }) => {
                    const validationState = getValidationState("min_days_to_process", field.value, true)
                    return (
                      <Input
                        label="Min Days to Process *"
                        type="number"
                        min="1"
                        value={field.value !== null && field.value !== undefined ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        onFocus={() => {
                          setFocusedFields(prev => ({ ...prev, min_days_to_process: true }))
                        }}
                        onBlur={(e) => {
                          setFocusedFields(prev => ({ ...prev, min_days_to_process: false }))
                          setTouchedFields(prev => ({ ...prev, min_days_to_process: true }))
                          field.onBlur()
                        }}
                        validationState={validationState}
                        errorMessage={getValidationError("min_days_to_process") || undefined}
                        required
                      />
                    )
                  }}
                />
              </div>

              {/* Max Days to Process */}
              <div className="space-y-2">
                <div className="relative">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="absolute right-2 top-2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help z-10" />
                      </TooltipTrigger>
                      <TooltipContent side="left" align="start">
                        <p>Maximum number of days required to process this product</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Controller
                    name="max_days_to_process"
                    control={control}
                    render={({ field }) => {
                      const validationState = getValidationState("max_days_to_process", field.value, true)
                      return (
                        <Input
                          label="Max Days to Process *"
                          type="number"
                          min="1"
                          value={field.value !== null && field.value !== undefined ? field.value : ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          onFocus={() => {
                            setFocusedFields(prev => ({ ...prev, max_days_to_process: true }))
                          }}
                          onBlur={(e) => {
                            setFocusedFields(prev => ({ ...prev, max_days_to_process: false }))
                            setTouchedFields(prev => ({ ...prev, max_days_to_process: true }))
                            field.onBlur()
                          }}
                          validationState={validationState}
                          errorMessage={getValidationError("max_days_to_process") || undefined}
                          required
                        />
                      )
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Charge per tooth Toggle */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Controller
                name="is_teeth_based_price"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value === "Yes"}
                    onCheckedChange={(checked) => {
                      field.onChange(checked ? "Yes" : "No")
                      onTeethBasedChange?.(checked)
                    }}
                    className="data-[state=checked]:bg-[#1162a8]"
                  />
                )}
              />
              <label className="text-sm font-medium text-gray-700">
                Charge product per tooth
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable this option if the product should be charged per tooth</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Per-tooth pricing options — only visible when toggle is ON */}
            <TeethPricingSection
              control={control}
              setValue={setValue}
              pricingValidationMode={pricingValidationMode}
              getValidationError={getValidationError}
            />
          </div>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent
          className="flex flex-col items-center justify-center p-0 max-w-[95vw] max-h-[95vh]"
          style={{
            width: "100vw",
            height: "100vh",
            maxWidth: "100vw",
            maxHeight: "100vh",
            borderRadius: 0,
            boxShadow: "none",
            padding: 0,
            background: "transparent",
            overflow: "visible",
          }}
        >
          <div className="flex flex-col items-center justify-center w-full h-full">
            <img
              src={imagePreview || ""}
              alt="Preview"
              className="w-auto h-auto max-w-[90vw] max-h-[80vh] object-contain rounded-lg mb-8"
              style={{ background: "transparent" }}
            />
            <div className="w-full flex justify-center">
              <Button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="mt-4 text-lg px-8 py-4 rounded-full font-bold bg-[#1162a8] text-white hover:bg-[#0d4d87] transition-colors min-w-[180px]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
