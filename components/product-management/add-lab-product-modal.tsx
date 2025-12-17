"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ProductCreateFormSchema, type ProductCreateForm } from "@/lib/schemas"
import { useToast } from "@/hooks/use-toast"
import { useProductCategory } from "@/contexts/product-category-context"
import { useGrades } from "@/contexts/product-grades-context"
import { useStages } from "@/contexts/product-stages-context"
import { useImpressions } from "@/contexts/product-impression-context"
import { useGumShades } from "@/contexts/product-gum-shade-context"
import { useTeethShades } from "@/contexts/product-teeth-shade-context"
import { useMaterials } from "@/contexts/product-materials-context"
import { useRetention } from "@/contexts/product-retention-context"
import { useAddOns } from "@/contexts/product-add-on-context"
import { useTranslation } from "react-i18next"
import { useCustomer } from "@/contexts/customer-context"
import { useAuth } from "@/contexts/auth-context" // <-- add this import
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { LoadingOverlay } from "@/components/ui/loading-overlay"

type ValidationFieldError = {
  field: string
  message: string
}

// Section components
import { ProductDetailsSection } from "./add-lab-product-modal/ProductDetailsSection"
import { GradesSection } from "@/components/product-management/add-lab-product-modal/GradesSection"
import { StagesSection } from "@/components/product-management/add-lab-product-modal/StagesSection"
import { ImpressionsSection } from "@/components/product-management/add-lab-product-modal/ImpressionsSection"
import { GumShadeSection } from "@/components/product-management/add-lab-product-modal/GumShadeSection"
import { TeethShadeSection } from "@/components/product-management/add-lab-product-modal/TeethShadeSection"
import { MaterialSection } from "@/components/product-management/add-lab-product-modal/MaterialSection"
import { AddOnsSection } from "@/components/product-management/add-lab-product-modal/AddOnsSection"
import { RetentionSection } from "@/components/product-management/add-lab-product-modal/RetentionSection"
import { ExtractionsSection } from "@/components/product-management/add-lab-product-modal/ExtractionsSection"
import { VisibilityManagementSection } from "@/components/product-management/add-lab-product-modal/VisibilityManagementSection"
import { OfficePriceManagementSection } from "@/components/product-management/add-lab-product-modal/OfficePriceManagementSection"

interface AddLabProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct?: any | null;
  updateProduct: (id: number, payload: any, releasingStageIds?: (string | number)[]) => Promise<any>;
  createProduct: (payload: any, releasingStageIds?: (string | number)[]) => Promise<any>;
  isUpdating: boolean;
  isCreating: boolean;
}

export function AddLabProductModal({ 
  isOpen, 
  onClose, 
  editingProduct, 
  updateProduct, 
  createProduct, 
  isUpdating, 
  isCreating 
}: AddLabProductModalProps) {
  const [clientValidationErrors, setClientValidationErrors] = useState<ValidationFieldError[]>([])
  const [serverValidationErrors, setServerValidationErrors] = useState<ValidationFieldError[]>([])
  const { toast } = useToast()

  const validationErrors = useMemo(
    () => [...serverValidationErrors, ...clientValidationErrors],
    [clientValidationErrors, serverValidationErrors],
  )
  
  // Local function to clear validation errors
  const clearValidationErrors = useCallback(() => {
    setClientValidationErrors([])
    setServerValidationErrors([])
  }, [])
  const { parentDropdownCategories, fetchParentDropdownCategories, allCategories, fetchAllCategories } = useProductCategory()
  const [categoriesWithSubcategories, setCategoriesWithSubcategories] = useState<any[]>([])
  const { grades, fetchGrades } = useGrades()
  const { stages, fetchStages } = useStages()
  const { impressions, fetchImpressions } = useImpressions()
  const { gumShadeBrands, fetchAvailableShades, fetchGumShadeBrands } = useGumShades()
  const { teethShadeBrands, fetchTeethShadeBrands } = useTeethShades()
  const { materials, fetchMaterials } = useMaterials()
  const { retentions, fetchRetentions } = useRetention()
  const { addOns, fetchAddOns } = useAddOns()
  const { officeCustomers, fetchCustomers } = useCustomer()
  const { user } = useAuth() // <-- get user from auth context
  // Prefer user.role if present, else fallback to first role in user.roles array
  const userRole =
    typeof user?.role === "string"
      ? user.role
      : Array.isArray(user?.roles) && user.roles.length > 0
        ? user.roles[0]
        : "";
  const [isMaximized, setIsMaximized] = useState(true)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const { t } = useTranslation()

  const [sections, setSections] = useState({
    productDetails: true,
    grades: false,
    stages: true,
    impressions: true,
    gumShade: true,
    teethShade: true,
    material: true,
    addOns: true,
    retention: true,
    officePriceManagement: true,
    visibilityManagement: true,
  })

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    grades: true,
    stages: true,
    impressions: true,
    gumShade: true,
    teethShade: true,
    material: true,
    addOns: true,
    retention: true,
    officePriceManagement: true,
    visibilityManagement: true,
  })

  const tabs = [
    { id: "details", label: "Product Details" },
    { id: "grades", label: "Grades" },
    { id: "stages", label: "Stages" },
    { id: "impressions", label: "Impressions" },
    { id: "gumShade", label: "Gum Shade" },
    { id: "teethShade", label: "Teeth Shade" },
    { id: "material", label: "Material" },
    { id: "addOns", label: "Add-Ons" },
    { id: "retention", label: "Retention" },
    { id: "extractions", label: "Extractions" },
    { id: "officePricing", label: "Office Pricing" },
    { id: "visibility", label: "Visibility" },
  ]

  const currentTabIndex = tabs.findIndex((tab) => tab.id === activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === tabs.length - 1

  // Get required fields for each step
  const getRequiredFieldsForStep = (stepId: string): (keyof ProductCreateForm)[] => {
    switch (stepId) {
      case "details":
        return ["name", "code", "subcategory_id"]
      // Other steps don't have required fields, but you can add them here if needed
      default:
        return []
    }
  }

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1].id)
    }
  }

  const [releasingStageIds, setReleasingStageIds] = useState<(string | number)[]>([])
  const [draggedStageId, setDraggedStageId] = useState<number | null>(null)
  
  // Store custom grade names (shared between GradesSection and StagesSection)
  const [customGradeNames, setCustomGradeNames] = useState<Record<number, string>>({})
  
  // Store custom impression names
  const [customImpressionNames, setCustomImpressionNames] = useState<Record<number, string>>({})
  const [customGumShadeNames, setCustomGumShadeNames] = useState<Record<number, string>>({})
  const [customTeethShadeNames, setCustomTeethShadeNames] = useState<Record<number, string>>({})
  const [customMaterialNames, setCustomMaterialNames] = useState<Record<number, string>>({})

  const [imageBase64, setImageBase64] = useState<string | null>(null) // <-- add imageBase64 state
  const [initialFormValues, setInitialFormValues] = useState<ProductCreateForm | null>(null) // <-- track initial values

  // Initialize without setting image payload; only set when user selects a new file
  useEffect(() => {
    setImageBase64(null)
  }, [editingProduct?.image_url])

  const getInitialFormValues = useCallback((): ProductCreateForm => ({
    name: "",
    code: "",
    category_id: null,
    subcategory_id: null,
    type: "Both",
    status: "Active",
    sequence: 1,
    description: "",
    grades: [],
    stages: [],
    impressions: [],
    gum_shades: [],
    teeth_shades: [],
    materials: [],
    retentions: [],
    addons: [],
    extractions: [],
    has_grade_based_pricing: "No",
    default_grade_id: undefined,
    enable_auto_billing: "Yes",
    auto_billing_days: 31,
    is_single_stage: "No",
    link_all_addons: "No",
    apply_retention_mechanism: "No",
    retention_type: undefined,
    show_to_all_lab: "Yes",
    office_visibilities: officeCustomers.map((office) => ({
      office_id: office.id,
      is_visible: "Yes" as const,
    })),
    impression_group_id: undefined,
    gum_shade_group_id: undefined,
    teeth_shade_group_id: undefined,
    material_group_id: undefined,
    addon_group_id: undefined,
    office_grade_pricing: [],
    office_stage_pricing: [],
    office_stage_grade_pricing: [],
    base_price: "", // <-- add this field to initial values
    apply_same_status_to_opposing: true,
    min_days_to_process: null,
    max_days_to_process: null,
    is_teeth_based_price: "No",
  }), [officeCustomers, stages])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    trigger,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<ProductCreateForm>({
    resolver: zodResolver(ProductCreateFormSchema),
    defaultValues: getInitialFormValues(),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldFocusError: false,
  })

  // Watch required fields for current step
  const watchedName = watch("name")
  const watchedCode = watch("code")
  const watchedSubcategoryId = watch("subcategory_id")

  // Check if current step has errors
  const hasCurrentStepErrors = useMemo(() => {
    const requiredFields = getRequiredFieldsForStep(activeTab)
    if (requiredFields.length === 0) return false

    // Check if any required field has an error
    return requiredFields.some((field) => {
      const fieldError = errors[field]
      return fieldError !== undefined
    })
  }, [activeTab, errors])

  // Check if current step is valid (no errors and all required fields filled)
  const isCurrentStepValid = useMemo(() => {
    const requiredFields = getRequiredFieldsForStep(activeTab)
    if (requiredFields.length === 0) return true

    // First check if there are any errors
    if (hasCurrentStepErrors) return false

    // Then check if all required fields are filled
    return requiredFields.every((field) => {
      let value: any
      if (field === "name") value = watchedName
      else if (field === "code") value = watchedCode
      else if (field === "subcategory_id") value = watchedSubcategoryId

      if (field === "subcategory_id") {
        return value !== null && value !== undefined && value !== 0
      }
      return value !== null && value !== undefined && value !== ""
    })
  }, [activeTab, watchedName, watchedCode, watchedSubcategoryId, hasCurrentStepErrors])

  const handleNext = async () => {
    if (isLastTab) return

    const requiredFields = getRequiredFieldsForStep(activeTab)
    
    // Validate required fields for current step
    if (requiredFields.length > 0) {
      const isValid = await trigger(requiredFields as any)
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields before proceeding.",
          variant: "destructive",
        })
        return
      }
    }

    setActiveTab(tabs[currentTabIndex + 1].id)
  }

  // Helper function to flatten nested errors
  const flattenErrors = (errors: any, prefix = ""): ValidationFieldError[] => {
    const errorList: ValidationFieldError[] = []
    
    for (const [key, value] of Object.entries(errors)) {
      const fieldName = prefix ? `${prefix}.${key}` : key
      
      if (value && typeof value === "object") {
        // Check if it has a message property (it's an error object)
        if ("message" in value && typeof (value as any).message === "string") {
          errorList.push({
            field: fieldName,
            message: (value as any).message || "This field is required",
          })
        } else if (Array.isArray(value)) {
          // It's an array of errors (nested array field)
          value.forEach((item: any, index: number) => {
            if (item && typeof item === "object") {
              if ("message" in item) {
                errorList.push({
                  field: `${fieldName}.${index}`,
                  message: item.message || "This field is required",
                })
              } else {
                // Recursively flatten nested errors
                errorList.push(...flattenErrors(item, `${fieldName}.${index}`))
              }
            }
          })
        } else {
          // Recursively flatten nested errors
          errorList.push(...flattenErrors(value, fieldName))
        }
      }
    }
    
    return errorList
  }

  const flattenBackendErrors = (errors: any, prefix = ""): ValidationFieldError[] => {
    if (!errors || typeof errors !== "object") {
      return []
    }

    const backendErrors: ValidationFieldError[] = []

    for (const [key, value] of Object.entries(errors)) {
      const fieldName = prefix ? `${prefix}.${key}` : key

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string") {
            backendErrors.push({ field: fieldName, message: item })
          } else if (item && typeof item === "object") {
            if ("message" in item && typeof (item as any).message === "string") {
              backendErrors.push({ field: fieldName, message: (item as any).message })
            } else {
              backendErrors.push(...flattenBackendErrors(item, fieldName))
            }
          }
        })
      } else if (typeof value === "string") {
        backendErrors.push({ field: fieldName, message: value })
      } else if (value && typeof value === "object") {
        backendErrors.push(...flattenBackendErrors(value, fieldName))
      }
    }

    return backendErrors
  }

  useEffect(() => {
    if (!isValid && errors && Object.keys(errors).length > 0) {
      const errorList = flattenErrors(errors)
      setClientValidationErrors(errorList)
    } else {
      setClientValidationErrors([])
    }
  }, [isValid, errors])

  // Validation errors are now managed locally

  const currentParentDropdownCategories = Array.isArray(parentDropdownCategories)
    ? parentDropdownCategories
    : []

  // Fetch categories with subcategories
  const fetchCategoriesWithSubcategories = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) return

      const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
      const params = new URLSearchParams({ 
        lang: "en",
        per_page: "100",
        status: "Active"
      })
      
      if (customerId) {
        params.append("customer_id", customerId)
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(
        `${apiBaseUrl}/library/categories?${params.toString()}`,
        {
          method: "GET",
          headers: { 
            Authorization: `Bearer ${token}`, 
            "Content-Type": "application/json" 
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch categories with subcategories")
      }

      const responseData = await response.json()
      // The API returns categories with nested subcategories
      const categories = responseData.data?.data || []
      setCategoriesWithSubcategories(categories)
    } catch (err: any) {
      console.error("Error fetching categories with subcategories:", err)
      setCategoriesWithSubcategories([])
    }
  }, [])

  const fetchData = useCallback(() => {
    fetchParentDropdownCategories()
    fetchCategoriesWithSubcategories()
    fetchGrades()
    fetchStages()
    fetchImpressions()
    fetchGumShadeBrands() // <-- fetch the brands, not just available shades
    fetchTeethShadeBrands()
    fetchMaterials()
    fetchRetentions()
    fetchAddOns()
    fetchCustomers("office")
  }, [fetchParentDropdownCategories, fetchCategoriesWithSubcategories, fetchGrades, fetchStages, fetchImpressions, fetchGumShadeBrands, fetchTeethShadeBrands, fetchMaterials, fetchRetentions, fetchAddOns, fetchCustomers])


  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, fetchData])

  // Helper function to calculate diff between original and current values
  const calculateChanges = useCallback((original: any, current: any): any => {
    if (!original) return current; // If no original, return everything

    const changes: any = {};

    // Compare each field
    for (const key in current) {
      if (key === 'id') continue; // Skip ID field

      const currentValue = current[key];
      const originalValue = original[key];

      // Handle arrays (like grades, stages, etc.)
      if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
        // Compare array length and content
        if (JSON.stringify(currentValue) !== JSON.stringify(originalValue)) {
          changes[key] = currentValue;
        }
      }
      // Handle primitives
      else if (currentValue !== originalValue) {
        changes[key] = currentValue;
      }
    }

    return changes;
  }, []);

  useEffect(() => {
    if (isOpen && editingProduct) {
      function mapWithStatus(arr: any[], idKey: string) {
        if (!Array.isArray(arr)) return []
        return arr.map((item, idx) => {
          // Handle price: convert to number, default to 0 if missing/invalid
          let price = 0
          if (item.price !== undefined && item.price !== null && item.price !== "") {
            const parsedPrice = typeof item.price === "number" ? item.price : parseFloat(item.price)
            if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
              price = Math.min(parsedPrice, 999999.99)
            }
          }

          return {
            [idKey]: item[idKey] ?? item.id,
            sequence: item.sequence && item.sequence >= 1 ? item.sequence : idx + 1, // <-- always at least 1
            status: item.status || (item.is_default === "Yes" ? "Active" : "Inactive"),
            is_default: item.is_default === "Yes" ? "Yes" : "No",
            price: price,
          }
        })
      }

      // Special mapping function for extractions with additional fields
      function mapExtractions(arr: any[]) {
        if (!Array.isArray(arr)) return []
        return arr.map((item, idx) => ({
          extraction_id: item.extraction_id ?? item.id,
          sequence: item.sequence && item.sequence >= 1 ? item.sequence : idx + 1,
          status: (item.status === "Inactive" ? "Inactive" : "Active") as "Active" | "Inactive",
          is_default: (item.is_default === "Yes" ? "Yes" : "No") as "Yes" | "No",
          is_required: (item.is_required === "Yes" ? "Yes" : "No") as "Yes" | "No",
          is_optional: (item.is_optional === "Yes" ? "Yes" : "No") as "Yes" | "No",
          min_teeth: item.min_teeth ? Number(item.min_teeth) : undefined,
          max_teeth: item.max_teeth ? Number(item.max_teeth) : undefined,
        }))
      }

      // Prefer grade_details if present, else grades
      let gradesArr: any[] = []
      if (Array.isArray(editingProduct.grade_details) && editingProduct.grade_details.length > 0) {
        gradesArr = editingProduct.grade_details
      } else if (Array.isArray(editingProduct.grades) && editingProduct.grades.length > 0) {
        gradesArr = editingProduct.grades
      }

      if (gradesArr.length === 0 && Array.isArray(editingProduct.grades) && editingProduct.grades.length > 0) {
        gradesArr = editingProduct.grades.map((g: any, idx: number) => ({
          grade_id: g.grade_id ?? g.id,
          sequence: g.sequence ?? idx + 1,
          status: g.status || (g.is_default === "Yes" ? "Active" : "Inactive"),
          is_default: g.is_default === "Yes" ? "Yes" : (idx === 0 ? "Yes" : "No"),
          price: g.price ?? "",
        }))
      }

      // Set has_grade_based_pricing to "Yes" if there are selected grades
      const hasGradeBasedPricing =
        Array.isArray(gradesArr) && gradesArr.length > 0 ? "Yes" : (editingProduct.has_grade_based_pricing || "No")

      // Fix: ensure type is always a valid value
      let mappedType: "Upper" | "Lower" | "Both" = "Both"
      if (editingProduct.type === "Upper" || editingProduct.type === "Lower" || editingProduct.type === "Both") {
        mappedType = editingProduct.type
      }

      // Find category_id from subcategory_id if available
      let categoryId: number | null = null
      if (editingProduct.subcategory?.id || editingProduct.subcategory_id) {
        const subcategoryId = editingProduct.subcategory?.id || editingProduct.subcategory_id
        const category = categoriesWithSubcategories.find(cat => 
          cat.subcategories?.some((sub: any) => sub.id === subcategoryId)
        )
        if (category) {
          categoryId = category.id
        }
      }

      // Determine base_price: use default grade price if available and not empty, else use response price
      const mappedGrades = mapWithStatus(gradesArr, "grade_id")
      let basePrice = editingProduct.base_price || ""
      
      if (mappedGrades.length > 0) {
        // First, try to find default grade with price (price must be > 0)
        const defaultGrade = mappedGrades.find((g: any) => {
          const price = typeof g.price === "number" ? g.price : parseFloat(g.price)
          return g.is_default === "Yes" && !isNaN(price) && price > 0
        })
        if (defaultGrade) {
          const price = typeof defaultGrade.price === "number" ? defaultGrade.price : parseFloat(defaultGrade.price)
          basePrice = price.toString()
        } else {
          // If no default grade with price, find any grade with price (price must be > 0)
          const gradeWithPrice = mappedGrades.find((g: any) => {
            const price = typeof g.price === "number" ? g.price : parseFloat(g.price)
            return !isNaN(price) && price > 0
          })
          if (gradeWithPrice) {
            const price = typeof gradeWithPrice.price === "number" ? gradeWithPrice.price : parseFloat(gradeWithPrice.price)
            basePrice = price.toString()
          }
          // If no grade has price, keep the response base_price (or empty string)
        }
      }

      const formValues: ProductCreateForm = {
        name: editingProduct.name || "",
        code: editingProduct.code || "",
        category_id: categoryId,
        subcategory_id: editingProduct.subcategory?.id || editingProduct.subcategory_id || 0,
        type: mappedType, // <-- always valid
        status: editingProduct.status || "Active",
        sequence: editingProduct.sequence || 1,
        description: editingProduct.description || "",
        grades: mappedGrades,
        stages:
          editingProduct.stage_details && editingProduct.stage_details.length
            ? mapWithStatus(editingProduct.stage_details, "stage_id")
            : mapWithStatus(editingProduct.stages, "stage_id"),
        impressions:
          editingProduct.impression_details && editingProduct.impression_details.length
            ? mapWithStatus(editingProduct.impression_details, "impression_id")
            : mapWithStatus(editingProduct.impressions, "impression_id"),
        gum_shades:
          editingProduct.gum_shade_details && editingProduct.gum_shade_details.length
            ? mapWithStatus(editingProduct.gum_shade_details, "gum_shade_id")
            : mapWithStatus(editingProduct.gum_shades, "gum_shade_id"),
        teeth_shades:
          editingProduct.teeth_shade_details && editingProduct.teeth_shade_details.length
            ? mapWithStatus(editingProduct.teeth_shade_details, "teeth_shade_id")
            : mapWithStatus(editingProduct.teeth_shades, "teeth_shade_id"),
        materials:
          editingProduct.material_details && editingProduct.material_details.length
            ? mapWithStatus(editingProduct.material_details, "material_id")
            : mapWithStatus(editingProduct.materials, "material_id"),
        retentions:
          editingProduct.retention_details && editingProduct.retention_details.length
            ? mapWithStatus(editingProduct.retention_details, "retention_id")
            : mapWithStatus(editingProduct.retentions, "retention_id"),
        addons:
          editingProduct.addon_details && editingProduct.addon_details.length
            ? mapWithStatus(editingProduct.addon_details, "addon_id")
            : mapWithStatus(editingProduct.addons, "addon_id"),
        has_grade_based_pricing: hasGradeBasedPricing,
        default_grade_id: editingProduct.default_grade_id,
        enable_auto_billing: editingProduct.enable_auto_billing || "Yes",
        auto_billing_days: editingProduct.auto_billing_days || 31,
        is_single_stage: editingProduct.is_single_stage || "No",
        link_all_addons: editingProduct.link_all_addons || "No",
        apply_retention_mechanism: editingProduct.apply_retention_mechanism || "No",
        retention_type: editingProduct.retention_type,
        show_to_all_lab: editingProduct.show_to_all_lab || "Yes",
        office_visibilities: editingProduct.office_visibilities || [],
        impression_group_id: editingProduct.impression_group_id,
        gum_shade_group_id: editingProduct.gum_shade_group_id,
        teeth_shade_group_id: editingProduct.teeth_shade_group_id,
        material_group_id: editingProduct.material_group_id,
        addon_group_id: editingProduct.addon_group_id,
        office_pricing: editingProduct.office_pricing || [],
        office_grade_pricing: editingProduct.office_grade_pricing || [],
        office_stage_pricing: editingProduct.office_stage_pricing || [],
        office_stage_grade_pricing: editingProduct.office_stage_grade_pricing || [],
        is_teeth_based_price: editingProduct.is_teeth_based_price || "No",
        base_price: basePrice, // <-- use grade price if available, else response price
        extractions: mapExtractions(editingProduct.extractions || []),
        apply_same_status_to_opposing: editingProduct.apply_same_status_to_opposing ?? true,
        min_days_to_process: editingProduct.min_days_to_process ?? null,
        max_days_to_process: editingProduct.max_days_to_process ?? null,
      }
      reset(formValues)
      setInitialFormValues(formValues) // Store initial values for comparison
      clearValidationErrors()
      setCustomGradeNames({}) // Clear custom grade names when editing
      setCustomImpressionNames({}) // Clear custom impression names when editing
      setCustomGumShadeNames({}) // Clear custom gum shade names when editing
      setCustomTeethShadeNames({}) // Clear custom teeth shade names when editing
      setReleasingStageIds([]) // Reset releasing stages when editing
    } else if (isOpen && !editingProduct) {
      // Reset to initial values (code will be generated from name)
      const initialValues = getInitialFormValues()
      reset(initialValues)
      setInitialFormValues(null) // Clear initial values for new product
      clearValidationErrors()
      setCustomGradeNames({}) // Clear custom grade names for new product
      setCustomImpressionNames({}) // Clear custom impression names for new product
      setCustomGumShadeNames({}) // Clear custom gum shade names for new product
      setCustomTeethShadeNames({}) // Clear custom teeth shade names for new product
      setReleasingStageIds([]) // Reset releasing stages for new product
    }
  }, [isOpen, editingProduct, reset, clearValidationErrors, categoriesWithSubcategories])

  const getValidationError = useCallback((fieldName: string) => {
    // Check exact match first
    const exactMatch = validationErrors.find((error) => error.field === fieldName)
    if (exactMatch) return exactMatch.message
    
    // Check if it's a nested field (e.g., extractions.0.max_teeth should match "extractions")
    const nestedMatch = validationErrors.find((error) => error.field.startsWith(`${fieldName}.`))
    if (nestedMatch) return nestedMatch.message
    
    return undefined
  }, [validationErrors])

  const sectionHasErrors = useCallback((sectionFields: string[]) => {
    return sectionFields.some((field) => validationErrors.some((error) => error.field.startsWith(field)))
  }, [validationErrors])

  const toggleSection = useCallback((section: keyof typeof sections) => {
    setSections((prev) => {
      const newSections = {
        ...prev,
        [section]: !prev[section],
      }

      // Removed logic that clears grades when toggling - grades and prices should persist

      return newSections
    })
  }, [])

  const toggleExpanded = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }, [])

  const toggleMaximize = useCallback(() => {
    setIsMaximized(!isMaximized)
  }, [isMaximized])

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      reset()
      clearValidationErrors()
      onClose()
    }
  }, [isDirty, reset, clearValidationErrors, onClose])

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false)
    reset()
    clearValidationErrors()
    setCustomGradeNames({}) // Clear custom grade names
    setCustomImpressionNames({}) // Clear custom impression names
    setCustomGumShadeNames({}) // Clear custom gum shade names
    setCustomTeethShadeNames({}) // Clear custom teeth shade names
    setReleasingStageIds([]) // Reset releasing stages
    onClose()
  }, [reset, clearValidationErrors, onClose])

  const handleKeepEditing = useCallback(() => {
    setShowDiscardDialog(false)
  }, [])

  const handleToggleSelection = useCallback(
    (
      fieldName: keyof ProductCreateForm,
      itemId: number,
      itemSequence: number,
      extraProps: Record<string, any> = {},
    ) => {
      const currentList = watch(fieldName)
      let list: any[] = []

      let idKey = "id"
      if (fieldName === "grades") idKey = "grade_id"
      else if (fieldName === "stages") idKey = "stage_id"
      else if (fieldName === "impressions") idKey = "impression_id"
      else if (fieldName === "gum_shades") idKey = "gum_shade_id"
      else if (fieldName === "teeth_shades") idKey = "teeth_shade_id"
      else if (fieldName === "materials") idKey = "material_id"
      else if (fieldName === "retentions") idKey = "retention_id"
      else if (fieldName === "addons") idKey = "addon_id"

      if (Array.isArray(currentList)) {
        list = currentList
      }

      const isSelected = list?.some((item) => item[idKey] === itemId)

      if (isSelected) {
        setValue(
          fieldName,
          list.filter((item) => item[idKey] !== itemId),
          { shouldDirty: true },
        )
      } else {
        const newSequence = (() => {
          if (list.length === 0) return 1
          const maxSequence = Math.max(...list.map((item) => item.sequence || 0))
          return maxSequence + 1
        })()

        const baseObject = {
          [idKey]: itemId,
          sequence: newSequence,
          ...extraProps,
        }

        if (["grades", "stages", "impressions"].includes(fieldName)) {
          baseObject.status = "Active"
        }

        setValue(fieldName, [...list, baseObject], { shouldDirty: true })
      }
    },
    [watch, setValue],
  )

  const handleStageToggle = useCallback(
    (stageId: number, stageSequence: number, extraProps: Record<string, any> = {}) => {
      setTimeout(() => {
        handleToggleSelection("stages", stageId, stageSequence, extraProps)
      }, 0)
    },
    [handleToggleSelection],
  )

  const handleStageReorder = useCallback(
    (reorderedStages: any[]) => {
      setTimeout(() => {
        setValue("stages", reorderedStages, { shouldDirty: true })
      }, 0)
    },
    [setValue],
  )

  const handleGradeDefaultChange = useCallback(
    (gradeId: number, isDefault: "Yes" | "No") => {
      const currentGrades = watch("grades") || []
      const updatedGrades = currentGrades.map((grade) => ({
        ...grade,
        is_default: "No" as "Yes" | "No",
      }))
      const finalGrades = updatedGrades.map((grade) =>
        grade.grade_id === gradeId
          ? { ...grade, is_default: isDefault }
          : grade,
      )
      setValue("grades", finalGrades, { shouldDirty: true })
    },
    [watch, setValue],
  )

  const handleOfficeVisibilityChange = useCallback(
    (officeId: number, isVisible: boolean) => {
      const currentVisibilities = watch("office_visibilities") || []
      setValue(
        "office_visibilities",
        currentVisibilities.map((office) =>
          office.office_id === officeId
            ? { ...office, is_visible: (isVisible ? "Yes" : "No") as "Yes" | "No" }
            : office,
        ),
        { shouldDirty: true },
      )
    },
    [watch, setValue],
  )

  const onSubmit = async (data: ProductCreateForm) => {
    clearValidationErrors()

    // Helper to ensure sequence and status for array fields
    function ensureSequenceAndStatus(arr: any[], idKey: string) {
      if (!Array.isArray(arr)) return []
      return arr.map((item, idx) => ({
        ...item,
        [idKey]: item[idKey],
        // Ensure sequence is at least 1 (fix for 0 values)
        sequence: (item.sequence && item.sequence >= 1) ? item.sequence : idx + 1,
        status: item.status || "Active",
      }))
    }

    // Special handler for extractions to clean up extra fields
    function ensureExtractions(arr: any[]) {
      if (!Array.isArray(arr)) return []
      return arr.map((item, idx) => ({
        extraction_id: item.extraction_id ?? item.id,
        // Ensure sequence is at least 1 (fix for 0 values)
        sequence: (item.sequence && item.sequence >= 1) ? item.sequence : idx + 1,
        status: item.status || "Active",
        // Include is_default, is_required, is_optional fields (default to "No" if not present)
        is_default: item.is_default === "Yes" || item.is_default === true ? "Yes" : "No",
        is_required: item.is_required === "Yes" || item.is_required === true ? "Yes" : "No",
        is_optional: item.is_optional === "Yes" || item.is_optional === true ? "Yes" : "No",
        // Only include optional fields if they exist and are valid
        min_teeth: item.min_teeth && item.min_teeth >= 1 ? item.min_teeth : undefined,
        max_teeth: item.max_teeth && item.max_teeth >= 1 ? item.max_teeth : undefined,
      })).filter(item => item.extraction_id) // Remove any items without extraction_id
    }

    let payload: any = { ...data }
    
    // Remove category_id from payload (it's UI-only for filtering subcategories)
    delete payload.category_id

    // For update operations, calculate only changed fields
    if (editingProduct && initialFormValues) {
      const changes = calculateChanges(initialFormValues, data)
      payload = { ...changes }
      // Remove category_id from changes as well
      delete payload.category_id
      console.log('🔄 Update Mode: Sending only changed fields', payload)
    } else {
      console.log('➕ Create Mode: Sending all fields')
    }
    
    // Ensure is_teeth_based_price is always set to "Yes" or "No"
    payload.is_teeth_based_price = data.is_teeth_based_price === "Yes" ? "Yes" : "No"

    // Helper function to check if an array should be included in update payload
    const shouldIncludeArray = (fieldName: string, currentValue: any[]): boolean => {
      if (!editingProduct || !initialFormValues) {
        // For create mode, include if not empty
        return currentValue && currentValue.length > 0
      }
      
      // For update mode, only include if:
      // 1. The field is in the changes (meaning it changed)
      // 2. The array has items OR it's being cleared from non-empty to empty
      if (!(fieldName in payload)) {
        return false // Field wasn't changed, don't include it
      }
      
      const originalValue = initialFormValues[fieldName as keyof ProductCreateForm]
      const originalArray = Array.isArray(originalValue) ? originalValue : []
      
      // Include if it has items OR if we're clearing a non-empty array
      return currentValue.length > 0 || originalArray.length > 0
    }

    // Only process and include array fields that have meaningful changes
    const arrayFields = [
      { key: 'grades', idKey: 'grade_id', processor: ensureSequenceAndStatus },
      { key: 'stages', idKey: 'stage_id', processor: ensureSequenceAndStatus },
      { key: 'impressions', idKey: 'impression_id', processor: ensureSequenceAndStatus },
      { key: 'gum_shades', idKey: 'gum_shade_id', processor: ensureSequenceAndStatus },
      { key: 'teeth_shades', idKey: 'teeth_shade_id', processor: ensureSequenceAndStatus },
      { key: 'materials', idKey: 'material_id', processor: ensureSequenceAndStatus },
      { key: 'retentions', idKey: 'retention_id', processor: ensureSequenceAndStatus },
      { key: 'addons', idKey: 'addon_id', processor: ensureSequenceAndStatus },
      { key: 'extractions', idKey: 'extraction_id', processor: ensureExtractions },
    ]

    arrayFields.forEach(({ key, idKey, processor }) => {
      const currentValue = payload[key] ?? []
      const processedValue = processor === ensureExtractions 
        ? ensureExtractions(currentValue)
        : ensureSequenceAndStatus(currentValue, idKey)
      
      if (shouldIncludeArray(key, processedValue)) {
        payload[key] = processedValue
      } else {
        // Remove empty arrays that weren't meaningfully changed
        delete payload[key]
      }
    })

    // Always set price and remove grades if grades section is off
    if (!sections.grades) {
      payload.price = data.base_price
      payload.has_grade_based_pricing = "No"
      // Only include empty grades array if it's a meaningful change (clearing existing grades)
      if (editingProduct && initialFormValues) {
        const originalGrades = initialFormValues.grades || []
        if (originalGrades.length > 0) {
          // We're clearing grades, so include empty array
          payload.grades = []
        } else {
          // Grades were already empty, don't include it
          delete payload.grades
        }
      } else {
        // For create mode, don't include empty grades
        delete payload.grades
      }
    } else {
      // If grades are enabled, set base_price from default grade
      const defaultGrade = payload.grades?.find((g: any) => g.is_default === "Yes")
      if (defaultGrade && defaultGrade.price) {
        payload.base_price = defaultGrade.price
        // Also update the form's base_price field
        setValue("base_price", defaultGrade.price, { shouldDirty: true, shouldValidate: true })
      }
    }

    // Add image only if user selected a new one (base64 data URL)
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
      payload.image = imageBase64
    }


    if (!editingProduct) {
      // Add customer_id if user is lab_admin
      if (user?.role === "lab_admin" && user.customers?.length) {
        payload.customer_id = user.customers[0]?.id
      }
    }

    let success = false
    try {
      if (editingProduct && editingProduct.id) {
        // min_days_to_process and max_days_to_process are automatically included from the form data
        await updateProduct(editingProduct.id, payload, releasingStageIds)
      } else {
        await createProduct(payload, releasingStageIds)
      }
      success = true
    } catch (error: any) {
      const backendErrors = flattenBackendErrors(error?.errors)
      if (backendErrors.length > 0) {
        setServerValidationErrors(backendErrors)
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to save product.",
          variant: "destructive",
        })
      }
    }

    if (success) {
      clearValidationErrors()
      reset()
      setInitialFormValues(null) // Clear initial values
      setCustomGradeNames({}) // Clear custom grade names
      setCustomImpressionNames({}) // Clear custom impression names
      setCustomGumShadeNames({}) // Clear custom gum shade names
      setCustomTeethShadeNames({}) // Clear custom teeth shade names
      setCustomMaterialNames({}) // Clear custom material names
      onClose()
    }
  }

  // Add a wrapper to log before calling onSubmit
  const handleFormSubmit = handleSubmit(
    (data) => {
      // Pre-process the data to set base_price from default grade before validation
      if (data.has_grade_based_pricing === "Yes" && data.grades && data.grades.length > 0) {
        const defaultGrade = data.grades.find((g: any) => g.is_default === "Yes")
        if (defaultGrade && defaultGrade.price) {
          data.base_price = defaultGrade.price
        }
      }
      
      onSubmit(data)
    },
    (errors) => {
      // Handle validation errors - show toast notification
      const errorMessages = flattenErrors(errors)
      if (errorMessages.length > 0) {
        const firstError = errorMessages[0]
        toast({
          title: "Validation Error",
          description: `${firstError.field}: ${firstError.message}`,
          variant: "destructive",
        })
      }
    }
  )

  // Alternative submission method that bypasses form validation
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = watch()
    
    // Pre-process the data to set base_price from default grade
    if (formData.has_grade_based_pricing === "Yes" && formData.grades && formData.grades.length > 0) {
      const defaultGrade = formData.grades.find((g: any) => g.is_default === "Yes")
      if (defaultGrade && defaultGrade.price) {
        formData.base_price = defaultGrade.price
      }
    }
    
    await onSubmit(formData)
  }



  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={`p-0 gap-0 transition-all duration-300 ease-in-out flex flex-col ${
            isMaximized 
              ? "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]" 
              : "w-full max-w-[900px] h-[90vh] max-h-[90vh]"
          } bg-white`}
        >
          <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b bg-white sticky top-0 z-10 flex-shrink-0">
            <DialogTitle className="text-xl font-medium">
              {editingProduct && editingProduct.id
                ? t("productModal.editProduct", "Edit Product")
                : editingProduct && !editingProduct.id
                ? t("productModal.copyProduct", "Copy Product")
                : t("productModal.addProduct", "Add Product")}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMaximize} 
                className="h-8 w-8 hover:bg-gray-100"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                <Maximize2 className={`h-4 w-4 transition-transform ${isMaximized ? "rotate-180" : ""}`} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {/* Loading Overlay for Update/Create operations */}
          <LoadingOverlay
            isLoading={isUpdating || isCreating}
            title={editingProduct && editingProduct.id
              ? t("productModal.updating", "Updating Product...")
              : t("productModal.saving", "Saving Product...")}
            message={editingProduct && editingProduct.id
              ? t("productModal.updatingMessage", "Please wait while we update your product.")
              : t("productModal.savingMessage", "Please wait while we save your product.")}
            zIndex={9999}
          />

          <form onSubmit={handleDirectSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Progress indicator bar */}
              <div className="px-6 pt-4 pb-3 border-b bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {tabs[currentTabIndex].label}
                  </h3>
                  <span className="text-sm text-gray-500">
                    Step {currentTabIndex + 1} of {tabs.length}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#1162a8] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentTabIndex + 1) / tabs.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0">
                <TabsContent value="details" className="mt-0 p-6 focus-visible:outline-none">
                  <ProductDetailsSection
                    control={control}
                    register={register}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    currentParentDropdownCategories={currentParentDropdownCategories}
                    categoriesWithSubcategories={categoriesWithSubcategories}
                    editingSubcategoryName={editingProduct?.subcategory?.name}
                    editingProduct={editingProduct}
                    onImageChange={setImageBase64}
                    userRole={userRole}
                    setValue={setValue}
                  />
                </TabsContent>

                <TabsContent value="grades" className="mt-0 p-6 focus-visible:outline-none">
                  <GradesSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    grades={grades}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
                    handleGradeDefaultChange={handleGradeDefaultChange}
                    userRole={userRole}
                    customGradeNames={customGradeNames}
                    setCustomGradeNames={setCustomGradeNames}
                  />
                </TabsContent>

                <TabsContent value="stages" className="mt-0 p-6 focus-visible:outline-none">
                  <StagesSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    stages={stages}
                    grades={grades}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    releasingStageIds={releasingStageIds}
                    setReleasingStageIds={setReleasingStageIds}
                    draggedStageId={draggedStageId}
                    setDraggedStageId={setDraggedStageId}
                    handleStageToggle={handleStageToggle}
                    handleStageReorder={handleStageReorder}
                    userRole={userRole}
                    customGradeNames={customGradeNames}
                  />
                </TabsContent>

                <TabsContent value="impressions" className="mt-0 p-6 focus-visible:outline-none">
                  <ImpressionsSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    impressions={impressions}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
                    customImpressionNames={customImpressionNames}
                    setCustomImpressionNames={setCustomImpressionNames}
                  />
                </TabsContent>

                <TabsContent value="gumShade" className="mt-0 p-6 focus-visible:outline-none">
                  <GumShadeSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    gumShadeBrands={
                      Array.isArray(gumShadeBrands)
                        ? gumShadeBrands
                        : gumShadeBrands?.data?.data || []
                    }
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
                    customGumShadeNames={customGumShadeNames}
                    setCustomGumShadeNames={setCustomGumShadeNames}
                  />
                </TabsContent>

                <TabsContent value="teethShade" className="mt-0 p-6 focus-visible:outline-none">
                  <TeethShadeSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    teethShadeBrands={
                      Array.isArray(teethShadeBrands)
                        ? teethShadeBrands
                        : teethShadeBrands?.data?.data || []
                    }
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
                    customTeethShadeNames={customTeethShadeNames}
                    setCustomTeethShadeNames={setCustomTeethShadeNames}
                  />
                </TabsContent>

                <TabsContent value="material" className="mt-0 p-6 focus-visible:outline-none">
                  <MaterialSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    materials={materials}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
                    customMaterialNames={customMaterialNames}
                    setCustomMaterialNames={setCustomMaterialNames}
                  />
                </TabsContent>

                <TabsContent value="addOns" className="mt-0 p-6 focus-visible:outline-none">
                  <AddOnsSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    addOns={addOns}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
                    userRole={userRole}
                  />
                </TabsContent>

                <TabsContent value="retention" className="mt-0 p-6 focus-visible:outline-none">
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
                  />
                </TabsContent>

                <TabsContent value="extractions" className="mt-0 p-6 focus-visible:outline-none">
                  <ExtractionsSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    getValidationError={getValidationError}
                    sectionHasErrors={sectionHasErrors}
                  />
                </TabsContent>

                <TabsContent value="officePricing" className="mt-0 p-6 focus-visible:outline-none">
                  <OfficePriceManagementSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    offices={officeCustomers}
                    stages={stages}
                    grades={grades}
                    customGradeNames={customGradeNames}
                  />
                </TabsContent>

                <TabsContent value="visibility" className="mt-0 p-6 focus-visible:outline-none">
                  <VisibilityManagementSection
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleOfficeVisibilityChange={handleOfficeVisibilityChange}
                  />
                </TabsContent>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-white flex-shrink-0 mt-auto">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 order-2 sm:order-1">
                    {!isFirstTab && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 flex-1 sm:flex-none h-10"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 flex-1 sm:flex-none h-10"
                    >
                      {t("productModal.cancel", "Cancel")}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    {isLastTab ? (
                      <Button
                        type="submit"
                        className="bg-[#1162a8] hover:bg-[#0d4c84] h-10 w-full sm:w-auto sm:px-8"
                        disabled={isSubmitting || isUpdating || isCreating}
                      >
                        {isSubmitting || isUpdating || isCreating
                          ? editingProduct && editingProduct.id
                            ? t("productModal.updating", "Updating...")
                            : editingProduct && !editingProduct.id
                            ? t("productModal.copying", "Copying...")
                            : t("productModal.saving", "Saving...")
                          : editingProduct && editingProduct.id
                            ? t("productModal.updateProduct", "Update Product")
                            : editingProduct && !editingProduct.id
                            ? t("productModal.copyProduct", "Copy Product")
                            : t("productModal.saveProduct", "Save Product")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="bg-[#1162a8] hover:bg-[#0d4c84] h-10 w-full sm:w-auto sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isCurrentStepValid}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Tabs>
            {/* Show API error if present */}
            {validationErrors.length > 0 && (
              <div className="px-6 pt-2 pb-2 text-red-600 text-sm flex-shrink-0 border-t bg-white">
                {validationErrors.map((error, index) => (
                  <div key={index}>{error.message}</div>
                ))}
              </div>
            )}
          </form>
          </DialogContent>
        </Dialog>
      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="product"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
