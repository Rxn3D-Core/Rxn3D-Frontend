"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { debounce } from "@/lib/performance"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ProductCreateFormSchema, type ProductCreateForm } from "@/lib/schemas"
import { useProducts } from "@/contexts/product-products-context"
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
import { useAuth } from "@/contexts/auth-context"

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

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingProduct?: any // <-- add editingProduct prop
}

const NO_SUBCATEGORIES_VALUE = "__NO_SUBCATEGORIES__"

const placeholderOffices = [
  { id: 1, name: "Dental Lab 1", is_visible: "Yes" },
  { id: 2, name: "Dental Lab 2", is_visible: "Yes" },
  { id: 3, name: "Dental Lab 3", is_visible: "No" },
  { id: 4, name: "Dental Lab 4", is_visible: "Yes" },
  { id: 5, name: "Dental Lab 5", is_visible: "No" },
  { id: 6, name: "Dental Lab 6", is_visible: "Yes" },
  { id: 7, name: "Dental Lab 7", is_visible: "No" },
  { id: 8, name: "Dental Lab 8", is_visible: "Yes" },
]

export function AddProductModal({ isOpen, onClose, editingProduct }: AddProductModalProps) {
  const { createProduct, updateProduct, isLoading: isProductActionLoading, clearValidationErrors } = useProducts()
  const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([])
  const { parentDropdownCategories, fetchParentDropdownCategories } = useProductCategory()
  const { grades, fetchGrades } = useGrades()
  const { stages, fetchStages } = useStages()
  const { impressions, fetchImpressions } = useImpressions()
  const { gumShadeBrands, fetchAvailableShades, fetchGumShadeBrands } = useGumShades()
  const { teethShadeBrands, fetchTeethShadeBrands } = useTeethShades()
  const { materials, fetchMaterials } = useMaterials()
  const { retentions, fetchRetentions } = useRetention()
  const { addOns, fetchAddOns } = useAddOns()
  const { user } = useAuth()
  const userRole =
    typeof user?.role === "string"
      ? user.role
      : Array.isArray(user?.roles) && user.roles.length > 0
        ? user.roles[0]
        : ""

  const [isMaximized, setIsMaximized] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const { t } = useTranslation()
  const [sections, setSections] = useState({
    productDetails: true,
    grades: true,
    stages: true,
    impressions: true,
    gumShade: true,
    teethShade: true,
    material: true,
    addOns: true,
    retention: true,
    extractions: true,
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
    extractions: true,
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
    { id: "visibility", label: "Visibility" },
  ]

  const currentTabIndex = tabs.findIndex((tab) => tab.id === activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === tabs.length - 1

  const handleNext = () => {
    if (!isLastTab) {
      setActiveTab(tabs[currentTabIndex + 1].id)
    }
  }

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1].id)
    }
  }

  const initialFormValues: ProductCreateForm = useMemo(() => ({
    name: "",
    code: "",
    subcategory_id: 0,
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
    enable_auto_billing: "No",
    is_single_stage: "No",
    link_all_addons: "No",
    apply_retention_mechanism: "No",
    retention_type: undefined,
    show_to_all_lab: "Yes",
    office_visibilities: placeholderOffices.map((office) => ({
      office_id: office.id,
      is_visible: office.is_visible === "Yes" ? ("Yes" as const) : ("No" as const),
    })),
    impression_group_id: undefined,
    gum_shade_group_id: undefined,
    teeth_shade_group_id: undefined,
    material_group_id: undefined,
    addon_group_id: undefined,
    base_price: 0,
    apply_same_status_to_opposing: true,
  }), [])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<ProductCreateForm>({
    resolver: zodResolver(ProductCreateFormSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
    reValidateMode: "onBlur",
    shouldFocusError: true,
  })

  useEffect(() => {
    if (!isValid && errors) {
      const errorList = Object.entries(errors).map(([field, error]: any) => ({
        field,
        message: error?.message || "This field is required",
      }))
      setValidationErrors(errorList)
    } else {
      setValidationErrors([])
    }
  }, [isValid, errors])

  const currentParentDropdownCategories = Array.isArray(parentDropdownCategories)
    ? parentDropdownCategories
    : Array.isArray(parentDropdownCategories?.data)
      ? parentDropdownCategories.data
      : []

  const fetchData = useCallback(() => {
    fetchParentDropdownCategories()
    fetchGrades()
    fetchStages()
    fetchImpressions()
    fetchGumShadeBrands()
    fetchTeethShadeBrands()
    fetchMaterials()
    fetchRetentions()
    fetchAddOns()
  }, [
    fetchParentDropdownCategories,
    fetchGrades,
    fetchStages,
    fetchImpressions,
    fetchGumShadeBrands,
    fetchTeethShadeBrands,
    fetchMaterials,
    fetchRetentions,
    fetchAddOns,
  ])

  const getNormalizedFormValues = useCallback((): ProductCreateForm => {
    if (!editingProduct) return initialFormValues

    function mapWithStatus(arr: any[], idKey: string) {
      if (!Array.isArray(arr)) return []
      return arr.map((item, idx) => {
        const baseItem = {
          [idKey]: item[idKey] ?? item.id,
          sequence: item.sequence && item.sequence >= 1 ? item.sequence : idx + 1,
          status: item.status || (item.is_default === "Yes" ? "Active" : "Inactive"),
        }
        
        // Add specific fields based on the type
        if (idKey === "grade_id") {
          return {
            ...baseItem,
            is_default: item.is_default === "Yes" ? "Yes" : "No",
            price: item.price ?? "",
          }
        } else if (idKey === "extraction_id") {
          return {
            ...baseItem,
            is_default: item.is_default === "Yes" ? "Yes" : "No",
            is_required: item.is_required === "Yes" ? "Yes" : "No",
            is_optional: item.is_optional === "Yes" ? "Yes" : "No",
            min_teeth: item.min_teeth ?? null,
            max_teeth: item.max_teeth ?? null,
          }
        } else if (idKey === "addon_id") {
          const priceValue =
            item.price ??
            item.lab_addon?.price ??
            item.pivot?.price ??
            ""
          const quantityValue =
            item.quantity ??
            item.lab_addon?.quantity ??
            item.pivot?.quantity ??
            1
          const isDefaultValue =
            item.is_default ??
            item.lab_addon?.is_default ??
            item.pivot?.is_default ??
            "No"
          return {
            ...baseItem,
            price: priceValue,
            quantity: quantityValue,
            is_default: isDefaultValue === "Yes" ? "Yes" : "No",
          }
        }
        
        return baseItem
      })
    }

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

    const hasGradeBasedPricing =
      Array.isArray(gradesArr) && gradesArr.length > 0 ? "Yes" : (editingProduct.has_grade_based_pricing || "No")

    let mappedType: "Upper" | "Lower" | "Both" = "Both"
    if (editingProduct.type === "Upper" || editingProduct.type === "Lower" || editingProduct.type === "Both") {
      mappedType = editingProduct.type
    }

    return {
      ...initialFormValues,
      name: editingProduct.name || "",
      code: editingProduct.code || "",
      subcategory_id: editingProduct.subcategory?.id || editingProduct.subcategory_id || 0,
      type: mappedType,
      status: editingProduct.status || "Active",
      sequence: editingProduct.sequence || 1,
      description: editingProduct.description || "",
      grades: mapWithStatus(gradesArr, "grade_id"),
      stages: mapWithStatus(editingProduct.stages || [], "stage_id"),
      impressions: mapWithStatus(editingProduct.impressions || [], "impression_id"),
      gum_shades: mapWithStatus(editingProduct.gum_shades || [], "gum_shade_id"),
      teeth_shades: mapWithStatus(editingProduct.teeth_shades || [], "teeth_shade_id"),
      materials: mapWithStatus(editingProduct.materials || [], "material_id"),
      retentions: mapWithStatus(editingProduct.retentions || [], "retention_id"),
      addons: mapWithStatus(editingProduct.addons || [], "addon_id"),
      extractions: mapWithStatus(editingProduct.extractions || [], "extraction_id"),
      has_grade_based_pricing: hasGradeBasedPricing,
      default_grade_id: editingProduct.default_grade_id,
      enable_auto_billing: editingProduct.enable_auto_billing || "No",
      is_single_stage: editingProduct.is_single_stage || "No",
      link_all_addons: editingProduct.link_all_addons || "No",
      apply_retention_mechanism: editingProduct.apply_retention_mechanism || "No",
      retention_type: editingProduct.retention_type,
      show_to_all_lab: editingProduct.show_to_all_lab || "Yes",
      office_visibilities: editingProduct.office_visibilities || initialFormValues.office_visibilities,
      impression_group_id: editingProduct.impression_group_id,
      gum_shade_group_id: editingProduct.gum_shade_group_id,
      teeth_shade_group_id: editingProduct.teeth_shade_group_id,
      material_group_id: editingProduct.material_group_id,
      addon_group_id: editingProduct.addon_group_id,
      base_price: editingProduct.base_price || 0,
      apply_same_status_to_opposing: editingProduct.apply_same_status_to_opposing ?? true,
    }
  }, [editingProduct, initialFormValues])

  useEffect(() => {
    if (isOpen) {
      reset(getNormalizedFormValues())
      clearValidationErrors()
      fetchData()
    }
    // Only depend on isOpen and editingProduct!
    // Do NOT include fetchData, reset, or getNormalizedFormValues as dependencies
    // They are stable due to useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingProduct])

  useEffect(() => {
    if (isOpen) {
    }
  }, [isOpen])

  const getValidationError = (fieldName: string) => {
    return validationErrors.find((error) => error.field === fieldName)?.message
  }

  const sectionHasErrors = (sectionFields: string[]) => {
    return sectionFields.some((field) => validationErrors.some((error) => error.field.startsWith(field)))
  }

  const toggleSection = (section: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }))
  }

  const toggleExpanded = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      reset()
      clearValidationErrors()
      onClose()
    }
  }

  const handleDiscard = () => {
    setShowDiscardDialog(false)
    reset()
    clearValidationErrors()
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const onSubmit = async (data: ProductCreateForm) => {
    clearValidationErrors()
    if (!normalizedGumShadeBrands || normalizedGumShadeBrands.length === 0) {
      console.error("GumShadeSection: gumShadeBrands is empty. Check API response and normalization logic.");
    }

    if (validationErrors.length > 0) {
      console.error("Validation errors before saving product:");
      validationErrors.forEach(err => {
        console.error(`Field: ${err.field}, Message: ${err.message}`);
      });
    }

    if (Object.keys(errors).length > 0) {
      console.error("React Hook Form errors before saving product:");
      Object.entries(errors).forEach(([field, error]: any) => {
        console.error(`Field: ${field}, Message: ${error?.message}`);
      });
    }

    if (!isValid || validationErrors.length > 0) {
      alert("Please check the form for errors. See console for details.");
      return;
    }

    let success = false
    if (editingProduct && editingProduct.id) {
      // Call updateProduct (PUT) when editing
      success = await updateProduct(editingProduct.id, data)
    } else {
      // Call createProduct (POST) when adding
      success = await createProduct(data)
    }
    if (success) {
      reset()
      onClose()
    }
  }

  // Create debounced version of onSubmit to prevent multiple rapid submissions
  const debouncedSubmit = useMemo(
    () => debounce((data: ProductCreateForm) => {
      // Prevent submission if already submitting
      if (isSubmitting || isProductActionLoading) {
        return;
      }
      onSubmit(data);
    }, 1000), // 1 second debounce delay
    [onSubmit, isSubmitting, isProductActionLoading]
  )

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
      else if (fieldName === "extractions") idKey = "extraction_id"

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
        const baseObject = {
          [idKey]: itemId,
          sequence: itemSequence,
          ...extraProps,
        }

        if (["grades", "stages", "impressions", "extractions"].includes(fieldName)) {
          baseObject.status = "Active"
        }

        setValue(fieldName, [...list, baseObject], { shouldDirty: true })
      }
    },
    [watch, setValue],
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

  const watchedGrades = watch("grades") || []
  const watchedStages = watch("stages") || []
  const watchedImpressions = watch("impressions") || []
  const watchedGumShades = watch("gum_shades") || []
  const watchedTeethShades = watch("teeth_shades") || []
  const watchedMaterials = watch("materials") || []
  const watchedRetentions = watch("retentions") || []
  const watchedAddons = watch("addons") || []
  const watchedExtractions = watch("extractions") || []
  const watchedOfficeVisibilities = watch("office_visibilities") || []
  const watchedHasGradeBasedPricing = watch("has_grade_based_pricing")
  const watchedApplyRetentionMechanism = watch("apply_retention_mechanism")
  const watchedLinkAllAddons = watch("link_all_addons")

  const [releasingStageId, setReleasingStageId] = useState<string | number | null>(null)
  const [draggedStageId, setDraggedStageId] = useState<string | number | null>(null)
  const [customGradeNames, setCustomGradeNames] = useState<Record<number, string>>({})

  const normalizedGumShadeBrands =
    Array.isArray(gumShadeBrands)
      ? gumShadeBrands
      : Array.isArray(gumShadeBrands?.data?.data)
        ? gumShadeBrands.data.data
        : Array.isArray(gumShadeBrands?.data)
          ? gumShadeBrands.data
          : [];

  return (
    <>
      {isOpen && (
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`p-0 gap-0 ${isMaximized ? "w-[90vw] h-[90vh] max-w-[90vw]" : "sm:max-w-[900px]"} overflow-hidden bg-white`}>
          <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-xl font-medium">
              {editingProduct
                ? t("productModal.editProduct", "Edit Product")
                : t("productModal.addProduct", "Add Product")}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMaximize} className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(debouncedSubmit)} className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
              {/* Progress indicator bar */}
              <div className="px-6 pt-4 pb-3 border-b bg-gray-50">
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

              <div className="overflow-y-auto flex-1 max-h-[calc(80vh-200px)]">
                <TabsContent value="details" className="mt-0 p-6 focus-visible:outline-none">
                  <ProductDetailsSection
                    control={control}
                    register={register}
                    sections={sections}
                    toggleSection={toggleSection}
                    getValidationError={getValidationError}
                    currentParentDropdownCategories={currentParentDropdownCategories}
                    userRole={userRole}
                    editingProduct={editingProduct}
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
                    releasingStageId={releasingStageId}
                    setReleasingStageId={setReleasingStageId}
                    draggedStageId={draggedStageId}
                    setDraggedStageId={setDraggedStageId}
                    handleStageToggle={handleToggleSelection}
                    handleStageReorder={(reorderedStages: any) => setValue("stages", reorderedStages, { shouldDirty: true })}
                    userRole={userRole}
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
                    gumShadeBrands={normalizedGumShadeBrands}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
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
                    teethShadeBrands={teethShadeBrands}
                    sectionHasErrors={sectionHasErrors}
                    expandedSections={expandedSections}
                    toggleExpanded={toggleExpanded}
                    handleToggleSelection={handleToggleSelection}
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

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-white">
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
                        disabled={isSubmitting || isProductActionLoading}
                      >
                        {isSubmitting || isProductActionLoading
                          ? t("productModal.saving", "Saving...")
                          : t("productModal.saveProduct", "Save Product")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="bg-[#1162a8] hover:bg-[#0d4c84] h-10 w-full sm:w-auto sm:px-8"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Tabs>
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
