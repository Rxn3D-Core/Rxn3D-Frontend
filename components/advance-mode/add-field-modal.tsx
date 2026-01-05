"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { X, Link as LinkIcon, HelpCircle, Edit, Copy, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import { AddOptionModal } from "./add-option-modal"
import { AdvanceField, useAdvanceCategories, useAdvanceSubcategories, useCreateAdvanceField, useUpdateAdvanceField, useAdvanceField, fileToBase64, validateImageFile } from "@/lib/api/advance-mode-query"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface AddFieldModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: any) => void
  field?: AdvanceField | null
  isEditing?: boolean
}

interface FieldOption {
  id: string
  originalId?: number // Store original API ID for existing options
  image: string | null
  label: string
  isDefault: boolean
  status: boolean
  price?: string
}

// Zod schema for field options
const fieldOptionSchema = z.object({
  id: z.string(),
  image: z.string().nullable(),
  label: z.string().min(1, "Option label is required"),
  isDefault: z.boolean(),
  status: z.boolean(),
  price: z.string().optional(),
})

// Zod schema for the form
const addFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().min(1, "Sub category is required"),
  fieldType: z.enum(["dropdown", "radio", "checkbox", "number", "shade_guide", "text", "file_upload", "multiline_text", "implant_library"], {
    required_error: "Field type is required",
  }),
  requiredField: z.boolean(),
  isSystemDefault: z.boolean(),
  description: z.string().optional(),
  fieldDetails: z.boolean(),
  canAddAdditionalCharges: z.boolean(),
  chargeType: z.enum(["once", "per-option"]),
  additionalCharge: z.string().optional(),
  chargeScope: z.enum(["per-case", "per-unit"]),
}).refine((data) => {
  // If charge type is "once" and additional charges are enabled, validate additionalCharge
  if (data.canAddAdditionalCharges && data.chargeType === "once") {
    const chargeValue = parseFloat(data.additionalCharge || "0")
    return !isNaN(chargeValue) && chargeValue >= 0
  }
  return true
}, {
  message: "Additional charge must be a valid number",
  path: ["additionalCharge"],
})

type AddFieldFormValues = z.infer<typeof addFieldSchema>

export function AddFieldModal({ isOpen, onClose, onSave, field, isEditing = false }: AddFieldModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"options" | "pricing">("options")
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [options, setOptions] = useState<FieldOption[]>([])
  
  // Image state management
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [initialImageBase64, setInitialImageBase64] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Mutations
  const createFieldMutation = useCreateAdvanceField()
  const updateFieldMutation = useUpdateAdvanceField()

  // Get role and customer_id from localStorage
  const getCustomerId = () => {
    if (typeof window === 'undefined') return undefined
    
    const role = localStorage.getItem('role')
    if (role === 'lab_admin') {
      const customerId = localStorage.getItem('customerId')
      if (customerId) {
        return parseInt(customerId, 10)
      }
    }
    return undefined
  }

  const customerId = getCustomerId()

  // Fetch field data when editing using React Query
  // React Query handles caching and refetching automatically
  // Only fetch when modal is open, we're editing, and we have a field ID
  const fieldId = isOpen && isEditing && field?.id ? field.id : 0
  
  const { 
    data: fetchedFieldData, 
    isLoading: isLoadingField,
    error: fieldError,
    refetch: refetchField
  } = useAdvanceField(
    fieldId,
    customerId
  )
  
  // React Query's enabled option in the hook already handles fieldId > 0 check
  // The query will automatically not run when fieldId is 0

  // Use React Query data when available, otherwise fall back to prop
  // When editing, only use fetched data to ensure we have complete data (including all options)
  const fieldData: AdvanceField | null = useMemo(() => {
    if (isEditing) {
      return (fetchedFieldData as any)?.data || null
    }
    return field || null
  }, [isEditing, fetchedFieldData, field])

  const form = useForm<AddFieldFormValues>({
    resolver: zodResolver(addFieldSchema),
    defaultValues: {
      fieldName: "",
      category: "",
      subCategory: "",
      fieldType: "dropdown",
      requiredField: false,
      isSystemDefault: false,
      description: "",
      fieldDetails: true,
      canAddAdditionalCharges: false,
      chargeType: "once",
      additionalCharge: "0.00",
      chargeScope: "per-case",
    },
    mode: "onChange",
  })

  const selectedCategoryId = form.watch("category")
  const selectedFieldType = form.watch("fieldType")

  // Helper function to check if field type requires options
  const requiresOptions = (fieldType: string): boolean => {
    return ["dropdown", "radio", "checkbox"].includes(fieldType)
  }

  // Switch to pricing tab if field type changes to one that doesn't require options
  useEffect(() => {
    if (selectedFieldType && !requiresOptions(selectedFieldType) && activeTab === "options") {
      setActiveTab("pricing")
    }
  }, [selectedFieldType, activeTab])

  // Helper function to check if field type should only show "Charge once per field"
  const onlyChargeOnce = (fieldType: string): boolean => {
    return ["number", "shade_guide", "text", "file_upload", "multiline_text", "implant_library"].includes(fieldType)
  }

  // Auto-set chargeType to "per-option" for dropdown, radio, checkbox when canAddAdditionalCharges is enabled
  // Auto-set chargeType to "once" for number, shade_guide, text, file_upload, multiline_text, implant_library
  const canAddAdditionalCharges = form.watch("canAddAdditionalCharges")
  useEffect(() => {
    // Only auto-set when field type changes or when canAddAdditionalCharges is first enabled
    // Don't interfere if user manually selects a different option
    if (canAddAdditionalCharges) {
      const currentChargeType = form.getValues("chargeType")
      if (requiresOptions(selectedFieldType) && currentChargeType !== "per-option") {
        form.setValue("chargeType", "per-option", { shouldDirty: false })
      } else if (onlyChargeOnce(selectedFieldType) && currentChargeType !== "once") {
        form.setValue("chargeType", "once", { shouldDirty: false })
      }
    }
  }, [selectedFieldType, canAddAdditionalCharges, form])

  // Fetch categories with customer_id if role is lab_admin
  const { data: categoriesData } = useAdvanceCategories({
    per_page: 100,
    status: "Active",
    ...(customerId && { customer_id: customerId }),
  })

  // Fetch subcategories with customer_id if role is lab_admin, filtered by selected category
  const { data: subcategoriesData } = useAdvanceSubcategories({
    per_page: 100,
    status: "Active",
    ...(customerId && { customer_id: customerId }),
    ...(selectedCategoryId && !isNaN(parseInt(selectedCategoryId, 10)) && { advance_category_id: parseInt(selectedCategoryId, 10) }),
  })

  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : []
  const subcategories = Array.isArray(subcategoriesData?.data) ? subcategoriesData.data : []

  // Track which field ID we've already populated to prevent infinite loops
  const populatedFieldIdRef = useRef<number | null>(null)

  // Reset subcategory when category changes (user interaction, not initial load)
  useEffect(() => {
    if (selectedCategoryId) {
      const currentSubCategory = form.getValues("subCategory")
      // Only reset if subcategory doesn't belong to the new category
      if (currentSubCategory && subcategories.length > 0) {
        const subCategoryBelongsToCategory = subcategories.some(
          sub => sub.id.toString() === currentSubCategory
        )
        if (!subCategoryBelongsToCategory) {
          form.setValue("subCategory", "")
        }
      } else if (currentSubCategory && subcategories.length === 0) {
        // If no subcategories loaded yet, clear it
        form.setValue("subCategory", "")
      }
    }
  }, [selectedCategoryId, subcategories])

  // Ensure chargeScope always has a default value of "per-case"
  useEffect(() => {
    if (isOpen) {
      const currentChargeScope = form.getValues("chargeScope")
      if (!currentChargeScope || (currentChargeScope !== "per-case" && currentChargeScope !== "per-unit")) {
        form.setValue("chargeScope", "per-case", { shouldDirty: false })
      }
    }
  }, [isOpen, form])

  // Image handling functions
  const handleImageClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!validateImageFile(file)) {
        toast({
          title: "Invalid image",
          description: "Please select a valid image file (JPEG, PNG, GIF, WebP) under 5MB",
          variant: "destructive",
        })
        return
      }
      try {
        const base64 = await fileToBase64(file)
        setImagePreview(base64)
        setImageBase64(base64)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process image",
          variant: "destructive",
        })
      }
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageBase64(null)
  }

  const handlePreviewClick = () => {
    if (imagePreview) setShowPreviewModal(true)
  }

  // Populate form when React Query data is ready (single useEffect using React Query state)
  useEffect(() => {
    if (!isOpen) {
      // Reset ref when modal closes
      populatedFieldIdRef.current = null
      return
    }

    // Reset UI state when modal opens
    setIsAddOptionModalOpen(false)
    setEditingOptionId(null)
    setIsSaving(false)

    // Handle editing mode - wait for React Query to fetch complete data
    // Only populate once per field ID to prevent infinite loops
    // Also wait for categories to be loaded before populating
    if (isEditing && fieldData && !isLoadingField && fetchedFieldData && fieldId > 0 && categories.length > 0) {
      // Skip if we've already populated this field (unless categories just loaded)
      const categoryId = fieldData.advance_category_id?.toString() || ""
      const currentCategory = form.getValues("category")
      const needsRepopulation = populatedFieldIdRef.current !== fieldId || 
                                (categoryId && !currentCategory && categories.length > 0)
      
      if (populatedFieldIdRef.current === fieldId && currentCategory) {
        // Already populated and category is set, skip
        return
      }
      // Map API field types to form field types (handles legacy values)
      const fieldTypeMap: Record<string, "dropdown" | "radio" | "checkbox" | "number" | "shade_guide" | "text" | "file_upload" | "multiline_text" | "implant_library"> = {
        'select': 'dropdown',
        'dropdown': 'dropdown',
        'radio': 'radio',
        'checkbox': 'checkbox',
        'number': 'number',
        'shade_guide': 'shade_guide',
        'text': 'text',
        'textarea': 'multiline_text',
        'multiline_text': 'multiline_text',
        'file': 'file_upload',
        'file_upload': 'file_upload',
        'implant_library': 'implant_library',
      }
      const subCategoryId = fieldData.advance_subcategory_id?.toString() || ""
      
      // Find category in loaded list
      const categoryExists = categoryId ? categories.find(cat => cat.id.toString() === categoryId) : null
      const finalCategoryValue = categoryExists ? categoryId : ""
      
      // Find subcategory in loaded list (only if category is selected)
      // Wait for subcategories to load if category exists but subcategories aren't loaded yet
      const subCategoryExists = finalCategoryValue && subCategoryId && subcategories.length > 0
        ? subcategories.find(sub => sub.id.toString() === subCategoryId)
        : null
      const finalSubCategoryValue = subCategoryExists ? subCategoryId : ""
      
      console.log("Populating form for editing:", {
        fieldId,
        categoryId,
        subCategoryId,
        categoryExists: !!categoryExists,
        finalCategoryValue,
        subCategoryExists: !!subCategoryExists,
        finalSubCategoryValue,
        categoriesLength: categories.length,
        subcategoriesLength: subcategories.length
      })
      
      // Reset form with field data
      form.reset({
        fieldName: fieldData.name || "",
        category: finalCategoryValue,
        subCategory: finalSubCategoryValue,
        fieldType: fieldTypeMap[fieldData.field_type] || "text",
        requiredField: fieldData.is_required === 'Yes',
        isSystemDefault: fieldData.is_system_default === 'Yes',
        description: fieldData.description || "",
        fieldDetails: true,
        canAddAdditionalCharges: fieldData.has_additional_pricing === 'Yes',
        chargeType: fieldData.charge_type === 'per_selected_option' ? 'per-option' as const : 'once' as const,
        additionalCharge: fieldData.price?.toString() || "0.00",
        // Map API format (per_case) to form format (per-case), default to per-case
        chargeScope: (() => {
          const apiValue = fieldData.charge_scope
          if (!apiValue) return "per-case"
          // Convert underscore format to hyphen format
          if (apiValue === 'per_case') return 'per-case'
          if (apiValue === 'per_unit') return 'per-unit'
          // If already in correct format, use it
          if (apiValue === 'per-case' || apiValue === 'per-unit') return apiValue as "per-case" | "per-unit"
          // Default fallback
          return "per-case"
        })() as "per-case" | "per-unit",
      })
      
      form.clearErrors()
      
      // Set image
      if (fieldData.image_url) {
        setImageBase64(fieldData.image_url)
        setImagePreview(fieldData.image_url)
        setInitialImageBase64(fieldData.image_url)
      } else {
        setImageBase64(null)
        setImagePreview(null)
        setInitialImageBase64(null)
      }
      
      // Map options from API format
      if (fieldData.options && fieldData.options.length > 0) {
        setOptions(fieldData.options.map((opt: any, idx: number) => ({
          id: opt.id ? String(opt.id) : String(idx + 1),
          originalId: opt.id,
          image: opt.image_url || null,
          label: opt.name,
          isDefault: opt.is_default === 'Yes',
          status: opt.status === 'Active',
          price: opt.price?.toString() || "0.00",
        })))
      } else {
        setOptions([])
      }
      
      // Set initial tab based on field type
      const mappedFieldType = fieldTypeMap[fieldData.field_type] || "text"
      setActiveTab(requiresOptions(mappedFieldType) ? "options" : "pricing")
      
      // Mark this field as populated
      populatedFieldIdRef.current = fieldId
    } else if (!isEditing) {
      // Reset to empty form for new field
      form.reset({
        fieldName: "",
        category: "",
        subCategory: "",
        fieldType: "dropdown",
        requiredField: false,
        isSystemDefault: false,
        description: "",
        fieldDetails: true,
        canAddAdditionalCharges: false,
        chargeType: "once",
        additionalCharge: "0.00",
        chargeScope: "per-case",
      })
      form.clearErrors()
      setOptions([])
      setImageBase64(null)
      setImagePreview(null)
      setInitialImageBase64(null)
      setActiveTab("options")
      populatedFieldIdRef.current = null
    }
  }, [isOpen, isEditing, fieldData, isLoadingField, fetchedFieldData, categories, subcategories, fieldId])

  if (!isOpen) return null

  // Show loading state while fetching field data using React Query
  if (isEditing && isLoadingField && fieldId > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1162a8]"></div>
            <p className="text-gray-700">Loading field data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if field fetch failed
  if (isEditing && fieldError && fieldId > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <div className="flex flex-col items-center gap-3">
            <p className="text-red-600 font-medium">Failed to load field data</p>
            <p className="text-sm text-gray-600 text-center">
              {fieldError instanceof Error ? fieldError.message : "An error occurred"}
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => refetchField()}
                className="text-sm"
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form validation check - use form.watch() to reactively track form values
  const formValues = form.watch()
  
  // Check if form fields are valid
  const fieldName = (formValues.fieldName || "").toString().trim()
  const category = (formValues.category || "").toString().trim()
  const subCategory = (formValues.subCategory || "").toString().trim()
  const fieldType = (formValues.fieldType || "").toString().trim()
  
  const hasFieldName = fieldName !== ""
  const hasCategory = category !== ""
  const hasSubCategory = subCategory !== ""
  const hasFieldType = fieldType !== ""
  
  // When editing, if fieldData exists, we might have category/subcategory from the API
  // even if they're not yet set in the form (due to async loading)
  // But we should use form values for validation since they're the source of truth
  const categoryValid = hasCategory
  const subCategoryValid = hasSubCategory
  
  // Validate additional charges
  const canAddCharges = formValues.canAddAdditionalCharges ?? false
  const chargeType = formValues.chargeType || "once"
  const additionalCharge = formValues.additionalCharge || "0.00"
  
  const additionalChargesValid = 
    canAddCharges === false || 
    (canAddCharges === true && 
     (chargeType === "per-option" || 
      (chargeType === "once" && 
       additionalCharge && 
       !isNaN(parseFloat(additionalCharge)) && 
       parseFloat(additionalCharge) >= 0)))
  
  const isFormValid =
    hasFieldName &&
    categoryValid &&
    subCategoryValid &&
    hasFieldType &&
    additionalChargesValid

  const isLoading = isSaving || createFieldMutation.isPending || updateFieldMutation.isPending

  // Debug: Log form state
  console.log("Form state:", {
    isFormValid,
    hasFieldName,
    categoryValid,
    subCategoryValid,
    hasFieldType,
    additionalChargesValid,
    category,
    subCategory,
    fieldType,
    optionsLength: options.length,
    requiresOptions: fieldType ? requiresOptions(fieldType) : false,
    buttonDisabled: !isFormValid || (fieldType && requiresOptions(fieldType) && options.length === 0) || isLoading,
    isEditing,
    fieldData: fieldData?.id
  })

  const handleSave = async (data: AddFieldFormValues) => {
    // Prevent multiple submissions
    if (isSaving || createFieldMutation.isPending || updateFieldMutation.isPending) {
      console.log("Save blocked: already saving or pending")
      return
    }

    console.log("handleSave called", { isEditing, fieldData: fieldData?.id, data })

    // Validate options - at least one option is required for dropdown, radio, and checkbox
    if (requiresOptions(data.fieldType) && options.length === 0) {
      form.setError("fieldType", {
        type: "manual",
        message: "At least one option is required for this field type",
      })
      setActiveTab("options")
      toast({
        title: "Validation Error",
        description: "At least one option is required for this field type",
        variant: "destructive",
      })
      return
    }

    // Validate that all options have labels
    const invalidOptions = options.filter(opt => !opt.label || opt.label.trim() === "")
    if (invalidOptions.length > 0) {
      form.setError("fieldType", {
        type: "manual",
        message: "All options must have a label",
      })
      setActiveTab("options")
      toast({
        title: "Validation Error",
        description: "All options must have a label",
        variant: "destructive",
      })
      return
    }

    // Validate additional charge when charge type is "once"
    if (data.canAddAdditionalCharges && data.chargeType === "once") {
      const chargeValue = parseFloat(data.additionalCharge || "0")
      if (isNaN(chargeValue) || chargeValue < 0) {
        form.setError("additionalCharge", {
          type: "manual",
          message: "Additional charge must be a valid number greater than or equal to 0",
        })
        setActiveTab("pricing")
        toast({
          title: "Validation Error",
          description: "Additional charge must be a valid number",
          variant: "destructive",
        })
        return
      }
    }

    // Set saving state immediately after validation passes
    // Use a small delay to ensure React processes the state update before async operations
    setIsSaving(true)
    
    // Force a microtask to ensure state update is visible
    await Promise.resolve()
    
    try {
      // Map form field types to API field types (1:1 mapping now, but kept explicit for clarity)
      const fieldTypeMap: Record<"dropdown" | "radio" | "checkbox" | "number" | "shade_guide" | "text" | "file_upload" | "multiline_text" | "implant_library", string> = {
        'dropdown': 'dropdown',
        'radio': 'radio',
        'checkbox': 'checkbox',
        'number': 'number',
        'shade_guide': 'shade_guide',
        'text': 'text',
        'file_upload': 'file_upload',
        'multiline_text': 'multiline_text',
        'implant_library': 'implant_library',
      }

      const payload: any = {
        name: data.fieldName,
        description: data.description || undefined,
        advance_category_id: parseInt(data.category, 10),
        advance_subcategory_id: data.subCategory ? parseInt(data.subCategory, 10) : undefined,
        field_type: fieldTypeMap[data.fieldType],
        is_required: data.requiredField ? 'Yes' : 'No',
        is_system_default: data.isSystemDefault ? 'Yes' : 'No',
        has_additional_pricing: data.canAddAdditionalCharges ? 'Yes' : 'No',
        charge_type: data.canAddAdditionalCharges 
          ? (data.chargeType === 'per-option' ? 'per_selected_option' : 'once_per_field')
          : undefined,
        price: data.canAddAdditionalCharges && data.chargeType === 'once' && data.additionalCharge
          ? parseFloat(data.additionalCharge)
          : undefined,
        charge_scope: data.canAddAdditionalCharges ? data.chargeScope : undefined,
      }

      // Only include options for field types that require them
      if (requiresOptions(data.fieldType)) {
        payload.options = options.map((opt, idx) => {
          const optionPayload: any = {
            name: opt.label,
            image: opt.image || undefined,
            status: opt.status ? 'Active' : 'Inactive',
            is_default: opt.isDefault ? 'Yes' : 'No',
            sequence: idx + 1,
          }
          
          // Set price - use 0 if not per-option or if price is not set
          if (data.chargeType === 'per-option' && opt.price) {
            optionPayload.price = parseFloat(opt.price)
          } else {
            optionPayload.price = 0
          }
          
          // Only include id for existing options (those that came from the API)
          if (opt.originalId && !isNaN(opt.originalId) && opt.originalId > 0) {
            optionPayload.id = opt.originalId
          }
          
          return optionPayload
        })
      }

      // Add image if present and changed
      if (imageBase64 && imageBase64 !== initialImageBase64) {
        payload.image = imageBase64
      }

      // Call onSave callback - let the parent handle the mutation to avoid double submission
      if (onSave) {
        const { canAddAdditionalCharges, chargeType, additionalCharge, chargeScope, ...formFields } = data
        const saveData = {
          ...formFields,
          options,
          pricing: {
            canAddAdditionalCharges,
            chargeType,
            additionalCharge,
            chargeScope,
          },
          image: imageBase64 && imageBase64 !== initialImageBase64 ? imageBase64 : undefined,
        }
        console.log("Calling onSave with data:", saveData)
        await onSave(saveData)
        toast({
          title: "Success",
          description: isEditing ? "Field updated successfully" : "Field created successfully",
        })
        onClose()
      } else {
        // Fallback: if no onSave callback, handle mutation here
        if (isEditing && fieldData && fieldData.id) {
          // Update existing field
          await updateFieldMutation.mutateAsync({
            id: fieldData.id,
            ...payload,
          })
          toast({
            title: "Success",
            description: "Field updated successfully",
          })
        } else {
          // Create new field
          await createFieldMutation.mutateAsync(payload)
          toast({
            title: "Success",
            description: "Field created successfully",
          })
        }
        onClose()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save field",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddOption = () => {
    setEditingOptionId(null)
    setIsAddOptionModalOpen(true)
  }

  const handleEditOption = (id: string) => {
    setEditingOptionId(id)
    setIsAddOptionModalOpen(true)
  }

  const handleSaveNewOption = (data: { image: string | null; label: string }) => {
    if (editingOptionId) {
      // Update existing option
      setOptions(
        options.map((opt) =>
          opt.id === editingOptionId
            ? { ...opt, image: data.image, label: data.label }
            : opt
        )
      )
      setEditingOptionId(null)
    } else {
      // Add new option
      const newOption: FieldOption = {
        id: String(options.length + 1),
        originalId: undefined, // New options don't have an originalId
        image: data.image,
        label: data.label,
        isDefault: false,
        status: true,
        price: "0.00",
      }
      setOptions([...options, newOption])
    }
  }

  const handleUpdateOptionPrice = (id: string, price: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, price } : opt
      )
    )
  }

  const handleDeleteOption = (id: string) => {
    setOptions(options.filter((opt) => opt.id !== id))
  }

  const handleDuplicateOption = (id: string) => {
    const option = options.find((opt) => opt.id === id)
    if (option) {
      const newOption: FieldOption = {
        ...option,
        id: String(options.length + 1),
        originalId: undefined, // Duplicated options are new, so no originalId
        label: `${option.label} (Copy)`,
        price: option.price || "0.00",
      }
      setOptions([...options, newOption])
    }
  }

  const toggleDefault = (id: string) => {
    setOptions(
      options.map((opt) => ({
        ...opt,
        isDefault: opt.id === id,
      }))
    )
  }

  const toggleStatus = (id: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, status: !opt.status } : opt
      )
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-full max-h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#1162a8]" />
              <p className="text-sm text-gray-700 font-medium">Saving field...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{isEditing ? "Edit Field" : "Add Field"}</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col flex-1 min-h-0">
            {/* Disable form interactions during save */}
            {isLoading && (
              <div className="absolute inset-0 z-40 cursor-not-allowed" />
            )}
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                {/* Left Side - Image Upload */}
                <div className="lg:col-span-1">
                  <FormField
                    control={form.control}
                    name="fieldDetails"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 mb-2">
                          <FormLabel className="text-sm sm:text-base font-medium">Field Details</FormLabel>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#1162a8]"
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 flex items-center justify-center bg-gray-50 h-32 sm:h-48 w-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => handleImageClick(e as any)
                      input.click()
                    }}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Field preview"
                        className="object-contain h-full w-full rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="mx-auto w-16 h-16 flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-gray-400 group-hover:text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 mt-2 block">Click to upload image</span>
                      </div>
                    )}
                  </div>
                </div>
                {imagePreview && (
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handlePreviewClick}
                      className="flex-1"
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

                {/* Right Side - Form Fields */}
                <div className="lg:col-span-2 space-y-4">
                  <FormField
                    control={form.control}
                    name="fieldName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            label="Field Name"
                            placeholder="Pontic Type"
                            value={field.value || ""}
                            onChange={field.onChange}
                            validationState={field.value?.trim() ? "valid" : "default"}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Category
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length > 0 ? (
                                categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))
                              ) : null}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Sub Category
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedCategoryId}
                          >
                            <FormControl>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder={selectedCategoryId ? "Select sub category" : "Select category first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.length > 0 ? (
                                subcategories.map((subcategory) => (
                                  <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                                    {subcategory.name}
                                  </SelectItem>
                                ))
                              ) : null}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fieldType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Field Type
                          </FormLabel>
                          <Select
                            value={field.value || "dropdown"}
                            onValueChange={(value) => {
                              field.onChange(value || "dropdown")
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="dropdown">Dropdown</SelectItem>
                              <SelectItem value="radio">Radio</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="shade_guide">Shade Guide</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="file_upload">File Upload</SelectItem>
                              <SelectItem value="multiline_text">Multiline Text</SelectItem>
                              <SelectItem value="implant_library">Implant Library</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col sm:flex-row gap-4">
                      <FormField
                        control={form.control}
                        name="requiredField"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2 pt-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                                Required field
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isSystemDefault"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2 pt-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                                System default
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
          </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your field description here."
                        {...field}
                        className="mt-1 min-h-[80px] sm:min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-4 sm:gap-8 overflow-x-auto">
              {requiresOptions(form.watch("fieldType")) && (
                <button
                  type="button"
                  onClick={() => setActiveTab("options")}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "options"
                      ? "border-[#1162a8] text-[#1162a8]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Options
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("pricing")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "pricing"
                    ? "border-[#1162a8] text-[#1162a8]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Pricing
              </button>
              <button type="button" className="pb-2 px-1 text-sm font-medium text-gray-400 cursor-not-allowed flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Link Product
              </button>
            </div>
          </div>

          {/* Options Tab Content - Only show for field types that require options */}
          {activeTab === "options" && requiresOptions(form.watch("fieldType")) && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Manage the selectable choices for this field. These options will appear in slips when this field is used.
                </p>
                <Button
                  type="button"
                  onClick={handleAddOption}
                  variant="outline"
                  className="text-sm w-full sm:w-auto"
                >
                  Add option
                </Button>
              </div>

              {/* Options Table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                        <Checkbox className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]" />
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Product</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Image</th>
                      {form.watch("chargeType") === "per-option" && (
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Price</th>
                      )}
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Default</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {options.map((option) => (
                      <tr key={option.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <Checkbox className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]" />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className="text-xs sm:text-sm text-gray-900">{option.label}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center">
                            {option.image ? (
                              <img
                                src={option.image}
                                alt={option.label || "Option image"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100"></div>
                            )}
                          </div>
                        </td>
                        {form.watch("chargeType") === "per-option" && (
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">$</span>
                              <Input
                                type="text"
                                value={option.price || "0.00"}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9.]/g, "")
                                  handleUpdateOptionPrice(option.id, value)
                                }}
                                className="pl-6 h-8 text-xs sm:text-sm w-20 sm:w-24"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <button
                            type="button"
                            onClick={() => toggleDefault(option.id)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${
                              option.isDefault
                                ? "border-[#1162a8] bg-[#1162a8] flex items-center justify-center"
                                : "border-gray-300"
                            }`}
                          >
                            {option.isDefault && (
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                            )}
                          </button>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <Switch
                            checked={option.status}
                            onCheckedChange={() => toggleStatus(option.id)}
                            className="data-[state=checked]:bg-[#1162a8]"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditOption(option.id)}
                              className="text-gray-600 hover:text-[#1162a8]"
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateOption(option.id)}
                              className="text-gray-600 hover:text-[#1162a8]"
                            >
                              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(option.id)}
                              className="text-gray-600 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

              {/* Pricing Tab Content */}
              {activeTab === "pricing" && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Checkbox for additional charges */}
                  <FormField
                    control={form.control}
                    name="canAddAdditionalCharges"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                          </FormControl>
                          <FormLabel className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                            This field can add additional charges
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Show all 4 fields when checkbox is checked */}
                  {form.watch("canAddAdditionalCharges") && (
                    <>
                      {/* Radio buttons for charge type */}
                      <FormField
                        control={form.control}
                        name="chargeType"
                        render={({ field }) => {
                          const currentFieldType = form.watch("fieldType")
                          const isOptionBasedField = requiresOptions(currentFieldType)
                          const isOnlyChargeOnce = onlyChargeOnce(currentFieldType)
                          const showBothOptions = !isOptionBasedField && !isOnlyChargeOnce
                          
                          return (
                            <FormItem>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className={
                                    isOptionBasedField || isOnlyChargeOnce 
                                      ? "grid grid-cols-1 gap-4" 
                                      : "grid grid-cols-2 gap-4"
                                  }
                                >
                                  {/* Show "Charge once per field" for non-option-based fields or fields that only support "once" */}
                                  {(!isOptionBasedField || isOnlyChargeOnce) && (
                                    <label
                                      htmlFor="charge-once"
                                      onClick={() => field.onChange("once")}
                                      className="border border-gray-200 rounded-lg p-4 hover:border-[#1162a8] transition-colors cursor-pointer block"
                                    >
                                      <div className="flex items-start gap-3">
                                        <RadioGroupItem value="once" id="charge-once" className="mt-0.5" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                                            Charge once per field
                                          </div>
                                          <p className="text-xs text-gray-500">Fixed fee when this field is used</p>
                                        </div>
                                      </div>
                                    </label>
                                  )}
                                  {/* Only show "Charge per selected option" for option-based fields or when both options should be shown */}
                                  {(isOptionBasedField || showBothOptions) && (
                                    <label
                                      htmlFor="charge-per-option"
                                      onClick={() => field.onChange("per-option")}
                                      className="border border-gray-200 rounded-lg p-4 hover:border-[#1162a8] transition-colors cursor-pointer block"
                                    >
                                      <div className="flex items-start gap-3">
                                        <RadioGroupItem value="per-option" id="charge-per-option" className="mt-0.5" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                                            Charge per selected option
                                          </div>
                                          <p className="text-xs text-gray-500">Set individual prices per option</p>
                                        </div>
                                      </div>
                                    </label>
                                  )}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />

                      {/* Additional Charge and Charge Scope - Only show when "once" is selected */}
                      {form.watch("chargeType") === "once" && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="additionalCharge"
                            render={({ field }) => {
                              const chargeValue = field.value || ""
                              const isValidCharge = chargeValue && !isNaN(parseFloat(chargeValue)) && parseFloat(chargeValue) >= 0
                              return (
                                <FormItem>
                                  <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10">$</span>
                                    <FormControl>
                                      <Input
                                        label="Additional Charge"
                                        type="text"
                                        value={chargeValue}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/[^0-9.]/g, "")
                                          field.onChange(value)
                                        }}
                                        className="pl-8"
                                        placeholder="0.00"
                                        validationState={isValidCharge ? "valid" : (chargeValue ? "error" : "default")}
                                        required={form.watch("canAddAdditionalCharges")}
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="chargeScope"
                            render={({ field }) => {
                              // Always ensure we have a valid value, default to "per-case"
                              const currentValue = field.value || "per-case"
                              const hasValue = !!currentValue
                              
                              return (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative w-full">
                                      <div className="relative">
                                        <Select
                                          value={currentValue}
                                          onValueChange={(value) => {
                                            // Always set a value, default to "per-case" if empty
                                            field.onChange(value || "per-case")
                                          }}
                                        >
                                          <SelectTrigger 
                                            className="h-14 rounded-lg border-2 bg-white px-4 pt-6 pb-2 text-base border-[#E0E0E0] focus:border-[#1162A8] focus:ring-2 focus:ring-[#1162A8] focus:ring-opacity-20 focus:shadow-[0_0_0_4px_rgba(17,98,168,0.15)] hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-all duration-200 [&>span]:pt-0"
                                          >
                                            <SelectValue placeholder="Per case" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="per-case">Per case</SelectItem>
                                            <SelectItem value="per-unit">Per unit</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        {hasValue && (
                                          <label
                                            className="absolute top-1 left-4 text-xs font-medium text-gray-500 pointer-events-none transition-all duration-200"
                                            style={{ fontSize: '11px', lineHeight: '1' }}
                                          >
                                            Charge Scope
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )
                            }}
                          />
                        </div>
                      )}

                      {/* Instructional text when "per-option" is selected */}
                      {form.watch("chargeType") === "per-option" && (
                        <div className="text-sm text-gray-600">
                          Set price adjustments per option in the{" "}
                          <button
                            type="button"
                            onClick={() => setActiveTab("options")}
                            className="text-[#1162a8] hover:underline font-medium"
                          >
                            Options tab
                          </button>
                          .
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 sm:px-6 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || (formValues.fieldType && requiresOptions(formValues.fieldType) && options.length === 0) || isLoading}
                onClick={(e) => {
                  const currentFormValues = form.getValues()
                  console.log("Save button clicked", {
                    isFormValid,
                    currentFormValues,
                    formValues,
                    optionsLength: options.length,
                    disabled: !isFormValid || (formValues.fieldType && requiresOptions(formValues.fieldType) && options.length === 0) || isLoading,
                    validationDetails: {
                      hasFieldName: !!currentFormValues.fieldName?.trim(),
                      hasCategory: !!currentFormValues.category,
                      hasSubCategory: !!currentFormValues.subCategory,
                      hasFieldType: !!currentFormValues.fieldType,
                    }
                  })
                  // Don't prevent default - let form.handleSubmit handle it
                  // This is just for debugging
                }}
                className="px-4 sm:px-6 bg-[#1162a8] hover:bg-[#0f5497] text-white text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {(isSaving || createFieldMutation.isPending || updateFieldMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Add Option Modal */}
      <AddOptionModal
        isOpen={isAddOptionModalOpen}
        onClose={() => {
          setIsAddOptionModalOpen(false)
          setEditingOptionId(null)
        }}
        onSave={handleSaveNewOption}
        title={editingOptionId ? "Edit option" : "Add new option"}
        option={editingOptionId ? options.find(opt => opt.id === editingOptionId) || null : null}
        isEditing={!!editingOptionId}
      />

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
                alt="Field Preview"
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
    </div>
  )
}
