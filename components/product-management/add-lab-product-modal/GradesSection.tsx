import React, { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Controller, Control, UseFormWatch, UseFormSetValue } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronDown, Info, Plus, AlertCircle, X, Check } from "lucide-react"
import { ProductCreateForm } from "@/lib/schemas"

interface Grade {
  id: number | string
  name: string
  sequence?: number
  price?: string
}

type WatchedGrade = NonNullable<ProductCreateForm["grades"]>[number]

interface GradesSectionProps {
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
}: GradesSectionProps) {
  const watchedGrades = watch("grades") || []
  const watchedHasGradeBasedPricing = watch("has_grade_based_pricing")
  const watchedMaxDaysToProcess = watch("max_days_to_process")
  const watchedBasePrice = watch("base_price")
  
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
  useEffect(() => {
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
  }, [watchedBasePrice, watchedGrades, watchedHasGradeBasedPricing, grades, setValue])

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
    const grade = watchedGrades.find((g) => g.grade_id === gradeId)
    const updated = watchedGrades.map((g) =>
      g.grade_id === gradeId
        ? { ...g, is_default: isDefault, price: g.price && g.price !== "" ? g.price : "" }
        : { ...g, is_default: "No" as const }
    )
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
      // Add grade, initialize price to empty string if not provided
      updated = [
        ...watchedGrades,
        {
          grade_id: gradeId as number,
          is_default: "No" as const,
          price: extra?.price !== undefined && extra?.price !== "" ? extra.price : "",
        },
      ] as NonNullable<ProductCreateForm["grades"]>
    }
    setValue("grades", updated, { shouldDirty: true })
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Grades</span>
          {sectionHasErrors(["grades"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
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
        <div className="px-2 sm:px-6 pb-6"> {/* Add px-2 for mobile, sm:px-6 for desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
            <Label htmlFor="grade-based-pricing" className="whitespace-nowrap">Does this product have grade-based pricing?</Label>
            <Controller
              name="has_grade_based_pricing"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-row gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="grade-pricing-yes" />
                    <Label htmlFor="grade-pricing-yes" className="cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="grade-pricing-no" />
                    <Label htmlFor="grade-pricing-no" className="cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>
          <ValidationError message={getValidationError("has_grade_based_pricing")} />
          {/* Hide price input and auto-billing for superadmin */}
          {watchedHasGradeBasedPricing === "Yes" && (
            <>
              <div className="border-b pb-2 mb-2 flex items-center">
                <span className="mx-auto font-semibold text-gray-700">Product Price</span>
              </div>
              <div className="space-y-2">
                {/* Render existing grades from backend */}
                {((Array.isArray(grades) ? grades : grades?.data) || []).map((grade: Grade) => {
                  const isSelected = watchedGrades.some((g) => g.grade_id === grade.id)
                  const isDefault = watchedGrades.find((g) => g.grade_id === grade.id)?.is_default === "Yes"
                  const gradeObj = watchedGrades.find((g) => g.grade_id === grade.id)
                  // Find the index of this grade in the watchedGrades array for validation error lookup
                  const gradeIndexInWatched = watchedGrades.findIndex((g) => g.grade_id === grade.id)
                  // Get validation error for this specific grade's price
                  // Try multiple error path formats (zod/react-hook-form may use different formats)
                  const priceError = gradeIndexInWatched >= 0 
                    ? (getValidationError(`grades.${gradeIndexInWatched}.price`) || 
                       getValidationError(`grades[${gradeIndexInWatched}].price`))
                    : undefined
                  // Check if price is 0 or invalid (real-time validation)
                  const isZero = isPriceZeroOrInvalid(gradeObj?.price)
                  const hasPriceError = priceError !== undefined || isZero
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
                            onChange={e => {
                              const updated = watchedGrades.map((g) =>
                                g.grade_id === grade.id ? { ...g, price: e.target.value } : g
                              )
                              setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, { shouldDirty: true, shouldValidate: true })
                            }}
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
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
                      {isSelected && hasPriceError && (
                        <ValidationError 
                          message={priceError || "Price must be greater than 0"} 
                          className="ml-2 mt-0 flex-shrink-0" 
                        />
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
                    const gradeIndexInWatched = watchedGrades.findIndex((g) => g.grade_id === customGradeId)
                    const priceError = gradeIndexInWatched >= 0 
                      ? (getValidationError(`grades.${gradeIndexInWatched}.price`) || 
                         getValidationError(`grades[${gradeIndexInWatched}].price`))
                      : undefined
                    const isZero = isPriceZeroOrInvalid(customGrade.price)
                    const hasPriceError = priceError !== undefined || isZero
                    
                    return (
                      <div key={customGradeId} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <Checkbox
                            className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                            checked={true}
                            onCheckedChange={() => {
                              // Remove custom grade
                              const updated = watchedGrades.filter((g) => g.grade_id !== customGradeId) as NonNullable<ProductCreateForm["grades"]>
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
                              onChange={e => {
                                const updated = watchedGrades.map((g) =>
                                  g.grade_id === customGradeId ? { ...g, price: e.target.value } : g
                                )
                                setValue("grades", updated as NonNullable<ProductCreateForm["grades"]>, { shouldDirty: true, shouldValidate: true })
                              }}
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
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
                        {hasPriceError && (
                          <ValidationError 
                            message={priceError || "Price must be greater than 0"} 
                            className="ml-2 mt-0 flex-shrink-0" 
                          />
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
      )}
    </div>
  )
}
