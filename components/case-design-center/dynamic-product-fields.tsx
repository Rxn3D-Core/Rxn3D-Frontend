"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getShadeGradientColors } from "@/utils/teeth-shade-utils"
import { Check, ChevronDown, Trash2, Zap, Paperclip } from "lucide-react"
import { ImplantBrandCards } from "@/components/implant-brand-cards"
import { ImplantPlatformCards } from "@/components/implant-platform-cards"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ImplantDetailForm } from "@/components/implant-detail-form"

export interface FieldConfig {
  key: string
  label: string
  apiProperty: string
  fieldType: "select" | "modal" | "shade" | "text"
  sequence: number
  maxillaryStateKey?: string
  mandibularStateKey?: string
  maxillaryIdKey?: string
  mandibularIdKey?: string
  dependsOn?: string
  rowGroup?: number
}

export type DynamicProductFieldsMode = "edit" | "display" | "readonly-locked" | "saved"
export type DynamicProductFieldsLayout = "grid" | "accordion-compact"

interface DynamicProductFieldsProps {
  productDetails: any
  savedProduct: any
  arch: "maxillary" | "mandibular"
  fieldConfigs: FieldConfig[]
  onFieldChange: (fieldKey: string, value: string, id?: number) => void
  onOpenImpressionModal?: () => void
  getImpressionCount?: () => number
  getImpressionDisplayText?: () => string
  onOpenShadeModal?: (fieldKey: string, arch?: "maxillary" | "mandibular") => void
  shadeColors?: Record<string, string> // Map of shade names to gradient colors
  maxillaryRetentionTypes?: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  mandibularRetentionTypes?: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  maxillaryTeeth?: number[]
  mandibularTeeth?: number[]
  // Implant brand cards props
  showImplantBrandCards?: boolean
  implantsLoading?: boolean
  implants?: Array<{
    id: number
    brand_name: string
    system_name: string
    code: string
    image_url?: string
    platforms?: Array<{
      id: number
      name: string
      image?: string
    }>
  }>
  selectedImplantId?: number | null
  onSelectImplant?: (implant: any) => void
  onImplantDetailsFieldClick?: () => void
  // Implant platform cards props
  selectedImplantPlatformId?: number | null
  onSelectImplantPlatform?: (platform: any) => void
  // Callbacks for when brand/platform fields are clicked (for normal mode)
  onBrandFieldClick?: (() => void) | ((productId: string, arch: "maxillary" | "mandibular") => void)
  onPlatformFieldClick?: (() => void) | ((productId: string, arch: "maxillary" | "mandibular") => void)
  // Implant selection state (for checking if implant fields are completed)
  selectedImplantBrand?: { [fieldKey: string]: number | null }
  selectedImplantPlatform?: { [fieldKey: string]: number | null }
  selectedImplantSize?: { [fieldKey: string]: string | null }
  // Hide fields during shade selection (to focus user on shade selection)
  hideFieldsDuringShadeSelection?: boolean
  // Hide impression field (to render it separately after advance fields)
  hideImpression?: boolean
  // Mode for different usage contexts
  mode?: DynamicProductFieldsMode
  // Disable auto-opening of modals (for accordion view)
  disableAutoOpen?: boolean
  // Layout variant
  layout?: DynamicProductFieldsLayout
  // Fields that should be read-only/locked
  lockedFields?: string[]
  // Override field visibility logic (for accordion view using isAccordionFieldVisible)
  fieldVisibilityOverride?: (fieldKey: string, arch: "maxillary" | "mandibular") => boolean | undefined
  // Props for saved product card UI (when mode is "saved")
  onSaveProduct?: () => void
  onDeleteProduct?: (productId: string) => void
  onCardClick?: (product: any) => void
  isAccordionOpen?: boolean
  onAccordionChange?: (value: string) => void
  showActionButtons?: boolean
  onAddOnsClick?: () => void
  onAttachFilesClick?: () => void
  onRushClick?: () => void
  getTotalAddOnsCount?: () => number
  getAttachedFilesCount?: () => number
  showNotes?: boolean
  showImplantDetails?: boolean
  // For saved product card - product info
  productId?: string
  product?: any
  category?: string
  subcategory?: string
  rushData?: any
  // For notes display
  notes?: string
  // For checking retention type selection
  hasRetentionTypeSelected?: (arch: "maxillary" | "mandibular") => boolean
}

// Stage Selection Modal Component
interface StageSelectionModalProps {
  stages: any[]
  selectedStage?: string
  onSelect: (stageName: string, stageId?: number) => void
  onClose: () => void
}

function StageSelectionModal({ stages, selectedStage, onSelect, onClose }: StageSelectionModalProps) {
  // Stage names mapping (based on the image description)
  const stageNames = [
    "Custom tray",
    "Bite Block",
    "Bite block with metal / mesh",
    "Duplicate denture",
    "Try in with teeth",
    "Finish"
  ]

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4">
          <DialogTitle className="text-xl font-semibold" style={{
            fontFamily: 'Verdana',
            fontWeight: 700,
            fontSize: '30px',
            letterSpacing: '-0.02em'
          }}>
            Select stage
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stages.slice(0, 6).map((stage, index) => {
              const stageName = stage.name || stageNames[index] || `Stage ${index + 1}`
              // Check selection by name, id, or stage_id
              const isSelected = selectedStage === stageName || 
                                selectedStage === stage.id?.toString() || 
                                selectedStage === stage.stage_id?.toString()
              // Use id as primary, fallback to stage_id
              const stageId = stage.id || stage.stage_id

              return (
                <div
                  key={stage.id || stage.name || index}
                  onClick={() => onSelect(stageName, stageId)}
                  className={cn(
                    "relative border-2 rounded-xl overflow-hidden transition-all duration-200 bg-white flex flex-col cursor-pointer",
                    isSelected
                      ? "border-blue-500 shadow-xl"
                      : "border-gray-300 hover:border-blue-500 hover:shadow-lg"
                  )}
                  style={{
                    minHeight: '280px',
                    padding: '8.19608px 26.2275px',
                    gap: '10px'
                  }}
                >
                  {/* Stage image */}
                  <div
                    className="w-full bg-gray-50 overflow-hidden relative flex items-center justify-center"
                    style={{
                      height: '201.62px',
                      borderRadius: '8.19608px',
                      border: '1px solid #E0E0E0'
                    }}
                  >
                    {stage.image_url ? (
                      <img
                        src={stage.image_url}
                        alt={stageName}
                        className="max-w-full max-h-full object-contain object-center"
                        style={{
                          borderRadius: '8.19608px'
                        }}
                        onError={(e) => {
                          // Hide image on error and show fallback
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          const parent = target.parentElement
                          if (parent && !parent.querySelector('.fallback-letter')) {
                            const fallbackDiv = document.createElement('div')
                            fallbackDiv.className = 'fallback-letter text-gray-400 text-2xl font-bold flex items-center justify-center absolute inset-0'
                            fallbackDiv.textContent = stageName.charAt(0).toUpperCase()
                            parent.appendChild(fallbackDiv)
                          }
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-2xl font-bold flex items-center justify-center absolute inset-0">
                        {stageName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Stage label */}
                  <div
                    className="flex items-center justify-center text-center"
                    style={{
                      fontFamily: 'Verdana',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '22.949px',
                      lineHeight: '25px',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      minHeight: stageName.length > 20 ? '50px' : '25px',
                      paddingTop: '10px'
                    }}
                  >
                    {stageName}
                  </div>
                </div>
              )
            })}
          </div>

          {stages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No stages available
            </div>
          )}
        </div>

        {/* Footer with action button */}
        <div className="border-t p-4 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            style={{
              border: '2px solid #9BA5B7',
              borderRadius: '6px',
              fontFamily: 'Verdana',
              fontWeight: 700,
              fontSize: '12px',
              color: '#9BA5B7'
            }}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DynamicProductFields({
  productDetails,
  savedProduct,
  arch,
  fieldConfigs,
  onFieldChange,
  onOpenImpressionModal,
  getImpressionCount,
  getImpressionDisplayText,
  onOpenShadeModal,
  shadeColors = {},
  maxillaryRetentionTypes = {},
  mandibularRetentionTypes = {},
  maxillaryTeeth = [],
  mandibularTeeth = [],
  showImplantBrandCards = false,
  implantsLoading = false,
  implants = [],
  selectedImplantId = null,
  onSelectImplant,
  onImplantDetailsFieldClick,
  selectedImplantPlatformId = null,
  onSelectImplantPlatform,
  onBrandFieldClick,
  onPlatformFieldClick,
  selectedImplantBrand = {},
  selectedImplantPlatform = {},
  selectedImplantSize = {},
  hideFieldsDuringShadeSelection = false,
  hideImpression = false,
  mode = "edit",
  disableAutoOpen = false,
  layout = "grid",
  lockedFields = [],
  fieldVisibilityOverride,
  // Saved product card props
  onSaveProduct,
  onDeleteProduct,
  onCardClick,
  isAccordionOpen = false,
  onAccordionChange,
  showActionButtons = false,
  onAddOnsClick,
  onAttachFilesClick,
  onRushClick,
  getTotalAddOnsCount,
  getAttachedFilesCount,
  showNotes = false,
  showImplantDetails = false,
  productId,
  product,
  category,
  subcategory,
  rushData,
  notes,
  hasRetentionTypeSelected,
}: DynamicProductFieldsProps) {
  // State for stage selection modal
  const [isStageModalOpen, setIsStageModalOpen] = useState(false)

  // State for tracking focused field
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null)

  // Refs for field elements to enable auto-focus
  const fieldRefs = useRef<Record<string, HTMLButtonElement | HTMLDivElement | null>>({})
  // Stable ref callbacks per key to avoid "Maximum update depth" with Radix compose-refs
  const fieldRefCallbacks = useRef<Record<string, (el: HTMLButtonElement | HTMLDivElement | null) => void>>({})
  const getFieldRefCallback = useCallback((key: string) => {
    if (!fieldRefCallbacks.current[key]) {
      fieldRefCallbacks.current[key] = (el) => {
        fieldRefs.current[key] = el
      }
    }
    return fieldRefCallbacks.current[key]
  }, [])
  // Prevent shade auto-open from firing repeatedly (mandibular/maxillary loop)
  const autoOpenedShadeRef = useRef<Record<string, boolean>>({})
  // Only auto-open stage modal once when conditions become true (avoids loop from unstable productDetails/savedProduct)
  const autoOpenedStageModalRef = useRef<boolean>(false)
  // Only notify parent for platform step once per entry (avoids loop from unstable onPlatformFieldClick)
  const platformNotifyDoneRef = useRef<boolean>(false)
  // Only set auto-focus once per firstEmptyField (avoids repeated setState when deps are unstable)
  const autoFocusedKeyRef = useRef<string | null>(null)

  // Helper to get the first empty required field key
  const getFirstEmptyRequiredFieldKey = useCallback((): string | null => {
    // Order of required fields by sequence
    const requiredFieldOrder = ["material", "retention", "stump_shade", "tooth_shade", "stage"]

    for (const fieldKey of requiredFieldOrder) {
      const config = fieldConfigs.find(f => f.key === fieldKey)
      if (!config) continue

      // Check if the field is visible
      const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
      if (!stateKey) continue

      const fieldValue = savedProduct[stateKey as keyof typeof savedProduct] as string | undefined

      // Check if field is empty
      if (!fieldValue || fieldValue.trim() === "" || fieldValue.toLowerCase() === "not specified" || fieldValue.toLowerCase().startsWith("select")) {
        return fieldKey
      }
    }

    return null
  }, [fieldConfigs, savedProduct, arch])

  // Auto-focus the first empty required field (ref guard prevents loop when deps are unstable)
  useEffect(() => {
    if (hideFieldsDuringShadeSelection) return

    const firstEmptyField = getFirstEmptyRequiredFieldKey()
    if (!firstEmptyField) {
      autoFocusedKeyRef.current = null
      return
    }
    if (firstEmptyField === focusedFieldKey) return
    if (autoFocusedKeyRef.current === firstEmptyField) return

    const timer = setTimeout(() => {
      const fieldRef = fieldRefs.current[firstEmptyField]
      if (fieldRef) {
        autoFocusedKeyRef.current = firstEmptyField
        setFocusedFieldKey(firstEmptyField)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [savedProduct, arch, fieldConfigs, focusedFieldKey, hideFieldsDuringShadeSelection])

  // State to track implant selection step: 'brand' | 'platform'
  const [implantSelectionStep, setImplantSelectionStep] = useState<'brand' | 'platform'>('brand')
  
  // Get selected brand to show its platforms
  const selectedBrand = selectedImplantId ? implants.find((imp: any) => imp.id === selectedImplantId) : null
  const platforms = selectedBrand?.platforms || []
  
  // Map platforms for platform selection
  const mappedPlatforms = platforms.map((plat: any) => ({
    id: plat.id || 0,
    name: plat.name,
    image: plat.image_url || plat.image
  }))
  
  // Reset to brand step when cards are shown (if no brand selected) or when cards are hidden
  useEffect(() => {
    if (showImplantBrandCards && !selectedImplantId) {
      // When cards are first shown, start with brand selection
      setImplantSelectionStep('brand')
    } else if (!showImplantBrandCards) {
      // When cards are hidden, reset to brand step
      setImplantSelectionStep('brand')
    }
  }, [showImplantBrandCards, selectedImplantId])

  // Notify parent when selection step changes to platform (ref guard prevents loop when onPlatformFieldClick is unstable)
  useEffect(() => {
    if (!showImplantBrandCards || implantSelectionStep !== 'platform' || !onPlatformFieldClick || !selectedImplantId || platforms.length === 0) {
      platformNotifyDoneRef.current = false
      return
    }
    if (platformNotifyDoneRef.current) return
    platformNotifyDoneRef.current = true

    const timer = setTimeout(() => {
      try {
        (onPlatformFieldClick as any)()
      } catch (e) {
        // If it requires arguments, skip the call (it's for saved mode)
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [implantSelectionStep, showImplantBrandCards, selectedImplantId, platforms.length, onPlatformFieldClick])
  
  // Determine if we should show platform cards or brand cards
  // Show platform cards if brand is selected, has platforms, and we're on platform step
  const shouldShowPlatformCards = showImplantBrandCards && 
    selectedImplantId !== null && 
    selectedImplantId !== undefined && 
    platforms.length > 0 && 
    implantSelectionStep === 'platform'
  
  // Show brand cards if cards are shown, implants exist, and (we're on brand step OR no brand selected OR brand has no platforms)
  const shouldShowBrandCards = showImplantBrandCards && 
    implants && 
    implants.length > 0 && 
    (implantSelectionStep === 'brand' || !selectedImplantId || platforms.length === 0)

  // Helper to check if a value is actually set (not empty, not "Not specified", not "Select...", not undefined, not null)
  const hasValue = (value: string | undefined | null): boolean => {
    if (!value) return false
    const trimmed = String(value).trim()
    const lowerTrimmed = trimmed.toLowerCase()
    return trimmed !== "" && 
           lowerTrimmed !== "not specified" && 
           !lowerTrimmed.startsWith("select")
  }

  // Helper to check if retention value is valid (not empty, not placeholder)
  const hasValidRetentionValue = (retentionValue: string | undefined | null): boolean => {
    if (!retentionValue) return false
    const trimmed = String(retentionValue).trim()
    const lowerTrimmed = trimmed.toLowerCase()
    return trimmed !== '' && 
           trimmed !== 'Not specified' && 
           trimmed !== 'Select' && 
           trimmed !== 'Select Retention type' &&
           !lowerTrimmed.startsWith("select")
  }

  // Helper to get field value
  const getFieldValueByKey = (fieldKey: string): string | undefined => {
    const config = fieldConfigs.find(f => f.key === fieldKey)
    if (!config) return undefined
    const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
    if (!stateKey) return undefined
    return savedProduct[stateKey as keyof typeof savedProduct] as string | undefined
  }

  // Helper to check if any tooth has a retention type selected from popover
  const checkRetentionTypeSelected = (): boolean => {
    // Use prop function if provided (for saved mode)
    if (hasRetentionTypeSelected) {
      return hasRetentionTypeSelected(arch)
    }

    const teeth = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth
    const retentionTypes = arch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes

    // If retention already has a saved value, show the field (for saved products)
    const retentionValue = getFieldValueByKey("retention")
    if (hasValue(retentionValue)) {
      return true
    }

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

  // Helper to check if retention type is "Implant"
  const isRetentionTypeImplant = (): boolean => {
    const teeth = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth
    const retentionTypes = arch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes

    // If no teeth are selected, return false
    if (!teeth || teeth.length === 0) {
      return false
    }

    // Check if any tooth has "Implant" as retention type
    const hasImplant = teeth.some(toothNumber => {
      const types = retentionTypes[toothNumber] || []
      return types.includes('Implant')
    })

    return hasImplant
  }

  // Helper to check if stage field is visible (used by impression field check)
  const isStageFieldVisible = (): boolean => {
    const toothShadeValue = getFieldValueByKey("tooth_shade")
    const stages = productDetails?.stages
    
    // Stage field is not visible if:
    // 1. Tooth shade doesn't have a value
    // 2. Stages don't exist in productDetails
    if (!hasValue(toothShadeValue)) {
      return false
    }
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return false
    }
    
    return true
  }

  // Helper to check if a field should be visible based on progressive disclosure
  const isFieldVisibleProgressive = (config: FieldConfig): boolean => {
    // Check field visibility override first (e.g., from accordion view using isAccordionFieldVisible)
    if (fieldVisibilityOverride) {
      const override = fieldVisibilityOverride(config.key, arch)
      if (override !== undefined) {
        return override
      }
    }

    // Always show material (sequence 1) initially
    if (config.sequence === 1) {
      return true
    }
    
    // For retention (sequence 2), only show if retention type selected from popover
    if (config.sequence === 2 || config.key === "retention") {
      return checkRetentionTypeSelected()
    }

    // retention_option (sequence 3) - show after retention has value
    if (config.key === "retention_option") {
      const retentionValue = getFieldValueByKey("retention")
      return hasValue(retentionValue)
    }

    // stage (sequence 4) - show after retention has value and stages exist
    if (config.key === "stage") {
      const retentionValue = getFieldValueByKey("retention")
      if (!hasValue(retentionValue)) {
        return false
      }
      const stages = productDetails?.stages
      if (!stages || !Array.isArray(stages) || stages.length === 0) {
        return false
      }
      return true
    }

    // stump_shade (sequence 5) - show after stage field is visible AND has value (for both maxillary and mandibular)
    if (config.key === "stump_shade") {
      // First check if stage field is visible (retention filled and stages exist)
      const retentionValue = getFieldValueByKey("retention")
      if (!hasValue(retentionValue)) {
        return false
      }
      const stages = productDetails?.stages
      if (!stages || !Array.isArray(stages) || stages.length === 0) {
        return false
      }
      // Then check if stage has a value
      const stageValue = getFieldValueByKey("stage")
      return hasValue(stageValue)
    }

    // tooth_shade (sequence 6) - show after stump_shade has value (for both maxillary and mandibular)
    if (config.key === "tooth_shade") {
      const stumpShadeValue = getFieldValueByKey("stump_shade")
      return hasValue(stumpShadeValue)
    }

    // impression (sequence 7) - show after advance fields if they exist, otherwise after tooth_shade
    if (config.key === "impression" || config.key === "impressions") {
      // First check if tooth_shade has value (required for impression regardless of other conditions)
      const toothShadeValue = getFieldValueByKey("tooth_shade")
      if (!hasValue(toothShadeValue)) {
        return false
      }

      // Check if there are any advance fields in productDetails
      const advanceFields = productDetails?.advance_fields || []

      // Filter out stump_shade from advance fields check (we use main stump shade field)
      const filteredAdvanceFields = advanceFields.filter((field: any) => {
        const fieldNameLower = (field.name || "").toLowerCase()
        return !(fieldNameLower.includes("stump") && fieldNameLower.includes("shade"))
      })

      const hasAdvanceFields = Array.isArray(filteredAdvanceFields) && filteredAdvanceFields.length > 0

      // If NO advance fields exist, show impression directly after tooth_shade
      if (!hasAdvanceFields) {
        return true // tooth_shade already checked above
      }

      // If advance fields exist, check if retention type is "Implant"
      // If retention type is NOT "Implant", skip advance fields and show impression directly
      const retentionIsImplant = isRetentionTypeImplant()

      if (!retentionIsImplant) {
        return true // tooth_shade already checked above
      }

      // If retention type IS "Implant" and advance fields exist, check if they are completed
      // For implant_library fields, check if brand, platform, size, inclusions, abutment detail, and abutment type are selected
      const allAdvanceFieldsCompleted = filteredAdvanceFields.every((field: any) => {
        // Check if this is an implant_library field (implant details)
        if (field.field_type === "implant_library") {
          // Check if all implant detail form fields are completed
          // We must check ALL individual fields to ensure the form is fully completed
          // Check via state variables first (for unsaved products)
          const fieldKey = `advance_${field.id}`
          const brandId = selectedImplantBrand[fieldKey]
          const platformId = selectedImplantPlatform[fieldKey]
          const size = selectedImplantSize[fieldKey]

          // Check if brand, platform, and size are set (using more robust checks)
          const hasBrand = brandId !== null && brandId !== undefined && brandId !== 0
          const hasPlatform = platformId !== null && platformId !== undefined && platformId !== 0
          const hasSizeValue = size !== null && size !== undefined && size !== "" && size.trim() !== ""

          // Also check inclusions, abutment detail, and abutment type from savedProduct
          const implantInclusions = arch === "maxillary"
            ? savedProduct.maxillaryImplantInclusions
            : savedProduct.mandibularImplantInclusions
          const abutmentDetail = arch === "maxillary"
            ? savedProduct.maxillaryAbutmentDetail
            : savedProduct.mandibularAbutmentDetail
          const abutmentType = arch === "maxillary"
            ? savedProduct.maxillaryAbutmentType
            : savedProduct.mandibularAbutmentType

          // Check if all required fields are filled
          // Use strict checks - all fields must have valid values (not empty, not "Select...", not placeholder)
          const hasInclusions = hasValue(implantInclusions)
          const hasAbutmentDetail = hasValue(abutmentDetail)
          const hasAbutmentType = hasValue(abutmentType)

          // All fields must be completed: brand, platform, size, inclusions, abutment detail, and abutment type
          // This is a strict check - ALL fields must be filled before impression field shows
          return hasBrand && hasPlatform && hasSizeValue && hasInclusions && hasAbutmentDetail && hasAbutmentType
        }

        // For other advance field types, check if they have values in savedProduct.advanceFields
        if (savedProduct.advanceFields && Array.isArray(savedProduct.advanceFields)) {
          const savedField = savedProduct.advanceFields.find((af: any) => af.advance_field_id === field.id)
          if (savedField) {
            const fieldValue = savedField.advance_field_value || ""
            return hasValue(fieldValue)
          }
        }

        // If no saved field found, assume not completed
        return false
      })

      // Show impression only when all advance fields are completed
      return allAdvanceFieldsCompleted
    }

    // Other fields (sequence >= 7) - show after stage has value
    if (config.sequence >= 7) {
      const stageValue = getFieldValueByKey("stage")
      return hasValue(stageValue)
    }

    // For any other fields, check dependencies first
    if (config.dependsOn) {
      const dependencyValue = getFieldValueByKey(config.dependsOn)
      if (!hasValue(dependencyValue)) {
        return false
      }
    }

    return true
  }

  // Auto-open stage modal when stage field becomes visible and value is empty (ref guard prevents loop from unstable deps)
  useEffect(() => {
    if (disableAutoOpen || hideFieldsDuringShadeSelection) return

    const stageConfig = fieldConfigs.find(f => f.key === "stage")
    if (!stageConfig) return

    const stageValue = getFieldValueByKey("stage")
    const stages = productDetails?.stages
    const isVisible = isFieldVisibleProgressive(stageConfig)
    const isNotSpecified = !hasValue(stageValue)

    if (!isVisible || !isNotSpecified || !stages?.length) {
      autoOpenedStageModalRef.current = false
      return
    }
    if (autoOpenedStageModalRef.current) return
    autoOpenedStageModalRef.current = true

    const timer = setTimeout(() => {
      setIsStageModalOpen(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [productDetails, savedProduct, arch, fieldConfigs, disableAutoOpen, hideFieldsDuringShadeSelection])

  // Auto-open shade modal when stump_shade or tooth_shade field becomes visible and value is empty (once per arch+field to avoid loop)
  useEffect(() => {
    // Skip auto-open when disabled (e.g., in accordion view) or when fields are hidden during shade selection
    if (disableAutoOpen || hideFieldsDuringShadeSelection) return

    const shadeKey = `${arch}_stump_shade`
    // Check stump_shade field
    const stumpShadeConfig = fieldConfigs.find(f => f.key === "stump_shade")
    if (stumpShadeConfig) {
      const stumpShadeValue = getFieldValueByKey("stump_shade")
      const isStumpShadeVisible = isFieldVisibleProgressive(stumpShadeConfig)
      const isStumpShadeEmpty = !hasValue(stumpShadeValue)
      // Reset ref when field gets a value so we can auto-open again if user clears it
      if (!isStumpShadeEmpty) {
        autoOpenedShadeRef.current[shadeKey] = false
      }
      if (isStumpShadeVisible && isStumpShadeEmpty && onOpenShadeModal && !autoOpenedShadeRef.current[shadeKey]) {
        const timer = setTimeout(() => {
          // Double-check the ref inside timeout in case another source already opened it
          if (autoOpenedShadeRef.current[shadeKey]) return
          // Set the ref inside the timeout to ensure it's only marked as opened when the modal actually opens
          autoOpenedShadeRef.current[shadeKey] = true
          setFocusedFieldKey("stump_shade")
          onOpenShadeModal("stump_shade", arch)
        }, 200)

        return () => clearTimeout(timer)
      }
    }
  }, [productDetails, savedProduct, arch, fieldConfigs, onOpenShadeModal, disableAutoOpen, hideFieldsDuringShadeSelection])

  // Auto-open shade modal when tooth_shade field becomes visible and value is empty (once per arch+field to avoid loop)
  useEffect(() => {
    // Skip auto-open when disabled (e.g., in accordion view) or when fields are hidden during shade selection
    if (disableAutoOpen || hideFieldsDuringShadeSelection) return

    const shadeKey = `${arch}_tooth_shade`
    // Check tooth_shade field
    const toothShadeConfig = fieldConfigs.find(f => f.key === "tooth_shade")
    if (toothShadeConfig) {
      const toothShadeValue = getFieldValueByKey("tooth_shade")
      const isToothShadeVisible = isFieldVisibleProgressive(toothShadeConfig)
      const isToothShadeEmpty = !hasValue(toothShadeValue)
      if (!isToothShadeEmpty) {
        autoOpenedShadeRef.current[shadeKey] = false
      }
      if (isToothShadeVisible && isToothShadeEmpty && onOpenShadeModal && !autoOpenedShadeRef.current[shadeKey]) {
        const timer = setTimeout(() => {
          // Double-check the ref inside timeout in case another source already opened it
          if (autoOpenedShadeRef.current[shadeKey]) return
          // Set the ref inside the timeout to ensure it's only marked as opened when the modal actually opens
          autoOpenedShadeRef.current[shadeKey] = true
          setFocusedFieldKey("tooth_shade")
          onOpenShadeModal("tooth_shade", arch)
        }, 200)

        return () => clearTimeout(timer)
      }
    }
  }, [productDetails, savedProduct, arch, fieldConfigs, onOpenShadeModal, disableAutoOpen, hideFieldsDuringShadeSelection])

  // Note: Impression modal auto-open is disabled. It will only open when the user clicks on the impression field.

  // Helper to check if all required fields are filled (for showing advance fields)
  const areAllRequiredFieldsFilled = (): boolean => {
    const materialValue = getFieldValueByKey("material")
    const retentionValue = getFieldValueByKey("retention")
    const stumpShadeValue = getFieldValueByKey("stump_shade")
    const toothShadeValue = getFieldValueByKey("tooth_shade")
    const stageValue = getFieldValueByKey("stage")

    // Check all required fields
    const hasMaterial = hasValue(materialValue)
    const hasRetention = hasValue(retentionValue)
    const hasStumpShade = hasValue(stumpShadeValue) // Both maxillary and mandibular have stump shade
    const hasToothShade = hasValue(toothShadeValue)
    const hasStage = hasValue(stageValue)

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage
  }

  // Filter and sort fields that should be displayed (excluding impression, which will be rendered separately)
  const visibleFields = fieldConfigs
    .filter(config => {
      // Exclude impression field from main list - it will be rendered separately after advance fields
      if (config.key === "impression" || config.key === "impressions") {
        return false
      }

      // Note: We no longer filter out fields during shade selection here
      // Instead, we use CSS to hide them to avoid unmounting/remounting Select components
      // which causes infinite loop issues with Radix UI's compose-refs

      // For readonly-locked mode (accordion view), check fieldVisibilityOverride first
      // This allows fields with saved values to be shown even if productDetails doesn't have the API data
      if (mode === "readonly-locked" && fieldVisibilityOverride) {
        const override = fieldVisibilityOverride(config.key, arch)
        if (override !== undefined) {
          // If override returns true and the field has a saved value, show it
          if (override === true) {
            // Check if there's a saved value for this field
            const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
            if (stateKey) {
              const savedValue = savedProduct[stateKey as keyof typeof savedProduct] as string | undefined
              if (savedValue && savedValue.trim() !== "" &&
                  savedValue.toLowerCase() !== "not specified" &&
                  !savedValue.toLowerCase().startsWith("select")) {
                return true
              }
            }
          }
          // If override returns false explicitly, hide the field
          if (override === false) {
            return false
          }
        }
      }

      if (!productDetails) return false
      const apiData = productDetails[config.apiProperty]
      if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
        return false
      }

      // Progressive disclosure: hide fields initially, show them one by one as previous fields are filled
      if (!isFieldVisibleProgressive(config)) {
        return false
      }

      // Check dependencies (for fields that have explicit dependsOn)
      if (config.dependsOn) {
        const dependencyConfig = fieldConfigs.find(f => f.key === config.dependsOn)
        if (dependencyConfig) {
          const dependencyValue = arch === "maxillary"
            ? savedProduct[dependencyConfig.maxillaryStateKey as keyof typeof savedProduct] as string
            : savedProduct[dependencyConfig.mandibularStateKey as keyof typeof savedProduct] as string
          if (!dependencyValue || dependencyValue.trim() === "") {
            return false
          }
          // For retention_options, check if selected retention has options
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
    })
    .sort((a, b) => a.sequence - b.sequence)

  // Get impression field config separately
  const impressionConfig = fieldConfigs.find(f => f.key === "impression" || f.key === "impressions")
  const shouldShowImpression = impressionConfig && 
    productDetails?.[impressionConfig.apiProperty] &&
    Array.isArray(productDetails[impressionConfig.apiProperty]) &&
    productDetails[impressionConfig.apiProperty].length > 0 &&
    isFieldVisibleProgressive(impressionConfig)

  // Group fields by rowGroup
  const fieldsByRow = visibleFields.reduce((acc, field) => {
    const row = field.rowGroup || 0
    if (!acc[row]) acc[row] = []
    acc[row].push(field)
    return acc
  }, {} as Record<number, FieldConfig[]>)

  const getFieldValue = (config: FieldConfig): string => {
    const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
    if (!stateKey) return ""
    const value = savedProduct[stateKey as keyof typeof savedProduct] as string
    return value || ""
  }

  const getFieldId = (config: FieldConfig): number | undefined => {
    const idKey = arch === "maxillary" ? config.maxillaryIdKey : config.mandibularIdKey
    if (!idKey) return undefined
    return savedProduct[idKey as keyof typeof savedProduct] as number | undefined
  }

  const getFieldOptions = (config: FieldConfig): any[] => {
    const apiData = productDetails[config.apiProperty]
    if (!apiData || !Array.isArray(apiData)) return []

    // For retention_options, filter by selected retention
    if (config.key === "retention_option" && productDetails.retention_options) {
      const selectedRetentionId = arch === "maxillary"
        ? savedProduct.maxillaryRetentionId
        : savedProduct.mandibularRetentionId
      return apiData.filter((opt: any) => opt.retention_id === selectedRetentionId)
    }

    return apiData
  }

  // Helper function to calculate responsive width for Stage and Impression fields
  // In 2-column layout, fields will fill their container (50% width)
  const getResponsiveFieldWidth = (config: FieldConfig, displayValue: string, options?: any[]): {
    minWidth?: string
    maxWidth?: string
    width?: string
    flex?: string
  } => {
    // For 2-column layout, fields should fill their container
    // No need for custom width calculations as parent handles sizing
    return {
      width: '100%'
    }
  }

  // Helper to check if a field is required
  const isFieldRequired = (config: FieldConfig): boolean => {
    // All standard fields are required (material, retention, stump_shade, tooth_shade, stage, impression)
    const requiredFields = ["material", "retention", "stump_shade", "tooth_shade", "stage", "impression"]
    return requiredFields.includes(config.key)
  }

  // Helper to check if field should show red border (value is empty, "Not specified", or "Select..." and field is required)
  const shouldShowRedBorder = (config: FieldConfig, value: string | undefined): boolean => {
    if (!isFieldRequired(config)) return false
    if (!value) return true
    const trimmed = String(value).trim().toLowerCase()
    return trimmed === "" || trimmed === "not specified" || trimmed.startsWith("select")
  }

  // Helper to check if impression field has a value
  const hasImpressionValue = (impressionCount: number | undefined, displayText: string | undefined): boolean => {
    // If displayText exists and is not empty, check if it's a placeholder
    if (displayText && displayText.trim() !== "") {
      const lowerText = displayText.toLowerCase().trim()
      // If it's not a placeholder text, it has a value
      const isPlaceholder = lowerText.startsWith("select") || 
                           lowerText === "not specified" ||
                           lowerText === "select impression"
      // If it's not a placeholder, it has a value
      if (!isPlaceholder) {
        return true
      }
    }
    // Fallback: check impressionCount
    if (impressionCount !== undefined && impressionCount > 0) {
      return true
    }
    return false
  }

  // Helper to check if all required fields have valid values (for green border)
  const areAllRequiredFieldsFilledForGreenBorder = (): boolean => {
    const materialValue = getFieldValueByKey("material")
    const retentionValue = getFieldValueByKey("retention")
    const stumpShadeValue = getFieldValueByKey("stump_shade")
    const toothShadeValue = getFieldValueByKey("tooth_shade")
    const stageValue = getFieldValueByKey("stage")

    // Impression field removed - fields now flow left-to-right, top-to-bottom without jumping

    // Check all required fields
    const hasMaterial = hasValue(materialValue)
    const hasRetention = hasValue(retentionValue)
    const hasStumpShade = hasValue(stumpShadeValue)
    const hasToothShade = hasValue(toothShadeValue)
    const hasStage = hasValue(stageValue)

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage
  }

  // Helper to determine border color for a field
  const getFieldBorderColor = (config: FieldConfig, value: string | undefined, impressionCount?: number): string => {
    // For impression field, check impressionCount or displayText
    if (config.key === "impression" || (config.fieldType === "modal" && config.key === "impression")) {
      const hasValue = hasImpressionValue(impressionCount, value)
      if (hasValue) {
        return '#119933' // green
      }
      // Show red border if required and no impressions selected
      if (isFieldRequired(config)) {
        return '#ef4444' // red
      }
      return '#7F7F7F' // gray
    }
    
    const showRedBorder = shouldShowRedBorder(config, value)
    
    // Show green border if individual field has a value
    if (hasValue(value)) {
      return '#119933' // green
    }
    
    // Show red border if invalid
    if (showRedBorder) {
      return '#ef4444' // red
    }
    
    // Default gray border
    return '#7F7F7F' // gray
  }

  // Helper to determine label color for a field
  const getFieldLabelColor = (config: FieldConfig, value: string | undefined, impressionCount?: number): string => {
    // For impression field, check impressionCount or displayText
    if (config.key === "impression" || (config.fieldType === "modal" && config.key === "impression")) {
      const hasValue = hasImpressionValue(impressionCount, value)
      if (hasValue) {
        return '#119933' // green
      }
      // Show red label if required and no impressions selected
      if (isFieldRequired(config)) {
        return '#ef4444' // red
      }
      return '#7F7F7F' // gray
    }
    
    const showRedBorder = shouldShowRedBorder(config, value)
    
    // Show green label if individual field has a value
    if (hasValue(value)) {
      return '#119933' // green
    }
    
    // Show red label if invalid
    if (showRedBorder) {
      return '#ef4444' // red
    }
    
    // Default gray label
    return '#7F7F7F' // gray
  }

  // Helper to check if a field should be locked/read-only
  const isFieldLocked = (config: FieldConfig, value: string | undefined): boolean => {
    // Check if field is in the lockedFields array
    if (lockedFields.includes(config.key)) {
      return true
    }
    // In readonly-locked mode, lock fields that have values
    if (mode === "readonly-locked" && hasValue(value)) {
      return true
    }
    // In display mode, all fields are locked
    if (mode === "display") {
      return true
    }
    return false
  }

  const renderField = (config: FieldConfig) => {
    const value = getFieldValue(config)
    const currentId = getFieldId(config)
    const options = getFieldOptions(config)

    if (config.fieldType === "modal" && config.key === "impression") {
      const impressionCount = getImpressionCount ? getImpressionCount() : 0
      const displayText = getImpressionDisplayText
        ? getImpressionDisplayText()
        : (impressionCount > 0
          ? `${impressionCount} impression${impressionCount > 1 ? "s" : ""} selected`
          : "") // Show blank instead of placeholder

      // Get border color based on validation state
      const borderColor = getFieldBorderColor(config, displayText, impressionCount)
      const labelColor = getFieldLabelColor(config, displayText, impressionCount)
      // Check if this field should be focused
      const isFocused = focusedFieldKey === config.key && !hasImpressionValue(impressionCount, displayText)

      const fieldWidth = getResponsiveFieldWidth(config, displayText)

      return (
        <div
          className="relative"
          style={{
            minHeight: '43px',
            ...fieldWidth
          }}
        >
          <div
            ref={getFieldRefCallback(config.key)}
            className={cn(
              "flex items-center cursor-pointer transition-all duration-200",
              isFocused && "ring-2 ring-[#1162A8] ring-opacity-50 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
            )}
            onClick={() => {
              setFocusedFieldKey(config.key)
              if (onOpenImpressionModal) onOpenImpressionModal()
            }}
            style={{
              padding: '12px 39px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              position: 'relative',
              marginTop: '5.27px',
              background: '#FFFFFF',
              border: `0.740384px solid ${isFocused ? '#1162A8' : borderColor}`,
              borderRadius: '7.7px',
              boxSizing: 'border-box'
            }}
          >
            <span style={{
              fontFamily: 'Verdana',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '14.4px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#000000',
              whiteSpace: 'nowrap',
              paddingRight: hasImpressionValue(impressionCount, displayText) ? '24px' : '0px'
            }}>{displayText}</span>
            {hasImpressionValue(impressionCount, displayText) && (
              <div className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none">
                <Check className="h-3.5 w-3.5 text-[#119933]" aria-label="Valid" />
              </div>
            )}
          </div>
          <label
            className="absolute bg-white transition-colors duration-200"
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
              color: isFocused ? '#1162A8' : labelColor
            }}
          >
            {config.label}
            {isFieldRequired(config) && (
              <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    if (config.fieldType === "select") {
      // Special handling for stage field - use modal instead of dropdown
      if (config.key === "stage") {
        const displayValue = value || "" // Show blank when empty
        const borderColor = getFieldBorderColor(config, value)
        const labelColor = getFieldLabelColor(config, value)
        const fieldWidth = getResponsiveFieldWidth(config, displayValue, options)
        const stages = productDetails?.stages || []
        // Check if this field should be focused
        const isFocused = focusedFieldKey === config.key && !hasValue(value)
        // Check if field is locked
        const fieldLocked = isFieldLocked(config, value)

        return (
          <>
            <div
              className="relative"
              style={{
                minHeight: '43px',
                ...fieldWidth
              }}
            >
              <div
                ref={getFieldRefCallback(config.key)}
                className={cn(
                  "flex items-center transition-all duration-200",
                  !fieldLocked && "cursor-pointer",
                  isFocused && !fieldLocked && "ring-2 ring-[#1162A8] ring-opacity-50 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
                )}
                onClick={() => {
                  if (fieldLocked) return
                  setFocusedFieldKey(config.key)
                  setIsStageModalOpen(true)
                }}
                style={{
                  padding: '12px 39px 5px 15px',
                  gap: '5px',
                  width: '100%',
                  height: '37px',
                  position: 'relative',
                  marginTop: '5.27px',
                  background: fieldLocked ? '#F5F5F5' : '#FFFFFF',
                  border: fieldLocked ? '2px solid #22c55e' : `0.740384px solid ${isFocused ? '#1162A8' : borderColor}`,
                  borderRadius: '7.7px',
                  boxSizing: 'border-box',
                  cursor: fieldLocked ? 'not-allowed' : 'pointer',
                  pointerEvents: fieldLocked ? 'none' : 'auto'
                }}
              >
                <span style={{
                  fontFamily: 'Verdana',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '14.4px',
                  lineHeight: '20px',
                  letterSpacing: '-0.02em',
                  color: fieldLocked ? '#999999' : '#000000',
                  whiteSpace: 'nowrap'
                }}>{displayValue}</span>
                {hasValue(value) && (
                  <div className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none">
                    <Check className="h-3.5 w-3.5 text-[#119933]" aria-label="Valid" />
                  </div>
                )}
              </div>
              <label
                className="absolute bg-white transition-colors duration-200"
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
                  color: isFocused && !fieldLocked ? '#1162A8' : labelColor
                }}
              >
                {hasValue(value) ? config.label : `Select ${config.label}`}
                {isFieldRequired(config) && (
                  <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                )}
              </label>
            </div>

            {/* Stage Selection Modal */}
            {isStageModalOpen && (
              <StageSelectionModal
                stages={stages}
                selectedStage={value}
                onSelect={(stageName: string, stageId?: number) => {
                  onFieldChange(config.key, stageName, stageId)
                  setIsStageModalOpen(false)
                  setFocusedFieldKey(null) // Clear focus after selection
                }}
                onClose={() => setIsStageModalOpen(false)}
              />
            )}
          </>
        )
      }

      // Determine the selected value - prefer ID, then value, then find by name
      let selectedValue = currentId?.toString() || ""
      if (!selectedValue && value) {
        // Try to find option by name
        const optionByName = options.find((opt: any) => opt.name === value)
        if (optionByName) {
          selectedValue = optionByName.id?.toString() || optionByName.name
        } else {
          selectedValue = value
        }
      }

      const displayValue = value || "" // Show blank when empty
      const borderColor = getFieldBorderColor(config, value)
      const labelColor = getFieldLabelColor(config, value)
      const fieldWidth = getResponsiveFieldWidth(config, displayValue, options)

      // Check if this field should be focused
      const isFocused = focusedFieldKey === config.key && !hasValue(value)

      // Check if field is locked
      const fieldLocked = isFieldLocked(config, value)

      return (
        <div
          className="relative"
          style={{
            minHeight: '43px',
            ...fieldWidth
          }}
        >
          <Select
            value={selectedValue || ""}
            disabled={fieldLocked}
            onValueChange={(selectedValue) => {
              if (fieldLocked) return
              const selectedOption = options.find((opt: any) =>
                opt.id?.toString() === selectedValue || opt.name === selectedValue
              )
              if (selectedOption) {
                onFieldChange(config.key, selectedOption.name, selectedOption.id)
              } else {
                onFieldChange(config.key, selectedValue)
              }
              // Defer to avoid setState during commit (prevents "Maximum update depth" with Radix)
              queueMicrotask(() => setFocusedFieldKey(null))
            }}
            onOpenChange={(open) => {
              if (fieldLocked) return
              // Defer setState so it never runs during Radix's commit phase
              queueMicrotask(() => {
                if (open) {
                  setFocusedFieldKey(config.key)
                } else if (hasValue(value)) {
                  setFocusedFieldKey(null)
                }
              })
            }}
          >
            <SelectTrigger
              ref={getFieldRefCallback(config.key)}
              className={cn(
                "transition-all duration-200",
                isFocused && !fieldLocked && "ring-2 ring-[#1162A8] ring-opacity-50 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
              )}
              style={{
                padding: '12px 39px 5px 15px',
                gap: '5px',
                width: '100%',
                height: '37px',
                position: 'relative',
                marginTop: '5.27px',
                background: fieldLocked ? '#F5F5F5' : '#FFFFFF',
                border: fieldLocked ? '2px solid #22c55e' : `0.740384px solid ${isFocused ? '#1162A8' : borderColor}`,
                borderRadius: '7.7px',
                boxSizing: 'border-box',
                fontFamily: 'Verdana',
                fontSize: '14.4px',
                lineHeight: '20px',
                letterSpacing: '-0.02em',
                color: fieldLocked ? '#999999' : '#000000',
                cursor: fieldLocked ? 'not-allowed' : 'pointer',
                pointerEvents: fieldLocked ? 'none' : 'auto'
              }}
            >
              <SelectValue placeholder="">
                {value || ""} {/* Show blank when empty */}
              </SelectValue>
              {hasValue(value) && (
                <div className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none">
                  <Check className="h-3.5 w-3.5 text-[#119933]" aria-label="Valid" />
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => (
                <SelectItem
                  key={option.id || option.name}
                  value={option.id?.toString() || option.name}
                >
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label
            className="absolute bg-white transition-colors duration-200"
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
              color: isFocused ? '#1162A8' : labelColor
            }}
          >
            {config.key === "retention"
              ? (hasValidRetentionValue(value) ? 'Retention type' : 'Select Retention type')
              : (hasValue(value) ? config.label : `Select ${config.label}`)}
            {isFieldRequired(config) && (
              <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    if (config.fieldType === "shade") {
      const shadeValue = value || "" // Show blank when empty
      const borderColor = getFieldBorderColor(config, value)
      const labelColor = getFieldLabelColor(config, value)
      // Check if this field should be focused - use red for empty shade fields
      const isFocused = focusedFieldKey === config.key && !hasValue(value)
      // For shade fields, use red color when focused and empty (required field)
      const focusColor = '#ef4444' // Red for required empty shade fields
      // Check if field is locked
      const fieldLocked = isFieldLocked(config, value)
      const shadeBrand = arch === "maxillary"
        ? savedProduct.maxillaryShadeBrand
        : savedProduct.mandibularShadeBrand
      const brandName = shadeBrand ? "Vita 3D Master" : ""

      // Extract shade name from value - handle formats like "Brand - Shade" or just "Shade"
      let shadeName = 'A1' // default
      if (value && hasValue(value)) {
        // If value contains " - ", extract the part after the dash
        if (value.includes(' - ')) {
          const parts = value.split(' - ')
          shadeName = parts[parts.length - 1].trim()
        } else {
          shadeName = value.trim()
        }
      }

      // Get gradient colors for the selected shade
      const gradientColors = getShadeGradientColors(shadeName)

      // Create unique gradient ID for this field based on value to ensure proper updates
      // Replace dots and other special chars with dashes for valid CSS IDs
      const safeShadeName = shadeName.replace(/[^a-zA-Z0-9]/g, '-')
      const gradientId = `shade-gradient-${config.key}-${arch}-${safeShadeName}`
      const filterId = `filter-${gradientId}`
      const clipId = `clip-shade-${config.key}-${arch}`

      return (
        <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
          <div
            ref={getFieldRefCallback(config.key)}
            className={cn(
              "flex items-center justify-between transition-all duration-200",
              !fieldLocked && "cursor-pointer hover:bg-gray-50",
              isFocused && !fieldLocked && "ring-2 ring-red-500 ring-opacity-50 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
            )}
            onClick={(e) => {
              if (fieldLocked) return
              e.preventDefault()
              e.stopPropagation()
              setFocusedFieldKey(config.key)
              if (onOpenShadeModal) {
                onOpenShadeModal(config.key, arch)
              } else {
                console.warn("onOpenShadeModal not provided")
              }
            }}
            style={{
              padding: '12px 39px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              background: fieldLocked ? '#F5F5F5' : '#FFFFFF',
              border: fieldLocked ? '2px solid #22c55e' : `0.740384px solid ${isFocused ? focusColor : borderColor}`,
              borderRadius: '7.7px',
              boxSizing: 'border-box',
              position: 'relative',
              marginTop: '5.27px',
              cursor: fieldLocked ? 'not-allowed' : 'pointer',
              pointerEvents: fieldLocked ? 'none' : 'auto'
            }}
          >
            <span style={{
              fontFamily: 'Verdana',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '14.4px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: fieldLocked ? '#999999' : '#000000'
            }}>{brandName || shadeValue}</span>
            {hasValue(value) && (
              <div
                className="flex items-center justify-center pointer-events-none"
                style={{
                  width: '26px',
                  height: '30px',
                  borderRadius: '4px',
                  position: 'absolute',
                  right: '32px',
                  top: '-1px'
                }}
              >
                <svg
                  key={`shade-svg-${shadeName}-${config.key}`}
                  width="26"
                  height="28"
                  viewBox="0 0 38 37"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: '100%', height: '100%' }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="18.7451" y1="34.9299" x2="18.7451" y2="1.31738" gradientUnits="userSpaceOnUse">
                      {gradientColors && gradientColors.length > 0 ? (
                        gradientColors.map((stop, index) => (
                          <stop key={`${gradientId}-stop-${index}`} offset={stop.offset} stopColor={stop.color} />
                        ))
                      ) : (
                        // Fallback gradient if no colors found
                        <>
                          <stop offset="0" stopColor="#DED2C7" />
                          <stop offset="0.07" stopColor="#E3D4C4" />
                          <stop offset="0.25" stopColor="#EDD9C1" />
                          <stop offset="0.5" stopColor="#F0DBC0" />
                          <stop offset="0.76" stopColor="#F0DCC2" />
                          <stop offset="0.9" stopColor="#F1E0CA" />
                          <stop offset="1" stopColor="#F3E7D7" />
                        </>
                      )}
                    </linearGradient>
                    <filter id={filterId} x="2.8371" y="0.424306" width="35.4067" height="176.788" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                      <feOffset dx="1.78615" dy="6.25154"/>
                      <feGaussianBlur stdDeviation="3.57231"/>
                      <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0"/>
                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                    </filter>
                  </defs>
                  <g clipPath={`url(#${clipId})`}>
                    <g filter={`url(#${filterId})`}>
                      <path d="M28.818 61.9683V163.816H8.68481V61.9683C8.68481 57.1043 11.9055 53.0329 16.2557 51.883V34.8203L21.2471 34.9136V51.8985C25.5973 53.0485 28.818 57.1199 28.818 61.9838V61.9683Z" fill="#8F8C88"/>
                      <path d="M21.2499 32.708V34.8991L16.2585 34.8214V32.708H21.2499Z" fill="#8F8C88"/>
                      <path d="M29.3078 27.8438C29.4452 31.7442 26.8198 34.9921 23.5533 34.9454L21.2484 34.9144L16.2571 34.8211L13.3264 34.7745C10.3194 34.7279 7.96878 31.651 8.213 28.0613L9.28148 12.1641C9.69361 6.04147 13.9675 1.31738 19.0962 1.31738C21.6911 1.31738 24.057 2.54502 25.7971 4.54965C27.5372 6.55428 28.6515 9.3359 28.7583 12.4439L29.2925 27.8438H29.3078Z" fill={`url(#${gradientId})`}/>
                      <path style={{ mixBlendMode: 'screen' }} opacity="0.42" d="M24.8115 29.7413C24.3078 30.2697 24.0789 31.0622 24.2315 31.7926C24.4757 31.9324 24.7963 31.9169 25.0558 31.7926C25.3152 31.6683 25.5442 31.4818 25.7426 31.2953C26.1395 30.9224 28.6733 28.3428 27.5896 27.8144C27.208 27.6279 26.5669 28.234 26.3227 28.4671C25.8342 28.9022 25.2694 29.2751 24.8115 29.7413Z" fill={`url(#${gradientId})`}/>
                      <path style={{ mixBlendMode: 'screen' }} opacity="0.42" d="M26.6397 25.2954C27.1587 25.1089 27.3114 24.4407 27.3724 23.8812C27.5098 22.7935 27.8761 21.1929 27.4487 20.1362C27.2045 19.5301 26.7924 19.2038 26.5329 19.8254C26.3039 20.3537 26.655 21.4415 26.6855 22.0009C26.7161 22.3894 26.8382 25.2021 26.6245 25.2798L26.6397 25.2954Z" fill={`url(#${gradientId})`}/>
                      <path style={{ mixBlendMode: 'screen' }} opacity="0.42" d="M23.2475 5.84099C23.4307 6.12071 23.6291 6.46258 23.9649 6.49366C24.2396 6.52474 24.4991 6.30718 24.5907 6.04301C24.6823 5.77883 24.6518 5.48358 24.5907 5.2194C24.3923 4.55119 23.9038 3.97622 23.2933 3.66542C22.7743 3.41679 21.7364 3.16815 21.8737 4.05392C21.9653 4.65997 22.9422 5.2971 23.2628 5.82545L23.2475 5.84099Z" fill={`url(#${gradientId})`}/>
                    </g>
                    <text 
                      x="18.75" 
                      y="19.5" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      style={{
                        fontFamily: 'Verdana',
                        fontSize: '12.8603px',
                        fontWeight: 400,
                        fill: '#000000',
                        pointerEvents: 'none'
                      }}
                    >
                      {shadeName}
                    </text>
                  </g>
                  <clipPath id={clipId}>
                    <rect width="37.5092" height="41.9746" fill="white" transform="translate(0 -1)"/>
                  </clipPath>
                </svg>
              </div>
            )}
            {hasValue(value) && (
              <div className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <Check className="h-3.5 w-3.5 text-[#119933]" aria-label="Valid" />
              </div>
            )}
          </div>
          <label
            className="absolute bg-white transition-colors duration-200"
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
              color: isFocused && !fieldLocked ? focusColor : labelColor
            }}
          >
            {hasValue(value) ? config.label : `Select ${config.label}`}
            {isFieldRequired(config) && (
              <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    return null
  }


  // Container styles based on layout variant
  const containerStyle = layout === "accordion-compact"
    ? {
        display: 'flex',
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: '10px',
        width: '100%'
      }
    : {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '4px 8px',
        width: '100%'
      }

  // Field container styles based on layout variant
  const getFieldContainerStyle = () => layout === "accordion-compact"
    ? { flex: '1', minWidth: '150px', maxWidth: '48%' }
    : { width: '100%' }

  // Helper to get teeth array for saved product card
  const getTeethArray = (): number[] => {
    if (mode === "saved" && savedProduct) {
      const teeth = arch === "maxillary" ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth
      return (teeth || []).sort((a: number, b: number) => a - b)
    }
    return []
  }

  // Helper to check if a field should be hidden during shade selection
  const isFieldHiddenDuringShadeSelection = (fieldKey: string): boolean => {
    if (!hideFieldsDuringShadeSelection) return false
    const hiddenFields = ["material", "retention", "retention_option", "stage", "stump_shade", "tooth_shade"]
    return hiddenFields.includes(fieldKey)
  }

  // Render fields content (used in both normal and saved modes)
  const renderFieldsContent = () => (
    <>
      <div
        className={layout === "accordion-compact" ? "flex flex-wrap" : "grid grid-cols-2"}
        style={containerStyle}
      >
        {visibleFields.map(field => {
          const isHiddenForShade = isFieldHiddenDuringShadeSelection(field.key)
          return (
            <div
              key={field.key}
              style={{
                ...getFieldContainerStyle(),
                // Use CSS to hide fields during shade selection instead of unmounting
                // This prevents Radix UI compose-refs infinite loop issues
                display: isHiddenForShade ? 'none' : undefined
              }}
            >
              {renderField(field)}
            </div>
          )
        })}

        {/* Render impression field after advance fields (or after main fields if no advance fields) */}
        {/* hideImpression prop allows parent to render impression separately after advance fields */}
        {!hideImpression && shouldShowImpression && impressionConfig && (
          <div
            key={impressionConfig.key}
            style={getFieldContainerStyle()}
          >
            {renderField(impressionConfig)}
          </div>
        )}
      </div>

      {/* Implant Brand/Platform Cards - Shows at the bottom when implant details field is clicked */}
      {showImplantBrandCards && (
        <div className="w-full pt-2">
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="bg-white w-full flex justify-center">
              {shouldShowPlatformCards && mappedPlatforms.length > 0 ? (
                <ImplantPlatformCards
                  platforms={mappedPlatforms}
                  selectedPlatformId={selectedImplantPlatformId}
                  onSelectPlatform={(platform: any) => {
                    if (onSelectImplantPlatform) {
                      onSelectImplantPlatform(platform)
                    }
                    // After platform selection, go back to brand step
                    setImplantSelectionStep('brand')
                  }}
                  arch={arch}
                  isLoading={false}
                />
              ) : implantsLoading ? (
                <ImplantBrandCards
                  implants={[]}
                  selectedImplantId={selectedImplantId}
                  onSelectImplant={() => {}}
                  arch={arch}
                  isLoading
                />
              ) : implants && implants.length > 0 ? (
                <ImplantBrandCards
                  implants={implants}
                  selectedImplantId={selectedImplantId}
                  onSelectImplant={(implant: any) => {
                    if (onSelectImplant) {
                      onSelectImplant(implant)
                    }
                    // If brand has platforms, show platform cards, otherwise stay on brand
                    if (implant.platforms && implant.platforms.length > 0) {
                      setImplantSelectionStep('platform')
                      // Notify parent that we're showing platform cards
                      if (onPlatformFieldClick) {
                        setTimeout(() => {
                          const fn = onPlatformFieldClick as any
                          if (fn.length === 0) {
                            fn()
                          }
                        }, 0)
                      }
                    } else {
                      // If no platforms, notify parent we're on brand step
                      if (onBrandFieldClick) {
                        setTimeout(() => {
                          const fn = onBrandFieldClick as any
                          if (fn.length === 0) {
                            fn()
                          }
                        }, 0)
                      }
                    }
                  }}
                  arch={arch}
                />
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No implants available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )

  // If mode is "saved", render accordion card wrapper
  if (mode === "saved") {
    const teeth = getTeethArray()
    const isOpen = isAccordionOpen || false
    const productName = product?.name || ""
    const productImageUrl = product?.image_url || "/images/product-default.png"
    const estimatedDays = product?.estimated_days || 10

    return (
      <Card
        className="overflow-hidden shadow-sm"
        style={{
          width: '80%',
          minWidth: '80%',
          border: rushData ? '1px solid #CF0202' : '1px solid #e5e7eb',
          borderRadius: '10px'
        }}
      >
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={isOpen && productId ? productId : ""}
          onValueChange={(value) => {
            if (onAccordionChange && productId) {
              onAccordionChange(value)
            }
          }}
        >
          <AccordionItem value={productId || ""} className="border-0">
            {/* Header */}
            <div
              className="w-full"
              style={{
                position: 'relative',
                height: '69.92px',
                background: rushData ? '#FFE2E2' : (isOpen ? '#DFEEFB' : '#F5F5F5'),
                boxShadow: rushData ? '0.9px 0.9px 3.6px 0 rgba(0, 0, 0, 0.25)' : '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                borderRadius: isOpen ? '5.4px 5.4px 0px 0px' : '10px',
                border: rushData ? '1px solid #CF0202' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 8px',
                gap: '10px'
              }}
              onClick={() => {
                if (onCardClick && savedProduct) {
                  onCardClick(savedProduct)
                }
              }}
            >
              <AccordionTrigger
                className="hover:no-underline w-full [&>svg]:hidden"
                style={{
                  padding: '0px',
                  gap: '10px',
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  boxShadow: 'none',
                  borderRadius: '0px'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onCardClick && savedProduct) {
                    onCardClick(savedProduct)
                  }
                }}
              >
                <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                  <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                    {/* Product Image */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '64.04px',
                        height: '42.69px',
                        left: '0px',
                        top: '0px',
                        background: '#F5F5F5',
                        borderRadius: '5.4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={productImageUrl}
                        alt={productName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          if (target.src !== window.location.origin + "/images/product-default.png") {
                            target.src = "/images/product-default.png"
                          }
                        }}
                      />
                    </div>

                    {/* Content Area */}
                    <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                      {/* Tooth Numbers */}
                      <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'Verdana',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: '14.4px',
                            lineHeight: '20px',
                            letterSpacing: '-0.02em',
                            color: '#000000'
                          }}
                        >
                          {teeth.length > 0 ? teeth.join(', ') : ''}
                        </span>
                        {rushData && (
                          <Zap
                            style={{
                              width: '16px',
                              height: '16px',
                              color: '#CF0202',
                              fill: '#CF0202',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </div>

                      {/* Product Name */}
                      <div style={{ position: 'absolute', width: 'auto', height: 'auto', left: '0px', top: '22px', display: 'flex', alignItems: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 12px',
                            background: '#DFEEFB',
                            borderRadius: '6px',
                            boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                            maxWidth: '400px'
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Verdana',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              fontSize: '12px',
                              lineHeight: '16px',
                              letterSpacing: '-0.02em',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {productName}
                          </span>
                        </div>
                      </div>

                      {/* Badges and Info Row */}
                      <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '44px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                        {category && (
                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{category}</span>
                          </div>
                        )}
                        {subcategory && (
                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{subcategory}</span>
                          </div>
                        )}
                        <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                          Est days: {estimatedDays} work days after submission
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chevron */}
                <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <ChevronDown
                    className="w-full h-full transition-transform duration-200 text-black"
                    style={{
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-180deg)'
                    }}
                  />
                </div>
              </AccordionTrigger>
              {/* Delete Button */}
              {onDeleteProduct && productId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteProduct(productId)
                  }}
                  className="hover:text-red-600 transition-colors"
                  style={{
                    position: 'absolute',
                    width: '16px',
                    height: '16px',
                    color: '#999999',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    right: '34px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 11
                  }}
                >
                  <Trash2 className="w-full h-full" />
                </button>
              )}
            </div>

            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
              {/* Scrollable content container */}
              <div
                className="bg-white w-full overflow-y-auto"
                style={{
                  position: 'relative',
                  maxHeight: '600px',
                  marginTop: '10px',
                  paddingLeft: '69.87px',
                  paddingRight: '69.87px',
                  paddingBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              >
                {/* Dynamic Product Fields */}
                {renderFieldsContent()}

                {/* Notes if available */}
                {showNotes && notes && (
                  <div
                    className="flex flex-col sm:flex-row flex-wrap gap-5"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      padding: '0px',
                      gap: '20px',
                      flex: 'none',
                      order: 3,
                      alignSelf: 'stretch',
                      flexGrow: 0
                    }}
                  >
                    <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                      <div
                        className="flex items-start"
                        style={{
                          padding: '12px 15px 5px 15px',
                          gap: '5px',
                          width: '100%',
                          minHeight: '60px',
                          background: '#FFFFFF',
                          border: '0.740384px solid #7F7F7F',
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
                          fontSize: '14.4px',
                          lineHeight: '20px',
                          letterSpacing: '-0.02em',
                          color: '#000000'
                        }}>{notes}</span>
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
                        Notes
                      </label>
                    </div>
                  </div>
                )}

                {/* Implant Details if available */}
                {showImplantDetails && savedProduct && (
                  <div className="w-full" style={{ order: 3, alignSelf: 'stretch', flexGrow: 0 }}>
                    {/* Implant details rendering would go here - similar to saved-products-section */}
                  </div>
                )}

                {/* Action Buttons */}
                {showActionButtons && (
                  <div
                    className="flex flex-wrap justify-center items-center w-full"
                    style={{
                      gap: '7.03px',
                      position: 'relative',
                    }}
                  >
                    {onAddOnsClick && (
                      <button
                        onClick={onAddOnsClick}
                        className="relative flex flex-col items-center justify-center"
                        style={{
                          width: '123.04px',
                          height: '46.22px',
                          background: '#F9F9F9',
                          boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                          borderRadius: '5.26893px',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                      >
                        <span
                          className="absolute text-center"
                          style={{
                            width: '41.8px',
                            height: '20px',
                            left: '50%',
                            top: '3.79px',
                            transform: 'translateX(-50%)',
                            fontFamily: 'Verdana',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: '8.78154px',
                            lineHeight: '19px',
                            textAlign: 'center',
                            letterSpacing: '-0.02em',
                            color: '#000000'
                          }}
                        >
                          +
                        </span>
                        <span
                          className="absolute text-center"
                          style={{
                            width: '89px',
                            height: '20px',
                            left: '50%',
                            top: '23.11px',
                            transform: 'translateX(-50%)',
                            fontFamily: 'Verdana',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: '8.78154px',
                            lineHeight: '19px',
                            textAlign: 'center',
                            letterSpacing: '-0.02em',
                            color: '#000000'
                          }}
                        >
                          Add ons ({getTotalAddOnsCount ? getTotalAddOnsCount() : 0} selected)
                        </span>
                      </button>
                    )}
                    {onAttachFilesClick && (
                      <button
                        onClick={onAttachFilesClick}
                        className="relative flex flex-col items-center justify-center"
                        style={{
                          width: '123.04px',
                          height: '46.22px',
                          background: '#F9F9F9',
                          boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                          borderRadius: '5.26893px',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                      >
                        <Paperclip
                          className="absolute"
                          style={{
                            width: '8.78px',
                            height: '10.54px',
                            left: '50%',
                            top: '9.34px',
                            transform: 'translateX(-50%)',
                            color: '#1E1E1E',
                            strokeWidth: '0.878154px'
                          }}
                        />
                        <span
                          className="absolute text-center"
                          style={{
                            width: '107px',
                            height: '20px',
                            left: '50%',
                            top: '23.11px',
                            transform: 'translateX(-50%)',
                            fontFamily: 'Verdana',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: '8.78154px',
                            lineHeight: '19px',
                            textAlign: 'center',
                            letterSpacing: '-0.02em',
                            color: '#000000'
                          }}
                        >
                          Attach Files ({getAttachedFilesCount ? getAttachedFilesCount() : 0} uploads)
                        </span>
                      </button>
                    )}
                    {onRushClick && (
                      <button
                        onClick={onRushClick}
                        className="relative flex flex-col items-center justify-center"
                        style={{
                          width: '123.04px',
                          height: '46.22px',
                          background: '#F9F9F9',
                          boxShadow: '0px 0px 2.89791px rgba(207, 2, 2, 0.67)',
                          borderRadius: '5.26893px',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                      >
                        <Zap
                          className="absolute"
                          style={{
                            width: '8.78px',
                            height: '10.54px',
                            left: '50%',
                            top: '9.35px',
                            transform: 'translateX(-50%)',
                            color: '#CF0202',
                            fill: '#CF0202',
                            strokeWidth: '0.878154px'
                          }}
                        />
                        <span
                          className="absolute text-center"
                          style={{
                            width: '59px',
                            height: '20px',
                            left: '50%',
                            top: '23.11px',
                            transform: 'translateX(-50%)',
                            fontFamily: 'Verdana',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: '8.78154px',
                            lineHeight: '19px',
                            textAlign: 'center',
                            letterSpacing: '-0.02em',
                            color: '#000000'
                          }}
                        >
                          Request Rush
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    )
  }

  // Normal mode - render fields directly with scrolling
  return (
    <div
      className="w-full overflow-y-auto"
      style={{
        maxHeight: '600px',
        paddingRight: '4px'
      }}
    >
      {renderFieldsContent()}
    </div>
  )
}

