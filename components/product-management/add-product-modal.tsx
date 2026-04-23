"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { X, Maximize2, ChevronLeft, ChevronRight, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { debounce } from "@/lib/performance"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ProductCreateFormSchema, type ProductCreateForm, type Extraction } from "@/lib/schemas"
import {
  finalizeLibraryProductApiPayload,
  validateStageAllocationPercents,
  teethStrategyApiToForm,
  hydrateTeethPricingFieldsFromDefaultGrade,
  hydrateProductLevelTeethPricingFromApi,
  mapApiVariationsToForm,
  jawPhotosStateFromProduct,
  productHasAnyJawPhotoUrls,
} from "@/lib/library-product-api-mapping"
import { normalizeSinglePreferredShadeRow } from "@/lib/product-shade-preferences"
import { ExtractionsApi } from "@/lib/api-service"
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
import { getCustomerId } from "@/lib/dashboard-widgets"
import { usePreferredGumShades } from "@/hooks/usePreferredGumShades"
import { usePreferredTeethShades } from "@/hooks/usePreferredTeethShades"
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
import { VariationSection } from "@/components/product-management/add-lab-product-modal/VariationSection"

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingProduct?: any // <-- add editingProduct prop
}

const NO_SUBCATEGORIES_VALUE = "__NO_SUBCATEGORIES__"

const ADD_PRODUCT_MODAL_TABS: { id: string; label: string; sectionKey: string | null }[] = [
  { id: "details", label: "Product Details", sectionKey: "productDetails" },
  { id: "variation", label: "Variation", sectionKey: null },
  { id: "grades", label: "Grades", sectionKey: "grades" },
  { id: "stages", label: "Stages", sectionKey: "stages" },
  { id: "impressions", label: "Impressions", sectionKey: "impressions" },
  { id: "gumShade", label: "Gum Shade", sectionKey: "gumShade" },
  { id: "teethShade", label: "Teeth Shade", sectionKey: "teethShade" },
  { id: "material", label: "Material", sectionKey: "material" },
  { id: "addOns", label: "Add-Ons", sectionKey: "addOns" },
  { id: "retention", label: "Retention", sectionKey: "retention" },
  { id: "extractions", label: "Extractions", sectionKey: "extractions" },
]

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

/** API may send string ids or nest id under extraction — invalid rows were dropped on reset and the checkbox stayed checked. */
function pickExtractionIdFromOppositeRow(item: any): number {
  const raw =
    item?.extraction_id ??
    item?.id ??
    item?.extraction?.id ??
    item?.pivot?.extraction_id
  const n = Number(raw)
  return n
}

function mapOppositeExtractionsFromApi(arr: any[]) {
  if (!Array.isArray(arr)) return []
  return arr
    .map((item, idx) => ({
      extraction_id: pickExtractionIdFromOppositeRow(item),
      sequence: item.sequence && item.sequence >= 1 ? item.sequence : idx + 1,
      status: (item.status === "Inactive" ? "Inactive" : "Active") as "Active" | "Inactive",
      is_default: (item.is_default === "Yes" ? "Yes" : "No") as "Yes" | "No",
    }))
    .filter((row) => Number.isFinite(row.extraction_id) && row.extraction_id > 0)
}

export function AddProductModal({ isOpen, onClose, editingProduct }: AddProductModalProps) {
  const { createProduct, updateProduct, isLoading: isProductActionLoading, clearValidationErrors } = useProducts()
  const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([])
  const { parentDropdownCategories, fetchParentDropdownCategories } = useProductCategory()
  const [categoriesWithSubcategories, setCategoriesWithSubcategories] = useState<any[]>([])
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [jawPhotos, setJawPhotos] = useState<{ upper?: string | null; lower?: string | null; both?: string | null }>({})
  const handleJawPhotoChange = useCallback((jawType: "upper" | "lower" | "both", base64: string | null) => {
    setJawPhotos(prev => ({ ...prev, [jawType]: base64 }))
  }, [])
  const { grades, fetchGrades } = useGrades()
  const { stages, fetchStages } = useStages()
  const { impressions, fetchImpressions } = useImpressions()
  const { gumShadeBrands, fetchAvailableShades, fetchGumShadeBrands } = useGumShades()
  const { teethShadeBrands, fetchTeethShadeBrands } = useTeethShades()
  const { materials, fetchMaterials } = useMaterials()
  const { retentions, fetchRetentions } = useRetention()
  const { addOns, fetchAllAddOns } = useAddOns()
  const [allExtractions, setAllExtractions] = useState<Extraction[]>([])
  const [isExtractionsLoading, setIsExtractionsLoading] = useState(false)
  const fetchExtractions = useCallback(async () => {
    setIsExtractionsLoading(true)
    try {
      const response = await ExtractionsApi.getExtractions({
        status: "Active",
        per_page: 100,
        page: 1,
        sort_by: "sequence",
        sort_order: "asc",
      })
      setAllExtractions(response?.data?.data || [])
    } catch (err) {
      console.error("Failed to fetch extractions:", err)
      setAllExtractions([])
    } finally {
      setIsExtractionsLoading(false)
    }
  }, [])
  const { user } = useAuth()
  const userRole =
    typeof user?.role === "string"
      ? user.role
      : Array.isArray(user?.roles) && user.roles.length > 0
        ? user.roles[0]
        : ""

  const customerId = useMemo(() => getCustomerId(user), [user])
  const preferredShadesFetchEnabled = isOpen && !editingProduct && Boolean(customerId)
  const {
    brand: preferredGumBrand,
    shades: preferredGumShadesList,
    loading: preferredGumLoading,
    hasExplicitPreference: gumHasExplicitPreference,
  } = usePreferredGumShades({
    customerId: customerId ?? 0,
    enabled: preferredShadesFetchEnabled,
  })
  const {
    brand: preferredTeethBrand,
    shades: preferredTeethShadesList,
    loading: preferredTeethLoading,
    hasExplicitPreference: teethHasExplicitPreference,
  } = usePreferredTeethShades({
    customerId: customerId ?? 0,
    enabled: preferredShadesFetchEnabled,
  })
  const gumPreferredAutoFill = useMemo(
    () => ({
      isOpen,
      isCreateMode: !editingProduct,
      brandId: preferredGumBrand?.id ?? null,
      shadeIds: preferredGumShadesList.map((s) => s.id),
      ready:
        preferredShadesFetchEnabled &&
        !preferredGumLoading &&
        gumHasExplicitPreference !== false &&
        preferredGumBrand?.id != null,
    }),
    [
      isOpen,
      editingProduct,
      preferredGumBrand?.id,
      preferredGumShadesList,
      preferredShadesFetchEnabled,
      preferredGumLoading,
      gumHasExplicitPreference,
    ],
  )
  const teethPreferredAutoFill = useMemo(
    () => ({
      isOpen,
      isCreateMode: !editingProduct,
      brandId: preferredTeethBrand?.id ?? null,
      shadeIds: preferredTeethShadesList.map((s) => s.id),
      ready:
        preferredShadesFetchEnabled &&
        !preferredTeethLoading &&
        teethHasExplicitPreference !== false &&
        preferredTeethBrand?.id != null,
    }),
    [
      isOpen,
      editingProduct,
      preferredTeethBrand?.id,
      preferredTeethShadesList,
      preferredShadesFetchEnabled,
      preferredTeethLoading,
      teethHasExplicitPreference,
    ],
  )

  const [isMaximized, setIsMaximized] = useState(true)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [visibleTabs, setVisibleTabs] = useState<Set<string>>(new Set(["details"]))
  const { t } = useTranslation()
  const [sections, setSections] = useState({
    productDetails: true,
    variation: true,
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
  const [sectionWasToggled, setSectionWasToggled] = useState(false)

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

  const tabs = ADD_PRODUCT_MODAL_TABS

  // Show all tabs when editing, progressive reveal when creating
  useEffect(() => {
    if (isOpen && editingProduct) {
      setActiveTab("details")
      const teethOn =
        editingProduct.is_teeth_based_price === "Yes" ||
        editingProduct.is_teeth_based_price === true ||
        editingProduct.is_teeth_based_price === "yes"
      setVisibleTabs(
        new Set(ADD_PRODUCT_MODAL_TABS.map((tab) => tab.id).filter((id) => id !== "variation" || teethOn)),
      )
      setSectionWasToggled(false)
    } else if (isOpen && !editingProduct) {
      setVisibleTabs(new Set(["details"]))
      setActiveTab("details")
      setSectionWasToggled(false)
    }
  }, [isOpen, editingProduct])

  const initialFormValues: ProductCreateForm = useMemo(() => ({
    name: "",
    code: "",
    category_id: null,
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
    has_grade_based_pricing: "Yes",
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
    opposite_extractions: [],
    apply_same_status_to_opposing: true,
    request_opposing_extraction: false,
    is_teeth_based_price: "No",
    teeth_pricing_type: "same_price",
    teeth_price_per_tooth: "",
    teeth_first_tooth_price: "",
    teeth_additional_tooth_price: "",
    teeth_custom_prices: [],
    enable_tooth_count_variation: "No",
    tooth_count_variations: [],
    show_jaw_photo: "No",
  }), [])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isDirty, dirtyFields, isValid, isSubmitting, errors },
  } = useForm<ProductCreateForm>({
    resolver: zodResolver(ProductCreateFormSchema),
    defaultValues: initialFormValues,
    mode: "onChange",
    reValidateMode: "onBlur",
    shouldFocusError: true,
  })

  const watchedIsTeethBased = useWatch({ control, name: "is_teeth_based_price" })

  /** Skip Variation entirely when not charging per tooth (same as lab product modal). */
  const tabsForNavigation = useMemo(() => {
    if (watchedIsTeethBased === "Yes") return ADD_PRODUCT_MODAL_TABS
    return ADD_PRODUCT_MODAL_TABS.filter((t) => t.id !== "variation")
  }, [watchedIsTeethBased])

  const currentTabIndex = tabsForNavigation.findIndex((tab) => tab.id === activeTab)
  const safeTabIndex = currentTabIndex >= 0 ? currentTabIndex : 0
  const isFirstTab = safeTabIndex === 0
  const isLastTab = safeTabIndex === tabsForNavigation.length - 1

  const handleNext = () => {
    if (isLastTab) return
    const nextTab = tabsForNavigation[safeTabIndex + 1]
    setVisibleTabs((prev) => new Set([...prev, nextTab.id]))
    setActiveTab(nextTab.id)
  }

  const handlePrevious = () => {
    if (safeTabIndex <= 0) return
    setActiveTab(tabsForNavigation[safeTabIndex - 1].id)
  }

  const prevTeethBasedRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!isOpen) {
      prevTeethBasedRef.current = undefined
    }
  }, [isOpen])

  // When user turns per-tooth pricing off, hide Variation; do not run on stale "No" before form reset.
  useEffect(() => {
    if (!isOpen) return
    if (watchedIsTeethBased === "Yes") {
      prevTeethBasedRef.current = watchedIsTeethBased
      setVisibleTabs((prev) => {
        if (prev.has("variation")) return prev
        const next = new Set(prev)
        next.add("variation")
        return next
      })
      return
    }
    const turningOffTeeth = prevTeethBasedRef.current === "Yes"
    prevTeethBasedRef.current = watchedIsTeethBased
    if (!turningOffTeeth) return

    setVisibleTabs((prev) => {
      if (!prev.has("variation")) return prev
      const next = new Set(prev)
      next.delete("variation")
      return next
    })
    setActiveTab((prev) => (prev === "variation" ? "details" : prev))
    setSections((s) => ({ ...s, variation: false }))
    setValue("enable_tooth_count_variation", "No", { shouldDirty: true })
    setValue("tooth_count_variations", [], { shouldDirty: true })
  }, [watchedIsTeethBased, setValue, isOpen])

  useEffect(() => {
    if (!isValid && errors) {
      console.log('❌ Form validation errors:', JSON.stringify(errors, null, 2))
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

  // Fetch categories with subcategories for category/subcategory dropdowns
  const fetchCategoriesWithSubcategories = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) return

      const params = new URLSearchParams({
        lang: "en",
        per_page: "100",
        status: "Active"
      })

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
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
    fetchGumShadeBrands()
    fetchTeethShadeBrands()
    fetchMaterials()
    fetchRetentions()
    fetchAllAddOns()
    fetchExtractions()
  }, [
    fetchParentDropdownCategories,
    fetchCategoriesWithSubcategories,
    fetchGrades,
    fetchStages,
    fetchImpressions,
    fetchGumShadeBrands,
    fetchTeethShadeBrands,
    fetchMaterials,
    fetchRetentions,
    fetchAllAddOns,
    fetchExtractions,
  ])

  const getNormalizedFormValues = useCallback((): ProductCreateForm => {
    if (!editingProduct) return initialFormValues

    const materialPriceByMid = new Map<number, string | number>()
    for (const m of editingProduct.materials || []) {
      const mid = m?.material_id ?? m?.id
      if (mid == null) continue
      const p = m?.price ?? m?.pivot?.price ?? m?.lab_material?.price
      if (p !== undefined && p !== null && p !== "") {
        materialPriceByMid.set(Number(mid), p)
      }
    }

    function mapWithStatus(arr: any[], idKey: string) {
      if (!Array.isArray(arr)) return []
      return arr.map((item, idx) => {
        if (idKey === "gum_shade_id" || idKey === "teeth_shade_id") {
          return {
            [idKey]: item[idKey] ?? item.id,
            sequence: item.sequence && item.sequence >= 1 ? item.sequence : idx + 1,
            status: item.status || "Active",
            is_preferred:
              item.is_preferred === "Yes" ||
              item.is_preferred === true ||
              item.pivot?.is_preferred === "Yes"
                ? "Yes"
                : "No",
          }
        }
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
            markup_percent:
              item.markup_percent != null && item.markup_percent !== ""
                ? String(item.markup_percent)
                : undefined,
            first_tooth_price:
              item.first_tooth_price != null && item.first_tooth_price !== ""
                ? String(item.first_tooth_price)
                : undefined,
            additional_tooth_price:
              item.additional_tooth_price != null && item.additional_tooth_price !== ""
                ? String(item.additional_tooth_price)
                : undefined,
            teeth_price_tiers: Array.isArray(item.teeth_price_tiers) ? item.teeth_price_tiers : undefined,
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
        } else if (idKey === "stage_id") {
          const stagePrice = item.price ?? item.economy_price ?? ""
          const stageDays = item.days !== undefined && item.days !== null ? String(item.days) : ""
          return {
            ...baseItem,
            economy_price: String(stagePrice),
            standard_price: String(stagePrice),
            days: stageDays,
            is_default: item.is_default === "Yes" ? "Yes" : "No",
            is_releasing_stage: item.is_releasing_stage ?? "No",
            grade_prices: item.grade_prices ?? {},
            allocation_percent:
              item.allocation_percent != null && item.allocation_percent !== ""
                ? String(item.allocation_percent)
                : undefined,
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
        } else if (idKey === "material_id") {
          const mid = item[idKey] ?? item.id
          const priceValue =
            item.price ??
            item.pivot?.price ??
            item.lab_material?.price ??
            (mid != null ? materialPriceByMid.get(Number(mid)) : undefined) ??
            ""
          let price = 0
          if (priceValue !== undefined && priceValue !== null && priceValue !== "") {
            const parsedPrice = typeof priceValue === "number" ? priceValue : parseFloat(String(priceValue))
            if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
              price = Math.min(parsedPrice, 999999.99)
            }
          }
          return {
            ...baseItem,
            is_default: item.is_default === "Yes" ? "Yes" : "No",
            price,
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

    const mappedGrades = mapWithStatus(gradesArr, "grade_id")
    const strategyForm = teethStrategyApiToForm(editingProduct.teeth_pricing_strategy)
    const useGradeRowForTeeth = hasGradeBasedPricing === "Yes" && mappedGrades.length > 0
    const teethHydrate = useGradeRowForTeeth
      ? hydrateTeethPricingFieldsFromDefaultGrade(mappedGrades, strategyForm)
      : hydrateProductLevelTeethPricingFromApi(editingProduct as Record<string, unknown>, strategyForm)
    const variationForm = mapApiVariationsToForm(editingProduct)

    return {
      ...initialFormValues,
      name: editingProduct.name || "",
      code: editingProduct.code || "",
      category_id: editingProduct.subcategory?.category_id || editingProduct.subcategory?.category?.id || null,
      subcategory_id: editingProduct.subcategory?.id || editingProduct.subcategory_id || 0,
      type: mappedType,
      status: editingProduct.status || "Active",
      sequence: editingProduct.sequence || 1,
      description: editingProduct.description || "",
      grades: mappedGrades,
      stages: mapWithStatus(editingProduct.stages || [], "stage_id"),
      impressions: mapWithStatus(editingProduct.impressions || [], "impression_id"),
      gum_shades: normalizeSinglePreferredShadeRow(mapWithStatus(editingProduct.gum_shades || [], "gum_shade_id") as any),
      teeth_shades: normalizeSinglePreferredShadeRow(mapWithStatus(editingProduct.teeth_shades || [], "teeth_shade_id") as any),
      materials: mapWithStatus(
        editingProduct.material_details && editingProduct.material_details.length
          ? editingProduct.material_details
          : editingProduct.materials || [],
        "material_id",
      ),
      retentions: mapWithStatus(editingProduct.retentions || [], "retention_id"),
      addons: mapWithStatus(editingProduct.addons || [], "addon_id"),
      extractions: mapWithStatus(editingProduct.extractions || [], "extraction_id"),
      opposite_extractions: mapOppositeExtractionsFromApi(editingProduct.opposite_extractions || []),
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
      base_price: editingProduct.base_price ?? editingProduct.price ?? 0,
      apply_same_status_to_opposing:
        editingProduct.opposite_extractions && editingProduct.opposite_extractions.length > 0
          ? false
          : (editingProduct.apply_same_status_to_opposing ?? true),
      request_opposing_extraction: editingProduct.opposite_impression === "Yes" || editingProduct.opposite_impression === true || editingProduct.opposite_impression === 1 || editingProduct.request_opposing_extraction === true || editingProduct.request_opposing_extraction === 1 || (Array.isArray(editingProduct.opposite_extractions) && editingProduct.opposite_extractions.length > 0),
      is_teeth_based_price: editingProduct.is_teeth_based_price || "No",
      show_jaw_photo: productHasAnyJawPhotoUrls(editingProduct)
        ? "Yes"
        : (editingProduct.show_jaw_photo || "No"),
      teeth_pricing_type: strategyForm,
      ...teethHydrate,
      ...variationForm,
    }
  }, [editingProduct, initialFormValues])

  useEffect(() => {
    if (isOpen) {
      reset(getNormalizedFormValues())
      setJawPhotos(jawPhotosStateFromProduct(editingProduct ?? null))
      // Re-apply after reset: zodResolver / async ordering can leave opposite_extractions empty briefly — sync twice (microtask) so RHF picks it up.
      if (editingProduct?.opposite_extractions?.length) {
        const opp = mapOppositeExtractionsFromApi(editingProduct.opposite_extractions)
        const syncOpposite = () => {
          setValue("opposite_extractions", opp, { shouldDirty: false, shouldValidate: false })
          setValue("apply_same_status_to_opposing", false, { shouldDirty: false, shouldValidate: false })
        }
        syncOpposite()
        queueMicrotask(syncOpposite)
      }
      // Re-apply request_opposing_extraction after reset — zodResolver default(false) can override the value
      if (editingProduct) {
        const shouldCheck = editingProduct.opposite_impression !== "No" && (editingProduct.opposite_impression === "Yes" || editingProduct.opposite_impression === true || editingProduct.opposite_impression === 1 || editingProduct.request_opposing_extraction === true || editingProduct.request_opposing_extraction === 1 || (Array.isArray(editingProduct.opposite_extractions) && editingProduct.opposite_extractions.length > 0))
        setValue("request_opposing_extraction", shouldCheck, { shouldDirty: false, shouldValidate: false })
        queueMicrotask(() => {
          setValue("request_opposing_extraction", shouldCheck, { shouldDirty: false, shouldValidate: false })
        })
      }
      setImageBase64(null)
      clearValidationErrors()
      fetchData()

      // Initialize section toggles from product's has_* flags when editing.
      // When has_* flag is not in the API response (undefined), derive from whether items exist.
      if (editingProduct) {
        const isSingleStage = editingProduct.is_single_stage === "Yes"
        const isYes = (val: any, fallback: boolean) => {
          if (val === "Yes" || val === "yes" || val === true) return true
          if (val === "No" || val === "no" || val === false) return false
          return fallback // undefined/null → use fallback
        }
        const hasGrades = isYes(editingProduct.has_grade, Array.isArray(editingProduct.grades) && editingProduct.grades.length > 0)
        const hasStages = isYes(editingProduct.has_stage, Array.isArray(editingProduct.stages) && editingProduct.stages.length > 0)
        const hasImpressions = isYes(editingProduct.has_impression, Array.isArray(editingProduct.impressions) && editingProduct.impressions.length > 0)
        const hasGumShade = isYes(editingProduct.has_gum_shade, Array.isArray(editingProduct.gum_shades) && editingProduct.gum_shades.length > 0)
        const hasTeethShade = isYes(editingProduct.has_teeth_shade, Array.isArray(editingProduct.teeth_shades) && editingProduct.teeth_shades.length > 0)
        const hasMaterial = isYes(editingProduct.has_material, Array.isArray(editingProduct.materials) && editingProduct.materials.length > 0)
        const hasAddons = isYes(editingProduct.has_addon, Array.isArray(editingProduct.addons) && editingProduct.addons.length > 0)
        const hasRetention = isYes(editingProduct.has_retention, Array.isArray(editingProduct.retentions) && editingProduct.retentions.length > 0)
        const hasExtractions = isYes(editingProduct.has_extraction, Array.isArray(editingProduct.extractions) && editingProduct.extractions.length > 0)
        const teethOnEdit =
          editingProduct.is_teeth_based_price === "Yes" ||
          editingProduct.is_teeth_based_price === true ||
          editingProduct.is_teeth_based_price === "yes"
        const hasVariationRows = Array.isArray(editingProduct.variations) && editingProduct.variations.length > 0
        const hasVariation =
          teethOnEdit && (hasVariationRows || isYes(editingProduct.has_variation, true))
        setSections((prev) => ({
          ...prev,
          grades: hasGrades,
          stages: isSingleStage ? false : hasStages,
          impressions: hasImpressions,
          gumShade: hasGumShade,
          teethShade: hasTeethShade,
          material: hasMaterial,
          addOns: hasAddons,
          retention: hasRetention,
          extractions: hasExtractions,
          variation: hasVariation,
        }))

        // Initialize releasing stage IDs from existing stage data
        const existingReleasingIds = (editingProduct.stages || [])
          .filter((s: any) => s.is_releasing_stage === "Yes")
          .map((s: any) => s.stage_id ?? s.id)
        setReleasingStageIds(existingReleasingIds)
        setInitialReleasingStageIds(existingReleasingIds)
      } else {
        setSections({
          productDetails: true,
          variation: true,
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
        setReleasingStageIds([])
        setInitialReleasingStageIds([])
      }
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
    if (editingProduct?.id) {
      setSectionWasToggled(true)
    }
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
    if (hasFormChanges) {
      setShowDiscardDialog(true)
    } else {
      reset()
      setImageBase64(null)
      clearValidationErrors()
      onClose()
    }
  }

  const handleDiscard = () => {
    setShowDiscardDialog(false)
    reset()
    setImageBase64(null)
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
      // Build partial payload with only changed fields for update
      const payload: any = {}

      // Always include identifying fields
      payload.name = data.name
      payload.code = data.code
      payload.subcategory_id = data.subcategory_id
      payload.status = data.status
      payload.type = data.type

      // Include only dirty fields
      const dirty = dirtyFields as Record<string, any>
      for (const key of Object.keys(dirty)) {
        if (dirty[key] && key in data) {
          payload[key] = (data as any)[key]
        }
      }

      // When releasing stages changed, always include stages in the payload
      if (hasReleasingStageChanges && !payload.stages && data.stages) {
        payload.stages = data.stages
      }

      // Remove UI-only field
      delete payload.category_id

      // Always include price — backend requires it when customer_id is present (lab_admin).
      // useProductMutations adds customer_id for lab_admin, so we must send price too.
      {
        const candidates = [
          payload.base_price,
          data.base_price,
          editingProduct?.base_price,
          editingProduct?.price,
        ]
        let resolvedPrice: number | undefined
        let resolvedBasePrice: any
        for (const val of candidates) {
          if (val === undefined || val === null || val === "") continue
          const num = typeof val === "string" ? parseFloat(val) : Number(val)
          if (!isNaN(num) && num >= 0) {
            resolvedPrice = num
            resolvedBasePrice = val
            break
          }
        }
        if (resolvedPrice !== undefined) {
          payload.base_price = resolvedBasePrice
          payload.price = resolvedPrice
        } else {
          payload.price = 0
        }
      }

      // Attach image if uploaded
      if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
        payload.image = imageBase64
      }

      // show_jaw_photo
      payload.show_jaw_photo = (data as any).show_jaw_photo === "Yes" ? "Yes" : "No"

      // jaw_photos: only send new uploads or explicit removals
      const jawPhotoPayload: Record<string, string | null> = {}
      let hasJawPhotoChange = false
      const existingJawFromApi = jawPhotosStateFromProduct(editingProduct ?? null)
      ;(["upper", "lower", "both"] as const).forEach((slot) => {
        const val = jawPhotos[slot]
        if (val && val.startsWith("data:image/")) {
          jawPhotoPayload[slot] = val
          hasJawPhotoChange = true
        } else if (val === null) {
          const existingUrl = existingJawFromApi[slot]
          if (existingUrl) {
            jawPhotoPayload[slot] = null
            hasJawPhotoChange = true
          }
        }
      })
      if (hasJawPhotoChange) {
        payload.jaw_photos = jawPhotoPayload
      }

      // Always include has_* section flags
      payload.has_stage = sections.stages ? "Yes" : "No"
      payload.has_grade = sections.grades ? "Yes" : "No"
      payload.has_gum_shade = sections.gumShade ? "Yes" : "No"
      payload.has_teeth_shade = sections.teethShade ? "Yes" : "No"
      payload.has_impression = sections.impressions ? "Yes" : "No"
      payload.has_extraction = sections.extractions ? "Yes" : "No"
      payload.has_retention = sections.retention ? "Yes" : "No"
      payload.has_material = sections.material ? "Yes" : "No"
      payload.has_addon = sections.addOns ? "Yes" : "No"

      // When section is off: send empty arrays so backend deletes relations
      if (!sections.stages) payload.stages = []
      if (!sections.grades) payload.grades = []
      if (!sections.impressions) payload.impressions = []
      if (!sections.gumShade) payload.gum_shades = []
      if (!sections.teethShade) payload.teeth_shades = []
      if (!sections.material) payload.materials = []
      if (!sections.addOns) payload.addons = []
      if (!sections.retention) payload.retentions = []
      if (!sections.extractions) {
        payload.extractions = []
        payload.opposite_extractions = []
      }

      // Always include opposite_impression (backend field) so toggling is always persisted
      payload.opposite_impression = data.request_opposing_extraction ? "Yes" : "No"

      const allocUpdate = validateStageAllocationPercents(payload.stages ?? data.stages)
      if (allocUpdate) {
        alert(allocUpdate)
        return
      }
      finalizeLibraryProductApiPayload(payload as Record<string, unknown>, data, {
        variation: sections.variation,
      })

      success = await updateProduct(editingProduct.id, payload, releasingStageIds)
    } else {
      // Send full payload for creating new product
      const payload = { ...data } as any
      delete payload.category_id
      if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
        payload.image = imageBase64
      }

      // show_jaw_photo + jaw_photos for create
      payload.show_jaw_photo = (data as any).show_jaw_photo === "Yes" ? "Yes" : "No"
      const createJawPhotos: Record<string, string | null> = {}
      let hasCreateJawPhotos = false
      ;(["upper", "lower", "both"] as const).forEach((slot) => {
        const val = jawPhotos[slot]
        if (val && val.startsWith("data:image/")) {
          createJawPhotos[slot] = val
          hasCreateJawPhotos = true
        }
      })
      if (hasCreateJawPhotos) {
        payload.jaw_photos = createJawPhotos
      }

      // Section switches (same as edit path): API must get explicit has_* + empty arrays when off.
      // Omitting these lets the backend default has_* to Yes while relation arrays may still be sent from the form.
      payload.has_stage = sections.stages ? "Yes" : "No"
      payload.has_grade = sections.grades ? "Yes" : "No"
      payload.has_gum_shade = sections.gumShade ? "Yes" : "No"
      payload.has_teeth_shade = sections.teethShade ? "Yes" : "No"
      payload.has_impression = sections.impressions ? "Yes" : "No"
      payload.has_extraction = sections.extractions ? "Yes" : "No"
      payload.has_retention = sections.retention ? "Yes" : "No"
      payload.has_material = sections.material ? "Yes" : "No"
      payload.has_addon = sections.addOns ? "Yes" : "No"

      if (!sections.stages) payload.stages = []
      if (!sections.grades) payload.grades = []
      if (!sections.impressions) payload.impressions = []
      if (!sections.gumShade) payload.gum_shades = []
      if (!sections.teethShade) payload.teeth_shades = []
      if (!sections.material) payload.materials = []
      if (!sections.addOns) payload.addons = []
      if (!sections.retention) payload.retentions = []
      if (!sections.extractions) {
        payload.extractions = []
        payload.opposite_extractions = []
      }

      const allocCreate = validateStageAllocationPercents(payload.stages)
      if (allocCreate) {
        alert(allocCreate)
        return
      }
      finalizeLibraryProductApiPayload(payload as Record<string, unknown>, data, {
        variation: sections.variation,
      })

      success = await createProduct(payload)
    }
    if (success) {
      reset()
      setImageBase64(null)
      setSectionWasToggled(false)
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

  const watchedGrades = useWatch({ control, name: "grades" }) || []
  const watchedStages = useWatch({ control, name: "stages" }) || []
  const watchedImpressions = watch("impressions") || []
  const watchedGumShades = watch("gum_shades") || []
  const watchedTeethShades = watch("teeth_shades") || []
  const watchedMaterials = watch("materials") || []
  const watchedRetentions = watch("retentions") || []
  const watchedAddons = watch("addons") || []
  const watchedExtractions = watch("extractions") || []
  const watchedOfficeVisibilities = watch("office_visibilities") || []
  const watchedIsSingleStage = useWatch({ control, name: "is_single_stage" })
  const watchedHasGradeBasedPricing = watch("has_grade_based_pricing")
  const watchedApplyRetentionMechanism = watch("apply_retention_mechanism")
  const watchedLinkAllAddons = watch("link_all_addons")

  const [releasingStageIds, setReleasingStageIds] = useState<(string | number)[]>([])
  const [initialReleasingStageIds, setInitialReleasingStageIds] = useState<(string | number)[]>([])
  const [draggedStageId, setDraggedStageId] = useState<string | number | null>(null)
  const [customGradeNames, setCustomGradeNames] = useState<Record<number, string>>({})

  // Track previous is_single_stage to only react to user changes, not initial mount
  const prevIsSingleStageRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    // Skip the very first render — initial sections are already set from editingProduct
    if (prevIsSingleStageRef.current === undefined) {
      prevIsSingleStageRef.current = watchedIsSingleStage || "No"
      return
    }
    // Only act when the value actually changed
    if (prevIsSingleStageRef.current !== watchedIsSingleStage) {
      prevIsSingleStageRef.current = watchedIsSingleStage || "No"
      if (watchedIsSingleStage === "Yes") {
        setSections((prev: any) => ({ ...prev, stages: false }))
        setValue("stages", [], { shouldDirty: true })
        setReleasingStageIds([])
      } else if (watchedIsSingleStage === "No") {
        setSections((prev: any) => ({ ...prev, stages: true }))
      }
    }
  }, [watchedIsSingleStage, setValue])

  // Track whether any grade is set as default
  const hasDefaultGrade = watchedGrades.some((g: any) => g.is_default === "Yes")

  // Validate stages have prices > 0 and days > 0
  const areStagesValid = useMemo(() => {
    if (activeTab !== "stages") return true
    if (!watchedStages || watchedStages.length === 0) return false

    const hasGradeBasedPricing = String(watchedHasGradeBasedPricing || "") === "Yes"
    const hasSelectedGrades = watchedGrades.length > 0

    return watchedStages.every((stage: any) => {
      // Validate days > 0
      const days = stage.days
      const numDays = typeof days === "string" ? parseInt(days, 10) : (typeof days === "number" ? days : 0)
      if (isNaN(numDays) || numDays <= 0) return false

      if (hasGradeBasedPricing && hasSelectedGrades) {
        const gradePrices = stage.grade_prices || {}
        return watchedGrades.every((grade: any) => {
          const gradeId = grade.grade_id || grade.id
          const normalizedId = gradeId?.toString() || ""
          let price = gradePrices[gradeId] || gradePrices[normalizedId] || ""
          if (!price && typeof gradeId === "string" && !isNaN(Number(gradeId))) {
            price = gradePrices[Number(gradeId)] || ""
          }
          if (!price) price = (grade as any)?.price ?? ""
          const numPrice = typeof price === "string" ? parseFloat(price) : price
          return !isNaN(numPrice) && numPrice > 0
        })
      } else {
        const price = stage.economy_price || stage.standard_price || ""
        const numPrice = typeof price === "string" ? parseFloat(price) : price
        return !isNaN(numPrice) && numPrice > 0
      }
    })
  }, [activeTab, watchedStages, watchedGrades, watchedHasGradeBasedPricing])

  // Check if current step is valid for enabling/disabling Next button
  const isCurrentStepValid = useMemo(() => {
    // Grades tab: require at least one grade selected with a default set
    if (activeTab === "grades" && sections.grades) {
      if (watchedGrades.length === 0 || !hasDefaultGrade) return false
    }
    // Stages tab: require all stages have price > 0 and days > 0
    if (activeTab === "stages" && sections.stages) {
      return areStagesValid
    }
    return true
  }, [activeTab, sections.grades, sections.stages, watchedGrades.length, hasDefaultGrade, areStagesValid])

  // Consider form changed if fields are dirty OR a new image was uploaded OR releasing stages changed
  const hasReleasingStageChanges = useMemo(() => {
    if (releasingStageIds.length !== initialReleasingStageIds.length) return true
    const sortedCurrent = [...releasingStageIds].map(String).sort()
    const sortedInitial = [...initialReleasingStageIds].map(String).sort()
    return sortedCurrent.some((id, i) => id !== sortedInitial[i])
  }, [releasingStageIds, initialReleasingStageIds])

  const hasFormChanges = useMemo(() => {
    return isDirty || imageBase64 !== null || hasReleasingStageChanges || sectionWasToggled
  }, [isDirty, imageBase64, hasReleasingStageChanges, sectionWasToggled])

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
        <DialogContent className={`p-0 gap-0 flex flex-col ${isMaximized ? "w-[90vw] h-[90vh] max-w-[90vw]" : "sm:max-w-[900px] max-h-[90vh]"} overflow-hidden bg-white`}>
          <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-xl font-medium">
              {editingProduct
                ? `${t("productModal.editProduct", "Edit Product")} - ${editingProduct.name || ""}`
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

          <form
            onSubmit={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              // Prevent Enter key from submitting the form — only allow explicit Save/Update button clicks
              if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault()
              }
            }}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Tab Navigation */}
              {visibleTabs.size > 0 && (
                <div className="border-b border-gray-200 bg-white flex-shrink-0">
                  <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id
                      const isVisible = visibleTabs.has(tab.id)
                      const isSectionOff = tab.sectionKey ? sections[tab.sectionKey as keyof typeof sections] === false : false
                      if (tab.id === "variation" && watchedIsTeethBased !== "Yes") return null
                      if (!isVisible) return null
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`
                            px-6 py-4 text-sm font-medium border-b-2 transition-colors relative whitespace-nowrap flex-shrink-0 flex items-center gap-1.5
                            ${isActive
                              ? "border-[#1162a8] text-[#1162a8]"
                              : isSectionOff
                                ? "border-transparent text-gray-400 hover:text-gray-500 cursor-pointer"
                                : "border-transparent text-gray-600 hover:text-gray-800 cursor-pointer"
                            }
                          `}
                        >
                          {tab.label}
                          {isSectionOff && <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

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
                    userRole={userRole}
                    editingProduct={editingProduct}
                    setValue={setValue}
                    onImageChange={setImageBase64}
                    currentImageBase64={imageBase64}
                    jawPhotos={jawPhotos}
                    onJawPhotoChange={handleJawPhotoChange}
                  />
                </TabsContent>

                <TabsContent value="variation" className="mt-0 p-6 focus-visible:outline-none">
                  <VariationSection
                    control={control}
                    setValue={setValue}
                    sections={sections}
                    toggleSection={toggleSection}
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
                    handleStageToggle={handleToggleSelection}
                    handleStageReorder={(reorderedStages: any) => setValue("stages", reorderedStages, { shouldDirty: true })}
                    userRole={userRole}
                    isSingleStage={watchedIsSingleStage === "Yes"}
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
                    preferredAutoFill={gumPreferredAutoFill}
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
                    preferredAutoFill={teethPreferredAutoFill}
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
                    userRole={userRole}
                  />
                </TabsContent>

                <TabsContent value="extractions" forceMount className="mt-0 p-6 focus-visible:outline-none data-[state=inactive]:hidden">
                  <ExtractionsSection
                    key={editingProduct?.id != null ? `ext-${editingProduct.id}` : "ext-new"}
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
                    apiOppositeExtractionCount={editingProduct?.opposite_extractions?.length ?? 0}
                    editingProductKey={editingProduct?.id ?? null}
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
                    {editingProduct && hasFormChanges && (
                      <Button
                        type="button"
                        className="bg-[#1162a8] hover:bg-[#0d4c84] h-10 sm:px-8"
                        disabled={isSubmitting || isProductActionLoading}
                        onClick={() => void handleSubmit(debouncedSubmit)()}
                      >
                        {isSubmitting || isProductActionLoading
                          ? t("productModal.updating", "Updating...")
                          : t("productModal.updateProduct", "Update Product")}
                      </Button>
                    )}
                    {isLastTab ? (
                      !editingProduct && (
                        <Button
                          type="button"
                          className="bg-[#1162a8] hover:bg-[#0d4c84] h-10 sm:px-8"
                          disabled={isSubmitting || isProductActionLoading}
                          onClick={() => void handleSubmit(debouncedSubmit)()}
                        >
                          {isSubmitting || isProductActionLoading
                            ? t("productModal.saving", "Saving...")
                            : t("productModal.saveProduct", "Save Product")}
                        </Button>
                      )
                    ) : (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="bg-[#1162a8] hover:bg-[#0d4c84] h-10 sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed"
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
