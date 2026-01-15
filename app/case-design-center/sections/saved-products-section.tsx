"use client"

import React, { useEffect } from "react"
import { ChevronDown, Trash2, Zap, Paperclip } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImplantDetailForm } from "@/components/implant-detail-form"
import type { SavedProduct } from "./types"

// Helper function to get shade display text with brand and code
const getShadeDisplayText = (
  shadeName: string | undefined,
  shadeId: number | undefined,
  shadeBrandId: number | undefined,
  shadeType: "stump_shade" | "tooth_shade",
  productDetails: any
): string => {
  if (!shadeName || shadeName.trim() === "" || shadeName === "Select" || shadeName === "Select stump shade" || shadeName === "Select tooth shade") {
    return shadeType === "stump_shade" ? "Select stump shade" : "Select tooth shade"
  }

  if (!productDetails) {
    return shadeName
  }

  // Get the appropriate shade array
  const shades = shadeType === "stump_shade" 
    ? productDetails.gum_shades 
    : productDetails.teeth_shades

  if (!shades || !Array.isArray(shades)) {
    return shadeName
  }

  // Find the shade by ID or name
  const shade = shades.find((s: any) => {
    if (shadeId && (s.id === shadeId || String(s.id) === String(shadeId))) {
      return true
    }
    if (s.name === shadeName || s.system_name === shadeName) {
      return true
    }
    return false
  })

  if (!shade) {
    return shadeName
  }

  // Get brand name
  const brandName = shade.brand?.name || shade.brand_name || ""
  // Get shade code
  const shadeCode = shade.code || shade.shade_code || shade.name || ""

  // Format: "Brand Name - Shade Code" or just "Shade Code" if no brand
  if (brandName && shadeCode) {
    return `${brandName} - ${shadeCode}`
  } else if (shadeCode) {
    return shadeCode
  } else {
    return shadeName
  }
}

// Helper to check if retention value is valid (not empty, not placeholder)
const hasValidRetentionValue = (retentionValue: string | undefined | null): boolean => {
  if (!retentionValue) return false
  const trimmed = String(retentionValue).trim()
  return trimmed !== '' && 
         trimmed !== 'Not specified' && 
         trimmed !== 'Select' && 
         trimmed !== 'Select Retention type'
}

// RetentionFieldComponent - dropdown for retention type
function RetentionFieldComponent({
  savedProduct,
  isMaxillary,
  openRetentionDropdown,
  setOpenRetentionDropdown,
  handleFieldChange
}: {
  savedProduct: SavedProduct
  isMaxillary: boolean
  openRetentionDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenRetentionDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  handleFieldChange: (fieldKey: string, value: string, id?: number, productId?: string, arch?: "maxillary" | "mandibular") => void
}) {
  const arch = isMaxillary ? "maxillary" : "mandibular"
  const retentionValue = isMaxillary ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
  
  return (
    <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
      <Select
        open={openRetentionDropdown[savedProduct.id]?.[arch] || false}
        onOpenChange={(open) =>
          setOpenRetentionDropdown((prev) => ({
            ...prev,
            [savedProduct.id]: {
              ...prev[savedProduct.id],
              [arch]: open
            }
          }))
        }
        value={retentionValue || ""}
        onValueChange={(value) => {
          const productDetails = savedProduct.productDetails
          const retentions = productDetails?.retentions || []
          const selectedRetention = retentions.find((r: any) => r.name === value || r.id?.toString() === value)
          handleFieldChange(
            "retention",
            value,
            selectedRetention?.id,
            savedProduct.id,
            arch
          )
        }}
      >
        <SelectTrigger
          style={{
            padding: '12px 15px 5px 15px',
            gap: '5px',
            width: '100%',
            height: '37px',
            position: 'relative',
            marginTop: '5.27px',
            background: '#FFFFFF',
            border: '0.740384px solid #7F7F7F',
            borderRadius: '7.7px',
            boxSizing: 'border-box',
            fontFamily: 'Arial',
            fontStyle: 'normal',
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '14px',
            color: '#000000'
          }}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
          {savedProduct.productDetails?.retentions?.map((retention: any, idx: number) => (
            <SelectItem key={idx} value={retention.name || retention.id?.toString() || ""}>
              {retention.name || retention}
            </SelectItem>
          )) || []}
        </SelectContent>
      </Select>
      <label
        className="absolute bg-white"
        style={{
          padding: '0px',
          height: '14px',
          left: '9.23px',
          top: '0px',
          fontFamily: 'Arial',
          fontStyle: 'normal',
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: '14px',
          color: '#7F7F7F'
        }}
      >
        {hasValidRetentionValue(retentionValue) ? 'Retention type' : 'Select Retention type'}
      </label>
    </div>
  )
}

// StageFieldComponent - extracted from main file
function StageFieldComponent({
  savedProduct,
  isMaxillary,
  openStageDropdown,
  setOpenStageDropdown,
  handleStageSelect
}: {
  savedProduct: SavedProduct
  isMaxillary: boolean
  openStageDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenStageDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  handleStageSelect: (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => void
}) {
  const arch = isMaxillary ? "maxillary" : "mandibular"
  const stageValue = isMaxillary ? savedProduct.maxillaryStage : savedProduct.mandibularStage
  
  // Auto-open dropdown when component mounts if value is "Not specified" or empty
  useEffect(() => {
    const isNotSpecified = !stageValue || 
      stageValue.trim() === "" || 
      stageValue.trim().toLowerCase() === "not specified"
          
    if (isNotSpecified) {
      // Small delay to ensure the Select component is ready
      const timer = setTimeout(() => {
        setOpenStageDropdown((prev) => ({
          ...prev,
          [savedProduct.id]: {
            ...prev[savedProduct.id],
            [arch]: true
          }
        }))
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, []) // Only run on mount

  return (
    <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
      <Select
        open={openStageDropdown[savedProduct.id]?.[arch] || false}
        onOpenChange={(open) =>
          setOpenStageDropdown((prev) => ({
            ...prev,
            [savedProduct.id]: {
              ...prev[savedProduct.id],
              [arch]: open
            }
          }))
        }
        value={stageValue || ""}
        onValueChange={(value) => {
          const productDetails = savedProduct.productDetails
          const stages = productDetails?.stages || []
          const selectedStage = stages.find((s: any) => s.name === value || s.id?.toString() === value)
          handleStageSelect(
            savedProduct.id,
            arch,
            value,
            selectedStage?.id
          )
        }}
      >
        <SelectTrigger
          style={{
            padding: '12px 15px 5px 15px',
            gap: '5px',
            width: '100%',
            height: '37px',
            position: 'relative',
            marginTop: '5.27px',
            background: '#FFFFFF',
            border: '0.740384px solid #7F7F7F',
            borderRadius: '7.7px',
            boxSizing: 'border-box',
            fontFamily: 'Verdana',
            fontStyle: 'normal',
            fontWeight: 400,
            fontSize: '14.4px',
            lineHeight: '20px',
            letterSpacing: '-0.02em',
            color: '#000000'
          }}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
          {savedProduct.productDetails?.stages?.map((stage: any, idx: number) => (
            <SelectItem key={idx} value={stage.name || stage.id?.toString() || ""}>
              {stage.name || stage}
            </SelectItem>
          )) || []}
        </SelectContent>
      </Select>
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
          color: '#7F7F7F',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        Stage
      </label>
    </div>
  )
}

interface SavedProductsSectionProps {
  savedProducts: SavedProduct[]
  selectedCategory: string | null
  showProductDetails: boolean
  openAccordion: string | null
  handleAccordionChange: (value: string) => void
  handleDeleteProduct: (productId: string) => void
  handleSavedProductCardClick: (product: SavedProduct) => void
  isAccordionFieldVisible: (fieldName: "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details", savedProduct: SavedProduct, archType: "maxillary" | "mandibular") => boolean
  getAdvanceFieldByName: (fieldName: string, advanceFields: any[]) => any | null
  renderSavedAdvanceField: (field: any, savedProduct: SavedProduct, archType: "maxillary" | "mandibular") => React.ReactNode
  productAdvanceFields: { [productId: string]: any[] }
  openStageDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenStageDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  handleStageSelect: (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => void
  showAdvanceFields: { [productId: string]: boolean }
  getTotalAddOnsCount: number
  getAttachedFilesCount: () => number
  setCurrentProductForModal: (product: SavedProduct) => void
  setCurrentArchForModal: (arch: "maxillary" | "mandibular") => void
  setShowAddOnsModal: (show: boolean) => void
  setShowAttachModal: (show: boolean) => void
  setShowRushModal: (show: boolean) => void
  maxillaryRetentionTypes: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  mandibularRetentionTypes: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  handleFieldChange: (fieldKey: string, value: string, id?: number, productId?: string, arch?: "maxillary" | "mandibular") => void
  openRetentionDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenRetentionDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  implants?: any[]
}

export function SavedProductsSection({
  savedProducts,
  selectedCategory,
  showProductDetails,
  openAccordion,
  handleAccordionChange,
  handleDeleteProduct,
  handleSavedProductCardClick,
  isAccordionFieldVisible,
  getAdvanceFieldByName,
  renderSavedAdvanceField,
  productAdvanceFields,
  openStageDropdown,
  setOpenStageDropdown,
  handleStageSelect,
  showAdvanceFields,
  getTotalAddOnsCount,
  getAttachedFilesCount,
  setCurrentProductForModal,
  setCurrentArchForModal,
  setShowAddOnsModal,
  setShowAttachModal,
  setShowRushModal,
  maxillaryRetentionTypes,
  mandibularRetentionTypes,
  handleFieldChange,
  openRetentionDropdown,
  setOpenRetentionDropdown,
  implants = []
}: SavedProductsSectionProps) {
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

  if (savedProducts.length === 0 || !selectedCategory || showProductDetails) {
    return null
  }

  return (
    <div className="w-full flex mt-4 mb-8">
      <div>
        {/* Two Column Layout for Saved Products */}
        <div className="w-full flex gap-4 items-start">
          {/* Maxillary Products - Left Column */}
          <div className="flex-1 flex flex-col">
            <div className="space-y-1 flex flex-col items-center">
              {savedProducts.filter(p => p.addedFrom === "maxillary").length > 0 ? (
                savedProducts
                  .filter(p => p.addedFrom === "maxillary")
                  .map((savedProduct) => {
                    const isMaxillary = true
                    const teeth = savedProduct.maxillaryTeeth.sort((a, b) => a - b)

                    return (
                      <Card
                        key={savedProduct.id}
                        className="overflow-hidden shadow-sm"
                        style={{
                          width: '80%',
                          minWidth: '80%',
                          border: savedProduct.rushData ? '1px solid #CF0202' : '1px solid #e5e7eb',
                          borderRadius: '10px'
                        }}
                      >
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full"
                          value={openAccordion === savedProduct.id ? savedProduct.id : ""}
                          onValueChange={handleAccordionChange}
                        >
                          <AccordionItem value={savedProduct.id} className="border-0">
                            {/* Header */}
                            <div
                              className="w-full"
                              style={{
                                position: 'relative',
                                height: '69.92px',
                                background: savedProduct.rushData ? '#FFE2E2' : (openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5'),
                                boxShadow: savedProduct.rushData ? '0.9px 0.9px 3.6px 0 rgba(0, 0, 0, 0.25)' : '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '10px',
                                border: savedProduct.rushData ? '1px solid #CF0202' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '14px 8px',
                                gap: '10px'
                              }}
                            >
                              <AccordionTrigger
                                className="hover:no-underline w-full"
                                style={{
                                  padding: '0px',
                                  gap: '10px',
                                  width: '100%',
                                  height: '100%',
                                  background: 'transparent',
                                  boxShadow: 'none',
                                  borderRadius: '0px'
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
                                        src={savedProduct.product.image_url || "/images/product-default.png"}
                                        alt={savedProduct.product.name}
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
                                        {savedProduct.rushData && (
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

                                      {/* Badges and Info Row */}
                                      <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.category}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.subcategory}</span>
                                        </div>
                                        <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                          Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteProduct(savedProduct.id)
                                          }}
                                          className="hover:text-red-600 transition-colors"
                                          style={{
                                            width: '16px',
                                            height: '16px',
                                            color: '#999999',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            flex: 'none',
                                            order: 5,
                                            flexGrow: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <Trash2 className="w-full h-full" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                            </div>

                            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                              <div
                                className="bg-white w-full"
                                style={{
                                  position: 'relative',
                                  height: 'auto',
                                  minHeight: 'auto',
                                  marginTop: '10px',
                                  paddingLeft: '15.87px',
                                  paddingRight: '15.87px',
                                  paddingBottom: '20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '20px',
                                  background: '#FFFFFF',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Row 1: Product - Material and Retention Type */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 0,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Product - Material */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
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
                                        whiteSpace: 'nowrap'
                                      }}>{savedProduct.maxillaryMaterial || 'Select'}</span>
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
                                      Product - Material
                                    </label>
                                  </div>

                                  {/* Retention Type - Show if retention type selected from popover OR if product has teeth */}
                                  {(hasRetentionTypeSelected(savedProduct, "maxillary") || (savedProduct.maxillaryTeeth && savedProduct.maxillaryTeeth.length > 0)) && (
                                    <RetentionFieldComponent
                                      savedProduct={savedProduct}
                                      isMaxillary={true}
                                      openRetentionDropdown={openRetentionDropdown}
                                      setOpenRetentionDropdown={setOpenRetentionDropdown}
                                      handleFieldChange={handleFieldChange}
                                    />
                                  )}
                                </div>

                                {/* Row 2: Stump Shade, Tooth Shade, Stage */}
                                {isAccordionFieldVisible("stump_shade", savedProduct, "maxillary") && (
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 1,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Stump Shade */}
                                  {(() => {
                                    const productDetails = savedProduct.productDetails
                                    const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                    const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
                                    
                                    if (stumpShadeField) {
                                      return renderSavedAdvanceField(stumpShadeField, savedProduct, "maxillary")
                                    }
                                    
                                    return (
                                      <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                        <div
                                          className="flex items-center justify-between"
                                          style={{
                                            padding: '12px 15px 5px 15px',
                                            gap: '5px',
                                            width: '100%',
                                            height: '37px',
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
                                          }}>{getShadeDisplayText(
                                            savedProduct.maxillaryStumpShade,
                                            savedProduct.maxillaryGumShadeId,
                                            savedProduct.maxillaryGumShadeBrand,
                                            "stump_shade",
                                            savedProduct.productDetails
                                          )}</span>
                                          {savedProduct.maxillaryStumpShade && (
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
                                              }}>{savedProduct.maxillaryStumpShade}</span>
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
                                          Stump Shade
                                        </label>
                                      </div>
                                    )
                                  })()}

                                  {/* Tooth Shade */}
                                  {isAccordionFieldVisible("tooth_shade", savedProduct, "maxillary") && (
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
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
                                      }}>Select</span>
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
                                      Tooth Shade
                                    </label>
                                  </div>
                                  )}

                                  {/* Stage */}
                                  {isAccordionFieldVisible("stage", savedProduct, "maxillary") && (
                                  <StageFieldComponent
                                    savedProduct={savedProduct}
                                    isMaxillary={true}
                                    openStageDropdown={openStageDropdown}
                                    setOpenStageDropdown={setOpenStageDropdown}
                                    handleStageSelect={handleStageSelect}
                                  />
                                  )}
                                </div>
                                )}

                                {/* Notes if available */}
                                {isAccordionFieldVisible("notes", savedProduct, "maxillary") && savedProduct.maxillaryNotes && (
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
                                        }}>{savedProduct.maxillaryNotes}</span>
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
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    )
                  })
              ) : (
                <div className="text-gray-400 text-sm py-4">No maxillary products</div>
              )}
            </div>
          </div>

          {/* Mandibular Products - Right Column */}
          <div className="flex-1 flex flex-col">
            <div className="space-y-1">
              {savedProducts.filter(p => p.addedFrom === "mandibular").length > 0 ? (
                savedProducts
                  .filter(p => p.addedFrom === "mandibular")
                  .map((savedProduct) => {
                    const isMaxillary = false
                    const teeth = savedProduct.mandibularTeeth.sort((a, b) => a - b)

                    return (
                      <Card
                        key={savedProduct.id}
                        className="overflow-hidden shadow-sm"
                        style={{
                          width: '80%',
                          minWidth: '80%',
                          border: savedProduct.rushData ? '1px solid #CF0202' : '1px solid #e5e7eb',
                          borderRadius: '10px'
                        }}
                      >
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full"
                          value={openAccordion === savedProduct.id ? savedProduct.id : ""}
                          onValueChange={handleAccordionChange}
                        >
                          <AccordionItem value={savedProduct.id} className="border-0">
                            {/* Header */}
                            <div
                              className="w-full"
                              style={{
                                position: 'relative',
                                height: '69.92px',
                                background: openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5',
                                boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '5.4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '14px 8px',
                                gap: '10px'
                              }}
                              onClick={() => handleSavedProductCardClick(savedProduct)}
                            >
                              <AccordionTrigger
                                className="hover:no-underline w-full"
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
                                  handleSavedProductCardClick(savedProduct)
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
                                        src={savedProduct.product.image_url || "/images/product-default.png"}
                                        alt={savedProduct.product.name}
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
                                        {savedProduct.rushData && (
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

                                      {/* Badges and Info Row */}
                                      <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.category}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.subcategory}</span>
                                        </div>
                                        <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                          Est days: {savedProduct.product.estimated_days || 10} work days after submission
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
                                      transform: openAccordion === savedProduct.id ? 'rotate(0deg)' : 'rotate(-180deg)'
                                    }}
                                  />
                                </div>
                              </AccordionTrigger>
                              {/* Delete Button - Moved outside AccordionTrigger to avoid nested buttons */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteProduct(savedProduct.id)
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
                            </div>

                            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                              <div
                                className="bg-white w-full"
                                style={{
                                  position: 'relative',
                                  height: 'auto',
                                  minHeight: 'auto',
                                  marginTop: '10px',
                                  paddingLeft: '15.87px',
                                  paddingRight: '15.87px',
                                  paddingBottom: '20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '20px',
                                  background: '#FFFFFF',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Row 1: Product - Material and Retention Type */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 0,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Product - Material */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
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
                                        whiteSpace: 'nowrap'
                                      }}>{savedProduct.mandibularMaterial || 'Select'}</span>
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
                                      Product - Material
                                    </label>
                                  </div>

                                  {/* Retention Type - Show if retention type selected from popover OR if product has teeth */}
                                  {(hasRetentionTypeSelected(savedProduct, "mandibular") || (savedProduct.mandibularTeeth && savedProduct.mandibularTeeth.length > 0)) && (
                                    <RetentionFieldComponent
                                      savedProduct={savedProduct}
                                      isMaxillary={false}
                                      openRetentionDropdown={openRetentionDropdown}
                                      setOpenRetentionDropdown={setOpenRetentionDropdown}
                                      handleFieldChange={handleFieldChange}
                                    />
                                  )}
                                </div>

                                {/* Row 2: Stump Shade, Tooth Shade, Stage */}
                                {isAccordionFieldVisible("stump_shade", savedProduct, "mandibular") && (
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 1,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Stump Shade */}
                                  {(() => {
                                    const productDetails = savedProduct.productDetails
                                    const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                    const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
                                    
                                    if (stumpShadeField) {
                                      return renderSavedAdvanceField(stumpShadeField, savedProduct, "mandibular")
                                    }
                                    
                                    return (
                                      <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                        <div
                                          className="flex items-center justify-between"
                                          style={{
                                            padding: '12px 15px 5px 15px',
                                            gap: '5px',
                                            width: '100%',
                                            height: '37px',
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
                                          }}>{getShadeDisplayText(
                                            savedProduct.mandibularStumpShade,
                                            savedProduct.mandibularGumShadeId,
                                            savedProduct.mandibularGumShadeBrand,
                                            "stump_shade",
                                            savedProduct.productDetails
                                          )}</span>
                                          {savedProduct.mandibularStumpShade && (
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
                                              }}>{savedProduct.mandibularStumpShade}</span>
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
                                          Stump Shade
                                        </label>
                                      </div>
                                    )
                                  })()}

                                  {/* Tooth Shade */}
                                  {isAccordionFieldVisible("tooth_shade", savedProduct, "mandibular") && (
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
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
                                      }}>Select</span>
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
                                      Tooth Shade
                                    </label>
                                  </div>
                                  )}

                                  {/* Stage */}
                                  {isAccordionFieldVisible("stage", savedProduct, "mandibular") && (
                                  <StageFieldComponent
                                    savedProduct={savedProduct}
                                    isMaxillary={false}
                                    openStageDropdown={openStageDropdown}
                                    setOpenStageDropdown={setOpenStageDropdown}
                                    handleStageSelect={handleStageSelect}
                                  />
                                  )}
                                </div>
                                )}

                                {/* Implant Details if available */}
                                {isAccordionFieldVisible("implant_details", savedProduct, "mandibular") && (savedProduct.mandibularImplantBrand || savedProduct.mandibularImplantDetails) && (() => {
                                  // Find the selected brand from implants
                                  const selectedBrand = savedProduct.mandibularImplantBrand 
                                    ? implants.find((imp: any) => imp.id === savedProduct.mandibularImplantBrand || imp.brand_name === savedProduct.mandibularImplantBrand)
                                    : null
                                  
                                  // Find the selected platform
                                  const selectedPlatform = selectedBrand && savedProduct.mandibularImplantPlatform
                                    ? selectedBrand.platforms?.find((p: any) => (p.id || 0) === savedProduct.mandibularImplantPlatform || p.name === savedProduct.mandibularImplantPlatform)
                                    : null
                                  
                                  // Only show form if we have brand data, otherwise show simple text
                                  if (!selectedBrand) {
                                    return (
                                      <div className="w-full" style={{ order: 3, alignSelf: 'stretch', flexGrow: 0 }}>
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
                                            }}>{savedProduct.mandibularImplantDetails || 'No implant details'}</span>
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
                                            Implant Details
                                          </label>
                                        </div>
                                      </div>
                                    )
                                  }
                                  
                                  return (
                                    <div className="w-full" style={{ order: 3, alignSelf: 'stretch', flexGrow: 0 }}>
                                      <ImplantDetailForm
                                        fieldKey={`saved_${savedProduct.id}_mandibular`}
                                        fieldId={0}
                                        selectedBrand={selectedBrand}
                                        selectedPlatform={selectedPlatform}
                                        selectedSize={savedProduct.mandibularImplantSize || null}
                                        onSizeChange={(size) => {
                                          handleFieldChange('mandibularImplantSize', size, undefined, savedProduct.id, 'mandibular')
                                        }}
                                        onInclusionsChange={(inclusions) => {
                                          handleFieldChange('mandibularImplantInclusions', inclusions, undefined, savedProduct.id, 'mandibular')
                                        }}
                                        onAbutmentDetailChange={(detail) => {
                                          handleFieldChange('mandibularAbutmentDetail', detail, undefined, savedProduct.id, 'mandibular')
                                        }}
                                        onAbutmentTypeChange={(type) => {
                                          handleFieldChange('mandibularAbutmentType', type, undefined, savedProduct.id, 'mandibular')
                                        }}
                                        teethNumbers={savedProduct.mandibularTeeth}
                                        arch="mandibular"
                                      />
                                    </div>
                                  )
                                })()}

                                {/* Action Buttons - Only show if advance fields are showing */}
                                {(() => {
                                  const productDetails = savedProduct.productDetails
                                  const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                  const hasAdvanceFields = advanceFields && Array.isArray(advanceFields) && advanceFields.length > 0
                                  // Show advance fields if they exist and either:
                                  // 1. All required fields are filled (material, retention, tooth shade, stage), OR
                                  // 2. Material and retention are filled (minimum requirement)
                                  const allFieldsFilled = savedProduct.mandibularMaterial && savedProduct.mandibularRetention && savedProduct.mandibularToothShade && savedProduct.mandibularStage
                                  const minFieldsFilled = savedProduct.mandibularMaterial && savedProduct.mandibularRetention
                                  return hasAdvanceFields && (allFieldsFilled || minFieldsFilled) && (showAdvanceFields[savedProduct.id] || minFieldsFilled)
                                })() && (
                                <div
                                  className="flex flex-wrap justify-center items-center w-full"
                                  style={{
                                    gap: '7.03px',
                                    position: 'relative',
                                    marginTop: '30px',
                                    marginBottom: '15px'
                                  }}
                                >
                                  {savedProducts.length > 1 && (
                                    <button
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
                                      <div
                                        className="absolute"
                                        style={{
                                          width: '13.91px',
                                          height: '13.91px',
                                          left: '50%',
                                          top: '9.2px',
                                          transform: 'translateX(-50%)',
                                          background: '#FFFFFF',
                                          border: '1.15951px solid #1162A8',
                                          borderRadius: '1.73926px'
                                        }}
                                      />
                                      <span
                                        className="absolute text-center"
                                        style={{
                                          width: '85px',
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
                                        Deliver product first
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setCurrentProductForModal(savedProduct)
                                      setCurrentArchForModal("mandibular")
                                      setShowAddOnsModal(true)
                                    }}
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
                                      Add ons ({getTotalAddOnsCount} selected)
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCurrentProductForModal(savedProduct)
                                      setShowAttachModal(true)
                                    }}
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
                                      Attach Files ({getAttachedFilesCount()} uploads)
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCurrentProductForModal(savedProduct)
                                      setShowRushModal(true)
                                    }}
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
                                </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    )
                  })
              ) : (
                <div className="text-gray-400 text-sm py-4">No mandibular products</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


