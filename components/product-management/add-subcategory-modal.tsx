"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useProductCategory, type ProductCategory } from "@/contexts/product-category-context"
import { useProductLibrary, type CasePan } from "@/contexts/product-case-pan-context"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { generateCodeFromName } from "@/lib/utils"

interface AddSubCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  editId?: number
  disableAllFields?: boolean
  isCopying?: boolean
  copyingSubCategory?: ProductCategory | null
}

const NO_PARENT_CATEGORIES_VALUE = "__NO_PARENT_CATEGORIES__"

// Zod schema for validation
const subCategorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  code: z.string().min(1, "Code is required."),
  type: z.string().min(1, "Arch type is required."),
  status: z.string().min(1, "Status is required."),
  parent_id: z.number({ required_error: "Parent category is required for sub-category." }),
  case_pan_id: z.union([z.number(), z.null()]).refine(val => val !== null, {
    message: "Case Pan is required.",
  }),
})

export function AddSubCategoryModal({ 
  isOpen, 
  onClose, 
  editId, 
  disableAllFields, 
  isCopying = false, 
  copyingSubCategory = null 
}: AddSubCategoryModalProps) {
  const {
    createSubCategory,
    updateCategory,
    isLoading: isCategoryActionLoading,
    parentDropdownCategories,
    fetchParentDropdownCategories,
    getSubCategoryDetail,
  } = useProductCategory()

  const { casePans, fetchCasePans, isLoading: isCasePanLoading } = useProductLibrary()
  const { t } = useTranslation()
  
  const initialFormData = {
    name: "",
    code: "",
    type: "Both",
    sequence: 1,
    status: "Active",
    parent_id: null as number | null,
    case_pan_id: null as number | null,
  }

  const [formData, setFormData] = useState(initialFormData)
  const [categoryDetailsEnabled, setCategoryDetailsEnabled] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailLoadedId, setDetailLoadedId] = useState<number | null>(null)
  const [isCustomValue, setIsCustomValue] = useState<string | undefined>(undefined)
  const [disableEditFields, setDisableEditFields] = useState(false)

  // Image state management
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine user role (same pattern as context)
  const userRole = localStorage.getItem("role")
  
  const isLabAdmin = userRole === "lab_admin"
  const isSuperAdmin = userRole === "superadmin"

  // Use disableAllFields to override disableEditFields, but allow superadmin to edit
  const effectiveDisableFields = isSuperAdmin ? false : (disableAllFields || disableEditFields)

  // Initialize image when editing
  useEffect(() => {
    if (editId && detailLoadedId) {
      // Image will be loaded from the detail data in the main useEffect
    } else {
      setImageBase64(null)
      setImagePreview(null)
    }
  }, [editId, detailLoadedId])

  // Always fetch detail in edit mode
  useEffect(() => {
    if (isOpen && isCopying && copyingSubCategory) {
      // Copying: use the provided copyingSubCategory data directly
      setFormData({
        name: copyingSubCategory.sub_name || copyingSubCategory.name || "",
        code: copyingSubCategory.code || "",
        type: copyingSubCategory.type || "Both",
        sequence: copyingSubCategory.sequence || 1,
        status: copyingSubCategory.status || "Active",
        parent_id: copyingSubCategory.parent_id ?? (copyingSubCategory as any).category_id ?? null,
        case_pan_id: (copyingSubCategory as any).case_pan_id ?? null,
      })
      setDetailLoadedId(null)
      setIsCustomValue(undefined)
      setDisableEditFields(false)
      
      // Set image if available
      if ((copyingSubCategory as any).image_url) {
        setImageBase64((copyingSubCategory as any).image_url)
        setImagePreview((copyingSubCategory as any).image_url)
      } else {
        setImageBase64(null)
        setImagePreview(null)
      }
      fetchCasePans()
      fetchParentDropdownCategories()
    } else if (isOpen && editId && !isCopying) {
      // Editing: fetch detail from API
      setIsDetailLoading(true)
      getSubCategoryDetail(editId).then((detail) => {
        if (detail) {
          setFormData({
            name: detail.sub_name || detail.name || "",
            code: detail.code || "",
            type: detail.type || "Both",
            sequence: detail.sequence || 1,
            status: detail.status || "Active",
            parent_id: detail.parent_id ?? (detail as any).category_id ?? null,
            case_pan_id: detail.case_pan_id ?? null,
          })
          setDetailLoadedId(editId)
          setIsCustomValue((detail as any).is_custom)
          
          // Set image if available
          if (detail.image_url) {
            setImageBase64(detail.image_url)
            setImagePreview(detail.image_url)
          } else {
            setImageBase64(null)
            setImagePreview(null)
          }
        }
        setIsDetailLoading(false)
      })
      fetchCasePans()
      fetchParentDropdownCategories()
    } else if (isOpen && !editId && !isCopying) {
      // New subcategory: reset form
      resetForm()
      setIsDetailLoading(false)
      setDetailLoadedId(null)
      setIsCustomValue(undefined)
      setDisableEditFields(false)
      fetchCasePans()
      fetchParentDropdownCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editId, isCopying, copyingSubCategory])

  // Use detailLoadedId to control readonly/disabled state
  useEffect(() => {
    // Superadmin can always edit, so never disable fields for superadmin
    if (isSuperAdmin) {
      setDisableEditFields(false)
      return
    }
    // For lab_admin, disable editing if it's an original subcategory (is_custom === "No")
    if (
      detailLoadedId &&
      isLabAdmin &&
      isCustomValue === "No"
    ) {
      setDisableEditFields(true)
    } else {
      setDisableEditFields(false)
    }
  }, [detailLoadedId, isLabAdmin, isSuperAdmin, isCustomValue])

  useEffect(() => {
    const hasFormChanges =
      formData.name !== initialFormData.name ||
      formData.code !== initialFormData.code ||
      formData.type !== initialFormData.type ||
      formData.status !== initialFormData.status ||
      formData.case_pan_id !== initialFormData.case_pan_id ||
      formData.parent_id !== initialFormData.parent_id ||
      imageBase64 !== null
    setHasChanges(hasFormChanges)
  }, [formData, initialFormData, imageBase64])

  const handleInputChange = (field: string, value: string | number | null) => {
    if (value === NO_PARENT_CATEGORIES_VALUE) {
      return
    }
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      }
      // Auto-generate code from name when name changes
      if (field === "name" && typeof value === "string") {
        const generatedCode = generateCodeFromName(value)
        if (generatedCode) {
          updated.code = generatedCode
        }
      }
      return updated
    })
  }

  const handleArchChange = (archLabel: string) => {
    let apiArchValue = "Both"
    if (archLabel === "Upper arch only") apiArchValue = "Upper"
    else if (archLabel === "Lower arch only") apiArchValue = "Lower"
    handleInputChange("type", apiArchValue)
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setCategoryDetailsEnabled(true)
    setHasChanges(false)
    setImageBase64(null)
    setImagePreview(null)
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      resetForm()
      onClose()
    }
  }

  const handleDiscard = () => {
    setShowDiscardDialog(false)
    resetForm()
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  // Image handling functions
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        setImageBase64(reader.result as string)
        setHasChanges(true)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
      setImageBase64(null)
      setHasChanges(true)
    }
    // Clear the input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    setHasChanges(true)
    // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePreviewClick = () => {
    if (imagePreview) setShowPreviewModal(true)
  }

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  const handleSaveSubCategory = async () => {
    setErrorMessage(null)
    setValidationErrors({})

    // Zod validation
    const zodResult = subCategorySchema.safeParse(formData)

    if (!zodResult.success) {
      const errors: { [key: string]: string } = {}
      zodResult.error.errors.forEach((err) => {
        if (err.path && err.path.length > 0) {
          errors[err.path[0]] = err.message
        }
      })
      setValidationErrors(errors)
      return
    }

    if (!formData.parent_id) {
      setErrorMessage(t("categoryModal.selectParent", "Please select a parent category for the sub-category."))
      return
    }

    const payload = {
      name: formData.name,
      code: formData.code,
      type: formData.type,
      sequence: formData.sequence,
      status: formData.status,
      parent_id: formData.parent_id,
      case_pan_id: formData.case_pan_id,
      category_id: formData.parent_id,
      ...(imageBase64 && { image: imageBase64 }),
    }

    let success = false
    try {
      if (editId && !isCopying) {
        // Edit mode: update subcategory
        success = await updateCategory(editId, payload, true)
      } else {
        // Create mode
        success = await createSubCategory(payload as any)
      }
    } catch (err: any) {
      // Handle API validation errors (422)
      if (err && err.errors && typeof err.errors === "object") {
        const apiErrors: { [key: string]: string } = {}
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            apiErrors[field] = messages[0]
          }
        })
        setValidationErrors(apiErrors)
        // Show the first error as the main error message
        const firstError = Object.values(apiErrors)[0]
        setErrorMessage(firstError)
        return
      }
      // Show the real error message if available
      setErrorMessage(err?.message || t("categoryModal.saveError", "An error occurred while saving."))
      return
    }

    if (success) {
      resetForm()
      onClose()
    } else {
      // Show the first validation error if present, otherwise show the real error message
      if (Object.keys(validationErrors).length > 0) {
        setErrorMessage(Object.values(validationErrors)[0])
      } else if (errorMessage) {
        setErrorMessage(errorMessage)
      } else {
        setErrorMessage(t("categoryModal.saveFailed", "Failed to save subcategory. Please try again."))
      }
    }
  }

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.code.trim() !== "" &&
    formData.type.trim() !== "" &&
    formData.status.trim() !== "" &&
    formData.parent_id !== null &&
    formData.case_pan_id !== null

  const currentParentDropdownCategories = Array.isArray(parentDropdownCategories) ? parentDropdownCategories : []

  let currentArchLabel = t("categoryModal.bothArches", "Both Arches")
  if (formData.type === "Upper") currentArchLabel = t("categoryModal.upperArch", "Upper arch only")
  else if (formData.type === "Lower") currentArchLabel = t("categoryModal.lowerArch", "Lower arch only")

  const overallLoading = isCategoryActionLoading || isCasePanLoading

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="p-0 gap-0 sm:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying
                ? t("categoryModal.copySubCategory", "Copy Sub Category")
                : editId
                  ? t("categoryModal.editSubCategoryTitle", "Edit Sub Category")
                  : t("categoryModal.addSubCategoryTitle", "Add New Sub Category")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 absolute right-4 top-4">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6 space-y-6">
            {editId && isDetailLoading ? (
              <div className="text-center py-8 text-gray-500">{t("categoryModal.loading", "Loading details...")}</div>
            ) : (
              <>
                {/* Validation errors */}
                {Object.keys(validationErrors).length > 0 && (
                  <div className="mb-4">
                    <ul className="text-red-600 text-sm space-y-1">
                      {Object.entries(validationErrors).map(([field, msg]) => (
                        <li key={field}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Show only if errorMessage is not already in validationErrors */}
                {errorMessage && !Object.values(validationErrors).includes(errorMessage) && (
                  <div className="mb-4 text-red-600 text-sm">{errorMessage}</div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {t("categoryModal.subCategoryDetails", "Sub Category Details")}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                            ?
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>{t("categoryModal.subCategoryDetailsTooltip", "Enable or disable subcategory details. When enabled, you can configure the subcategory's name, code, status, parent category, case pan, and applicable arch.")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    checked={categoryDetailsEnabled}
                    onCheckedChange={setCategoryDetailsEnabled}
                    className="data-[state=checked]:bg-[#1162a8]"
                    disabled={effectiveDisableFields}
                  />
                </div>
                {categoryDetailsEnabled && (
                  <div className="space-y-6">
                    {/* Image Upload Section */}
                    <div className="flex flex-col lg:flex-row gap-8">
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 h-[160px] w-[160px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
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
                              <i className="fas fa-cloud-upload-alt text-4xl mb-3"></i>
                              <span className="text-sm font-medium">Upload Image</span>
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
                        <span className="text-sm text-gray-500 text-center max-w-[160px]">
                          Click to upload subcategory image
                        </span>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={handlePreviewClick}
                            disabled={!imagePreview}
                            className="w-full"
                          >
                            Preview Image
                          </Button>
                          {imagePreview && (
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={handleRemoveImage}
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Form fields on the right */}
                      <div className="flex-1 space-y-6">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                          <Input
                            placeholder={t("categoryModal.subCategoryNamePlaceholder", "Sub Category Name *")}
                            className="h-12 text-lg"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            validationState={formData.name.trim() ? "valid" : "default"}
                            required
                            disabled={effectiveDisableFields}
                            readOnly={effectiveDisableFields}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                  {t("categoryModal.codeLabel", "Code")} <span className="text-red-500">*</span>
                                </label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                                        ?
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p>{t("categoryModal.codeTooltip", "A unique code identifier for this subcategory. This code is automatically generated from the name but can be manually edited.")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <Input
                                placeholder={t("categoryModal.codePlaceholder", "Code *")}
                                className="h-11"
                                value={formData.code}
                                onChange={(e) => handleInputChange("code", e.target.value)}
                                validationState={formData.code.trim() ? "valid" : "default"}
                                required
                                disabled={effectiveDisableFields}
                                readOnly={effectiveDisableFields}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                {t("categoryModal.statusLabel", "Status")} <span className="text-red-500">*</span>
                              </label>
                              <Select
                                value={formData.status}
                                onValueChange={(value) => handleInputChange("status", value)}
                                required
                                disabled={effectiveDisableFields}
                              >
                                <SelectTrigger className="h-11" disabled={effectiveDisableFields}>
                                  <SelectValue placeholder={t("categoryModal.selectStatus", "Select status *")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Active">{t("categoryModal.active", "Active")}</SelectItem>
                                  <SelectItem value="Inactive">{t("categoryModal.inactive", "Inactive")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Category Configuration Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Category Configuration</h3>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700">
                                {t("categoryModal.parentCategoryLabel", "Parent Category")} <span className="text-red-500">*</span>
                              </label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                                      ?
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <p>{t("categoryModal.parentCategoryTooltip", "Select the parent category that this subcategory belongs to. Subcategories are organized under parent categories in the product hierarchy.")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <SearchableSelect
                              value={formData.parent_id ? formData.parent_id.toString() : ""}
                              onValueChange={(value) => {
                                if (value && value !== NO_PARENT_CATEGORIES_VALUE) {
                                  handleInputChange("parent_id", Number.parseInt(value))
                                } else {
                                  handleInputChange("parent_id", null)
                                }
                              }}
                              placeholder={t("categoryModal.selectCategory", "Select Parent Category *")}
                              className={`h-11 ${validationErrors.parent_id ? "border-red-500" : ""}`}
                              disabled={effectiveDisableFields}
                              options={currentParentDropdownCategories.length > 0 ? currentParentDropdownCategories.map((cat: ProductCategory) => ({
                                value: cat.id.toString(),
                                label: cat.name,
                              })) : []}
                              emptyMessage={t("categoryModal.noParentCategories", "No parent categories available")}
                              searchPlaceholder={t("categoryModal.searchCategory", "Search categories...")}
                            />
                            {validationErrors.parent_id && (
                              <div className="text-sm text-red-600 mt-1">{validationErrors.parent_id}</div>
                            )}
                          </div>
                        </div>

                        {/* Additional Settings Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Settings</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                  {t("categoryModal.casePanLabel", "Case Pan")} <span className="text-red-500">*</span>
                                </label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                                        ?
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p>{t("categoryModal.casePanTooltip", "Select the case pan associated with this subcategory. Case pans are used to organize and manage dental cases.")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <SearchableSelect
                                value={formData.case_pan_id?.toString() || ""}
                                onValueChange={(value) => handleInputChange("case_pan_id", value ? Number.parseInt(value) : null)}
                                placeholder={t("categoryModal.selectCasePan", "Select Case Pan")}
                                className={`h-11 ${validationErrors.case_pan_id ? "border-red-500" : ""}`}
                                disabled={effectiveDisableFields}
                                options={casePans.length > 0 ? casePans.map((pan: CasePan) => ({
                                  value: pan.id.toString(),
                                  label: pan.name,
                                })) : []}
                                emptyMessage={t("categoryModal.noCasePans", "No case pans available")}
                                searchPlaceholder={t("categoryModal.searchCasePan", "Search case pans...")}
                              />
                              {validationErrors.case_pan_id && (
                                <div className="text-sm text-red-600 mt-1">{validationErrors.case_pan_id}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Applicable Arch Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b pb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {t("categoryModal.archLabel", "Applicable Arch")} <span className="text-red-500">*</span>
                            </h3>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                                    ?
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p>{t("categoryModal.archTooltip", "Select which dental arch this subcategory applies to: Upper arch only, Lower arch only, or Both arches.")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              t("categoryModal.upperArch", "Upper arch only"),
                              t("categoryModal.lowerArch", "Lower arch only"),
                              t("categoryModal.bothArches", "Both Arches"),
                            ].map((archLabel) => (
                              <div key={archLabel} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 ${archLabel === currentArchLabel ? "border-[#1162a8]" : "border-gray-300"
                                    } flex items-center justify-center cursor-pointer mr-3`}
                                  onClick={() => !effectiveDisableFields && handleArchChange(archLabel)}
                                  style={effectiveDisableFields ? { pointerEvents: "none", opacity: 0.5 } : {}}
                                >
                                  {archLabel === currentArchLabel && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#1162a8]"></div>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{archLabel}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="destructive" onClick={handleClose} className="bg-red-600 hover:bg-red-700">
              {t("categoryModal.cancel", "Cancel")}
            </Button>
            {isFormValid && !(editId && isDetailLoading) && (
              <Button
                className="bg-[#1162a8] hover:bg-[#0d4d87]"
                onClick={handleSaveSubCategory}
                disabled={overallLoading || effectiveDisableFields}
              >
                {overallLoading
                  ? (isCopying
                      ? t("categoryModal.copying", "Copying...")
                      : t("categoryModal.saving", "Saving..."))
                  : isCopying
                    ? t("categoryModal.copySubCategory", "Copy Sub Category")
                    : editId
                      ? t("categoryModal.saveEdit", "Save Changes")
                      : t("categoryModal.saveSubCategory", "Save Sub Category")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent
          className="flex flex-col items-center justify-center p-0"
          style={{
            width: "100vw",
            height: "100vh",
            maxWidth: "100vw",
            maxHeight: "100vh",
            borderRadius: 0,
            boxShadow: "none",
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center bg-black bg-opacity-90">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Sub Category Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="category"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}

