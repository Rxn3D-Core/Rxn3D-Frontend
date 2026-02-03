"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/lib/performance-utils"
import { debounce } from "@/lib/performance"
import { useToast } from "@/hooks/use-toast"
import { useProductCategory } from "@/contexts/product-category-context"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { useImplants } from "@/lib/api/advance-mode-query"
import { useCaseDesignStore } from "@/stores/caseDesignStore"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import type { Doctor, Lab, PatientData, Product, SavedProduct } from "../sections/types"

export function useCaseDesignCenter() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const {
    allCategories,
    fetchAllCategories,
    allCategoriesLoading,
    subcategoriesByCategory,
    subcategoriesLoading,
    subcategoriesError,
    fetchSubcategoriesByCategory
  } = useProductCategory()

  const { fetchLabProducts, labProducts, fetchProductDetails } = useSlipCreation()

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null)
  const [showSubcategories, setShowSubcategories] = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductDetails, setShowProductDetails] = useState(false)
  // Product details from API - includes extractions, stages, grades, etc.
  // This is fetched from /v1/library/products/{id}?lang=en&customer_id={id}
  // Use productDetails.extractions as the basis for extraction functionality
  const [productDetails, setProductDetails] = useState<any | null>(null)
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState(false)

  // Arch selection state - track which arch user wants to configure
  const [selectedArchForProduct, setSelectedArchForProduct] = useState<"maxillary" | "mandibular" | null>(null)
  const [showMaxillaryChart, setShowMaxillaryChart] = useState<boolean>(false)
  const [showMandibularChart, setShowMandibularChart] = useState<boolean>(false)
  const [selectedProductForMaxillary, setSelectedProductForMaxillary] = useState<Product | null>(null)
  const [selectedProductForMandibular, setSelectedProductForMandibular] = useState<Product | null>(null)

  // Dental chart states
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([])
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([])

  // Retention type state - tracks which retention types are selected for each tooth
  const [maxillaryRetentionTypes, setMaxillaryRetentionTypes] = useState<Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>>({})
  const [mandibularRetentionTypes, setMandibularRetentionTypes] = useState<Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>>({})

  // Retention popover state
  const [retentionPopoverState, setRetentionPopoverState] = useState<{
    arch: 'maxillary' | 'mandibular' | null
    toothNumber: number | null
  }>({ arch: null, toothNumber: null })

  // Arch selection popover state for removable restoration + complete denture
  const [showArchSelectionPopover, setShowArchSelectionPopover] = useState<boolean>(false)
  const [pendingProductForArchSelection, setPendingProductForArchSelection] = useState<Product | null>(null)
  const [archSelectionPopoverAnchor, setArchSelectionPopoverAnchor] = useState<{ x: number; y: number } | null>(null)

  // Form states for MAXILLARY
  const [maxillaryMaterial, setMaxillaryMaterial] = useState<string>("")
  const [maxillaryStumpShade, setMaxillaryStumpShade] = useState<string>("")
  const [maxillaryRetention, setMaxillaryRetention] = useState<string>("")
  const [maxillaryImplantDetails, setMaxillaryImplantDetails] = useState<string>("")
  const [maxillaryMaterialId, setMaxillaryMaterialId] = useState<number | undefined>(undefined)
  const [maxillaryRetentionId, setMaxillaryRetentionId] = useState<number | undefined>(undefined)
  const [maxillaryRetentionOptionId, setMaxillaryRetentionOptionId] = useState<number | undefined>(undefined)
  const [maxillaryGumShadeId, setMaxillaryGumShadeId] = useState<number | undefined>(undefined)
  const [maxillaryShadeId, setMaxillaryShadeId] = useState<number | undefined>(undefined)
  const [maxillaryStageId, setMaxillaryStageId] = useState<number | undefined>(undefined)
  const [maxillaryToothShade, setMaxillaryToothShade] = useState<string>("")
  const [maxillaryStage, setMaxillaryStage] = useState<string>("")
  // Implant detail form fields for maxillary
  const [maxillaryImplantInclusions, setMaxillaryImplantInclusions] = useState<string>("")
  const [maxillaryAbutmentDetail, setMaxillaryAbutmentDetail] = useState<string>("")
  const [maxillaryAbutmentType, setMaxillaryAbutmentType] = useState<string>("")

  // Form states for MANDIBULAR
  const [mandibularMaterial, setMandibularMaterial] = useState<string>("")
  const [mandibularRetention, setMandibularRetention] = useState<string>("")
  const [mandibularStumpShade, setMandibularStumpShade] = useState<string>("")
  const [mandibularImplantDetails, setMandibularImplantDetails] = useState<string>("")
  const [mandibularMaterialId, setMandibularMaterialId] = useState<number | undefined>(undefined)
  const [mandibularRetentionId, setMandibularRetentionId] = useState<number | undefined>(undefined)
  const [mandibularRetentionOptionId, setMandibularRetentionOptionId] = useState<number | undefined>(undefined)
  const [mandibularGumShadeId, setMandibularGumShadeId] = useState<number | undefined>(undefined)
  const [mandibularShadeId, setMandibularShadeId] = useState<number | undefined>(undefined)
  const [mandibularStageId, setMandibularStageId] = useState<number | undefined>(undefined)
  const [mandibularToothShade, setMandibularToothShade] = useState<string>("")
  const [mandibularStage, setMandibularStage] = useState<string>("")
  // Implant detail form fields for mandibular
  const [mandibularImplantInclusions, setMandibularImplantInclusions] = useState<string>("")
  const [mandibularAbutmentDetail, setMandibularAbutmentDetail] = useState<string>("")
  const [mandibularAbutmentType, setMandibularAbutmentType] = useState<string>("")

  // State to track if advance fields should be shown per product
  const [showAdvanceFields, setShowAdvanceFields] = useState<{ [productId: string]: boolean }>({})

  // State to store fetched advance fields per product
  const [productAdvanceFields, setProductAdvanceFields] = useState<{ [productId: string]: any[] }>({})

  // State to store advance field values (for unsaved products in accordion)
  const [advanceFieldValues, setAdvanceFieldValues] = useState<{ [fieldId: string]: any }>({})

  // State to track which fields are completed per product (for progressive disclosure)
  const [completedFields, setCompletedFields] = useState<{ [productId: string]: Set<string> }>({})

  // State to track selected implant per field (for implant_library fields)
  const [selectedImplantIds, setSelectedImplantIds] = useState<{ [fieldKey: string]: number | null }>({})

  // State to track implant selection step: 'brand' | 'platform' | 'size' | 'form'
  const [implantSelectionStep, setImplantSelectionStep] = useState<{ [fieldKey: string]: 'brand' | 'platform' | 'size' | 'form' }>({})

  // State to track selected brand, platform, and size per field
  const [selectedImplantBrand, setSelectedImplantBrand] = useState<{ [fieldKey: string]: number | null }>({})
  const [selectedImplantPlatform, setSelectedImplantPlatform] = useState<{ [fieldKey: string]: number | null }>({})
  // Store full platform object for static platforms that aren't in brand.platforms
  const [selectedImplantPlatformData, setSelectedImplantPlatformData] = useState<{ [fieldKey: string]: { id: number, name: string } | null }>({})
  const [selectedImplantSize, setSelectedImplantSize] = useState<{ [fieldKey: string]: string | null }>({})

  // State to track if implant input field is focused/clicked (to show cards)
  const [showImplantCards, setShowImplantCards] = useState<boolean>(false)
  const [activeImplantFieldKey, setActiveImplantFieldKey] = useState<string | null>(null)
  // State to track which field type was clicked in form mode ('brand' | 'platform')
  const [clickedFieldTypeInForm, setClickedFieldTypeInForm] = useState<{ [fieldKey: string]: 'brand' | 'platform' | null }>({})

  // State to track if implant brand cards should be shown in DynamicProductFields (for implant details field)
  const [showImplantBrandCardsInFields, setShowImplantBrandCardsInFields] = useState<{ maxillary?: boolean; mandibular?: boolean }>({})
  // State to track which product's implant cards should be shown (for saved products accordion)
  const [showImplantCardsForProduct, setShowImplantCardsForProduct] = useState<{ [productId: string]: { maxillary?: boolean; mandibular?: boolean } }>({})
  const [selectedImplantBrandForDetails, setSelectedImplantBrandForDetails] = useState<{ maxillary?: number | null; mandibular?: number | null }>({})
  const [selectedImplantPlatformForDetails, setSelectedImplantPlatformForDetails] = useState<{ maxillary?: number | null; mandibular?: number | null }>({})
  // State to track which field type was clicked in the implant details section (brand or platform)
  const [clickedFieldTypeInImplantDetails, setClickedFieldTypeInImplantDetails] = useState<{ maxillary?: 'brand' | 'platform' | null; mandibular?: 'brand' | 'platform' | null }>({})
  // State to track selected implant brand/platform per product (for saved products)
  const [selectedImplantBrandPerProduct, setSelectedImplantBrandPerProduct] = useState<{ [productId: string]: { maxillary?: number | null; mandibular?: number | null } }>({})
  const [selectedImplantPlatformPerProduct, setSelectedImplantPlatformPerProduct] = useState<{ [productId: string]: { maxillary?: number | null; mandibular?: number | null } }>({})
  // State to track which field type was clicked in accordion (brand or platform)
  const [clickedFieldTypeInAccordion, setClickedFieldTypeInAccordion] = useState<{ [productId: string]: { maxillary?: 'brand' | 'platform' | null; mandibular?: 'brand' | 'platform' | null } }>({})

  // Ref for implant cards container to handle click outside
  const implantCardsRef = useRef<HTMLDivElement>(null)

  // Fetch implants for implant library fields
  const { data: implantsData, isLoading: implantsLoading } = useImplants({})
  const implants = implantsData?.data || []

  // Handle click outside to hide cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showImplantCards && implantCardsRef.current && !implantCardsRef.current.contains(event.target as Node)) {
        // Check if click is not on an implant input field
        const target = event.target as HTMLElement
        const isImplantInput = target.closest('input[placeholder="Select Implant"]')
        const isImplantFormField = target.closest('input[placeholder="Select Platform"]') ||
          target.closest('input[value*=""]') // Brand or platform field in form
        if (!isImplantInput && !isImplantFormField) {
          setShowImplantCards(false)
          // Reset clicked field type when hiding cards
          if (activeImplantFieldKey) {
            setClickedFieldTypeInForm(prev => ({ ...prev, [activeImplantFieldKey]: null }))
          }
        }
      }
    }

    if (showImplantCards) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showImplantCards, activeImplantFieldKey])

  // Track previous form state to detect when form is first displayed
  const prevFormStateRef = useRef<Set<string>>(new Set())

  // Automatically show implant brand cards when implant details form is displayed
  useEffect(() => {
    // Get current fields with form step and selected brand
    const currentFormFields = new Set(
      Object.entries(implantSelectionStep)
        .filter(([fieldKey, step]) =>
          step === 'form' &&
          selectedImplantBrand[fieldKey] !== null &&
          selectedImplantBrand[fieldKey] !== undefined
        )
        .map(([fieldKey]) => fieldKey)
    )

    // Check if there's a new form field that wasn't there before
    const newFormField = Array.from(currentFormFields).find(fieldKey => !prevFormStateRef.current.has(fieldKey))

    if (newFormField) {
      // Form was just displayed for this field - show brand cards automatically
      setShowImplantCards(true)
      setActiveImplantFieldKey(newFormField)

      // Scroll to top of the page to show the brand cards
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }

    // Update the ref with current state
    prevFormStateRef.current = currentFormFields
  }, [implantSelectionStep, selectedImplantBrand])

  // Accordion state per section - maxillary and mandibular can each have one open at a time (independent)
  const [openAccordionMaxillary, setOpenAccordionMaxillary] = useState<string | null>(null)
  const [openAccordionMandibular, setOpenAccordionMandibular] = useState<string | null>(null)

  // State to track which stage dropdown is open: { [productId]: { [arch]: boolean } }
  const [openStageDropdown, setOpenStageDropdown] = useState<Record<string, { maxillary?: boolean; mandibular?: boolean }>>({})

  // State to track which retention dropdown is open: { [productId]: { [arch]: boolean } }
  const [openRetentionDropdown, setOpenRetentionDropdown] = useState<Record<string, { maxillary?: boolean; mandibular?: boolean }>>({})

  // Impression selection modal state
  const [showImpressionModal, setShowImpressionModal] = useState<boolean>(false)
  const [currentImpressionArch, setCurrentImpressionArch] = useState<"maxillary" | "mandibular">("maxillary")
  const [selectedImpressions, setSelectedImpressions] = useState<Record<string, number>>({}) // key: `${productId}_${arch}_${impressionName}`, value: quantity
  const [currentProductForImpression, setCurrentProductForImpression] = useState<SavedProduct | null>(null)
  // STL files attached to impressions: key: impressionKey, value: array of files
  const [stlFilesByImpression, setStlFilesByImpression] = useState<Record<string, Array<{ file: File, url: string, type: "stl" | "image" | "other" }>>>({})

  // Validation state - when true, show red borders on required empty fields
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(true)

  // Shade selection modal state
  const [showShadeModal, setShowShadeModal] = useState<boolean>(false)
  const [currentShadeField, setCurrentShadeField] = useState<"tooth_shade" | "stump_shade" | null>(null)
  const [currentShadeArch, setCurrentShadeArch] = useState<"maxillary" | "mandibular">("maxillary")
  const [currentShadeProductId, setCurrentShadeProductId] = useState<string | null>(null)
  const [selectedShadesForSVG, setSelectedShadesForSVG] = useState<string[]>([])
  const [selectedShadeOption, setSelectedShadeOption] = useState<"custom" | "stump" | null>(null)
  const [selectedShadeGuide, setSelectedShadeGuide] = useState<string>("Vita Classical")

  // Modal states (for add-ons, attach, rush modals - must be before savedProductSectionContextValue useMemo)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [showRushModal, setShowRushModal] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [currentProductForModal, setCurrentProductForModal] = useState<SavedProduct | null>(null)
  const [currentArchForModal, setCurrentArchForModal] = useState<"maxillary" | "mandibular" | null>(null)

  // Shade guide options
  const shadeGuideOptions = [
    "Vita Classical",
    "Chromascop",
    "Trubyte Bioform IPN"
  ]

  // Helper function to get field order based on category
  const getFieldOrder = (category: string): string[] => {
    // Handle undefined or null category
    if (!category) {
      return ["product_material", "retention", "stage"]
    }

    const categoryLower = category.toLowerCase()
    const isFixedRestoration = categoryLower.includes("fixed")
    const isRemovableOrOrtho = categoryLower.includes("removable") ||
      categoryLower.includes("orthodontic") ||
      categoryLower.includes("ortho")

    if (isFixedRestoration) {
      return [
        "product_material",
        "retention",
        "implant",
        "stump_shade",
        "crown_third_shade",
        "tooth_shade",
        "stage",
        "pontic_design",
        "embrasures",
        "occlusal_contact",
        "interproximal_contact",
        "gap",
        "impressions",
        "add_ons"
      ]
    } else if (isRemovableOrOrtho) {
      return [
        "product_material",
        "implant",
        "grade",
        "stage",
        "teeth_shade",
        "gum_shade",
        "impression",
        "advance_fields"
      ]
    }
    // Default order (fallback)
    return ["product_material", "retention", "stage"]
  }

  // Helper function to get the correct customer_id based on role
  // For office_admin, use selectedLab.id; for others, use the user's customerId
  const getCustomerIdForApi = (): number | undefined => {
    if (typeof window === "undefined") return undefined
    const role = localStorage.getItem("role")
    if (role === "office_admin") {
      // For office_admin, use the selected lab's ID as customer_id
      // Check state first, then localStorage as fallback
      const lab = selectedLab || (() => {
        const storedLab = localStorage.getItem("selectedLab")
        if (storedLab) {
          try {
            return JSON.parse(storedLab)
          } catch {
            return null
          }
        }
        return null
      })()
      if (lab) {
        return lab.id || lab.customer_id || undefined
      }
    }
    // For other roles, use the user's customerId
    const customerId = localStorage.getItem("customerId")
    return customerId ? Number(customerId) : undefined
  }

  // Helper to check if any tooth in the saved product has a retention type selected from popover
  const hasRetentionTypeSelected = (savedProduct: SavedProduct, arch: "maxillary" | "mandibular"): boolean => {
    const teeth = arch === "maxillary" ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth
    const retentionTypes = arch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes

    // If no teeth are selected, don't show the field
    if (!teeth || teeth.length === 0) {
      return false
    }

    // Check if any tooth in the product has a retention type selected from popover
    const hasSelection = teeth.some(toothNumber => {
      const types = retentionTypes[toothNumber] || []
      // Only return true if there's actually a retention type selected (Implant, Prep, or Pontic)
      return types.length > 0 && (types.includes('Implant') || types.includes('Prep') || types.includes('Pontic'))
    })

    return hasSelection
  }

  // Helper to check if retention value is valid (not empty, not placeholder)
  const hasValidRetentionValue = (retentionValue: string | undefined | null): boolean => {
    if (!retentionValue) return false
    const trimmed = String(retentionValue).trim()
    return trimmed !== '' &&
      trimmed !== 'Not specified' &&
      trimmed !== 'Select' &&
      trimmed !== 'Retention type'
  }

  // Helper function to check if a field is configured for the product
  const isFieldConfigured = (fieldName: string, productDetails: any, savedProduct: SavedProduct, archType?: "maxillary" | "mandibular"): boolean => {
    if (!productDetails) return false

    switch (fieldName) {
      case "retention":
        // Only show retention field if user has selected a retention type from popover
        if (!archType) return false
        return hasRetentionTypeSelected(savedProduct, archType)
      case "implant":
        // Only show implant field if retention type is "Implant" (not "Prep" or "Pontic")
        if (!archType) return false
        const teeth = archType === "maxillary" ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth
        const retentionTypes = archType === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes

        // First, check if any tooth in the product has "Implant" as the retention type from state
        let hasImplantRetentionType = teeth.some(toothNumber => {
          const types = retentionTypes[toothNumber] || []
          return types.includes('Implant')
        })

        // Fallback: If retentionTypes state is empty, check the retention option's tooth_chart_type
        // This handles saved products that might not have retentionTypes state populated
        if (!hasImplantRetentionType && productDetails?.retention_options) {
          const retentionOptionId = archType === "maxillary"
            ? savedProduct.maxillaryRetentionOptionId
            : savedProduct.mandibularRetentionOptionId

          if (retentionOptionId) {
            const selectedRetentionOption = productDetails.retention_options.find((opt: any) => {
              return opt.id === retentionOptionId ||
                opt.lab_retention_option?.id === retentionOptionId ||
                opt.retention_option_id === retentionOptionId
            })

            if (selectedRetentionOption) {
              const toothChartType = selectedRetentionOption.tooth_chart_type ||
                selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                selectedRetentionOption.retention_option?.tooth_chart_type

              hasImplantRetentionType = toothChartType === "Implant"
            }
          }
        }

        if (!hasImplantRetentionType) return false

        // Also check if product has implant configuration
        const implantDetails = archType === "maxillary" ? savedProduct.maxillaryImplantDetails : savedProduct.mandibularImplantDetails
        return !!(productDetails.implant || implantDetails)
      case "grade":
        return !!(productDetails.grades && Array.isArray(productDetails.grades) && productDetails.grades.length > 0)
      case "teeth_shade":
        return !!(productDetails.teeth_shades && Array.isArray(productDetails.teeth_shades) && productDetails.teeth_shades.length > 0)
      case "gum_shade":
        return !!(productDetails.gum_shades && Array.isArray(productDetails.gum_shades) && productDetails.gum_shades.length > 0)
      case "stump_shade":
        // Check if stump_shade exists as an advance field
        const advanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
        const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
        // If stump_shade exists as an advance field, use that; otherwise, check if it's configured as a regular field
        if (stumpShadeField) {
          return true
        }
        // Fallback: check if advance fields exist (for backward compatibility)
        return advanceFields.length > 0
      case "crown_third_shade":
      case "pontic_design":
      case "embrasures":
      case "occlusal_contact":
      case "interproximal_contact":
      case "gap":
      case "advance_fields":
        const allAdvanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
        return allAdvanceFields.length > 0
      default:
        return true // Always show product_material, stage, impressions, add_ons
    }
  }

  // Helper function to get advance field by name
  const getAdvanceFieldByName = (fieldName: string, advanceFields: any[]): any | null => {
    if (!advanceFields || !Array.isArray(advanceFields)) return null

    const nameLower = fieldName.toLowerCase()
    return advanceFields.find(field => {
      const fieldNameLower = (field.name || "").toLowerCase()
      if (nameLower === "stump_shade") {
        return fieldNameLower.includes("stump") && fieldNameLower.includes("shade")
      } else if (nameLower === "crown_third_shade") {
        return fieldNameLower.includes("crown") && (fieldNameLower.includes("third") || fieldNameLower.includes("3rd")) && fieldNameLower.includes("shade")
      } else if (nameLower === "pontic_design") {
        return fieldNameLower.includes("pontic") && fieldNameLower.includes("design")
      } else if (nameLower === "embrasures") {
        return fieldNameLower.includes("embrasure")
      } else if (nameLower === "occlusal_contact") {
        return fieldNameLower.includes("occlusal") && fieldNameLower.includes("contact")
      } else if (nameLower === "interproximal_contact") {
        return (fieldNameLower.includes("interproximal") || fieldNameLower.includes("proximal")) && fieldNameLower.includes("contact")
      } else if (nameLower === "gap") {
        return fieldNameLower.includes("gap")
      }
      return false
    }) || null
  }

  // Helper function to get advance field value from saved product
  const getAdvanceFieldValue = (savedProduct: SavedProduct, fieldId: number, archType: "maxillary" | "mandibular"): any => {
    if (!savedProduct.advanceFields || !Array.isArray(savedProduct.advanceFields)) {
      return null
    }

    // Find the advance field data for this field ID
    const savedField = savedProduct.advanceFields.find((af: any) => af.advance_field_id === fieldId)
    if (!savedField) {
      return null
    }

    return savedField
  }

  // Helper function to render an advance field for saved products
  const renderSavedAdvanceField = (field: any, savedProduct: SavedProduct, archType: "maxillary" | "mandibular") => {
    const savedField = getAdvanceFieldValue(savedProduct, field.id, archType)
    const fieldValue = savedField?.advance_field_value || ""

    // For stump shade, check if we have a value in maxillaryStumpShade and sync it
    const isStumpShade = field.name?.toLowerCase().includes("stump") && field.name?.toLowerCase().includes("shade")
    const isToothShade = field.name?.toLowerCase().includes("tooth") && field.name?.toLowerCase().includes("shade")
    const stumpShadeValue = archType === "maxillary" ? savedProduct.maxillaryStumpShade : savedProduct.mandibularStumpShade
    const toothShadeValue = archType === "maxillary"
      ? (savedProducts.find(p => p.maxillaryTeeth.length > 0)?.maxillaryToothShade || "")
      : (savedProducts.find(p => p.mandibularTeeth.length > 0)?.mandibularToothShade || "")
    const displayValue = isStumpShade && stumpShadeValue
      ? stumpShadeValue
      : isToothShade && toothShadeValue
        ? toothShadeValue
        : fieldValue

    // Check if field is required and value is empty
    const isFieldRequired = field.is_required === "Yes" || field.is_required === true
    const isEmptyOrNotSpecified = !displayValue ||
      displayValue.trim() === "" ||
      displayValue.trim().toLowerCase() === "not specified" ||
      (field.field_type === "dropdown" && displayValue === `Select ${field.name}`)

    const showRedBorder = isFieldRequired && isEmptyOrNotSpecified

    // Render based on field_type
    if (field.field_type === "dropdown" && field.options && Array.isArray(field.options)) {
      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
      const selectedOption = activeOptions.find((opt: any) =>
        opt.id === displayValue ||
        opt.name === displayValue ||
        String(opt.id) === String(displayValue)
      )

      return (
        <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '38px' }}>
          <div
            className="flex items-center justify-between"
            style={{
              padding: '8px 12px 4px 12px',
              gap: '5px',
              width: '100%',
              height: '32px',
              background: '#FFFFFF',
              border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
              borderRadius: '7.7px',
              boxSizing: 'border-box',
              position: 'relative',
              marginTop: '5.27px'
            }}
          >
            <span style={{
              fontFamily: 'Verdana',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '13px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#000000'
            }}>{selectedOption ? selectedOption.name : (displayValue || 'Select')}</span>
            {isStumpShade && displayValue && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: '37.51px',
                  height: '41.97px',
                  background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                  borderRadius: '8px',
                  position: 'absolute',
                  right: '0px',
                  top: '-1px'
                }}
              >
                <span style={{
                  fontFamily: 'Verdana',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '12.8603px',
                  lineHeight: '18px',
                  letterSpacing: '-0.02em',
                  color: '#000000'
                }}>{displayValue}</span>
              </div>
            )}
          </div>
          <label
            className="absolute bg-white"
            style={{
              padding: '0px',
              height: '14px',
              left: '8.9px',
              top: '0px',
              fontFamily: 'Arial',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '14px',
              color: '#7F7F7F'
            }}
          >
            {isStumpShade ? "Stump Shade" : isToothShade ? "Tooth Shade" : (field.name || "Advanced Field")}
            {isFieldRequired && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    } else if (field.field_type === "text") {
      return (
        <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '38px' }}>
          <div
            className="flex items-center"
            style={{
              padding: '8px 12px 4px 12px',
              gap: '5px',
              width: '100%',
              height: '32px',
              background: '#FFFFFF',
              border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
              borderRadius: '7.7px',
              boxSizing: 'border-box',
              position: 'relative',
              marginTop: '5.27px'
            }}
          >
            <span style={{
              fontFamily: 'Verdana',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '13px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#000000'
            }}>{displayValue || 'Input'}</span>
          </div>
          <label
            className="absolute bg-white"
            style={{
              padding: '0px',
              height: '14px',
              left: '8.9px',
              top: '0px',
              fontFamily: 'Arial',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '14px',
              color: '#7F7F7F'
            }}
          >
            {isStumpShade ? "Stump Shade" : isToothShade ? "Tooth Shade" : (field.name || "Advanced Field")}
            {isFieldRequired && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    // Default rendering for other field types
    return (
      <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '38px' }}>
        <div
          className="flex items-center"
          style={{
            padding: '8px 12px 4px 12px',
            gap: '5px',
            width: '100%',
            height: '32px',
            background: '#FFFFFF',
            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
            borderRadius: '7.7px',
            boxSizing: 'border-box',
            position: 'relative',
            marginTop: '5.27px'
          }}
        >
          <span style={{
            fontFamily: 'Verdana',
            fontStyle: 'normal',
            fontWeight: 400,
            fontSize: '13px',
            lineHeight: '20px',
            letterSpacing: '-0.02em',
            color: '#000000'
          }}>{displayValue || 'Select'}</span>
        </div>
        <label
          className="absolute bg-white"
          style={{
            padding: '0px',
            height: '14px',
            left: '8.9px',
            top: '0px',
            fontFamily: 'Arial',
            fontStyle: 'normal',
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '14px',
            color: '#7F7F7F'
          }}
        >
          {field.name || "Advanced Field"}
          {isFieldRequired && (
            <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          )}
        </label>
      </div>
    )
  }

  // Field configuration system - defines field metadata
  type FieldType = "select" | "modal" | "shade" | "text"

  interface FieldConfig {
    key: string
    label: string
    apiProperty: string // Property name in productDetails API response
    fieldType: FieldType
    sequence: number // Display order
    maxillaryStateKey?: string // State variable name for maxillary
    mandibularStateKey?: string // State variable name for mandibular
    maxillaryIdKey?: string // ID state variable name for maxillary
    mandibularIdKey?: string // ID state variable name for mandibular
    dependsOn?: string // Field that must be selected first (e.g., retention_options depends on retention)
    rowGroup?: number // Fields in same rowGroup appear in same row
  }

  const fieldConfigs: FieldConfig[] = [
    {
      key: "material",
      label: "Product - Material",
      apiProperty: "materials",
      fieldType: "select",
      sequence: 1,
      maxillaryStateKey: "maxillaryMaterial",
      mandibularStateKey: "mandibularMaterial",
      maxillaryIdKey: "maxillaryMaterialId",
      mandibularIdKey: "mandibularMaterialId",
      rowGroup: 1
    },
    {
      key: "retention",
      label: "Retention type",
      apiProperty: "retentions",
      fieldType: "select",
      sequence: 2,
      maxillaryStateKey: "maxillaryRetention",
      mandibularStateKey: "mandibularRetention",
      maxillaryIdKey: "maxillaryRetentionId",
      mandibularIdKey: "mandibularRetentionId",
      rowGroup: 1
    },
    {
      key: "retention_option",
      label: "Retention Option",
      apiProperty: "retention_options",
      fieldType: "select",
      sequence: 3,
      maxillaryIdKey: "maxillaryRetentionOptionId",
      mandibularIdKey: "mandibularRetentionOptionId",
      dependsOn: "retention",
      rowGroup: 1
    },
    {
      key: "stage",
      label: "Stage",
      apiProperty: "stages",
      fieldType: "select",
      sequence: 4,
      maxillaryStateKey: "maxillaryStage",
      mandibularStateKey: "mandibularStage",
      maxillaryIdKey: "maxillaryStageId",
      mandibularIdKey: "mandibularStageId",
      rowGroup: 2
    },
    {
      key: "stump_shade",
      label: "Stump Shade",
      apiProperty: "gum_shades",
      fieldType: "shade",
      sequence: 5,
      maxillaryStateKey: "maxillaryStumpShade",
      mandibularStateKey: "mandibularStumpShade",
      maxillaryIdKey: "maxillaryGumShadeId",
      mandibularIdKey: "mandibularGumShadeId",
      rowGroup: 2
    },
    {
      key: "tooth_shade",
      label: "Tooth Shade",
      apiProperty: "teeth_shades",
      fieldType: "shade",
      sequence: 6,
      maxillaryStateKey: "maxillaryToothShade",
      mandibularStateKey: "mandibularToothShade",
      maxillaryIdKey: "maxillaryShadeId",
      mandibularIdKey: "mandibularShadeId",
      rowGroup: 2
    },
    {
      key: "impression",
      label: "Impression",
      apiProperty: "impressions",
      fieldType: "modal",
      sequence: 7,
      rowGroup: 3
    }
  ]

  // Helper to check if field should be displayed based on productDetails
  const shouldDisplayField = (config: FieldConfig, productDetails: any, savedProduct: SavedProduct, arch: "maxillary" | "mandibular"): boolean => {
    if (!productDetails) return false

    // Check if API property exists and has items
    const apiData = productDetails[config.apiProperty]
    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
      return false
    }

    // For retention field, only show if user has selected a retention type from popover
    if (config.key === "retention") {
      return hasRetentionTypeSelected(savedProduct, arch)
    }

    // Check dependencies
    if (config.dependsOn) {
      const dependencyConfig = fieldConfigs.find(f => f.key === config.dependsOn)
      if (dependencyConfig) {
        const dependencyValue = arch === "maxillary"
          ? savedProduct[dependencyConfig.maxillaryStateKey as keyof SavedProduct] as string
          : savedProduct[dependencyConfig.mandibularStateKey as keyof SavedProduct] as string
        if (!dependencyValue || dependencyValue.trim() === "") {
          return false
        }
        // For retention_options, also check if the selected retention has options
        if (config.key === "retention_option" && productDetails.retention_options) {
          const selectedRetentionId = arch === "maxillary"
            ? savedProduct.maxillaryRetentionId
            : savedProduct.mandibularRetentionId
          const hasOptions = productDetails.retention_options.some((opt: any) =>
            opt.retention_id === selectedRetentionId
          )
          return hasOptions
        }
      }
    }

    return true
  }

  // Helper function to check if a field is completed
  const isFieldCompleted = (fieldName: string, savedProduct: SavedProduct, archType: "maxillary" | "mandibular"): boolean => {
    const material = archType === "maxillary" ? savedProduct.maxillaryMaterial : savedProduct.mandibularMaterial
    const retention = archType === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
    const implantDetails = archType === "maxillary" ? "" : savedProduct.mandibularImplantDetails
    const stage = archType === "maxillary" ? savedProduct.maxillaryStage : savedProduct.mandibularStage
    const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade
    const gumShade = archType === "maxillary" ? savedProduct.maxillaryGumShadeBrand : savedProduct.mandibularGumShadeBrand
    const impression = archType === "maxillary" ? savedProduct.maxillaryImpression : savedProduct.mandibularImpression
    const ponticDesign = archType === "maxillary" ? savedProduct.maxillaryPonticDesign : savedProduct.mandibularPonticDesign
    const embrasure = archType === "maxillary" ? savedProduct.maxillaryEmbrasure : savedProduct.mandibularEmbrasure
    const occlusalContact = archType === "maxillary" ? savedProduct.maxillaryOcclusalContact : savedProduct.mandibularOcclusalContact
    const proximalContact = archType === "maxillary" ? savedProduct.maxillaryProximalContact : savedProduct.mandibularProximalContact
    const gap = archType === "maxillary" ? savedProduct.maxillaryGap : savedProduct.mandibularGap
    const stumpShade = archType === "maxillary" ? savedProduct.maxillaryStumpShade : savedProduct.mandibularStumpShade

    switch (fieldName) {
      case "product_material":
        return !!(material && material.trim() !== "")
      case "retention":
        return !!(retention && retention.trim() !== "")
      case "implant":
        return !!(implantDetails && implantDetails.trim() !== "")
      case "grade":
        // Grade is typically stored in material field or separate grade field
        return !!(material && material.trim() !== "")
      case "stage":
        return !!(stage && stage.trim() !== "")
      case "teeth_shade":
        return !!(toothShade && toothShade.trim() !== "")
      case "gum_shade":
        return !!(gumShade)
      case "impression":
      case "impressions":
        return !!(impression && impression.trim() !== "")
      case "stump_shade":
        return !!(stumpShade && stumpShade.trim() !== "")
      case "crown_third_shade":
        // Check if advance field value is set
        return false // Will be checked via advance fields
      case "pontic_design":
        return !!(ponticDesign && ponticDesign.trim() !== "")
      case "embrasures":
        return !!(embrasure && embrasure.trim() !== "")
      case "occlusal_contact":
        return !!(occlusalContact && occlusalContact.trim() !== "")
      case "interproximal_contact":
        return !!(proximalContact && proximalContact.trim() !== "")
      case "gap":
        return !!(gap && gap.trim() !== "")
      case "add_ons":
        const addOns = archType === "maxillary" ? savedProduct.maxillaryAddOns : savedProduct.mandibularAddOns
        return !!(addOns && Array.isArray(addOns) && addOns.length > 0)
      default:
        return false
    }
  }

  // Core visibility check without special cases (used internally)
  const checkFieldVisibilityCore = (
    fieldName: string,
    savedProduct: SavedProduct,
    productDetails: any,
    archType: "maxillary" | "mandibular"
  ): boolean => {
    const fieldOrder = getFieldOrder(savedProduct.category)
    const currentFieldIndex = fieldOrder.indexOf(fieldName)

    // If field is not in the order, don't show it
    if (currentFieldIndex === -1) return false

    // First field is always visible
    if (currentFieldIndex === 0) return true

    // Check if field is configured
    if (!isFieldConfigured(fieldName, productDetails, savedProduct, archType)) {
      return false
    }

    // Check if all previous fields are completed
    for (let i = 0; i < currentFieldIndex; i++) {
      const previousField = fieldOrder[i]
      if (!isFieldCompleted(previousField, savedProduct, archType)) {
        return false
      }
    }

    return true
  }

  // Helper function to check if a field should be visible (progressive disclosure)
  const isFieldVisible = (
    fieldName: string,
    productId: string,
    savedProduct: SavedProduct,
    productDetails: any,
    archType: "maxillary" | "mandibular"
  ): boolean => {
    // Special case: impression field should ONLY show if stage field is visible in the UI
    // Check this FIRST before other visibility checks
    if (fieldName === "impression" || fieldName === "impressions") {
      // Directly check if stage field is visible using the core visibility logic
      // This ensures impression only shows when stage is actually rendered in the UI
      if (!checkFieldVisibilityCore("stage", savedProduct, productDetails, archType)) {
        return false
      }

      // Also verify using isAccordionFieldVisible for consistency (tooth shade must have value)
      if (!isAccordionFieldVisible("stage", savedProduct, archType)) {
        return false // Stage field is not visible (tooth shade not set)
      }

      // Explicitly check if stages exist in productDetails (isFieldConfigured returns true by default for stage)
      if (!productDetails || !productDetails.stages || !Array.isArray(productDetails.stages) || productDetails.stages.length === 0) {
        return false
      }

      // Check if advance fields exist - if they do, they must be completed before showing impression
      const advanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
      // Filter out stump_shade from advance fields check (we use main stump shade field)
      const filteredAdvanceFields = advanceFields.filter((field: any) => {
        const fieldNameLower = (field.name || "").toLowerCase()
        return !(fieldNameLower.includes("stump") && fieldNameLower.includes("shade"))
      })

      // If advance fields exist, check if they are completed
      if (filteredAdvanceFields.length > 0) {
        // Check if this is a saved product (has advanceFields stored) or current form (uses advanceFieldValues state)
        const isSavedProduct = savedProduct.advanceFields && Array.isArray(savedProduct.advanceFields) && savedProduct.advanceFields.length > 0

        // Check if all advance fields have values
        const allAdvanceFieldsCompleted = filteredAdvanceFields.every((field: any) => {
          let currentValue: any = null

          if (isSavedProduct) {
            // For saved products, check savedProduct.advanceFields
            const savedField = savedProduct.advanceFields?.find((af: any) => af.advance_field_id === field.id)
            if (savedField) {
              currentValue = savedField.advance_field_value || null
            }
          } else {
            // For current form, check advanceFieldValues state
            const fieldKey = `advance_${field.id}`
            currentValue = advanceFieldValues[fieldKey]
          }

          // For implant_library fields, check if brand, platform, and size are all selected
          if (field.field_type === "implant_library") {
            if (isSavedProduct) {
              // For saved products, check if value exists and is not empty
              if (currentValue) {
                const displayValue = typeof currentValue === "object"
                  ? currentValue?.advance_field_value || ""
                  : currentValue || ""
                return displayValue &&
                  displayValue.trim() !== "" &&
                  displayValue.trim().toLowerCase() !== "not specified"
              }
              return false
            } else {
              // For current form, check state
              const fieldKey = `advance_${field.id}`
              const brandId = selectedImplantBrand[fieldKey]
              const platformId = selectedImplantPlatform[fieldKey]
              const size = selectedImplantSize[fieldKey]
              if (brandId && platformId && size) {
                return true
              }
              // Fallback: check if advanceFieldValues has a value
              if (currentValue) {
                const displayValue = typeof currentValue === "object"
                  ? currentValue?.advance_field_value || ""
                  : currentValue || ""
                return displayValue &&
                  displayValue.trim() !== "" &&
                  displayValue.trim().toLowerCase() !== "not specified"
              }
              return false
            }
          }

          if (!currentValue) return false

          // For checkbox fields, check if at least one option is selected
          if (field.field_type === "checkbox") {
            // For saved products, checkbox values are stored as comma-separated strings
            if (isSavedProduct) {
              return currentValue && currentValue.trim() !== ""
            }
            // For current form, check option_ids array
            const currentSelectedIds = typeof currentValue === "object"
              ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids :
                currentValue?.option_id ? [currentValue.option_id] : [])
              : []
            return currentSelectedIds.length > 0
          }

          // For other fields, check if value is not empty or "Not specified"
          const displayValue = typeof currentValue === "object"
            ? currentValue?.advance_field_value || ""
            : currentValue || ""
          return displayValue &&
            displayValue.trim() !== "" &&
            displayValue.trim().toLowerCase() !== "not specified" &&
            (field.field_type !== "dropdown" || displayValue !== `Select ${field.name}`)
        })

        // If advance fields exist but are not all completed, hide impression field
        if (!allAdvanceFieldsCompleted) {
          return false
        }
      }
      // If no advance fields exist, impression can be shown (existing behavior)
    }

    // Use core visibility check for all fields
    return checkFieldVisibilityCore(fieldName, savedProduct, productDetails, archType)
  }

  // Helper function to check if all required fields are filled (for showing advance fields)
  // Helper to check if a value is actually set
  const hasValue = (value: string | undefined | null): boolean => {
    if (!value) return false
    const trimmed = String(value).trim()
    return trimmed !== "" &&
      trimmed.toLowerCase() !== "not specified" &&
      trimmed.toLowerCase() !== "select impression"
  }

  // Helper to check if tooth shade is filled (for showing advance fields)
  const isToothShadeFilled = (archType: "maxillary" | "mandibular"): boolean => {
    const toothShade = archType === "maxillary" ? maxillaryToothShade : mandibularToothShade
    return hasValue(toothShade)
  }

  const areAllRequiredFieldsFilled = (archType: "maxillary" | "mandibular"): boolean => {
    const material = archType === "maxillary" ? maxillaryMaterial : mandibularMaterial
    const retention = archType === "maxillary" ? maxillaryRetention : mandibularRetention
    const stumpShade = archType === "maxillary" ? maxillaryStumpShade : mandibularStumpShade
    const toothShade = archType === "maxillary" ? maxillaryToothShade : mandibularToothShade
    const stage = archType === "maxillary" ? maxillaryStage : mandibularStage

    // Check all required fields
    const hasMaterial = hasValue(material)
    const hasRetention = hasValue(retention)
    const hasStumpShade = hasValue(stumpShade) // Both arches have stump shade
    const hasToothShade = hasValue(toothShade)
    const hasStage = hasValue(stage)

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage
  }

  // Helper function to check if all fields in current product have values
  const areAllCurrentProductFieldsFilled = (archType: "maxillary" | "mandibular"): boolean => {
    const material = archType === "maxillary" ? maxillaryMaterial : mandibularMaterial
    const retention = archType === "maxillary" ? maxillaryRetention : mandibularRetention
    const stumpShade = archType === "maxillary" ? maxillaryStumpShade : mandibularStumpShade
    const toothShade = archType === "maxillary" ? maxillaryToothShade : mandibularToothShade
    const stage = archType === "maxillary" ? maxillaryStage : mandibularStage

    // Check if any tooth has "Implant" retention type for this arch
    const retentionTypes = archType === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes
    const hasImplantRetention = Object.values(retentionTypes).some(
      (types) => types && types.includes('Implant')
    )

    // Check basic required fields
    const hasMaterial = hasValue(material)
    const hasRetention = hasValue(retention)
    const hasStumpShade = hasValue(stumpShade) // Both arches have stump shade
    const hasToothShade = hasValue(toothShade)
    const hasStage = hasValue(stage)

    // Impression field removed from UI - no longer required for validation
    // Fields now flow left-to-right, top-to-bottom without jumping

    // Check advanced fields if they exist and are required
    let hasRequiredAdvanceFields = true
    if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
      // Filter out stump shade from advanced fields check (we use main stump shade field)
      // Also filter out implant_library fields if retention type is not "Implant"
      const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
        const fieldNameLower = (field.name || "").toLowerCase()
        if (fieldNameLower.includes("stump") && fieldNameLower.includes("shade")) return false
        // Skip implant_library fields if retention type is not "Implant"
        if (field.field_type === "implant_library" && !hasImplantRetention) return false
        return true
      })

      // Check if any required advanced fields are missing
      const requiredAdvanceFields = filteredAdvanceFields.filter((field: any) =>
        field.is_required === "Yes" || field.is_required === true
      )

      if (requiredAdvanceFields.length > 0) {
        hasRequiredAdvanceFields = requiredAdvanceFields.every((field: any) => {
          const fieldKey = `advance_${field.id}`
          const currentValue = advanceFieldValues[fieldKey]

          // For implant_library fields, check if brand, platform, size, inclusions, abutment detail, and abutment type are all selected
          if (field.field_type === "implant_library") {
            const brandId = selectedImplantBrand[fieldKey]
            const platformId = selectedImplantPlatform[fieldKey]
            const size = selectedImplantSize[fieldKey]
            // Get inclusions, abutment detail, and abutment type based on arch
            const inclusions = archType === "maxillary" ? maxillaryImplantInclusions : mandibularImplantInclusions
            const abutmentDetail = archType === "maxillary" ? maxillaryAbutmentDetail : mandibularAbutmentDetail
            const abutmentType = archType === "maxillary" ? maxillaryAbutmentType : mandibularAbutmentType

            // Implant is considered filled if brand, platform, size, inclusions, abutment detail, and abutment type are all selected
            if (brandId && platformId && size && hasValue(inclusions) && hasValue(abutmentDetail) && hasValue(abutmentType)) {
              return true
            }
            // Fallback: check if advanceFieldValues has a value
            if (currentValue) {
              const displayValue = typeof currentValue === "object"
                ? currentValue?.advance_field_value || ""
                : currentValue || ""
              return displayValue &&
                displayValue.trim() !== "" &&
                displayValue.trim().toLowerCase() !== "not specified"
            }
            return false
          }

          if (!currentValue) return false

          // For checkbox fields, check if at least one option is selected
          if (field.field_type === "checkbox") {
            const currentSelectedIds = typeof currentValue === "object"
              ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids :
                currentValue?.option_id ? [currentValue.option_id] : [])
              : []
            return currentSelectedIds.length > 0
          }

          // For other fields, check if value is not empty or "Not specified"
          const displayValue = typeof currentValue === "object"
            ? currentValue?.advance_field_value || ""
            : currentValue || ""
          return displayValue &&
            displayValue.trim() !== "" &&
            displayValue.trim().toLowerCase() !== "not specified" &&
            (field.field_type !== "dropdown" || displayValue !== `Select ${field.name}`)
        })
      }
    }

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage && hasRequiredAdvanceFields
  }

  // Helper function to check if at least one accordion product is complete (for submit button)
  const hasAtLeastOneCompleteProduct = (): boolean => {
    // If there are saved products, at least one is complete (they're auto-saved when complete)
    return savedProducts.length > 0
  }

  // Helper function to check if accordion field should be visible (progressive disclosure for accordion)
  // Fields are hidden initially and shown automatically when the previous field has a value
  // Order: Material → Retention → Stage → Stump Shade → Tooth Shade → Implant Details
  const isAccordionFieldVisible = (
    fieldName: "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details",
    savedProduct: SavedProduct,
    archType: "maxillary" | "mandibular"
  ): boolean => {
    // Check both saved product value and current state value (state might be updated before product is saved)
    const savedRetention = archType === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
    const currentRetention = archType === "maxillary" ? maxillaryRetention : mandibularRetention
    const retention = savedRetention || currentRetention

    const stage = archType === "maxillary" ? savedProduct.maxillaryStage : savedProduct.mandibularStage
    const stumpShade = archType === "maxillary" ? savedProduct.maxillaryStumpShade : savedProduct.mandibularStumpShade
    const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade

    // Helper to check if a value is actually set (not empty, not "Not specified", not "Select impression", not undefined, not null)
    const hasValue = (value: string | undefined | null): boolean => {
      if (!value) return false
      const trimmed = String(value).trim()
      return trimmed !== "" &&
        trimmed.toLowerCase() !== "not specified" &&
        trimmed.toLowerCase() !== "select impression" &&
        !trimmed.toLowerCase().startsWith("select")
    }

    switch (fieldName) {
      case "stage":
        // Show stage ONLY after retention has a real value
        // Initially hidden, shows automatically when retention is filled
        return hasValue(retention)
      case "stump_shade":
        // Show stump shade ONLY after stage has a real value
        // Initially hidden, shows automatically when stage is filled
        return hasValue(stage)
      case "tooth_shade":
        // Show tooth shade ONLY after stump shade has a real value
        // Initially hidden, shows automatically when stump shade is filled
        return hasValue(stumpShade)
      case "implant_details":
        // Show implant details ONLY after tooth shade has a real value
        // Initially hidden, shows automatically when tooth shade is filled
        return hasValue(toothShade)
      case "notes":
        // Notes are always visible if there's content
        return true
      default:
        return false
    }
  }

  // Scroll refs and state for horizontal scrolling
  const subcategoriesScrollRef = useRef<HTMLDivElement>(null)
  const productsScrollRef = useRef<HTMLDivElement>(null)
  const toothSelectionRef = useRef<HTMLDivElement>(null)
  const [showSubcategoriesLeftArrow, setShowSubcategoriesLeftArrow] = useState(false)
  const [showSubcategoriesRightArrow, setShowSubcategoriesRightArrow] = useState(false)
  const [showProductsLeftArrow, setShowProductsLeftArrow] = useState(false)
  const [showProductsRightArrow, setShowProductsRightArrow] = useState(false)

  // Case summary notes expansion state - initially collapsed
  const [isCaseSummaryExpanded, setIsCaseSummaryExpanded] = useState<boolean>(false)
  const [showCaseSummaryNotes, setShowCaseSummaryNotes] = useState<boolean>(true)

  // Track previous notes value to prevent unnecessary parsing
  const previousNotesRef = useRef<string>("")
  const isParsingRef = useRef<boolean>(false)

  // Refs for scrolling to sections
  const maxillarySectionRef = useRef<HTMLDivElement>(null)
  const mandibularSectionRef = useRef<HTMLDivElement>(null)

  // State for info popover - show when product is selected but no arch chosen
  const [showInfoPopover, setShowInfoPopover] = useState<boolean>(false)

  // Auto-show and auto-close info popover when charts are automatically displayed
  useEffect(() => {
    if (showProductDetails && selectedProduct && showMaxillaryChart && showMandibularChart && productDetails && !isLoadingProductDetails) {
      // Show popover after a short delay
      const showTimer = setTimeout(() => {
        setShowInfoPopover(true)
      }, 500)

      // Auto-close popover after 5 seconds
      const closeTimer = setTimeout(() => {
        setShowInfoPopover(false)
      }, 5500) // 500ms delay + 5 seconds

      return () => {
        clearTimeout(showTimer)
        clearTimeout(closeTimer)
      }
    } else {
      setShowInfoPopover(false)
    }
  }, [showProductDetails, selectedProduct, showMaxillaryChart, showMandibularChart, productDetails, isLoadingProductDetails])

  // Track if we've already auto-shown implant cards per product+arch so we auto-show when "Select Implant Details" is visible for each product
  const autoShownImplantCardsRef = useRef<Record<string, boolean>>({})

  // Auto-show implant brand cards when implant_library advance field becomes visible and is empty
  useEffect(() => {
    if (!productDetails || !productDetails.advance_fields || !Array.isArray(productDetails.advance_fields)) {
      return
    }

    // Find implant_library field in advance fields
    const implantLibraryField = productDetails.advance_fields.find(
      (field: any) => field.field_type === "implant_library"
    )

    if (!implantLibraryField) {
      return
    }

    const fieldKey = `advance_${implantLibraryField.id}`

    // Key by product + arch so we auto-show when "Select Implant Details" is visible for this product (e.g. after switching product)
    const maxillaryKey = `maxillary_${selectedProductForMaxillary?.id ?? productDetails?.id ?? "new"}`
    const mandibularKey = `mandibular_${selectedProductForMandibular?.id ?? productDetails?.id ?? "new"}`

    // Check for maxillary arch
    if (isToothShadeFilled("maxillary") && !autoShownImplantCardsRef.current[maxillaryKey]) {
      const currentValue = advanceFieldValues[fieldKey]
      const displayValue = typeof currentValue === "object"
        ? currentValue?.advance_field_value || ""
        : currentValue || ""
      const isEmpty = !displayValue || displayValue.trim() === ""

      if (isEmpty && implants && implants.length > 0) {
        // Mark as auto-shown for this product+arch so we don't repeatedly open, but allow auto-show for other products
        autoShownImplantCardsRef.current = { ...autoShownImplantCardsRef.current, [maxillaryKey]: true }

        const timer = setTimeout(() => {
          setShowImplantCards(true)
          setActiveImplantFieldKey(fieldKey)
          setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: "brand" }))
        }, 200)

        return () => clearTimeout(timer)
      }
    }

    // Check for mandibular arch
    if (isToothShadeFilled("mandibular") && !autoShownImplantCardsRef.current[mandibularKey]) {
      const currentValue = advanceFieldValues[fieldKey]
      const displayValue = typeof currentValue === "object"
        ? currentValue?.advance_field_value || ""
        : currentValue || ""
      const isEmpty = !displayValue || displayValue.trim() === ""

      if (isEmpty && implants && implants.length > 0) {
        // Mark as auto-shown for this product+arch
        autoShownImplantCardsRef.current = { ...autoShownImplantCardsRef.current, [mandibularKey]: true }

        const timer = setTimeout(() => {
          setShowImplantCards(true)
          setActiveImplantFieldKey(fieldKey)
          setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: "brand" }))
        }, 200)

        return () => clearTimeout(timer)
      }
    }
  }, [
    productDetails,
    advanceFieldValues,
    implants,
    maxillaryToothShade,
    mandibularToothShade,
    selectedProductForMaxillary?.id,
    selectedProductForMandibular?.id,
  ])

  // Track if we've already auto-opened impression modal for this session to prevent repeated auto-opening
  const autoOpenedImpressionModalRef = useRef<{ maxillary?: boolean; mandibular?: boolean }>({})
  // Track which saved product accordions have already auto-opened impression modal (Prepped/Pontic)
  const autoOpenedImpressionModalForSavedProductRef = useRef<Set<string>>(new Set())

  // Auto-open impression modal when all implant detail form fields are complete
  useEffect(() => {
    if (!productDetails || !productDetails.advance_fields || !Array.isArray(productDetails.advance_fields)) {
      return
    }

    // Don't auto-open if impression modal is already open
    if (showImpressionModal) {
      return
    }

    // Find implant_library field in advance fields
    const implantLibraryField = productDetails.advance_fields.find(
      (field: any) => field.field_type === "implant_library"
    )

    if (!implantLibraryField) {
      return
    }

    const fieldKey = `advance_${implantLibraryField.id}`

    // Check if all implant detail form fields are complete for maxillary
    const checkMaxillaryComplete = () => {
      if (!isToothShadeFilled("maxillary")) return false
      if (autoOpenedImpressionModalRef.current.maxillary) return false

      const brandId = selectedImplantBrand[fieldKey]
      const platformId = selectedImplantPlatform[fieldKey]
      const size = selectedImplantSize[fieldKey]
      const hasInclusions = !!maxillaryImplantInclusions
      const hasAbutmentDetail = !!maxillaryAbutmentDetail
      const hasAbutmentType = !!maxillaryAbutmentType

      return brandId && platformId && size && hasInclusions && hasAbutmentDetail && hasAbutmentType
    }

    // Check if all implant detail form fields are complete for mandibular
    const checkMandibularComplete = () => {
      if (!isToothShadeFilled("mandibular")) return false
      if (autoOpenedImpressionModalRef.current.mandibular) return false

      const brandId = selectedImplantBrand[fieldKey]
      const platformId = selectedImplantPlatform[fieldKey]
      const size = selectedImplantSize[fieldKey]
      const hasInclusions = !!mandibularImplantInclusions
      const hasAbutmentDetail = !!mandibularAbutmentDetail
      const hasAbutmentType = !!mandibularAbutmentType

      return brandId && platformId && size && hasInclusions && hasAbutmentDetail && hasAbutmentType
    }

    // Auto-open for maxillary if complete
    if (checkMaxillaryComplete() && selectedProductForMaxillary && productDetails?.impressions?.length > 0) {
      autoOpenedImpressionModalRef.current = { ...autoOpenedImpressionModalRef.current, maxillary: true }

      const timer = setTimeout(() => {
        const tempProduct: SavedProduct = {
          id: selectedProductForMaxillary.id.toString(),
          product: selectedProductForMaxillary,
          productDetails: productDetails,
          category: selectedCategory || "",
          categoryId: selectedCategoryId || 0,
          subcategory: selectedSubcategory || "",
          subcategoryId: selectedSubcategoryId || 0,
          maxillaryTeeth: maxillaryTeeth,
          mandibularTeeth: mandibularTeeth,
          maxillaryMaterial: maxillaryMaterial,
          maxillaryStumpShade: maxillaryStumpShade,
          maxillaryRetention: maxillaryRetention,
          maxillaryImplantDetails: maxillaryImplantDetails,
          mandibularMaterial: mandibularMaterial,
          mandibularRetention: mandibularRetention,
          mandibularStumpShade: mandibularStumpShade,
          mandibularImplantDetails: mandibularImplantDetails,
          createdAt: Date.now(),
          addedFrom: "maxillary",
        }
        handleOpenImpressionModal(tempProduct, "maxillary")
      }, 300)

      return () => clearTimeout(timer)
    }

    // Auto-open for mandibular if complete
    if (checkMandibularComplete() && selectedProduct && productDetails?.impressions?.length > 0) {
      autoOpenedImpressionModalRef.current = { ...autoOpenedImpressionModalRef.current, mandibular: true }

      const timer = setTimeout(() => {
        const tempProduct: SavedProduct = {
          id: selectedProduct.id.toString(),
          product: selectedProduct,
          productDetails: productDetails,
          category: selectedCategory || "",
          categoryId: selectedCategoryId || 0,
          subcategory: selectedSubcategory || "",
          subcategoryId: selectedSubcategoryId || 0,
          maxillaryTeeth: maxillaryTeeth,
          mandibularTeeth: mandibularTeeth,
          maxillaryMaterial: maxillaryMaterial,
          maxillaryStumpShade: maxillaryStumpShade,
          maxillaryRetention: maxillaryRetention,
          maxillaryImplantDetails: maxillaryImplantDetails,
          mandibularMaterial: mandibularMaterial,
          mandibularRetention: mandibularRetention,
          mandibularStumpShade: mandibularStumpShade,
          mandibularImplantDetails: mandibularImplantDetails,
          createdAt: Date.now(),
          addedFrom: "mandibular",
        }
        handleOpenImpressionModal(tempProduct, "mandibular")
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [
    productDetails,
    selectedImplantBrand,
    selectedImplantPlatform,
    selectedImplantSize,
    maxillaryImplantInclusions,
    maxillaryAbutmentDetail,
    maxillaryAbutmentType,
    mandibularImplantInclusions,
    mandibularAbutmentDetail,
    mandibularAbutmentType,
    maxillaryToothShade,
    mandibularToothShade,
    showImpressionModal,
    selectedProductForMaxillary,
    selectedProduct
  ])

  // Track which product configurations have been auto-saved to prevent duplicate saves
  const autoSavedArchesRef = useRef<Set<string>>(new Set())
  // Ref to track when impression modal was just closed to prevent auto-save
  const impressionModalJustClosedRef = useRef<boolean>(false)
  // Ref for debounced auto-save so the debounced function always calls the latest handleAutoSaveProduct
  const handleAutoSaveProductRef = useRef<(type: "maxillary" | "mandibular") => void>(() => { })

  // Handler to toggle maxillary accordion - only opens/closes on click (independent from mandibular)
  const handleAccordionChangeMaxillary = (value: string | undefined) => {
    const nextValue = value === undefined || value === "" ? null : String(value)
    if (nextValue === null) {
      setOpenAccordionMaxillary(null)
      // Clear shade selection state to allow accordion to close
      if (currentShadeArch === "maxillary") {
        setCurrentShadeField(null)
        setCurrentShadeArch(null)
        setCurrentShadeProductId(null)
      }
      setOpenStageDropdown((prev) => {
        const newState = { ...prev }
        Object.keys(newState).forEach((k) => {
          const sp = savedProducts.find((p) => p.id === k && p.addedFrom === "maxillary")
          if (sp || k === "maxillary-card") delete newState[k]
        })
        return newState
      })
      return
    }
    if (openAccordionMaxillary === nextValue) {
      setOpenAccordionMaxillary(null)
      setOpenStageDropdown((prev) => {
        const newState = { ...prev }
        delete newState[nextValue]
        return newState
      })
      return
    }
    setOpenAccordionMaxillary(nextValue)
    if (nextValue !== "maxillary-card") {
      const savedProduct = savedProducts.find((p) => p.id === nextValue)
      if (savedProduct) handleSavedProductCardClick(savedProduct)
    }
  }

  // Handler to toggle mandibular accordion - only opens/closes on click (independent from maxillary)
  const handleAccordionChangeMandibular = (value: string | undefined) => {
    const nextValue = value === undefined || value === "" ? null : String(value)
    if (nextValue === null) {
      setOpenAccordionMandibular(null)
      // Clear shade selection state to allow accordion to close
      if (currentShadeArch === "mandibular") {
        setCurrentShadeField(null)
        setCurrentShadeArch(null)
        setCurrentShadeProductId(null)
      }
      setOpenStageDropdown((prev) => {
        const newState = { ...prev }
        Object.keys(newState).forEach((k) => {
          const sp = savedProducts.find((p) => p.id === k && p.addedFrom === "mandibular")
          if (sp || k === "mandibular-card") delete newState[k]
        })
        return newState
      })
      return
    }
    if (openAccordionMandibular === nextValue) {
      setOpenAccordionMandibular(null)
      setOpenStageDropdown((prev) => {
        const newState = { ...prev }
        delete newState[nextValue]
        return newState
      })
      return
    }
    setOpenAccordionMandibular(nextValue)
    if (nextValue !== "mandibular-card") {
      const savedProduct = savedProducts.find((p) => p.id === nextValue)
      if (savedProduct) handleSavedProductCardClick(savedProduct)
    }
  }

  // Fixed restoration flow: track if missing teeth card has been clicked
  const [missingTeethCardClicked, setMissingTeethCardClicked] = useState<boolean>(false)

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Submit confirmation state
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState<boolean>(false)
  const [showSubmitPopover, setShowSubmitPopover] = useState<boolean>(false)

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false)
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false)
  const [showRefreshWarningModal, setShowRefreshWarningModal] = useState<boolean>(false)
  const [pendingNavigation, setPendingNavigation] = useState<boolean>(false)
  const allowNavigationRef = useRef<boolean>(false)

  // Saved products state - array of product configurations
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([])

  // Auto-open impression modal when user expands a saved product accordion and retention is Prepped or Pontic (impression is shown in UI)
  useEffect(() => {
    const openId = openAccordionMaxillary ?? openAccordionMandibular
    if (!openId || showImpressionModal) return
    const savedProduct = savedProducts.find((p) => p.id === openId)
    if (!savedProduct || (savedProduct.addedFrom !== "maxillary" && savedProduct.addedFrom !== "mandibular")) return
    const arch = savedProduct.addedFrom
    const retention = arch === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
    const retentionLower = (retention || "").toLowerCase()
    const isPreppedOrPontic = retentionLower.includes("prep") || retentionLower.includes("pontic")
    if (!isPreppedOrPontic) return
    const productDetails = savedProduct.productDetails
    if (!productDetails?.impressions?.length) return
    if (autoOpenedImpressionModalForSavedProductRef.current.has(savedProduct.id)) return
    autoOpenedImpressionModalForSavedProductRef.current.add(savedProduct.id)
    const timer = setTimeout(() => handleOpenImpressionModal(savedProduct, arch), 400)
    return () => clearTimeout(timer)
  }, [openAccordionMaxillary, openAccordionMandibular, savedProducts, showImpressionModal])

  // Initial loading state - tracks when page is first loading to determine button visibility
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true)

  // Get add-ons from Zustand store (reactive)
  const productAddOns = useCaseDesignStore((state) => state.productAddOns)

  // Helper function to calculate total add-ons count across all saved products and Zustand store
  const getTotalAddOnsCount = useMemo(() => {
    // Count from saved products
    const savedProductsCount = savedProducts.reduce((total, product) => {
      const maxillaryCount = product.maxillaryAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
      const mandibularCount = product.mandibularAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
      return total + maxillaryCount + mandibularCount
    }, 0)

    // Count from Zustand store (for unsaved products or products with add-ons added before saving)
    const zustandCount = Object.values(productAddOns).reduce((total, productAddOn) => {
      const maxillaryCount = productAddOn.maxillary?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
      const mandibularCount = productAddOn.mandibular?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
      return total + maxillaryCount + mandibularCount
    }, 0)

    return savedProductsCount + zustandCount
  }, [savedProducts, productAddOns])

  // Helper function to calculate add-ons count for a specific product
  const getProductAddOnsCount = (product: SavedProduct) => {
    const maxillaryCount = product.maxillaryAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
    const mandibularCount = product.mandibularAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
    return maxillaryCount + mandibularCount
  }

  // Helper function to get attached files count from localStorage
  const getAttachedFilesCount = () => {
    if (typeof window === "undefined") return 0
    try {
      const cacheStr = localStorage.getItem("caseDesignCache")
      if (cacheStr) {
        const cache = JSON.parse(cacheStr)
        if (Array.isArray(cache.attachments)) {
          return cache.attachments.length
        }
      }
    } catch (error) {
      console.error("Error reading attachments from localStorage:", error)
    }
    return 0
  }

  // Handler to delete a saved product (defined early so it can be used in savedProductSectionContextValue)
  const handleDeleteProduct = (productId: string) => {
    setSavedProducts((prev) => prev.filter((p) => p.id !== productId))

    // Reset to category selection view
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setMaxillaryTeeth([])
    setMandibularTeeth([])
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryImplantDetails("")
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularStumpShade("")
    setMandibularImplantDetails("")
    setMissingTeethCardClicked(false)

    toast({
      title: "Product Removed",
      description: "Product has been removed from your case",
    })
  }

  // Handler to open impression modal (defined early so it can be used in savedProductSectionContextValue)
  const handleOpenImpressionModal = (product: SavedProduct, arch: "maxillary" | "mandibular") => {
    setCurrentProductForImpression(product)
    setCurrentImpressionArch(arch)
    // Hydrate selectedImpressions from saved product so modal shows current values
    const impressions = product.productDetails?.impressions
    const savedArr = arch === "maxillary" ? product.maxillaryImpressions : product.mandibularImpressions
    if (impressions && Array.isArray(impressions) && savedArr && savedArr.length > 0) {
      setSelectedImpressions(prev => {
        const next = { ...prev }
        const productId = product.product?.id?.toString() ?? product.id
        savedArr.forEach(sel => {
          const impression = impressions.find((imp: any) => imp.id === sel.impression_id)
          if (impression) {
            const key = `${productId}_${arch}_${impression.value || impression.name}`
            next[key] = sel.quantity
          }
        })
        return next
      })
    }
    setShowImpressionModal(true)
  }

  // Helpers for impression count/display (defined early so they can be used in savedProductSectionContextValue)
  const getImpressionDisplayText = (productId: string, arch: "maxillary" | "mandibular", impressions: any[]): string => {
    if (!impressions || !Array.isArray(impressions)) return "Select impression"

    const selections: Array<{ quantity: number, name: string }> = []
    impressions.forEach(impression => {
      const key = `${productId}_${arch}_${impression.value || impression.name}`
      const quantity = selectedImpressions[key] || 0
      if (quantity > 0) {
        selections.push({
          quantity,
          name: impression.name || impression.value || "Impression"
        })
      }
    })

    if (selections.length === 0) return "Select impression"

    const maxDisplay = 3
    const displayedSelections = selections.slice(0, maxDisplay)
    const remainingCount = selections.length - maxDisplay

    let displayText = displayedSelections.map(sel => `${sel.quantity}x ${sel.name}`).join(", ")
    if (remainingCount > 0) {
      displayText += ` and ${remainingCount} more`
    }

    return displayText
  }

  const getImpressionCount = (productId: string, arch: "maxillary" | "mandibular", impressions: any[]): number => {
    if (!impressions || !Array.isArray(impressions)) return 0
    return impressions.reduce((sum: number, impression: any) => {
      const key = `${productId}_${arch}_${impression.value || impression.name}`
      return sum + (selectedImpressions[key] || 0)
    }, 0)
  }

  const getImpressionCountFromSaved = (savedImpressions: Array<{ impression_id: number; quantity: number; name?: string }> | undefined): number => {
    if (!savedImpressions || !Array.isArray(savedImpressions)) return 0
    return savedImpressions.reduce((sum, sel) => sum + (sel.quantity || 0), 0)
  }

  const getImpressionDisplayTextFromSaved = (savedImpressions: Array<{ impression_id: number; quantity: number; name?: string }> | undefined): string => {
    if (!savedImpressions || !Array.isArray(savedImpressions) || savedImpressions.length === 0) return "Select impression"
    const maxDisplay = 3
    const displayed = savedImpressions.slice(0, maxDisplay)
    const remaining = savedImpressions.length - maxDisplay
    let text = displayed.map(sel => `${sel.quantity}x ${sel.name || "Impression"}`).join(", ")
    if (remaining > 0) text += ` and ${remaining} more`
    return text
  }

  // Use a ref to track if we're currently setting the accordion to prevent infinite loops
  const isSettingAccordionRef = useRef(false)

  const handleOpenShadeModal = (fieldKey: string, arch?: "maxillary" | "mandibular", productId?: string) => {
    // Prevent multiple rapid calls
    if (isSettingAccordionRef.current) {
      return
    }

    // When opening from a saved product accordion, track which product so shade apply updates that product
    setCurrentShadeProductId(productId ?? null)

    // Determine arch: use provided arch, or check which accordion is open, or fallback to teeth selection
    let actualArch: "maxillary" | "mandibular"
    if (arch) {
      actualArch = arch
    } else if (openAccordionMandibular) {
      actualArch = "mandibular"
    } else if (openAccordionMaxillary) {
      actualArch = "maxillary"
    } else {
      // Fallback: check which arch has teeth selected
      actualArch = maxillaryTeeth.length > 0 ? "maxillary" : "mandibular"
    }

    // Map field key to shade field type
    const shadeFieldType: "tooth_shade" | "stump_shade" =
      fieldKey === "tooth_shade" ? "tooth_shade" : "stump_shade"

    // If opening tooth shade field and stump shade is already selected for THIS arch, reset tooth shade for this arch only (no cross-arch dependency)
    if (shadeFieldType === "tooth_shade" && !productId) {
      const stumpShadeForArch = actualArch === "maxillary" ? maxillaryStumpShade : mandibularStumpShade
      const hasStumpShadeForArch = stumpShadeForArch && stumpShadeForArch.trim() !== ""

      if (hasStumpShadeForArch) {
        // Reset tooth shade only for the arch being opened
        if (actualArch === "maxillary") {
          setMaxillaryShadeId(undefined)
          setMaxillaryToothShade("")
          setSavedProducts(prev => prev.map(product => ({
            ...product,
            maxillaryToothShade: "",
            maxillaryShadeId: undefined
          })))
        } else {
          setMandibularShadeId(undefined)
          setMandibularToothShade("")
          setSavedProducts(prev => prev.map(product => ({
            ...product,
            mandibularToothShade: "",
            mandibularShadeId: undefined
          })))
        }
      }
    }

    isSettingAccordionRef.current = true

    setCurrentShadeField(shadeFieldType)
    setCurrentShadeArch(actualArch)
    setSelectedShadesForSVG([]) // Reset selected shades
    // Automatically open the accordion: saved product id when editing saved product, else current arch card
    const accordionId = productId ? productId : (actualArch === "maxillary" ? "maxillary-card" : "mandibular-card")
    if (actualArch === "maxillary") {
      if (openAccordionMaxillary !== accordionId) setOpenAccordionMaxillary(accordionId)
    } else {
      if (openAccordionMandibular !== accordionId) setOpenAccordionMandibular(accordionId)
    }

    // Reset the ref after a short delay to allow state updates to complete
    setTimeout(() => {
      isSettingAccordionRef.current = false
    }, 100)

    // No longer opening modal - just setting the field to show SVG inline
  }

  // Handler for field changes in dynamic fields
  const handleFieldChange = (fieldKey: string, value: string, id?: number, productId?: string, arch?: "maxillary" | "mandibular") => {
    const actualArch = arch || (maxillaryTeeth.length > 0 ? "maxillary" : "mandibular")
    const config = fieldConfigs.find(f => f.key === fieldKey)
    if (!config) return

    if (!productId) {
      // For card accordion (not yet saved product) - update local state
      if (actualArch === "maxillary") {
        if (config.maxillaryStateKey) {
          switch (fieldKey) {
            case "material":
              setMaxillaryMaterial(value)
              break
            case "retention":
              setMaxillaryRetention(value)
              break
            case "stage":
              setMaxillaryStage(value)
              break
            case "stump_shade":
              setMaxillaryStumpShade(value)
              // Reset tooth shade when stump shade is set
              if (value && value.trim() !== "") {
                setMaxillaryShadeId(undefined)
                setMaxillaryToothShade("")
                // Reset SVG selection sticks if currently viewing tooth shade for this arch
                if (currentShadeField === "tooth_shade" && currentShadeArch === "maxillary") {
                  setSelectedShadesForSVG([]) // Reset the sticks in the tooth shade container
                }
                // Also clear from saved products
                setSavedProducts(prev => prev.map(product => ({
                  ...product,
                  maxillaryToothShade: "",
                  maxillaryShadeId: undefined
                })))
              }
              // Sync stump shade value to advanced fields if stump shade exists in advanced fields
              if (productDetails?.advance_fields && selectedProduct) {
                const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)
                if (stumpShadeField) {
                  const fieldKey = `advance_${stumpShadeField.id}`
                  setAdvanceFieldValues(prev => ({
                    ...prev,
                    [fieldKey]: {
                      advance_field_id: stumpShadeField.id,
                      advance_field_value: value,
                      option_id: id // If stump shade has options, use the id
                    }
                  }))
                }
              }
              break
            case "tooth_shade":
              setMaxillaryToothShade(value)
              break
          }
        }
        if (config.maxillaryIdKey && id !== undefined) {
          switch (fieldKey) {
            case "material":
              setMaxillaryMaterialId(id)
              break
            case "retention":
              setMaxillaryRetentionId(id)
              break
            case "retention_option":
              setMaxillaryRetentionOptionId(id)
              // Auto-select retention type based on retention option's tooth_chart_type
              if (id && productDetails?.retention_options && productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id

                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id ||
                    opt.lab_retention_option?.id === numericId ||
                    String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id ||
                    opt.retention_option_id === numericId ||
                    String(opt.retention_option_id) === String(id)) return true
                  return false
                })

                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type ||
                    selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                    selectedRetentionOption.retention_option?.tooth_chart_type

                  // Debug logging (can be removed later)
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Retention option selected:', {
                      id,
                      numericId,
                      selectedRetentionOption,
                      toothChartType,
                      allRetentionOptions: productDetails.retention_options
                    })
                  }

                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }

                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = productDetails.retentions.find((ret: any) =>
                      ret.name === targetRetentionName ||
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Auto-selecting retention type:', targetRetention)
                      }
                      setMaxillaryRetention(targetRetention.name)
                      setMaxillaryRetentionId(targetRetention.id)
                    } else if (process.env.NODE_ENV === 'development') {
                      console.log('Retention not found:', {
                        targetRetentionName,
                        availableRetentions: productDetails.retentions
                      })
                    }
                  } else if (process.env.NODE_ENV === 'development') {
                    console.log('No target retention name mapped for tooth_chart_type:', toothChartType)
                  }
                } else if (process.env.NODE_ENV === 'development') {
                  console.log('Retention option not found:', {
                    id,
                    numericId,
                    availableOptions: productDetails.retention_options.map((opt: any) => ({
                      id: opt.id,
                      name: opt.name,
                      lab_retention_option_id: opt.lab_retention_option?.id,
                      retention_option_id: opt.retention_option_id
                    }))
                  })
                }
              }
              break
            case "stump_shade":
              setMaxillaryGumShadeId(id)
              // Sync stump shade ID to advanced fields if stump shade exists in advanced fields
              if (productDetails?.advance_fields && selectedProduct && id !== undefined) {
                const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)
                if (stumpShadeField) {
                  const fieldKey = `advance_${stumpShadeField.id}`
                  setAdvanceFieldValues(prev => {
                    const currentValue = prev[fieldKey]
                    return {
                      ...prev,
                      [fieldKey]: {
                        advance_field_id: stumpShadeField.id,
                        advance_field_value: currentValue?.advance_field_value || maxillaryStumpShade || "",
                        option_id: id
                      }
                    }
                  })
                }
              }
              break
            case "tooth_shade":
              setMaxillaryShadeId(id)
              break
            case "stage":
              setMaxillaryStageId(id)
              break
          }
        }
      } else {
        if (config.mandibularStateKey) {
          switch (fieldKey) {
            case "material":
              setMandibularMaterial(value)
              break
            case "retention":
              setMandibularRetention(value)
              break
            case "stage":
              setMandibularStage(value)
              break
            case "stump_shade":
              setMandibularStumpShade(value)
              // Reset tooth shade when stump shade is set
              if (value && value.trim() !== "") {
                setMandibularShadeId(undefined)
                setMandibularToothShade("")
                // Reset SVG selection sticks if currently viewing tooth shade for this arch
                if (currentShadeField === "tooth_shade" && currentShadeArch === "mandibular") {
                  setSelectedShadesForSVG([]) // Reset the sticks in the tooth shade container
                }
                // Also clear from saved products
                setSavedProducts(prev => prev.map(product => ({
                  ...product,
                  mandibularToothShade: "",
                  mandibularShadeId: undefined
                })))
              }
              // Sync stump shade value to advanced fields if stump shade exists in advanced fields
              if (productDetails?.advance_fields && selectedProduct) {
                const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)
                if (stumpShadeField) {
                  const fieldKey = `advance_${stumpShadeField.id}`
                  setAdvanceFieldValues(prev => ({
                    ...prev,
                    [fieldKey]: {
                      advance_field_id: stumpShadeField.id,
                      advance_field_value: value,
                      option_id: id // If stump shade has options, use the id
                    }
                  }))
                }
              }
              break
            case "tooth_shade":
              setMandibularToothShade(value)
              break
          }
        }
        if (config.mandibularIdKey && id !== undefined) {
          switch (fieldKey) {
            case "material":
              setMandibularMaterialId(id)
              break
            case "retention":
              setMandibularRetentionId(id)
              break
            case "retention_option":
              setMandibularRetentionOptionId(id)
              // Auto-select retention type based on retention option's tooth_chart_type
              if (id && productDetails?.retention_options && productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id

                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id ||
                    opt.lab_retention_option?.id === numericId ||
                    String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id ||
                    opt.retention_option_id === numericId ||
                    String(opt.retention_option_id) === String(id)) return true
                  return false
                })

                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type ||
                    selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                    selectedRetentionOption.retention_option?.tooth_chart_type

                  // Debug logging (can be removed later)
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Retention option selected (mandibular):', {
                      id,
                      numericId,
                      selectedRetentionOption,
                      toothChartType
                    })
                  }

                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }

                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = productDetails.retentions.find((ret: any) =>
                      ret.name === targetRetentionName ||
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Auto-selecting retention type (mandibular):', targetRetention)
                      }
                      setMandibularRetention(targetRetention.name)
                      setMandibularRetentionId(targetRetention.id)
                    }
                  }
                }
              }
              break
            case "stump_shade":
              setMandibularGumShadeId(id)
              // Sync stump shade ID to advanced fields if stump shade exists in advanced fields
              if (productDetails?.advance_fields && selectedProduct && id !== undefined) {
                const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)
                if (stumpShadeField) {
                  const fieldKey = `advance_${stumpShadeField.id}`
                  setAdvanceFieldValues(prev => {
                    const currentValue = prev[fieldKey]
                    return {
                      ...prev,
                      [fieldKey]: {
                        advance_field_id: stumpShadeField.id,
                        advance_field_value: currentValue?.advance_field_value || mandibularStumpShade || "",
                        option_id: id
                      }
                    }
                  })
                }
              }
              break
            case "tooth_shade":
              setMandibularShadeId(id)
              break
            case "stage":
              setMandibularStageId(id)
              break
          }
        }
      }
    } else {
      // For saved products, update the product in the array
      setSavedProducts(prev => prev.map(product => {
        if (product.id === productId) {
          const updated = { ...product }
          if (actualArch === "maxillary") {
            if (config.maxillaryStateKey) {
              (updated as any)[config.maxillaryStateKey] = value
            }
            if (config.maxillaryIdKey && id !== undefined) {
              (updated as any)[config.maxillaryIdKey] = id

              // Auto-select retention type based on retention option's tooth_chart_type
              if (fieldKey === "retention_option" && id && updated.productDetails?.retention_options && updated.productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id

                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = updated.productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id ||
                    opt.lab_retention_option?.id === numericId ||
                    String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id ||
                    opt.retention_option_id === numericId ||
                    String(opt.retention_option_id) === String(id)) return true
                  return false
                })

                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type ||
                    selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                    selectedRetentionOption.retention_option?.tooth_chart_type

                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }

                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = updated.productDetails.retentions.find((ret: any) =>
                      ret.name === targetRetentionName ||
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      updated.maxillaryRetention = targetRetention.name
                      updated.maxillaryRetentionId = targetRetention.id
                    }
                  }
                }
              }
            }
          } else {
            if (config.mandibularStateKey) {
              (updated as any)[config.mandibularStateKey] = value
            }
            if (config.mandibularIdKey && id !== undefined) {
              (updated as any)[config.mandibularIdKey] = id

              // Auto-select retention type based on retention option's tooth_chart_type
              if (fieldKey === "retention_option" && id && updated.productDetails?.retention_options && updated.productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id

                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = updated.productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id ||
                    opt.lab_retention_option?.id === numericId ||
                    String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id ||
                    opt.retention_option_id === numericId ||
                    String(opt.retention_option_id) === String(id)) return true
                  return false
                })

                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type ||
                    selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                    selectedRetentionOption.retention_option?.tooth_chart_type

                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }

                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = updated.productDetails.retentions.find((ret: any) =>
                      ret.name === targetRetentionName ||
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      updated.mandibularRetention = targetRetention.name
                      updated.mandibularRetentionId = targetRetention.id
                    }
                  }
                }
              }
            }
          }
          return updated
        }
        return product
      }))
    }
  }

  // Handler to show teeth selection when clicking a saved product card
  const handleSavedProductCardClick = (savedProduct: SavedProduct) => {
    // Set the selected product and show product details to make the teeth selection interface visible
    setSelectedProduct(savedProduct.product)
    setShowProductDetails(true)

    // Set category and subcategory from saved product
    setSelectedCategory(savedProduct.category)
    setSelectedCategoryId(savedProduct.categoryId)
    setSelectedSubcategory(savedProduct.subcategory)
    setSelectedSubcategoryId(savedProduct.subcategoryId)

    // Set arch-specific products and show charts based on which arch has teeth
    const hasMaxillaryTeeth = Array.isArray(savedProduct.maxillaryTeeth) && savedProduct.maxillaryTeeth.length > 0
    const hasMandibularTeeth = Array.isArray(savedProduct.mandibularTeeth) && savedProduct.mandibularTeeth.length > 0

    if (hasMaxillaryTeeth) {
      setSelectedProductForMaxillary(savedProduct.product)
      setShowMaxillaryChart(true)
      setSelectedArchForProduct("maxillary")
    }

    if (hasMandibularTeeth) {
      setSelectedProductForMandibular(savedProduct.product)
      setShowMandibularChart(true)
      if (!hasMaxillaryTeeth) {
        setSelectedArchForProduct("mandibular")
      }
    }

    // Update teeth selection to show the teeth from the saved product
    // Always set the arrays to ensure proper state updates, even if empty
    // Create new array references to ensure React detects the change
    const maxillaryTeethArray = Array.isArray(savedProduct.maxillaryTeeth) && savedProduct.maxillaryTeeth.length > 0
      ? [...savedProduct.maxillaryTeeth]
      : []
    const mandibularTeethArray = Array.isArray(savedProduct.mandibularTeeth) && savedProduct.mandibularTeeth.length > 0
      ? [...savedProduct.mandibularTeeth]
      : []

    // Use setTimeout to ensure state updates are applied correctly
    // This helps with React batching and ensures the SVG components receive the updated values
    setMaxillaryTeeth([])
    setMandibularTeeth([])

    // Use a small delay to ensure the state is reset before setting new values
    setTimeout(() => {
      setMaxillaryTeeth(maxillaryTeethArray)
      setMandibularTeeth(mandibularTeethArray)
    }, 0)

    // Set material and other details if available
    if (savedProduct.maxillaryMaterial) {
      setMaxillaryMaterial(savedProduct.maxillaryMaterial)
    }
    if (savedProduct.maxillaryStumpShade) {
      setMaxillaryStumpShade(savedProduct.maxillaryStumpShade)
    }
    if (savedProduct.maxillaryRetention) {
      setMaxillaryRetention(savedProduct.maxillaryRetention)
    }
    if (savedProduct.maxillaryImplantDetails) {
      setMaxillaryImplantDetails(savedProduct.maxillaryImplantDetails)
    }
    if (savedProduct.mandibularMaterial) {
      setMandibularMaterial(savedProduct.mandibularMaterial)
    }
    if (savedProduct.mandibularRetention) {
      setMandibularRetention(savedProduct.mandibularRetention)
    }
    if (savedProduct.mandibularStumpShade) {
      setMandibularStumpShade(savedProduct.mandibularStumpShade)
    }
    if (savedProduct.mandibularImplantDetails) {
      setMandibularImplantDetails(savedProduct.mandibularImplantDetails)
    }
  }

  // Handler for stage selection
  const handleStageSelect = (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => {
    setSavedProducts((prev) =>
      prev.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            ...(arch === "maxillary" ? { maxillaryStage: stageName, maxillaryStageId: stageId } : { mandibularStage: stageName, mandibularStageId: stageId })
          }
        }
        return product
      })
    )
    // Close the dropdown after selection
    setOpenStageDropdown((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [arch]: false
      }
    }))
  }

  // Context value for saved product section (accordion + cards) - so section component can access all state/handlers without 80+ props
  const savedProductSectionContextValue = useMemo(
    () => ({
      showMaxillaryChart,
      showMandibularChart,
      maxillaryTeeth,
      mandibularTeeth,
      selectedProductForMaxillary,
      selectedProductForMandibular,
      savedProducts,
      productDetails,
      openAccordionMaxillary,
      openAccordionMandibular,
      handleAccordionChangeMaxillary,
      handleAccordionChangeMandibular,
      currentShadeField,
      setSavedProducts,
      handleDeleteProduct,
      handleOpenImpressionModal,
      getImpressionCount,
      getImpressionDisplayText,
      getImpressionCountFromSaved,
      getImpressionDisplayTextFromSaved,
      handleOpenShadeModal,
      handleFieldChange,
      handleSavedProductCardClick,
      fieldConfigs,
      maxillaryRetentionTypes,
      mandibularRetentionTypes,
      implants,
      implantsLoading,
      selectedImplantBrandPerProduct,
      selectedImplantPlatformPerProduct,
      setSelectedImplantBrandPerProduct,
      setSelectedImplantPlatformPerProduct,
      showImplantCardsForProduct,
      setShowImplantCardsForProduct,
      clickedFieldTypeInAccordion,
      setClickedFieldTypeInAccordion,
      openStageDropdown,
      setOpenStageDropdown,
      handleStageSelect,
      productAdvanceFields,
      setProductAdvanceFields,
      showAdvanceFields,
      currentProductForModal,
      currentArchForModal,
      setCurrentProductForModal,
      setCurrentArchForModal,
      showAddOnsModal,
      showAttachModal,
      showRushModal,
      setShowAddOnsModal,
      setShowAttachModal,
      setShowRushModal,
      getTotalAddOnsCount,
      getAttachedFilesCount,
      isAccordionFieldVisible,
      showValidationErrors,
    }),
    [
      showMaxillaryChart,
      showMandibularChart,
      maxillaryTeeth,
      mandibularTeeth,
      selectedProductForMaxillary,
      selectedProductForMandibular,
      savedProducts,
      productDetails,
      openAccordionMaxillary,
      openAccordionMandibular,
      currentShadeField,
      fieldConfigs,
      maxillaryRetentionTypes,
      mandibularRetentionTypes,
      implants,
      implantsLoading,
      selectedImplantBrandPerProduct,
      selectedImplantPlatformPerProduct,
      showImplantCardsForProduct,
      clickedFieldTypeInAccordion,
      openStageDropdown,
      productAdvanceFields,
      showAdvanceFields,
      getTotalAddOnsCount,
      currentProductForModal,
      currentArchForModal,
      showAddOnsModal,
      showAttachModal,
      showRushModal,
    ]
  )

  // Auto-open stage dropdown when accordion opens and stage field is visible with "Not specified" value
  useEffect(() => {
    if (!openAccordionMaxillary && !openAccordionMandibular) {
      setOpenStageDropdown({})
      return
    }

    const openIds = [openAccordionMaxillary, openAccordionMandibular].filter((id): id is string => !!id && savedProducts.some(p => p.id === id))
    if (openIds.length === 0) return

    const helper = (accordionId: string) => {
      const savedProduct = savedProducts.find(p => p.id === accordionId)
      if (!savedProduct) return
      const productDetails = savedProduct.productDetails
      if (!productDetails?.stages || !Array.isArray(productDetails.stages) || productDetails.stages.length === 0) return

      const isNotSpecified = (value: string | undefined | null): boolean => {
        if (!value) return true
        const trimmed = String(value).trim().toLowerCase()
        return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
      }

      const isMaxillaryVisible = isAccordionFieldVisible("stage", savedProduct, "maxillary")
      const isMandibularVisible = isAccordionFieldVisible("stage", savedProduct, "mandibular")
      const maxillaryStageValue = savedProduct.maxillaryStage
      const shouldOpenMaxillary = isMaxillaryVisible && isNotSpecified(maxillaryStageValue)
      const mandibularStageValue = savedProduct.mandibularStage
      const shouldOpenMandibular = isMandibularVisible && isNotSpecified(mandibularStageValue)

      if (shouldOpenMaxillary || shouldOpenMandibular) {
        setOpenStageDropdown((prev) => ({
          ...prev,
          [accordionId]: {
            ...prev[accordionId],
            ...(shouldOpenMaxillary && { maxillary: true }),
            ...(shouldOpenMandibular && { mandibular: true })
          }
        }))
      }
    }

    const checkAndOpenDropdowns = () => openIds.forEach(helper)

    const timer1 = setTimeout(checkAndOpenDropdowns, 200)
    const timer2 = setTimeout(checkAndOpenDropdowns, 400)
    const timer3 = setTimeout(checkAndOpenDropdowns, 600)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [openAccordionMaxillary, openAccordionMandibular, savedProducts])

  // Helper function to automatically show both maxillary and mandibular charts
  const showChartsAutomatically = (product: Product) => {
    setSelectedArchForProduct("maxillary")
    setShowMaxillaryChart(true)
    setSelectedProductForMaxillary(product)
    setMaxillaryTeeth([])
    setMaxillaryRetentionTypes({})

    setSelectedArchForProduct("mandibular")
    setShowMandibularChart(true)
    setSelectedProductForMandibular(product)
    setMandibularTeeth([])
    setMandibularRetentionTypes({})

    // Scroll to maxillary section after state update
    setTimeout(() => {
      maxillarySectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

  // Helper function to fetch product details on initial load
  const fetchProductDetailsOnInitialLoad = async (product: Product) => {
    setIsLoadingProductDetails(true)
    try {
      // Get lab from localStorage to ensure it's available
      const storedLab = localStorage.getItem("selectedLab")
      let labId: number | undefined
      if (storedLab) {
        try {
          const lab = JSON.parse(storedLab)
          labId = lab?.id || lab?.customer_id
        } catch (error) {
          console.error("Error parsing stored lab:", error)
        }
      }

      const details = await fetchProductDetails(product.id, labId)

      if (details) {
        setProductDetails(details)
        // Automatically show both maxillary and mandibular tooth selection charts
        showChartsAutomatically(product)
        // Store in localStorage for future use
        try {
          const essentialData = {
            id: details.id,
            name: details.name,
            code: details.code,
            extractions: details.extractions || details.data?.extractions,
          }
          localStorage.setItem(`productDetails_${product.id}`, JSON.stringify(essentialData))
        } catch (storageError) {
          console.warn("Could not store product details in localStorage:", storageError)
        }
      } else {
        // If API call failed or timed out, show error to user
        toast({
          title: "Loading Error",
          description: "Failed to load product details. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error fetching product details on initial load:", error)
      toast({
        title: "Loading Error",
        description: error.message || "Failed to load product details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProductDetails(false)
      setIsInitialLoading(false)
    }
  }

  // Load data from localStorage
  useEffect(() => {
    // Get selected doctor
    const storedDoctor = localStorage.getItem("selectedDoctor")
    if (storedDoctor) {
      try {
        const doctor = JSON.parse(storedDoctor)
        setSelectedDoctor(doctor)
      } catch (error) {
        console.error("Error parsing selected doctor:", error)
      }
    }

    // Get selected lab
    const storedLab = localStorage.getItem("selectedLab")
    if (storedLab) {
      try {
        const lab = JSON.parse(storedLab)
        setSelectedLab(lab)
      } catch (error) {
        console.error("Error parsing selected lab:", error)
      }
    }

    // Get patient data
    const storedPatientData = localStorage.getItem("patientData")
    if (storedPatientData) {
      try {
        const patient = JSON.parse(storedPatientData)
        setPatientData(patient)
      } catch (error) {
        console.error("Error parsing patient data:", error)
      }
    }

    // Get created by from localStorage (user info)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCreatedBy(`${user.first_name || ""} ${user.last_name || ""}`.trim())
      } catch (error) {
        console.error("Error parsing user:", error)
      }
    }

    // Load cached categories and subcategories from localStorage first
    const cachedCategories = localStorage.getItem("cachedAllCategories")
    const cachedSubcategories = localStorage.getItem("cachedSubcategoriesByCategory")

    // Restore from caseDesignCenterState if available (more complete)
    const savedState = localStorage.getItem("caseDesignCenterState")
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        if (state.allCategories && Array.isArray(state.allCategories) && state.allCategories.length > 0) {
          localStorage.setItem("cachedAllCategories", JSON.stringify(state.allCategories))
        }
        if (state.subcategoriesByCategory && Array.isArray(state.subcategoriesByCategory) && state.subcategoriesByCategory.length > 0) {
          localStorage.setItem("cachedSubcategoriesByCategory", JSON.stringify(state.subcategoriesByCategory))
        }
        if (state.products && Array.isArray(state.products) && state.products.length > 0) {
          setProducts(state.products)
        }
      } catch (error) {
        console.error("Error loading cached data from state:", error)
      }
    }

    // Fetch categories (will use cache if available in context, otherwise fetch fresh)
    // For office_admin, use selectedLab.id; for others, use customerId
    const customerIdNum = getCustomerIdForApi()
    fetchAllCategories("en", customerIdNum)

    // Load saved products from localStorage
    const storedProducts = localStorage.getItem("savedProducts")
    if (storedProducts) {
      try {
        const products = JSON.parse(storedProducts)
        // Restore productDetails for each saved product from separate localStorage keys if needed
        const productsWithDetails = products.map((sp: SavedProduct) => {
          // Always try to restore productDetails from separate key if available, even if productDetails exist
          const storedDetails = localStorage.getItem(`productDetails_${sp.product.id}`)
          if (storedDetails) {
            try {
              const fullDetails = JSON.parse(storedDetails)
              // Merge stored details with saved product details (saved product details take precedence)
              return {
                ...sp,
                productDetails: {
                  ...fullDetails,
                  ...(sp.productDetails || {}), // Merge existing productDetails if they exist
                  id: sp.productDetails?.id || fullDetails.id || sp.product.id
                }
              }
            } catch (error) {
              console.error(`Error parsing productDetails for product ${sp.product.id}:`, error)
            }
          }

          // If productDetails is missing or minimal, ensure we have at least a basic structure
          if (!sp.productDetails || !sp.productDetails.id) {
            return {
              ...sp,
              productDetails: {
                ...(sp.productDetails || {}),
                id: sp.product.id,
                // Ensure essential arrays exist even if empty
                materials: sp.productDetails?.materials || [],
                retentions: sp.productDetails?.retentions || [],
                stages: sp.productDetails?.stages || [],
                advance_fields: sp.productDetails?.advance_fields || []
              }
            }
          }

          return sp
        })
        setSavedProducts(productsWithDetails)

        // Automatically show charts if there are saved products
        const hasMaxillaryProducts = productsWithDetails.some((p: SavedProduct) => p.addedFrom === "maxillary" && p.maxillaryTeeth.length > 0)
        const hasMandibularProducts = productsWithDetails.some((p: SavedProduct) => p.addedFrom === "mandibular" && p.mandibularTeeth.length > 0)

        if (hasMaxillaryProducts) {
          setShowMaxillaryChart(true)
          // If there's a product in the saved products, use it for maxillary
          const maxillaryProduct = productsWithDetails.find((p: SavedProduct) => p.addedFrom === "maxillary")
          if (maxillaryProduct && maxillaryProduct.product) {
            setSelectedProductForMaxillary(maxillaryProduct.product)
            setMaxillaryTeeth(maxillaryProduct.maxillaryTeeth || [])
          }
        }

        if (hasMandibularProducts) {
          setShowMandibularChart(true)
          // If there's a product in the saved products, use it for mandibular
          const mandibularProduct = productsWithDetails.find((p: SavedProduct) => p.addedFrom === "mandibular")
          if (mandibularProduct && mandibularProduct.product) {
            setSelectedProductForMandibular(mandibularProduct.product)
            setMandibularTeeth(mandibularProduct.mandibularTeeth || [])
          }
        }
      } catch (error) {
        console.error("Error parsing saved products:", error)
      }
    }

    // Load selected product and its details from localStorage if available
    const storedProduct = localStorage.getItem("selectedProduct")
    if (storedProduct) {
      try {
        const product = JSON.parse(storedProduct)
        setSelectedProduct(product)
        setShowProductDetails(true)

        // Try to load product details from localStorage
        const storedDetails = localStorage.getItem(`productDetails_${product.id}`)
        if (storedDetails) {
          try {
            const details = JSON.parse(storedDetails)
            setProductDetails(details)
            // Automatically show both maxillary and mandibular tooth selection charts
            showChartsAutomatically(product)
            // Mark initial loading as complete since we have product details
            setIsInitialLoading(false)
          } catch (error) {
            console.error("Error parsing stored product details:", error)
            // If parsing fails, fetch from API
            fetchProductDetailsOnInitialLoad(product)
          }
        } else {
          // If product details are not in localStorage, fetch from API
          fetchProductDetailsOnInitialLoad(product)
        }
      } catch (error) {
        console.error("Error parsing selected product:", error)
        setIsInitialLoading(false)
      }
    } else {
      // No selected product, mark initial loading as complete
      setIsInitialLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - fetchAllCategories and fetchProductDetails are stable from context

  // Ensure charts are shown when saved products exist
  useEffect(() => {
    if (savedProducts.length > 0) {
      const hasMaxillaryProducts = savedProducts.some((p: SavedProduct) => p.addedFrom === "maxillary" && p.maxillaryTeeth.length > 0)
      const hasMandibularProducts = savedProducts.some((p: SavedProduct) => p.addedFrom === "mandibular" && p.mandibularTeeth.length > 0)

      if (hasMaxillaryProducts && !showMaxillaryChart) {
        setShowMaxillaryChart(true)
        // Set the first maxillary product as selected if none is selected
        if (!selectedProductForMaxillary) {
          const maxillaryProduct = savedProducts.find((p: SavedProduct) => p.addedFrom === "maxillary")
          if (maxillaryProduct && maxillaryProduct.product) {
            setSelectedProductForMaxillary(maxillaryProduct.product)
            setMaxillaryTeeth(maxillaryProduct.maxillaryTeeth || [])
          }
        }
      }

      if (hasMandibularProducts && !showMandibularChart) {
        setShowMandibularChart(true)
        // Set the first mandibular product as selected if none is selected
        if (!selectedProductForMandibular) {
          const mandibularProduct = savedProducts.find((p: SavedProduct) => p.addedFrom === "mandibular")
          if (mandibularProduct && mandibularProduct.product) {
            setSelectedProductForMandibular(mandibularProduct.product)
            setMandibularTeeth(mandibularProduct.mandibularTeeth || [])
          }
        }
      }
    }
  }, [savedProducts, showMaxillaryChart, showMandibularChart, selectedProductForMaxillary, selectedProductForMandibular])

  // Initialize implant state from saved products when they're loaded
  useEffect(() => {
    savedProducts.forEach((savedProduct: SavedProduct) => {
      // Check if this product has implant_library advance fields
      const productDetails = savedProduct.productDetails
      if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
        productDetails.advance_fields.forEach((field: any) => {
          if (field.field_type === "implant_library") {
            const fieldKey = `advance_${field.id}`

            // Initialize brand if saved - check multiple sources
            if (savedProduct.maxillaryImplantBrand && !selectedImplantBrand[fieldKey]) {
              let brandId: number | null = null

              // Try to get brand ID from savedProduct.maxillaryImplantBrand
              if (typeof savedProduct.maxillaryImplantBrand === 'number') {
                brandId = savedProduct.maxillaryImplantBrand
              } else {
                const parsed = Number(savedProduct.maxillaryImplantBrand)
                if (!isNaN(parsed) && parsed > 0) {
                  brandId = parsed
                } else {
                  // Try to find brand by name
                  const foundBrand = implants.find((imp: any) =>
                    imp.brand_name === savedProduct.maxillaryImplantBrand ||
                    imp.brand_name?.toLowerCase() === String(savedProduct.maxillaryImplantBrand).toLowerCase()
                  )
                  if (foundBrand) {
                    brandId = foundBrand.id
                  }
                }
              }

              if (brandId !== null) {
                setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: brandId }))
                // Also update per-product state
                setSelectedImplantBrandPerProduct(prev => ({
                  ...prev,
                  [savedProduct.id]: {
                    ...prev[savedProduct.id],
                    maxillary: brandId
                  }
                }))
              }
            }

            // Initialize platform if saved
            if (savedProduct.maxillaryImplantPlatform) {
              // Get brand first
              const brandId = savedProduct.maxillaryImplantBrand
                ? (typeof savedProduct.maxillaryImplantBrand === 'number'
                  ? savedProduct.maxillaryImplantBrand
                  : Number(savedProduct.maxillaryImplantBrand))
                : selectedImplantBrand[fieldKey]

              const brand = brandId
                ? implants.find((imp: any) =>
                  imp.id === brandId ||
                  imp.id === Number(brandId) ||
                  imp.brand_name === savedProduct.maxillaryImplantBrand
                )
                : null

              if (brand) {
                const platform = brand.platforms?.find((p: any) =>
                  p.name === savedProduct.maxillaryImplantPlatform ||
                  String(p.id) === String(savedProduct.maxillaryImplantPlatform)
                )
                if (platform) {
                  const platformId = typeof platform.id === 'number' ? platform.id : Number(platform.id) || null
                  if (platformId !== null) {
                    // Always set per-product state so saved product accordion shows platform
                    setSelectedImplantPlatformPerProduct(prev => ({
                      ...prev,
                      [savedProduct.id]: {
                        ...prev[savedProduct.id],
                        maxillary: platformId
                      }
                    }))
                    if (!selectedImplantPlatform[fieldKey]) {
                      setSelectedImplantPlatform(prev => ({ ...prev, [fieldKey]: platformId }))
                    }
                  }
                }
              }
            }

            // Initialize size if saved
            if (savedProduct.maxillaryImplantSize && !selectedImplantSize[fieldKey]) {
              const sizeValue = typeof savedProduct.maxillaryImplantSize === 'string'
                ? savedProduct.maxillaryImplantSize
                : String(savedProduct.maxillaryImplantSize) || null
              if (sizeValue !== null) {
                setSelectedImplantSize(prev => ({ ...prev, [fieldKey]: sizeValue }))
              }
            }

            // Initialize mandibular implant state from saved product (for saved product accordion display)
            if (savedProduct.mandibularImplantBrand) {
              let mandibularBrandId: number | null = null
              if (typeof savedProduct.mandibularImplantBrand === 'number') {
                mandibularBrandId = savedProduct.mandibularImplantBrand
              } else {
                const parsed = Number(savedProduct.mandibularImplantBrand)
                if (!isNaN(parsed) && parsed > 0) {
                  mandibularBrandId = parsed
                } else {
                  const foundBrand = implants.find((imp: any) =>
                    imp.brand_name === savedProduct.mandibularImplantBrand ||
                    imp.brand_name?.toLowerCase() === String(savedProduct.mandibularImplantBrand).toLowerCase()
                  )
                  if (foundBrand) mandibularBrandId = foundBrand.id
                }
              }
              if (mandibularBrandId !== null) {
                setSelectedImplantBrandPerProduct(prev => ({
                  ...prev,
                  [savedProduct.id]: { ...prev[savedProduct.id], mandibular: mandibularBrandId }
                }))
              }
            }
            if (savedProduct.mandibularImplantPlatform) {
              const mandibularBrandId = savedProduct.mandibularImplantBrand
                ? (typeof savedProduct.mandibularImplantBrand === 'number'
                  ? savedProduct.mandibularImplantBrand
                  : Number(savedProduct.mandibularImplantBrand))
                : null
              const brand = mandibularBrandId
                ? implants.find((imp: any) =>
                    imp.id === mandibularBrandId || imp.id === Number(mandibularBrandId) ||
                    imp.brand_name === savedProduct.mandibularImplantBrand
                  )
                : null
              if (brand) {
                const platform = brand.platforms?.find((p: any) =>
                  p.name === savedProduct.mandibularImplantPlatform ||
                  String(p.id) === String(savedProduct.mandibularImplantPlatform)
                )
                if (platform) {
                  const platformId = typeof platform.id === 'number' ? platform.id : Number(platform.id) || null
                  if (platformId !== null) {
                    setSelectedImplantPlatformPerProduct(prev => ({
                      ...prev,
                      [savedProduct.id]: { ...prev[savedProduct.id], mandibular: platformId }
                    }))
                  }
                }
              }
            }
          }
        })
      }
    })
  }, [savedProducts, implants])

  // Auto-save product when impression is filled in current editing card (maxillary)
  useEffect(() => {
    // Only run if we have a product selected and all required fields are filled
    if (!selectedProductForMaxillary || !productDetails || !showMaxillaryChart || maxillaryTeeth.length === 0) {
      return
    }

    // Check if impression is filled
    const impressionCount = getImpressionCount(selectedProductForMaxillary.id.toString(), "maxillary", productDetails.impressions || [])
    const hasImpression = impressionCount > 0

    // Check if all required fields are filled (material, retention, tooth shade, advance fields if any)
    const hasMaterial = !!maxillaryMaterial
    const hasRetention = !!maxillaryRetention
    const hasToothShade = isToothShadeFilled("maxillary")

    // Check if any tooth has "Implant" retention type for maxillary
    const hasImplantRetention = Object.values(maxillaryRetentionTypes).some(
      (types) => types && types.includes('Implant')
    )

    // Check if advance fields are complete (if they exist)
    const hasAdvanceFields = productDetails?.advance_fields && Array.isArray(productDetails.advance_fields) && productDetails.advance_fields.length > 0
    let allAdvanceFieldsComplete = true
    if (hasAdvanceFields) {
      const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
        const fieldNameLower = (field.name || "").toLowerCase()
        // Filter out stump shade fields
        if (fieldNameLower.includes("stump") && fieldNameLower.includes("shade")) return false
        // Filter out implant_library fields if retention type is not "Implant"
        if (field.field_type === "implant_library" && !hasImplantRetention) return false
        return true
      })
      allAdvanceFieldsComplete = filteredAdvanceFields.every((field: any) => {
        if (field.field_type === "implant_library") {
          // Only check implant details if retention type is "Implant"
          const fieldKey = `advance_${field.id}`
          const brandId = selectedImplantBrand[fieldKey]
          const platformId = selectedImplantPlatform[fieldKey]
          const size = selectedImplantSize[fieldKey]
          // Also check inclusions, abutment detail, and abutment type are filled
          const hasInclusions = !!maxillaryImplantInclusions
          const hasAbutmentDetail = !!maxillaryAbutmentDetail
          const hasAbutmentType = !!maxillaryAbutmentType
          return brandId && platformId && size && hasInclusions && hasAbutmentDetail && hasAbutmentType
        }
        const fieldKey = `advance_${field.id}`
        const fieldValue = advanceFieldValues[fieldKey]
        return fieldValue && fieldValue.advance_field_value
      })
    }

    // Check if product is already saved (to avoid duplicate saves)
    const isAlreadySaved = savedProducts.some(sp => {
      const sameProduct = sp.product.id === selectedProductForMaxillary.id
      const sameTeeth = JSON.stringify([...(sp.maxillaryTeeth || [])].sort()) === JSON.stringify([...maxillaryTeeth].sort())
      const sameCategory = sp.categoryId === selectedCategoryId
      const sameSubcategory = sp.subcategoryId === selectedSubcategoryId
      const isMaxillary = sp.addedFrom === "maxillary"
      return isMaxillary && sameProduct && sameTeeth && sameCategory && sameSubcategory
    })

    // Auto-save if:
    // 1. Impression is filled
    // 2. All required fields are filled
    // 3. Impression modal is not open
    // 4. Impression modal was not just closed (wait a bit after modal closes)
    if (hasImpression && hasMaterial && hasRetention && hasToothShade && (!hasAdvanceFields || allAdvanceFieldsComplete) && !showImpressionModal && !impressionModalJustClosedRef.current) {
      // Use a small delay to ensure impression state is fully updated
      const saveTimer = setTimeout(() => {
        // Double-check impression is still filled before saving
        const currentImpressionCount = getImpressionCount(selectedProductForMaxillary.id.toString(), "maxillary", productDetails.impressions || [])
        if (currentImpressionCount > 0) {
          // Debounced auto-save to avoid multiple rapid saves
          debouncedAutoSaveProduct("maxillary")

          // After auto-save, open the saved product accordion only if currently on maxillary-card
          // This ensures the current editing card is hidden and user sees the saved product
          // But don't force-open if user has already closed or is viewing another accordion
          setTimeout(() => {
            const matchingProduct = savedProducts.find(sp =>
              sp.addedFrom === "maxillary" &&
              sp.product.id === selectedProductForMaxillary.id &&
              sp.categoryId === selectedCategoryId &&
              sp.subcategoryId === selectedSubcategoryId &&
              JSON.stringify([...(sp.maxillaryTeeth || [])].sort()) === JSON.stringify([...maxillaryTeeth].sort())
            )
            if (matchingProduct && openAccordionMaxillary === "maxillary-card") {
              // Only open the saved product accordion if we're on the editing card
              setOpenAccordionMaxillary(matchingProduct.id)
            }
          }, 200)
        }
      }, 500) // Small delay to ensure state is updated

      return () => clearTimeout(saveTimer)
    }
  }, [
    selectedProductForMaxillary,
    productDetails,
    showMaxillaryChart,
    maxillaryTeeth,
    maxillaryMaterial,
    maxillaryRetention,
    selectedImpressions,
    showImpressionModal,
    savedProducts,
    selectedCategoryId,
    selectedSubcategoryId,
    advanceFieldValues,
    selectedImplantBrand,
    selectedImplantPlatform,
    selectedImplantSize,
    openAccordionMaxillary,
    maxillaryRetentionTypes,
    maxillaryImplantInclusions,
    maxillaryAbutmentDetail,
    maxillaryAbutmentType
  ])

  // Auto-save product when impression is filled in current editing card (mandibular)
  useEffect(() => {
    if (!selectedProductForMandibular || !productDetails || !showMandibularChart || mandibularTeeth.length === 0) {
      return
    }

    const impressionCount = getImpressionCount(selectedProductForMandibular.id.toString(), "mandibular", productDetails.impressions || [])
    const hasImpression = impressionCount > 0

    const hasMaterial = !!mandibularMaterial
    const hasRetention = !!mandibularRetention
    const hasToothShade = isToothShadeFilled("mandibular")

    const hasImplantRetention = Object.values(mandibularRetentionTypes).some(
      (types) => types && types.includes('Implant')
    )

    const hasAdvanceFields = productDetails?.advance_fields && Array.isArray(productDetails.advance_fields) && productDetails.advance_fields.length > 0
    let allAdvanceFieldsComplete = true
    if (hasAdvanceFields) {
      const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
        const fieldNameLower = (field.name || "").toLowerCase()
        if (fieldNameLower.includes("stump") && fieldNameLower.includes("shade")) return false
        if (field.field_type === "implant_library" && !hasImplantRetention) return false
        return true
      })
      allAdvanceFieldsComplete = filteredAdvanceFields.every((field: any) => {
        if (field.field_type === "implant_library") {
          const fieldKey = `advance_${field.id}`
          const brandId = selectedImplantBrand[fieldKey]
          const platformId = selectedImplantPlatform[fieldKey]
          const size = selectedImplantSize[fieldKey]
          const hasInclusions = !!mandibularImplantInclusions
          const hasAbutmentDetail = !!mandibularAbutmentDetail
          const hasAbutmentType = !!mandibularAbutmentType
          return brandId && platformId && size && hasInclusions && hasAbutmentDetail && hasAbutmentType
        }
        const fieldKey = `advance_${field.id}`
        const fieldValue = advanceFieldValues[fieldKey]
        return fieldValue && fieldValue.advance_field_value
      })
    }

    if (hasImpression && hasMaterial && hasRetention && hasToothShade && (!hasAdvanceFields || allAdvanceFieldsComplete) && !showImpressionModal && !impressionModalJustClosedRef.current) {
      const saveTimer = setTimeout(() => {
        const currentImpressionCount = getImpressionCount(selectedProductForMandibular.id.toString(), "mandibular", productDetails.impressions || [])
        if (currentImpressionCount > 0) {
          debouncedAutoSaveProduct("mandibular")
          // After auto-save, open the saved product accordion only if currently on mandibular-card
          // But don't force-open if user has already closed or is viewing another accordion
          setTimeout(() => {
            const matchingProduct = savedProducts.find(sp =>
              sp.addedFrom === "mandibular" &&
              sp.product.id === selectedProductForMandibular.id &&
              sp.categoryId === selectedCategoryId &&
              sp.subcategoryId === selectedSubcategoryId &&
              JSON.stringify([...(sp.mandibularTeeth || [])].sort()) === JSON.stringify([...mandibularTeeth].sort())
            )
            if (matchingProduct && openAccordionMandibular === "mandibular-card") {
              // Only open the saved product accordion if we're on the editing card
              setOpenAccordionMandibular(matchingProduct.id)
            }
          }, 200)
        }
      }, 500)

      return () => clearTimeout(saveTimer)
    }
  }, [
    selectedProductForMandibular,
    productDetails,
    showMandibularChart,
    mandibularTeeth,
    mandibularMaterial,
    mandibularRetention,
    selectedImpressions,
    showImpressionModal,
    savedProducts,
    selectedCategoryId,
    selectedSubcategoryId,
    advanceFieldValues,
    selectedImplantBrand,
    selectedImplantPlatform,
    selectedImplantSize,
    openAccordionMandibular,
    mandibularRetentionTypes,
    mandibularImplantInclusions,
    mandibularAbutmentDetail,
    mandibularAbutmentType
  ])

  // Save products to localStorage whenever savedProducts changes
  useEffect(() => {
    if (savedProducts.length > 0) {
      try {
        // Optimize data before saving - keep essential fields from productDetails
        const optimizedProducts = savedProducts.map((sp) => {
          const { productDetails, ...rest } = sp
          // Keep essential fields from productDetails needed for UI restoration
          const optimizedDetails = productDetails ? {
            id: productDetails.id,
            name: productDetails.name,
            code: productDetails.code,
            advance_fields: productDetails.advance_fields,
            materials: productDetails.materials,
            retentions: productDetails.retentions,
            retention_options: productDetails.retention_options,
            stages: productDetails.stages,
            grades: productDetails.grades,
            teeth_shades: productDetails.teeth_shades,
            gum_shades: productDetails.gum_shades,
            impressions: productDetails.impressions,
            // Keep other essential fields that might be needed
            implant: productDetails.implant,
            // Remove large nested objects, base64 images, etc.
          } : null

          return {
            ...rest,
            // Store minimal product data - remove image_url if it's a large base64 string
            product: {
              ...sp.product,
              // Remove large image data if present
              image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
            },
            productDetails: optimizedDetails
          }
        })

        const dataToSave = JSON.stringify(optimizedProducts)

        // Check size before saving (localStorage limit is usually ~5-10MB)
        const sizeInMB = new Blob([dataToSave]).size / (1024 * 1024)
        if (sizeInMB > 4) {
          console.warn(`Data size (${sizeInMB.toFixed(2)}MB) is approaching localStorage limit. Consider removing old items.`)
        }

        localStorage.setItem("savedProducts", dataToSave)
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.error("localStorage quota exceeded. Attempting to clear old data...")

          // Try to remove old items or other localStorage data
          try {
            // Remove old saved products (keep only last 10)
            if (savedProducts.length > 10) {
              const recentProducts = savedProducts.slice(-10)
              const optimizedRecent = recentProducts.map((sp) => {
                const { productDetails, ...rest } = sp
                return {
                  ...rest,
                  product: {
                    ...sp.product,
                    image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
                  },
                  productDetails: null // Remove productDetails to save space
                }
              })
              localStorage.setItem("savedProducts", JSON.stringify(optimizedRecent))
              toast({
                title: "Storage Limit",
                description: "Some older items were removed to save space. Only the 10 most recent products are saved.",
                variant: "default",
              })
            } else {
              // If still too large, remove productDetails entirely
              const minimalProducts = savedProducts.map((sp) => {
                const { productDetails, ...rest } = sp
                return {
                  ...rest,
                  product: {
                    id: sp.product.id,
                    name: sp.product.name,
                    price: sp.product.price,
                    estimated_days: sp.product.estimated_days,
                    // Remove image_url if it's large
                    image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
                  },
                  productDetails: null
                }
              })
              localStorage.setItem("savedProducts", JSON.stringify(minimalProducts))
              toast({
                title: "Storage Optimized",
                description: "Product details were removed to save space. Essential data is preserved.",
                variant: "default",
              })
            }
          } catch (retryError) {
            console.error("Failed to save even after optimization:", retryError)
            toast({
              title: "Storage Error",
              description: "Unable to save all products. Please reduce the number of items or clear browser storage.",
              variant: "destructive",
            })
          }
        } else {
          console.error("Error saving to localStorage:", error)
          toast({
            title: "Save Error",
            description: "Failed to save products. Please try again.",
            variant: "destructive",
          })
        }
      }
    } else {
      localStorage.removeItem("savedProducts")
    }
  }, [savedProducts])

  // Comprehensive state persistence functions
  const saveStateToLocalStorage = () => {
    try {
      const stateToSave = {
        // Category and subcategory selections
        selectedCategory,
        selectedCategoryId,
        selectedSubcategory,
        selectedSubcategoryId,
        showSubcategories,
        showProducts,
        // Categories and subcategories data
        allCategories: allCategories || [],
        subcategoriesByCategory: subcategoriesByCategory || [],
        // Products data
        products: products || [],
        // Product selection
        selectedProduct: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          code: selectedProduct.code,
          price: selectedProduct.price,
          estimated_days: selectedProduct.estimated_days,
          image_url: selectedProduct.image_url?.startsWith('data:') ? undefined : selectedProduct.image_url
        } : null,
        showProductDetails,
        // UI state
        openAccordionMaxillary,
        openAccordionMandibular,
        showAdvanceFields,
        // Advance fields data
        productAdvanceFields: Object.keys(productAdvanceFields).reduce((acc, key) => {
          // Only save essential data from advance fields
          acc[key] = productAdvanceFields[key].map((field: any) => ({
            id: field.id,
            name: field.name,
            field_type: field.field_type,
            is_required: field.is_required
          }))
          return acc
        }, {} as any),
        advanceFieldValues,
        // Impressions
        selectedImpressions,
        // Shade selection state
        selectedShadeGuide,
        // Stage dropdown state
        openStageDropdown
      }

      localStorage.setItem("caseDesignCenterState", JSON.stringify(stateToSave))
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.warn("localStorage quota exceeded. Clearing old state data...")
        // Try to clear and save again with minimal data
        try {
          const minimalState = {
            selectedCategory,
            selectedCategoryId,
            selectedSubcategory,
            selectedSubcategoryId,
            showSubcategories,
            showProducts,
            allCategories: allCategories || [],
            subcategoriesByCategory: subcategoriesByCategory || [],
            products: products || [],
            selectedProduct: selectedProduct ? { id: selectedProduct.id, name: selectedProduct.name } : null,
            openAccordionMaxillary,
            openAccordionMandibular
          }
          localStorage.setItem("caseDesignCenterState", JSON.stringify(minimalState))
        } catch (retryError) {
          console.error("Failed to save even minimal state:", retryError)
        }
      } else {
        console.error("Error saving state to localStorage:", error)
      }
    }
  }

  const loadStateFromLocalStorage = () => {
    try {
      const savedState = localStorage.getItem("caseDesignCenterState")
      if (savedState) {
        const state = JSON.parse(savedState)

        // Restore categories and subcategories data first (before restoring selections)
        if (state.allCategories && Array.isArray(state.allCategories) && state.allCategories.length > 0) {
          // Store in a way that can be used - we'll need to work with the context
          // For now, save to a separate key that can be checked
          localStorage.setItem("cachedAllCategories", JSON.stringify(state.allCategories))
        }
        if (state.subcategoriesByCategory && Array.isArray(state.subcategoriesByCategory) && state.subcategoriesByCategory.length > 0) {
          localStorage.setItem("cachedSubcategoriesByCategory", JSON.stringify(state.subcategoriesByCategory))
        }
        if (state.products && Array.isArray(state.products) && state.products.length > 0) {
          setProducts(state.products)
        }

        // Restore category and subcategory selections
        if (state.selectedCategory) setSelectedCategory(state.selectedCategory)
        if (state.selectedCategoryId) setSelectedCategoryId(state.selectedCategoryId)
        if (state.selectedSubcategory) setSelectedSubcategory(state.selectedSubcategory)
        if (state.selectedSubcategoryId) setSelectedSubcategoryId(state.selectedSubcategoryId)
        if (typeof state.showSubcategories === 'boolean') setShowSubcategories(state.showSubcategories)
        if (typeof state.showProducts === 'boolean') setShowProducts(state.showProducts)

        // Restore product selection
        if (state.selectedProduct) {
          // We'll need to find the full product from products array or fetch it
          // For now, just restore the basic info
          setSelectedProduct(state.selectedProduct as Product)
          // Only show product details if it was explicitly set to true in saved state
          if (typeof state.showProductDetails === 'boolean') {
            setShowProductDetails(state.showProductDetails)
          }
        } else {
          // If no product is selected, ensure product details are not shown
          setShowProductDetails(false)
        }

        // If products are showing and we have a selected subcategory, ensure showSubcategories is true
        // This ensures the "Back to Subcategories" button appears correctly
        // Do this after restoring product selection to avoid conflicts
        if (state.showProducts && state.selectedSubcategoryId) {
          // Only set showSubcategories to true if it wasn't already set, or if we need it for navigation
          if (!state.showSubcategories) {
            setShowSubcategories(true)
          }
          // Ensure showProductDetails is false if we're just viewing the product list
          if (!state.selectedProduct && state.showProductDetails) {
            setShowProductDetails(false)
          }
        }

        // Restore UI state (support legacy openAccordion for backward compatibility)
        if (state.openAccordionMaxillary != null) setOpenAccordionMaxillary(state.openAccordionMaxillary)
        if (state.openAccordionMandibular != null) setOpenAccordionMandibular(state.openAccordionMandibular)
        if (state.openAccordion != null && state.openAccordionMaxillary == null && state.openAccordionMandibular == null) {
          const v = state.openAccordion
          if (v === "maxillary-card") setOpenAccordionMaxillary(v)
          else if (v === "mandibular-card") setOpenAccordionMandibular(v)
          else setOpenAccordionMaxillary(v)
        }
        if (state.showAdvanceFields) setShowAdvanceFields(state.showAdvanceFields)
        if (state.productAdvanceFields) setProductAdvanceFields(state.productAdvanceFields)
        if (state.advanceFieldValues) setAdvanceFieldValues(state.advanceFieldValues)
        if (state.selectedImpressions) setSelectedImpressions(state.selectedImpressions)
        if (state.selectedShadeGuide) setSelectedShadeGuide(state.selectedShadeGuide)
        if (state.openStageDropdown) setOpenStageDropdown(state.openStageDropdown)
      }
    } catch (error) {
      console.error("Error loading state from localStorage:", error)
    }
  }

  // Save state whenever important state variables change
  useEffect(() => {
    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(() => {
      saveStateToLocalStorage()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [
    selectedCategory,
    selectedCategoryId,
    selectedSubcategory,
    selectedSubcategoryId,
    showSubcategories,
    showProducts,
    allCategories,
    subcategoriesByCategory,
    products,
    selectedProduct,
    showProductDetails,
    openAccordionMaxillary,
    openAccordionMandibular,
    showAdvanceFields,
    productAdvanceFields,
    advanceFieldValues,
    selectedImpressions,
    selectedShadeGuide,
    openStageDropdown
  ])

  // Load state on mount (after initial data load)
  useEffect(() => {
    // Load after a short delay to ensure other useEffect hooks have run
    const timeoutId = setTimeout(() => {
      loadStateFromLocalStorage()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, []) // Only run once on mount

  // Restore products from cache early if available
  useEffect(() => {
    const savedState = localStorage.getItem("caseDesignCenterState")
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        if (state.products && Array.isArray(state.products) && state.products.length > 0 && products.length === 0) {
          setProducts(state.products)
        }
      } catch (error) {
        console.error("Error restoring products from cache:", error)
      }
    }
  }, []) // Run once on mount

  // Check if there's unsaved work
  const hasUnsavedWork = useMemo(() => {
    return (
      savedProducts.length > 0 ||
      selectedProduct !== null ||
      selectedCategoryId !== null ||
      selectedSubcategoryId !== null ||
      (advanceFieldValues && Object.keys(advanceFieldValues).length > 0) ||
      (selectedImpressions && Object.keys(selectedImpressions).length > 0)
    )
  }, [savedProducts.length, selectedProduct, selectedCategoryId, selectedSubcategoryId, advanceFieldValues, selectedImpressions])

  // Handle page refresh/navigation warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork && !allowNavigationRef.current) {
        // Show browser's default confirmation
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
        return '' // Required for Safari
      }
    }

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedWork])

  // Handle refresh button click (F5 or Ctrl+R / Cmd+R) - show custom modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect F5 or Ctrl+R / Cmd+R
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        if (hasUnsavedWork && !allowNavigationRef.current) {
          e.preventDefault()
          setShowRefreshWarningModal(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasUnsavedWork])

  // Sync products from context when labProducts changes
  useEffect(() => {
    if (showProducts && labProducts && Array.isArray(labProducts)) {
      setProducts(labProducts)
    }
  }, [labProducts, showProducts])

  // Check scroll position for subcategories
  const checkSubcategoriesScroll = () => {
    if (subcategoriesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = subcategoriesScrollRef.current
      setShowSubcategoriesLeftArrow(scrollLeft > 0)
      setShowSubcategoriesRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  // Check scroll position for products
  const checkProductsScroll = () => {
    if (productsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = productsScrollRef.current
      setShowProductsLeftArrow(scrollLeft > 0)
      setShowProductsRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  // Debounce unified search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Filtered subcategories based on search query
  // Only show subcategories that belong to the currently selected category
  const filteredSubcategories = useMemo(() => {
    // First, ensure we only show subcategories for the selected category
    let categoryFilteredSubcategories = subcategoriesByCategory
    if (selectedCategoryId) {
      categoryFilteredSubcategories = subcategoriesByCategory.filter(
        (subcategory: ProductCategory) => subcategory.parent_id === selectedCategoryId
      )
    }

    // Then apply search filter if there's a search query
    if (!debouncedSearchQuery.trim()) {
      return categoryFilteredSubcategories
    }
    const query = debouncedSearchQuery.toLowerCase().trim()
    return categoryFilteredSubcategories.filter((subcategory: ProductCategory) =>
      subcategory.sub_name?.toLowerCase().includes(query)
    )
  }, [subcategoriesByCategory, debouncedSearchQuery, selectedCategoryId])

  // Filtered products based on search query
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return products
    }
    const query = debouncedSearchQuery.toLowerCase().trim()
    return products.filter((product: Product) =>
      product.name?.toLowerCase().includes(query)
    )
  }, [products, debouncedSearchQuery])

  // Update arrow visibility when subcategories change
  useEffect(() => {
    if (showSubcategories && filteredSubcategories.length > 0) {
      setTimeout(() => {
        checkSubcategoriesScroll()
      }, 100)
    }
  }, [showSubcategories, filteredSubcategories])

  // Update arrow visibility when products change
  useEffect(() => {
    if (showProducts && filteredProducts.length > 0) {
      setTimeout(() => {
        checkProductsScroll()
      }, 100)
    }
  }, [showProducts, filteredProducts])

  // Handle window resize for scroll arrows
  useEffect(() => {
    const handleResize = () => {
      checkSubcategoriesScroll()
      checkProductsScroll()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [showSubcategories, showProducts, filteredSubcategories, filteredProducts])

  // Product search with React Query - always search products when there's a search query
  const labId = selectedLab?.id || selectedLab?.customer_id
  const searchTerm = debouncedSearchQuery.trim()
  const shouldSearch = !showProductDetails && !!searchTerm && !!labId

  const {
    data: productSearchResults = [],
    isLoading: isSearchingProducts,
  } = useQuery<Product[]>({
    queryKey: ['productSearch', labId, searchTerm],
    queryFn: async () => {
      if (!labId || !searchTerm) return []

      const params: Record<string, any> = {
        per_page: 50,
        page: 1,
        q: searchTerm,
      }

      const results = await fetchLabProducts(labId, params)
      return Array.isArray(results) ? results : []
    },
    enabled: shouldSearch,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Scroll to bottom when tooth selection is shown
  useEffect(() => {
    if (showProductDetails && selectedProduct) {
      // Use setTimeout to ensure the DOM has rendered
      setTimeout(() => {
        // Scroll to the bottom of the page to show the tooth selection
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [showProductDetails, selectedProduct])

  // Scroll handlers
  const scrollSubcategories = (direction: 'left' | 'right') => {
    if (subcategoriesScrollRef.current) {
      const scrollAmount = 300
      const newScrollLeft = direction === 'left'
        ? subcategoriesScrollRef.current.scrollLeft - scrollAmount
        : subcategoriesScrollRef.current.scrollLeft + scrollAmount
      subcategoriesScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  const scrollProducts = (direction: 'left' | 'right') => {
    if (productsScrollRef.current) {
      const scrollAmount = 300
      const newScrollLeft = direction === 'left'
        ? productsScrollRef.current.scrollLeft - scrollAmount
        : productsScrollRef.current.scrollLeft + scrollAmount
      productsScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  // Filter categories based on common names
  const getCategoryImage = (name: string) => {
    if (!name) return "/images/product-default.png"
    const lower = name.toLowerCase()
    if (lower.includes("fixed")) return "/images/fixed-restoration.png"
    if (lower.includes("removable")) return "/images/removable-restoration.png"
    if (lower.includes("ortho")) return "/images/orthodontics.png"
    return "/images/product-default.png"
  }

  const mainCategories = allCategories?.filter((cat: ProductCategoryApi) => {
    const name = cat.name.toLowerCase()
    return name.includes("fixed") || name.includes("removable") || name.includes("ortho")
  }) || []

  // Check if selected category is Fixed Restoration
  const isFixedRestoration = selectedCategory?.toLowerCase().includes("fixed") || false
  // Check if selected category is Orthodontics or Removable Restoration (extraction should only show for these)
  const isOrthodonticsOrRemovable = selectedCategory?.toLowerCase().includes("orthodontic") ||
    selectedCategory?.toLowerCase().includes("ortho") ||
    selectedCategory?.toLowerCase().includes("removable") || false

  // Helper function to check if product has implant retention option
  const hasImplantRetentionOption = (productDetails: any): boolean => {
    if (!productDetails?.retention_options) return false
    return productDetails.retention_options.some((opt: any) =>
      opt.name?.toLowerCase() === "implant" ||
      opt.lab_retention_option?.name?.toLowerCase() === "implant"
    )
  }

  // Check if conditions are met for showing implant popover
  const shouldShowImplantPopover = isFixedRestoration &&
    selectedProduct &&
    productDetails &&
    hasImplantRetentionOption(productDetails)

  // State to track which tooth was clicked to show the popover
  const [implantPopoverState, setImplantPopoverState] = useState<{
    arch: 'maxillary' | 'mandibular' | null
    toothNumber: number | null
  }>({ arch: null, toothNumber: null })

  const handleCategorySelect = (category: ProductCategoryApi) => {
    setSelectedCategory(category.name)
    setSelectedCategoryId(category.id)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setShowSubcategories(true)
    localStorage.setItem("selectedCategory", category.name)

    // Fetch subcategories for the selected category
    // For office_admin, use selectedLab.id; for others, use customerId
    const customerIdNum = getCustomerIdForApi()
    fetchSubcategoriesByCategory(category.id, "en", customerIdNum)
  }

  const handleSubcategorySelect = async (subcategory: ProductCategory) => {
    setSelectedSubcategory(subcategory.sub_name || null)
    setSelectedSubcategoryId(subcategory.id)
    localStorage.setItem("selectedSubcategory", subcategory.sub_name || "")
    localStorage.setItem("selectedSubcategoryId", subcategory.id.toString())

    // Fetch products for the selected subcategory
    setShowProducts(true)
    setShowSubcategories(false)
    setIsLoadingProducts(true)

    try {
      const labId = selectedLab?.id || selectedLab?.customer_id
      if (!labId) {
        toast({
          title: "Error",
          description: "No lab selected",
          variant: "destructive",
        })
        return
      }

      const params: Record<string, any> = {
        per_page: 50,
        page: 1,
        subcategory_id: subcategory.id,
      }

      if (searchQuery.trim()) {
        params.q = searchQuery.trim()
      }

      await fetchLabProducts(labId, params)
      // Products are stored in labProducts from context
      if (labProducts && Array.isArray(labProducts)) {
        setProducts(labProducts)
      } else {
        setProducts([])
      }
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleProductSelect = async (product: Product, event?: React.MouseEvent<HTMLDivElement>) => {
    // Check if category is "removable restoration" and subcategory is "complete denture"
    const isRemovableRestoration = selectedCategory?.toLowerCase().includes("removable") || false
    const isCompleteDenture = selectedSubcategory?.toLowerCase().includes("complete denture") ||
      selectedSubcategory?.toLowerCase().includes("complete dentures") || false

    // If conditions are met, show popover instead of directly selecting
    if (isRemovableRestoration && isCompleteDenture) {
      setPendingProductForArchSelection(product)
      // Get the position of the clicked element for popover positioning
      if (event?.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect()
        setArchSelectionPopoverAnchor({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 10
        })
      }
      setShowArchSelectionPopover(true)
      return
    }

    // Otherwise, proceed with normal product selection
    await proceedWithProductSelection(product)
  }

  // Separate function to proceed with product selection after arch is chosen
  const proceedWithProductSelection = async (product: Product, archSelection?: "maxillary" | "mandibular" | "both") => {
    setSelectedProduct(product)
    // Don't show product details/charts immediately - wait for user to choose upper/lower
    setShowProductDetails(true) // Keep this true for other UI elements, but charts will be controlled by showMaxillaryChart/showMandibularChart
    setShowProducts(false)
    setIsLoadingProductDetails(true)
    setProductDetails(null)
    // Keep search query for when user navigates back

    // Reset arch selection state when selecting a new product
    setSelectedArchForProduct(null)
    setShowMaxillaryChart(false)
    setShowMandibularChart(false)
    setSelectedProductForMaxillary(null)
    setSelectedProductForMandibular(null)

    // If arch selection was provided (from popover), set the appropriate charts
    if (archSelection === "maxillary") {
      setShowMaxillaryChart(true)
      setSelectedProductForMaxillary(product)
      setSelectedArchForProduct("maxillary")
    } else if (archSelection === "mandibular") {
      setShowMandibularChart(true)
      setSelectedProductForMandibular(product)
      setSelectedArchForProduct("mandibular")
    } else if (archSelection === "both") {
      setShowMaxillaryChart(true)
      setShowMandibularChart(true)
      setSelectedProductForMaxillary(product)
      setSelectedProductForMandibular(product)
    }

    // Reset missing teeth card clicked state when selecting a new product
    if (isFixedRestoration) {
      setMissingTeethCardClicked(false)
    }
    localStorage.setItem("selectedProduct", JSON.stringify(product))

    // Fetch product details from API
    try {
      const labId = selectedLab?.id || selectedLab?.customer_id
      const details = await fetchProductDetails(product.id, labId)

      if (details) {
        setProductDetails(details)
        console.log("Product details fetched:", details)
        console.log("Product extractions:", details.extractions)

        // Check if product has extraction data and show MissingTeethCards immediately
        const hasExtractionData = (details.extractions && Array.isArray(details.extractions) && details.extractions.length > 0) ||
          (details.data?.extractions && Array.isArray(details.data.extractions) && details.data.extractions.length > 0)

        if (hasExtractionData && isFixedRestoration) {
          // Don't set missingTeethCardClicked to false - let extraction cards show immediately
          // The cards will be visible as long as selectedProduct exists and missingTeethCardClicked is false
        }

        // Store product details in localStorage for persistence
        // Store essential data including advance_fields, materials, retentions, stages, etc.
        try {
          // Store essential fields including advance_fields which are needed for the UI
          const essentialData = {
            id: details.id,
            name: details.name,
            code: details.code,
            extractions: details.extractions || details.data?.extractions,
            advance_fields: details.advance_fields || details.data?.advance_fields,
            materials: details.materials || details.data?.materials,
            retentions: details.retentions || details.data?.retentions,
            retention_options: details.retention_options || details.data?.retention_options,
            stages: details.stages || details.data?.stages,
            grades: details.grades || details.data?.grades,
            teeth_shades: details.teeth_shades || details.data?.teeth_shades,
            gum_shades: details.gum_shades || details.data?.gum_shades,
            impressions: details.impressions || details.data?.impressions,
            // Add other essential fields as needed
          }
          localStorage.setItem(`productDetails_${product.id}`, JSON.stringify(essentialData))
        } catch (storageError: any) {
          // Handle quota exceeded or other storage errors gracefully
          if (storageError.name === 'QuotaExceededError' || storageError.message?.includes('quota')) {
            console.warn(`localStorage quota exceeded for product ${product.id}. Skipping storage.`)
            // Optionally clear old product details to free up space
            try {
              // Clear old product details (keep only the last 5 products)
              const keys = Object.keys(localStorage)
              const productDetailKeys = keys.filter(key => key.startsWith('productDetails_'))
              if (productDetailKeys.length > 5) {
                // Sort by key (which includes product ID) and remove oldest
                productDetailKeys.sort()
                const keysToRemove = productDetailKeys.slice(0, productDetailKeys.length - 5)
                keysToRemove.forEach(key => localStorage.removeItem(key))
                // Retry storing the current product
                const essentialData = {
                  id: details.id,
                  name: details.name,
                  code: details.code,
                  extractions: details.extractions || details.data?.extractions,
                }
                localStorage.setItem(`productDetails_${product.id}`, JSON.stringify(essentialData))
              }
            } catch (retryError) {
              console.warn('Failed to free up localStorage space:', retryError)
            }
          } else {
            console.error('Error storing product details in localStorage:', storageError)
          }
        }

        // Only automatically show charts if arch selection wasn't already set from popover
        if (!archSelection) {
          // Automatically show both maxillary and mandibular tooth selection charts
          showChartsAutomatically(product)
        }
      } else {
        toast({
          title: "Warning",
          description: "Could not fetch product details. Some features may be limited.",
          variant: "default",
        })
      }
    } catch (error: any) {
      console.error("Error fetching product details:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch product details",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProductDetails(false)
    }
  }

  // Handler for arch selection from popover
  const handleArchSelection = async (arch: "maxillary" | "mandibular" | "both") => {
    if (!pendingProductForArchSelection) return

    setShowArchSelectionPopover(false)
    await proceedWithProductSelection(pendingProductForArchSelection, arch)
    setPendingProductForArchSelection(null)
    setArchSelectionPopoverAnchor(null)
  }

  // Handler for when a missing teeth card is clicked (for fixed restoration flow)
  const handleMissingTeethCardClick = () => {
    setMissingTeethCardClicked(true)
  }

  // Handler for adding upper product
  const handleAddUpperProduct = () => {
    if (!selectedProduct) return
    setSelectedArchForProduct("maxillary")
    setShowMaxillaryChart(true)
    setSelectedProductForMaxillary(selectedProduct)
    // Reset maxillary teeth when starting fresh
    setMaxillaryTeeth([])
    setMaxillaryRetentionTypes({})

    // Scroll to maxillary section after state update
    setTimeout(() => {
      maxillarySectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

  // Handler for adding lower product
  const handleAddLowerProduct = () => {
    if (!selectedProduct) return
    setSelectedArchForProduct("mandibular")
    setShowMandibularChart(true)
    setSelectedProductForMandibular(selectedProduct)
    // Reset mandibular teeth when starting fresh
    setMandibularTeeth([])
    setMandibularRetentionTypes({})

    // Scroll to mandibular section after state update
    setTimeout(() => {
      mandibularSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

  // Handler for deleting upper product
  const handleDeleteUpperProduct = () => {
    setShowMaxillaryChart(false)
    setSelectedProductForMaxillary(null)
    setMaxillaryTeeth([])
    setMaxillaryRetentionTypes({})
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryImplantDetails("")
    setMaxillaryMaterialId(undefined)
    setMaxillaryRetentionId(undefined)
    setMaxillaryRetentionOptionId(undefined)
    setMaxillaryGumShadeId(undefined)
    setMaxillaryShadeId(undefined)
    setMaxillaryStageId(undefined)
    setMaxillaryToothShade("")
    setMaxillaryStage("")
    // If no arch is selected anymore, reset selectedArchForProduct
    if (!showMandibularChart) {
      setSelectedArchForProduct(null)
    }
  }

  // Handler for deleting lower product
  const handleDeleteLowerProduct = () => {
    setShowMandibularChart(false)
    setSelectedProductForMandibular(null)
    setMandibularTeeth([])
    setMandibularRetentionTypes({})
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularStumpShade("")
    setMandibularImplantDetails("")
    setMandibularMaterialId(undefined)
    setMandibularRetentionId(undefined)
    setMandibularRetentionOptionId(undefined)
    setMandibularGumShadeId(undefined)
    setMandibularShadeId(undefined)
    setMandibularStageId(undefined)
    setMandibularToothShade("")
    setMandibularStage("")
    // If no arch is selected anymore, reset selectedArchForProduct
    if (!showMaxillaryChart) {
      setSelectedArchForProduct(null)
    }
  }

  const handleBackToSubcategories = () => {
    setShowProducts(false)
    setShowSubcategories(true)
    setSelectedProduct(null)
    setProducts([])
    // Keep search query for filtering subcategories
  }

  const handleBackToProducts = () => {
    setShowProductDetails(false)
    setShowProducts(true)
    setSelectedProduct(null)
    setMissingTeethCardClicked(false)
    // Reset arch selection state
    setSelectedArchForProduct(null)
    setShowMaxillaryChart(false)
    setShowMandibularChart(false)
    setSelectedProductForMaxillary(null)
    setSelectedProductForMandibular(null)
  }

  const handleBackToCategories = () => {
    resetAllProductState()
    setSearchQuery("") // Clear search when going back to categories
  }

  // Function to format teeth numbers for display
  // Formats consecutive teeth as ranges (e.g., #4–5) and non-consecutive as individual numbers
  // Helper function to format advance field values for notes
  const formatAdvanceFields = (product: SavedProduct, arch: "maxillary" | "mandibular"): string => {
    if (!product.advanceFields || product.advanceFields.length === 0) {
      return ""
    }

    // Get advance field definitions from productDetails
    const fieldDefinitions = product.productDetails?.advance_fields || []
    if (!fieldDefinitions || fieldDefinitions.length === 0) {
      return ""
    }

    const fieldTexts: string[] = []

    product.advanceFields.forEach((savedField) => {
      // Find the field definition
      const fieldDef = fieldDefinitions.find((f: any) => f.id === savedField.advance_field_id)
      if (!fieldDef) return

      const fieldName = fieldDef.name || fieldDef.description || "Advanced Field"
      let fieldValue = ""

      // Handle different field types
      if (savedField.advance_field_value) {
        if (fieldDef.field_type === "dropdown" || fieldDef.field_type === "radio") {
          // For dropdown/radio, find the option name
          const option = fieldDef.options?.find((opt: any) =>
            opt.id === savedField.advance_field_value ||
            opt.name === savedField.advance_field_value ||
            String(opt.id) === String(savedField.advance_field_value)
          )
          fieldValue = option?.name || savedField.advance_field_value
        } else if (fieldDef.field_type === "checkbox") {
          // For checkbox, might have multiple values
          if (Array.isArray(savedField.advance_field_value)) {
            const optionNames = savedField.advance_field_value.map((val: any) => {
              const option = fieldDef.options?.find((opt: any) =>
                opt.id === val || opt.name === val || String(opt.id) === String(val)
              )
              return option?.name || val
            })
            fieldValue = optionNames.join(", ")
          } else {
            fieldValue = savedField.advance_field_value
          }
        } else if (fieldDef.field_type === "file") {
          // For file uploads, show file name if available
          fieldValue = savedField.file?.name || savedField.advance_field_value || "File uploaded"
        } else {
          // For text, textarea, number, etc.
          fieldValue = savedField.advance_field_value
        }
      }

      if (fieldValue) {
        // Include teeth number if specified
        const teethInfo = savedField.teeth_number ? ` (tooth #${savedField.teeth_number})` : ""
        fieldTexts.push(`${fieldName}: ${fieldValue}${teethInfo}`)
      }
    })

    return fieldTexts.length > 0 ? fieldTexts.join("; ") : ""
  }

  const formatTeethNumbers = (teeth: number[]): string => {
    if (teeth.length === 0) return ""
    const sorted = [...teeth].sort((a, b) => a - b)
    if (sorted.length === 1) return `#${sorted[0]}`

    // Group consecutive teeth into ranges
    const ranges: string[] = []
    let rangeStart = sorted[0]
    let rangeEnd = sorted[0]

    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === rangeEnd + 1) {
        // Continue the range
        rangeEnd = sorted[i]
      } else {
        // End the current range and add it to results
        if (rangeStart === rangeEnd) {
          ranges.push(`#${rangeStart}`)
        } else if (rangeEnd === rangeStart + 1) {
          // Only two consecutive teeth, show as individual (e.g., #4, #5)
          ranges.push(`#${rangeStart}, #${rangeEnd}`)
        } else {
          // Three or more consecutive teeth, show as range (e.g., #4–6)
          ranges.push(`#${rangeStart}–${rangeEnd}`)
        }

        // Start a new range
        if (i < sorted.length) {
          rangeStart = sorted[i]
          rangeEnd = sorted[i]
        }
      }
    }

    return ranges.join(", ")
  }

  // Function to parse teeth numbers from text (e.g., "#4, #5" or "teeth #4-5" or "#4–5")
  const parseTeethNumbers = (text: string): number[] => {
    const teeth: number[] = []

    // Handle ranges first (both hyphen and en-dash) like #4-5 or #4–5
    const rangePattern = /#(\d+)\s*[-–]\s*#?(\d+)/g
    let rangeMatch
    while ((rangeMatch = rangePattern.exec(text)) !== null) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= 32) {
            teeth.push(i)
          }
        }
      }
    }

    // Match individual teeth numbers like #4, #5, etc.
    const individualPattern = /#(\d+)(?!\s*[-–])/g
    let match
    while ((match = individualPattern.exec(text)) !== null) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num >= 1 && num <= 32) {
        teeth.push(num)
      }
    }

    // Remove duplicates and sort
    return [...new Set(teeth)].sort((a, b) => a - b)
  }

  // Helpers to get/set case summary content split by arch (for separate Maxillary / Mandibular fields)
  const getCaseSummaryMaxillaryContent = (): string => {
    const notes = maxillaryImplantDetails || ''
    const mandibularIndex = notes.toUpperCase().search(/\n\s*MANDIBULAR\s*\n/)
    if (mandibularIndex === -1) {
      const afterHeader = notes.replace(/^\s*MAXILLARY\s*\n?/i, '')
      return afterHeader.trim()
    }
    const maxillaryPart = notes.slice(0, mandibularIndex).replace(/^\s*MAXILLARY\s*\n?/i, '')
    return maxillaryPart.trim()
  }
  const getCaseSummaryMandibularContent = (): string => {
    const notes = maxillaryImplantDetails || ''
    const mandibularIndex = notes.toUpperCase().search(/\n\s*MANDIBULAR\s*\n/)
    if (mandibularIndex === -1) return ''
    return notes.slice(mandibularIndex).replace(/^\s*MANDIBULAR\s*\n?/i, '').trim()
  }
  const setCaseSummaryFromParts = (maxillaryContent: string, mandibularContent: string) => {
    const combined = [
      'MAXILLARY',
      maxillaryContent,
      '',
      'MANDIBULAR',
      mandibularContent,
    ].filter(Boolean).join('\n\n')
    setMaxillaryImplantDetails(combined)
  }

  // Function to parse case notes and update products, categories, and teeth selections
  const parseCaseNotes = async (notes: string) => {
    // Prevent concurrent parsing
    if (isParsingRef.current) {
      return
    }

    if (!notes.trim()) {
      // Don't clear products if notes are empty - user might be editing
      // Only clear if explicitly intended (e.g., user deletes all content intentionally)
      return
    }

    // Check if notes contain valid product sections before parsing
    const hasValidSections = notes.toUpperCase().includes('MAXILLARY') || notes.toUpperCase().includes('MANDIBULAR')
    if (!hasValidSections) {
      // Notes don't contain valid product sections, preserve existing products
      return
    }

    // Check if notes have actually changed from previous value
    if (notes === previousNotesRef.current) {
      // Notes haven't changed, no need to parse
      return
    }

    // CRITICAL SAFEGUARD: If we have existing products, be VERY conservative about parsing
    // Only parse if notes are clearly a complete replacement (substantial and well-formed)
    if (savedProducts.length > 0) {
      // Require notes to be substantial AND contain clear product indicators
      const hasProductIndicators =
        notes.includes('Fabricate') ||
        notes.includes('fabricate') ||
        notes.includes('Fixed Restoration') ||
        notes.includes('Removable') ||
        notes.includes('Orthodontic')

      // If we have existing products, only parse if:
      // 1. Notes are substantial (>= 150 chars) AND
      // 2. Notes contain clear product indicators AND
      // 3. Notes are significantly different from generated notes (user intentionally edited)
      if (!hasProductIndicators || notes.length < 150) {
        // Don't parse - preserve existing products
        return
      }

      // Additional check: if notes match the generated notes format closely, 
      // user might just be viewing, not replacing
      const generatedNotes = generateCaseNotes()
      if (generatedNotes && notes.trim() === generatedNotes.trim()) {
        // Notes match generated format exactly - don't parse
        return
      }
    }

    isParsingRef.current = true

    const newProducts: SavedProduct[] = []
    const sections = notes.split(/\n\s*\n/) // Split by double newlines
    let currentSection = ""

    for (const section of sections) {
      const lines = section.split('\n').map(l => l.trim()).filter(l => l)
      if (lines.length === 0) continue

      const firstLine = lines[0].toUpperCase()
      if (firstLine.includes('MAXILLARY')) {
        currentSection = "maxillary"
        continue
      } else if (firstLine.includes('MANDIBULAR')) {
        currentSection = "mandibular"
        continue
      }

      if (!currentSection) continue

      // Determine restoration type
      const sectionText = lines.join(' ').toLowerCase()
      const isFixedRestoration = sectionText.includes('fixed restoration')
      const isRemovable = sectionText.includes('removable restoration') || sectionText.includes('removable')
      const isOrthodontic = sectionText.includes('orthodontic') || sectionText.includes('ortho')

      if (isFixedRestoration) {
        // Parse Fixed Restoration
        const fullText = lines.join(' ')

        // Extract product name - look for "fabricate a [product]"
        const productMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^for]+?)\s+for\s+teeth/i)
        const productName = productMatch ? productMatch[1].trim() : "restoration"

        // Extract teeth numbers
        const teethText = fullText.match(/teeth\s+([^in]+?)\s+in/i)?.[1] || fullText.match(/teeth\s+(.+?)(?:\s+in|$)/i)?.[1] || ""
        const teeth = parseTeethNumbers(teethText)

        // Extract stage
        const stageMatch = fullText.match(/in\s+the\s+(\w+)\s+stage/i)
        const stage = stageMatch ? stageMatch[1] : "finish"

        // Extract tooth shade
        const toothShadeMatch = fullText.match(/tooth\s+shade\s+is\s+(?:Vita\s+3D\s+Master\s+)?([A-Z]\d+)/i)
        const toothShade = toothShadeMatch ? toothShadeMatch[1] : "A2"

        // Extract stump shade
        const stumpShadeMatch = fullText.match(/stump\s+shade\s+([A-Z]\d+)/i)
        const stumpShade = stumpShadeMatch ? stumpShadeMatch[1] : "A2"

        // Extract retention
        const retentionMatch = fullText.match(/retention\s+is\s+([^.]+)/i)
        const retention = retentionMatch ? retentionMatch[1].trim() : "cement-retained"

        // Extract implant details if present
        const implantMatch = fullText.match(/implant\s+is\s+(.+?)(?:\.|$)/i)
        const implantDetails = implantMatch ? implantMatch[1].trim() : ""

        // Extract design details
        const ponticMatch = fullText.match(/follow:\s*([^,]+)/i)
        const ponticDesign = ponticMatch ? ponticMatch[1].trim() : "Modified ridge pontic"

        const embrasureMatch = fullText.match(/Type\s+(I{1,3}|[IVX]+)\s+embrasures?/i)
        const embrasure = embrasureMatch ? `Type ${embrasureMatch[1]} embrasures` : "Type II embrasures"

        const occlusalMatch = fullText.match(/(standard|light|heavy)\s+occlusal\s+contact/i)
        const occlusalContact = occlusalMatch ? `${occlusalMatch[1]} occlusal contact` : "standard occlusal contact"

        const proximalMatch = fullText.match(/(open|closed)\s+proximal\s+contact/i)
        const proximalContact = proximalMatch ? `${proximalMatch[1]} proximal contact` : "open proximal contact"

        const gapMatch = fullText.match(/gap:\s*([^,\.]+)/i)
        const gap = gapMatch ? gapMatch[1].trim() : ""

        // Extract impression
        const impressionMatch = fullText.match(/impression\s+used:\s*([^.]+)/i)
        const impression = impressionMatch ? impressionMatch[1].trim() : "STL file"

        // Extract add-ons
        const addOnsMatch = fullText.match(/add-ons?\s+requested:\s*([^.]+)/i)
        const addOns = addOnsMatch ? addOnsMatch[1].trim().split(',').map(a => a.trim()) : []

        // Try to find matching product from available products
        let matchedProduct: Product | null = null
        if (labProducts && Array.isArray(labProducts)) {
          matchedProduct = labProducts.find(p =>
            p.name.toLowerCase().includes(productName.toLowerCase()) ||
            productName.toLowerCase().includes(p.name.toLowerCase())
          ) || null
        }

        // Try to find matching category (default to Fixed Restoration)
        let matchedCategory: ProductCategoryApi | null = null
        if (allCategories && Array.isArray(allCategories)) {
          matchedCategory = allCategories.find(c =>
            c.name.toLowerCase().includes('fixed') ||
            c.name.toLowerCase().includes('restoration')
          ) || allCategories[0] || null
        }

        // Try to find matching subcategory
        let matchedSubcategory: any = null
        if (matchedCategory && matchedCategory.id) {
          // Fetch subcategories for this category if not already loaded
          if (subcategoriesByCategory.length === 0 ||
            !subcategoriesByCategory.some(sc => sc.parent_id === matchedCategory.id)) {
            // For office_admin, use selectedLab.id; for others, use customerId
            const customerIdNum = getCustomerIdForApi()
            await fetchSubcategoriesByCategory(matchedCategory.id, "en", customerIdNum)
          }
          // Find subcategories for this category
          const subcats = subcategoriesByCategory.filter(sc => sc.parent_id === matchedCategory.id)
          matchedSubcategory = subcats && subcats.length > 0 ? subcats[0] : null
        }

        // Create product if we have teeth
        if (teeth.length > 0) {
          const savedProduct: SavedProduct = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            product: matchedProduct || { id: 0, name: productName },
            productDetails: null,
            category: matchedCategory?.name || "Fixed Restoration",
            categoryId: matchedCategory?.id || 0,
            subcategory: matchedSubcategory?.name || "",
            subcategoryId: matchedSubcategory?.id || 0,
            maxillaryTeeth: currentSection === "maxillary" ? teeth : [],
            mandibularTeeth: currentSection === "mandibular" ? teeth : [],
            maxillaryMaterial: currentSection === "maxillary" ? productName : "",
            maxillaryStumpShade: currentSection === "maxillary" ? stumpShade : "",
            maxillaryRetention: currentSection === "maxillary" ? retention : "",
            maxillaryImplantDetails: "",
            mandibularMaterial: currentSection === "mandibular" ? productName : "",
            mandibularRetention: currentSection === "mandibular" ? retention : "",
            mandibularStumpShade: currentSection === "mandibular" ? stumpShade : "",
            mandibularImplantDetails: currentSection === "mandibular" ? implantDetails : "",
            createdAt: Date.now(),
            addedFrom: currentSection as "maxillary" | "mandibular",
            maxillaryStage: currentSection === "maxillary" ? stage : undefined,
            maxillaryToothShade: currentSection === "maxillary" ? toothShade : undefined,
            mandibularStage: currentSection === "mandibular" ? stage : undefined,
            mandibularToothShade: currentSection === "mandibular" ? toothShade : undefined,
            maxillaryPonticDesign: currentSection === "maxillary" ? ponticDesign : undefined,
            maxillaryEmbrasure: currentSection === "maxillary" ? embrasure : undefined,
            maxillaryOcclusalContact: currentSection === "maxillary" ? occlusalContact : undefined,
            maxillaryProximalContact: currentSection === "maxillary" ? proximalContact : undefined,
            maxillaryGap: currentSection === "maxillary" ? gap : undefined,
            maxillaryImpression: currentSection === "maxillary" ? impression : undefined,
            maxillaryAddOns: currentSection === "maxillary" ? addOns : undefined,
            mandibularPonticDesign: currentSection === "mandibular" ? ponticDesign : undefined,
            mandibularEmbrasure: currentSection === "mandibular" ? embrasure : undefined,
            mandibularOcclusalContact: currentSection === "mandibular" ? occlusalContact : undefined,
            mandibularProximalContact: currentSection === "mandibular" ? proximalContact : undefined,
            mandibularGap: currentSection === "mandibular" ? gap : undefined,
            mandibularImpression: currentSection === "mandibular" ? impression : undefined,
            mandibularAddOns: currentSection === "mandibular" ? addOns : undefined,
          }

          newProducts.push(savedProduct)
        }
      } else if (isRemovable) {
        // Parse Removable Restoration (similar pattern)
        const fullText = lines.join(' ')
        const gradeMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^removable]+?)\s+removable/i)
        const grade = gradeMatch ? gradeMatch[1].trim() : "Premium"

        const productMatch = fullText.match(/removable\s+([^replacing]+?)\s+replacing/i)
        const productName = productMatch ? productMatch[1].trim() : "removable restoration"

        const teethText = fullText.match(/replacing\s+teeth\s+([^in]+?)\s+in/i)?.[1] || ""
        const teeth = parseTeethNumbers(teethText)

        const stageMatch = fullText.match(/in\s+the\s+(\w+)\s+stage/i)
        const stage = stageMatch ? stageMatch[1] : "finish"

        // Similar parsing for removable restoration...
        // (Implementation similar to fixed restoration)
      } else if (isOrthodontic) {
        // Parse Orthodontic Restoration
        const fullText = lines.join(' ')
        const productMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^with]+?)\s+with/i)
        const productName = productMatch ? productMatch[1].trim() : "orthodontic appliance"

        const instructionsMatch = fullText.match(/details:\s*(.+)/i)
        const instructions = instructionsMatch ? instructionsMatch[1].trim() : "Standard specifications"

        // Create orthodontic product...
      }
    }

    // Only update saved products if we successfully parsed at least one product
    // This prevents clearing existing products when parsing fails or returns no products
    if (newProducts.length > 0) {
      setSavedProducts(newProducts)

      // Update the first product's details in the form
      const firstProduct = newProducts[0]
      if (firstProduct.categoryId && firstProduct.subcategoryId) {
        setSelectedCategory(firstProduct.category)
        setSelectedCategoryId(firstProduct.categoryId)
        setSelectedSubcategory(firstProduct.subcategory)
        setSelectedSubcategoryId(firstProduct.subcategoryId)

        if (firstProduct.maxillaryTeeth.length > 0) {
          setMaxillaryTeeth(firstProduct.maxillaryTeeth)
        }
        if (firstProduct.mandibularTeeth.length > 0) {
          setMandibularTeeth(firstProduct.mandibularTeeth)
        }
      }

      // Update the previous notes ref only if parsing was successful
      previousNotesRef.current = notes
    }
    // If newProducts.length === 0, preserve existing products (don't clear them)

    isParsingRef.current = false
  }

  // Function to generate case notes based on the formula
  const generateCaseNotes = (): string => {
    if (savedProducts.length === 0) return ""

    let notes = ""

    // Group products by arch (maxillary/mandibular)
    // A product can have both maxillary and mandibular teeth, so we need to handle both
    const maxillaryProducts = savedProducts.filter(p => p.maxillaryTeeth.length > 0)
    const mandibularProducts = savedProducts.filter(p => p.mandibularTeeth.length > 0)

    // MAXILLARY Section
    if (maxillaryProducts.length > 0) {
      notes += "MAXILLARY\n"

      maxillaryProducts.forEach((product, index) => {
        if (index > 0) notes += "\n"

        const categoryName = product.category.toLowerCase()
        const isFixedRestoration = categoryName.includes("fixed") || (!categoryName.includes("removable") && !categoryName.includes("orthodontic"))
        const isRemovable = categoryName.includes("removable")
        const isOrthodontic = categoryName.includes("orthodontic") || categoryName.includes("ortho")

        if (isFixedRestoration) {
          const teeth = formatTeethNumbers(product.maxillaryTeeth)
          const productName = product.product.name || "restoration"
          const stage = product.maxillaryStage || "finish"
          const toothShade = product.maxillaryToothShade || "A2"
          const stumpShade = product.maxillaryStumpShade || "A2"
          const retention = product.maxillaryRetention || "cement-retained"
          const isImplant = retention.toLowerCase().includes("implant") || retention.toLowerCase().includes("screw")

          // Main fabrication line
          notes += `Fabricate ${productName} for ${teeth} in the ${stage} stage, using tooth shade Vita 3D Master ${toothShade} and stump shade ${stumpShade}. Retention: ${retention}.`

          // Show implant details if it's an implant case
          if (isImplant) {
            const brand = product.maxillaryImplantBrand
            const platform = product.maxillaryImplantPlatform
            const size = product.maxillaryImplantSize
            const inclusions = product.maxillaryImplantInclusions
            const abutmentType = product.maxillaryAbutmentType || "custom"
            const abutmentDetail = product.maxillaryAbutmentDetail || "the office"

            if (brand && platform && size && inclusions) {
              notes += ` Implant: ${brand}, ${platform}, ${size}, with ${inclusions}; using a ${abutmentType} abutment provided by ${abutmentDetail}.`
            }
          }

          const ponticDesign = product.maxillaryPonticDesign || "Modified ridge pontic"
          const embrasure = product.maxillaryEmbrasure || "Type II embrasures"
          const contourPonticType = product.maxillaryContourPonticType || "POS pontic design"
          const proximalContact = product.maxillaryProximalContact || "open proximal contact"
          const occlusalContact = product.maxillaryOcclusalContact || "standard occlusal contact"
          const gap = product.maxillaryGap || ""

          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.maxillaryImpressions && product.maxillaryImpressions.length > 0) {
            impressionText = product.maxillaryImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.maxillaryImpression) {
            impressionText = product.maxillaryImpression
          }

          const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
            ? product.maxillaryAddOns.join(", ")
            : "selected"

          // Get advance fields for maxillary
          const advanceFieldsText = formatAdvanceFields(product, "maxillary")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          const gapText = gap ? `, gap: ${gap}` : ""
          notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}${gapText}. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
        } else if (isRemovable) {
          const teeth = formatTeethNumbers(product.maxillaryTeeth)
          const productName = product.product.name || "removable restoration"
          const grade = product.maxillaryMaterial || "Premium"
          const stage = product.maxillaryStage || "finish"
          const teethShade = product.maxillaryToothShade || "A2"
          const gumShade = product.maxillaryStumpShade || "A2"

          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.maxillaryImpressions && product.maxillaryImpressions.length > 0) {
            impressionText = product.maxillaryImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.maxillaryImpression) {
            impressionText = product.maxillaryImpression
          }

          const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
            ? product.maxillaryAddOns.join(", ")
            : "selected"

          // Get advance fields for maxillary
          const advanceFieldsText = formatAdvanceFields(product, "maxillary")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
        } else if (isOrthodontic) {
          const productName = product.product.name || "orthodontic appliance"
          const instructions = product.maxillaryImplantDetails || "Standard specifications"

          notes += `Fabricate a ${productName} with the following details: ${instructions}`
        }
      })

      notes += "\n"
    }

    // MANDIBULAR Section
    if (mandibularProducts.length > 0) {
      notes += "MANDIBULAR\n"

      mandibularProducts.forEach((product, index) => {
        if (index > 0) notes += "\n"

        const categoryName = product.category.toLowerCase()
        const isFixedRestoration = categoryName.includes("fixed") || (!categoryName.includes("removable") && !categoryName.includes("orthodontic"))
        const isRemovable = categoryName.includes("removable")
        const isOrthodontic = categoryName.includes("orthodontic") || categoryName.includes("ortho")

        if (isFixedRestoration) {
          const teeth = formatTeethNumbers(product.mandibularTeeth)
          const productName = product.product.name || "restoration"
          const stage = product.mandibularStage || "finish"
          const toothShade = product.mandibularToothShade || "A2"
          const stumpShade = product.mandibularStumpShade || "A2"
          const retention = product.mandibularRetention || "cement-retained"
          const isImplant = retention.toLowerCase().includes("implant") || retention.toLowerCase().includes("screw")

          notes += `Fabricate ${productName} for ${teeth} in the ${stage} stage, using tooth shade Vita 3D Master ${toothShade} and stump shade ${stumpShade}. Retention: ${retention}.`

          // Show implant details if it's an implant case
          if (isImplant) {
            const brand = product.mandibularImplantBrand
            const platform = product.mandibularImplantPlatform
            const size = product.mandibularImplantSize
            const inclusions = product.mandibularImplantInclusions
            const abutmentType = product.mandibularAbutmentType || "custom"
            const abutmentDetail = product.mandibularAbutmentDetail || "the office"

            if (brand && platform && size && inclusions) {
              notes += ` Implant: ${brand}, ${platform}, ${size}, with ${inclusions}; using a ${abutmentType} abutment provided by ${abutmentDetail}.`
            }
          }

          const ponticDesign = product.mandibularPonticDesign || "Modified ridge pontic"
          const embrasure = product.mandibularEmbrasure || "Type II embrasures"
          const contourPonticType = product.mandibularContourPonticType || "POS pontic design"
          const proximalContact = product.mandibularProximalContact || "open proximal contact"
          const occlusalContact = product.mandibularOcclusalContact || "standard occlusal contact"
          const gap = product.mandibularGap || ""

          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.mandibularImpressions && product.mandibularImpressions.length > 0) {
            impressionText = product.mandibularImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.mandibularImpression) {
            impressionText = product.mandibularImpression
          }

          const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
            ? product.mandibularAddOns.join(", ")
            : "selected"

          // Get advance fields for mandibular
          const advanceFieldsText = formatAdvanceFields(product, "mandibular")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          const gapText = gap ? `, gap: ${gap}` : ""
          notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}${gapText}. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
        } else if (isRemovable) {
          const teeth = formatTeethNumbers(product.mandibularTeeth)
          const productName = product.product.name || "removable restoration"
          const grade = product.mandibularMaterial || "Premium"
          const stage = product.mandibularStage || "finish"
          const teethShade = product.mandibularToothShade || "A2"
          const gumShade = product.mandibularStumpShade || "A2"

          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.mandibularImpressions && product.mandibularImpressions.length > 0) {
            impressionText = product.mandibularImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.mandibularImpression) {
            impressionText = product.mandibularImpression
          }

          const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
            ? product.mandibularAddOns.join(", ")
            : "Selected"

          // Get advance fields for mandibular
          const advanceFieldsText = formatAdvanceFields(product, "mandibular")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
        } else if (isOrthodontic) {
          const productName = product.product.name || "orthodontic appliance"
          const instructions = product.maxillaryImplantDetails || "Standard specifications"

          notes += `Fabricate a ${productName} with the following details: ${instructions}`
        }
      })
    }

    return notes.trim()
  }

  // Initialize maxillaryImplantDetails with generated notes when empty and we have products
  // Also update when products are added or modified
  useEffect(() => {
    if (savedProducts.length > 0) {
      const generatedNotes = generateCaseNotes()
      if (generatedNotes) {
        // Only update if notes are empty or if we're adding the first product
        // This preserves user edits while auto-updating when products change
        if (!maxillaryImplantDetails || savedProducts.length === 1) {
          setMaxillaryImplantDetails(generatedNotes)
        } else {
          // If user has edited notes, only update if the generated notes are significantly different
          // This is a simple check - you might want to make it more sophisticated
          const currentNotesLength = maxillaryImplantDetails.length
          const generatedNotesLength = generatedNotes.length
          // If generated notes are much longer (new product added), update them
          if (generatedNotesLength > currentNotesLength * 1.5) {
            setMaxillaryImplantDetails(generatedNotes)
          }
        }
      }
    }
  }, [savedProducts.length, savedProducts]) // Run when savedProducts change

  // Sync implant form state from Summary Card into matching saved product so values filled
  // before the card hides are preserved when opening the saved accordion
  useEffect(() => {
    if (!selectedProductForMaxillary || !productDetails?.advance_fields || maxillaryTeeth.length === 0 || !implants?.length) return
    const implantField = productDetails.advance_fields.find((f: any) => f.field_type === "implant_library")
    if (!implantField) return
    const fieldKey = `advance_${implantField.id}`
    const brandId = selectedImplantBrand[fieldKey]
    const platformId = selectedImplantPlatform[fieldKey]
    const size = selectedImplantSize[fieldKey]
    const brand = brandId ? implants.find((imp: any) => imp.id === brandId) : null
    const platform = brand && platformId ? (brand.platforms?.find((p: any) => Number(p.id) === Number(platformId)) || selectedImplantPlatformData[fieldKey]) : null
    const platformName = platform && typeof platform === 'object' && 'name' in platform ? platform.name : (platformId ? String(platformId) : undefined)
    const implantDetailsStr = brand && (platformName || platformId) && size
      ? `${brand.brand_name || ""} - ${platformName || platformId || ""} - ${size}`
      : undefined
    setSavedProducts((prev) => {
      const sortedCurrent = [...maxillaryTeeth].sort((a, b) => a - b)
      const matchIndex = prev.findIndex(
        (sp) =>
          sp.addedFrom === "maxillary" &&
          sp.product?.id === selectedProductForMaxillary.id &&
          [...(sp.maxillaryTeeth || [])].sort((a, b) => a - b).join(",") === sortedCurrent.join(",")
      )
      if (matchIndex === -1) return prev
      const existing = prev[matchIndex] as SavedProduct & { maxillaryImplantDetails?: string }
      const brandIdStr = brandId != null ? String(brandId) : undefined
      const hasNewBrand = brandIdStr != null && existing.maxillaryImplantBrand !== brandIdStr
      const hasNewPlatform = (platformName ?? platformId) != null && existing.maxillaryImplantPlatform !== (platformName ?? platformId)
      const hasNewSize = size != null && size !== "" && existing.maxillaryImplantSize !== size
      const hasNewInclusions = maxillaryImplantInclusions != null && maxillaryImplantInclusions !== "" && existing.maxillaryImplantInclusions !== maxillaryImplantInclusions
      const hasNewAbutmentDetail = maxillaryAbutmentDetail != null && maxillaryAbutmentDetail !== "" && existing.maxillaryAbutmentDetail !== maxillaryAbutmentDetail
      const hasNewAbutmentType = maxillaryAbutmentType != null && maxillaryAbutmentType !== "" && existing.maxillaryAbutmentType !== maxillaryAbutmentType
      const hasNewDetails = implantDetailsStr != null && implantDetailsStr !== "" && existing.maxillaryImplantDetails !== implantDetailsStr
      if (!hasNewBrand && !hasNewPlatform && !hasNewSize && !hasNewInclusions && !hasNewAbutmentDetail && !hasNewAbutmentType && !hasNewDetails) return prev
      const updated = [...prev]
      updated[matchIndex] = {
        ...existing,
        ...(brandIdStr != null ? { maxillaryImplantBrand: brandIdStr } : {}),
        ...(platformName != null || platformId != null ? { maxillaryImplantPlatform: platformName ?? (platformId != null ? String(platformId) : undefined) } : {}),
        ...(size != null && size !== "" ? { maxillaryImplantSize: size } : {}),
        ...(implantDetailsStr != null ? { maxillaryImplantDetails: implantDetailsStr } : {}),
        ...(maxillaryImplantInclusions != null && maxillaryImplantInclusions !== "" ? { maxillaryImplantInclusions } : {}),
        ...(maxillaryAbutmentDetail != null && maxillaryAbutmentDetail !== "" ? { maxillaryAbutmentDetail } : {}),
        ...(maxillaryAbutmentType != null && maxillaryAbutmentType !== "" ? { maxillaryAbutmentType } : {}),
      } as SavedProduct
      return updated
    })
  }, [
    selectedProductForMaxillary,
    productDetails?.advance_fields,
    maxillaryTeeth,
    selectedImplantBrand,
    selectedImplantPlatform,
    selectedImplantSize,
    selectedImplantPlatformData,
    maxillaryImplantInclusions,
    maxillaryAbutmentDetail,
    maxillaryAbutmentType,
    implants,
  ])

  // Sync mandibular implant form state from Summary Card into matching saved product
  useEffect(() => {
    if (!selectedProductForMandibular || !productDetails?.advance_fields || mandibularTeeth.length === 0 || !implants?.length) return
    const implantField = productDetails.advance_fields.find((f: any) => f.field_type === "implant_library")
    if (!implantField) return
    const fieldKey = `advance_${implantField.id}`
    const brandId = selectedImplantBrand[fieldKey]
    const platformId = selectedImplantPlatform[fieldKey]
    const size = selectedImplantSize[fieldKey]
    const brand = brandId ? implants.find((imp: any) => imp.id === brandId) : null
    const platform = brand && platformId ? (brand.platforms?.find((p: any) => Number(p.id) === Number(platformId)) || selectedImplantPlatformData[fieldKey]) : null
    const platformName = platform && typeof platform === 'object' && 'name' in platform ? platform.name : (platformId ? String(platformId) : undefined)
    const implantDetailsStr = brand && (platformName || platformId) && size
      ? `${brand.brand_name || ""} - ${platformName || platformId || ""} - ${size}`
      : undefined
    setSavedProducts((prev) => {
      const sortedCurrent = [...mandibularTeeth].sort((a, b) => a - b)
      const matchIndex = prev.findIndex(
        (sp) =>
          sp.addedFrom === "mandibular" &&
          sp.product?.id === selectedProductForMandibular.id &&
          [...(sp.mandibularTeeth || [])].sort((a, b) => a - b).join(",") === sortedCurrent.join(",")
      )
      if (matchIndex === -1) return prev
      const existing = prev[matchIndex]
      const brandIdStr = brandId != null ? String(brandId) : undefined
      const hasNewBrand = brandIdStr != null && existing.mandibularImplantBrand !== brandIdStr
      const hasNewPlatform = (platformName ?? platformId) != null && existing.mandibularImplantPlatform !== (platformName ?? platformId)
      const hasNewSize = size != null && size !== "" && existing.mandibularImplantSize !== size
      const hasNewInclusions = mandibularImplantInclusions != null && mandibularImplantInclusions !== "" && existing.mandibularImplantInclusions !== mandibularImplantInclusions
      const hasNewAbutmentDetail = mandibularAbutmentDetail != null && mandibularAbutmentDetail !== "" && existing.mandibularAbutmentDetail !== mandibularAbutmentDetail
      const hasNewAbutmentType = mandibularAbutmentType != null && mandibularAbutmentType !== "" && existing.mandibularAbutmentType !== mandibularAbutmentType
      const hasNewDetails = implantDetailsStr != null && implantDetailsStr !== "" && existing.mandibularImplantDetails !== implantDetailsStr
      if (!hasNewBrand && !hasNewPlatform && !hasNewSize && !hasNewInclusions && !hasNewAbutmentDetail && !hasNewAbutmentType && !hasNewDetails) return prev
      const updated = [...prev]
      updated[matchIndex] = {
        ...existing,
        ...(brandIdStr != null ? { mandibularImplantBrand: brandIdStr } : {}),
        ...(platformName != null || platformId != null ? { mandibularImplantPlatform: platformName ?? (platformId != null ? String(platformId) : undefined) } : {}),
        ...(size != null && size !== "" ? { mandibularImplantSize: size } : {}),
        ...(implantDetailsStr != null ? { mandibularImplantDetails: implantDetailsStr } : {}),
        ...(mandibularImplantInclusions != null && mandibularImplantInclusions !== "" ? { mandibularImplantInclusions } : {}),
        ...(mandibularAbutmentDetail != null && mandibularAbutmentDetail !== "" ? { mandibularAbutmentDetail } : {}),
        ...(mandibularAbutmentType != null && mandibularAbutmentType !== "" ? { mandibularAbutmentType } : {}),
      } as SavedProduct
      return updated
    })
  }, [
    selectedProductForMandibular,
    productDetails?.advance_fields,
    mandibularTeeth,
    selectedImplantBrand,
    selectedImplantPlatform,
    selectedImplantSize,
    selectedImplantPlatformData,
    mandibularImplantInclusions,
    mandibularAbutmentDetail,
    mandibularAbutmentType,
    implants,
  ])

  // Track if we've auto-added the current product to avoid duplicates
  const autoAddedProductRef = useRef<string | null>(null)

  // Impression selection handlers
  const handleImpressionQuantityUpdate = (impressionKey: string, quantity: number) => {
    setSelectedImpressions(prev => ({
      ...prev,
      [impressionKey]: quantity
    }))
  }

  const handleImpressionRemove = (impressionKey: string) => {
    setSelectedImpressions(prev => {
      const updated = { ...prev }
      delete updated[impressionKey]
      return updated
    })
  }

  // Keep accordion open when shade selection is active - using useMemo to derive accordion state
  const targetAccordionId = useMemo(() => {
    if (currentShadeField) {
      if (currentShadeProductId) return currentShadeProductId
      return currentShadeArch === "maxillary" ? "maxillary-card" : "mandibular-card"
    }
    return null
  }, [currentShadeField, currentShadeArch, currentShadeProductId])

  // Update accordion when target changes, but only if different to prevent loops
  useEffect(() => {
    if (!targetAccordionId || isSettingAccordionRef.current) return
    const isMaxillary = targetAccordionId === "maxillary-card" || savedProducts.some(p => p.id === targetAccordionId && p.addedFrom === "maxillary")
    const current = isMaxillary ? openAccordionMaxillary : openAccordionMandibular
    if (current !== targetAccordionId) {
      isSettingAccordionRef.current = true
      if (isMaxillary) setOpenAccordionMaxillary(targetAccordionId)
      else setOpenAccordionMandibular(targetAccordionId)
      requestAnimationFrame(() => {
        isSettingAccordionRef.current = false
      })
    }
  }, [targetAccordionId, openAccordionMaxillary, openAccordionMandibular, savedProducts])

  const handleShadeSelect = (shadeId: number, shadeName: string, brandId?: number) => {
    if (!currentShadeField) return

    const config = fieldConfigs.find(f => f.key === currentShadeField)
    if (!config) return

    // Update the field with selected shade
    handleFieldChange(currentShadeField, shadeName, shadeId, currentShadeProductId ?? undefined, currentShadeArch)

    // Update brand ID if available
    if (brandId) {
      if (currentShadeArch === "maxillary") {
        if (currentShadeField === "tooth_shade") {
          // Store brand ID for tooth shade
          // You may need to add maxillaryToothShadeBrand state if needed
        } else {
          // Store brand ID for stump shade
          // You may need to add maxillaryGumShadeBrand state if needed
        }
      } else {
        // Similar for mandibular
      }
    }

    // If stump shade is selected, switch to tooth shade selection and reset sticks
    // Keep the container visible, just reset the sticks
    if (currentShadeField === "stump_shade") {
      setCurrentShadeField("tooth_shade")
      setSelectedShadesForSVG([]) // Reset the selected sticks in the SVG, but keep container visible
    } else {
      setShowShadeModal(false)
      setCurrentShadeField(null)
      setCurrentShadeProductId(null)
    }
  }

  const handleShadeClickFromSVG = (shade: string) => {
    if (!currentShadeField) return

    // For stump shade and tooth shade, concatenate shade guide name with shade code
    let shadeValue = shade
    if (currentShadeField === "stump_shade" || currentShadeField === "tooth_shade") {
      shadeValue = `${selectedShadeGuide} - ${shade}`
    }

    // If stump shade is being selected, reset tooth shade for the current arch first
    if (currentShadeField === "stump_shade") {
      if (currentShadeArch === "maxillary") {
        setMaxillaryShadeId(undefined)
        setMaxillaryToothShade("")
      } else {
        setMandibularShadeId(undefined)
        setMandibularToothShade("")
      }
      // Also clear from saved products
      setSavedProducts(prev => prev.map(product => ({
        ...product,
        ...(currentShadeArch === "maxillary"
          ? { maxillaryToothShade: "", maxillaryShadeId: undefined }
          : { mandibularToothShade: "", mandibularShadeId: undefined })
      })))
    }

    // Update the field with selected shade (pass currentShadeProductId when editing a saved product)
    handleFieldChange(currentShadeField, shadeValue, undefined, currentShadeProductId ?? undefined, currentShadeArch)

    // If stump shade is selected, switch to tooth shade selection and reset sticks
    // Keep the container visible, just reset the sticks
    if (currentShadeField === "stump_shade") {
      setCurrentShadeField("tooth_shade")
      setSelectedShadesForSVG([]) // Reset the selected sticks in the SVG, but keep container visible
    } else {
      // Clear the shade selection mode to show teeth again (for tooth_shade)
      setCurrentShadeField(null)
      setCurrentShadeProductId(null)
      setSelectedShadesForSVG([])
    }
  }

  // Helper to get impression selections for a product and arch
  const getImpressionSelections = (productId: string, arch: "maxillary" | "mandibular", impressions: any[]): Array<{ impression_id: number, quantity: number, name?: string }> => {
    const selections: Array<{ impression_id: number, quantity: number, name?: string }> = []
    impressions.forEach(impression => {
      const key = `${productId}_${arch}_${impression.value || impression.name}`
      const quantity = selectedImpressions[key] || 0
      if (quantity > 0) {
        selections.push({
          impression_id: impression.id,
          quantity,
          name: impression.name
        })
      }
    })
    return selections
  }

  // Helper to find default option from API response
  const findDefaultOption = (options: any[]): any | null => {
    if (!options || !Array.isArray(options)) return null
    // Check for is_default === "Yes" or is_default === true
    return options.find((opt: any) =>
      opt.is_default === "Yes" ||
      opt.is_default === true ||
      opt.is_default === "yes"
    ) || null
  }

  // Auto-select default values when productDetails are loaded
  useEffect(() => {
    if (!productDetails || !selectedProduct) return

    // Only auto-select if fields are not already set (to preserve user selections)
    const shouldAutoSelect = (fieldKey: string, arch: "maxillary" | "mandibular"): boolean => {
      const config = fieldConfigs.find(f => f.key === fieldKey)
      if (!config) return false

      const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
      if (!stateKey) return false

      // Check if field is already set
      if (arch === "maxillary") {
        const currentValue = stateKey === "maxillaryMaterial" ? maxillaryMaterial :
          stateKey === "maxillaryRetention" ? maxillaryRetention :
            stateKey === "maxillaryStumpShade" ? maxillaryStumpShade :
              stateKey === "maxillaryToothShade" ? (savedProducts.find(p => p.maxillaryTeeth.length > 0)?.maxillaryToothShade || "") :
                stateKey === "maxillaryStage" ? (savedProducts.find(p => p.maxillaryTeeth.length > 0)?.maxillaryStage || "") : ""
        return !currentValue || currentValue.trim() === ""
      } else {
        const currentValue = stateKey === "mandibularMaterial" ? mandibularMaterial :
          stateKey === "mandibularRetention" ? mandibularRetention :
            stateKey === "mandibularStumpShade" ? mandibularStumpShade :
              stateKey === "mandibularToothShade" ? mandibularToothShade :
                stateKey === "mandibularStage" ? mandibularStage : ""
        return !currentValue || currentValue.trim() === ""
      }
    }

    // Auto-select defaults for maxillary if teeth are selected
    if (maxillaryTeeth.length > 0) {
      fieldConfigs.forEach(config => {
        if (config.maxillaryStateKey && shouldAutoSelect(config.key, "maxillary")) {
          const apiData = productDetails[config.apiProperty]
          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            // For stages, filter by status if it exists, otherwise include all
            // For other fields, filter active options only
            const activeOptions = config.key === "stage"
              ? apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined || !opt.hasOwnProperty("status"))
              : apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined)

            // If only one option, auto-select it
            if (activeOptions.length === 1) {
              const singleOption = activeOptions[0]
              // For retention_options, check if it matches selected retention
              if (config.key === "retention_option") {
                const selectedRetentionId = maxillaryRetentionId ||
                  (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                if (singleOption.retention_id === selectedRetentionId) {
                  handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "maxillary")
                }
              } else {
                handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "maxillary")
              }
            } else {
              // Otherwise, try to find default option
              const defaultOption = findDefaultOption(activeOptions)
              if (defaultOption) {
                // For retention_options, check if it matches selected retention
                if (config.key === "retention_option") {
                  const selectedRetentionId = maxillaryRetentionId ||
                    (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                  if (defaultOption.retention_id === selectedRetentionId) {
                    handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "maxillary")
                  }
                } else {
                  handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "maxillary")
                }
              }
            }
          }
        }
      })
    }

    // Auto-select defaults for mandibular if teeth are selected
    if (mandibularTeeth.length > 0) {
      fieldConfigs.forEach(config => {
        if (config.mandibularStateKey && shouldAutoSelect(config.key, "mandibular")) {
          const apiData = productDetails[config.apiProperty]
          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            // For material field: copy from maxillary if it has a value
            if (config.key === "material" && maxillaryMaterial && maxillaryMaterialId) {
              // Find the same material option in the API data
              const matchingOption = apiData.find((opt: any) =>
                opt.id === maxillaryMaterialId || opt.name === maxillaryMaterial
              )
              if (matchingOption) {
                handleFieldChange(config.key, matchingOption.name, matchingOption.id, undefined, "mandibular")
                return // Skip the default auto-select logic for material
              }
            }

            // For stages, filter by status if it exists, otherwise include all
            // For other fields, filter active options only
            const activeOptions = config.key === "stage"
              ? apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined || !opt.hasOwnProperty("status"))
              : apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined)

            // If only one option, auto-select it
            if (activeOptions.length === 1) {
              const singleOption = activeOptions[0]
              // For retention_options, check if it matches selected retention
              if (config.key === "retention_option") {
                const selectedRetentionId = mandibularRetentionId ||
                  (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                if (singleOption.retention_id === selectedRetentionId) {
                  handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "mandibular")
                }
              } else {
                handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "mandibular")
              }
            } else {
              // Otherwise, try to find default option
              const defaultOption = findDefaultOption(activeOptions)
              if (defaultOption) {
                // For retention_options, check if it matches selected retention
                if (config.key === "retention_option") {
                  const selectedRetentionId = mandibularRetentionId ||
                    (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                  if (defaultOption.retention_id === selectedRetentionId) {
                    handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "mandibular")
                  }
                } else {
                  handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "mandibular")
                }
              }
            }
          }
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetails?.id, maxillaryTeeth.length, mandibularTeeth.length]) // Run when productDetails ID or teeth selections change

  // Auto-open stage dropdown when stage field becomes visible and value is "Not specified"
  useEffect(() => {
    // Check all saved products
    savedProducts.forEach((savedProduct) => {
      const productDetails = savedProduct.productDetails
      if (productDetails?.stages && Array.isArray(productDetails.stages) && productDetails.stages.length > 0) {
        // Helper to check if value is "Not specified" or empty
        const isNotSpecified = (value: string | undefined | null): boolean => {
          if (!value) return true
          const trimmed = String(value).trim().toLowerCase()
          return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
        }

        // Check maxillary
        const isMaxillaryVisible = isAccordionFieldVisible("stage", savedProduct, "maxillary")
        const maxillaryStageValue = savedProduct.maxillaryStage
        const shouldOpenMaxillary = isMaxillaryVisible && isNotSpecified(maxillaryStageValue) &&
          savedProduct.addedFrom === "maxillary" && openAccordionMaxillary === savedProduct.id

        // Check mandibular
        const isMandibularVisible = isAccordionFieldVisible("stage", savedProduct, "mandibular")
        const mandibularStageValue = savedProduct.mandibularStage
        const shouldOpenMandibular = isMandibularVisible && isNotSpecified(mandibularStageValue) &&
          savedProduct.addedFrom === "mandibular" && openAccordionMandibular === savedProduct.id

        if (shouldOpenMaxillary || shouldOpenMandibular) {
          setOpenStageDropdown((prev) => {
            const currentState = prev[savedProduct.id]
            // Only update if state needs to change
            if ((shouldOpenMaxillary && !currentState?.maxillary) || (shouldOpenMandibular && !currentState?.mandibular)) {
              return {
                ...prev,
                [savedProduct.id]: {
                  ...currentState,
                  ...(shouldOpenMaxillary && { maxillary: true }),
                  ...(shouldOpenMandibular && { mandibular: true })
                }
              }
            }
            return prev
          })
        }
      }
    })

    // Check unsaved products (maxillary-card and mandibular-card)
    if (openAccordionMaxillary === "maxillary-card" || openAccordionMandibular === "mandibular-card") {
      if (openAccordionMaxillary === "maxillary-card") {
        const stageValue = maxillaryStage
        const toothShade = maxillaryToothShade
        const isNotSpecified = (value: string | undefined | null): boolean => {
          if (!value) return true
          const trimmed = String(value).trim().toLowerCase()
          return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
        }
        const isStageVisible = toothShade && toothShade.trim() !== "" && toothShade.trim().toLowerCase() !== "not specified"
        if (isStageVisible && isNotSpecified(stageValue) && productDetails?.stages && Array.isArray(productDetails.stages) && productDetails.stages.length > 0) {
          setOpenStageDropdown((prev) => {
            const currentState = prev["maxillary-card"]
            if (!currentState?.maxillary) {
              return { ...prev, "maxillary-card": { ...currentState, maxillary: true } }
            }
            return prev
          })
        }
      }
      if (openAccordionMandibular === "mandibular-card") {
        const stageValue = mandibularStage
        const toothShade = mandibularToothShade
        const isNotSpecified = (value: string | undefined | null): boolean => {
          if (!value) return true
          const trimmed = String(value).trim().toLowerCase()
          return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
        }
        const isStageVisible = toothShade && toothShade.trim() !== "" && toothShade.trim().toLowerCase() !== "not specified"
        if (isStageVisible && isNotSpecified(stageValue) && productDetails?.stages && Array.isArray(productDetails.stages) && productDetails.stages.length > 0) {
          setOpenStageDropdown((prev) => {
            const currentState = prev["mandibular-card"]
            if (!currentState?.mandibular) {
              return { ...prev, "mandibular-card": { ...currentState, mandibular: true } }
            }
            return prev
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedProducts, openAccordionMaxillary, openAccordionMandibular, maxillaryStage, mandibularStage, maxillaryToothShade, mandibularToothShade, productDetails])

  // Auto-save unified product for both arches - creates ONE product instead of separate ones
  const handleAutoSaveUnifiedProduct = () => {
    // Use the selected product (prefer maxillary if both are available, otherwise use selectedProduct)
    const productToUse = selectedProductForMaxillary || selectedProductForMandibular || selectedProduct

    if (!productToUse) {
      return
    }

    // Validate that we have at least one arch with teeth selected
    if (maxillaryTeeth.length === 0 && mandibularTeeth.length === 0) {
      return
    }

    // Validate category and subcategory
    if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
      return
    }

    // Auto-populate product name and retention type if not already set
    const finalMaxillaryMaterial = maxillaryMaterial || (maxillaryTeeth.length > 0 ? productToUse.name : "")
    const finalMandibularMaterial = mandibularMaterial || (mandibularTeeth.length > 0 ? productToUse.name : "")
    const finalMaxillaryRetention = maxillaryRetention
    const finalMandibularRetention = mandibularRetention

    // Determine addedFrom based on which arch has teeth (prefer maxillary if both)
    const addedFrom: "maxillary" | "mandibular" = maxillaryTeeth.length > 0 ? "maxillary" : "mandibular"

    // Update existing product or add new one using functional update to get latest state
    setSavedProducts((prevProducts) => {
      // Helper function to check if product should be updated (same product, category, subcategory, and arch)
      // This does NOT require exact teeth match - we want to UPDATE the teeth array
      const shouldUpdateProduct = (existingProduct: SavedProduct): boolean => {
        const sameProduct = existingProduct.product.id === productToUse.id
        const sameCategory = existingProduct.categoryId === selectedCategoryId
        const sameSubcategory = existingProduct.subcategoryId === selectedSubcategoryId
        const sameArch = existingProduct.addedFrom === addedFrom

        return sameProduct && sameCategory && sameSubcategory && sameArch
      }

      // Helper function to check if two products are exact duplicates (for deduplication)
      const areProductsDuplicate = (p1: SavedProduct, p2: SavedProduct): boolean => {
        const sameProduct = p1.product.id === p2.product.id
        const sameCategory = p1.categoryId === p2.categoryId
        const sameSubcategory = p1.subcategoryId === p2.subcategoryId
        const sameArch = p1.addedFrom === p2.addedFrom

        // Check if teeth arrays are the same (sorted for comparison)
        const p1MaxTeeth = [...(p1.maxillaryTeeth || [])].sort().join(',')
        const p2MaxTeeth = [...(p2.maxillaryTeeth || [])].sort().join(',')
        const p1MandTeeth = [...(p1.mandibularTeeth || [])].sort().join(',')
        const p2MandTeeth = [...(p2.mandibularTeeth || [])].sort().join(',')

        const sameMaxTeeth = p1MaxTeeth === p2MaxTeeth
        const sameMandTeeth = p1MandTeeth === p2MandTeeth

        return sameProduct && sameCategory && sameSubcategory && sameArch && sameMaxTeeth && sameMandTeeth
      }

      // First, remove any existing duplicates from prevProducts (keep the first occurrence of each unique product)
      const deduplicatedProducts: SavedProduct[] = []
      const seenProducts = new Set<string>()

      prevProducts.forEach((product) => {
        const productKey = `${product.product.id}-${product.categoryId}-${product.subcategoryId}-${product.addedFrom}-${[...(product.maxillaryTeeth || [])].sort().join(',')}-${[...(product.mandibularTeeth || [])].sort().join(',')}`

        if (!seenProducts.has(productKey)) {
          seenProducts.add(productKey)
          deduplicatedProducts.push(product)
        }
      })

      // Find existing product to update - match by product, category, subcategory, and arch (NOT by exact teeth)
      // This ensures clicking a new tooth updates the existing product rather than creating a new one
      const existingIndex = deduplicatedProducts.findIndex(p => shouldUpdateProduct(p))

      // Get impression selections for this product
      const productId = existingIndex !== -1 ? deduplicatedProducts[existingIndex].id : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const impressions = productDetails?.impressions || []
      const maxillaryImpressions = maxillaryTeeth.length > 0
        ? getImpressionSelections(productId, "maxillary", impressions)
        : []
      const mandibularImpressions = mandibularTeeth.length > 0
        ? getImpressionSelections(productId, "mandibular", impressions)
        : []

      // Create saved product configuration with both arches' data
      const savedProduct: SavedProduct = {
        id: productId,
        product: productToUse,
        productDetails: productDetails,
        category: selectedCategory,
        categoryId: selectedCategoryId,
        subcategory: selectedSubcategory,
        subcategoryId: selectedSubcategoryId,
        maxillaryTeeth: [...maxillaryTeeth],
        mandibularTeeth: [...mandibularTeeth],
        maxillaryMaterial: finalMaxillaryMaterial,
        maxillaryStumpShade,
        maxillaryRetention: finalMaxillaryRetention,
        maxillaryNotes: "",
        mandibularMaterial: finalMandibularMaterial,
        mandibularRetention: finalMandibularRetention,
        mandibularStumpShade,
        mandibularImplantDetails: "",
        createdAt: existingIndex !== -1 ? deduplicatedProducts[existingIndex].createdAt : Date.now(),
        addedFrom: addedFrom,
        maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
        mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
        // Include ID fields and additional fields for both arches
        maxillaryMaterialId: maxillaryMaterialId,
        maxillaryRetentionId: maxillaryRetentionId,
        maxillaryRetentionOptionId: maxillaryRetentionOptionId,
        maxillaryGumShadeId: maxillaryGumShadeId,
        maxillaryShadeId: maxillaryShadeId,
        maxillaryStageId: maxillaryStageId,
        maxillaryToothShade: maxillaryToothShade,
        maxillaryStage: maxillaryStage,
        mandibularMaterialId: mandibularMaterialId,
        mandibularRetentionId: mandibularRetentionId,
        mandibularRetentionOptionId: mandibularRetentionOptionId,
        mandibularGumShadeId: mandibularGumShadeId,
        mandibularShadeId: mandibularShadeId,
        mandibularStageId: mandibularStageId,
        mandibularToothShade: mandibularToothShade,
        mandibularStage: mandibularStage,
        // Include advance fields if any are set
        advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
          ? productDetails.advance_fields
            .map((field: any) => {
              const fieldKey = `advance_${field.id}`
              const value = advanceFieldValues[fieldKey]
              if (value) {
                const fieldData: any = {
                  advance_field_id: field.id,
                  advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                  teeth_number: null,
                }

                if (typeof value === "object" && value.option_id) {
                  fieldData.option_id = value.option_id
                }

                if (typeof value === "object" && Array.isArray(value.option_ids)) {
                  fieldData.option_ids = value.option_ids
                }

                if (typeof value === "object" && value.file) {
                  fieldData.file = value.file
                }

                return fieldData
              }
              return null
            })
            .filter((field: any) => field !== null)
          : undefined,
        // Extract and save implant details only when retention is Implant (maxillary)
        ...(() => {
          const hasImplantRetention = maxillaryRetention && String(maxillaryRetention).toLowerCase().includes("implant")
          const implantField = productDetails?.advance_fields?.find((field: any) => field.field_type === "implant_library")
          if (implantField && maxillaryTeeth.length > 0 && hasImplantRetention) {
            const fieldKey = `advance_${implantField.id}`
            const brandId = selectedImplantBrand[fieldKey]
            const platformId = selectedImplantPlatform[fieldKey]
            const size = selectedImplantSize[fieldKey]

            let platformName: string | undefined = undefined
            const brand = brandId ? implants.find((imp: any) => imp.id === brandId) : null
            if (brandId && platformId && brand) {
              const platform = brand.platforms?.find((p: any) => Number(p.id) === Number(platformId))
              platformName = platform?.name
            }

            const implantDetailsStr = brand && (platformName || platformId) && size
              ? `${brand.brand_name || ""} - ${platformName || platformId || ""} - ${size}`
              : maxillaryImplantDetails || undefined

            return {
              maxillaryImplantBrand: brandId || undefined,
              maxillaryImplantPlatform: platformName || (platformId ? String(platformId) : undefined),
              maxillaryImplantSize: size || undefined,
              maxillaryImplantInclusions: maxillaryImplantInclusions || undefined,
              maxillaryAbutmentDetail: maxillaryAbutmentDetail || undefined,
              maxillaryAbutmentType: maxillaryAbutmentType || undefined,
              maxillaryImplantDetails: implantDetailsStr,
            }
          }
          return {}
        })(),
        // Extract and save implant details only when retention is Implant (mandibular)
        ...(() => {
          const hasImplantRetention = mandibularRetention && String(mandibularRetention).toLowerCase().includes("implant")
          const implantField = productDetails?.advance_fields?.find((field: any) => field.field_type === "implant_library")
          if (implantField && mandibularTeeth.length > 0 && hasImplantRetention) {
            const fieldKey = `advance_${implantField.id}`
            const brandId = selectedImplantBrand[fieldKey]
            const platformId = selectedImplantPlatform[fieldKey]
            const size = selectedImplantSize[fieldKey]

            let platformName: string | undefined = undefined
            const brand = brandId ? implants.find((imp: any) => imp.id === brandId) : null
            if (brandId && platformId && brand) {
              const platform = brand.platforms?.find((p: any) => Number(p.id) === Number(platformId))
              platformName = platform?.name
            }

            const implantDetailsStr = brand && (platformName || platformId) && size
              ? `${brand.brand_name || ""} - ${platformName || platformId || ""} - ${size}`
              : mandibularImplantDetails || undefined

            return {
              mandibularImplantBrand: brandId || undefined,
              mandibularImplantPlatform: platformName || (platformId ? String(platformId) : undefined),
              mandibularImplantSize: size || undefined,
              mandibularImplantInclusions: mandibularImplantInclusions || undefined,
              mandibularAbutmentDetail: mandibularAbutmentDetail || undefined,
              mandibularAbutmentType: mandibularAbutmentType || undefined,
              mandibularImplantDetails: implantDetailsStr,
            }
          }
          return {}
        })(),
      }

      // If both material and retention are set for either arch, show advance fields and fetch them
      if ((finalMaxillaryMaterial && finalMaxillaryRetention) ||
        (finalMandibularMaterial && finalMandibularRetention)) {
        setShowAdvanceFields(prev => ({ ...prev, [savedProduct.id]: true }))

        if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
          setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: productDetails.advance_fields }))
        } else if (productToUse?.id) {
          const fetchAdvanceFields = async () => {
            try {
              const labId = selectedLab?.id || selectedLab?.customer_id
              const details = await fetchProductDetails(productToUse.id, labId)
              if (details?.advance_fields && Array.isArray(details.advance_fields)) {
                setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: details.advance_fields }))
              }
            } catch (error) {
              console.error("Error fetching advance fields:", error)
            }
          }
          fetchAdvanceFields()
        }
      }

      // ALWAYS update existing product if found, otherwise add new one
      // This prevents duplicates - we update the first accordion instead of creating new ones
      if (existingIndex !== -1) {
        // Update existing product with unified data (merge with existing data to preserve any fields)
        const updated = [...deduplicatedProducts]
        const existingProduct = deduplicatedProducts[existingIndex]

        // Replace teeth arrays with current selection (not merge)
        // This ensures deselecting a tooth actually removes it from the saved product
        const mergedMaxTeeth = [...maxillaryTeeth].sort()
        const mergedMandTeeth = [...mandibularTeeth].sort()

        // Merge existing product data with new data, preserving existing values where new ones are empty
        const mergedProduct: SavedProduct = {
          ...existingProduct,
          ...savedProduct,
          // Use merged teeth arrays
          maxillaryTeeth: mergedMaxTeeth,
          mandibularTeeth: mergedMandTeeth,
          // Preserve existing material if new one is empty
          maxillaryMaterial: savedProduct.maxillaryMaterial || existingProduct.maxillaryMaterial,
          mandibularMaterial: savedProduct.mandibularMaterial || existingProduct.mandibularMaterial,
          // Preserve existing retention if new one is empty
          maxillaryRetention: savedProduct.maxillaryRetention || existingProduct.maxillaryRetention,
          mandibularRetention: savedProduct.mandibularRetention || existingProduct.mandibularRetention,
          // Preserve existing stage, stump shade, and tooth shade if new ones are empty
          maxillaryStage: savedProduct.maxillaryStage || existingProduct.maxillaryStage,
          mandibularStage: savedProduct.mandibularStage || existingProduct.mandibularStage,
          maxillaryStumpShade: savedProduct.maxillaryStumpShade || existingProduct.maxillaryStumpShade,
          mandibularStumpShade: savedProduct.mandibularStumpShade || existingProduct.mandibularStumpShade,
          maxillaryToothShade: savedProduct.maxillaryToothShade || existingProduct.maxillaryToothShade,
          mandibularToothShade: savedProduct.mandibularToothShade || existingProduct.mandibularToothShade,
          // Preserve implant detail fields: keep existing when incoming is empty so ImplantDetailForm values are not wiped
          maxillaryImplantBrand: savedProduct.maxillaryImplantBrand ?? existingProduct.maxillaryImplantBrand,
          maxillaryImplantPlatform: savedProduct.maxillaryImplantPlatform ?? existingProduct.maxillaryImplantPlatform,
          maxillaryImplantSize: savedProduct.maxillaryImplantSize ?? existingProduct.maxillaryImplantSize,
          maxillaryImplantInclusions: savedProduct.maxillaryImplantInclusions || existingProduct.maxillaryImplantInclusions,
          maxillaryAbutmentDetail: savedProduct.maxillaryAbutmentDetail || existingProduct.maxillaryAbutmentDetail,
          maxillaryAbutmentType: savedProduct.maxillaryAbutmentType || existingProduct.maxillaryAbutmentType,
          maxillaryImplantDetails: savedProduct.maxillaryImplantDetails || existingProduct.maxillaryImplantDetails,
          mandibularImplantBrand: savedProduct.mandibularImplantBrand ?? existingProduct.mandibularImplantBrand,
          mandibularImplantPlatform: savedProduct.mandibularImplantPlatform ?? existingProduct.mandibularImplantPlatform,
          mandibularImplantSize: savedProduct.mandibularImplantSize ?? existingProduct.mandibularImplantSize,
          mandibularImplantInclusions: savedProduct.mandibularImplantInclusions || existingProduct.mandibularImplantInclusions,
          mandibularAbutmentDetail: savedProduct.mandibularAbutmentDetail || existingProduct.mandibularAbutmentDetail,
          mandibularAbutmentType: savedProduct.mandibularAbutmentType || existingProduct.mandibularAbutmentType,
          mandibularImplantDetails: savedProduct.mandibularImplantDetails || existingProduct.mandibularImplantDetails,
          // Preserve IDs as well
          maxillaryStageId: savedProduct.maxillaryStageId || existingProduct.maxillaryStageId,
          mandibularStageId: savedProduct.mandibularStageId || existingProduct.mandibularStageId,
          maxillaryGumShadeId: savedProduct.maxillaryGumShadeId || existingProduct.maxillaryGumShadeId,
          mandibularGumShadeId: savedProduct.mandibularGumShadeId || existingProduct.mandibularGumShadeId,
          maxillaryShadeId: savedProduct.maxillaryShadeId || existingProduct.maxillaryShadeId,
          mandibularShadeId: savedProduct.mandibularShadeId || existingProduct.mandibularShadeId,
          // Preserve productDetails
          productDetails: savedProduct.productDetails || existingProduct.productDetails,
        }
        updated[existingIndex] = mergedProduct
        return updated
      } else {
        // Only add new product if no existing product found with same product ID, category, subcategory, and overlapping teeth
        return [...deduplicatedProducts, savedProduct]
      }
    })

    // Update case summary notes when product is auto-saved
    const updatedNotes = generateCaseNotes()
    if (updatedNotes) {
      setMaxillaryImplantDetails(updatedNotes)
    }
  }

  // Auto-save product without resetting form - keeps user on current product details
  const handleAutoSaveProduct = (type: "maxillary" | "mandibular") => {
    // Use the appropriate product based on arch selection
    const productToUse = type === "maxillary" ? selectedProductForMaxillary : selectedProductForMandibular

    // Validate that we have a product selected for this arch
    if (!productToUse) {
      return
    }

    // Validate that we have teeth selected for the specified type
    const teethForType = type === "maxillary" ? maxillaryTeeth : mandibularTeeth
    if (teethForType.length === 0) {
      return
    }

    // Validate category and subcategory
    if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
      return
    }

    // Create a unique key that includes the arch type and teeth
    const teethForTypeSorted = [...teethForType].sort()
    const currentProductKey = `${productToUse.id}-${selectedCategoryId}-${selectedSubcategoryId}-${type}-${JSON.stringify(teethForTypeSorted)}`

    // Mark that we're processing this product configuration
    autoAddedProductRef.current = currentProductKey

    // Auto-populate product name and retention type if not already set
    const finalMaxillaryMaterial = maxillaryMaterial || (type === "maxillary" ? productToUse.name : "")
    const finalMandibularMaterial = mandibularMaterial || (type === "mandibular" ? productToUse.name : "")
    const finalMaxillaryRetention = maxillaryRetention
    const finalMandibularRetention = mandibularRetention

    // Update existing product or add new one using functional update to get latest state
    setSavedProducts((prevProducts) => {
      // Helper function to check if two products are duplicates
      const areProductsDuplicate = (p1: SavedProduct, p2: SavedProduct): boolean => {
        const sameProduct = p1.product.id === p2.product.id
        const sameCategory = p1.categoryId === p2.categoryId
        const sameSubcategory = p1.subcategoryId === p2.subcategoryId

        // Check if teeth arrays are the same (sorted for comparison)
        const p1MaxTeeth = [...(p1.maxillaryTeeth || [])].sort().join(',')
        const p2MaxTeeth = [...(p2.maxillaryTeeth || [])].sort().join(',')
        const p1MandTeeth = [...(p1.mandibularTeeth || [])].sort().join(',')
        const p2MandTeeth = [...(p2.mandibularTeeth || [])].sort().join(',')

        const sameMaxTeeth = p1MaxTeeth === p2MaxTeeth
        const sameMandTeeth = p1MandTeeth === p2MandTeeth

        return sameProduct && sameCategory && sameSubcategory && sameMaxTeeth && sameMandTeeth
      }

      // First, remove any existing duplicates from prevProducts (keep the first occurrence of each unique product)
      const deduplicatedProducts: SavedProduct[] = []
      const seenProducts = new Set<string>()

      prevProducts.forEach((product) => {
        const productKey = `${product.product.id}-${product.categoryId}-${product.subcategoryId}-${[...(product.maxillaryTeeth || [])].sort().join(',')}-${[...(product.mandibularTeeth || [])].sort().join(',')}`

        if (!seenProducts.has(productKey)) {
          seenProducts.add(productKey)
          deduplicatedProducts.push(product)
        }
      })

      // Find existing product with the same configuration (product, category, subcategory, arch)
      // Note: We do NOT require exact teeth match - we want to UPDATE the existing product with new teeth
      const existingIndex = deduplicatedProducts.findIndex(p => {
        // Check basic matching criteria - match by product, category, subcategory, and arch only
        return p.product.id === productToUse.id &&
          p.categoryId === selectedCategoryId &&
          p.subcategoryId === selectedSubcategoryId &&
          p.addedFrom === type
      })

      // If we found an existing product with the same configuration, update it instead of adding a duplicate
      if (existingIndex !== -1) {
        const existingProduct = deduplicatedProducts[existingIndex]
        // Check if the existing product needs updating (compare all relevant fields)
        const needsUpdate =
          existingProduct.maxillaryMaterial !== (type === "maxillary" ? finalMaxillaryMaterial : existingProduct.maxillaryMaterial) ||
          existingProduct.mandibularMaterial !== (type === "mandibular" ? finalMandibularMaterial : existingProduct.mandibularMaterial) ||
          existingProduct.maxillaryRetention !== (type === "maxillary" ? finalMaxillaryRetention : existingProduct.maxillaryRetention) ||
          existingProduct.mandibularRetention !== (type === "mandibular" ? finalMandibularRetention : existingProduct.mandibularRetention) ||
          existingProduct.maxillaryStumpShade !== (type === "maxillary" ? maxillaryStumpShade : existingProduct.maxillaryStumpShade) ||
          existingProduct.mandibularStumpShade !== (type === "mandibular" ? mandibularStumpShade : existingProduct.mandibularStumpShade) ||
          existingProduct.maxillaryToothShade !== (type === "maxillary" ? maxillaryToothShade : existingProduct.maxillaryToothShade) ||
          existingProduct.mandibularToothShade !== (type === "mandibular" ? mandibularToothShade : existingProduct.mandibularToothShade) ||
          existingProduct.maxillaryStage !== (type === "maxillary" ? maxillaryStage : existingProduct.maxillaryStage) ||
          existingProduct.mandibularStage !== (type === "mandibular" ? mandibularStage : existingProduct.mandibularStage)

        // If no changes needed, return deduplicated array to prevent unnecessary updates
        if (!needsUpdate) {
          return deduplicatedProducts
        }
      }

      // Get impression selections for this product
      const productId = existingIndex !== -1 ? deduplicatedProducts[existingIndex].id : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const impressions = productDetails?.impressions || []
      const maxillaryImpressions = type === "maxillary"
        ? getImpressionSelections(productId, "maxillary", impressions)
        : []
      const mandibularImpressions = type === "mandibular"
        ? getImpressionSelections(productId, "mandibular", impressions)
        : []

      // Create saved product configuration
      const savedProduct: SavedProduct = {
        id: productId,
        product: productToUse,
        productDetails: productDetails,
        category: selectedCategory,
        categoryId: selectedCategoryId,
        subcategory: selectedSubcategory,
        subcategoryId: selectedSubcategoryId,
        maxillaryTeeth: [...maxillaryTeeth],
        mandibularTeeth: [...mandibularTeeth],
        maxillaryMaterial: finalMaxillaryMaterial,
        maxillaryStumpShade,
        maxillaryRetention: finalMaxillaryRetention,
        maxillaryImplantDetails,
        mandibularMaterial: finalMandibularMaterial,
        mandibularRetention: finalMandibularRetention,
        mandibularImplantDetails,
        createdAt: existingIndex !== -1 ? deduplicatedProducts[existingIndex].createdAt : Date.now(),
        addedFrom: type,
        maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
        mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
        // Include ID fields and additional fields
        maxillaryMaterialId: type === "maxillary" ? maxillaryMaterialId : undefined,
        maxillaryRetentionId: type === "maxillary" ? maxillaryRetentionId : undefined,
        maxillaryRetentionOptionId: type === "maxillary" ? maxillaryRetentionOptionId : undefined,
        maxillaryGumShadeId: type === "maxillary" ? maxillaryGumShadeId : undefined,
        maxillaryShadeId: type === "maxillary" ? maxillaryShadeId : undefined,
        maxillaryStageId: type === "maxillary" ? maxillaryStageId : undefined,
        maxillaryToothShade: type === "maxillary" ? maxillaryToothShade : undefined,
        maxillaryStage: type === "maxillary" ? maxillaryStage : undefined,
        mandibularMaterialId: type === "mandibular" ? mandibularMaterialId : undefined,
        mandibularRetentionId: type === "mandibular" ? mandibularRetentionId : undefined,
        mandibularRetentionOptionId: type === "mandibular" ? mandibularRetentionOptionId : undefined,
        mandibularGumShadeId: type === "mandibular" ? mandibularGumShadeId : undefined,
        mandibularShadeId: type === "mandibular" ? mandibularShadeId : undefined,
        mandibularStageId: type === "mandibular" ? mandibularStageId : undefined,
        mandibularToothShade: type === "mandibular" ? mandibularToothShade : undefined,
        mandibularStage: type === "mandibular" ? mandibularStage : undefined,
        // Include advance fields if any are set
        advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
          ? productDetails.advance_fields
            .map((field: any) => {
              const fieldKey = `advance_${field.id}`
              const value = advanceFieldValues[fieldKey]
              if (value) {
                const fieldData: any = {
                  advance_field_id: field.id,
                  advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                  teeth_number: null,
                }

                if (typeof value === "object" && value.option_id) {
                  fieldData.option_id = value.option_id
                }

                if (typeof value === "object" && Array.isArray(value.option_ids)) {
                  fieldData.option_ids = value.option_ids
                }

                if (typeof value === "object" && value.file) {
                  fieldData.file = value.file
                }

                return fieldData
              }
              return null
            })
            .filter((field: any) => field !== null)
          : undefined,
        // Extract and save implant details from advance fields only when retention is Implant
        ...(type === "maxillary" ? (() => {
          const hasImplantRetention = finalMaxillaryRetention && String(finalMaxillaryRetention).toLowerCase().includes("implant")
          const implantField = productDetails?.advance_fields?.find((field: any) => field.field_type === "implant_library")
          if (implantField && hasImplantRetention) {
            const fieldKey = `advance_${implantField.id}`
            const brandId = selectedImplantBrand[fieldKey]
            const platformId = selectedImplantPlatform[fieldKey]
            const size = selectedImplantSize[fieldKey]

            let platformName: string | undefined = undefined
            const brand = brandId ? implants.find((imp: any) => imp.id === brandId) : null
            if (brandId && platformId && brand) {
              const platform = brand.platforms?.find((p: any) => Number(p.id) === Number(platformId))
              platformName = platform?.name
            }

            const implantDetailsStr = brand && (platformName || platformId) && size
              ? `${brand.brand_name || ""} - ${platformName || platformId || ""} - ${size}`
              : maxillaryImplantDetails || undefined

            return {
              maxillaryImplantBrand: brandId || undefined,
              maxillaryImplantPlatform: platformName || (platformId ? String(platformId) : undefined),
              maxillaryImplantSize: size || undefined,
              maxillaryImplantInclusions: maxillaryImplantInclusions || undefined,
              maxillaryAbutmentDetail: maxillaryAbutmentDetail || undefined,
              maxillaryAbutmentType: maxillaryAbutmentType || undefined,
              maxillaryImplantDetails: implantDetailsStr,
            }
          }
          return {}
        })() : {}),
        // Extract and save implant details for mandibular when retention is Implant
        ...(type === "mandibular" ? (() => {
          const hasImplantRetention = finalMandibularRetention && String(finalMandibularRetention).toLowerCase().includes("implant")
          const implantField = productDetails?.advance_fields?.find((field: any) => field.field_type === "implant_library")
          if (implantField && hasImplantRetention) {
            const fieldKey = `advance_${implantField.id}`
            const brandId = selectedImplantBrand[fieldKey]
            const platformId = selectedImplantPlatform[fieldKey]
            const size = selectedImplantSize[fieldKey]

            let platformName: string | undefined = undefined
            const brand = brandId ? implants.find((imp: any) => imp.id === brandId) : null
            if (brandId && platformId && brand) {
              const platform = brand.platforms?.find((p: any) => Number(p.id) === Number(platformId))
              platformName = platform?.name
            }

            const implantDetailsStr = brand && (platformName || platformId) && size
              ? `${brand.brand_name || ""} - ${platformName || platformId || ""} - ${size}`
              : mandibularImplantDetails || undefined

            return {
              mandibularImplantBrand: brandId || undefined,
              mandibularImplantPlatform: platformName || (platformId ? String(platformId) : undefined),
              mandibularImplantSize: size || undefined,
              mandibularImplantInclusions: mandibularImplantInclusions || undefined,
              mandibularAbutmentDetail: mandibularAbutmentDetail || undefined,
              mandibularAbutmentType: mandibularAbutmentType || undefined,
              mandibularImplantDetails: implantDetailsStr,
            }
          }
          return {}
        })() : {}),
      }

      // If both material and retention are set, show advance fields and fetch them
      if ((type === "maxillary" && finalMaxillaryMaterial && finalMaxillaryRetention) ||
        (type === "mandibular" && finalMandibularMaterial && finalMandibularRetention)) {
        setShowAdvanceFields(prev => ({ ...prev, [savedProduct.id]: true }))

        if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
          setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: productDetails.advance_fields }))
        } else if (productToUse?.id) {
          const fetchAdvanceFields = async () => {
            try {
              const labId = selectedLab?.id || selectedLab?.customer_id
              const details = await fetchProductDetails(productToUse.id, labId)
              if (details?.advance_fields && Array.isArray(details.advance_fields)) {
                setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: details.advance_fields }))
              }
            } catch (error) {
              console.error("Error fetching advance fields:", error)
            }
          }
          fetchAdvanceFields()
        }
      }

      // Update existing product or add new one
      if (existingIndex !== -1) {
        // Update existing product with same configuration
        const updated = [...deduplicatedProducts]
        updated[existingIndex] = savedProduct
        return updated
      } else {
        // Add new product to saved products array (use deduplicated to avoid duplicates)
        return [...deduplicatedProducts, savedProduct]
      }
    })

    // Update case summary notes when product is auto-saved
    const updatedNotes = generateCaseNotes()
    if (updatedNotes) {
      setMaxillaryImplantDetails(updatedNotes)
    }
  }

  // Keep ref pointing to latest handleAutoSaveProduct (for debounced version)
  useEffect(() => {
    handleAutoSaveProductRef.current = handleAutoSaveProduct
  }, [handleAutoSaveProduct])

  // Debounced auto-save: coalesce rapid calls (e.g. from effects + modal close) into one save after 500ms
  const debouncedAutoSaveProduct = useMemo(
    () =>
      debounce((type: "maxillary" | "mandibular") => {
        handleAutoSaveProductRef.current(type)
      }, 500),
    []
  )

  // React Query mutation for auto-saving products (kept for potential future use)
  const autoSaveProductMutation = useMutation({
    mutationFn: async (type: "maxillary" | "mandibular") => {
      // Call the existing handleAutoSaveProduct function (sync when mutation is used explicitly)
      handleAutoSaveProduct(type)
      return type
    },
    onSuccess: () => {
      // Product saving is handled by handleAutoSaveUnifiedProduct which tracks by product key
    },
    onError: (error) => {
      console.error("Error auto-saving product:", error)
    }
  })

  // Auto-save product when all fields are complete - create ONE product for both arches
  useEffect(() => {
    if (showProductDetails && selectedProduct && productDetails) {
      // Check if maxillary or mandibular has all fields filled
      const maxillaryComplete = showMaxillaryChart && maxillaryTeeth.length > 0 && areAllCurrentProductFieldsFilled("maxillary")
      const mandibularComplete = showMandibularChart && mandibularTeeth.length > 0 && areAllCurrentProductFieldsFilled("mandibular")

      // Determine which product to use (prefer the one that's complete, or use selectedProduct)
      const productToUse = maxillaryComplete
        ? (selectedProductForMaxillary || selectedProduct)
        : (mandibularComplete ? (selectedProductForMandibular || selectedProduct) : selectedProduct)

      // Only auto-save if at least one arch is complete and we haven't already saved this product configuration
      const hasTeeth = (maxillaryTeeth.length > 0 || mandibularTeeth.length > 0)
      const isComplete = maxillaryComplete || mandibularComplete

      // Create a unique key for this product configuration (using same format as handleAutoSaveUnifiedProduct)
      // This ensures we can properly check if a product already exists and update it instead of creating duplicates
      const maxillaryTeethSorted = [...maxillaryTeeth].sort()
      const mandibularTeethSorted = [...mandibularTeeth].sort()
      const productKey = `${productToUse?.id}-${selectedCategoryId}-${selectedSubcategoryId}-${maxillaryTeethSorted.join(',')}-${mandibularTeethSorted.join(',')}`

      // Don't auto-save if impression modal is open (prevents save when modal opens automatically)
      // Also don't auto-save if impression modal was just closed (prevents save after selecting impressions)
      if (isComplete && hasTeeth && selectedCategory && selectedCategoryId && selectedSubcategory && selectedSubcategoryId && productToUse && !showImpressionModal && !impressionModalJustClosedRef.current) {
        // Always call handleAutoSaveUnifiedProduct - it will update existing product or create new one
        // The function itself handles duplicate prevention by finding and updating existing products
        // This ensures the initial accordion is saved/updated when completed, not duplicated
        // handleAutoSaveUnifiedProduct finds products with same product ID, category, subcategory, and teeth
        // and updates them instead of creating new ones
        handleAutoSaveUnifiedProduct()

        // Mark this configuration as processed to track that we've handled it
        if (!autoSavedArchesRef.current.has(productKey)) {
          autoSavedArchesRef.current.add(productKey)
        }

        // After auto-save, open the saved product accordion instead of maxillary-card/mandibular-card
        // This ensures user continues editing in the saved product accordion
        setTimeout(() => {
          const archType = maxillaryComplete ? "maxillary" : "mandibular"
          const teethToMatch = archType === "maxillary" ? maxillaryTeethSorted : mandibularTeethSorted
          const matchingProduct = savedProducts.find(sp =>
            sp.addedFrom === archType &&
            sp.product.id === productToUse.id &&
            sp.categoryId === selectedCategoryId &&
            sp.subcategoryId === selectedSubcategoryId &&
            JSON.stringify([...(archType === "maxillary" ? sp.maxillaryTeeth : sp.mandibularTeeth) || []].sort()) === JSON.stringify(teethToMatch)
          )
          if (matchingProduct && (archType === "maxillary" ? openAccordionMaxillary !== matchingProduct.id : openAccordionMandibular !== matchingProduct.id)) {
            if (archType === "maxillary") setOpenAccordionMaxillary(matchingProduct.id)
            else setOpenAccordionMandibular(matchingProduct.id)
          }
        }, 100)
      }

      // Show case summary notes if either arch has all fields filled
      setShowCaseSummaryNotes(maxillaryComplete || mandibularComplete)
    } else {
      setShowCaseSummaryNotes(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showProductDetails,
    selectedProduct,
    productDetails,
    showMaxillaryChart,
    showMandibularChart,
    // maxillaryTeeth and mandibularTeeth intentionally omitted - do not trigger save when user only clicks teeth (teeth SVG)
    maxillaryMaterial,
    maxillaryRetention,
    maxillaryStumpShade,
    maxillaryToothShade,
    maxillaryStage,
    mandibularMaterial,
    mandibularRetention,
    mandibularToothShade,
    mandibularStage,
    selectedProductForMaxillary,
    selectedProductForMandibular,
    selectedCategory,
    selectedCategoryId,
    selectedSubcategory,
    selectedSubcategoryId,
    advanceFieldValues,
    showImpressionModal
    // Note: autoSaveProductMutation removed - useMutation returns new object each render causing infinite loop
  ])

  // Handler for Add Product button - saves current product and resets to categories
  const handleAddProduct = (type: "maxillary" | "mandibular") => {
    // Use the appropriate product based on arch selection
    const productToUse = type === "maxillary" ? selectedProductForMaxillary : selectedProductForMandibular

    // Validate that we have a product selected for this arch
    if (!productToUse) {
      toast({
        title: "No Product Selected",
        description: `Please add a product for ${type === "maxillary" ? "upper" : "lower"} arch first`,
        variant: "destructive",
      })
      return
    }

    // Validate that the chart is visible for this arch
    const chartVisible = type === "maxillary" ? showMaxillaryChart : showMandibularChart
    if (!chartVisible) {
      toast({
        title: "Chart Not Visible",
        description: `Please click "Add ${type === "maxillary" ? "Upper" : "Lower"} Product" first`,
        variant: "destructive",
      })
      return
    }

    // Validate that we have teeth selected for the specified type
    const teethForType = type === "maxillary" ? maxillaryTeeth : mandibularTeeth
    if (teethForType.length === 0) {
      toast({
        title: "No Teeth Selected",
        description: `Please select at least one ${type} tooth`,
        variant: "destructive",
      })
      return
    }

    // Validate category and subcategory
    if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
      toast({
        title: "Missing Information",
        description: "Please ensure category and subcategory are selected",
        variant: "destructive",
      })
      return
    }

    // Auto-populate product name and retention type if not already set
    // Material: Use product name if not set
    const finalMaxillaryMaterial = maxillaryMaterial || (type === "maxillary" ? productToUse.name : "")
    const finalMandibularMaterial = mandibularMaterial || (type === "mandibular" ? productToUse.name : "")
    // Retention: Keep existing value or leave empty (user will select it)
    const finalMaxillaryRetention = maxillaryRetention
    const finalMandibularRetention = mandibularRetention

    // Auto-select default stage if not already set
    let finalMaxillaryStage = maxillaryStage
    let finalMaxillaryStageId = maxillaryStageId
    let finalMandibularStage = mandibularStage
    let finalMandibularStageId = mandibularStageId

    if (type === "maxillary" && (!finalMaxillaryStage || finalMaxillaryStage.trim() === "")) {
      const stages = productDetails?.stages || []
      const defaultStage = findDefaultOption(stages)
      if (defaultStage) {
        finalMaxillaryStage = defaultStage.name
        finalMaxillaryStageId = defaultStage.id || defaultStage.stage_id
        // Update state so UI reflects the change
        setMaxillaryStage(finalMaxillaryStage)
        if (finalMaxillaryStageId) {
          setMaxillaryStageId(finalMaxillaryStageId)
        }
      }
    }

    if (type === "mandibular" && (!finalMandibularStage || finalMandibularStage.trim() === "")) {
      const stages = productDetails?.stages || []
      const defaultStage = findDefaultOption(stages)
      if (defaultStage) {
        finalMandibularStage = defaultStage.name
        finalMandibularStageId = defaultStage.id || defaultStage.stage_id
        // Update state so UI reflects the change
        setMandibularStage(finalMandibularStage)
        if (finalMandibularStageId) {
          setMandibularStageId(finalMandibularStageId)
        }
      }
    }

    // Get impression selections for this product
    const productId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const impressions = productDetails?.impressions || []
    const maxillaryImpressions = type === "maxillary"
      ? getImpressionSelections(productId, "maxillary", impressions)
      : []
    const mandibularImpressions = type === "mandibular"
      ? getImpressionSelections(productId, "mandibular", impressions)
      : []

    // Create saved product configuration
    const savedProduct: SavedProduct = {
      id: productId,
      product: productToUse,
      productDetails: productDetails, // Include full product details with extractions
      category: selectedCategory,
      categoryId: selectedCategoryId,
      subcategory: selectedSubcategory,
      subcategoryId: selectedSubcategoryId,
      maxillaryTeeth: [...maxillaryTeeth],
      mandibularTeeth: [...mandibularTeeth],
      maxillaryMaterial: finalMaxillaryMaterial,
      maxillaryStumpShade,
      maxillaryRetention: finalMaxillaryRetention,
      maxillaryImplantDetails,
      mandibularMaterial: finalMandibularMaterial,
      mandibularRetention: finalMandibularRetention,
      mandibularImplantDetails,
      createdAt: Date.now(),
      addedFrom: type, // Track which side the product was added from
      maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
      mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
      // Include ID fields and additional fields
      maxillaryMaterialId: type === "maxillary" ? maxillaryMaterialId : undefined,
      maxillaryRetentionId: type === "maxillary" ? maxillaryRetentionId : undefined,
      maxillaryRetentionOptionId: type === "maxillary" ? maxillaryRetentionOptionId : undefined,
      maxillaryGumShadeId: type === "maxillary" ? maxillaryGumShadeId : undefined,
      maxillaryShadeId: type === "maxillary" ? maxillaryShadeId : undefined,
      maxillaryStageId: type === "maxillary" ? finalMaxillaryStageId : undefined,
      maxillaryToothShade: type === "maxillary" ? maxillaryToothShade : undefined,
      maxillaryStage: type === "maxillary" ? finalMaxillaryStage : undefined,
      mandibularMaterialId: type === "mandibular" ? mandibularMaterialId : undefined,
      mandibularRetentionId: type === "mandibular" ? mandibularRetentionId : undefined,
      mandibularRetentionOptionId: type === "mandibular" ? mandibularRetentionOptionId : undefined,
      mandibularGumShadeId: type === "mandibular" ? mandibularGumShadeId : undefined,
      mandibularShadeId: type === "mandibular" ? mandibularShadeId : undefined,
      mandibularStageId: type === "mandibular" ? finalMandibularStageId : undefined,
      mandibularToothShade: type === "mandibular" ? mandibularToothShade : undefined,
      mandibularStage: type === "mandibular" ? finalMandibularStage : undefined,
      // Include advance fields if any are set
      advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
        ? productDetails.advance_fields
          .map((field: any) => {
            const fieldKey = `advance_${field.id}`
            const value = advanceFieldValues[fieldKey]
            if (value) {
              const fieldData: any = {
                advance_field_id: field.id,
                advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                teeth_number: null, // Can be set per tooth if needed
              }

              // Handle option_id for single selection (dropdown, radio)
              if (typeof value === "object" && value.option_id) {
                fieldData.option_id = value.option_id
              }

              // Handle option_ids for multiple selection (checkbox)
              if (typeof value === "object" && Array.isArray(value.option_ids)) {
                fieldData.option_ids = value.option_ids
              }

              // Handle file upload
              if (typeof value === "object" && value.file) {
                fieldData.file = value.file
              }

              return fieldData
            }
            return null
          })
          .filter((field: any) => field !== null)
        : undefined,
    }

    // If both material and retention are set, show advance fields and fetch them
    if ((type === "maxillary" && finalMaxillaryMaterial && finalMaxillaryRetention) ||
      (type === "mandibular" && finalMandibularMaterial && finalMandibularRetention)) {
      setShowAdvanceFields(prev => ({ ...prev, [savedProduct.id]: true }))

      // Fetch advance fields from productDetails if available, otherwise fetch from API
      if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
        setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: productDetails.advance_fields }))
      } else if (selectedProduct?.id) {
        // Fetch advance fields from API
        const fetchAdvanceFields = async () => {
          try {
            const labId = selectedLab?.id || selectedLab?.customer_id
            const details = await fetchProductDetails(selectedProduct.id, labId)
            if (details?.advance_fields && Array.isArray(details.advance_fields)) {
              setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: details.advance_fields }))
            }
          } catch (error) {
            console.error("Error fetching advance fields:", error)
          }
        }
        fetchAdvanceFields()
      }
    }

    // Add to saved products array as the first product (prepend instead of append)
    setSavedProducts((prev) => {
      // Check if this product already exists (same product ID, category, subcategory, and overlapping teeth)
      const existingIndex = prev.findIndex(p => {
        const matchesBasic = p.product.id === productToUse.id &&
          p.categoryId === selectedCategoryId &&
          p.subcategoryId === selectedSubcategoryId

        if (!matchesBasic) return false

        // Check for overlapping teeth
        const existingMaxTeeth = [...(p.maxillaryTeeth || [])].sort()
        const existingMandTeeth = [...(p.mandibularTeeth || [])].sort()
        const newMaxTeeth = [...maxillaryTeeth].sort()
        const newMandTeeth = [...mandibularTeeth].sort()

        const maxillaryOverlap = existingMaxTeeth.length > 0 && newMaxTeeth.length > 0 &&
          (existingMaxTeeth.some(tooth => newMaxTeeth.includes(tooth)) ||
            newMaxTeeth.some(tooth => existingMaxTeeth.includes(tooth)))

        const mandibularOverlap = existingMandTeeth.length > 0 && newMandTeeth.length > 0 &&
          (existingMandTeeth.some(tooth => newMandTeeth.includes(tooth)) ||
            newMandTeeth.some(tooth => existingMandTeeth.includes(tooth)))

        return maxillaryOverlap || mandibularOverlap
      })

      if (existingIndex !== -1) {
        // Update existing product with merged teeth and all current fields
        const updated = [...prev]
        const existingProduct = prev[existingIndex]

        // Merge teeth arrays
        const existingMaxTeeth = [...(existingProduct.maxillaryTeeth || [])]
        const existingMandTeeth = [...(existingProduct.mandibularTeeth || [])]
        const mergedMaxTeeth = [...new Set([...existingMaxTeeth, ...maxillaryTeeth])].sort()
        const mergedMandTeeth = [...new Set([...existingMandTeeth, ...mandibularTeeth])].sort()

        // Update with all current fields
        updated[existingIndex] = {
          ...savedProduct,
          id: existingProduct.id, // Keep existing ID
          createdAt: existingProduct.createdAt, // Keep original creation time
          maxillaryTeeth: mergedMaxTeeth,
          mandibularTeeth: mergedMandTeeth,
        }

        // Move to first position
        const productToMove = updated.splice(existingIndex, 1)[0]
        return [productToMove, ...updated]
      } else {
        // Add new product as the first item
        return [savedProduct, ...prev]
      }
    })

    // Keep product details visible so DynamicProductFields continues to show
    // Don't reset form - keep all fields visible for editing
    // Only reset navigation states
    setShowSubcategories(false)
    setShowProducts(false)
    // Keep showProductDetails true so DynamicProductFields remains visible
    // Keep all product and field states so user can continue editing

    toast({
      title: "Product Saved",
      description: `${productToUse.name} has been saved. Continue filling in the fields below.`,
    })

    // Update case summary notes when product is added
    const updatedNotes = generateCaseNotes()
    if (updatedNotes) {
      setMaxillaryImplantDetails(updatedNotes)
    }
  }

  // Handler to clear current product and reset to category selection
  // Reset auto-saved tracking when product changes
  useEffect(() => {
    autoSavedArchesRef.current.clear()
  }, [selectedProduct?.id, selectedCategoryId, selectedSubcategoryId])

  // Comprehensive reset function for all product-related state
  const resetAllProductState = () => {
    // Reset product selection
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setProductDetails(null)

    // Reset arch selection
    setSelectedArchForProduct(null)
    setShowMaxillaryChart(false)
    setShowMandibularChart(false)
    setSelectedProductForMaxillary(null)
    setSelectedProductForMandibular(null)

    // Reset teeth selections
    setMaxillaryTeeth([])
    setMandibularTeeth([])
    setMissingTeethCardClicked(false)

    // Reset retention types
    setMaxillaryRetentionTypes({})
    setMandibularRetentionTypes({})

    // Reset maxillary fields
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryImplantDetails("")
    setMaxillaryMaterialId(undefined)
    setMaxillaryRetentionId(undefined)
    setMaxillaryRetentionOptionId(undefined)
    setMaxillaryGumShadeId(undefined)
    setMaxillaryShadeId(undefined)
    setMaxillaryStageId(undefined)
    setMaxillaryToothShade("")
    setMaxillaryStage("")

    // Reset mandibular fields
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularImplantDetails("")
    setMandibularStumpShade("")
    setMandibularMaterialId(undefined)
    setMandibularRetentionId(undefined)
    setMandibularRetentionOptionId(undefined)
    setMandibularGumShadeId(undefined)
    setMandibularShadeId(undefined)
    setMandibularStageId(undefined)
    setMandibularToothShade("")
    setMandibularStage("")

    // Reset advance fields
    setShowAdvanceFields({})
    setProductAdvanceFields({})
    setAdvanceFieldValues({})
    setCompletedFields({})

    // Reset implant selections
    setSelectedImplantIds({})
    setImplantSelectionStep({})
    setSelectedImplantBrand({})
    setSelectedImplantPlatform({})
    setSelectedImplantPlatformData({})
    setSelectedImplantSize({})
    setShowImplantCards(false)
    setActiveImplantFieldKey(null)

    // Reset accordion and dropdowns
    setOpenAccordionMaxillary(null)
    setOpenAccordionMandibular(null)
    setOpenStageDropdown({})
    setOpenRetentionDropdown({})

    // Reset impressions
    setShowImpressionModal(false)
    setCurrentImpressionArch("maxillary")
    setSelectedImpressions({})
    setCurrentProductForImpression(null)
    setStlFilesByImpression({})
    // Set flag to prevent auto-save immediately after closing impression modal
    impressionModalJustClosedRef.current = true
    // Clear the flag after a short delay to allow normal auto-save to resume
    setTimeout(() => {
      impressionModalJustClosedRef.current = false
    }, 1000)

    // Reset shade selection
    setShowShadeModal(false)
    setCurrentShadeField(null)
    setCurrentShadeProductId(null)
    setCurrentShadeArch("maxillary")
    setSelectedShadesForSVG([])
    setSelectedShadeOption(null)
    setSelectedShadeGuide("Vita Classical")

    // Reset saved products
    setSavedProducts([])

    // Reset auto-saved tracking
    autoSavedArchesRef.current.clear()
    autoAddedProductRef.current = null
  }

  const handleClearCurrentProduct = () => {
    resetAllProductState()
    toast({
      title: "Product Cleared",
      description: "Current product selection has been cleared",
    })
  }

  // Reset on page refresh/unload - clear localStorage cache
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear localStorage cache on refresh
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('caseDesignCache')
          // Clear stashed attachments
          delete (window as any).__caseDesignAttachments
        } catch (error) {
          console.error('Error clearing cache on unload:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleSubmit = async () => {
    // Check confirmation checkbox
    if (!confirmDetailsChecked) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that all details are correct before submitting",
        variant: "destructive",
      })
      setShowSubmitPopover(true)
      return
    }

    // Check if there are any saved products or a current product being configured
    const hasSavedProducts = savedProducts.length > 0
    const hasCurrentProduct = selectedProduct && (maxillaryTeeth.length > 0 || mandibularTeeth.length > 0)

    if (!hasSavedProducts && !hasCurrentProduct) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product to your case",
        variant: "destructive",
      })
      return
    }

    // If there's a current product with teeth selected, automatically include it in the submission
    let productsToSubmit = [...savedProducts]
    if (hasCurrentProduct && selectedProduct) {
      // Validate category and subcategory are set
      if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
        toast({
          title: "Missing Information",
          description: "Please ensure category and subcategory are selected for the current product",
          variant: "destructive",
        })
        return
      }

      // Determine which arch to use for addedFrom (prefer the one with more teeth, or maxillary if equal)
      const addedFrom: "maxillary" | "mandibular" = maxillaryTeeth.length >= mandibularTeeth.length ? "maxillary" : "mandibular"

      // Auto-populate product name and retention type if not already set
      const finalMaxillaryMaterial = maxillaryMaterial || (addedFrom === "maxillary" ? selectedProduct.name : "")
      const finalMandibularMaterial = mandibularMaterial || (addedFrom === "mandibular" ? selectedProduct.name : "")

      // Get impression selections for this product
      const productId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const impressions = productDetails?.impressions || []
      const maxillaryImpressions = getImpressionSelections(productId, "maxillary", impressions)
      const mandibularImpressions = getImpressionSelections(productId, "mandibular", impressions)

      // Create saved product configuration for current product
      const currentProductAsSaved: SavedProduct = {
        id: productId,
        product: selectedProduct,
        productDetails: productDetails,
        category: selectedCategory,
        categoryId: selectedCategoryId,
        subcategory: selectedSubcategory,
        subcategoryId: selectedSubcategoryId,
        maxillaryTeeth: [...maxillaryTeeth],
        mandibularTeeth: [...mandibularTeeth],
        maxillaryMaterial: finalMaxillaryMaterial,
        maxillaryStumpShade,
        maxillaryRetention: maxillaryRetention,
        maxillaryImplantDetails,
        mandibularMaterial: finalMandibularMaterial,
        mandibularRetention: mandibularRetention,
        mandibularStumpShade: mandibularStumpShade,
        mandibularImplantDetails,
        createdAt: Date.now(),
        addedFrom,
        maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
        mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
        maxillaryMaterialId,
        maxillaryRetentionId,
        maxillaryRetentionOptionId,
        maxillaryGumShadeId,
        maxillaryShadeId,
        maxillaryStageId,
        maxillaryToothShade,
        maxillaryStage,
        mandibularMaterialId,
        mandibularRetentionId,
        mandibularRetentionOptionId,
        mandibularGumShadeId,
        mandibularShadeId,
        mandibularStageId,
        mandibularToothShade,
        mandibularStage,
        advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
          ? productDetails.advance_fields
            .map((field: any) => {
              const fieldKey = `advance_${field.id}`
              const value = advanceFieldValues[fieldKey]
              if (value) {
                const fieldData: any = {
                  advance_field_id: field.id,
                  advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                  teeth_number: null,
                }

                // Handle option_id for single selection (dropdown, radio)
                if (typeof value === "object" && value.option_id) {
                  fieldData.option_id = value.option_id
                }

                // Handle option_ids for multiple selection (checkbox)
                if (typeof value === "object" && Array.isArray(value.option_ids)) {
                  fieldData.option_ids = value.option_ids
                }

                // Handle file upload
                if (typeof value === "object" && value.file) {
                  fieldData.file = value.file
                }

                return fieldData
              }
              return null
            })
            .filter((field: any) => field !== null)
          : undefined,
      }

      productsToSubmit.push(currentProductAsSaved)
    }

    // Validate required data
    if (!selectedLab) {
      toast({
        title: "Validation Error",
        description: "Please select a lab",
        variant: "destructive",
      })
      return
    }

    if (!selectedDoctor) {
      toast({
        title: "Validation Error",
        description: "Please select a doctor",
        variant: "destructive",
      })
      return
    }

    if (!patientData || !patientData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter patient information",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Import services dynamically to avoid SSR issues
      const { slipCreationService } = await import("@/services/slip-creation-service")
      const { transformToSlipCreationPayload, extractFilesFromAdvanceFields } = await import("@/utils/slip-data-transformer")

      // Get user from localStorage
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("User information not found. Please log in again.")
      }
      const user = JSON.parse(userStr)

      // Transform data to API format
      const payload = transformToSlipCreationPayload({
        selectedLab,
        selectedDoctor,
        patientData,
        savedProducts: productsToSubmit,
        user,
        locationId: undefined, // Could be added from user preferences
      })

      // Extract files from advance fields if any
      const files = extractFilesFromAdvanceFields(productsToSubmit)

      // Also extract STL files from impressions
      Object.values(stlFilesByImpression).forEach((stlFiles) => {
        stlFiles.forEach(({ file }) => {
          files.push(file)
        })
      })

      // Call API
      const response = await slipCreationService.createSlip(payload, files.length > 0 ? files : undefined)

      if (response.success) {
        toast({
          title: "Case Submitted Successfully",
          description: response.data?.case_number
            ? `Case ${response.data.case_number} has been created successfully`
            : "Your case has been submitted successfully",
        })

        // Clear slip creation storage
        clearSlipCreationStorage()

        // Navigate based on user role
        const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
        let redirectPath = "/case-management" // default

        if (role === "lab_admin") {
          redirectPath = "/lab-case-management"
        } else if (role === "office_admin") {
          redirectPath = "/case-management"
        } else {
          redirectPath = "/case-management"
        }

        router.push(redirectPath)
      } else {
        throw new Error(response.message || "Failed to submit case")
      }
    } catch (error: any) {
      console.error("Error submitting case:", error)

      // Handle validation errors from API
      let errorMessage = error.message || "Failed to submit case"
      if (error.errors) {
        const errorDetails = Object.entries(error.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join("\n")
        errorMessage = `${errorMessage}\n${errorDetails}`
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for retention type selection - only one type can be selected at a time
  const handleSelectRetentionType = (arch: 'maxillary' | 'mandibular', toothNumber: number, type: 'Implant' | 'Prep' | 'Pontic') => {
    // Determine if we're deselecting before updating state
    const currentRetentionTypes = arch === 'maxillary'
      ? maxillaryRetentionTypes[toothNumber] || []
      : mandibularRetentionTypes[toothNumber] || []
    const isDeselecting = currentRetentionTypes.includes(type) && currentRetentionTypes.length === 1 && currentRetentionTypes[0] === type

    if (arch === 'maxillary') {
      setMaxillaryRetentionTypes(prev => {
        const current = prev[toothNumber] || []
        // If clicking the same type, deselect it; otherwise, replace with the new selection
        const updated = current.includes(type) && current.length === 1 && current[0] === type
          ? [] // Deselect if already selected
          : [type] // Replace with new selection (only one allowed)
        return { ...prev, [toothNumber]: updated }
      })
    } else {
      setMandibularRetentionTypes(prev => {
        const current = prev[toothNumber] || []
        // If clicking the same type, deselect it; otherwise, replace with the new selection
        const updated = current.includes(type) && current.length === 1 && current[0] === type
          ? [] // Deselect if already selected
          : [type] // Replace with new selection (only one allowed)
        return { ...prev, [toothNumber]: updated }
      })
    }

    // Update retention type field based on popover selection
    if (!isDeselecting && productDetails?.retentions) {
      // Determine target retention name based on type
      let targetRetentionName = ""
      if (type === "Implant") {
        targetRetentionName = "Screwed"
      } else if (type === "Prep") {
        targetRetentionName = "Cemented"
      } else {
        // For Pontic or any other type, default to Cemented
        targetRetentionName = "Cemented"
      }

      // Find the matching retention by name (case-insensitive)
      const targetRetention = productDetails.retentions.find((ret: any) =>
        ret.name === targetRetentionName ||
        ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
      )

      if (targetRetention) {
        if (arch === 'maxillary') {
          setMaxillaryRetention(targetRetention.name)
          setMaxillaryRetentionId(targetRetention.id)
        } else {
          setMandibularRetention(targetRetention.name)
          setMandibularRetentionId(targetRetention.id)
        }

        // Also update saved products that contain this tooth
        setSavedProducts(prev => prev.map(product => {
          const teeth = arch === 'maxillary' ? product.maxillaryTeeth : product.mandibularTeeth
          // Check if this saved product contains the tooth we're updating
          if (teeth && teeth.includes(toothNumber)) {
            // Use the saved product's own productDetails to find the matching retention
            const productRetentions = product.productDetails?.retentions
            if (productRetentions) {
              const matchingRetention = productRetentions.find((ret: any) =>
                ret.name === targetRetentionName ||
                ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
              )

              if (matchingRetention) {
                const updated = { ...product }
                if (arch === 'maxillary') {
                  updated.maxillaryRetention = matchingRetention.name
                  updated.maxillaryRetentionId = matchingRetention.id
                } else {
                  updated.mandibularRetention = matchingRetention.name
                  updated.mandibularRetentionId = matchingRetention.id
                }
                return updated
              }
            }
            // Fallback: if productDetails doesn't have retentions, use the target retention from current productDetails
            const updated = { ...product }
            if (arch === 'maxillary') {
              updated.maxillaryRetention = targetRetention.name
              updated.maxillaryRetentionId = targetRetention.id
            } else {
              updated.mandibularRetention = targetRetention.name
              updated.mandibularRetentionId = targetRetention.id
            }
            return updated
          }
          return product
        }))
      }
    } else if (isDeselecting) {
      // If deselecting, clear retention from saved products that contain this tooth
      setSavedProducts(prev => prev.map(product => {
        const teeth = arch === 'maxillary' ? product.maxillaryTeeth : product.mandibularTeeth
        if (teeth && teeth.includes(toothNumber)) {
          const updated = { ...product }
          if (arch === 'maxillary') {
            updated.maxillaryRetention = ""
            updated.maxillaryRetentionId = undefined
          } else {
            updated.mandibularRetention = ""
            updated.mandibularRetentionId = undefined
          }
          return updated
        }
        return product
      }))
    }

    // Close popover after selection
    setRetentionPopoverState({ arch: null, toothNumber: null })
  }

  const handleMaxillaryToothToggle = (toothNumber: number) => {
    const isAlreadySelected = maxillaryTeeth.includes(toothNumber)
    const isAdding = !isAlreadySelected

    // For Fixed Restoration: clicking an already selected tooth shows the popover without deselecting
    if (isFixedRestoration && isAlreadySelected) {
      setRetentionPopoverState({ arch: 'maxillary', toothNumber })
      return
    }

    // Update teeth selection
    setMaxillaryTeeth(prev => {
      const newTeeth = isAdding
        ? [...prev, toothNumber]
        : prev.filter(t => t !== toothNumber)

      return newTeeth
    })

    // Handle popovers and accordions AFTER state update is queued
    if (isAdding && isFixedRestoration) {
      setRetentionPopoverState({ arch: 'maxillary', toothNumber })
    } else if (isAdding && shouldShowImplantPopover) {
      setImplantPopoverState({ arch: 'maxillary', toothNumber })
    } else if (!isAdding) {
      setRetentionPopoverState({ arch: null, toothNumber: null })
      setImplantPopoverState({ arch: null, toothNumber: null })
    }

    // Compute new teeth after this click (add or remove)
    const newTeeth = isAdding ? [...maxillaryTeeth, toothNumber] : maxillaryTeeth.filter(t => t !== toothNumber)
    const sortedNew = newTeeth.map((t: number) => Number(t)).sort((a, b) => a - b)
    // If a saved maxillary product's accordion is open, update that product's teeth so the header reflects the new selection
    if (openAccordionMaxillary && openAccordionMaxillary !== "maxillary-card") {
      const openSaved = savedProducts.find(sp => sp.id === openAccordionMaxillary && sp.addedFrom === "maxillary")
      if (openSaved) {
        setSavedProducts(prev => prev.map(sp => sp.id === openAccordionMaxillary ? { ...sp, maxillaryTeeth: [...sortedNew] } : sp))
      }
    }
    // Check if resulting selection matches a saved product (use current product context or any maxillary saved product)
    const productToMatch = selectedProductForMaxillary || savedProducts.find(sp => sp.addedFrom === "maxillary")?.product
    const matchingSaved = productToMatch && sortedNew.length > 0 && savedProducts.find(sp => {
      if (sp.addedFrom !== "maxillary") return false
      const sameProduct = String(sp.product?.id ?? "") === String(productToMatch?.id ?? "")
      const savedTeeth = (sp.maxillaryTeeth || []).map((t: number) => Number(t)).sort((a, b) => a - b)
      const sameTeeth = savedTeeth.length === sortedNew.length && savedTeeth.every((t, i) => t === sortedNew[i])
      return sameProduct && sameTeeth
    })

    if (matchingSaved) {
      // Current selection matches a saved product: open that saved accordion and sync product context (Summary Card will hide)
      setSelectedProductForMaxillary(matchingSaved.product)
      setOpenAccordionMaxillary(matchingSaved.id)
    } else if (isAdding) {
      // Adding a tooth and no match: open Summary Card or most recent saved
      if (selectedProduct && showProductDetails) {
        setOpenAccordionMaxillary("maxillary-card")
      } else {
        const maxillaryProducts = savedProducts.filter(p => p.maxillaryTeeth.length > 0)
        if (maxillaryProducts.length > 0) {
          const mostRecentProduct = maxillaryProducts[maxillaryProducts.length - 1]
          setOpenAccordionMaxillary(mostRecentProduct.id)
        } else {
          setOpenAccordionMaxillary("maxillary-card")
        }
      }
    }
  }

  const handleMandibularToothToggle = (toothNumber: number) => {
    const isAlreadySelected = mandibularTeeth.includes(toothNumber)
    const isAdding = !isAlreadySelected

    // For Fixed Restoration: clicking an already selected tooth shows the popover without deselecting
    if (isFixedRestoration && isAlreadySelected) {
      setRetentionPopoverState({ arch: 'mandibular', toothNumber })
      return
    }

    // Update teeth selection
    setMandibularTeeth(prev => {
      const newTeeth = isAdding
        ? [...prev, toothNumber]
        : prev.filter(t => t !== toothNumber)

      return newTeeth
    })

    // Handle popovers and accordions AFTER state update is queued
    if (isAdding && isFixedRestoration) {
      setRetentionPopoverState({ arch: 'mandibular', toothNumber })
    } else if (isAdding && shouldShowImplantPopover) {
      setImplantPopoverState({ arch: 'mandibular', toothNumber })
    } else if (!isAdding) {
      setRetentionPopoverState({ arch: null, toothNumber: null })
      setImplantPopoverState({ arch: null, toothNumber: null })
    }

    // Compute new teeth after this click (add or remove)
    const newTeeth = isAdding ? [...mandibularTeeth, toothNumber] : mandibularTeeth.filter(t => t !== toothNumber)
    const sortedNew = newTeeth.map((t: number) => Number(t)).sort((a, b) => a - b)
    // If a saved mandibular product's accordion is open, update that product's teeth so the header reflects the new selection
    if (openAccordionMandibular && openAccordionMandibular !== "mandibular-card") {
      const openSaved = savedProducts.find(sp => sp.id === openAccordionMandibular && sp.addedFrom === "mandibular")
      if (openSaved) {
        setSavedProducts(prev => prev.map(sp => sp.id === openAccordionMandibular ? { ...sp, mandibularTeeth: [...sortedNew] } : sp))
      }
    }
    // Check if resulting selection matches a saved product (use current product context or any mandibular saved product)
    const productToMatch = selectedProductForMandibular || savedProducts.find(sp => sp.addedFrom === "mandibular")?.product
    const matchingSaved = productToMatch && sortedNew.length > 0 && savedProducts.find(sp => {
      if (sp.addedFrom !== "mandibular") return false
      const sameProduct = String(sp.product?.id ?? "") === String(productToMatch?.id ?? "")
      const savedTeeth = (sp.mandibularTeeth || []).map((t: number) => Number(t)).sort((a, b) => a - b)
      const sameTeeth = savedTeeth.length === sortedNew.length && savedTeeth.every((t, i) => t === sortedNew[i])
      return sameProduct && sameTeeth
    })

    if (matchingSaved) {
      // Current selection matches a saved product: open that saved accordion and sync product context (Summary Card will hide)
      setSelectedProductForMandibular(matchingSaved.product)
      setOpenAccordionMandibular(matchingSaved.id)
    } else if (isAdding) {
      // Adding a tooth and no match: open Summary Card or most recent saved
      if (selectedProduct && showProductDetails) {
        setOpenAccordionMandibular("mandibular-card")
      } else {
        const mandibularProducts = savedProducts.filter(p => p.mandibularTeeth.length > 0)
        if (mandibularProducts.length > 0) {
          const mostRecentProduct = mandibularProducts[mandibularProducts.length - 1]
          setOpenAccordionMandibular(mostRecentProduct.id)
        } else {
          setOpenAccordionMandibular("mandibular-card")
        }
      }
    }
  }

  // Force deselection handlers (bypasses the early return logic)
  const handleMaxillaryToothDeselect = (toothNumber: number) => {
    setMaxillaryTeeth(prev => prev.filter(t => t !== toothNumber))
    // Clear retention types for this tooth
    setMaxillaryRetentionTypes(prev => {
      const updated = { ...prev }
      delete updated[toothNumber]
      return updated
    })
    // Close popovers
    setRetentionPopoverState({ arch: null, toothNumber: null })
    setImplantPopoverState({ arch: null, toothNumber: null })
  }

  const handleMandibularToothDeselect = (toothNumber: number) => {
    setMandibularTeeth(prev => prev.filter(t => t !== toothNumber))
    // Clear retention types for this tooth
    setMandibularRetentionTypes(prev => {
      const updated = { ...prev }
      delete updated[toothNumber]
      return updated
    })
    // Close popovers
    setRetentionPopoverState({ arch: null, toothNumber: null })
    setImplantPopoverState({ arch: null, toothNumber: null })
  }

  // Get subcategory image helper
  const getSubcategoryImage = (name: string) => {
    if (!name) return "/images/product-default.png"
    const lower = name.toLowerCase()
    // You can add more specific image mappings here
    return "/images/product-default.png"
  }

  const handleCancel = () => {
    // Clear all slip creation storage when canceling
    clearSlipCreationStorage()
    router.back()
  }

  const handlePreview = () => {
    // Transform current data to preview format
    setShowPreviewModal(true)
  }

  // Transform saved products and case data to preview format
  const getPreviewCaseData = () => {
    // Get lab info
    const labName = selectedLab?.name || "Lab"
    const labAddress = "" // Could be added to lab object
    const labPhone = "" // Could be added to lab object
    const labEmail = "" // Could be added to lab object

    // Get office info (from user's customerId if office_admin/doctor)
    const officeName = typeof window !== "undefined"
      ? (localStorage.getItem("customerName") || "Office")
      : "Office"

    // Get doctor info
    const doctorName = selectedDoctor
      ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}`
      : "Doctor"

    // Get patient info
    const patientName = patientData?.name || "Patient"

    // Transform products
    const previewProducts = savedProducts.map((sp, index) => {
      const maxillaryTeeth = sp.maxillaryTeeth.length > 0 ? sp.maxillaryTeeth : []
      const mandibularTeeth = sp.mandibularTeeth.length > 0 ? sp.mandibularTeeth : []

      // Combine teeth for display
      const allTeeth = [...maxillaryTeeth, ...mandibularTeeth]
      const teethString = allTeeth.sort((a, b) => a - b).join(", ")

      return {
        id: sp.id,
        name: sp.product.name,
        type: maxillaryTeeth.length > 0 ? "Upper" : "Lower",
        teeth: teethString,
        deliveryDate: new Date(Date.now() + (sp.product.estimated_days || 7) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        abbreviation: sp.product.name.substring(0, 3).toUpperCase(),
        color: index === 0 ? "#ef4444" : "#6b7280",
        borderColor: index === 0 ? "#dc2626" : "#4b5563",
        addOns: (maxillaryTeeth.length > 0 ? sp.maxillaryAddOnsStructured : sp.mandibularAddOnsStructured)?.map(a => ({
          category: a.category || "",
          addOn: a.name || "",
          qty: a.qty || a.quantity || 1,
        })) || [],
        stageNotesContent: maxillaryTeeth.length > 0 ? sp.maxillaryImplantDetails : sp.mandibularImplantDetails || "",
        rushRequest: sp.rushData ? {
          date: sp.rushData.targetDate,
        } : undefined,
        maxillaryTeeth,
        mandibularTeeth,
        maxillaryConfig: maxillaryTeeth.length > 0 ? {
          material: sp.maxillaryMaterial,
          shade: sp.maxillaryToothShade,
          retention: sp.maxillaryRetention,
        } : undefined,
        mandibularConfig: mandibularTeeth.length > 0 ? {
          material: sp.mandibularMaterial,
          retention: sp.mandibularRetention,
        } : undefined,
      }
    })

    return {
      lab: labName,
      address: labAddress,
      qrCode: undefined, // Could generate QR code
      office: officeName,
      doctor: doctorName,
      patient: patientName,
      pickupDate: new Date().toLocaleDateString(), // Could calculate from delivery date
      panNumber: "A69", // Would come from API after creation
      caseNumber: "C000000", // Would come from API after creation
      slipNumber: "S000000", // Would come from API after creation
      products: previewProducts,
      contact: labPhone,
      email: labEmail,
    }
  }

  const getGenderDisplay = (gender: string) => {
    if (gender === "male") return "M"
    if (gender === "female") return "F"
    return "M / F"
  }

  // Handlers for editable patient data
  const handlePatientNameChange = (value: string) => {
    const updatedPatientData = {
      ...patientData,
      name: value,
      gender: patientData?.gender || "",
    }
    setPatientData(updatedPatientData)
    localStorage.setItem("patientData", JSON.stringify(updatedPatientData))
  }

  const handlePatientGenderChange = (value: string) => {
    const updatedPatientData = {
      ...patientData,
      name: patientData?.name || "",
      gender: value,
    }
    setPatientData(updatedPatientData)
    localStorage.setItem("patientData", JSON.stringify(updatedPatientData))
  }

  // Build context value for CaseDesignCenterProvider (so section components can use useCaseDesignCenterContext)
  const caseDesignCenterValue = useMemo(
    () => ({
      selectedDoctor,
      setSelectedDoctor,
      selectedLab,
      setSelectedLab,
      patientData,
      setPatientData,
      createdBy,
      setCreatedBy,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      selectedCategoryId,
      setSelectedCategoryId,
      selectedSubcategory,
      setSelectedSubcategory,
      selectedSubcategoryId,
      setSelectedSubcategoryId,
      showSubcategories,
      setShowSubcategories,
      showProducts,
      setShowProducts,
      products,
      setProducts,
      isLoadingProducts,
      setIsLoadingProducts,
      selectedProduct,
      setSelectedProduct,
      showProductDetails,
      setShowProductDetails,
      productDetails,
      setProductDetails,
      isLoadingProductDetails,
      setIsLoadingProductDetails,
      selectedArchForProduct,
      setSelectedArchForProduct,
      showMaxillaryChart,
      setShowMaxillaryChart,
      showMandibularChart,
      setShowMandibularChart,
      selectedProductForMaxillary,
      setSelectedProductForMaxillary,
      selectedProductForMandibular,
      setSelectedProductForMandibular,
      maxillaryTeeth,
      setMaxillaryTeeth,
      mandibularTeeth,
      setMandibularTeeth,
      maxillaryRetentionTypes,
      setMaxillaryRetentionTypes,
      mandibularRetentionTypes,
      setMandibularRetentionTypes,
      maxillarySectionRef,
      mandibularSectionRef,
      toothSelectionRef,
      subcategoriesScrollRef,
      productsScrollRef,
      showSubcategoriesLeftArrow,
      setShowSubcategoriesLeftArrow,
      showSubcategoriesRightArrow,
      setShowSubcategoriesRightArrow,
      showProductsLeftArrow,
      setShowProductsLeftArrow,
      showProductsRightArrow,
      setShowProductsRightArrow,
      mainCategories,
      filteredSubcategories,
      filteredProducts,
      allCategoriesLoading,
      subcategoriesLoading,
      subcategoriesError,
      getCategoryImage,
      getSubcategoryImage,
      handleCategorySelect,
      handleSubcategorySelect,
      handleProductSelect,
      handleBackToCategories,
      handleBackToSubcategories,
      handleBackToProducts,
      scrollSubcategories,
      scrollProducts,
      checkSubcategoriesScroll,
      checkProductsScroll,
      handlePatientNameChange,
      handlePatientGenderChange,
      savedProductSectionContextValue,
      showArchSelectionPopover,
      setShowArchSelectionPopover,
      pendingProductForArchSelection,
      setPendingProductForArchSelection,
      archSelectionPopoverAnchor,
      setArchSelectionPopoverAnchor,
      handleArchSelection,
      isFixedRestoration,
      isOrthodonticsOrRemovable,
      missingTeethCardClicked,
      setMissingTeethCardClicked,
      handleMissingTeethCardClick,
      handleAddUpperProduct,
      handleAddLowerProduct,
      handleDeleteUpperProduct,
      handleDeleteLowerProduct,
      resetAllProductState,
      productSearchResults,
      isSearchingProducts,
      debouncedSearchQuery,
      allowNavigationRef,
      hasUnsavedWork,
      showRefreshWarningModal,
      setShowRefreshWarningModal,
      showCancelModal,
      setShowCancelModal,
      showPreviewModal,
      setShowPreviewModal,
      showImpressionModal,
      setShowImpressionModal,
      currentImpressionArch,
      setCurrentImpressionArch,
      selectedImpressions,
      setSelectedImpressions,
      currentProductForImpression,
      setCurrentProductForImpression,
      showShadeModal,
      setShowShadeModal,
      currentShadeField,
      setCurrentShadeField,
      currentShadeArch,
      setCurrentShadeArch,
      currentShadeProductId,
      setCurrentShadeProductId,
      selectedShadeGuide,
      setSelectedShadeGuide,
      selectedShadesForSVG,
      setSelectedShadesForSVG,
      handleOpenShadeModal,
      handleShadeSelect,
      handleShadeClickFromSVG,
      maxillaryShadeId,
      mandibularShadeId,
      maxillaryGumShadeId,
      mandibularGumShadeId,
      shadeGuideOptions,
      isInitialLoading,
      setIsInitialLoading,
      isLoadingProductDetails,
      // Form state for current product (used by SavedProductSectionContent accordion items)
      maxillaryMaterial,
      setMaxillaryMaterial,
      mandibularMaterial,
      setMandibularMaterial,
      maxillaryRetention,
      setMaxillaryRetention,
      mandibularRetention,
      setMandibularRetention,
      maxillaryStumpShade,
      setMaxillaryStumpShade,
      mandibularStumpShade,
      setMandibularStumpShade,
      maxillaryToothShade,
      setMaxillaryToothShade,
      mandibularToothShade,
      setMandibularToothShade,
      maxillaryStage,
      setMaxillaryStage,
      mandibularStage,
      setMandibularStage,
      maxillaryImplantDetails,
      setMaxillaryImplantDetails,
      mandibularImplantDetails,
      setMandibularImplantDetails,
      maxillaryMaterialId,
      setMaxillaryMaterialId,
      mandibularMaterialId,
      setMandibularMaterialId,
      maxillaryRetentionId,
      setMaxillaryRetentionId,
      mandibularRetentionId,
      setMandibularRetentionId,
      maxillaryRetentionOptionId,
      setMaxillaryRetentionOptionId,
      mandibularRetentionOptionId,
      setMandibularRetentionOptionId,
      maxillaryGumShadeId,
      setMaxillaryGumShadeId,
      mandibularGumShadeId,
      setMandibularGumShadeId,
      maxillaryShadeId,
      setMaxillaryShadeId,
      mandibularShadeId,
      setMandibularShadeId,
      maxillaryStageId,
      setMaxillaryStageId,
      mandibularStageId,
      setMandibularStageId,
      maxillaryImplantInclusions,
      setMaxillaryImplantInclusions,
      mandibularImplantInclusions,
      setMandibularImplantInclusions,
      maxillaryAbutmentDetail,
      setMaxillaryAbutmentDetail,
      mandibularAbutmentDetail,
      setMandibularAbutmentDetail,
      maxillaryAbutmentType,
      setMaxillaryAbutmentType,
      mandibularAbutmentType,
      setMandibularAbutmentType,
      advanceFieldValues,
      setAdvanceFieldValues,
      selectedImplantBrandForDetails,
      setSelectedImplantBrandForDetails,
      selectedImplantPlatformForDetails,
      setSelectedImplantPlatformForDetails,
      selectedImplantBrand,
      setSelectedImplantBrand,
      selectedImplantPlatform,
      setSelectedImplantPlatform,
      selectedImplantSize,
      setSelectedImplantSize,
      selectedImplantPlatformData,
      setSelectedImplantPlatformData,
      showImplantBrandCardsInFields,
      setShowImplantBrandCardsInFields,
      clickedFieldTypeInImplantDetails,
      setClickedFieldTypeInImplantDetails,
      fieldConfigs,
      productDetails,
      handleFieldChange,
      handleOpenImpressionModal,
      getImpressionCount,
      getImpressionDisplayText,
      handleOpenShadeModal,
      selectedShadeGuide,
      setSelectedShadeGuide,
      selectedShadesForSVG,
      setSelectedShadesForSVG,
      shadeGuideOptions,
      showValidationErrors,
      retentionPopoverState,
      setRetentionPopoverState,
      handleMaxillaryToothToggle,
      handleSelectRetentionType,
      handleMaxillaryToothDeselect,
      handleMandibularToothToggle,
      handleMandibularToothDeselect,
      shouldShowImplantPopover,
      implantPopoverState,
      setImplantPopoverState,
      handleMissingTeethCardClick,
      productDetails,
      isOrthodonticsOrRemovable,
      setMaxillaryTeeth,
      setOpenAccordionMaxillary,
      setOpenAccordionMandibular,
      isSubmitting,
      confirmDetailsChecked,
      setConfirmDetailsChecked,
      showSubmitPopover,
      setShowSubmitPopover,
      hasAtLeastOneCompleteProduct,
      handlePreview,
      handleSubmit,
      getPreviewCaseData,
      showCaseSummaryNotes,
      setShowCaseSummaryNotes,
      isCaseSummaryExpanded,
      setIsCaseSummaryExpanded,
      getCaseSummaryMaxillaryContent,
      getCaseSummaryMandibularContent,
      setCaseSummaryFromParts,
      previousNotesRef,
      parseCaseNotes,
      generateCaseNotes,
      isToothShadeFilled,
      areAllCurrentProductFieldsFilled,
      showImplantCards,
      setShowImplantCards,
      activeImplantFieldKey,
      setActiveImplantFieldKey,
      implantSelectionStep,
      setImplantSelectionStep,
      clickedFieldTypeInForm,
      setClickedFieldTypeInForm,
      implantCardsRef,
      getAdvanceFieldByName,
      renderSavedAdvanceField,
      impressionModalJustClosedRef,
      debouncedAutoSaveProduct,
      handleImpressionQuantityUpdate,
      getImpressionSelections,
      stlFilesByImpression,
      setStlFilesByImpression,
    }),
    [
      selectedDoctor,
      selectedLab,
      patientData,
      createdBy,
      searchQuery,
      selectedCategory,
      selectedCategoryId,
      selectedSubcategory,
      selectedSubcategoryId,
      showSubcategories,
      showProducts,
      products,
      isLoadingProducts,
      selectedProduct,
      showProductDetails,
      productDetails,
      isLoadingProductDetails,
      selectedArchForProduct,
      showMaxillaryChart,
      showMandibularChart,
      selectedProductForMaxillary,
      selectedProductForMandibular,
      maxillaryTeeth,
      mandibularTeeth,
      maxillaryRetentionTypes,
      mandibularRetentionTypes,
      showSubcategoriesLeftArrow,
      showSubcategoriesRightArrow,
      showProductsLeftArrow,
      showProductsRightArrow,
      mainCategories,
      filteredSubcategories,
      filteredProducts,
      allCategoriesLoading,
      subcategoriesLoading,
      subcategoriesError,
      savedProductSectionContextValue,
      showArchSelectionPopover,
      pendingProductForArchSelection,
      archSelectionPopoverAnchor,
      hasUnsavedWork,
      showRefreshWarningModal,
      showCancelModal,
      showPreviewModal,
      showImpressionModal,
      currentImpressionArch,
      selectedImpressions,
      currentProductForImpression,
      showShadeModal,
      currentShadeField,
      currentShadeArch,
      currentShadeProductId,
      selectedShadeGuide,
      selectedShadesForSVG,
      maxillaryShadeId,
      mandibularShadeId,
      maxillaryGumShadeId,
      mandibularGumShadeId,
      isInitialLoading,
      isLoadingProductDetails,
      maxillaryMaterial,
      mandibularMaterial,
      maxillaryRetention,
      mandibularRetention,
      maxillaryStumpShade,
      mandibularStumpShade,
      maxillaryToothShade,
      mandibularToothShade,
      maxillaryStage,
      mandibularStage,
      maxillaryImplantDetails,
      mandibularImplantDetails,
      advanceFieldValues,
      selectedImplantBrandForDetails,
      selectedImplantPlatformForDetails,
      selectedImplantBrand,
      selectedImplantPlatform,
      selectedImplantSize,
      selectedImplantPlatformData,
      showImplantBrandCardsInFields,
      clickedFieldTypeInImplantDetails,
      fieldConfigs,
      productDetails,
      selectedShadeGuide,
      selectedShadesForSVG,
      shadeGuideOptions,
      showValidationErrors,
      retentionPopoverState,
      implantPopoverState,
      productDetails,
      isOrthodonticsOrRemovable,
      isSubmitting,
      confirmDetailsChecked,
      showSubmitPopover,
      hasAtLeastOneCompleteProduct,
      getPreviewCaseData,
      showCaseSummaryNotes,
      isCaseSummaryExpanded,
      getCaseSummaryMaxillaryContent,
      getCaseSummaryMandibularContent,
      setCaseSummaryFromParts,
      previousNotesRef,
      parseCaseNotes,
      generateCaseNotes,
      isToothShadeFilled,
      areAllCurrentProductFieldsFilled,
      showImplantCards,
      activeImplantFieldKey,
      implantSelectionStep,
      clickedFieldTypeInForm,
      getAdvanceFieldByName,
      renderSavedAdvanceField,
      debouncedAutoSaveProduct,
      handleImpressionQuantityUpdate,
      getImpressionSelections,
      stlFilesByImpression,
    ]
  )
  return caseDesignCenterValue
}
