import React, { useRef, useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Controller, useWatch } from "react-hook-form"
import { AlertCircle } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateCodeFromName, cn } from "@/lib/utils"
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
import { Info } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type CategoryWithSubcategories = {
  id: number
  name: string
  code: string
  subcategories: Array<{ id: number; name: string; category_id: number }>
}

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
  userRole?: string
  setValue?: (name: string, value: any) => void
  onSave?: (e?: React.BaseSyntheticEvent) => Promise<void>
  isSaving?: boolean
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
  userRole = "",
  setValue,
  onSave,
  isSaving = false,
}: ProductDetailsSectionProps) {
  const grades = useWatch({ control, name: "grades" }) || []
  const name = useWatch({ control, name: "name" }) || ""
  const code = useWatch({ control, name: "code" }) || ""
  const selectedCategoryId = useWatch({ control, name: "category_id" }) || null
  const subcategoryId = useWatch({ control, name: "subcategory_id" }) || null
  const isSingleStage = useWatch({ control, name: "is_single_stage" }) || "No"
  
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

  // Get available subcategories based on selected category
  const availableSubcategories = React.useMemo(() => {
    if (!selectedCategoryId || categoriesWithSubcategories.length === 0) {
      return []
    }
    const selectedCategory = categoriesWithSubcategories.find(cat => cat.id === selectedCategoryId)
    return selectedCategory?.subcategories || []
  }, [selectedCategoryId, categoriesWithSubcategories])

  // When editing, determine category from subcategory_id
  useEffect(() => {
    if (editingProduct?.subcategory_id && categoriesWithSubcategories.length > 0 && !selectedCategoryId && setValue) {
      // Find the category that contains this subcategory
      const category = categoriesWithSubcategories.find(cat => 
        cat.subcategories.some(sub => sub.id === editingProduct.subcategory_id)
      )
      if (category) {
        setValueWithOptions("category_id", category.id, { shouldDirty: false })
      }
    }
  }, [editingProduct?.subcategory_id, categoriesWithSubcategories, selectedCategoryId, setValueWithOptions])

  // Clear subcategory when category changes
  useEffect(() => {
    if (selectedCategoryId && setValue && subcategoryId) {
      // Check if current subcategory belongs to selected category
      const selectedCategory = categoriesWithSubcategories.find(cat => cat.id === selectedCategoryId)
      const subcategoryExists = selectedCategory?.subcategories.some(sub => sub.id === subcategoryId)
      if (!subcategoryExists) {
        setValueWithOptions("subcategory_id", null, { shouldDirty: true })
      }
    }
  }, [selectedCategoryId, categoriesWithSubcategories, subcategoryId, setValueWithOptions])

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

  // Initialize image preview with existing image when editing
  useEffect(() => {
    if (editingProduct?.image_url) {
      setImagePreview(editingProduct.image_url)
    }
  }, [editingProduct?.image_url])

  // Update base_price when default grade price changes
  useEffect(() => {
    if (sections.grades && defaultGradePrice) {
      setValueWithOptions("base_price", defaultGradePrice, { shouldDirty: true, shouldValidate: true })
    }
  }, [defaultGradePrice, sections.grades, setValueWithOptions])

  // Auto-generate code from name when name changes
  useEffect(() => {
    if (name && typeof name === "string") {
      const generatedCode = generateCodeFromName(name)
      if (generatedCode) {
        setValueWithOptions("code", generatedCode, { shouldDirty: true })
      }
    }
  }, [name, setValueWithOptions])

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

  const hasErrors = getValidationError("name") || getValidationError("code") || getValidationError("category_id") || getValidationError("subcategory_id") || getValidationError("base_price")

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

    // If has value and no error, show green (valid)
    if (hasValue && !hasError) {
      return "valid"
    }

    // If focused and empty, show orange (warning)
    if (isFocused && !hasValue) {
      return "warning"
    }

    // If blurred (touched) and empty and required, show red (error)
    // Also show error if there's a validation error
    if ((!isFocused && isTouched && !hasValue && isRequired) || hasError) {
      return "error"
    }

    // Default state
    return "default"
  }

  return (
    <div className="px-4 sm:px-6 py-6 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-xl text-gray-900">
            Product Details
          </span>
          {hasErrors && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={sections.productDetails}
            onCheckedChange={() => toggleSection("productDetails")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
        </div>
      </div>
      
      {sections.productDetails && (
        <div className="space-y-6">
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
                    className="object-cover h-full w-full rounded-xl"
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
                <Input
                  label="Product Name"
                  placeholder="Enter product name"
                  {...register("name")}
                  validationState={getValidationError("name") ? "error" : (name ? "valid" : "default")}
                  required
                  disabled={isCustomDisabled}
                />

                {/* Product Code */}
                <Input
                  label="Product Code"
                  placeholder="Enter product code"
                  {...register("code")}
                  validationState={getValidationError("code") ? "error" : (code ? "valid" : "default")}
                  required
                  disabled={isCustomDisabled}
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
                      const hasValue = field.value !== null && field.value !== undefined && field.value !== ""
                      const selectedCategory = categoriesWithSubcategories.find(cat => cat.id === field.value)
                      const displayValue = selectedCategory?.name || ""
                      const isFocused = false // Select doesn't expose focus state easily, but label shows when value exists
                      
                      return (
                        <div className="relative">
                          {(hasValue || isFocused) && (
                            <label
                              className={cn(
                                "absolute -top-2 left-3 bg-white px-1 text-xs transition-all z-10",
                                getValidationError("category_id")
                                  ? "text-[#CF0202]"
                                  : hasValue
                                    ? "text-[#119933]"
                                    : "text-gray-500"
                              )}
                            >
                              Category *
                            </label>
                          )}
                          <Select
                            value={field.value ? String(field.value) : ""}
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
                                getValidationError("category_id")
                                  ? "border-[#CF0202]"
                                  : hasValue
                                    ? "border-[#119933]"
                                    : "border-[#E0E0E0]"
                              )}
                            >
                              <SelectValue placeholder={hasValue ? "" : "Select Category *"} />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriesWithSubcategories?.length > 0 ? (
                                categoriesWithSubcategories.map((cat) => (
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
                      const hasValue = field.value !== null && field.value !== undefined && field.value !== ""
                      const selectedSubcategory = availableSubcategories.find(sub => sub.id === field.value)
                      const displayValue = selectedSubcategory?.name || ""
                      
                      return (
                        <div className="relative">
                          {(hasValue) && (
                            <label
                              className={cn(
                                "absolute -top-2 left-3 bg-white px-1 text-xs transition-all z-10",
                                getValidationError("subcategory_id")
                                  ? "text-[#CF0202]"
                                  : hasValue
                                    ? "text-[#119933]"
                                    : "text-gray-500"
                              )}
                            >
                              Subcategory *
                            </label>
                          )}
                          <Select
                            value={field.value ? String(field.value) : ""}
                            onValueChange={(value) => {
                              field.onChange(value ? Number(value) : null)
                            }}
                            disabled={!selectedCategoryId || isCustomDisabled}
                          >
                            <SelectTrigger 
                              className={cn(
                                "h-14 pt-6 pb-2 rounded-lg border-2 transition-all",
                                getValidationError("subcategory_id")
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
                        {sections.grades 
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
                    const currentValue = sections.grades ? defaultGradePrice : (field.value || "")
                    const hasError = getValidationError("base_price")
                    const validationState = sections.grades 
                      ? "disabled" 
                      : getValidationState("base_price", currentValue, true)
                    
                    return (
                      <div className="relative">
                        <Input
                          label="Base Price *"
                          placeholder="0.00"
                          className={`h-14 pl-8 ${
                            sections.grades 
                              ? "border-gray-200 bg-gray-50 cursor-not-allowed" 
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentValue}
                          onChange={(e) => field.onChange(e.target.value)}
                          onFocus={() => {
                            if (!sections.grades) {
                              setFocusedFields(prev => ({ ...prev, base_price: true }))
                            }
                          }}
                          onBlur={(e) => {
                            if (!sections.grades) {
                              setFocusedFields(prev => ({ ...prev, base_price: false }))
                              setTouchedFields(prev => ({ ...prev, base_price: true }))
                            }
                            field.onBlur()
                          }}
                          disabled={sections.grades}
                          validationState={validationState}
                          errorMessage={hasError ? getValidationError("base_price") : undefined}
                          required
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

          {/* Is Single Stage Radio Button */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Is Single Stage
            </label>
            <Controller
              name="is_single_stage"
              control={control}
              defaultValue="No"
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
                        placeholder="Enter minimum days"
                        className="h-14"
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
                          placeholder="Enter maximum days"
                          className="h-14"
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
          <div className="flex items-center gap-3">
            <Controller
              name="is_teeth_based_price"
              control={control}
              defaultValue="No"
              render={({ field }) => (
                <Switch
                  checked={field.value === "Yes"}
                  onCheckedChange={(checked) => field.onChange(checked ? "Yes" : "No")}
                  className="data-[state=checked]:bg-[#1162a8]"
                />
              )}
            />
            <label className="text-sm font-medium text-gray-700">
              Charge per tooth
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
        </div>
      )}

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
