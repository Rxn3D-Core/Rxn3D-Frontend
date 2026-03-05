"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/lib/performance-utils"
import { debounce } from "@/lib/performance"
import { Search, Pencil, Eye, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Loader2, Trash2, Plus, Paperclip, Zap, Maximize2, Info, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CustomerLogo } from "@/components/customer-logo"
import { useProductCategory, type ProductCategory } from "@/contexts/product-category-context"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import { MissingTeethCards } from "@/components/missing-teeth-cards"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import { DynamicProductFields } from "@/components/case-design-center/dynamic-product-fields"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { ImplantPartsPopover } from "@/components/implant-parts-popover"
import { ImplantBrandCards } from "@/components/implant-brand-cards"
import { ImplantPlatformCards } from "@/components/implant-platform-cards"
import { ImplantDetailForm } from "@/components/implant-detail-form"
import { useImplants } from "@/lib/api/advance-mode-query"
import { FooterSection } from "./sections/footer-section"
import { CaseSummaryNotesSection } from "./sections/case-summary-notes-section"
import { SectionNavigationArrows } from "./sections/section-navigation-arrows"
import { MaxillarySection } from "./sections/maxillary-section"
import { MandibularSection } from "./sections/mandibular-section"
import { SavedProductPills } from "./sections/saved-product-pills"
import { SavedProductAccordion } from "./sections/saved-product-accordion"
import { SavedProductSectionProvider } from "./sections/saved-product-section-context"
import { SavedProductSectionContent } from "./sections/saved-product-section-content"
import { CaseDesignCenterProvider } from "./context/case-design-center-context"
import { useCaseDesignCenter } from "./hooks/use-case-design-center"
import { ProductCategorySection } from "./sections/product-category-section"
import { ProductSelectionBadge } from "./components/product-selection-badge"
import { StageFieldComponent } from "./components/stage-field-component"
import { useCaseDesignStore } from "@/stores/caseDesignStore"
import type { ProductCategoryApi, Doctor, Lab, PatientData, Product, SavedProduct } from "./sections/types"

// Dynamic imports for heavy components - loaded only when needed (MaxillaryTeethSVG/MandibularTeethSVG are in section components)
const ToothShadeSelectionSVG = dynamic(
  () => import("@/components/tooth-shade-selection-svg").then((mod) => ({ default: mod.ToothShadeSelectionSVG })),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)

const TrubyteBioformIPNShadeSelectionSVG = dynamic(
  () => import("@/components/trubye-bioform-ipn-shade-selection-svg").then((mod) => ({ default: mod.TrubyeBioformIPNShadeSelectionSVG })),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)

const AddOnsModal = dynamic(
  () => import("@/components/add-ons-modal"),
  {
    ssr: false,
    loading: () => null
  }
)

const RushRequestModal = dynamic(
  () => import("@/components/rush-request-modal"),
  {
    ssr: false,
    loading: () => null
  }
)

const PrintPreviewModal = dynamic(
  () => import("@/components/print-preview-modal"),
  {
    ssr: false,
    loading: () => null
  }
)

const CancelSlipCreationModal = dynamic(
  () => import("@/components/cancel-slip-creation-modal"),
  {
    ssr: false,
    loading: () => null
  }
)

const ImpressionSelectionModal = dynamic(
  () => import("@/components/impression-selection-modal").then((mod) => ({ default: mod.ImpressionSelectionModal })),
  {
    ssr: false,
    loading: () => null
  }
)

const ToothShadeSelectionModal = dynamic(
  () => import("@/components/tooth-shade-selection-modal").then((mod) => ({ default: mod.ToothShadeSelectionModal })),
  {
    ssr: false,
    loading: () => null
  }
)

const FileAttachmentModalContent = dynamic(
  () => import("@/components/file-attachment-modal-content"),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)

export default function CaseDesignCenterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const caseDesignCenterValue = useCaseDesignCenter();
  const {
    selectedDoctor, setSelectedDoctor, selectedLab, setSelectedLab, patientData, setPatientData, createdBy, setCreatedBy, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    selectedCategoryId, setSelectedCategoryId, selectedSubcategory, setSelectedSubcategory, selectedSubcategoryId, setSelectedSubcategoryId, showSubcategories, setShowSubcategories, showProducts, setShowProducts, products, setProducts,
    isLoadingProducts, setIsLoadingProducts, selectedProduct, setSelectedProduct, showProductDetails, setShowProductDetails, setProductDetails, setIsLoadingProductDetails, selectedArchForProduct, setSelectedArchForProduct,
    showMaxillaryChart, setShowMaxillaryChart, showMandibularChart, setShowMandibularChart, selectedProductForMaxillary, setSelectedProductForMaxillary, selectedProductForMandibular, setSelectedProductForMandibular, maxillaryTeeth, setMaxillaryTeeth, mandibularTeeth, setMandibularTeeth,
    maxillaryRetentionTypes, setMaxillaryRetentionTypes, mandibularRetentionTypes, setMandibularRetentionTypes, maxillarySectionRef, mandibularSectionRef, toothSelectionRef, subcategoriesScrollRef, productsScrollRef, showSubcategoriesLeftArrow, setShowSubcategoriesLeftArrow, showSubcategoriesRightArrow,
    setShowSubcategoriesRightArrow, showProductsLeftArrow, setShowProductsLeftArrow, showProductsRightArrow, setShowProductsRightArrow, mainCategories, filteredSubcategories, filteredProducts, allCategoriesLoading, subcategoriesLoading, subcategoriesError, getCategoryImage,
    getSubcategoryImage, handleCategorySelect, handleSubcategorySelect, handleProductSelect, handleBackToCategories, handleBackToSubcategories, handleBackToProducts, scrollSubcategories, scrollProducts, checkSubcategoriesScroll, checkProductsScroll, handlePatientNameChange,
    handlePatientGenderChange, savedProductSectionContextValue, showArchSelectionPopover, setShowArchSelectionPopover, pendingProductForArchSelection, setPendingProductForArchSelection, archSelectionPopoverAnchor, setArchSelectionPopoverAnchor, handleArchSelection, isFixedRestoration, isOrthodonticsOrRemovable, missingTeethCardClicked,
    setMissingTeethCardClicked, handleMissingTeethCardClick, handleAddUpperProduct, handleAddLowerProduct, handleDeleteUpperProduct, handleDeleteLowerProduct, resetAllProductState, productSearchResults, isSearchingProducts, debouncedSearchQuery, allowNavigationRef, hasUnsavedWork,
    showRefreshWarningModal, setShowRefreshWarningModal, showCancelModal, setShowCancelModal, showPreviewModal, setShowPreviewModal, showImpressionModal, setShowImpressionModal, currentImpressionArch, setCurrentImpressionArch, selectedImpressions, setSelectedImpressions,
    currentProductForImpression, setCurrentProductForImpression, showShadeModal, setShowShadeModal, currentShadeField, setCurrentShadeField, currentShadeArch, setCurrentShadeArch, currentShadeProductId, setCurrentShadeProductId, selectedShadeGuide, setSelectedShadeGuide,
    selectedShadesForSVG, setSelectedShadesForSVG, handleOpenShadeModal, handleShadeSelect, handleShadeClickFromSVG, maxillaryShadeId, mandibularShadeId, maxillaryGumShadeId, mandibularGumShadeId, shadeGuideOptions, isInitialLoading, setIsInitialLoading, isLoadingProductDetails,
    maxillaryMaterial, setMaxillaryMaterial, mandibularMaterial, setMandibularMaterial, maxillaryRetention, setMaxillaryRetention, mandibularRetention, setMandibularRetention, maxillaryStumpShade, setMaxillaryStumpShade, mandibularStumpShade, setMandibularStumpShade,
    maxillaryToothShade, setMaxillaryToothShade, mandibularToothShade, setMandibularToothShade, maxillaryStage, setMaxillaryStage, mandibularStage, setMandibularStage, maxillaryStageId, mandibularStageId, maxillaryImplantDetails, setMaxillaryImplantDetails, mandibularImplantDetails, setMandibularImplantDetails,
    maxillaryMaterialId, setMaxillaryMaterialId, mandibularMaterialId, setMandibularMaterialId, maxillaryRetentionId, setMaxillaryRetentionId, mandibularRetentionId, setMandibularRetentionId, maxillaryRetentionOptionId, setMaxillaryRetentionOptionId, mandibularRetentionOptionId, setMandibularRetentionOptionId,
    maxillaryImplantInclusions, setMaxillaryImplantInclusions, mandibularImplantInclusions, setMandibularImplantInclusions, maxillaryAbutmentDetail, setMaxillaryAbutmentDetail, mandibularAbutmentDetail, setMandibularAbutmentDetail, maxillaryAbutmentType, setMaxillaryAbutmentType, mandibularAbutmentType, setMandibularAbutmentType,
    advanceFieldValues, setAdvanceFieldValues, selectedImplantBrandForDetails, setSelectedImplantBrandForDetails, selectedImplantPlatformForDetails, setSelectedImplantPlatformForDetails, selectedImplantBrand, setSelectedImplantBrand, selectedImplantPlatform, setSelectedImplantPlatform, selectedImplantSize, setSelectedImplantSize, selectedImplantPlatformData, setSelectedImplantPlatformData, showImplantBrandCardsInFields, setShowImplantBrandCardsInFields, clickedFieldTypeInImplantDetails, setClickedFieldTypeInImplantDetails, fieldConfigs, productDetails,
    handleFieldChange, handleOpenImpressionModal, getImpressionCount, getImpressionDisplayText, showValidationErrors, retentionPopoverState,
    setRetentionPopoverState, handleMaxillaryToothToggle, handleSelectRetentionType, handleMaxillaryToothDeselect, handleMandibularToothToggle, handleMandibularToothDeselect, shouldShowImplantPopover, implantPopoverState, setImplantPopoverState,
    setOpenAccordionMaxillary, setOpenAccordionMandibular,
    isSubmitting, confirmDetailsChecked, setConfirmDetailsChecked, showSubmitPopover, setShowSubmitPopover, hasAtLeastOneCompleteProduct, handlePreview, handleSubmit, getPreviewCaseData,
    showCaseSummaryNotes, setShowCaseSummaryNotes, isCaseSummaryExpanded, setIsCaseSummaryExpanded, getCaseSummaryMaxillaryContent, getCaseSummaryMandibularContent, setCaseSummaryFromParts, previousNotesRef, parseCaseNotes, generateCaseNotes,
    isToothShadeFilled, areAllCurrentProductFieldsFilled,
    showImplantCards, setShowImplantCards, activeImplantFieldKey, setActiveImplantFieldKey, implantSelectionStep, setImplantSelectionStep, clickedFieldTypeInForm, setClickedFieldTypeInForm, implantCardsRef,
    getAdvanceFieldByName, renderSavedAdvanceField,
    impressionModalJustClosedRef, debouncedAutoSaveProduct, handleImpressionQuantityUpdate, getImpressionSelections, stlFilesByImpression, setStlFilesByImpression,
  } = caseDesignCenterValue;

  const savedSection = savedProductSectionContextValue || {};
  const {
    savedProducts,
    openAccordionMaxillary,
    openAccordionMandibular,
    handleAccordionChangeMaxillary,
    handleAccordionChangeMandibular,
    setSavedProducts,
    handleDeleteProduct,
    getImpressionCountFromSaved,
    getImpressionDisplayTextFromSaved,
    handleSavedProductCardClick,
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
  } = savedSection;

  const pageContent = (
    <CaseDesignCenterProvider value={caseDesignCenterValue}>
      <div
        className="min-h-screen w-full"
        style={{
          boxSizing: 'border-box',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        <SlipCreationHeader
          variant="full"
          sendingToLab={selectedLab}
          createdBy={createdBy}
          doctor={selectedDoctor}
          editablePatientData={{
            name: patientData?.name || "",
            gender: patientData?.gender || "",
            onNameChange: handlePatientNameChange,
            onGenderChange: handlePatientGenderChange,
          }}
        />

        {/* Case Design Center Label */}
        <div className="bg-[#fdfdfd] h-[37px] grid grid-cols-3 items-center px-5">
          <div className="flex items-center">
            {showProductDetails ? (
              <Button
                onClick={handleBackToProducts}
                variant="ghost"
                className="text-[#1162a8] hover:text-[#0d4d87] hover:bg-[#dfeefb]"
              >
                ← Back to Products
              </Button>
            ) : showProducts && !showProductDetails ? (
              <Button
                onClick={handleBackToSubcategories}
                variant="ghost"
                className="text-[#1162a8] hover:text-[#0d4d87] hover:bg-[#dfeefb]"
              >
                ← Back to Subcategories
              </Button>
            ) : showSubcategories && !showProducts && !showProductDetails ? (
              <Button
                onClick={handleBackToCategories}
                variant="ghost"
                className="text-[#1162a8] hover:text-[#0d4d87] hover:bg-[#dfeefb]"
              >
                ← Back to Categories
              </Button>
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-2">
            <p className="text-base font-bold text-black">CASE DESIGN CENTER</p>

          </div>
        </div>

        {/* Main Content - Figma Frame 76 - extra bottom padding so product accordion can scroll above sticky footer */}
        <div
          className="w-full"
          style={{
            boxSizing: 'border-box',
            position: 'relative',
            minHeight: 'calc(100vh - 250px)',
            paddingBottom: '80px',
          }}
        >
          {/* Content Area - Full width with minimal padding */}
          <div
            className="w-full"
            style={{
              boxSizing: 'border-box',
              width: '100%',
              minHeight: '100%',
              padding: '0 10px',
            }}
          >
            {/* Search and Category Selection */}
            <div className="flex flex-col items-center">
              {/* Search and Labels Row */}
              <div className="flex items-center w-full gap-4">
                {/* Product Selection Badge removed - charts now show directly */}

              </div>

              {/* Unified Search Bar - Show in all views */}
              {!showProductDetails && (
                <div className="flex justify-center mb-2">
                  <div className="relative max-w-[373px] w-full">
                    <Input
                      type="text"
                      placeholder="Search Products"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-[34px] pl-3 pr-10 border-[#b4b0b0] rounded"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#b4b0b0]" />
                  </div>
                </div>
              )}

              {/* Product Search Results - Show when there's a search query, regardless of view */}
              {!showProductDetails && searchQuery.trim() && (
                <div className="w-full mb-4">
                  {isSearchingProducts ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-gray-500">Searching products...</div>
                    </div>
                  ) : productSearchResults.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="text-center">
                        <p className="text-gray-600">{`No products found matching "${searchQuery}"`}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 justify-center flex-wrap">
                      {productSearchResults.map((product: Product) => {
                        const isSelected = selectedProduct?.id === product.id
                        const isPending = pendingProductForArchSelection?.id === product.id
                        return (
                          <div
                            key={product.id}
                            onClick={(e) => handleProductSelect(product, e)}
                            className={`bg-white border-2 ${isSelected || isPending ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                              } rounded-lg h-[210px] w-[155px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all`}
                          >
                            <div className="w-[117px] h-[117px] rounded overflow-hidden">
                              <img
                                src={product.image_url || "/images/product-default.png"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/images/product-default.png"
                                }}
                              />
                            </div>
                            <p className="text-[11px] text-black text-center">
                              {product.name}
                            </p>
                            <div className="flex flex-col gap-1 items-start w-[87px]">
                              <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                                <p className="text-[#1162a8] text-[9.5px]">
                                  ${product.price || 999}
                                </p>
                              </div>
                              <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                                <p className="text-[#929393] text-[9.5px]">
                                  est {product.estimated_days || 14} days
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <ProductCategorySection />

              {/* Product Details Split View - Show when product is selected */}
              {showProductDetails && selectedProduct && (
                <SavedProductSectionProvider value={savedProductSectionContextValue}>
                  <div
                    ref={toothSelectionRef}
                    className="w-full"
                    style={{ paddingBottom: '80px' }}
                  >
                    {!(isInitialLoading || isLoadingProductDetails) && (
                      <>
                        {/* Implant Selection Cards - REMOVED: Now shown inside DynamicProductFields when implant details field is clicked */}

                        {/* Tooth Selection Interface - Two Column Layout per Figma */}
                        <div
                          className="flex items-start justify-center"
                          style={{
                            gap: '0px',
                            width: '100%',
                            marginBottom: '8px',
                          }}
                        >
                          {/* MAXILLARY Section */}
                          {showMaxillaryChart && (
                            <MaxillarySection sectionRef={maxillarySectionRef}>
                              {showMaxillaryChart && ((maxillaryTeeth.length > 0 && selectedProductForMaxillary && !savedProducts.some(sp => {
                                if (sp.addedFrom !== "maxillary") return false
                                const savedTeeth = (sp.maxillaryTeeth || []).map((t: number) => Number(t)).sort((a, b) => a - b)
                                const currentTeeth = maxillaryTeeth.map((t: number) => Number(t)).sort((a, b) => a - b)
                                const sameTeeth = savedTeeth.length === currentTeeth.length && savedTeeth.every((t, i) => t === currentTeeth[i])
                                const sameProduct = String(sp.product?.id ?? "") === String(selectedProductForMaxillary?.id ?? "")
                                return sameTeeth && sameProduct
                              })) || savedProducts.filter(p => p.addedFrom === "maxillary").length > 0) && (
                                  <>
                                    {showMaxillaryChart && maxillaryTeeth.length > 0 && selectedProductForMaxillary && !savedProducts.some(sp => {
                                      if (sp.addedFrom !== "maxillary") return false
                                      return String(sp.product?.id ?? "") === String(selectedProductForMaxillary?.id ?? "")
                                    }) && (
                                        <AccordionItem value="maxillary-card" className="border-0 flex justify-center">
                                          <Card
                                            className="overflow-hidden w-full"
                                            style={{
                                              position: 'relative',
                                              width: '100%',
                                              maxWidth: '720px',
                                              left: '0.87px',
                                              top: 0,
                                              background: '#FFFFFF',
                                              borderRadius: '5.4px',
                                              border: 'none',
                                              boxShadow: 'none',
                                            }}
                                          >
                                            {/* Header - Hide when shade selection is active */}
                                            <div
                                              className="w-full"
                                              style={{
                                                position: 'relative',
                                                minHeight: '38px',
                                                background: openAccordionMaxillary === "maxillary-card" ? '#E0EDF8' : '#F5F5F5',
                                                borderRadius: openAccordionMaxillary === "maxillary-card" ? '8px 8px 0px 0px' : '8px',
                                                display: currentShadeField ? 'none' : 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                padding: '8px 6px',
                                                gap: '2px',
                                                borderBottom: openAccordionMaxillary === "maxillary-card" ? '1px dotted #B0D0F0' : 'none'
                                              }}
                                            >
                                              <AccordionTrigger
                                                className="hover:no-underline w-full group [&>svg]:hidden"
                                                style={{
                                                  padding: '0px',
                                                  gap: '10px',
                                                  width: '100%',
                                                  background: 'transparent',
                                                  boxShadow: 'none',
                                                  borderRadius: '0px'
                                                }}
                                              >
                                                {/* Responsive Content Container */}
                                                <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '6px', paddingRight: '20px' }}>
                                                  {/* Product Image */}
                                                  <div
                                                    style={{
                                                      width: '28px',
                                                      minWidth: '28px',
                                                      height: '28px',
                                                      background: `url(${selectedProductForMaxillary?.image_url || "/images/tooth-icon.png"}), #FFFFFF`,
                                                      backgroundSize: 'contain',
                                                      backgroundPosition: 'center',
                                                      backgroundRepeat: 'no-repeat',
                                                      borderRadius: '4px',
                                                      flexShrink: 0
                                                    }}
                                                  />

                                                  {/* Content Area - Responsive */}
                                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, alignItems: 'flex-start' }}>
                                                    {/* Product Name - Bold, plain text */}
                                                    {selectedProductForMaxillary?.name && (
                                                      <span
                                                        style={{
                                                          fontFamily: 'Verdana',
                                                          fontStyle: 'normal',
                                                          fontWeight: 600,
                                                          fontSize: '12px',
                                                          lineHeight: '14px',
                                                          letterSpacing: '-0.02em',
                                                          color: '#000000',
                                                          wordBreak: 'break-word',
                                                          overflowWrap: 'break-word',
                                                          textAlign: 'left',
                                                          width: '100%'
                                                        }}
                                                      >
                                                        {selectedProductForMaxillary.name}
                                                      </span>
                                                    )}

                                                    {/* Tooth Numbers Row - Formatted as #9 */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                      <span
                                                        style={{
                                                          fontFamily: 'Verdana',
                                                          fontStyle: 'normal',
                                                          fontWeight: 400,
                                                          fontSize: '10px',
                                                          lineHeight: '12px',
                                                          letterSpacing: '-0.02em',
                                                          color: '#000000'
                                                        }}
                                                      >
                                                        {(() => {
                                                          const sortedTeeth = [...maxillaryTeeth].sort((a, b) => a - b);
                                                          return sortedTeeth.length > 0 ? sortedTeeth.map(t => `#${t}`).join(', ') : '';
                                                        })()}
                                                      </span>
                                                    </div>

                                                    {/* Badges and Info Row - Responsive */}
                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                                      {/* Badge - Category - Pill shaped */}
                                                      {selectedCategory && (
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '1px 6px', background: '#F0F0F0', borderRadius: '10px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '9px', lineHeight: '11px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{selectedCategory}</span>
                                                        </div>
                                                      )}

                                                      {/* Badge - Subcategory - Pill shaped */}
                                                      {selectedSubcategory && (
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '1px 6px', background: '#F0F0F0', borderRadius: '10px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '9px', lineHeight: '11px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{selectedSubcategory}</span>
                                                        </div>
                                                      )}

                                                      {/* Est days */}
                                                      <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '9px', lineHeight: '11px', letterSpacing: '-0.02em', color: '#B4B0B0', whiteSpace: 'nowrap' }}>
                                                        Est days: {selectedProductForMaxillary?.estimated_days || 10} work days after submission
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Chevron - Positioned relative to header */}
                                                <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                                  <ChevronDown
                                                    className="w-full h-full transition-transform duration-200 text-black"
                                                    style={{
                                                      transform: openAccordionMaxillary === "maxillary-card" ? 'rotate(0deg)' : 'rotate(-180deg)'
                                                    }}
                                                  />
                                                </div>
                                              </AccordionTrigger>
                                            </div>
                                            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto', overflowY: 'auto' }}>
                                              {/* Tooth Shade Selection - Shows at the top when active */}
                                              {currentShadeField && currentShadeArch === "maxillary" && (
                                                <div className="w-full pt-4">
                                                  <div className="flex flex-col w-full">
                                                    {/* Top Row: Stump Shade, Tooth Shade fields and Shade Guide Dropdown */}
                                                    <div className="w-full flex items-start gap-4 px-4 mb-4">
                                                      {/* Stump Shade Field */}
                                                      <div className="relative flex-1">
                                                        <div
                                                          className={cn(
                                                            "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200 flex items-center cursor-pointer",
                                                            maxillaryStumpShade ? "border-[#119933]" : "border-[#ef4444] hover:border-[#ef4444]"
                                                          )}
                                                          onClick={() => handleOpenShadeModal("stump_shade", "maxillary")}
                                                        >
                                                          <span className={maxillaryStumpShade ? "text-black" : "text-gray-400"}>
                                                            {maxillaryStumpShade}
                                                          </span>
                                                          {maxillaryStumpShade && (
                                                            <div className="ml-auto flex items-center gap-2">
                                                              <span className="text-sm bg-gray-100 px-2 py-1 rounded">{maxillaryStumpShade.split(' - ')[1]}</span>
                                                              <Check className="h-5 w-5 text-[#119933]" />
                                                            </div>
                                                          )}
                                                        </div>
                                                        <label className={cn(
                                                          "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                          maxillaryStumpShade ? "text-[#119933]" : "text-[#ef4444]"
                                                        )}>
                                                          {maxillaryStumpShade ? "Stump Shade" : "Select Stump Shade"}<span className="text-red-500">*</span>
                                                        </label>
                                                      </div>

                                                      {/* Tooth Shade Field - shown only after Stump Shade is selected */}
                                                      {maxillaryStumpShade && (
                                                        <div className="relative flex-1">
                                                          <div
                                                            className={cn(
                                                              "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200 flex items-center cursor-pointer",
                                                              maxillaryToothShade ? "border-[#119933]" : "border-[#ef4444] hover:border-[#ef4444]"
                                                            )}
                                                            onClick={() => handleOpenShadeModal("tooth_shade", "maxillary")}
                                                          >
                                                            <span className={maxillaryToothShade ? "text-black" : "text-gray-400"}>
                                                              {maxillaryToothShade}
                                                            </span>
                                                            {maxillaryToothShade && (
                                                              <div className="ml-auto flex items-center gap-2">
                                                                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{maxillaryToothShade.split(' - ')[1]}</span>
                                                                <Check className="h-5 w-5 text-[#119933]" />
                                                              </div>
                                                            )}
                                                          </div>
                                                          <label className={cn(
                                                            "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                            maxillaryToothShade ? "text-[#119933]" : "text-[#ef4444]"
                                                          )}>
                                                            {maxillaryToothShade ? "Tooth Shade" : "Select Tooth Shade"}<span className="text-red-500">*</span>
                                                          </label>
                                                        </div>
                                                      )}

                                                      {/* Shade Guide Dropdown */}
                                                      <div className="relative min-w-[220px]">
                                                        <Select value={selectedShadeGuide} onValueChange={setSelectedShadeGuide}>
                                                          <SelectTrigger
                                                            className={cn(
                                                              "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200",
                                                              selectedShadeGuide ? "border-[#119933]" : "border-[#E0E0E0] hover:border-[#1162A8]"
                                                            )}
                                                          >
                                                            <SelectValue />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {shadeGuideOptions.map((guide) => (
                                                              <SelectItem key={guide} value={guide}>
                                                                {guide}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                        <label className={cn(
                                                          "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                          selectedShadeGuide ? "text-[#119933]" : "text-gray-500"
                                                        )}>
                                                          Shade guide selected
                                                        </label>
                                                        {selectedShadeGuide && (
                                                          <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                            <Check className="h-5 w-5 text-[#119933]" />
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>

                                                    {/* Shade guide SVG - Full Width */}
                                                    <div className="bg-white w-full">
                                                      {selectedShadeGuide === "Trubyte Bioform IPN" ? (
                                                        <TrubyteBioformIPNShadeSelectionSVG
                                                          selectedShades={selectedShadesForSVG}
                                                          onShadeClick={handleShadeClickFromSVG}
                                                          className="w-full"
                                                        />
                                                      ) : (
                                                        <ToothShadeSelectionSVG
                                                          selectedShades={selectedShadesForSVG}
                                                          onShadeClick={handleShadeClickFromSVG}
                                                          className="w-full"
                                                        />
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              {/* Summary detail */}
                                              <div
                                                className="bg-white w-full"
                                                style={{
                                                  position: 'relative',
                                                  height: 'auto',
                                                  minHeight: 'auto',
                                                  paddingLeft: '15.87px',
                                                  paddingRight: '15.87px',
                                                  paddingBottom: '8px',
                                                  paddingTop: '8px',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'flex-start',
                                                  background: '#FFFFFF',
                                                  boxSizing: 'border-box'
                                                }}
                                              >
                                                {/* Dynamic Fields - Rendered based on productDetails */}
                                                {productDetails && (
                                                  <>
                                                    <DynamicProductFields
                                                      productDetails={productDetails}
                                                      savedProduct={{
                                                        maxillaryMaterial,
                                                        maxillaryRetention,
                                                        maxillaryStumpShade,
                                                        maxillaryToothShade,
                                                        maxillaryStage,
                                                        maxillaryMaterialId,
                                                        maxillaryRetentionId,
                                                        maxillaryRetentionOptionId,
                                                        maxillaryGumShadeId,
                                                        maxillaryShadeId,
                                                        maxillaryStageId,
                                                        maxillaryImplantDetails,
                                                        maxillaryImplantInclusions,
                                                        maxillaryAbutmentDetail,
                                                        maxillaryAbutmentType,
                                                      }}
                                                      arch="maxillary"
                                                      fieldConfigs={fieldConfigs}
                                                      onFieldChange={(fieldKey, value, id) => {
                                                        handleFieldChange(fieldKey, value, id, undefined, "maxillary")
                                                      }}
                                                      maxillaryRetentionTypes={maxillaryRetentionTypes}
                                                      mandibularRetentionTypes={mandibularRetentionTypes}
                                                      maxillaryTeeth={maxillaryTeeth}
                                                      mandibularTeeth={mandibularTeeth}
                                                      onOpenImpressionModal={() => {
                                                        if (selectedProductForMaxillary) {
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
                                                        }
                                                      }}
                                                      getImpressionCount={() => {
                                                        if (!selectedProductForMaxillary || !productDetails?.impressions) return 0
                                                        const productId = selectedProductForMaxillary.id.toString()
                                                        return getImpressionCount(productId, "maxillary", productDetails.impressions)
                                                      }}
                                                      getImpressionDisplayText={() => {
                                                        if (!selectedProductForMaxillary || !productDetails?.impressions) return "Select impression"
                                                        const productId = selectedProductForMaxillary.id.toString()
                                                        return getImpressionDisplayText(productId, "maxillary", productDetails.impressions)
                                                      }}
                                                      onOpenShadeModal={(fieldKey) => {
                                                        handleOpenShadeModal(fieldKey, "maxillary")
                                                      }}
                                                      showImplantBrandCards={showImplantBrandCardsInFields.maxillary || false}
                                                      implantsLoading={implantsLoading}
                                                      implants={implants.map((imp: any) => ({
                                                        id: imp.id,
                                                        brand_name: imp.brand_name,
                                                        system_name: imp.system_name,
                                                        code: imp.code,
                                                        image_url: imp.image_url,
                                                        platforms: imp.platforms?.map((p: any) => ({
                                                          id: p.id || 0,
                                                          name: p.name,
                                                          image: p.image_url
                                                        }))
                                                      }))}
                                                      selectedImplantId={selectedImplantBrandForDetails.maxillary || null}
                                                      onSelectImplant={(implant: any) => {
                                                        setSelectedImplantBrandForDetails(prev => ({ ...prev, maxillary: implant.id }))
                                                        // You can add additional logic here to update implant details
                                                      }}
                                                      onImplantDetailsFieldClick={() => {
                                                        setShowImplantBrandCardsInFields(prev => ({ ...prev, maxillary: !prev.maxillary }))
                                                      }}
                                                      selectedImplantPlatformId={selectedImplantPlatformForDetails.maxillary || null}
                                                      onSelectImplantPlatform={(platform: any) => {
                                                        setSelectedImplantPlatformForDetails(prev => ({ ...prev, maxillary: platform.id }))
                                                        // You can add additional logic here to update implant details with platform
                                                      }}
                                                      onBrandFieldClick={() => {
                                                        setShowImplantBrandCardsInFields(prev => ({ ...prev, maxillary: true }))
                                                        setClickedFieldTypeInImplantDetails(prev => ({ ...prev, maxillary: 'brand' }))
                                                      }}
                                                      onPlatformFieldClick={() => {
                                                        setShowImplantBrandCardsInFields(prev => ({ ...prev, maxillary: true }))
                                                        setClickedFieldTypeInImplantDetails(prev => ({ ...prev, maxillary: 'platform' }))
                                                      }}
                                                      selectedImplantBrand={selectedImplantBrand}
                                                      selectedImplantPlatform={selectedImplantPlatform}
                                                      selectedImplantSize={selectedImplantSize}
                                                      hideFieldsDuringShadeSelection={currentShadeField !== null && currentShadeArch === "maxillary"}
                                                      hideImpression={productDetails?.advance_fields && Array.isArray(productDetails.advance_fields) && productDetails.advance_fields.length > 0}
                                                    />

                                                    {/* Implant Brand/Platform Cards - Shows at the bottom when implant details field is clicked */}
                                                    {/* Only show if retention type is "Implant" */}
                                                    {(() => {
                                                      // Check if any tooth has "Implant" retention type for maxillary
                                                      const hasImplantRetention = Object.values(maxillaryRetentionTypes).some(
                                                        (types) => types && types.includes('Implant')
                                                      )
                                                      return hasImplantRetention
                                                    })() && showImplantBrandCardsInFields.maxillary && implants && implants.length > 0 && (
                                                        <div className="w-full pt-2" data-implant-details-form="maxillary">
                                                          <div className="flex flex-col items-center gap-2 w-full">
                                                            <div className="bg-white w-full flex justify-center">
                                                              {(() => {
                                                                const selectedBrandId = selectedImplantBrandForDetails.maxillary
                                                                const selectedBrand = selectedBrandId ? implants.find((imp: any) => imp.id === selectedBrandId) : null
                                                                const platforms = selectedBrand?.platforms || []
                                                                const mappedPlatforms = platforms.map((plat: any) => ({
                                                                  id: plat.id || 0,
                                                                  name: plat.name,
                                                                  image: plat.image_url || plat.image
                                                                }))
                                                                const selectedPlatformId = selectedImplantPlatformForDetails.maxillary
                                                                const clickedFieldType = clickedFieldTypeInImplantDetails.maxillary

                                                                // Show platform cards if:
                                                                // 1. Platform field was clicked AND brand is selected (highest priority - show even if no platforms), OR
                                                                // 2. Brand is selected, platform not selected yet, and brand field was NOT clicked (auto-show after brand selection)
                                                                const shouldShowPlatformCards = (clickedFieldType === 'platform' && selectedBrandId) ||
                                                                  (clickedFieldType !== 'brand' && (clickedFieldType === null || clickedFieldType === undefined) && selectedBrandId && selectedPlatformId === null)

                                                                // Show brand cards if:
                                                                // 1. Brand field was clicked, OR
                                                                // 2. No brand selected yet, OR
                                                                // 3. Platform cards should not be shown
                                                                const shouldShowBrandCards = !shouldShowPlatformCards && (clickedFieldType === 'brand' ||
                                                                  !selectedBrandId)

                                                                // Priority: Platform cards take precedence when platform field is clicked
                                                                if (shouldShowPlatformCards) {
                                                                  return (
                                                                    <ImplantPlatformCards
                                                                      platforms={mappedPlatforms}
                                                                      selectedPlatformId={selectedPlatformId}
                                                                      onSelectPlatform={(platform: any) => {
                                                                        setSelectedImplantPlatformForDetails(prev => ({ ...prev, maxillary: platform.id }))
                                                                        // Reset clicked field type after selection
                                                                        setClickedFieldTypeInImplantDetails(prev => ({ ...prev, maxillary: null }))
                                                                        // Scroll to the implant detail form after platform selection
                                                                        setTimeout(() => {
                                                                          const formElement = document.querySelector('[data-implant-details-form="maxillary"]')
                                                                          if (formElement) {
                                                                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                          }
                                                                        }, 100)
                                                                      }}
                                                                      arch="maxillary"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Show brand cards only if platform cards are not being shown
                                                                if (shouldShowBrandCards) {
                                                                  const mappedImplants = implants.map((imp: any) => ({
                                                                    id: imp.id,
                                                                    brand_name: imp.brand_name,
                                                                    system_name: imp.system_name,
                                                                    code: imp.code,
                                                                    image_url: imp.image_url,
                                                                    platforms: imp.platforms?.map((p: any) => ({
                                                                      id: p.id || 0,
                                                                      name: p.name,
                                                                      image: p.image_url
                                                                    }))
                                                                  }))

                                                                  return (
                                                                    <ImplantBrandCards
                                                                      implants={mappedImplants}
                                                                      selectedImplantId={selectedBrandId}
                                                                      onSelectImplant={(implant: any) => {
                                                                        setSelectedImplantBrandForDetails(prev => ({ ...prev, maxillary: implant.id }))
                                                                        // If brand has platforms, reset platform selection to show platform cards
                                                                        if (implant.platforms && implant.platforms.length > 0) {
                                                                          setSelectedImplantPlatformForDetails(prev => ({ ...prev, maxillary: null }))
                                                                          // Auto-show platform cards after brand selection
                                                                          setClickedFieldTypeInImplantDetails(prev => ({ ...prev, maxillary: null }))
                                                                        } else {
                                                                          // No platforms, reset clicked field type and scroll to form
                                                                          setClickedFieldTypeInImplantDetails(prev => ({ ...prev, maxillary: null }))
                                                                          // Scroll to the implant detail form
                                                                          setTimeout(() => {
                                                                            const formElement = document.querySelector('[data-implant-details-form="maxillary"]')
                                                                            if (formElement) {
                                                                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                            }
                                                                          }, 100)
                                                                        }
                                                                      }}
                                                                      arch="maxillary"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                return null
                                                              })()}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                    {/* Advance Fields - Shown after tooth shade is selected */}
                                                    {productDetails &&
                                                      productDetails.advance_fields &&
                                                      Array.isArray(productDetails.advance_fields) &&
                                                      productDetails.advance_fields.length > 0 &&
                                                      isToothShadeFilled("maxillary") && (() => {
                                                        // Filter out stump shade from advanced fields - use existing stump shade field instead
                                                        const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)

                                                        // Check if any tooth has "Implant" retention type for maxillary
                                                        const hasImplantRetention = Object.values(maxillaryRetentionTypes).some(
                                                          (types) => types && types.includes('Implant')
                                                        )

                                                        const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
                                                          const fieldNameLower = (field.name || "").toLowerCase()
                                                          // Filter out stump shade fields
                                                          if (stumpShadeField && fieldNameLower.includes("stump") && fieldNameLower.includes("shade")) {
                                                            return false
                                                          }
                                                          // Filter out implant_library fields if no tooth has "Implant" retention type
                                                          if (field.field_type === "implant_library" && !hasImplantRetention) {
                                                            return false
                                                          }
                                                          return true
                                                        })

                                                        // If no fields remain after filtering, don't render the section
                                                        if (filteredAdvanceFields.length === 0) {
                                                          return null
                                                        }

                                                        const archType = "maxillary" // This is the maxillary section

                                                        return (
                                                          <div
                                                            className="flex flex-col gap-5"
                                                            style={{
                                                              display: 'flex',
                                                              flexDirection: 'column',
                                                              alignItems: 'flex-start',
                                                              padding: '0px',
                                                              flex: 'none',
                                                              alignSelf: 'stretch',
                                                              flexGrow: 0,
                                                              marginTop: '2px',
                                                            }}
                                                          >
                                                            <div className="w-full">
                                                              <div className="grid grid-cols-1 gap-4" style={{ gap: '8px 16px' }}>
                                                                {filteredAdvanceFields.map((field: any) => {
                                                                  const fieldKey = `advance_${field.id}`
                                                                  const currentValue = advanceFieldValues[fieldKey] || ""

                                                                  // Calculate width based on field type - 3 column grid layout
                                                                  const getFieldWidth = (): { minWidth: string; maxWidth: string; width: string; flex: string; gridColumn?: string } => {
                                                                    if (field.field_type === "multiline_text") {
                                                                      return { minWidth: "100%", maxWidth: "100%", width: "100%", flex: "1 1 100%", gridColumn: "1 / -1" }
                                                                    }

                                                                    // All other fields take 1 column in the 3-column grid
                                                                    return {
                                                                      minWidth: "0",
                                                                      maxWidth: "100%",
                                                                      width: "100%",
                                                                      flex: '1 1 auto'
                                                                    }
                                                                  }

                                                                  const fieldWidth = getFieldWidth()

                                                                  // Check if field is required and value is "Not specified" or empty
                                                                  const isFieldRequired = field.is_required === "Yes" || field.is_required === true
                                                                  const displayValue = typeof currentValue === "object"
                                                                    ? currentValue?.advance_field_value || ""
                                                                    : currentValue || ""

                                                                  // For checkbox fields, check if at least one option is selected
                                                                  let isEmptyOrNotSpecified = false
                                                                  if (field.field_type === "checkbox") {
                                                                    const currentSelectedIds = typeof currentValue === "object"
                                                                      ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids :
                                                                        currentValue?.option_id ? [currentValue.option_id] : [])
                                                                      : []
                                                                    isEmptyOrNotSpecified = currentSelectedIds.length === 0
                                                                  } else {
                                                                    isEmptyOrNotSpecified = !displayValue ||
                                                                      displayValue.trim() === "" ||
                                                                      displayValue.trim().toLowerCase() === "not specified" ||
                                                                      (field.field_type === "dropdown" && displayValue === `Select ${field.name}`)
                                                                  }

                                                                  const showRedBorder = isFieldRequired && isEmptyOrNotSpecified

                                                                  // Render based on field_type
                                                                  const renderAdvanceField = () => {
                                                                    // Dropdown field
                                                                    if (field.field_type === "dropdown" && field.options && Array.isArray(field.options)) {
                                                                      // Get current selected option
                                                                      const currentOptionId = typeof currentValue === "object"
                                                                        ? currentValue?.option_id?.toString()
                                                                        : currentValue?.toString() || ""

                                                                      // Filter active options only
                                                                      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)

                                                                      // If only one option and no value is set, auto-select it
                                                                      if (!currentOptionId && activeOptions.length === 1) {
                                                                        const singleOption = activeOptions[0]
                                                                        setTimeout(() => {
                                                                          setAdvanceFieldValues(prev => ({
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: singleOption.name,
                                                                              option_id: singleOption.id
                                                                            }
                                                                          }))
                                                                        }, 0)
                                                                      }

                                                                      // Find default option if no value is set and more than one option
                                                                      const defaultOption = !currentOptionId && activeOptions.length > 1
                                                                        ? activeOptions.find((opt: any) =>
                                                                          opt.is_default === "Yes" || opt.is_default === true
                                                                        )
                                                                        : null

                                                                      const selectedOptionId = currentOptionId || defaultOption?.id?.toString() || ""
                                                                      const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === selectedOptionId)

                                                                      // Auto-select default if exists and no value is set
                                                                      if (defaultOption && !currentOptionId && activeOptions.length > 1) {
                                                                        setTimeout(() => {
                                                                          setAdvanceFieldValues(prev => ({
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: defaultOption.name,
                                                                              option_id: defaultOption.id
                                                                            }
                                                                          }))
                                                                        }, 0)
                                                                      }

                                                                      return (
                                                                        <Select
                                                                          value={selectedOptionId}
                                                                          onValueChange={(value) => {
                                                                            const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === value)
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: selectedOption ? {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: selectedOption.name,
                                                                                option_id: selectedOption.id
                                                                              } : null
                                                                            }))
                                                                          }}
                                                                        >
                                                                          <SelectTrigger
                                                                            className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px] font-normal"
                                                                            style={{
                                                                              padding: '8px 12px 4px 12px',
                                                                              gap: '5px',
                                                                              background: '#FFFFFF',
                                                                              border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                              boxSizing: 'border-box',
                                                                              width: '100%',
                                                                            }}
                                                                          >
                                                                            <SelectValue placeholder={`Select ${field.name}`}>
                                                                              {selectedOption ? selectedOption.name : `Select ${field.name}`}
                                                                            </SelectValue>
                                                                          </SelectTrigger>
                                                                          <SelectContent>
                                                                            {activeOptions
                                                                              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                                              .map((option: any) => (
                                                                                <SelectItem key={option.id} value={option.id.toString()}>
                                                                                  {option.name}
                                                                                </SelectItem>
                                                                              ))}
                                                                          </SelectContent>
                                                                        </Select>
                                                                      )
                                                                    }

                                                                    // Text field
                                                                    if (field.field_type === "text") {
                                                                      return (
                                                                        <Input
                                                                          type="text"
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '80px',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Number field
                                                                    if (field.field_type === "number") {
                                                                      return (
                                                                        <Input
                                                                          type="number"
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Multiline text (textarea)
                                                                    if (field.field_type === "multiline_text") {
                                                                      return (
                                                                        <Textarea
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '80px',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Radio field
                                                                    if (field.field_type === "radio" && field.options && Array.isArray(field.options)) {
                                                                      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                                                                      const currentOptionId = typeof currentValue === "object"
                                                                        ? currentValue?.option_id?.toString()
                                                                        : currentValue?.toString() || ""

                                                                      // Find default option if no value is set
                                                                      const defaultOption = !currentOptionId
                                                                        ? activeOptions.find((opt: any) =>
                                                                          opt.is_default === "Yes" || opt.is_default === true
                                                                        )
                                                                        : null

                                                                      const selectedOptionId = currentOptionId || defaultOption?.id?.toString() || ""

                                                                      // Auto-select default if exists and no value is set
                                                                      if (defaultOption && !currentOptionId) {
                                                                        setTimeout(() => {
                                                                          setAdvanceFieldValues(prev => ({
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: defaultOption.name,
                                                                              option_id: defaultOption.id
                                                                            }
                                                                          }))
                                                                        }, 0)
                                                                      }

                                                                      return (
                                                                        <div
                                                                          className="mt-[5.27px] rounded-[7.7px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '37px',
                                                                            background: '#FFFFFF',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                        >
                                                                          <RadioGroup
                                                                            value={selectedOptionId}
                                                                            onValueChange={(value) => {
                                                                              const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === value)
                                                                              setAdvanceFieldValues(prev => ({
                                                                                ...prev,
                                                                                [fieldKey]: selectedOption ? {
                                                                                  advance_field_id: field.id,
                                                                                  advance_field_value: selectedOption.name,
                                                                                  option_id: selectedOption.id
                                                                                } : null
                                                                              }))
                                                                            }}
                                                                            className="space-y-2"
                                                                          >
                                                                            {activeOptions
                                                                              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                                              .map((option: any) => (
                                                                                <div key={option.id} className="flex items-center space-x-2">
                                                                                  <RadioGroupItem value={option.id.toString()} id={`${fieldKey}-${option.id}`} />
                                                                                  <Label
                                                                                    htmlFor={`${fieldKey}-${option.id}`}
                                                                                    className="text-[14.4px] font-normal cursor-pointer"
                                                                                  >
                                                                                    {option.name}
                                                                                  </Label>
                                                                                </div>
                                                                              ))}
                                                                          </RadioGroup>
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // Checkbox field (multiple selection)
                                                                    if (field.field_type === "checkbox" && field.options && Array.isArray(field.options)) {
                                                                      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)

                                                                      // For checkbox, value can be an array of selected option IDs
                                                                      const currentSelectedIds = typeof currentValue === "object"
                                                                        ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids :
                                                                          currentValue?.option_id ? [currentValue.option_id] : [])
                                                                        : []

                                                                      const handleCheckboxChange = (optionId: number, checked: boolean) => {
                                                                        setAdvanceFieldValues(prev => {
                                                                          const current = prev[fieldKey]
                                                                          const currentIds = typeof current === "object"
                                                                            ? (Array.isArray(current?.option_ids) ? current.option_ids :
                                                                              current?.option_id ? [current.option_id] : [])
                                                                            : []

                                                                          let newIds: number[]
                                                                          if (checked) {
                                                                            newIds = [...currentIds, optionId]
                                                                          } else {
                                                                            newIds = currentIds.filter((id: number) => id !== optionId)
                                                                          }

                                                                          // Get selected option names
                                                                          const selectedOptions = activeOptions.filter((opt: any) => newIds.includes(opt.id))
                                                                          const optionNames = selectedOptions.map((opt: any) => opt.name).join(", ")

                                                                          return {
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: optionNames || "",
                                                                              option_ids: newIds
                                                                            }
                                                                          }
                                                                        })
                                                                      }

                                                                      return (
                                                                        <div
                                                                          className="mt-[5.27px] rounded-[7.7px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '37px',
                                                                            background: '#FFFFFF',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                        >
                                                                          <div className="space-y-2">
                                                                            {activeOptions
                                                                              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                                              .map((option: any) => (
                                                                                <div key={option.id} className="flex items-center space-x-2">
                                                                                  <Checkbox
                                                                                    id={`${fieldKey}-${option.id}`}
                                                                                    checked={currentSelectedIds.includes(option.id)}
                                                                                    onCheckedChange={(checked) => handleCheckboxChange(option.id, checked === true)}
                                                                                    className="border-gray-400"
                                                                                  />
                                                                                  <Label
                                                                                    htmlFor={`${fieldKey}-${option.id}`}
                                                                                    className="text-[14.4px] font-normal cursor-pointer"
                                                                                  >
                                                                                    {option.name}
                                                                                  </Label>
                                                                                </div>
                                                                              ))}
                                                                          </div>
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // File upload field
                                                                    if (field.field_type === "file_upload") {
                                                                      const currentFile = typeof currentValue === "object" && currentValue?.file
                                                                        ? currentValue.file
                                                                        : null

                                                                      return (
                                                                        <div
                                                                          className="mt-[5.27px] rounded-[7.7px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '37px',
                                                                            background: '#FFFFFF',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                        >
                                                                          <input
                                                                            type="file"
                                                                            onChange={(e) => {
                                                                              const file = e.target.files?.[0] || null
                                                                              setAdvanceFieldValues(prev => ({
                                                                                ...prev,
                                                                                [fieldKey]: {
                                                                                  advance_field_id: field.id,
                                                                                  advance_field_value: file?.name || "",
                                                                                  file: file
                                                                                }
                                                                              }))
                                                                            }}
                                                                            className="text-[14.4px] w-full"
                                                                            accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.stl,.mp4,.avi,.mov,.zip,.rar"
                                                                          />
                                                                          {currentFile && (
                                                                            <div className="mt-2 text-xs text-gray-600">
                                                                              Selected: {currentFile.name}
                                                                            </div>
                                                                          )}
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // Shade guide field
                                                                    if (field.field_type === "shade_guide") {
                                                                      return (
                                                                        <Input
                                                                          type="text"
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Implant library field
                                                                    if (field.field_type === "implant_library") {
                                                                      const currentStep = implantSelectionStep[fieldKey] || 'brand'
                                                                      const selectedBrandId = selectedImplantBrand[fieldKey]
                                                                      const selectedPlatformId = selectedImplantPlatform[fieldKey]
                                                                      const selectedSize = selectedImplantSize[fieldKey]

                                                                      // Get selected brand and platform
                                                                      const selectedBrand = selectedBrandId ? implants.find((imp: any) => imp.id === selectedBrandId) : null
                                                                      // Try to find platform in brand's platforms first, otherwise use stored platform data (for static platforms)
                                                                      let selectedPlatform = null
                                                                      if (selectedBrand && selectedPlatformId) {
                                                                        selectedPlatform = selectedBrand.platforms?.find((p: any) => Number(p.id) === Number(selectedPlatformId))
                                                                        // If not found in brand's platforms, use stored platform data (static platforms)
                                                                        if (!selectedPlatform && selectedImplantPlatformData[fieldKey]) {
                                                                          selectedPlatform = selectedImplantPlatformData[fieldKey]
                                                                        }
                                                                      }

                                                                      // Build display value
                                                                      let displayValue = ""
                                                                      if (selectedBrand && selectedPlatform && selectedSize) {
                                                                        displayValue = `${selectedBrand.brand_name} - ${selectedPlatform.name} - ${selectedSize}`
                                                                      } else if (selectedBrand && selectedPlatform) {
                                                                        displayValue = `${selectedBrand.brand_name} - ${selectedPlatform.name}`
                                                                      } else if (selectedBrand) {
                                                                        displayValue = selectedBrand.brand_name
                                                                      }

                                                                      return (
                                                                        <>
                                                                          {/* Only show input if form is not shown yet */}
                                                                          {currentStep !== 'form' && (
                                                                            <Input
                                                                              type="text"
                                                                              value={displayValue || (typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || "")}
                                                                              onClick={() => {
                                                                                // Show cards when input is clicked, reset to brand step
                                                                                setShowImplantCards(true)
                                                                                setActiveImplantFieldKey(fieldKey)
                                                                                setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'brand' }))
                                                                              }}
                                                                              onFocus={() => {
                                                                                // Show cards when input is focused, reset to brand step
                                                                                setShowImplantCards(true)
                                                                                setActiveImplantFieldKey(fieldKey)
                                                                                setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'brand' }))
                                                                              }}
                                                                              onChange={(e) => {
                                                                                setAdvanceFieldValues(prev => ({
                                                                                  ...prev,
                                                                                  [fieldKey]: {
                                                                                    advance_field_id: field.id,
                                                                                    advance_field_value: e.target.value
                                                                                  }
                                                                                }))
                                                                              }}
                                                                              className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px] cursor-pointer"
                                                                              style={{
                                                                                padding: '8px 12px 4px 12px',
                                                                                border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                                width: '100%',
                                                                              }}
                                                                              readOnly
                                                                            />
                                                                          )}

                                                                          {/* Implant Detail Form - Show after brand/platform selection */}
                                                                          {currentStep === 'form' && selectedBrand && (
                                                                            <div data-implant-field-key={fieldKey} style={{ width: '100%' }}>
                                                                              <ImplantDetailForm
                                                                                fieldKey={fieldKey}
                                                                                fieldId={field.id}
                                                                                selectedBrand={selectedBrand}
                                                                                selectedPlatform={selectedPlatform}
                                                                                selectedSize={selectedSize}
                                                                                onSizeChange={(size: string) => {
                                                                                  setSelectedImplantSize(prev => ({ ...prev, [fieldKey]: size }))
                                                                                  // Update maxillaryImplantDetails to trigger impression field visibility in DynamicProductFields
                                                                                  if (selectedBrand && selectedPlatform) {
                                                                                    const implantDetailsStr = `${selectedBrand.brand_name} - ${selectedPlatform.name} - ${size}`
                                                                                    setMaxillaryImplantDetails(implantDetailsStr)
                                                                                  }
                                                                                }}
                                                                                onInclusionsChange={(inclusions) => {
                                                                                  // Handle inclusions change - update state for impression field visibility
                                                                                  setMaxillaryImplantInclusions(inclusions)
                                                                                  if (selectedBrand && selectedPlatform && selectedSize) {
                                                                                    const implantDetailsStr = `${selectedBrand.brand_name} - ${selectedPlatform.name} - ${selectedSize} - ${inclusions}`
                                                                                    setMaxillaryImplantDetails(implantDetailsStr)
                                                                                  }
                                                                                }}
                                                                                onAbutmentDetailChange={(detail) => {
                                                                                  // Handle abutment detail change - update state for impression field visibility
                                                                                  setMaxillaryAbutmentDetail(detail)
                                                                                }}
                                                                                onAbutmentTypeChange={(type) => {
                                                                                  // Handle abutment type change - update state for impression field visibility
                                                                                  setMaxillaryAbutmentType(type)
                                                                                }}
                                                                                onPlatformChange={(platform) => {
                                                                                  const platformIdNum = Number(platform?.id)
                                                                                  if (!Number.isNaN(platformIdNum)) {
                                                                                    setSelectedImplantPlatform(prev => ({ ...prev, [fieldKey]: platformIdNum }))
                                                                                    setSelectedImplantPlatformData(prev => ({ ...prev, [fieldKey]: { id: platformIdNum, name: platform.name } }))
                                                                                  }
                                                                                }}
                                                                                onBrandFieldClick={() => {
                                                                                  // Show brand cards when brand field is clicked
                                                                                  setShowImplantCards(true)
                                                                                  setActiveImplantFieldKey(fieldKey)
                                                                                  // Keep step as 'form' so form stays visible, but show brand cards
                                                                                  setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                                  setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: 'brand' }))
                                                                                  // Scroll to the cards container to show the brand cards
                                                                                  setTimeout(() => {
                                                                                    if (implantCardsRef.current) {
                                                                                      implantCardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                                    }
                                                                                  }, 100)
                                                                                }}
                                                                                onPlatformFieldClick={() => {
                                                                                  // Show platform cards when platform field is clicked (same position as brand cards)
                                                                                  if (selectedBrand) {
                                                                                    // Ensure the brand ID is stored in state so cards rendering can find it
                                                                                    if (!selectedImplantBrand[fieldKey] || selectedImplantBrand[fieldKey] !== selectedBrand.id) {
                                                                                      setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: selectedBrand.id }))
                                                                                    }
                                                                                    setShowImplantCards(true)
                                                                                    setActiveImplantFieldKey(fieldKey)
                                                                                    // Keep step as 'form' so form stays visible, but show platform cards
                                                                                    setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                                    setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: 'platform' }))
                                                                                    // Scroll to the cards container to show the platform cards (same position as brand cards)
                                                                                    setTimeout(() => {
                                                                                      if (implantCardsRef.current) {
                                                                                        implantCardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                                      }
                                                                                    }, 100)
                                                                                  }
                                                                                }}
                                                                                teethNumbers={maxillaryTeeth}
                                                                                arch={archType}
                                                                              />
                                                                            </div>
                                                                          )}
                                                                        </>
                                                                      )
                                                                    }

                                                                    // Default: display field name
                                                                    return (
                                                                      <div
                                                                        className="flex items-center"
                                                                        style={{
                                                                          padding: '8px 12px 4px 12px',
                                                                          gap: '5px',
                                                                          width: '100%',
                                                                          minHeight: '37px',
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
                                                                          fontSize: '13px',
                                                                          lineHeight: '20px',
                                                                          letterSpacing: '-0.02em',
                                                                          color: '#000000'
                                                                        }}>
                                                                          {field.name || field.description || "Advanced Field"} ({field.field_type})
                                                                        </span>
                                                                      </div>
                                                                    )
                                                                  }

                                                                  return (
                                                                    <div
                                                                      key={field.id}
                                                                      className="relative"
                                                                      style={{
                                                                        minHeight: '38px',
                                                                        width: '100%',
                                                                        ...(fieldWidth.gridColumn ? { gridColumn: fieldWidth.gridColumn } : {}),
                                                                      }}
                                                                    >
                                                                      {renderAdvanceField()}
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
                                                                        {field.field_type === "implant_library" && isEmptyOrNotSpecified
                                                                          ? "Select Implant Details"
                                                                          : (field.name || "Advanced Field")}
                                                                        {field.is_required === "Yes" && (
                                                                          <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                                        )}
                                                                      </label>
                                                                    </div>
                                                                  )
                                                                })}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      })()}

                                                    {/* Implant Brand Cards for Advance Fields - Shows when implant details advance field is clicked */}
                                                    {/* Only show if retention type is "Implant" */}
                                                    {(() => {
                                                      // Check if any tooth has "Implant" retention type for maxillary
                                                      const hasImplantRetention = Object.values(maxillaryRetentionTypes).some(
                                                        (types) => types && types.includes('Implant')
                                                      )
                                                      return hasImplantRetention
                                                    })() && showImplantCards && activeImplantFieldKey && activeImplantFieldKey.startsWith('advance_') && implants && implants.length > 0 && (
                                                        <div ref={implantCardsRef} className="w-full pt-2">
                                                          <div className="flex flex-col items-center gap-2 w-full">
                                                            <div className="bg-white w-full flex justify-center">
                                                              {(() => {
                                                                const fieldKey = activeImplantFieldKey
                                                                const currentStep = implantSelectionStep[fieldKey] || 'brand'
                                                                const selectedBrandId = selectedImplantBrand[fieldKey]
                                                                let selectedBrand = selectedBrandId ? implants.find((imp: any) => imp.id === selectedBrandId) : null

                                                                // If we're in form mode and selectedBrand is not found, try to get it from the form's selectedBrand prop
                                                                // This handles the case where the brand was selected but the state lookup fails
                                                                if (!selectedBrand && currentStep === 'form') {
                                                                  // Try to find the brand by checking if we have a brand name in advanceFieldValues
                                                                  const currentValue = advanceFieldValues[fieldKey]
                                                                  if (currentValue && typeof currentValue === 'object' && currentValue.advance_field_value) {
                                                                    const brandName = typeof currentValue.advance_field_value === 'string'
                                                                      ? currentValue.advance_field_value.split(' - ')[0]
                                                                      : null
                                                                    if (brandName) {
                                                                      const foundBrand = implants.find((imp: any) => imp.brand_name === brandName)
                                                                      if (foundBrand) {
                                                                        selectedBrand = foundBrand
                                                                        // If found, update the selectedBrandId
                                                                        if (!selectedBrandId) {
                                                                          setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: foundBrand.id }))
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }

                                                                const platforms = selectedBrand?.platforms || []
                                                                const mappedPlatforms = platforms.map((plat: any) => ({
                                                                  id: plat.id || 0,
                                                                  name: plat.name,
                                                                  image: plat.image_url || plat.image
                                                                }))
                                                                const selectedPlatformId = selectedImplantPlatform[fieldKey]
                                                                const clickedFieldType = clickedFieldTypeInForm[fieldKey]

                                                                // Show platform cards if:
                                                                // 1. We're on platform step, OR
                                                                // 2. We're in form step and platform field was clicked (hide brand cards when platform is clicked)
                                                                // Then check if we have a brand with platforms
                                                                const shouldShowPlatformCards = currentStep === 'platform' || (currentStep === 'form' && showImplantCards && clickedFieldType === 'platform')

                                                                // Show brand cards if:
                                                                // 1. We're on brand step, OR
                                                                // 2. We're in form step and brand field was clicked (hide platform cards when brand is clicked)
                                                                const shouldShowBrandCards = currentStep === 'brand' || (currentStep === 'form' && showImplantCards && clickedFieldType === 'brand')

                                                                // Priority: Platform cards take precedence when platform field is clicked
                                                                if (shouldShowPlatformCards && selectedBrand) {
                                                                  return (
                                                                    <ImplantPlatformCards
                                                                      platforms={mappedPlatforms}
                                                                      selectedPlatformId={selectedPlatformId}
                                                                      onSelectPlatform={(platform: any) => {
                                                                        const platformIdNum = Number(platform.id)
                                                                        if (!Number.isNaN(platformIdNum)) {
                                                                          setSelectedImplantPlatform(prev => ({ ...prev, [fieldKey]: platformIdNum }))
                                                                          setSelectedImplantPlatformData(prev => ({ ...prev, [fieldKey]: { id: platformIdNum, name: platform.name } }))
                                                                        }
                                                                        // After platform selection, keep form visible and hide the cards
                                                                        setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                        setShowImplantCards(false)
                                                                        setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: null }))
                                                                        // Scroll to the form
                                                                        setTimeout(() => {
                                                                          const formElement = document.querySelector(`[data-implant-field-key="${fieldKey}"]`)
                                                                          if (formElement) {
                                                                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                          }
                                                                        }, 100)
                                                                      }}
                                                                      arch="maxillary"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Show brand cards only if platform cards are not being shown
                                                                if (shouldShowBrandCards && !shouldShowPlatformCards) {
                                                                  return (
                                                                    <ImplantBrandCards
                                                                      implants={implants.map((imp: any) => ({
                                                                        id: imp.id,
                                                                        brand_name: imp.brand_name,
                                                                        system_name: imp.system_name,
                                                                        code: imp.code,
                                                                        image_url: imp.image_url,
                                                                        platforms: imp.platforms?.map((p: any) => ({
                                                                          id: p.id || 0,
                                                                          name: p.name,
                                                                          image: p.image_url
                                                                        }))
                                                                      }))}
                                                                      selectedImplantId={selectedBrandId || null}
                                                                      onSelectImplant={(implant: any) => {
                                                                        setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: implant.id }))
                                                                        // If brand has platforms, show platform cards, otherwise go directly to form
                                                                        if (implant.platforms && implant.platforms.length > 0) {
                                                                          setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'platform' }))
                                                                        } else {
                                                                          // No platforms, go directly to form
                                                                          setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                          setShowImplantCards(false)
                                                                          setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: null }))
                                                                          // Scroll to the form
                                                                          setTimeout(() => {
                                                                            const formElement = document.querySelector(`[data-implant-field-key="${fieldKey}"]`)
                                                                            if (formElement) {
                                                                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                            }
                                                                          }, 100)
                                                                        }
                                                                      }}
                                                                      arch="maxillary"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Default: don't show any cards if conditions don't match
                                                                return null
                                                              })()}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}


                                                    {/* Impression Field - Shown after advance fields are complete */}
                                                    {productDetails?.impressions &&
                                                      Array.isArray(productDetails.impressions) &&
                                                      productDetails.impressions.length > 0 &&
                                                      productDetails?.advance_fields &&
                                                      Array.isArray(productDetails.advance_fields) &&
                                                      productDetails.advance_fields.length > 0 &&
                                                      isToothShadeFilled("maxillary") && (() => {
                                                        // Check if all advance fields are complete
                                                        const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
                                                          const fieldNameLower = (field.name || "").toLowerCase()
                                                          return !(fieldNameLower.includes("stump") && fieldNameLower.includes("shade"))
                                                        })

                                                        const allAdvanceFieldsComplete = filteredAdvanceFields.every((field: any) => {
                                                          if (field.field_type === "implant_library") {
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

                                                        if (!allAdvanceFieldsComplete) return null

                                                        const impressionCount = selectedProductForMaxillary
                                                          ? getImpressionCount(selectedProductForMaxillary.id.toString(), "maxillary", productDetails.impressions)
                                                          : 0
                                                        const displayText = selectedProductForMaxillary
                                                          ? getImpressionDisplayText(selectedProductForMaxillary.id.toString(), "maxillary", productDetails.impressions)
                                                          : "Select impression"
                                                        const hasImpressionValue = impressionCount > 0 || (displayText && displayText !== "Select impression")

                                                        return (
                                                          <div className="flex flex-wrap" style={{ width: '100%' }}>
                                                            <div style={{ flex: '1 1 50%', minWidth: '200px', maxWidth: '50%' }}>
                                                              <div className="relative" style={{ minHeight: '38px', width: '100%' }}>
                                                                <div
                                                                  className="flex items-center cursor-pointer"
                                                                  onClick={() => {
                                                                    if (selectedProductForMaxillary) {
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
                                                                    }
                                                                  }}
                                                                  style={{
                                                                    padding: '8px 12px 4px 12px',
                                                                    gap: '5px',
                                                                    width: '100%',
                                                                    height: '32px',
                                                                    position: 'relative',
                                                                    marginTop: '5.27px',
                                                                    background: '#FFFFFF',
                                                                    border: `0.740384px solid ${hasImpressionValue ? '#119933' : '#ef4444'}`,
                                                                    borderRadius: '7.7px',
                                                                    boxSizing: 'border-box'
                                                                  }}
                                                                >
                                                                  <span style={{
                                                                    fontFamily: 'Verdana',
                                                                    fontStyle: 'normal',
                                                                    fontWeight: 400,
                                                                    fontSize: '13px',
                                                                    lineHeight: '20px',
                                                                    letterSpacing: '-0.02em',
                                                                    color: '#000000',
                                                                    whiteSpace: 'nowrap',
                                                                    paddingRight: hasImpressionValue ? '30px' : '0px'
                                                                  }}>{displayText}</span>
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
                                                                    color: hasImpressionValue ? '#119933' : '#ef4444'
                                                                  }}
                                                                >
                                                                  Impression<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                                </label>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      })()}
                                                  </>
                                                )}

                                              </div>

                                              {/* Action Buttons - Show when all fields have values */}
                                              {productDetails &&
                                                areAllCurrentProductFieldsFilled("maxillary") && (
                                                  <div
                                                    className="flex flex-wrap justify-center items-center w-full"
                                                    style={{
                                                      gap: '16px',
                                                      position: 'relative',
                                                    }}
                                                  >
                                                    {/* Deliver product first - Only show if multiple products */}
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
                                                        // Only proceed if we have a valid selectedProductForMaxillary with an ID
                                                        if (!selectedProductForMaxillary || !selectedProductForMaxillary.id) {
                                                          console.error("Cannot open add-ons modal: No product selected")
                                                          return
                                                        }

                                                        // For card accordion, use selectedProductForMaxillary
                                                        const arch = "maxillary"
                                                        // Create a temporary saved product structure for the modal
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
                                                          addedFrom: arch,
                                                        }
                                                        console.log(`🔘 Opening Add Ons Modal for product ID: ${selectedProductForMaxillary.id}, arch: ${arch}`)
                                                        setCurrentProductForModal(tempProduct)
                                                        setCurrentArchForModal(arch)
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
                                                        // For card accordion, create temp product for rush modal
                                                        const tempProduct: SavedProduct = {
                                                          id: selectedProductForMaxillary?.id?.toString() || `temp-${Date.now()}`,
                                                          product: selectedProductForMaxillary || { id: 0, name: "Product", price: 0 },
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
                                                        setCurrentProductForModal(tempProduct)
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
                                            </AccordionContent>
                                          </Card>
                                        </AccordionItem>
                                      )}
                                    {savedProducts
                                      .filter(p => p.addedFrom === "maxillary")
                                      .map((savedProduct, index) => {
                                        const teeth = savedProduct.maxillaryTeeth.sort((a, b) => a - b)
                                        const displayTeeth = teeth.length === 1
                                          ? `#${teeth[0]}`
                                          : teeth.length > 0
                                            ? `#${teeth.join(", #")}`
                                            : "No teeth selected"

                                        const productDetails = savedProduct.productDetails
                                        const archType: "maxillary" | "mandibular" = "maxillary"
                                        const categoryLower = savedProduct.category.toLowerCase()
                                        const isFixedRestoration = categoryLower.includes("fixed")
                                        const isRemovableOrOrtho = categoryLower.includes("removable") ||
                                          categoryLower.includes("orthodontic") ||
                                          categoryLower.includes("ortho")

                                        return (
                                          <AccordionItem key={savedProduct.id} value={String(savedProduct.id)} className="border-0 flex justify-center">
                                            <Card
                                              className="overflow-hidden w-full"
                                              style={{
                                                position: 'relative',
                                                width: '100%',
                                                maxWidth: '720px',
                                                minWidth: 0,
                                                left: '0.87px',
                                                top: 0,
                                                background: '#FFFFFF',
                                                borderRadius: '5.4px',
                                                border: 'none',
                                              }}
                                            >
                                              {/* Header */}
                                              <div
                                                className="w-full min-w-0"
                                                style={{
                                                  position: 'relative',
                                                  minHeight: '45px',
                                                  background: savedProduct.rushData ? '#FFE2E2' : (String(openAccordionMaxillary) === String(savedProduct.id) ? '#E0EDF8' : '#F5F5F5'),
                                                  borderRadius: String(openAccordionMaxillary) === String(savedProduct.id) ? '10px 10px 0px 0px' : '10px',
                                                  border: savedProduct.rushData ? '1px solid #CF0202' : 'none',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'flex-start',
                                                  padding: '6px 8px',
                                                  gap: '8px',
                                                  borderBottom: String(openAccordionMaxillary) === String(savedProduct.id) ? '1px dotted #B0D0F0' : 'none'
                                                }}
                                              >
                                                <AccordionTrigger
                                                  className="hover:no-underline w-full group [&>svg]:hidden"
                                                  style={{
                                                    padding: '0px',
                                                    gap: '10px',
                                                    width: '100%',
                                                    background: 'transparent',
                                                    boxShadow: 'none',
                                                    borderRadius: '0px'
                                                  }}
                                                >
                                                  {/* Responsive Content Container */}
                                                  <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px', paddingRight: '24px' }}>
                                                    {/* Product Image */}
                                                    <div
                                                      style={{
                                                        width: '32px',
                                                        minWidth: '32px',
                                                        height: '32px',
                                                        background: '#F5F5F5',
                                                        borderRadius: '5.4px',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
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

                                                    {/* Content Area - Responsive */}
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, alignItems: 'flex-start' }}>
                                                      {/* Product Name - Bold, plain text */}
                                                      <span
                                                        style={{
                                                          fontFamily: 'Verdana',
                                                          fontStyle: 'normal',
                                                          fontWeight: 600,
                                                          fontSize: '14px',
                                                          lineHeight: '16px',
                                                          letterSpacing: '-0.02em',
                                                          color: '#000000',
                                                          wordBreak: 'break-word',
                                                          overflowWrap: 'break-word',
                                                          textAlign: 'left',
                                                        }}
                                                      >
                                                        {savedProduct.product.name}
                                                      </span>

                                                      {/* Tooth Numbers Row - Formatted as #9 */}
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span
                                                          style={{
                                                            fontFamily: 'Verdana',
                                                            fontStyle: 'normal',
                                                            fontWeight: 400,
                                                            fontSize: '12px',
                                                            lineHeight: '14px',
                                                            letterSpacing: '-0.02em',
                                                            color: '#000000'
                                                          }}
                                                        >
                                                          {teeth.length > 0 ? teeth.map(t => `#${t}`).join(', ') : ''}
                                                        </span>
                                                        {/* Rush Icon Indicator */}
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

                                                      {/* Badges and Info Row - Responsive */}
                                                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                        {/* Badge - Category - Pill shaped */}
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '3px 10px', background: '#F0F0F0', borderRadius: '12px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 500, fontSize: '12px', lineHeight: '14px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{savedProduct.category}</span>
                                                        </div>

                                                        {/* Badge - Subcategory - Pill shaped */}
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '3px 10px', background: '#F0F0F0', borderRadius: '12px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 500, fontSize: '12px', lineHeight: '14px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{savedProduct.subcategory}</span>
                                                        </div>

                                                        {/* Badge - Stage - Pill shaped */}
                                                        {savedProduct.maxillaryStage && (
                                                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '3px 10px', background: '#F0F0F0', borderRadius: '12px', flexShrink: 0 }}>
                                                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 500, fontSize: '12px', lineHeight: '14px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{savedProduct.maxillaryStage}</span>
                                                          </div>
                                                        )}

                                                        {/* Est days */}
                                                        <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '11px', lineHeight: '13px', letterSpacing: '-0.02em', color: '#B4B0B0', whiteSpace: 'nowrap' }}>
                                                          Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Chevron - explicit, placed last (rightmost) after trash so it stays clickable */}
                                                  <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: `translateY(-50%) ${String(openAccordionMaxillary) === String(savedProduct.id) ? 'rotate(0deg)' : 'rotate(-180deg)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12 }}>
                                                    <ChevronDown className="w-full h-full transition-transform duration-200 text-black" />
                                                  </div>
                                                </AccordionTrigger>
                                                {/* Delete Button - left of chevron (trash first, then chevron on the right) */}
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
                                                    right: '36px',
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

                                              <AccordionContent className="pt-0 scrollbar-blue" style={{ position: 'relative', minHeight: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
                                                {/* Summary detail - Progressive field disclosure */}
                                                <div
                                                  className="bg-white w-full"
                                                  style={{
                                                    position: 'relative',
                                                    height: 'auto',
                                                    minHeight: 'auto',
                                                    marginTop: '10px',
                                                    paddingLeft: '15.87px',
                                                    paddingRight: '15.87px',
                                                    paddingBottom: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    background: '#FFFFFF',
                                                    boxSizing: 'border-box',
                                                    width: '100%'
                                                  }}
                                                >
                                                  {/* Dynamic Fields - Rendered based on productDetails */}
                                                  {productDetails && (
                                                    <>
                                                      <DynamicProductFields
                                                        productDetails={productDetails}
                                                        savedProduct={{
                                                          maxillaryMaterial: savedProduct.maxillaryMaterial,
                                                          maxillaryRetention: savedProduct.maxillaryRetention,
                                                          maxillaryStumpShade: savedProduct.maxillaryStumpShade,
                                                          maxillaryToothShade: savedProduct.maxillaryToothShade,
                                                          maxillaryStage: savedProduct.maxillaryStage,
                                                          maxillaryMaterialId: savedProduct.maxillaryMaterialId,
                                                          maxillaryRetentionId: savedProduct.maxillaryRetentionId,
                                                          maxillaryRetentionOptionId: savedProduct.maxillaryRetentionOptionId,
                                                          maxillaryGumShadeId: savedProduct.maxillaryGumShadeId,
                                                          maxillaryShadeId: savedProduct.maxillaryShadeId,
                                                          maxillaryStageId: savedProduct.maxillaryStageId,
                                                          maxillaryImplantDetails: savedProduct.maxillaryImplantDetails,
                                                          maxillaryImplantInclusions: savedProduct.maxillaryImplantInclusions,
                                                          maxillaryAbutmentDetail: savedProduct.maxillaryAbutmentDetail,
                                                          maxillaryAbutmentType: savedProduct.maxillaryAbutmentType,
                                                        }}
                                                        arch="maxillary"
                                                        fieldConfigs={fieldConfigs}
                                                        onFieldChange={(fieldKey, value, id) => {
                                                          // Update saved product when field changes
                                                          setSavedProducts(prev => prev.map(sp => {
                                                            if (sp.id === savedProduct.id) {
                                                              const update: any = { [fieldKey]: value }
                                                              if (id !== undefined) {
                                                                update[`${fieldKey}Id`] = id
                                                              }
                                                              return { ...sp, ...update }
                                                            }
                                                            return sp
                                                          }))
                                                        }}
                                                        maxillaryRetentionTypes={maxillaryRetentionTypes}
                                                        mandibularRetentionTypes={mandibularRetentionTypes}
                                                        maxillaryTeeth={savedProduct.maxillaryTeeth}
                                                        mandibularTeeth={savedProduct.mandibularTeeth}
                                                        onOpenImpressionModal={() => {
                                                          handleOpenImpressionModal(savedProduct, "maxillary")
                                                        }}
                                                        getImpressionCount={() => {
                                                          if (savedProduct.maxillaryImpressions?.length) return getImpressionCountFromSaved(savedProduct.maxillaryImpressions)
                                                          if (!savedProduct.product || !productDetails?.impressions) return 0
                                                          const productId = savedProduct.product.id.toString()
                                                          return getImpressionCount(productId, "maxillary", productDetails.impressions)
                                                        }}
                                                        getImpressionDisplayText={() => {
                                                          if (savedProduct.maxillaryImpressions?.length) return getImpressionDisplayTextFromSaved(savedProduct.maxillaryImpressions)
                                                          if (!savedProduct.product || !productDetails?.impressions) return "Select impression"
                                                          const productId = savedProduct.product.id.toString()
                                                          return getImpressionDisplayText(productId, "maxillary", productDetails.impressions)
                                                        }}
                                                        onOpenShadeModal={(fieldKey) => {
                                                          handleOpenShadeModal(fieldKey, "maxillary")
                                                        }}
                                                        showImplantBrandCards={false}
                                                        implantsLoading={implantsLoading}
                                                        implants={implants.map((imp: any) => ({
                                                          id: imp.id,
                                                          brand_name: imp.brand_name,
                                                          system_name: imp.system_name,
                                                          code: imp.code,
                                                          image_url: imp.image_url,
                                                          platforms: imp.platforms?.map((p: any) => ({
                                                            id: p.id || 0,
                                                            name: p.name,
                                                            image: p.image_url
                                                          }))
                                                        }))}
                                                        selectedImplantId={selectedImplantBrandPerProduct[savedProduct.id]?.maxillary || savedProduct.maxillaryImplantBrand || null}
                                                        onSelectImplant={(implant: any) => {
                                                          setSelectedImplantBrandPerProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: implant.id
                                                            }
                                                          }))
                                                          // Update saved product
                                                          setSavedProducts(prev => prev.map(sp => {
                                                            if (sp.id === savedProduct.id) {
                                                              return {
                                                                ...sp,
                                                                maxillaryImplantBrand: implant.id
                                                              }
                                                            }
                                                            return sp
                                                          }))
                                                        }}
                                                        onImplantDetailsFieldClick={() => {
                                                          setShowImplantCardsForProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: !prev[savedProduct.id]?.maxillary
                                                            }
                                                          }))
                                                        }}
                                                        selectedImplantPlatformId={selectedImplantPlatformPerProduct[savedProduct.id]?.maxillary || null}
                                                        onSelectImplantPlatform={(platform: any) => {
                                                          setSelectedImplantPlatformPerProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: platform.id
                                                            }
                                                          }))
                                                        }}
                                                        onBrandFieldClick={() => {
                                                          setShowImplantCardsForProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: true
                                                            }
                                                          }))
                                                          setClickedFieldTypeInAccordion(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: 'brand'
                                                            }
                                                          }))
                                                        }}
                                                        onPlatformFieldClick={() => {
                                                          setShowImplantCardsForProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: true
                                                            }
                                                          }))
                                                          setClickedFieldTypeInAccordion(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: {
                                                              ...prev[savedProduct.id],
                                                              maxillary: 'platform'
                                                            }
                                                          }))
                                                        }}
                                                        selectedImplantBrand={selectedImplantBrand}
                                                        selectedImplantPlatform={selectedImplantPlatform}
                                                        selectedImplantSize={selectedImplantSize}
                                                        hideFieldsDuringShadeSelection={currentShadeField !== null && currentShadeArch === "maxillary"}
                                                        hideImpression={productDetails?.advance_fields && Array.isArray(productDetails.advance_fields) && productDetails.advance_fields.length > 0}
                                                      />

                                                      {/* Implant Detail Form - Below tooth shade field for saved products with implant retention */}
                                                      {(() => {
                                                        let hasImplantRetentionForForm = false
                                                        const teethForForm = savedProduct.maxillaryTeeth || []
                                                        hasImplantRetentionForForm = teethForForm.some((toothNumber: number) => {
                                                          const types = maxillaryRetentionTypes[toothNumber] || []
                                                          return types.includes('Implant')
                                                        })
                                                        if (!hasImplantRetentionForForm && productDetails?.retention_options && savedProduct.maxillaryRetentionOptionId) {
                                                          const opt = productDetails.retention_options.find((o: any) =>
                                                            o.id === savedProduct.maxillaryRetentionOptionId ||
                                                            o.lab_retention_option?.id === savedProduct.maxillaryRetentionOptionId ||
                                                            o.retention_option_id === savedProduct.maxillaryRetentionOptionId
                                                          )
                                                          const toothChartType = opt?.tooth_chart_type ?? opt?.lab_retention_option?.tooth_chart_type ?? opt?.retention_option?.tooth_chart_type
                                                          hasImplantRetentionForForm = toothChartType === "Implant"
                                                        }
                                                        if (!hasImplantRetentionForForm && savedProduct.maxillaryRetention && String(savedProduct.maxillaryRetention).toLowerCase().includes('implant')) {
                                                          hasImplantRetentionForForm = true
                                                        }
                                                        if (!hasImplantRetentionForForm || !implants?.length) return null
                                                        const fieldKeyForm = `saved_implant_maxillary_${savedProduct.id}`
                                                        let savedBrandIdForm: number | string | null = savedProduct.maxillaryImplantBrand ?? selectedImplantBrandPerProduct[savedProduct.id]?.maxillary ?? null
                                                        if (!savedBrandIdForm && savedProduct.maxillaryImplantDetails) {
                                                          const parts = String(savedProduct.maxillaryImplantDetails).split(' - ')
                                                          if (parts[0]) {
                                                            const found = implants.find((imp: any) =>
                                                              imp.brand_name === parts[0].trim() || imp.brand_name?.toLowerCase() === parts[0].trim().toLowerCase()
                                                            )
                                                            if (found) savedBrandIdForm = found.id
                                                          }
                                                        }
                                                        let selectedBrandForm = savedBrandIdForm ? implants.find((imp: any) => imp.id === savedBrandIdForm || imp.id === Number(savedBrandIdForm) || String(imp.id) === String(savedBrandIdForm)) : null
                                                        if (!selectedBrandForm && typeof savedBrandIdForm === 'string') {
                                                          selectedBrandForm = implants.find((imp: any) => imp.brand_name === savedBrandIdForm || imp.brand_name?.toLowerCase() === String(savedBrandIdForm).toLowerCase())
                                                        }
                                                        if (!selectedBrandForm && savedProduct.maxillaryImplantDetails) {
                                                          const parts = String(savedProduct.maxillaryImplantDetails).split(' - ')
                                                          if (parts[0]) {
                                                            selectedBrandForm = implants.find((imp: any) => imp.brand_name === parts[0].trim() || imp.brand_name?.toLowerCase() === parts[0].trim().toLowerCase())
                                                          }
                                                        }
                                                        let savedPlatformIdForm: number | string | null = selectedImplantPlatformPerProduct[savedProduct.id]?.maxillary ?? null
                                                        if (!savedPlatformIdForm && savedProduct.maxillaryImplantPlatform != null && selectedBrandForm) {
                                                          const platformVal = savedProduct.maxillaryImplantPlatform
                                                          const strVal = String(platformVal).trim()
                                                          const byName = selectedBrandForm.platforms?.find((p: any) =>
                                                            (p.name != null && String(p.name).toLowerCase() === strVal.toLowerCase()) || p.name === platformVal
                                                          )
                                                          if (byName) savedPlatformIdForm = byName.id ?? byName.name
                                                          else if (typeof platformVal === 'number') savedPlatformIdForm = platformVal
                                                          else {
                                                            const numId = Number(platformVal)
                                                            if (!Number.isNaN(numId)) {
                                                              const byId = selectedBrandForm.platforms?.find((p: any) => (p.id || 0) === numId || p.id === numId || Number(p.id) === numId)
                                                              if (byId) savedPlatformIdForm = byId.id ?? byId.name
                                                            }
                                                          }
                                                        }
                                                        let selectedPlatformForm = selectedBrandForm && savedPlatformIdForm != null
                                                          ? selectedBrandForm.platforms?.find((p: any) => ((p.id || 0) === savedPlatformIdForm || p.id === Number(savedPlatformIdForm) || String(p.id) === String(savedPlatformIdForm) || (p.name != null && (p.name === savedPlatformIdForm || String(p.name).toLowerCase() === String(savedPlatformIdForm).toLowerCase()))))
                                                          : null
                                                        // Fallback: show saved platform name even when not found in brand.platforms (e.g. API data changed)
                                                        const savedPlatformNameForm = savedProduct.maxillaryImplantPlatform ?? (savedProduct.maxillaryImplantDetails ? String(savedProduct.maxillaryImplantDetails).split(' - ')[1]?.trim() : undefined)
                                                        if (!selectedPlatformForm && savedPlatformNameForm) {
                                                          selectedPlatformForm = { id: undefined, name: savedPlatformNameForm }
                                                        }
                                                        let savedSizeForm: string | null = savedProduct.maxillaryImplantSize ?? null
                                                        if (!savedSizeForm && savedProduct.maxillaryImplantDetails) {
                                                          const parts = String(savedProduct.maxillaryImplantDetails).split(' - ')
                                                          if (parts.length >= 3) savedSizeForm = parts[2].trim()
                                                          else if (parts.length === 2) savedSizeForm = parts[1].trim()
                                                        }
                                                        const selectedSizeForm = selectedImplantSize[fieldKeyForm] ?? savedSizeForm ?? null
                                                        const savedInclusionsForm = savedProduct.maxillaryImplantInclusions ?? ""
                                                        const savedAbutmentDetailForm = savedProduct.maxillaryAbutmentDetail ?? ""
                                                        const savedAbutmentTypeForm = savedProduct.maxillaryAbutmentType ?? ""
                                                        const storageKeyForm = `${savedProduct.id}_${archType}_${fieldKeyForm}`
                                                        return selectedBrandForm ? (
                                                          <div key={fieldKeyForm} className="w-full" data-implant-field-key={fieldKeyForm}>
                                                            <ImplantDetailForm
                                                              fieldKey={fieldKeyForm}
                                                              fieldId={0}
                                                              selectedBrand={selectedBrandForm}
                                                              selectedPlatform={selectedPlatformForm ?? null}
                                                              selectedSize={selectedSizeForm}
                                                              storageKey={storageKeyForm}
                                                              onRestoreFromCache={(data) => {
                                                                if (data.platformId != null) {
                                                                  setSelectedImplantPlatformPerProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: data.platformId } }))
                                                                }
                                                                if (data.size != null) {
                                                                  setSelectedImplantSize(prev => ({ ...prev, [fieldKeyForm]: data.size }))
                                                                }
                                                                if (data.platformId != null || data.size != null) {
                                                                  setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                    ...sp,
                                                                    maxillaryImplantPlatform: data.platformName ?? sp.maxillaryImplantPlatform,
                                                                    maxillaryImplantSize: data.size ?? sp.maxillaryImplantSize,
                                                                    maxillaryImplantDetails: selectedBrandForm?.brand_name && (data.platformName || data.size)
                                                                      ? `${selectedBrandForm.brand_name} - ${data.platformName ?? ''} - ${data.size ?? ''}`.replace(/\s*-\s*$/, '')
                                                                      : sp.maxillaryImplantDetails,
                                                                  } : sp))
                                                                }
                                                              }}
                                                              onSizeChange={(size: string) => {
                                                                setSelectedImplantSize(prev => ({ ...prev, [fieldKeyForm]: size }))
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                  ...sp,
                                                                  maxillaryImplantSize: size,
                                                                  maxillaryImplantDetails: `${selectedBrandForm.brand_name} - ${selectedPlatformForm?.name ?? ''} - ${size}`
                                                                } : sp))
                                                              }}
                                                              onInclusionsChange={(inclusions) => {
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? { ...sp, maxillaryImplantInclusions: inclusions } : sp))
                                                              }}
                                                              onAbutmentDetailChange={(detail) => {
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? { ...sp, maxillaryAbutmentDetail: detail } : sp))
                                                              }}
                                                              onAbutmentTypeChange={(type) => {
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? { ...sp, maxillaryAbutmentType: type } : sp))
                                                              }}
                                                              onPlatformChange={(platform: any) => {
                                                                setSelectedImplantPlatformPerProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: platform.id } }))
                                                                const platformNameOrId = platform?.name ?? platform?.id
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                  ...sp,
                                                                  maxillaryImplantBrand: selectedBrandForm.id,
                                                                  maxillaryImplantPlatform: platformNameOrId,
                                                                  maxillaryImplantDetails: selectedBrandForm?.brand_name && platformNameOrId && (savedSizeForm ?? sp.maxillaryImplantSize)
                                                                    ? `${selectedBrandForm.brand_name} - ${platformNameOrId} - ${savedSizeForm ?? sp.maxillaryImplantSize ?? ''}`
                                                                    : sp.maxillaryImplantDetails
                                                                } : sp))
                                                              }}
                                                              onBrandFieldClick={() => {
                                                                setShowImplantCardsForProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: true } }))
                                                                setClickedFieldTypeInAccordion(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: 'brand' } }))
                                                              }}
                                                              onPlatformFieldClick={() => {
                                                                setShowImplantCardsForProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: true } }))
                                                                setClickedFieldTypeInAccordion(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: 'platform' } }))
                                                              }}
                                                              teethNumbers={savedProduct.maxillaryTeeth || []}
                                                              arch={archType}
                                                              initialInclusions={savedInclusionsForm}
                                                              initialAbutmentDetail={savedAbutmentDetailForm}
                                                              initialAbutmentType={savedAbutmentTypeForm}
                                                              disableAutoShowPlatformCards
                                                            />
                                                          </div>
                                                        ) : null
                                                      })()}

                                                      {/* Implant Brand/Platform Cards - Shows when implant details field is clicked */}
                                                      {/* Only show if retention type is "Implant" */}
                                                      {(() => {
                                                        // Check if retention type is "Implant" by checking tooth_chart_type from retention option
                                                        let hasImplantRetention = false

                                                        // First, check if any tooth has "Implant" retention type from state
                                                        const teeth = savedProduct.maxillaryTeeth
                                                        const retentionTypes = maxillaryRetentionTypes
                                                        hasImplantRetention = teeth.some(toothNumber => {
                                                          const types = retentionTypes[toothNumber] || []
                                                          return types.includes('Implant')
                                                        })

                                                        // Fallback: If retentionTypes state is empty, check the retention option's tooth_chart_type
                                                        // This handles saved products that might not have retentionTypes state populated
                                                        if (!hasImplantRetention && productDetails?.retention_options && savedProduct.maxillaryRetentionOptionId) {
                                                          const selectedRetentionOption = productDetails.retention_options.find((opt: any) => {
                                                            return opt.id === savedProduct.maxillaryRetentionOptionId ||
                                                              opt.lab_retention_option?.id === savedProduct.maxillaryRetentionOptionId ||
                                                              opt.retention_option_id === savedProduct.maxillaryRetentionOptionId
                                                          })

                                                          if (selectedRetentionOption) {
                                                            const toothChartType = selectedRetentionOption.tooth_chart_type ||
                                                              selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                                                              selectedRetentionOption.retention_option?.tooth_chart_type

                                                            hasImplantRetention = toothChartType === "Implant"
                                                          }
                                                        }

                                                        return hasImplantRetention
                                                      })() && (clickedFieldTypeInAccordion[savedProduct.id]?.maxillary === 'brand' || clickedFieldTypeInAccordion[savedProduct.id]?.maxillary === 'platform') && showImplantCardsForProduct[savedProduct.id]?.maxillary && implants && implants.length > 0 && (
                                                          <div className="w-full">
                                                            <div className="flex flex-col items-center w-full">
                                                              <div className="bg-white w-full flex justify-center">
                                                                {(() => {
                                                                  // Get brand ID from state, or fallback to savedProduct
                                                                  const brandIdFromState = selectedImplantBrandPerProduct[savedProduct.id]?.maxillary
                                                                  const brandIdFromSaved = savedProduct.maxillaryImplantBrand
                                                                  const selectedBrandId = brandIdFromState || brandIdFromSaved

                                                                  // Find brand by ID or brand name
                                                                  const selectedBrand = selectedBrandId
                                                                    ? implants.find((imp: any) =>
                                                                      imp.id === selectedBrandId ||
                                                                      imp.id === Number(selectedBrandId) ||
                                                                      imp.brand_name === selectedBrandId
                                                                    )
                                                                    : null
                                                                  const platforms = selectedBrand?.platforms || []
                                                                  const mappedPlatforms = platforms.map((plat: any) => ({
                                                                    id: plat.id || 0,
                                                                    name: plat.name,
                                                                    image: plat.image_url || plat.image
                                                                  }))
                                                                  const selectedPlatformId = selectedImplantPlatformPerProduct[savedProduct.id]?.maxillary
                                                                  const clickedFieldType = clickedFieldTypeInAccordion[savedProduct.id]?.maxillary

                                                                  // Only show cards when user explicitly clicked the implant brand or platform field (saved data already shown in form)
                                                                  const shouldShowPlatformCards = clickedFieldType === 'platform' && selectedBrandId
                                                                  const shouldShowBrandCards = clickedFieldType === 'brand'

                                                                  if (shouldShowPlatformCards) {
                                                                    return (
                                                                      <ImplantPlatformCards
                                                                        platforms={mappedPlatforms}
                                                                        selectedPlatformId={selectedPlatformId}
                                                                        onSelectPlatform={(platform: any) => {
                                                                          setSelectedImplantPlatformPerProduct(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: {
                                                                              ...prev[savedProduct.id],
                                                                              maxillary: platform.id
                                                                            }
                                                                          }))
                                                                          // Reset clicked field type and hide cards after selection
                                                                          setClickedFieldTypeInAccordion(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: {
                                                                              ...prev[savedProduct.id],
                                                                              maxillary: null
                                                                            }
                                                                          }))
                                                                          setShowImplantCardsForProduct(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: { ...prev[savedProduct.id], maxillary: false }
                                                                          }))
                                                                          // Persist platform to saved product so it displays and survives re-open
                                                                          const platformNameOrId = platform?.name ?? platform?.id
                                                                          const sizePart = savedProduct.maxillaryImplantSize ?? ''
                                                                          setSavedProducts(prev => prev.map(sp => {
                                                                            if (sp.id === savedProduct.id && selectedBrand) {
                                                                              return {
                                                                                ...sp,
                                                                                maxillaryImplantPlatform: platformNameOrId,
                                                                                maxillaryImplantDetails: selectedBrand.brand_name && platformNameOrId
                                                                                  ? `${selectedBrand.brand_name} - ${platformNameOrId}${sizePart ? ` - ${sizePart}` : ''}`
                                                                                  : sp.maxillaryImplantDetails
                                                                              }
                                                                            }
                                                                            return sp
                                                                          }))
                                                                          // Scroll to the implant detail form after platform selection
                                                                          setTimeout(() => {
                                                                            const formElement = document.querySelector(`[data-implant-field-key="saved_implant_maxillary_${savedProduct.id}"]`)
                                                                            if (formElement) {
                                                                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                            }
                                                                          }, 100)
                                                                        }}
                                                                        arch="maxillary"
                                                                        showRequired={showValidationErrors}
                                                                      />
                                                                    )
                                                                  }

                                                                  // Show brand cards only if platform cards are not being shown
                                                                  if (shouldShowBrandCards) {
                                                                    const mappedImplants = implants.map((imp: any) => ({
                                                                      id: imp.id,
                                                                      brand_name: imp.brand_name,
                                                                      system_name: imp.system_name,
                                                                      code: imp.code,
                                                                      image_url: imp.image_url,
                                                                      platforms: imp.platforms?.map((p: any) => ({
                                                                        id: p.id || 0,
                                                                        name: p.name,
                                                                        image: p.image_url
                                                                      }))
                                                                    }))

                                                                    return (
                                                                      <ImplantBrandCards
                                                                        implants={mappedImplants}
                                                                        selectedImplantId={selectedBrand?.id || null}
                                                                        onSelectImplant={(implant: any) => {
                                                                          setSelectedImplantBrandPerProduct(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: {
                                                                              ...prev[savedProduct.id],
                                                                              maxillary: implant.id
                                                                            }
                                                                          }))
                                                                          // Update saved product
                                                                          setSavedProducts(prev => prev.map(sp => {
                                                                            if (sp.id === savedProduct.id) {
                                                                              return {
                                                                                ...sp,
                                                                                maxillaryImplantBrand: implant.id
                                                                              }
                                                                            }
                                                                            return sp
                                                                          }))
                                                                          // If brand has platforms, reset platform selection to show platform cards
                                                                          if (implant.platforms && implant.platforms.length > 0) {
                                                                            setSelectedImplantPlatformPerProduct(prev => ({
                                                                              ...prev,
                                                                              [savedProduct.id]: {
                                                                                ...prev[savedProduct.id],
                                                                                maxillary: null
                                                                              }
                                                                            }))
                                                                            // Auto-show platform cards after brand selection
                                                                            setClickedFieldTypeInAccordion(prev => ({
                                                                              ...prev,
                                                                              [savedProduct.id]: {
                                                                                ...prev[savedProduct.id],
                                                                                maxillary: null
                                                                              }
                                                                            }))
                                                                          } else {
                                                                            // Reset clicked field type after selection
                                                                            setClickedFieldTypeInAccordion(prev => ({
                                                                              ...prev,
                                                                              [savedProduct.id]: {
                                                                                ...prev[savedProduct.id],
                                                                                maxillary: null
                                                                              }
                                                                            }))
                                                                          }
                                                                        }}
                                                                        arch="maxillary"
                                                                        showRequired={showValidationErrors}
                                                                      />
                                                                    )
                                                                  }

                                                                  return null
                                                                })()}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )}

                                                      {/* Advance Fields - Shown after tooth shade is selected */}
                                                      {productDetails &&
                                                        productDetails.advance_fields &&
                                                        Array.isArray(productDetails.advance_fields) &&
                                                        productDetails.advance_fields.length > 0 &&
                                                        savedProduct.maxillaryToothShade && (() => {
                                                          // Filter out stump shade from advanced fields - use existing stump shade field instead
                                                          const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)

                                                          // Check if any tooth has "Implant" retention type for maxillary
                                                          const hasImplantRetention = savedProduct.maxillaryRetention && savedProduct.maxillaryRetention.toLowerCase().includes('implant')

                                                          const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
                                                            const fieldNameLower = (field.name || "").toLowerCase()
                                                            // Filter out stump shade fields
                                                            if (stumpShadeField && fieldNameLower.includes("stump") && fieldNameLower.includes("shade")) {
                                                              return false
                                                            }
                                                            // Filter out implant_library fields if no tooth has "Implant" retention type
                                                            if (field.field_type === "implant_library" && !hasImplantRetention) {
                                                              return false
                                                            }
                                                            return true
                                                          })

                                                          // If no fields remain after filtering, don't render the section
                                                          if (filteredAdvanceFields.length === 0) {
                                                            return null
                                                          }

                                                          const advanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []

                                                          return (
                                                            <div
                                                              className="flex flex-col gap-5"
                                                              style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'flex-start',
                                                                padding: '0px',
                                                                flex: 'none',
                                                                alignSelf: 'stretch',
                                                                flexGrow: 0,
                                                                marginTop: '2px'
                                                              }}
                                                            >
                                                              <div className="w-full">
                                                                <div className="grid grid-cols-1 gap-4" style={{ gap: '8px 16px' }}>
                                                                  {filteredAdvanceFields.map((field: any) => {
                                                                    const fieldKey = `advance_${field.id}`
                                                                    // Get value from saved product's advanceFields
                                                                    const savedAdvanceField = savedProduct.advanceFields?.find((af: any) => af.advance_field_id === field.id)
                                                                    const currentValue = savedAdvanceField || advanceFieldValues[fieldKey] || ""

                                                                    // Handle implant_library fields specially - render ImplantDetailForm
                                                                    if (field.field_type === "implant_library") {
                                                                      // Get saved implant details from savedProduct
                                                                      // Check multiple sources for brand ID
                                                                      let savedBrandId: number | string | null = savedProduct.maxillaryImplantBrand ||
                                                                        selectedImplantBrandPerProduct[savedProduct.id]?.maxillary ||
                                                                        selectedImplantBrand[fieldKey] ||
                                                                        null

                                                                      // If we have maxillaryImplantDetails but no brand ID, try to extract brand name from it
                                                                      if (!savedBrandId && savedProduct.maxillaryImplantDetails) {
                                                                        const parts = savedProduct.maxillaryImplantDetails.split(' - ')
                                                                        if (parts.length > 0) {
                                                                          const brandName = parts[0].trim()
                                                                          // Try to find brand by name
                                                                          const foundBrand = implants.find((imp: any) =>
                                                                            imp.brand_name === brandName ||
                                                                            imp.brand_name?.toLowerCase() === brandName.toLowerCase()
                                                                          )
                                                                          if (foundBrand) {
                                                                            savedBrandId = foundBrand.id
                                                                          }
                                                                        }
                                                                      }

                                                                      // Find the brand from implants array - try multiple ways
                                                                      let selectedBrand = null
                                                                      if (savedBrandId) {
                                                                        // Try by ID first (most reliable)
                                                                        selectedBrand = implants.find((imp: any) =>
                                                                          imp.id === savedBrandId ||
                                                                          imp.id === Number(savedBrandId) ||
                                                                          String(imp.id) === String(savedBrandId)
                                                                        )

                                                                        // If not found by ID, try by brand name
                                                                        if (!selectedBrand && typeof savedBrandId === 'string') {
                                                                          selectedBrand = implants.find((imp: any) =>
                                                                            imp.brand_name === savedBrandId ||
                                                                            imp.brand_name?.toLowerCase() === savedBrandId.toLowerCase()
                                                                          )
                                                                        }
                                                                      }

                                                                      // If still not found but we have maxillaryImplantDetails, try to extract brand name
                                                                      if (!selectedBrand && savedProduct.maxillaryImplantDetails) {
                                                                        const parts = savedProduct.maxillaryImplantDetails.split(' - ')
                                                                        if (parts.length > 0) {
                                                                          const brandName = parts[0].trim()
                                                                          selectedBrand = implants.find((imp: any) =>
                                                                            imp.brand_name === brandName ||
                                                                            imp.brand_name?.toLowerCase() === brandName.toLowerCase()
                                                                          )
                                                                          // If found, update savedBrandId for future lookups
                                                                          if (selectedBrand) {
                                                                            savedBrandId = selectedBrand.id
                                                                          }
                                                                        }
                                                                      }

                                                                      // Check multiple sources for platform ID
                                                                      // First try to get platform ID from state, then from saved product
                                                                      let savedPlatformId: number | string | null = selectedImplantPlatformPerProduct[savedProduct.id]?.maxillary ||
                                                                        selectedImplantPlatform[fieldKey] ||
                                                                        null

                                                                      // If not found in state, try to find it from savedProduct.maxillaryImplantPlatform
                                                                      if (!savedPlatformId && savedProduct.maxillaryImplantPlatform != null && selectedBrand) {
                                                                        const platformVal = savedProduct.maxillaryImplantPlatform
                                                                        const strVal = String(platformVal).trim()
                                                                        const platformByName = selectedBrand.platforms?.find((p: any) =>
                                                                          (p.name != null && String(p.name).toLowerCase() === strVal.toLowerCase()) || p.name === platformVal
                                                                        )
                                                                        if (platformByName) {
                                                                          savedPlatformId = platformByName.id ?? platformByName.name
                                                                        } else if (typeof platformVal === 'number') {
                                                                          savedPlatformId = platformVal
                                                                        } else {
                                                                          const numId = Number(platformVal)
                                                                          if (!Number.isNaN(numId)) {
                                                                            const byId = selectedBrand.platforms?.find((p: any) => (p.id || 0) === numId || p.id === numId || Number(p.id) === numId)
                                                                            if (byId) savedPlatformId = byId.id ?? byId.name
                                                                          }
                                                                        }
                                                                      }

                                                                      let selectedPlatform = selectedBrand && savedPlatformId != null
                                                                        ? selectedBrand.platforms?.find((p: any) =>
                                                                          (p.id || 0) === savedPlatformId ||
                                                                          p.id === Number(savedPlatformId) ||
                                                                          String(p.id) === String(savedPlatformId) ||
                                                                          (p.name != null && (p.name === savedPlatformId || String(p.name).toLowerCase() === String(savedPlatformId).toLowerCase()))
                                                                        )
                                                                        : null
                                                                      // Fallback: show saved platform name even when not found in brand.platforms
                                                                      const savedPlatformName = savedProduct.maxillaryImplantPlatform ?? (savedProduct.maxillaryImplantDetails ? String(savedProduct.maxillaryImplantDetails).split(' - ')[1]?.trim() : undefined)
                                                                      if (!selectedPlatform && savedPlatformName) {
                                                                        selectedPlatform = { id: undefined, name: savedPlatformName }
                                                                      }

                                                                      // Extract size from multiple sources
                                                                      // 1. Check maxillaryImplantSize directly
                                                                      // 2. Extract from maxillaryImplantDetails string
                                                                      // 3. Check selectedImplantSize state
                                                                      let savedSize: string | null = savedProduct.maxillaryImplantSize || null
                                                                      if (!savedSize && savedProduct.maxillaryImplantDetails) {
                                                                        const parts = savedProduct.maxillaryImplantDetails.split(' - ')
                                                                        if (parts.length >= 3) {
                                                                          savedSize = parts[2].trim()
                                                                        } else if (parts.length === 2) {
                                                                          // Sometimes it might be "Brand - Size" format
                                                                          savedSize = parts[1].trim()
                                                                        }
                                                                      }
                                                                      // Also check if size is stored in selectedImplantSize state
                                                                      const sizeFromState = selectedImplantSize[fieldKey]
                                                                      const selectedSize = sizeFromState || savedSize || null

                                                                      // Get saved inclusions, abutment detail, and abutment type
                                                                      const savedInclusions = savedProduct.maxillaryImplantInclusions || ""
                                                                      const savedAbutmentDetail = savedProduct.maxillaryAbutmentDetail || ""
                                                                      const savedAbutmentType = savedProduct.maxillaryAbutmentType || ""

                                                                      // Always show the form if we have a selectedBrand (ImplantDetailForm requires selectedBrand)
                                                                      // The form will display saved values via initialInclusions, initialAbutmentDetail, etc.
                                                                      const shouldShowForm = selectedBrand !== null

                                                                      // Debug: Log if we have saved data but no brand found
                                                                      if ((savedBrandId || savedInclusions || savedAbutmentDetail || savedAbutmentType || selectedSize || savedProduct.maxillaryImplantDetails) && !selectedBrand) {
                                                                        console.log("🔍 Implant details found but brand not found:", {
                                                                          savedBrandId,
                                                                          savedInclusions,
                                                                          savedAbutmentDetail,
                                                                          savedAbutmentType,
                                                                          selectedSize,
                                                                          maxillaryImplantDetails: savedProduct.maxillaryImplantDetails,
                                                                          maxillaryImplantBrand: savedProduct.maxillaryImplantBrand,
                                                                          maxillaryImplantPlatform: savedProduct.maxillaryImplantPlatform,
                                                                          implantsCount: implants.length,
                                                                          fieldKey,
                                                                          productId: savedProduct.id
                                                                        })
                                                                      }

                                                                      return (
                                                                        <div
                                                                          key={field.id}
                                                                          className="relative w-full"
                                                                          style={{
                                                                            minHeight: '38px',
                                                                            width: '100%',
                                                                            marginTop: '10px'
                                                                          }}
                                                                        >
                                                                          {/* Show ImplantDetailForm if we have a brand (required for form) */}
                                                                          {/* Always show the form when we have saved data and a brand is found */}
                                                                          {shouldShowForm && selectedBrand && (
                                                                            <div data-implant-field-key={fieldKey} style={{ width: '100%', marginTop: '0px' }}>
                                                                              <ImplantDetailForm
                                                                                fieldKey={fieldKey}
                                                                                fieldId={field.id}
                                                                                selectedBrand={selectedBrand}
                                                                                selectedPlatform={selectedPlatform || null}
                                                                                selectedSize={selectedSize}
                                                                                storageKey={`${savedProduct.id}_maxillary_${fieldKey}`}
                                                                                onRestoreFromCache={(data) => {
                                                                                  if (data.platformId != null) {
                                                                                    setSelectedImplantPlatformPerProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], maxillary: data.platformId } }))
                                                                                  }
                                                                                  if (data.size != null) {
                                                                                    setSelectedImplantSize(prev => ({ ...prev, [fieldKey]: data.size }))
                                                                                  }
                                                                                  if (data.platformId != null || data.size != null) {
                                                                                    setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                                      ...sp,
                                                                                      maxillaryImplantPlatform: data.platformName ?? sp.maxillaryImplantPlatform,
                                                                                      maxillaryImplantSize: data.size ?? sp.maxillaryImplantSize,
                                                                                      maxillaryImplantDetails: selectedBrand?.brand_name && (data.platformName || data.size)
                                                                                        ? `${selectedBrand.brand_name} - ${data.platformName ?? ''} - ${data.size ?? ''}`.replace(/\s*-\s*$/, '')
                                                                                        : sp.maxillaryImplantDetails,
                                                                                    } : sp))
                                                                                  }
                                                                                }}
                                                                                onSizeChange={(size: string) => {
                                                                                  setSelectedImplantSize(prev => ({ ...prev, [fieldKey]: size }))
                                                                                  // Update saved product
                                                                                  setSavedProducts(prev => prev.map(sp => {
                                                                                    if (sp.id === savedProduct.id) {
                                                                                      return {
                                                                                        ...sp,
                                                                                        maxillaryImplantSize: size,
                                                                                        maxillaryImplantDetails: `${selectedBrand.brand_name} - ${selectedPlatform?.name || ''} - ${size}`
                                                                                      }
                                                                                    }
                                                                                    return sp
                                                                                  }))
                                                                                }}
                                                                                onInclusionsChange={(inclusions) => {
                                                                                  setSavedProducts(prev => prev.map(sp => {
                                                                                    if (sp.id === savedProduct.id) {
                                                                                      return { ...sp, maxillaryImplantInclusions: inclusions }
                                                                                    }
                                                                                    return sp
                                                                                  }))
                                                                                }}
                                                                                onAbutmentDetailChange={(detail) => {
                                                                                  setSavedProducts(prev => prev.map(sp => {
                                                                                    if (sp.id === savedProduct.id) {
                                                                                      return { ...sp, maxillaryAbutmentDetail: detail }
                                                                                    }
                                                                                    return sp
                                                                                  }))
                                                                                }}
                                                                                onAbutmentTypeChange={(type) => {
                                                                                  setSavedProducts(prev => prev.map(sp => {
                                                                                    if (sp.id === savedProduct.id) {
                                                                                      return { ...sp, maxillaryAbutmentType: type }
                                                                                    }
                                                                                    return sp
                                                                                  }))
                                                                                }}
                                                                                onPlatformChange={(platform) => {
                                                                                  setSelectedImplantPlatformPerProduct(prev => ({
                                                                                    ...prev,
                                                                                    [savedProduct.id]: {
                                                                                      ...prev[savedProduct.id],
                                                                                      maxillary: platform.id
                                                                                    }
                                                                                  }))
                                                                                  const platformNameOrId = platform?.name ?? platform?.id
                                                                                  // Update saved product with brand, platform, and details string
                                                                                  setSavedProducts(prev => prev.map(sp => {
                                                                                    if (sp.id === savedProduct.id) {
                                                                                      const sizeVal = sp.maxillaryImplantSize ?? selectedSize
                                                                                      return {
                                                                                        ...sp,
                                                                                        maxillaryImplantBrand: selectedBrand.id,
                                                                                        maxillaryImplantPlatform: platformNameOrId,
                                                                                        maxillaryImplantDetails: selectedBrand?.brand_name && platformNameOrId && sizeVal
                                                                                          ? `${selectedBrand.brand_name} - ${platformNameOrId} - ${sizeVal}`
                                                                                          : sp.maxillaryImplantDetails
                                                                                      }
                                                                                    }
                                                                                    return sp
                                                                                  }))
                                                                                }}
                                                                                onBrandFieldClick={() => {
                                                                                  setShowImplantCardsForProduct(prev => ({
                                                                                    ...prev,
                                                                                    [savedProduct.id]: {
                                                                                      ...prev[savedProduct.id],
                                                                                      maxillary: true
                                                                                    }
                                                                                  }))
                                                                                  setClickedFieldTypeInAccordion(prev => ({
                                                                                    ...prev,
                                                                                    [savedProduct.id]: {
                                                                                      ...prev[savedProduct.id],
                                                                                      maxillary: 'brand'
                                                                                    }
                                                                                  }))
                                                                                }}
                                                                                onPlatformFieldClick={() => {
                                                                                  setShowImplantCardsForProduct(prev => ({
                                                                                    ...prev,
                                                                                    [savedProduct.id]: {
                                                                                      ...prev[savedProduct.id],
                                                                                      maxillary: true
                                                                                    }
                                                                                  }))
                                                                                  setClickedFieldTypeInAccordion(prev => ({
                                                                                    ...prev,
                                                                                    [savedProduct.id]: {
                                                                                      ...prev[savedProduct.id],
                                                                                      maxillary: 'platform'
                                                                                    }
                                                                                  }))
                                                                                }}
                                                                                teethNumbers={savedProduct.maxillaryTeeth || []}
                                                                                arch={archType}
                                                                                initialInclusions={savedInclusions}
                                                                                initialAbutmentDetail={savedAbutmentDetail}
                                                                                initialAbutmentType={savedAbutmentType}
                                                                                disableAutoShowPlatformCards
                                                                              />
                                                                            </div>
                                                                          )}

                                                                          {/* Fallback: Show simple display if form can't be shown */}
                                                                          {!shouldShowForm && (
                                                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '38px' }}>
                                                                              <div
                                                                                className="flex items-center"
                                                                                style={{
                                                                                  padding: '8px 12px 4px 12px',
                                                                                  gap: '5px',
                                                                                  width: '100%',
                                                                                  height: '32px',
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
                                                                                  fontSize: '13px',
                                                                                  lineHeight: '20px',
                                                                                  letterSpacing: '-0.02em',
                                                                                  color: '#000000'
                                                                                }}>Select Implant Details</span>
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
                                                                                {field.name || "Implant Details"}
                                                                              </label>
                                                                            </div>
                                                                          )}
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // Calculate width based on field type - 3 column grid layout
                                                                    const getFieldWidth = (): { minWidth: string; maxWidth: string; width: string; flex: string; gridColumn?: string } => {
                                                                      if (field.field_type === "multiline_text") {
                                                                        return { minWidth: "100%", maxWidth: "100%", width: "100%", flex: "1 1 100%", gridColumn: "1 / -1" }
                                                                      }

                                                                      // All other fields take 1 column in the 3-column grid
                                                                      return {
                                                                        minWidth: "0",
                                                                        maxWidth: "100%",
                                                                        width: "100%",
                                                                        flex: '1 1 auto'
                                                                      }
                                                                    }

                                                                    const fieldWidth = getFieldWidth()

                                                                    // Render based on field_type - use renderSavedAdvanceField helper
                                                                    return (
                                                                      <div
                                                                        key={field.id}
                                                                        className="relative"
                                                                        style={{
                                                                          minHeight: '38px',
                                                                          width: '100%',
                                                                          ...(fieldWidth.gridColumn ? { gridColumn: fieldWidth.gridColumn } : {}),
                                                                        }}
                                                                      >
                                                                        {renderSavedAdvanceField(field, savedProduct, archType)}
                                                                      </div>
                                                                    )
                                                                  })}
                                                                </div>
                                                              </div>
                                                            </div>
                                                          )
                                                        })()}

                                                      {/* Impression Field - Always shown for saved products if impressions exist */}
                                                      {productDetails?.impressions &&
                                                        Array.isArray(productDetails.impressions) &&
                                                        productDetails.impressions.length > 0 && (() => {
                                                          const impressionCount = savedProduct.maxillaryImpressions?.length
                                                            ? getImpressionCountFromSaved(savedProduct.maxillaryImpressions)
                                                            : (savedProduct.product
                                                              ? getImpressionCount(savedProduct.product.id.toString(), "maxillary", productDetails.impressions)
                                                              : 0)
                                                          const displayText = savedProduct.maxillaryImpressions?.length
                                                            ? getImpressionDisplayTextFromSaved(savedProduct.maxillaryImpressions)
                                                            : (savedProduct.product
                                                              ? getImpressionDisplayText(savedProduct.product.id.toString(), "maxillary", productDetails.impressions)
                                                              : "Select impression")
                                                          const hasImpressionValue = impressionCount > 0 || (displayText && displayText !== "Select impression")

                                                          return (
                                                            <div className="flex flex-wrap" style={{ width: '100%' }}>
                                                              <div style={{ flex: '1 1 50%', minWidth: '200px' }}>
                                                                <div className="relative" style={{ minHeight: '38px', width: '100%' }}>
                                                                  <div
                                                                    className="flex items-center cursor-pointer"
                                                                    onClick={() => {
                                                                      handleOpenImpressionModal(savedProduct, "maxillary")
                                                                    }}
                                                                    style={{
                                                                      padding: '8px 12px 4px 12px',
                                                                      gap: '5px',
                                                                      width: '100%',
                                                                      height: '32px',
                                                                      position: 'relative',
                                                                      marginTop: '5.27px',
                                                                      background: '#FFFFFF',
                                                                      border: `0.740384px solid ${hasImpressionValue ? '#119933' : '#ef4444'}`,
                                                                      borderRadius: '7.7px',
                                                                      boxSizing: 'border-box'
                                                                    }}
                                                                  >
                                                                    <span style={{
                                                                      fontFamily: 'Verdana',
                                                                      fontStyle: 'normal',
                                                                      fontWeight: 400,
                                                                      fontSize: '13px',
                                                                      lineHeight: '20px',
                                                                      letterSpacing: '-0.02em',
                                                                      color: '#000000',
                                                                      whiteSpace: 'nowrap',
                                                                      paddingRight: hasImpressionValue ? '30px' : '0px'
                                                                    }}>{displayText}</span>
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
                                                                      color: hasImpressionValue ? '#119933' : '#ef4444'
                                                                    }}
                                                                  >
                                                                    Impression<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                                  </label>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          )
                                                        })()}
                                                    </>
                                                  )}

                                                  {/* Legacy field rendering - keeping minimal fallback if productDetails is missing */}
                                                  {!productDetails && (
                                                    <>
                                                      {/* Minimal fallback - just show basic fields if productDetails is missing */}
                                                      {savedProduct.maxillaryMaterial && (
                                                        <div className="text-sm text-gray-500 p-4">
                                                          Product Details not available. Please reload the product.
                                                        </div>
                                                      )}
                                                    </>
                                                  )}

                                                </div>

                                                {/* Action Buttons - Only show if advance fields are showing */}
                                                {(() => {
                                                  const productDetails = savedProduct.productDetails
                                                  const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                                  const hasAdvanceFields = advanceFields && Array.isArray(advanceFields) && advanceFields.length > 0
                                                  // Show advance fields if they exist and material/retention are filled
                                                  const minFieldsFilled = savedProduct.maxillaryMaterial && savedProduct.maxillaryRetention
                                                  // For removable/ortho products, show action buttons when productDetails exist (no retention required)
                                                  const categoryLowerForButtons = savedProduct.category?.toLowerCase() || ""
                                                  const isRemovableOrOrthoProduct = categoryLowerForButtons.includes("removable") ||
                                                    categoryLowerForButtons.includes("orthodontic") ||
                                                    categoryLowerForButtons.includes("ortho")
                                                  // Always show if material and retention are set, or for removable/ortho when productDetails exist
                                                  return (hasAdvanceFields && minFieldsFilled) || (isRemovableOrOrthoProduct && productDetails)
                                                })() && (
                                                    <div
                                                      className="flex flex-wrap justify-center items-center w-full"
                                                      style={{
                                                        gap: '16px',
                                                        position: 'relative',
                                                      }}
                                                    >
                                                      {/* Deliver product first - Only show if multiple products */}
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
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          setCurrentProductForModal(savedProduct)
                                                          setCurrentArchForModal("maxillary")
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
                                                        onClick={(e) => {
                                                          e.stopPropagation()
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
                                                        onClick={(e) => {
                                                          e.stopPropagation()
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
                                              </AccordionContent>
                                            </Card>
                                          </AccordionItem>
                                        )
                                      })}
                                  </>
                                )}
                            </MaxillarySection>
                          )}

                          <SectionNavigationArrows show={!!(showMaxillaryChart && showMandibularChart)} />

                          {/* MANDIBULAR Section */}
                          {showMandibularChart && (
                            <MandibularSection sectionRef={mandibularSectionRef}>
                              {showMandibularChart && ((mandibularTeeth.length > 0 && selectedProductForMandibular && !savedProducts.some(sp => {
                                if (sp.addedFrom !== "mandibular") return false
                                const savedTeeth = (sp.mandibularTeeth || []).map((t: number) => Number(t)).sort((a, b) => a - b)
                                const currentTeeth = mandibularTeeth.map((t: number) => Number(t)).sort((a, b) => a - b)
                                const sameTeeth = savedTeeth.length === currentTeeth.length && savedTeeth.every((t, i) => t === currentTeeth[i])
                                const sameProduct = String(sp.product?.id ?? "") === String(selectedProductForMandibular?.id ?? "")
                                return sameTeeth && sameProduct
                              })) || savedProducts.filter(p => p.addedFrom === "mandibular").length > 0) && (
                                  <>
                                    {showMandibularChart && mandibularTeeth.length > 0 && selectedProductForMandibular && !savedProducts.some(sp => {
                                      if (sp.addedFrom !== "mandibular") return false
                                      return String(sp.product?.id ?? "") === String(selectedProductForMandibular?.id ?? "")
                                    }) && (
                                        <AccordionItem value="mandibular-card" className="border-0 flex justify-center">
                                          <Card
                                            className="overflow-hidden w-full"
                                            style={{
                                              position: 'relative',
                                              width: '100%',
                                              maxWidth: '720px',
                                              left: '0.87px',
                                              top: 0,
                                              background: '#FFFFFF',
                                              borderRadius: '5.4px',
                                              border: 'none',
                                              boxShadow: 'none',
                                            }}
                                          >
                                            {/* Header - Hide when shade selection is active */}
                                            <div
                                              className="w-full"
                                              style={{
                                                position: 'relative',
                                                minHeight: '45px',
                                                background: openAccordionMandibular === "mandibular-card" ? '#E0EDF8' : '#F5F5F5',
                                                borderRadius: openAccordionMandibular === "mandibular-card" ? '10px 10px 0px 0px' : '10px',
                                                display: currentShadeField ? 'none' : 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                padding: '8px 6px',
                                                gap: '2px',
                                                borderBottom: openAccordionMandibular === "mandibular-card" ? '1px dotted #B0D0F0' : 'none'
                                              }}
                                            >
                                              <AccordionTrigger
                                                className="hover:no-underline w-full group [&>svg]:hidden"
                                                style={{
                                                  padding: '0px',
                                                  gap: '10px',
                                                  width: '100%',
                                                  background: 'transparent',
                                                  boxShadow: 'none',
                                                  borderRadius: '0px'
                                                }}
                                              >
                                                {/* Responsive Content Container */}
                                                <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '6px', paddingRight: '20px' }}>
                                                  {/* Product Image */}
                                                  <div
                                                    style={{
                                                      width: '28px',
                                                      minWidth: '28px',
                                                      height: '28px',
                                                      background: `url(${selectedProduct?.image_url || "/images/tooth-icon.png"}), #FFFFFF`,
                                                      backgroundSize: 'contain',
                                                      backgroundPosition: 'center',
                                                      backgroundRepeat: 'no-repeat',
                                                      borderRadius: '4px',
                                                      flexShrink: 0
                                                    }}
                                                  />

                                                  {/* Content Area - Responsive */}
                                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, alignItems: 'flex-start' }}>
                                                    {/* Product Name - Bold, plain text */}
                                                    {selectedProduct?.name && (
                                                      <span
                                                        style={{
                                                          fontFamily: 'Verdana',
                                                          fontStyle: 'normal',
                                                          fontWeight: 600,
                                                          fontSize: '12px',
                                                          lineHeight: '14px',
                                                          letterSpacing: '-0.02em',
                                                          color: '#000000',
                                                          wordBreak: 'break-word',
                                                          overflowWrap: 'break-word',
                                                          textAlign: 'left',
                                                          width: '100%'
                                                        }}
                                                      >
                                                        {selectedProduct.name}
                                                      </span>
                                                    )}

                                                    {/* Tooth Numbers Row - Formatted as #9 */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                      <span
                                                        style={{
                                                          fontFamily: 'Verdana',
                                                          fontStyle: 'normal',
                                                          fontWeight: 400,
                                                          fontSize: '10px',
                                                          lineHeight: '12px',
                                                          letterSpacing: '-0.02em',
                                                          color: '#000000'
                                                        }}
                                                      >
                                                        {(() => {
                                                          const sortedTeeth = [...mandibularTeeth].sort((a, b) => a - b);
                                                          return sortedTeeth.length > 0 ? sortedTeeth.map(t => `#${t}`).join(', ') : '';
                                                        })()}
                                                      </span>
                                                    </div>

                                                    {/* Badges and Info Row - Responsive */}
                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                                      {/* Badge - Category - Pill shaped */}
                                                      {selectedCategory && (
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '1px 6px', background: '#F0F0F0', borderRadius: '10px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '9px', lineHeight: '11px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{selectedCategory}</span>
                                                        </div>
                                                      )}

                                                      {/* Badge - Subcategory - Pill shaped */}
                                                      {selectedSubcategory && (
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '1px 6px', background: '#F0F0F0', borderRadius: '10px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '9px', lineHeight: '11px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{selectedSubcategory}</span>
                                                        </div>
                                                      )}

                                                      {/* Est days */}
                                                      <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '9px', lineHeight: '11px', letterSpacing: '-0.02em', color: '#B4B0B0', whiteSpace: 'nowrap' }}>
                                                        Est days: {selectedProduct?.estimated_days || 10} work days after submission
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Chevron - Positioned relative to header */}
                                                <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                                  <ChevronDown
                                                    className="w-full h-full transition-transform duration-200 text-black"
                                                    style={{
                                                      transform: openAccordionMandibular === "mandibular-card" ? 'rotate(0deg)' : 'rotate(-180deg)'
                                                    }}
                                                  />
                                                </div>
                                              </AccordionTrigger>
                                            </div>
                                            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto', overflowY: 'auto' }}>
                                              {/* Tooth Shade Selection - Shows at the top when active */}
                                              {currentShadeField && currentShadeArch === "mandibular" && (
                                                <div className="w-full pt-4">
                                                  <div className="flex flex-col w-full">
                                                    {/* Top Row: Stump Shade, Tooth Shade fields and Shade Guide Dropdown */}
                                                    <div className="w-full flex items-start gap-4 px-4 mb-4">
                                                      {/* Stump Shade Field */}
                                                      <div className="relative flex-1">
                                                        <div
                                                          className={cn(
                                                            "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200 flex items-center cursor-pointer",
                                                            mandibularStumpShade ? "border-[#119933]" : "border-[#ef4444] hover:border-[#ef4444]"
                                                          )}
                                                          onClick={() => handleOpenShadeModal("stump_shade", "mandibular")}
                                                        >
                                                          <span className={mandibularStumpShade ? "text-black" : "text-gray-400"}>
                                                            {mandibularStumpShade}
                                                          </span>
                                                          {mandibularStumpShade && (
                                                            <div className="ml-auto flex items-center gap-2">
                                                              <span className="text-sm bg-gray-100 px-2 py-1 rounded">{mandibularStumpShade.split(' - ')[1]}</span>
                                                              <Check className="h-5 w-5 text-[#119933]" />
                                                            </div>
                                                          )}
                                                        </div>
                                                        <label className={cn(
                                                          "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                          mandibularStumpShade ? "text-[#119933]" : "text-[#ef4444]"
                                                        )}>
                                                          {mandibularStumpShade ? "Stump Shade" : "Select Stump Shade"}<span className="text-red-500">*</span>
                                                        </label>
                                                      </div>

                                                      {/* Tooth Shade Field - shown only after Stump Shade is selected */}
                                                      {mandibularStumpShade && (
                                                        <div className="relative flex-1">
                                                          <div
                                                            className={cn(
                                                              "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200 flex items-center cursor-pointer",
                                                              mandibularToothShade ? "border-[#119933]" : "border-[#ef4444] hover:border-[#ef4444]"
                                                            )}
                                                            onClick={() => handleOpenShadeModal("tooth_shade", "mandibular")}
                                                          >
                                                            <span className={mandibularToothShade ? "text-black" : "text-gray-400"}>
                                                              {mandibularToothShade}
                                                            </span>
                                                            {mandibularToothShade && (
                                                              <div className="ml-auto flex items-center gap-2">
                                                                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{mandibularToothShade.split(' - ')[1]}</span>
                                                                <Check className="h-5 w-5 text-[#119933]" />
                                                              </div>
                                                            )}
                                                          </div>
                                                          <label className={cn(
                                                            "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                            mandibularToothShade ? "text-[#119933]" : "text-[#ef4444]"
                                                          )}>
                                                            {mandibularToothShade ? "Tooth Shade" : "Select Tooth Shade"}<span className="text-red-500">*</span>
                                                          </label>
                                                        </div>
                                                      )}

                                                      {/* Shade Guide Dropdown */}
                                                      <div className="relative min-w-[220px]">
                                                        <Select value={selectedShadeGuide} onValueChange={setSelectedShadeGuide}>
                                                          <SelectTrigger
                                                            className={cn(
                                                              "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200",
                                                              selectedShadeGuide ? "border-[#119933]" : "border-[#E0E0E0] hover:border-[#1162A8]"
                                                            )}
                                                          >
                                                            <SelectValue />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {shadeGuideOptions.map((guide) => (
                                                              <SelectItem key={guide} value={guide}>
                                                                {guide}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                        <label className={cn(
                                                          "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                          selectedShadeGuide ? "text-[#119933]" : "text-gray-500"
                                                        )}>
                                                          Shade guide selected
                                                        </label>
                                                        {selectedShadeGuide && (
                                                          <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                            <Check className="h-5 w-5 text-[#119933]" />
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>

                                                    {/* Shade guide SVG - Full Width */}
                                                    <div className="bg-white w-full">
                                                      {selectedShadeGuide === "Trubyte Bioform IPN" ? (
                                                        <TrubyteBioformIPNShadeSelectionSVG
                                                          selectedShades={selectedShadesForSVG}
                                                          onShadeClick={handleShadeClickFromSVG}
                                                          className="w-full"
                                                        />
                                                      ) : (
                                                        <ToothShadeSelectionSVG
                                                          selectedShades={selectedShadesForSVG}
                                                          onShadeClick={handleShadeClickFromSVG}
                                                          className="w-full"
                                                        />
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              {/* Summary detail */}
                                              <div
                                                className="bg-white w-full"
                                                style={{
                                                  position: 'relative',
                                                  height: 'auto',
                                                  minHeight: 'auto',
                                                  paddingLeft: '15.87px',
                                                  paddingRight: '15.87px',
                                                  paddingBottom: '8px',
                                                  paddingTop: '8px',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'flex-start',
                                                  background: '#FFFFFF',
                                                  boxSizing: 'border-box'
                                                }}
                                              >
                                                {/* Dynamic Fields - Rendered based on productDetails */}
                                                {productDetails && (
                                                  <>
                                                    <DynamicProductFields
                                                      productDetails={productDetails}
                                                      savedProduct={{
                                                        mandibularMaterial,
                                                        mandibularRetention,
                                                        mandibularStumpShade,
                                                        mandibularToothShade,
                                                        mandibularStage,
                                                        mandibularMaterialId,
                                                        mandibularRetentionId,
                                                        mandibularRetentionOptionId,
                                                        mandibularGumShadeId,
                                                        mandibularShadeId,
                                                        mandibularStageId,
                                                        mandibularImplantDetails,
                                                        mandibularImplantInclusions,
                                                        mandibularAbutmentDetail,
                                                        mandibularAbutmentType,
                                                      }}
                                                      arch="mandibular"
                                                      fieldConfigs={fieldConfigs}
                                                      onFieldChange={(fieldKey, value, id) => {
                                                        handleFieldChange(fieldKey, value, id, undefined, "mandibular")
                                                      }}
                                                      maxillaryRetentionTypes={maxillaryRetentionTypes}
                                                      mandibularRetentionTypes={mandibularRetentionTypes}
                                                      maxillaryTeeth={maxillaryTeeth}
                                                      mandibularTeeth={mandibularTeeth}
                                                      onOpenImpressionModal={() => {
                                                        if (selectedProduct) {
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
                                                        }
                                                      }}
                                                      getImpressionCount={() => {
                                                        if (!selectedProduct || !productDetails?.impressions) return 0
                                                        const productId = selectedProduct.id.toString()
                                                        return getImpressionCount(productId, "mandibular", productDetails.impressions)
                                                      }}
                                                      getImpressionDisplayText={() => {
                                                        if (!selectedProduct || !productDetails?.impressions) return "Select impression"
                                                        const productId = selectedProduct.id.toString()
                                                        return getImpressionDisplayText(productId, "mandibular", productDetails.impressions)
                                                      }}
                                                      onOpenShadeModal={(fieldKey) => {
                                                        handleOpenShadeModal(fieldKey, "mandibular")
                                                      }}
                                                      showImplantBrandCards={showImplantBrandCardsInFields.mandibular || false}
                                                      implantsLoading={implantsLoading}
                                                      implants={implants.map((imp: any) => ({
                                                        id: imp.id,
                                                        brand_name: imp.brand_name,
                                                        system_name: imp.system_name,
                                                        code: imp.code,
                                                        image_url: imp.image_url,
                                                        platforms: imp.platforms?.map((p: any) => ({
                                                          id: p.id || 0,
                                                          name: p.name,
                                                          image: p.image_url
                                                        }))
                                                      }))}
                                                      selectedImplantId={selectedImplantBrandForDetails.mandibular || null}
                                                      onSelectImplant={(implant: any) => {
                                                        setSelectedImplantBrandForDetails(prev => ({ ...prev, mandibular: implant.id }))
                                                        // You can add additional logic here to update implant details
                                                      }}
                                                      onImplantDetailsFieldClick={() => {
                                                        setShowImplantBrandCardsInFields(prev => ({ ...prev, mandibular: !prev.mandibular }))
                                                      }}
                                                      selectedImplantPlatformId={selectedImplantPlatformForDetails.mandibular || null}
                                                      onSelectImplantPlatform={(platform: any) => {
                                                        setSelectedImplantPlatformForDetails(prev => ({ ...prev, mandibular: platform.id }))
                                                        // You can add additional logic here to update implant details with platform
                                                      }}
                                                      onBrandFieldClick={() => {
                                                        setShowImplantBrandCardsInFields(prev => ({ ...prev, mandibular: true }))
                                                        setClickedFieldTypeInImplantDetails(prev => ({ ...prev, mandibular: 'brand' }))
                                                      }}
                                                      onPlatformFieldClick={() => {
                                                        setShowImplantBrandCardsInFields(prev => ({ ...prev, mandibular: true }))
                                                        setClickedFieldTypeInImplantDetails(prev => ({ ...prev, mandibular: 'platform' }))
                                                      }}
                                                      selectedImplantBrand={selectedImplantBrand}
                                                      selectedImplantPlatform={selectedImplantPlatform}
                                                      selectedImplantSize={selectedImplantSize}
                                                      hideFieldsDuringShadeSelection={currentShadeField !== null && currentShadeArch === "mandibular"}
                                                      hideImpression={productDetails?.advance_fields && Array.isArray(productDetails.advance_fields) && productDetails.advance_fields.length > 0}
                                                    />

                                                    {/* Implant Brand/Platform Cards - Shows at the bottom when implant details field is clicked */}
                                                    {/* Only show if retention type is "Implant" */}
                                                    {(() => {
                                                      // Check if any tooth has "Implant" retention type for mandibular
                                                      const hasImplantRetention = Object.values(mandibularRetentionTypes).some(
                                                        (types) => types && types.includes('Implant')
                                                      )
                                                      return hasImplantRetention
                                                    })() && showImplantBrandCardsInFields.mandibular && implants && implants.length > 0 && (
                                                        <div className="w-full pt-2" data-implant-details-form="mandibular">
                                                          <div className="flex flex-col items-center gap-2 w-full">
                                                            <div className="bg-white w-full flex justify-center">
                                                              {(() => {
                                                                const selectedBrandId = selectedImplantBrandForDetails.mandibular
                                                                const selectedBrand = selectedBrandId ? implants.find((imp: any) => imp.id === selectedBrandId) : null
                                                                const platforms = selectedBrand?.platforms || []
                                                                const mappedPlatforms = platforms.map((plat: any) => ({
                                                                  id: plat.id || 0,
                                                                  name: plat.name,
                                                                  image: plat.image_url || plat.image
                                                                }))
                                                                const selectedPlatformId = selectedImplantPlatformForDetails.mandibular
                                                                const clickedFieldType = clickedFieldTypeInImplantDetails.mandibular

                                                                // Show platform cards if:
                                                                // 1. Platform field was clicked AND brand is selected (highest priority - show even if no platforms), OR
                                                                // 2. Brand is selected, platform not selected yet, and brand field was NOT clicked (auto-show after brand selection)
                                                                const shouldShowPlatformCards = (clickedFieldType === 'platform' && selectedBrandId) ||
                                                                  (clickedFieldType !== 'brand' && (clickedFieldType === null || clickedFieldType === undefined) && selectedBrandId && selectedPlatformId === null)

                                                                // Show brand cards if:
                                                                // 1. Brand field was clicked, OR
                                                                // 2. No brand selected yet, OR
                                                                // 3. Platform cards should not be shown
                                                                const shouldShowBrandCards = !shouldShowPlatformCards && (clickedFieldType === 'brand' ||
                                                                  !selectedBrandId)

                                                                // Priority: Platform cards take precedence when platform field is clicked
                                                                if (shouldShowPlatformCards) {
                                                                  return (
                                                                    <ImplantPlatformCards
                                                                      platforms={mappedPlatforms}
                                                                      selectedPlatformId={selectedPlatformId}
                                                                      onSelectPlatform={(platform: any) => {
                                                                        setSelectedImplantPlatformForDetails(prev => ({ ...prev, mandibular: platform.id }))
                                                                        // Reset clicked field type after selection
                                                                        setClickedFieldTypeInImplantDetails(prev => ({ ...prev, mandibular: null }))
                                                                        // Scroll to the implant detail form after platform selection
                                                                        setTimeout(() => {
                                                                          const formElement = document.querySelector('[data-implant-details-form="mandibular"]')
                                                                          if (formElement) {
                                                                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                          }
                                                                        }, 100)
                                                                      }}
                                                                      arch="mandibular"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Show brand cards only if platform cards are not being shown
                                                                if (shouldShowBrandCards) {
                                                                  const mappedImplants = implants.map((imp: any) => ({
                                                                    id: imp.id,
                                                                    brand_name: imp.brand_name,
                                                                    system_name: imp.system_name,
                                                                    code: imp.code,
                                                                    image_url: imp.image_url,
                                                                    platforms: imp.platforms?.map((p: any) => ({
                                                                      id: p.id || 0,
                                                                      name: p.name,
                                                                      image: p.image_url
                                                                    }))
                                                                  }))

                                                                  return (
                                                                    <ImplantBrandCards
                                                                      implants={mappedImplants}
                                                                      selectedImplantId={selectedBrandId}
                                                                      onSelectImplant={(implant: any) => {
                                                                        setSelectedImplantBrandForDetails(prev => ({ ...prev, mandibular: implant.id }))
                                                                        // If brand has platforms, reset platform selection to show platform cards
                                                                        if (implant.platforms && implant.platforms.length > 0) {
                                                                          setSelectedImplantPlatformForDetails(prev => ({ ...prev, mandibular: null }))
                                                                          // Auto-show platform cards after brand selection
                                                                          setClickedFieldTypeInImplantDetails(prev => ({ ...prev, mandibular: null }))
                                                                        } else {
                                                                          // No platforms, reset clicked field type and scroll to form
                                                                          setClickedFieldTypeInImplantDetails(prev => ({ ...prev, mandibular: null }))
                                                                          // Scroll to the implant detail form
                                                                          setTimeout(() => {
                                                                            const formElement = document.querySelector('[data-implant-details-form="mandibular"]')
                                                                            if (formElement) {
                                                                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                            }
                                                                          }, 100)
                                                                        }
                                                                      }}
                                                                      arch="mandibular"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                return null
                                                              })()}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                    {/* Implant Brand Cards for Advance Fields - Shows when implant details advance field is clicked */}
                                                    {/* Only show if retention type is "Implant" */}
                                                    {(() => {
                                                      // Check if any tooth has "Implant" retention type for mandibular
                                                      const hasImplantRetention = Object.values(mandibularRetentionTypes).some(
                                                        (types) => types && types.includes('Implant')
                                                      )
                                                      return hasImplantRetention
                                                    })() && showImplantCards && activeImplantFieldKey && activeImplantFieldKey.startsWith('advance_') && implants && implants.length > 0 && (
                                                        <div ref={implantCardsRef} className="w-full pt-2">
                                                          <div className="flex flex-col items-center gap-2 w-full">
                                                            <div className="bg-white w-full flex justify-center">
                                                              {(() => {
                                                                const fieldKey = activeImplantFieldKey
                                                                const currentStep = implantSelectionStep[fieldKey] || 'brand'
                                                                const selectedBrandId = selectedImplantBrand[fieldKey]

                                                                // Get selected brand - try lookup first, then fallback
                                                                let selectedBrand = selectedBrandId ? implants.find((imp: any) => imp.id === selectedBrandId) : null

                                                                // If we're in form mode and selectedBrand is not found, try to get it from advanceFieldValues
                                                                if (!selectedBrand && currentStep === 'form') {
                                                                  const currentValue = advanceFieldValues[fieldKey]
                                                                  if (currentValue && typeof currentValue === 'object' && currentValue.advance_field_value) {
                                                                    const brandName = typeof currentValue.advance_field_value === 'string'
                                                                      ? currentValue.advance_field_value.split(' - ')[0]
                                                                      : null
                                                                    if (brandName) {
                                                                      const foundBrand = implants.find((imp: any) => imp.brand_name === brandName)
                                                                      if (foundBrand) {
                                                                        selectedBrand = foundBrand
                                                                        // If found, update the selectedBrandId
                                                                        if (!selectedBrandId) {
                                                                          setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: foundBrand.id }))
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }

                                                                const platforms = selectedBrand?.platforms || []
                                                                const mappedPlatforms = platforms.map((plat: any) => ({
                                                                  id: plat.id || 0,
                                                                  name: plat.name,
                                                                  image: plat.image_url || plat.image
                                                                }))
                                                                const selectedPlatformId = selectedImplantPlatform[fieldKey]
                                                                const clickedFieldType = clickedFieldTypeInForm[fieldKey]

                                                                // Show platform cards if:
                                                                // 1. We're on platform step, OR
                                                                // 2. We're in form step and platform field was clicked (hide brand cards when platform is clicked)
                                                                // Then check if we have a brand with platforms
                                                                const shouldShowPlatformCards = currentStep === 'platform' || (currentStep === 'form' && showImplantCards && clickedFieldType === 'platform')

                                                                // Show brand cards if:
                                                                // 1. We're on brand step, OR
                                                                // 2. We're in form step and brand field was clicked (hide platform cards when brand is clicked)
                                                                const shouldShowBrandCards = currentStep === 'brand' || (currentStep === 'form' && showImplantCards && clickedFieldType === 'brand')

                                                                // Priority: Platform cards take precedence when platform field is clicked
                                                                if (shouldShowPlatformCards && selectedBrand) {
                                                                  return (
                                                                    <ImplantPlatformCards
                                                                      platforms={mappedPlatforms}
                                                                      selectedPlatformId={selectedPlatformId}
                                                                      onSelectPlatform={(platform: any) => {
                                                                        const platformIdNum = Number(platform.id)
                                                                        if (!Number.isNaN(platformIdNum)) {
                                                                          setSelectedImplantPlatform(prev => ({ ...prev, [fieldKey]: platformIdNum }))
                                                                          setSelectedImplantPlatformData(prev => ({ ...prev, [fieldKey]: { id: platformIdNum, name: platform.name } }))
                                                                        }
                                                                        // After platform selection, keep form visible and hide the cards
                                                                        setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                        setShowImplantCards(false)
                                                                        setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: null }))
                                                                        // Scroll to the form
                                                                        setTimeout(() => {
                                                                          const formElement = document.querySelector(`[data-implant-field-key="${fieldKey}"]`)
                                                                          if (formElement) {
                                                                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                          }
                                                                        }, 100)
                                                                      }}
                                                                      arch="mandibular"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Show brand cards only if platform cards are not being shown
                                                                if (shouldShowBrandCards && !shouldShowPlatformCards) {
                                                                  return (
                                                                    <ImplantBrandCards
                                                                      implants={implants.map((imp: any) => ({
                                                                        id: imp.id,
                                                                        brand_name: imp.brand_name,
                                                                        system_name: imp.system_name,
                                                                        code: imp.code,
                                                                        image_url: imp.image_url,
                                                                        platforms: imp.platforms?.map((p: any) => ({
                                                                          id: p.id || 0,
                                                                          name: p.name,
                                                                          image: p.image_url
                                                                        }))
                                                                      }))}
                                                                      selectedImplantId={selectedBrandId || null}
                                                                      onSelectImplant={(implant: any) => {
                                                                        setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: implant.id }))
                                                                        // If brand has platforms, show platform cards, otherwise go directly to form
                                                                        if (implant.platforms && implant.platforms.length > 0) {
                                                                          setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'platform' }))
                                                                        } else {
                                                                          // No platforms, go directly to form
                                                                          setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                          setShowImplantCards(false)
                                                                          setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: null }))
                                                                          // Scroll to the form
                                                                          setTimeout(() => {
                                                                            const formElement = document.querySelector(`[data-implant-field-key="${fieldKey}"]`)
                                                                            if (formElement) {
                                                                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                            }
                                                                          }, 100)
                                                                        }
                                                                      }}
                                                                      arch="mandibular"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Default: don't show any cards if conditions don't match
                                                                return null
                                                              })()}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                    {/* Advance Fields - Shown after tooth shade is selected */}
                                                    {productDetails &&
                                                      productDetails.advance_fields &&
                                                      Array.isArray(productDetails.advance_fields) &&
                                                      productDetails.advance_fields.length > 0 &&
                                                      isToothShadeFilled("mandibular") && (() => {
                                                        // Filter out stump shade from advanced fields - use existing stump shade field instead
                                                        const stumpShadeField = getAdvanceFieldByName("stump_shade", productDetails.advance_fields)

                                                        // Check if any tooth has "Implant" retention type for mandibular
                                                        const hasImplantRetention = Object.values(mandibularRetentionTypes).some(
                                                          (types) => types && types.includes('Implant')
                                                        )

                                                        const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
                                                          const fieldNameLower = (field.name || "").toLowerCase()
                                                          // Filter out stump shade fields
                                                          if (stumpShadeField && fieldNameLower.includes("stump") && fieldNameLower.includes("shade")) {
                                                            return false
                                                          }
                                                          // Filter out implant_library fields if no tooth has "Implant" retention type
                                                          if (field.field_type === "implant_library" && !hasImplantRetention) {
                                                            return false
                                                          }
                                                          return true
                                                        })

                                                        // If no fields remain after filtering, don't render the section
                                                        if (filteredAdvanceFields.length === 0) {
                                                          return null
                                                        }

                                                        const archType = "mandibular" // This is the mandibular section

                                                        return (
                                                          <div
                                                            className="flex flex-col gap-5"
                                                            style={{
                                                              display: 'flex',
                                                              flexDirection: 'column',
                                                              alignItems: 'flex-start',
                                                              padding: '0px',
                                                              flex: 'none',
                                                              alignSelf: 'stretch',
                                                              flexGrow: 0,
                                                              marginTop: '2px'
                                                            }}
                                                          >
                                                            <div className="w-full">
                                                              <div className="grid grid-cols-1 gap-4" style={{ gap: '8px 16px' }}>
                                                                {filteredAdvanceFields.map((field: any) => {
                                                                  const fieldKey = `advance_${field.id}`
                                                                  const currentValue = advanceFieldValues[fieldKey] || ""

                                                                  // Calculate width based on field type - 3 column grid layout
                                                                  const getFieldWidth = (): { minWidth: string; maxWidth: string; width: string; flex: string; gridColumn?: string } => {
                                                                    if (field.field_type === "multiline_text") {
                                                                      return { minWidth: "100%", maxWidth: "100%", width: "100%", flex: "1 1 100%", gridColumn: "1 / -1" }
                                                                    }

                                                                    // All other fields take 1 column in the 3-column grid
                                                                    return {
                                                                      minWidth: "0",
                                                                      maxWidth: "100%",
                                                                      width: "100%",
                                                                      flex: '1 1 auto'
                                                                    }
                                                                  }

                                                                  const fieldWidth = getFieldWidth()

                                                                  // Check if field is required and value is "Not specified" or empty
                                                                  const isFieldRequired = field.is_required === "Yes" || field.is_required === true
                                                                  const displayValue = typeof currentValue === "object"
                                                                    ? currentValue?.advance_field_value || ""
                                                                    : currentValue || ""

                                                                  // For checkbox fields, check if at least one option is selected
                                                                  let isEmptyOrNotSpecified = false
                                                                  if (field.field_type === "checkbox") {
                                                                    const currentSelectedIds = typeof currentValue === "object"
                                                                      ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids :
                                                                        currentValue?.option_id ? [currentValue.option_id] : [])
                                                                      : []
                                                                    isEmptyOrNotSpecified = currentSelectedIds.length === 0
                                                                  } else {
                                                                    isEmptyOrNotSpecified = !displayValue ||
                                                                      displayValue.trim() === "" ||
                                                                      displayValue.trim().toLowerCase() === "not specified" ||
                                                                      (field.field_type === "dropdown" && displayValue === `Select ${field.name}`)
                                                                  }

                                                                  const showRedBorder = isFieldRequired && isEmptyOrNotSpecified

                                                                  // Render based on field_type
                                                                  const renderAdvanceField = () => {
                                                                    // Dropdown field
                                                                    if (field.field_type === "dropdown" && field.options && Array.isArray(field.options)) {
                                                                      // Get current selected option
                                                                      const currentOptionId = typeof currentValue === "object"
                                                                        ? currentValue?.option_id?.toString()
                                                                        : currentValue?.toString() || ""

                                                                      // Filter active options only
                                                                      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)

                                                                      // If only one option and no value is set, auto-select it
                                                                      if (!currentOptionId && activeOptions.length === 1) {
                                                                        const singleOption = activeOptions[0]
                                                                        setTimeout(() => {
                                                                          setAdvanceFieldValues(prev => ({
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: singleOption.name,
                                                                              option_id: singleOption.id
                                                                            }
                                                                          }))
                                                                        }, 0)
                                                                      }

                                                                      // Find default option if no value is set and more than one option
                                                                      const defaultOption = !currentOptionId && activeOptions.length > 1
                                                                        ? activeOptions.find((opt: any) =>
                                                                          opt.is_default === "Yes" || opt.is_default === true
                                                                        )
                                                                        : null

                                                                      const selectedOptionId = currentOptionId || defaultOption?.id?.toString() || ""
                                                                      const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === selectedOptionId)

                                                                      // Auto-select default if exists and no value is set
                                                                      if (defaultOption && !currentOptionId && activeOptions.length > 1) {
                                                                        setTimeout(() => {
                                                                          setAdvanceFieldValues(prev => ({
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: defaultOption.name,
                                                                              option_id: defaultOption.id
                                                                            }
                                                                          }))
                                                                        }, 0)
                                                                      }

                                                                      return (
                                                                        <Select
                                                                          value={selectedOptionId}
                                                                          onValueChange={(value) => {
                                                                            const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === value)
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: selectedOption ? {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: selectedOption.name,
                                                                                option_id: selectedOption.id
                                                                              } : null
                                                                            }))
                                                                          }}
                                                                        >
                                                                          <SelectTrigger
                                                                            className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px] font-normal"
                                                                            style={{
                                                                              padding: '8px 12px 4px 12px',
                                                                              gap: '5px',
                                                                              background: '#FFFFFF',
                                                                              border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                              boxSizing: 'border-box',
                                                                              width: '100%',
                                                                            }}
                                                                          >
                                                                            <SelectValue placeholder={`Select ${field.name}`}>
                                                                              {selectedOption ? selectedOption.name : `Select ${field.name}`}
                                                                            </SelectValue>
                                                                          </SelectTrigger>
                                                                          <SelectContent>
                                                                            {activeOptions
                                                                              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                                              .map((option: any) => (
                                                                                <SelectItem key={option.id} value={option.id.toString()}>
                                                                                  {option.name}
                                                                                </SelectItem>
                                                                              ))}
                                                                          </SelectContent>
                                                                        </Select>
                                                                      )
                                                                    }

                                                                    // Text field
                                                                    if (field.field_type === "text") {
                                                                      return (
                                                                        <Input
                                                                          type="text"
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '80px',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Number field
                                                                    if (field.field_type === "number") {
                                                                      return (
                                                                        <Input
                                                                          type="number"
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Multiline text (textarea)
                                                                    if (field.field_type === "multiline_text") {
                                                                      return (
                                                                        <Textarea
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '80px',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Radio field
                                                                    if (field.field_type === "radio" && field.options && Array.isArray(field.options)) {
                                                                      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                                                                      const currentOptionId = typeof currentValue === "object"
                                                                        ? currentValue?.option_id?.toString()
                                                                        : currentValue?.toString() || ""

                                                                      // Find default option if no value is set
                                                                      const defaultOption = !currentOptionId
                                                                        ? activeOptions.find((opt: any) =>
                                                                          opt.is_default === "Yes" || opt.is_default === true
                                                                        )
                                                                        : null

                                                                      const selectedOptionId = currentOptionId || defaultOption?.id?.toString() || ""

                                                                      // Auto-select default if exists and no value is set
                                                                      if (defaultOption && !currentOptionId) {
                                                                        setTimeout(() => {
                                                                          setAdvanceFieldValues(prev => ({
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: defaultOption.name,
                                                                              option_id: defaultOption.id
                                                                            }
                                                                          }))
                                                                        }, 0)
                                                                      }

                                                                      return (
                                                                        <div
                                                                          className="mt-[5.27px] rounded-[7.7px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '37px',
                                                                            background: '#FFFFFF',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                        >
                                                                          <RadioGroup
                                                                            value={selectedOptionId}
                                                                            onValueChange={(value) => {
                                                                              const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === value)
                                                                              setAdvanceFieldValues(prev => ({
                                                                                ...prev,
                                                                                [fieldKey]: selectedOption ? {
                                                                                  advance_field_id: field.id,
                                                                                  advance_field_value: selectedOption.name,
                                                                                  option_id: selectedOption.id
                                                                                } : null
                                                                              }))
                                                                            }}
                                                                            className="space-y-2"
                                                                          >
                                                                            {activeOptions
                                                                              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                                              .map((option: any) => (
                                                                                <div key={option.id} className="flex items-center space-x-2">
                                                                                  <RadioGroupItem value={option.id.toString()} id={`${fieldKey}-${option.id}`} />
                                                                                  <Label
                                                                                    htmlFor={`${fieldKey}-${option.id}`}
                                                                                    className="text-[14.4px] font-normal cursor-pointer"
                                                                                  >
                                                                                    {option.name}
                                                                                  </Label>
                                                                                </div>
                                                                              ))}
                                                                          </RadioGroup>
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // Checkbox field (multiple selection)
                                                                    if (field.field_type === "checkbox" && field.options && Array.isArray(field.options)) {
                                                                      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)

                                                                      // For checkbox, value can be an array of selected option IDs
                                                                      const currentSelectedIds = typeof currentValue === "object"
                                                                        ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids :
                                                                          currentValue?.option_id ? [currentValue.option_id] : [])
                                                                        : []

                                                                      const handleCheckboxChange = (optionId: number, checked: boolean) => {
                                                                        setAdvanceFieldValues(prev => {
                                                                          const current = prev[fieldKey]
                                                                          const currentIds = typeof current === "object"
                                                                            ? (Array.isArray(current?.option_ids) ? current.option_ids :
                                                                              current?.option_id ? [current.option_id] : [])
                                                                            : []

                                                                          let newIds: number[]
                                                                          if (checked) {
                                                                            newIds = [...currentIds, optionId]
                                                                          } else {
                                                                            newIds = currentIds.filter((id: number) => id !== optionId)
                                                                          }

                                                                          // Get selected option names
                                                                          const selectedOptions = activeOptions.filter((opt: any) => newIds.includes(opt.id))
                                                                          const optionNames = selectedOptions.map((opt: any) => opt.name).join(", ")

                                                                          return {
                                                                            ...prev,
                                                                            [fieldKey]: {
                                                                              advance_field_id: field.id,
                                                                              advance_field_value: optionNames || "",
                                                                              option_ids: newIds
                                                                            }
                                                                          }
                                                                        })
                                                                      }

                                                                      return (
                                                                        <div
                                                                          className="mt-[5.27px] rounded-[7.7px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '37px',
                                                                            background: '#FFFFFF',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                        >
                                                                          <div className="space-y-2">
                                                                            {activeOptions
                                                                              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                                              .map((option: any) => (
                                                                                <div key={option.id} className="flex items-center space-x-2">
                                                                                  <Checkbox
                                                                                    id={`${fieldKey}-${option.id}`}
                                                                                    checked={currentSelectedIds.includes(option.id)}
                                                                                    onCheckedChange={(checked) => handleCheckboxChange(option.id, checked === true)}
                                                                                    className="border-gray-400"
                                                                                  />
                                                                                  <Label
                                                                                    htmlFor={`${fieldKey}-${option.id}`}
                                                                                    className="text-[14.4px] font-normal cursor-pointer"
                                                                                  >
                                                                                    {option.name}
                                                                                  </Label>
                                                                                </div>
                                                                              ))}
                                                                          </div>
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // File upload field
                                                                    if (field.field_type === "file_upload") {
                                                                      const currentFile = typeof currentValue === "object" && currentValue?.file
                                                                        ? currentValue.file
                                                                        : null

                                                                      return (
                                                                        <div
                                                                          className="mt-[5.27px] rounded-[7.7px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            minHeight: '37px',
                                                                            background: '#FFFFFF',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                        >
                                                                          <input
                                                                            type="file"
                                                                            onChange={(e) => {
                                                                              const file = e.target.files?.[0] || null
                                                                              setAdvanceFieldValues(prev => ({
                                                                                ...prev,
                                                                                [fieldKey]: {
                                                                                  advance_field_id: field.id,
                                                                                  advance_field_value: file?.name || "",
                                                                                  file: file
                                                                                }
                                                                              }))
                                                                            }}
                                                                            className="text-[14.4px] w-full"
                                                                            accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.stl,.mp4,.avi,.mov,.zip,.rar"
                                                                          />
                                                                          {currentFile && (
                                                                            <div className="mt-2 text-xs text-gray-600">
                                                                              Selected: {currentFile.name}
                                                                            </div>
                                                                          )}
                                                                        </div>
                                                                      )
                                                                    }

                                                                    // Shade guide field
                                                                    if (field.field_type === "shade_guide") {
                                                                      return (
                                                                        <Input
                                                                          type="text"
                                                                          value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                                          onChange={(e) => {
                                                                            setAdvanceFieldValues(prev => ({
                                                                              ...prev,
                                                                              [fieldKey]: {
                                                                                advance_field_id: field.id,
                                                                                advance_field_value: e.target.value
                                                                              }
                                                                            }))
                                                                          }}
                                                                          className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                                          style={{
                                                                            padding: '8px 12px 4px 12px',
                                                                            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                            width: '100%',
                                                                          }}
                                                                          placeholder={`Enter ${field.name}`}
                                                                        />
                                                                      )
                                                                    }

                                                                    // Implant library field
                                                                    if (field.field_type === "implant_library") {
                                                                      const currentStep = implantSelectionStep[fieldKey] || 'brand'
                                                                      const selectedBrandId = selectedImplantBrand[fieldKey]
                                                                      const selectedPlatformId = selectedImplantPlatform[fieldKey]
                                                                      const selectedSize = selectedImplantSize[fieldKey]

                                                                      // Get selected brand and platform
                                                                      const selectedBrand = selectedBrandId ? implants.find((imp: any) => imp.id === selectedBrandId || imp.id === Number(selectedBrandId)) : null
                                                                      // Prefer stored platform data when id matches so the selected value always shows (API platforms may have different shape)
                                                                      let selectedPlatform: { id: number; name: string } | null = null
                                                                      if (selectedBrand && selectedPlatformId != null) {
                                                                        const stored = selectedImplantPlatformData[fieldKey]
                                                                        if (stored && (Number(stored.id) === Number(selectedPlatformId) || stored.id === selectedPlatformId)) {
                                                                          selectedPlatform = { id: Number(stored.id), name: stored.name ?? '' }
                                                                        }
                                                                        if (!selectedPlatform) {
                                                                          const fromBrand = selectedBrand.platforms?.find((p: any) => Number(p.id) === Number(selectedPlatformId))
                                                                          const fallback = selectedImplantPlatformData[fieldKey]
                                                                          selectedPlatform = fromBrand
                                                                            ? { id: Number(fromBrand.id) || 0, name: (fromBrand as any).name ?? '' }
                                                                            : (fallback ? { id: Number(fallback.id), name: fallback.name ?? '' } : null)
                                                                        }
                                                                      }

                                                                      // Build display value
                                                                      let displayValue = ""
                                                                      if (selectedBrand && selectedPlatform && selectedSize) {
                                                                        displayValue = `${selectedBrand.brand_name} - ${selectedPlatform.name} - ${selectedSize}`
                                                                      } else if (selectedBrand && selectedPlatform) {
                                                                        displayValue = `${selectedBrand.brand_name} - ${selectedPlatform.name}`
                                                                      } else if (selectedBrand) {
                                                                        displayValue = selectedBrand.brand_name
                                                                      }

                                                                      return (
                                                                        <>
                                                                          {/* Only show input if form is not shown yet */}
                                                                          {currentStep !== 'form' && (
                                                                            <Input
                                                                              type="text"
                                                                              value={displayValue || (typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || "")}
                                                                              onClick={() => {
                                                                                // Show cards when input is clicked, reset to brand step
                                                                                setShowImplantCards(true)
                                                                                setActiveImplantFieldKey(fieldKey)
                                                                                setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'brand' }))
                                                                              }}
                                                                              onFocus={() => {
                                                                                // Show cards when input is focused, reset to brand step
                                                                                setShowImplantCards(true)
                                                                                setActiveImplantFieldKey(fieldKey)
                                                                                setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'brand' }))
                                                                              }}
                                                                              onChange={(e) => {
                                                                                setAdvanceFieldValues(prev => ({
                                                                                  ...prev,
                                                                                  [fieldKey]: {
                                                                                    advance_field_id: field.id,
                                                                                    advance_field_value: e.target.value
                                                                                  }
                                                                                }))
                                                                              }}
                                                                              className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px] cursor-pointer"
                                                                              style={{
                                                                                padding: '8px 12px 4px 12px',
                                                                                border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                                                width: '100%',
                                                                              }}
                                                                              readOnly
                                                                            />
                                                                          )}

                                                                          {/* Implant Detail Form - Show after brand/platform selection */}
                                                                          {currentStep === 'form' && selectedBrand && (
                                                                            <div data-implant-field-key={fieldKey} style={{ width: '100%' }}>
                                                                              <ImplantDetailForm
                                                                                fieldKey={fieldKey}
                                                                                fieldId={field.id}
                                                                                selectedBrand={selectedBrand}
                                                                                selectedPlatform={selectedPlatform}
                                                                                selectedSize={selectedSize}
                                                                                onSizeChange={(size: string) => {
                                                                                  setSelectedImplantSize(prev => ({ ...prev, [fieldKey]: size }))
                                                                                  // Update mandibularImplantDetails to trigger impression field visibility in DynamicProductFields
                                                                                  if (selectedBrand && selectedPlatform) {
                                                                                    const implantDetailsStr = `${selectedBrand.brand_name} - ${selectedPlatform.name} - ${size}`
                                                                                    setMandibularImplantDetails(implantDetailsStr)
                                                                                  }
                                                                                }}
                                                                                onInclusionsChange={(inclusions) => {
                                                                                  // Handle inclusions change - update state for impression field visibility
                                                                                  setMandibularImplantInclusions(inclusions)
                                                                                  if (selectedBrand && selectedPlatform && selectedSize) {
                                                                                    const implantDetailsStr = `${selectedBrand.brand_name} - ${selectedPlatform.name} - ${selectedSize} - ${inclusions}`
                                                                                    setMandibularImplantDetails(implantDetailsStr)
                                                                                  }
                                                                                }}
                                                                                onAbutmentDetailChange={(detail) => {
                                                                                  // Handle abutment detail change - update state for impression field visibility
                                                                                  setMandibularAbutmentDetail(detail)
                                                                                }}
                                                                                onAbutmentTypeChange={(type) => {
                                                                                  // Handle abutment type change - update state for impression field visibility
                                                                                  setMandibularAbutmentType(type)
                                                                                }}
                                                                                onPlatformChange={(platform) => {
                                                                                  const platformIdNum = Number(platform?.id)
                                                                                  if (!Number.isNaN(platformIdNum)) {
                                                                                    setSelectedImplantPlatform(prev => ({ ...prev, [fieldKey]: platformIdNum }))
                                                                                    setSelectedImplantPlatformData(prev => ({ ...prev, [fieldKey]: { id: platformIdNum, name: platform.name } }))
                                                                                  }
                                                                                }}
                                                                                onBrandFieldClick={() => {
                                                                                  // Show brand cards when brand field is clicked
                                                                                  setShowImplantCards(true)
                                                                                  setActiveImplantFieldKey(fieldKey)
                                                                                  // Keep step as 'form' so form stays visible, but show brand cards
                                                                                  setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                                  setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: 'brand' }))
                                                                                  // Scroll to the cards container to show the brand cards
                                                                                  setTimeout(() => {
                                                                                    if (implantCardsRef.current) {
                                                                                      implantCardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                                    }
                                                                                  }, 100)
                                                                                }}
                                                                                onPlatformFieldClick={() => {
                                                                                  // Show platform cards when platform field is clicked (same position as brand cards)
                                                                                  if (selectedBrand) {
                                                                                    // Ensure the brand ID is stored in state so cards rendering can find it
                                                                                    if (!selectedImplantBrand[fieldKey] || selectedImplantBrand[fieldKey] !== selectedBrand.id) {
                                                                                      setSelectedImplantBrand(prev => ({ ...prev, [fieldKey]: selectedBrand.id }))
                                                                                    }
                                                                                    setShowImplantCards(true)
                                                                                    setActiveImplantFieldKey(fieldKey)
                                                                                    // Keep step as 'form' so form stays visible, but show platform cards
                                                                                    setImplantSelectionStep(prev => ({ ...prev, [fieldKey]: 'form' }))
                                                                                    setClickedFieldTypeInForm(prev => ({ ...prev, [fieldKey]: 'platform' }))
                                                                                    // Scroll to the cards container to show the platform cards (same position as brand cards)
                                                                                    setTimeout(() => {
                                                                                      if (implantCardsRef.current) {
                                                                                        implantCardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                                      }
                                                                                    }, 100)
                                                                                  }
                                                                                }}
                                                                                teethNumbers={mandibularTeeth}
                                                                                arch={archType}
                                                                              />
                                                                            </div>
                                                                          )}
                                                                        </>
                                                                      )
                                                                    }

                                                                    // Default: display field name
                                                                    return (
                                                                      <div
                                                                        className="flex items-center"
                                                                        style={{
                                                                          padding: '8px 12px 4px 12px',
                                                                          gap: '5px',
                                                                          width: '100%',
                                                                          minHeight: '37px',
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
                                                                          fontSize: '13px',
                                                                          lineHeight: '20px',
                                                                          letterSpacing: '-0.02em',
                                                                          color: '#000000'
                                                                        }}>
                                                                          {field.name || field.description || "Advanced Field"} ({field.field_type})
                                                                        </span>
                                                                      </div>
                                                                    )
                                                                  }

                                                                  return (
                                                                    <div
                                                                      key={field.id}
                                                                      className="relative"
                                                                      style={{
                                                                        minHeight: '38px',
                                                                        width: '100%',
                                                                        ...(fieldWidth.gridColumn ? { gridColumn: fieldWidth.gridColumn } : {}),
                                                                      }}
                                                                    >
                                                                      {renderAdvanceField()}
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
                                                                        {field.field_type === "implant_library" && isEmptyOrNotSpecified
                                                                          ? "Select Implant Details"
                                                                          : (field.name || "Advanced Field")}
                                                                        {field.is_required === "Yes" && (
                                                                          <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                                        )}
                                                                      </label>
                                                                    </div>
                                                                  )
                                                                })}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      })()}

                                                    {/* Impression Field - Shown when impressions exist and (no advance fields OR all advance fields complete) */}
                                                    {productDetails?.impressions &&
                                                      Array.isArray(productDetails.impressions) &&
                                                      productDetails.impressions.length > 0 &&
                                                      isToothShadeFilled("mandibular") && (() => {
                                                        const hasAdvanceFields = productDetails?.advance_fields && Array.isArray(productDetails.advance_fields) && productDetails.advance_fields.length > 0
                                                        let allAdvanceFieldsComplete = true
                                                        if (hasAdvanceFields) {
                                                          const filteredAdvanceFields = productDetails.advance_fields.filter((field: any) => {
                                                            const fieldNameLower = (field.name || "").toLowerCase()
                                                            return !(fieldNameLower.includes("stump") && fieldNameLower.includes("shade"))
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
                                                        if (hasAdvanceFields && !allAdvanceFieldsComplete) return null

                                                        const impressionCount = selectedProduct
                                                          ? getImpressionCount(selectedProduct.id.toString(), "mandibular", productDetails.impressions)
                                                          : 0
                                                        const displayText = selectedProduct
                                                          ? getImpressionDisplayText(selectedProduct.id.toString(), "mandibular", productDetails.impressions)
                                                          : "Select impression"
                                                        const hasImpressionValue = impressionCount > 0 || (displayText && displayText !== "Select impression")

                                                        return (
                                                          <div className="flex flex-wrap" style={{ width: '100%', marginTop: '10px' }}>
                                                            <div style={{ flex: '1 1 50%', minWidth: '200px', maxWidth: '50%' }}>
                                                              <div className="relative" style={{ minHeight: '38px', width: '100%' }}>
                                                                <div
                                                                  className="flex items-center cursor-pointer"
                                                                  onClick={() => {
                                                                    if (selectedProduct) {
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
                                                                    }
                                                                  }}
                                                                  style={{
                                                                    padding: '8px 12px 4px 12px',
                                                                    gap: '5px',
                                                                    width: '100%',
                                                                    height: '32px',
                                                                    position: 'relative',
                                                                    marginTop: '5.27px',
                                                                    background: '#FFFFFF',
                                                                    border: `0.740384px solid ${hasImpressionValue ? '#119933' : '#ef4444'}`,
                                                                    borderRadius: '7.7px',
                                                                    boxSizing: 'border-box'
                                                                  }}
                                                                >
                                                                  <span style={{
                                                                    fontFamily: 'Verdana',
                                                                    fontStyle: 'normal',
                                                                    fontWeight: 400,
                                                                    fontSize: '13px',
                                                                    lineHeight: '20px',
                                                                    letterSpacing: '-0.02em',
                                                                    color: '#000000',
                                                                    whiteSpace: 'nowrap',
                                                                    paddingRight: hasImpressionValue ? '30px' : '0px'
                                                                  }}>{displayText}</span>
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
                                                                    color: hasImpressionValue ? '#119933' : '#ef4444'
                                                                  }}
                                                                >
                                                                  Impression<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                                </label>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      })()}
                                                  </>
                                                )}

                                              </div>

                                              {/* Action Buttons - Show when all fields have values */}
                                              {productDetails &&
                                                areAllCurrentProductFieldsFilled("mandibular") && (
                                                  <div
                                                    className="flex flex-wrap justify-center items-center w-full"
                                                    style={{
                                                      gap: '16px',
                                                      position: 'relative',
                                                    }}
                                                  >
                                                    {/* Deliver product first - Only show if multiple products */}
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
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        // For card accordion, create temp product for modal
                                                        const tempProduct: SavedProduct = {
                                                          id: selectedProduct?.id?.toString() || `temp-${Date.now()}`,
                                                          product: selectedProduct || { id: 0, name: "Product", price: 0 },
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
                                                        setCurrentProductForModal(tempProduct)
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
                                                      onClick={(e) => {
                                                        e.stopPropagation()
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
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        // For card accordion, create temp product for rush modal
                                                        const tempProduct: SavedProduct = {
                                                          id: selectedProduct?.id?.toString() || `temp-${Date.now()}`,
                                                          product: selectedProduct || { id: 0, name: "Product", price: 0 },
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
                                                        setCurrentProductForModal(tempProduct)
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
                                            </AccordionContent>
                                          </Card>
                                        </AccordionItem>
                                      )}
                                    {savedProducts
                                      .filter(p => p.addedFrom === "mandibular")
                                      .map((savedProduct, index) => {
                                        const teeth = savedProduct.mandibularTeeth.sort((a, b) => a - b)
                                        const displayTeeth = teeth.length === 1
                                          ? `#${teeth[0]}`
                                          : teeth.length > 0
                                            ? `#${teeth.join(", #")}`
                                            : "No teeth selected"

                                        const productDetails = savedProduct.productDetails
                                        const archType: "maxillary" | "mandibular" = "mandibular"
                                        const categoryLower = savedProduct.category.toLowerCase()
                                        const isFixedRestoration = categoryLower.includes("fixed")
                                        const isRemovableOrOrtho = categoryLower.includes("removable") ||
                                          categoryLower.includes("orthodontic") ||
                                          categoryLower.includes("ortho")

                                        return (
                                          <AccordionItem key={savedProduct.id} value={String(savedProduct.id)} className="border-0 flex justify-center w-full min-w-0">
                                            <Card
                                              className="overflow-hidden w-full"
                                              style={{
                                                position: 'relative',
                                                width: '100%',
                                                maxWidth: '720px',
                                                minWidth: 0,
                                                left: '0.87px',
                                                top: 0,
                                                background: '#FFFFFF',
                                                borderRadius: '5.4px',
                                                border: 'none',
                                              }}
                                            >
                                              {/* Header */}
                                              <div
                                                className="w-full min-w-0"
                                                style={{
                                                  position: 'relative',
                                                  minHeight: '45px',
                                                  background: savedProduct.rushData ? '#FFE2E2' : (openAccordionMandibular != null && String(openAccordionMandibular) === String(savedProduct.id) ? '#E0EDF8' : '#F5F5F5'),
                                                  borderRadius: openAccordionMandibular != null && String(openAccordionMandibular) === String(savedProduct.id) ? '10px 10px 0px 0px' : '10px',
                                                  border: savedProduct.rushData ? '1px solid #CF0202' : 'none',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'flex-start',
                                                  padding: '6px 8px',
                                                  gap: '8px',
                                                  borderBottom: openAccordionMandibular != null && String(openAccordionMandibular) === String(savedProduct.id) ? '1px dotted #B0D0F0' : 'none'
                                                }}
                                              >
                                                <AccordionTrigger
                                                  className="hover:no-underline w-full group [&>svg]:hidden"
                                                  style={{
                                                    padding: '0px',
                                                    gap: '10px',
                                                    width: '100%',
                                                    background: 'transparent',
                                                    boxShadow: 'none',
                                                    borderRadius: '0px'
                                                  }}
                                                >
                                                  {/* Responsive Content Container */}
                                                  <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px', paddingRight: '24px' }}>
                                                    {/* Product Image */}
                                                    <div
                                                      style={{
                                                        width: '32px',
                                                        minWidth: '32px',
                                                        height: '32px',
                                                        background: '#F5F5F5',
                                                        borderRadius: '5.4px',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
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

                                                    {/* Content Area - Responsive */}
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, alignItems: 'flex-start' }}>
                                                      {/* Product Name - Bold, plain text */}
                                                      <span
                                                        style={{
                                                          fontFamily: 'Verdana',
                                                          fontStyle: 'normal',
                                                          fontWeight: 600,
                                                          fontSize: '14px',
                                                          lineHeight: '16px',
                                                          letterSpacing: '-0.02em',
                                                          color: '#000000',
                                                          wordBreak: 'break-word',
                                                          overflowWrap: 'break-word',
                                                          textAlign: 'left',
                                                          width: '100%'
                                                        }}
                                                      >
                                                        {savedProduct.product.name}
                                                      </span>

                                                      {/* Tooth Numbers Row - Formatted as #9 */}
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span
                                                          style={{
                                                            fontFamily: 'Verdana',
                                                            fontStyle: 'normal',
                                                            fontWeight: 400,
                                                            fontSize: '12px',
                                                            lineHeight: '14px',
                                                            letterSpacing: '-0.02em',
                                                            color: '#000000'
                                                          }}
                                                        >
                                                          {teeth.length > 0 ? teeth.map(t => `#${t}`).join(', ') : ''}
                                                        </span>
                                                        {/* Rush Icon Indicator */}
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

                                                      {/* Badges and Info Row - Responsive */}
                                                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                        {/* Badge - Category - Pill shaped */}
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '3px 10px', background: '#F0F0F0', borderRadius: '12px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 500, fontSize: '12px', lineHeight: '14px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{savedProduct.category}</span>
                                                        </div>

                                                        {/* Badge - Subcategory - Pill shaped */}
                                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '3px 10px', background: '#F0F0F0', borderRadius: '12px', flexShrink: 0 }}>
                                                          <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 500, fontSize: '12px', lineHeight: '14px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{savedProduct.subcategory}</span>
                                                        </div>

                                                        {/* Badge - Stage - Pill shaped */}
                                                        {savedProduct.mandibularStage && (
                                                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '3px 10px', background: '#F0F0F0', borderRadius: '12px', flexShrink: 0 }}>
                                                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 500, fontSize: '12px', lineHeight: '14px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', whiteSpace: 'nowrap' }}>{savedProduct.mandibularStage}</span>
                                                          </div>
                                                        )}

                                                        {/* Est days */}
                                                        <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '11px', lineHeight: '13px', letterSpacing: '-0.02em', color: '#B4B0B0', whiteSpace: 'nowrap' }}>
                                                          Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Chevron - explicit, placed last (rightmost) after trash so it stays clickable */}
                                                  <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: `translateY(-50%) ${openAccordionMandibular != null && String(openAccordionMandibular) === String(savedProduct.id) ? 'rotate(0deg)' : 'rotate(-180deg)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12 }}>
                                                    <ChevronDown className="w-full h-full transition-transform duration-200 text-black" />
                                                  </div>
                                                </AccordionTrigger>
                                                {/* Delete Button - left of chevron (trash first, then chevron on the right) */}
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
                                                    right: '36px',
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

                                              <AccordionContent className="pt-0 scrollbar-blue" style={{ position: 'relative', minHeight: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
                                                {/* Tooth Shade Selection - Shows at the top when active (saved product) */}
                                                {currentShadeField && currentShadeArch === "mandibular" && currentShadeProductId === savedProduct.id && (
                                                  <div className="w-full pt-4">
                                                    <div className="flex flex-col w-full">
                                                      {/* Top Row: Stump Shade, Tooth Shade fields and Shade Guide Dropdown */}
                                                      <div className="w-full flex items-start gap-4 px-4 mb-4">
                                                        {/* Stump Shade Field */}
                                                        <div className="relative flex-1">
                                                          <div
                                                            className={cn(
                                                              "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200 flex items-center cursor-pointer",
                                                              savedProduct.mandibularStumpShade ? "border-[#119933]" : "border-[#ef4444] hover:border-[#ef4444]"
                                                            )}
                                                            onClick={() => handleOpenShadeModal("stump_shade", "mandibular", savedProduct.id)}
                                                          >
                                                            <span className={savedProduct.mandibularStumpShade ? "text-black" : "text-gray-400"}>
                                                              {savedProduct.mandibularStumpShade}
                                                            </span>
                                                            {savedProduct.mandibularStumpShade && (
                                                              <div className="ml-auto flex items-center gap-2">
                                                                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{savedProduct.mandibularStumpShade.split(' - ')[1]}</span>
                                                                <Check className="h-5 w-5 text-[#119933]" />
                                                              </div>
                                                            )}
                                                          </div>
                                                          <label className={cn(
                                                            "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                            savedProduct.mandibularStumpShade ? "text-[#119933]" : "text-[#ef4444]"
                                                          )}>
                                                            {savedProduct.mandibularStumpShade ? "Stump Shade" : "Select Stump Shade"}<span className="text-red-500">*</span>
                                                          </label>
                                                        </div>

                                                        {/* Tooth Shade Field - shown only after Stump Shade is selected */}
                                                        {savedProduct.mandibularStumpShade && (
                                                          <div className="relative flex-1">
                                                            <div
                                                              className={cn(
                                                                "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200 flex items-center cursor-pointer",
                                                                savedProduct.mandibularToothShade ? "border-[#119933]" : "border-[#ef4444] hover:border-[#ef4444]"
                                                              )}
                                                              onClick={() => handleOpenShadeModal("tooth_shade", "mandibular", savedProduct.id)}
                                                            >
                                                              <span className={savedProduct.mandibularToothShade ? "text-black" : "text-gray-400"}>
                                                                {savedProduct.mandibularToothShade}
                                                              </span>
                                                              {savedProduct.mandibularToothShade && (
                                                                <div className="ml-auto flex items-center gap-2">
                                                                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">{savedProduct.mandibularToothShade.split(' - ')[1]}</span>
                                                                  <Check className="h-5 w-5 text-[#119933]" />
                                                                </div>
                                                              )}
                                                            </div>
                                                            <label className={cn(
                                                              "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                              savedProduct.mandibularToothShade ? "text-[#119933]" : "text-[#ef4444]"
                                                            )}>
                                                              {savedProduct.mandibularToothShade ? "Tooth Shade" : "Select Tooth Shade"}<span className="text-red-500">*</span>
                                                            </label>
                                                          </div>
                                                        )}

                                                        {/* Shade Guide Dropdown */}
                                                        <div className="relative min-w-[220px]">
                                                          <Select value={selectedShadeGuide} onValueChange={setSelectedShadeGuide}>
                                                            <SelectTrigger
                                                              className={cn(
                                                                "h-12 w-full rounded-md border-2 bg-white px-4 py-3 text-base transition-all duration-200",
                                                                selectedShadeGuide ? "border-[#119933]" : "border-[#E0E0E0] hover:border-[#1162A8]"
                                                              )}
                                                            >
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {shadeGuideOptions.map((guide) => (
                                                                <SelectItem key={guide} value={guide}>
                                                                  {guide}
                                                                </SelectItem>
                                                              ))}
                                                            </SelectContent>
                                                          </Select>
                                                          <label className={cn(
                                                            "absolute -top-2.5 left-3 bg-white px-1 text-sm z-10",
                                                            selectedShadeGuide ? "text-[#119933]" : "text-gray-500"
                                                          )}>
                                                            Shade guide selected
                                                          </label>
                                                          {selectedShadeGuide && (
                                                            <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                              <Check className="h-5 w-5 text-[#119933]" />
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* Shade guide SVG - Full Width */}
                                                      <div className="bg-white w-full">
                                                        {selectedShadeGuide === "Trubyte Bioform IPN" ? (
                                                          <TrubyteBioformIPNShadeSelectionSVG
                                                            selectedShades={selectedShadesForSVG}
                                                            onShadeClick={handleShadeClickFromSVG}
                                                            className="w-full"
                                                          />
                                                        ) : (
                                                          <ToothShadeSelectionSVG
                                                            selectedShades={selectedShadesForSVG}
                                                            onShadeClick={handleShadeClickFromSVG}
                                                            className="w-full"
                                                          />
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                                {/* Summary detail - same layout as current mandibular card */}
                                                <div
                                                  className="bg-white w-full"
                                                  style={{
                                                    position: 'relative',
                                                    height: 'auto',
                                                    minHeight: 'auto',
                                                    paddingLeft: '15.87px',
                                                    paddingRight: '15.87px',
                                                    paddingBottom: '8px',
                                                    paddingTop: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    background: '#FFFFFF',
                                                    boxSizing: 'border-box'
                                                  }}
                                                >
                                                  {productDetails && (
                                                    <>
                                                      <DynamicProductFields
                                                        productDetails={productDetails}
                                                        savedProduct={savedProduct}
                                                        arch="mandibular"
                                                        fieldConfigs={fieldConfigs}
                                                        onFieldChange={(fieldKey, value, id) => {
                                                          handleFieldChange(fieldKey, value, id, savedProduct.id, "mandibular")
                                                        }}
                                                        maxillaryRetentionTypes={{}}
                                                        mandibularRetentionTypes={{}}
                                                        maxillaryTeeth={savedProduct.maxillaryTeeth || []}
                                                        mandibularTeeth={savedProduct.mandibularTeeth || []}
                                                        onOpenImpressionModal={() => handleOpenImpressionModal(savedProduct, "mandibular")}
                                                        getImpressionCount={() => savedProduct.mandibularImpressions?.length ? getImpressionCountFromSaved(savedProduct.mandibularImpressions) : (productDetails?.impressions ? getImpressionCount(savedProduct.product.id.toString(), "mandibular", productDetails.impressions) : 0)}
                                                        getImpressionDisplayText={() => savedProduct.mandibularImpressions?.length ? getImpressionDisplayTextFromSaved(savedProduct.mandibularImpressions) : (productDetails?.impressions ? getImpressionDisplayText(savedProduct.product.id.toString(), "mandibular", productDetails.impressions) : "Select impression")}
                                                        onOpenShadeModal={(fieldKey) => handleOpenShadeModal(fieldKey, "mandibular", savedProduct.id)}
                                                        showImplantBrandCards={showImplantCardsForProduct[savedProduct.id]?.mandibular || false}
                                                        implantsLoading={implantsLoading}
                                                        implants={implants.map((imp: any) => ({
                                                          id: imp.id,
                                                          brand_name: imp.brand_name,
                                                          system_name: imp.system_name,
                                                          code: imp.code,
                                                          image_url: imp.image_url,
                                                          platforms: imp.platforms?.map((p: any) => ({
                                                            id: p.id || 0,
                                                            name: p.name,
                                                            image: p.image_url
                                                          }))
                                                        }))}
                                                        selectedImplantId={selectedImplantBrandPerProduct[savedProduct.id]?.mandibular ?? null}
                                                        onSelectImplant={(implant: any) => {
                                                          setSelectedImplantBrandPerProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: { ...prev[savedProduct.id], mandibular: implant.id }
                                                          }))
                                                        }}
                                                        onImplantDetailsFieldClick={() => {
                                                          setShowImplantCardsForProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: { ...prev[savedProduct.id], mandibular: !prev[savedProduct.id]?.mandibular }
                                                          }))
                                                        }}
                                                        selectedImplantPlatformId={selectedImplantPlatformPerProduct[savedProduct.id]?.mandibular ?? null}
                                                        onSelectImplantPlatform={(platform: any) => {
                                                          setSelectedImplantPlatformPerProduct(prev => ({
                                                            ...prev,
                                                            [savedProduct.id]: { ...prev[savedProduct.id], mandibular: platform.id }
                                                          }))
                                                        }}
                                                        onBrandFieldClick={() => {
                                                          setShowImplantCardsForProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: true } }))
                                                          setClickedFieldTypeInAccordion(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: 'brand' } }))
                                                        }}
                                                        onPlatformFieldClick={() => {
                                                          setShowImplantCardsForProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: true } }))
                                                          setClickedFieldTypeInAccordion(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: 'platform' } }))
                                                        }}
                                                        selectedImplantBrand={{}}
                                                        selectedImplantPlatform={{}}
                                                        selectedImplantSize={{}}
                                                        hideFieldsDuringShadeSelection={currentShadeField !== null && currentShadeArch === "mandibular" && currentShadeProductId === savedProduct.id}
                                                        hideImpression={true}
                                                      />
                                                      {/* Implant Detail Form - Below tooth shade field for saved mandibular products with implant retention */}
                                                      {(() => {
                                                        let hasImplantRetentionForForm = false
                                                        const teethForForm = savedProduct.mandibularTeeth || []
                                                        hasImplantRetentionForForm = teethForForm.some((toothNumber: number) => {
                                                          const types = mandibularRetentionTypes[toothNumber] || []
                                                          return types.includes('Implant')
                                                        })
                                                        if (!hasImplantRetentionForForm && productDetails?.retention_options && savedProduct.mandibularRetentionOptionId) {
                                                          const opt = productDetails.retention_options.find((o: any) =>
                                                            o.id === savedProduct.mandibularRetentionOptionId ||
                                                            o.lab_retention_option?.id === savedProduct.mandibularRetentionOptionId ||
                                                            o.retention_option_id === savedProduct.mandibularRetentionOptionId
                                                          )
                                                          const toothChartType = opt?.tooth_chart_type ?? opt?.lab_retention_option?.tooth_chart_type ?? opt?.retention_option?.tooth_chart_type
                                                          hasImplantRetentionForForm = toothChartType === "Implant"
                                                        }
                                                        if (!hasImplantRetentionForForm && savedProduct.mandibularRetention && String(savedProduct.mandibularRetention).toLowerCase().includes('implant')) {
                                                          hasImplantRetentionForForm = true
                                                        }
                                                        if (!hasImplantRetentionForForm || !implants?.length) return null
                                                        const fieldKeyForm = `saved_implant_mandibular_${savedProduct.id}`
                                                        let savedBrandIdForm: number | string | null = savedProduct.mandibularImplantBrand ?? selectedImplantBrandPerProduct[savedProduct.id]?.mandibular ?? null
                                                        if (!savedBrandIdForm && savedProduct.mandibularImplantDetails) {
                                                          const parts = String(savedProduct.mandibularImplantDetails).split(' - ')
                                                          if (parts[0]) {
                                                            const found = implants.find((imp: any) =>
                                                              imp.brand_name === parts[0].trim() || imp.brand_name?.toLowerCase() === parts[0].trim().toLowerCase()
                                                            )
                                                            if (found) savedBrandIdForm = found.id
                                                          }
                                                        }
                                                        let selectedBrandForm = savedBrandIdForm ? implants.find((imp: any) => imp.id === savedBrandIdForm || imp.id === Number(savedBrandIdForm) || String(imp.id) === String(savedBrandIdForm)) : null
                                                        if (!selectedBrandForm && typeof savedBrandIdForm === 'string') {
                                                          selectedBrandForm = implants.find((imp: any) => imp.brand_name === savedBrandIdForm || imp.brand_name?.toLowerCase() === String(savedBrandIdForm).toLowerCase())
                                                        }
                                                        if (!selectedBrandForm && savedProduct.mandibularImplantDetails) {
                                                          const parts = String(savedProduct.mandibularImplantDetails).split(' - ')
                                                          if (parts[0]) {
                                                            selectedBrandForm = implants.find((imp: any) => imp.brand_name === parts[0].trim() || imp.brand_name?.toLowerCase() === parts[0].trim().toLowerCase())
                                                          }
                                                        }
                                                        let savedPlatformIdForm: number | string | null = selectedImplantPlatformPerProduct[savedProduct.id]?.mandibular ?? null
                                                        if (!savedPlatformIdForm && savedProduct.mandibularImplantPlatform != null && selectedBrandForm) {
                                                          const platformVal = savedProduct.mandibularImplantPlatform
                                                          const strVal = String(platformVal).trim()
                                                          const byName = selectedBrandForm.platforms?.find((p: any) =>
                                                            (p.name != null && String(p.name).toLowerCase() === strVal.toLowerCase()) || p.name === platformVal
                                                          )
                                                          if (byName) savedPlatformIdForm = byName.id ?? byName.name
                                                          else if (typeof platformVal === 'number') savedPlatformIdForm = platformVal
                                                          else {
                                                            const numId = Number(platformVal)
                                                            if (!Number.isNaN(numId)) {
                                                              const byId = selectedBrandForm.platforms?.find((p: any) => (p.id || 0) === numId || p.id === numId || Number(p.id) === numId)
                                                              if (byId) savedPlatformIdForm = byId.id ?? byId.name
                                                            }
                                                          }
                                                        }
                                                        let selectedPlatformForm = selectedBrandForm && savedPlatformIdForm != null
                                                          ? selectedBrandForm.platforms?.find((p: any) => ((p.id || 0) === savedPlatformIdForm || p.id === Number(savedPlatformIdForm) || String(p.id) === String(savedPlatformIdForm) || (p.name != null && (p.name === savedPlatformIdForm || String(p.name).toLowerCase() === String(savedPlatformIdForm).toLowerCase()))))
                                                          : null
                                                        const savedPlatformNameForm = savedProduct.mandibularImplantPlatform ?? (savedProduct.mandibularImplantDetails ? String(savedProduct.mandibularImplantDetails).split(' - ')[1]?.trim() : undefined)
                                                        if (!selectedPlatformForm && savedPlatformNameForm) {
                                                          selectedPlatformForm = { id: undefined, name: savedPlatformNameForm }
                                                        }
                                                        let savedSizeForm: string | null = savedProduct.mandibularImplantSize ?? null
                                                        if (!savedSizeForm && savedProduct.mandibularImplantDetails) {
                                                          const parts = String(savedProduct.mandibularImplantDetails).split(' - ')
                                                          if (parts.length >= 3) savedSizeForm = parts[2].trim()
                                                          else if (parts.length === 2) savedSizeForm = parts[1].trim()
                                                        }
                                                        const selectedSizeForm = selectedImplantSize[fieldKeyForm] ?? savedSizeForm ?? null
                                                        const savedInclusionsForm = savedProduct.mandibularImplantInclusions ?? ""
                                                        const savedAbutmentDetailForm = savedProduct.mandibularAbutmentDetail ?? ""
                                                        const savedAbutmentTypeForm = savedProduct.mandibularAbutmentType ?? ""
                                                        const storageKeyForm = `${savedProduct.id}_${archType}_${fieldKeyForm}`
                                                        return selectedBrandForm ? (
                                                          <div key={fieldKeyForm} className="w-full" data-implant-field-key={fieldKeyForm}>
                                                            <ImplantDetailForm
                                                              fieldKey={fieldKeyForm}
                                                              fieldId={0}
                                                              selectedBrand={selectedBrandForm}
                                                              selectedPlatform={selectedPlatformForm ?? null}
                                                              selectedSize={selectedSizeForm}
                                                              storageKey={storageKeyForm}
                                                              onRestoreFromCache={(data) => {
                                                                if (data.platformId != null) {
                                                                  setSelectedImplantPlatformPerProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: data.platformId } }))
                                                                }
                                                                if (data.size != null) {
                                                                  setSelectedImplantSize(prev => ({ ...prev, [fieldKeyForm]: data.size }))
                                                                }
                                                                if (data.platformId != null || data.size != null) {
                                                                  setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                    ...sp,
                                                                    mandibularImplantPlatform: data.platformName ?? sp.mandibularImplantPlatform,
                                                                    mandibularImplantSize: data.size ?? sp.mandibularImplantSize,
                                                                    mandibularImplantDetails: selectedBrandForm?.brand_name && (data.platformName || data.size)
                                                                      ? `${selectedBrandForm.brand_name} - ${data.platformName ?? ''} - ${data.size ?? ''}`.replace(/\s*-\s*$/, '')
                                                                      : sp.mandibularImplantDetails,
                                                                  } : sp))
                                                                }
                                                              }}
                                                              onSizeChange={(size: string) => {
                                                                setSelectedImplantSize(prev => ({ ...prev, [fieldKeyForm]: size }))
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                  ...sp,
                                                                  mandibularImplantSize: size,
                                                                  mandibularImplantDetails: `${selectedBrandForm.brand_name} - ${selectedPlatformForm?.name ?? ''} - ${size}`
                                                                } : sp))
                                                              }}
                                                              onInclusionsChange={(inclusions) => {
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? { ...sp, mandibularImplantInclusions: inclusions } : sp))
                                                              }}
                                                              onAbutmentDetailChange={(detail) => {
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? { ...sp, mandibularAbutmentDetail: detail } : sp))
                                                              }}
                                                              onAbutmentTypeChange={(type) => {
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? { ...sp, mandibularAbutmentType: type } : sp))
                                                              }}
                                                              onPlatformChange={(platform: any) => {
                                                                setSelectedImplantPlatformPerProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: platform.id } }))
                                                                const platformNameOrId = platform?.name ?? platform?.id
                                                                setSavedProducts(prev => prev.map(sp => sp.id === savedProduct.id ? {
                                                                  ...sp,
                                                                  mandibularImplantBrand: selectedBrandForm.id,
                                                                  mandibularImplantPlatform: platformNameOrId,
                                                                  mandibularImplantDetails: selectedBrandForm?.brand_name && platformNameOrId && (savedSizeForm ?? sp.mandibularImplantSize)
                                                                    ? `${selectedBrandForm.brand_name} - ${platformNameOrId} - ${savedSizeForm ?? sp.mandibularImplantSize ?? ''}`
                                                                    : sp.mandibularImplantDetails
                                                                } : sp))
                                                              }}
                                                              onBrandFieldClick={() => {
                                                                setShowImplantCardsForProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: true } }))
                                                                setClickedFieldTypeInAccordion(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: 'brand' } }))
                                                              }}
                                                              onPlatformFieldClick={() => {
                                                                setShowImplantCardsForProduct(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: true } }))
                                                                setClickedFieldTypeInAccordion(prev => ({ ...prev, [savedProduct.id]: { ...prev[savedProduct.id], mandibular: 'platform' } }))
                                                              }}
                                                              teethNumbers={savedProduct.mandibularTeeth || []}
                                                              arch={archType}
                                                              initialInclusions={savedInclusionsForm}
                                                              initialAbutmentDetail={savedAbutmentDetailForm}
                                                              initialAbutmentType={savedAbutmentTypeForm}
                                                              disableAutoShowPlatformCards
                                                            />
                                                          </div>
                                                        ) : null
                                                      })()}

                                                      {/* Implant Brand/Platform Cards - same as current mandibular card */}
                                                      {(clickedFieldTypeInAccordion[savedProduct.id]?.mandibular === 'brand' || clickedFieldTypeInAccordion[savedProduct.id]?.mandibular === 'platform') && showImplantCardsForProduct[savedProduct.id]?.mandibular && implants && implants.length > 0 && (
                                                        <div className="w-full">
                                                          <div className="flex flex-col items-center w-full">
                                                            <div className="bg-white w-full flex justify-center">
                                                              {(() => {
                                                                // Get brand ID from state, or fallback to savedProduct
                                                                const brandIdFromState = selectedImplantBrandPerProduct[savedProduct.id]?.mandibular
                                                                const brandIdFromSaved = savedProduct.mandibularImplantBrand
                                                                const selectedBrandId = brandIdFromState || brandIdFromSaved

                                                                // Find brand by ID or brand name
                                                                const selectedBrand = selectedBrandId
                                                                  ? implants.find((imp: any) =>
                                                                    imp.id === selectedBrandId ||
                                                                    imp.id === Number(selectedBrandId) ||
                                                                    imp.brand_name === selectedBrandId
                                                                  )
                                                                  : null
                                                                const platforms = selectedBrand?.platforms || []
                                                                const mappedPlatforms = platforms.map((plat: any) => ({
                                                                  id: plat.id || 0,
                                                                  name: plat.name,
                                                                  image: plat.image_url || plat.image
                                                                }))
                                                                const selectedPlatformId = selectedImplantPlatformPerProduct[savedProduct.id]?.mandibular
                                                                const clickedFieldType = clickedFieldTypeInAccordion[savedProduct.id]?.mandibular

                                                                // Only show cards when user explicitly clicked the implant brand or platform field (saved data already shown in form)
                                                                const shouldShowPlatformCards = clickedFieldType === 'platform' && selectedBrandId
                                                                const shouldShowBrandCards = clickedFieldType === 'brand'

                                                                if (shouldShowPlatformCards) {
                                                                  return (
                                                                    <ImplantPlatformCards
                                                                      platforms={mappedPlatforms}
                                                                      selectedPlatformId={selectedPlatformId}
                                                                      onSelectPlatform={(platform: any) => {
                                                                        setSelectedImplantPlatformPerProduct(prev => ({
                                                                          ...prev,
                                                                          [savedProduct.id]: {
                                                                            ...prev[savedProduct.id],
                                                                            mandibular: platform.id
                                                                          }
                                                                        }))
                                                                        // Reset clicked field type and hide cards after selection
                                                                        setClickedFieldTypeInAccordion(prev => ({
                                                                          ...prev,
                                                                          [savedProduct.id]: {
                                                                            ...prev[savedProduct.id],
                                                                            mandibular: null
                                                                          }
                                                                        }))
                                                                        setShowImplantCardsForProduct(prev => ({
                                                                          ...prev,
                                                                          [savedProduct.id]: { ...prev[savedProduct.id], mandibular: false }
                                                                        }))
                                                                        // Persist platform to saved product so it displays and survives re-open
                                                                        const platformNameOrId = platform?.name ?? platform?.id
                                                                        const sizePart = savedProduct.mandibularImplantSize ?? ''
                                                                        setSavedProducts(prev => prev.map(sp => {
                                                                          if (sp.id === savedProduct.id && selectedBrand) {
                                                                            return {
                                                                              ...sp,
                                                                              mandibularImplantPlatform: platformNameOrId,
                                                                              mandibularImplantDetails: selectedBrand.brand_name && platformNameOrId
                                                                                ? `${selectedBrand.brand_name} - ${platformNameOrId}${sizePart ? ` - ${sizePart}` : ''}`
                                                                                : sp.mandibularImplantDetails
                                                                            }
                                                                          }
                                                                          return sp
                                                                        }))
                                                                        // Scroll to the implant detail form after platform selection
                                                                        setTimeout(() => {
                                                                          const formElement = document.querySelector(`[data-implant-field-key="saved_implant_mandibular_${savedProduct.id}"]`)
                                                                          if (formElement) {
                                                                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                                          }
                                                                        }, 100)
                                                                      }}
                                                                      arch="mandibular"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                // Show brand cards only if platform cards are not being shown
                                                                if (shouldShowBrandCards) {
                                                                  const mappedImplants = implants.map((imp: any) => ({
                                                                    id: imp.id,
                                                                    brand_name: imp.brand_name,
                                                                    system_name: imp.system_name,
                                                                    code: imp.code,
                                                                    image_url: imp.image_url,
                                                                    platforms: imp.platforms?.map((p: any) => ({
                                                                      id: p.id || 0,
                                                                      name: p.name,
                                                                      image: p.image_url
                                                                    }))
                                                                  }))

                                                                  return (
                                                                    <ImplantBrandCards
                                                                      implants={mappedImplants}
                                                                      selectedImplantId={selectedBrand?.id || null}
                                                                      onSelectImplant={(implant: any) => {
                                                                        setSelectedImplantBrandPerProduct(prev => ({
                                                                          ...prev,
                                                                          [savedProduct.id]: {
                                                                            ...prev[savedProduct.id],
                                                                            mandibular: implant.id
                                                                          }
                                                                        }))
                                                                        // If brand has platforms, reset platform selection to show platform cards
                                                                        if (implant.platforms && implant.platforms.length > 0) {
                                                                          setSelectedImplantPlatformPerProduct(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: {
                                                                              ...prev[savedProduct.id],
                                                                              mandibular: null
                                                                            }
                                                                          }))
                                                                          // Auto-show platform cards after brand selection
                                                                          setClickedFieldTypeInAccordion(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: {
                                                                              ...prev[savedProduct.id],
                                                                              mandibular: null
                                                                            }
                                                                          }))
                                                                        } else {
                                                                          // Reset clicked field type after selection
                                                                          setClickedFieldTypeInAccordion(prev => ({
                                                                            ...prev,
                                                                            [savedProduct.id]: {
                                                                              ...prev[savedProduct.id],
                                                                              mandibular: null
                                                                            }
                                                                          }))
                                                                        }
                                                                      }}
                                                                      arch="mandibular"
                                                                      showRequired={showValidationErrors}
                                                                    />
                                                                  )
                                                                }

                                                                return null
                                                              })()}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Impression Field - same as current mandibular card */}
                                                      {productDetails?.impressions && Array.isArray(productDetails.impressions) && productDetails.impressions.length > 0 && (() => {
                                                        const impressionCount = savedProduct.mandibularImpressions?.length ? getImpressionCountFromSaved(savedProduct.mandibularImpressions) : getImpressionCount(savedProduct.product.id.toString(), "mandibular", productDetails.impressions)
                                                        const displayText = savedProduct.mandibularImpressions?.length ? getImpressionDisplayTextFromSaved(savedProduct.mandibularImpressions) : (getImpressionDisplayText(savedProduct.product.id.toString(), "mandibular", productDetails.impressions) || "Select impression")
                                                        const hasImpressionValue = impressionCount > 0 || (displayText && displayText !== "Select impression")
                                                        return (
                                                          <div className="flex flex-wrap" style={{ width: '100%', marginTop: '10px' }}>
                                                            <div style={{ flex: '1 1 50%', minWidth: '200px', maxWidth: '50%' }}>
                                                              <div className="relative" style={{ minHeight: '38px', width: '100%' }}>
                                                                <div
                                                                  className="flex items-center cursor-pointer"
                                                                  onClick={() => handleOpenImpressionModal(savedProduct, "mandibular")}
                                                                  style={{
                                                                    padding: '8px 12px 4px 12px',
                                                                    gap: '5px',
                                                                    width: '100%',
                                                                    height: '32px',
                                                                    position: 'relative',
                                                                    marginTop: '5.27px',
                                                                    background: '#FFFFFF',
                                                                    border: `0.740384px solid ${hasImpressionValue ? '#119933' : '#ef4444'}`,
                                                                    borderRadius: '7.7px',
                                                                    boxSizing: 'border-box'
                                                                  }}
                                                                >
                                                                  <span style={{
                                                                    fontFamily: 'Verdana',
                                                                    fontStyle: 'normal',
                                                                    fontWeight: 400,
                                                                    fontSize: '13px',
                                                                    lineHeight: '20px',
                                                                    letterSpacing: '-0.02em',
                                                                    color: '#000000',
                                                                    whiteSpace: 'nowrap',
                                                                    paddingRight: hasImpressionValue ? '30px' : '0px'
                                                                  }}>{displayText}</span>
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
                                                                    color: hasImpressionValue ? '#119933' : '#ef4444'
                                                                  }}
                                                                >
                                                                  Impression<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                                </label>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      })()}

                                                      {/* Action Buttons - same as current mandibular card */}
                                                      {productDetails && (
                                                        <div
                                                          className="flex flex-wrap justify-center items-center w-full"
                                                          style={{
                                                            gap: '16px',
                                                            position: 'relative',
                                                            marginTop: '10px'
                                                          }}
                                                        >
                                                          {savedProducts.filter(p => p.addedFrom === "mandibular").length > 1 && (
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
                                                            onClick={(e) => {
                                                              e.stopPropagation()
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
                                                            onClick={(e) => {
                                                              e.stopPropagation()
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
                                                            onClick={(e) => {
                                                              e.stopPropagation()
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
                                                    </>
                                                  )}
                                                </div>
                                              </AccordionContent>
                                            </Card>
                                          </AccordionItem>
                                        )
                                      })}
                                  </>
                                )}
                            </MandibularSection>
                          )}
                        </div>
                      </>
                    )}

                  </div>

                  {/* Summary Accordion - Show in categories, subcategories and products steps, hide when product details are shown */}
                  {selectedCategory && !showProductDetails && (
                    <div className="w-full flex justify-center mt-auto mb-4">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '0px 102px',
                          gap: '10px',
                          isolation: 'isolate',
                          width: '724.59px',
                        }}
                      >
                        {/* Summary Accordion */}
                        <div
                          style={{
                            width: '724.59px',
                            flex: 'none',
                            order: 0,
                            flexGrow: 0,
                            zIndex: 0,
                            position: 'relative'
                          }}
                        >
                          {/* Rectangle 412 */}
                          <div
                            style={{
                              position: 'relative',
                              width: '720px',
                              background: '#FFFFFF',
                              boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                              borderRadius: '5.4px'
                            }}
                          >
                            {/* Header */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '14px 8px',
                                gap: '10px',
                                width: '100%',
                                height: '69.92px',
                                background: '#DFEEFB',
                                boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                borderRadius: '5.4px 5.4px 0px 0px'
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex gap-2 items-center">
                                  <div className="bg-[#f9f9f9] px-4 py-2 rounded-[10px] shadow-sm h-[29px] flex items-center">
                                    <p className="text-[17px] text-black">{selectedCategory}</p>
                                  </div>
                                  {selectedSubcategory && (
                                    <div className="bg-[#f9f9f9] px-4 py-2 rounded-[10px] shadow-sm h-[29px] flex items-center">
                                      <p className="text-[17px] text-black">{selectedSubcategory}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center justify-center w-[22px] h-[22px]">
                                  <ChevronRight className="h-5 w-5 text-gray-600 rotate-90" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Saved Products Section */}
                  {savedProducts.length > 0 && !selectedCategory && !showProductDetails && (
                    <div className="w-full flex mt-4 mb-8">
                      <div className="w-full">
                        {/* Two Column Layout for Saved Products */}
                        <div className="w-full flex gap-4 items-start">
                          {/* Maxillary Products - Left Column */}
                          <div className="flex-1 flex flex-col">
                            <div className="space-y-1 flex flex-col items-center">
                              {savedProducts.filter(p => p.addedFrom === "maxillary").length > 0 ? (
                                savedProducts
                                  .filter(p => p.addedFrom === "maxillary")
                                  .map((savedProduct) => {
                                    const hasAddons = (savedProduct.maxillaryAddOnsStructured && savedProduct.maxillaryAddOnsStructured.length > 0) ||
                                      (savedProduct.maxillaryAddOns && savedProduct.maxillaryAddOns.length > 0)
                                    let addonsText = ""
                                    if (savedProduct.maxillaryAddOnsStructured && savedProduct.maxillaryAddOnsStructured.length > 0) {
                                      addonsText = savedProduct.maxillaryAddOnsStructured
                                        .map(addon => {
                                          const qty = addon.qty || addon.quantity || 1
                                          const name = addon.name || `Add-on ${addon.addon_id}`
                                          return `${qty}x ${name}`
                                        })
                                        .join(", ")
                                    } else if (savedProduct.maxillaryAddOns && savedProduct.maxillaryAddOns.length > 0) {
                                      addonsText = savedProduct.maxillaryAddOns.join(", ")
                                    }

                                    return (
                                      <DynamicProductFields
                                        key={savedProduct.id}
                                        productDetails={savedProduct.productDetails}
                                        savedProduct={savedProduct}
                                        arch="maxillary"
                                        fieldConfigs={fieldConfigs}
                                        mode="saved"
                                        disableAutoOpen={true}
                                        layout="accordion-compact"
                                        lockedFields={["material"]}
                                        productId={savedProduct.id}
                                        product={savedProduct.product}
                                        category={savedProduct.category}
                                        subcategory={savedProduct.subcategory}
                                        rushData={savedProduct.rushData}
                                        isAccordionOpen={String(openAccordionMaxillary) === String(savedProduct.id)}
                                        onAccordionChange={handleAccordionChangeMaxillary}
                                        onDeleteProduct={handleDeleteProduct}
                                        onCardClick={handleSavedProductCardClick}
                                        showNotes={hasAddons}
                                        notes={addonsText}
                                        showActionButtons={showAdvanceFields[savedProduct.id]}
                                        onAddOnsClick={() => {
                                          setCurrentProductForModal(savedProduct)
                                          setCurrentArchForModal("maxillary")
                                          setShowAddOnsModal(true)
                                        }}
                                        onAttachFilesClick={() => {
                                          setCurrentProductForModal(savedProduct)
                                          setShowAttachModal(true)
                                        }}
                                        onRushClick={() => {
                                          setCurrentProductForModal(savedProduct)
                                          setShowRushModal(true)
                                        }}
                                        getTotalAddOnsCount={typeof getTotalAddOnsCount === "function" ? getTotalAddOnsCount : () => getTotalAddOnsCount}
                                        getAttachedFilesCount={getAttachedFilesCount}
                                        fieldVisibilityOverride={(fieldKey, arch) => {
                                          const fieldNameMap: Record<string, "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details"> = {
                                            "stump_shade": "stump_shade",
                                            "tooth_shade": "tooth_shade",
                                            "stage": "stage"
                                          }
                                          const mappedName = fieldNameMap[fieldKey]
                                          if (mappedName) {
                                            return isAccordionFieldVisible(mappedName, savedProduct, arch)
                                          }
                                          if (fieldKey === "material") return true
                                          if (fieldKey === "retention") {
                                            const teeth = savedProduct.maxillaryTeeth || []
                                            const retentionTypes = maxillaryRetentionTypes
                                            const hasSelection = teeth.some(toothNumber => {
                                              const types = retentionTypes[toothNumber] || []
                                              return types.length > 0 && (types.includes('Implant') || types.includes('Prep') || types.includes('Pontic'))
                                            })
                                            return hasSelection || teeth.length > 0
                                          }
                                          return undefined
                                        }}
                                        onFieldChange={(fieldKey, value, id) =>
                                          handleFieldChange(fieldKey, value, id, savedProduct.id, "maxillary")
                                        }
                                        maxillaryRetentionTypes={maxillaryRetentionTypes}
                                        mandibularRetentionTypes={mandibularRetentionTypes}
                                        maxillaryTeeth={savedProduct.maxillaryTeeth}
                                        mandibularTeeth={savedProduct.mandibularTeeth}
                                        onOpenShadeModal={(fieldKey) => {
                                          setCurrentShadeField(fieldKey as "tooth_shade" | "stump_shade")
                                          setCurrentShadeArch("maxillary")
                                          setShowShadeModal(true)
                                        }}
                                        hideImpression={true}
                                      />
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
                                    const hasAddons = (savedProduct.mandibularAddOnsStructured && savedProduct.mandibularAddOnsStructured.length > 0) ||
                                      (savedProduct.mandibularAddOns && savedProduct.mandibularAddOns.length > 0)
                                    let addonsText = ""
                                    if (savedProduct.mandibularAddOnsStructured && savedProduct.mandibularAddOnsStructured.length > 0) {
                                      addonsText = savedProduct.mandibularAddOnsStructured
                                        .map(addon => {
                                          const qty = addon.qty || addon.quantity || 1
                                          const name = addon.name || `Add-on ${addon.addon_id}`
                                          return `${qty}x ${name}`
                                        })
                                        .join(", ")
                                    } else if (savedProduct.mandibularAddOns && savedProduct.mandibularAddOns.length > 0) {
                                      addonsText = savedProduct.mandibularAddOns.join(", ")
                                    }

                                    return (
                                      <DynamicProductFields
                                        key={savedProduct.id}
                                        productDetails={savedProduct.productDetails}
                                        savedProduct={savedProduct}
                                        arch="mandibular"
                                        fieldConfigs={fieldConfigs}
                                        mode="saved"
                                        disableAutoOpen={true}
                                        layout="accordion-compact"
                                        lockedFields={["material"]}
                                        productId={savedProduct.id}
                                        product={savedProduct.product}
                                        category={savedProduct.category}
                                        subcategory={savedProduct.subcategory}
                                        rushData={savedProduct.rushData}
                                        isAccordionOpen={openAccordionMandibular != null && String(openAccordionMandibular) === String(savedProduct.id)}
                                        onAccordionChange={handleAccordionChangeMandibular}
                                        onDeleteProduct={handleDeleteProduct}
                                        onCardClick={handleSavedProductCardClick}
                                        showNotes={hasAddons}
                                        notes={addonsText}
                                        showActionButtons={showAdvanceFields[savedProduct.id]}
                                        onAddOnsClick={() => {
                                          setCurrentProductForModal(savedProduct)
                                          setCurrentArchForModal("mandibular")
                                          setShowAddOnsModal(true)
                                        }}
                                        onAttachFilesClick={() => {
                                          setCurrentProductForModal(savedProduct)
                                          setShowAttachModal(true)
                                        }}
                                        onRushClick={() => {
                                          setCurrentProductForModal(savedProduct)
                                          setShowRushModal(true)
                                        }}
                                        getTotalAddOnsCount={typeof getTotalAddOnsCount === "function" ? getTotalAddOnsCount : () => getTotalAddOnsCount}
                                        getAttachedFilesCount={getAttachedFilesCount}
                                        fieldVisibilityOverride={(fieldKey, arch) => {
                                          const fieldNameMap: Record<string, "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details"> = {
                                            "stump_shade": "stump_shade",
                                            "tooth_shade": "tooth_shade",
                                            "stage": "stage"
                                          }
                                          const mappedName = fieldNameMap[fieldKey]
                                          if (mappedName) {
                                            return isAccordionFieldVisible(mappedName, savedProduct, arch)
                                          }
                                          if (fieldKey === "material") return true
                                          if (fieldKey === "retention") {
                                            const teeth = savedProduct.mandibularTeeth || []
                                            const retentionTypes = mandibularRetentionTypes
                                            const hasSelection = teeth.some(toothNumber => {
                                              const types = retentionTypes[toothNumber] || []
                                              return types.length > 0 && (types.includes('Implant') || types.includes('Prep') || types.includes('Pontic'))
                                            })
                                            return hasSelection || teeth.length > 0
                                          }
                                          return undefined
                                        }}
                                        onFieldChange={(fieldKey, value, id) =>
                                          handleFieldChange(fieldKey, value, id, savedProduct.id, "mandibular")
                                        }
                                        maxillaryRetentionTypes={maxillaryRetentionTypes}
                                        mandibularRetentionTypes={mandibularRetentionTypes}
                                        maxillaryTeeth={savedProduct.maxillaryTeeth}
                                        mandibularTeeth={savedProduct.mandibularTeeth}
                                        onOpenShadeModal={(fieldKey) => {
                                          setCurrentShadeField(fieldKey as "tooth_shade" | "stump_shade")
                                          setCurrentShadeArch("mandibular")
                                          setShowShadeModal(true)
                                        }}
                                        hideImpression={true}
                                      />
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
                  )}
                </SavedProductSectionProvider>
              )}

            </div>
          </div>

          {/* Case Summary Notes - sits just above footer, sticky */}
          <div style={{ position: 'sticky', bottom: '50px', zIndex: 9998, width: '100%' }}>
            <CaseSummaryNotesSection
              showCaseSummaryNotes={showCaseSummaryNotes}
              isCaseSummaryExpanded={isCaseSummaryExpanded}
              setIsCaseSummaryExpanded={setIsCaseSummaryExpanded}
              getCaseSummaryMaxillaryContent={getCaseSummaryMaxillaryContent}
              getCaseSummaryMandibularContent={getCaseSummaryMandibularContent}
              setCaseSummaryFromParts={setCaseSummaryFromParts}
              maxillaryImplantDetails={maxillaryImplantDetails}
              previousNotesRef={previousNotesRef}
              parseCaseNotes={parseCaseNotes}
              savedProducts={savedProducts}
              generateCaseNotes={generateCaseNotes}
            />
          </div>

          {/* Footer - Outside scrollable container, always visible */}
          <FooterSection
            showProductDetails={showProductDetails}
            isSubmitting={isSubmitting}
            confirmDetailsChecked={confirmDetailsChecked}
            showSubmitPopover={showSubmitPopover}
            isAccordionComplete={hasAtLeastOneCompleteProduct}
            onCancel={() => {
              // Navigate back to patient-input page
              router.push("/patient-input")
            }}
            onPreview={handlePreview}
            onShowCancelModal={() => setShowCancelModal(true)}
            onSubmit={handleSubmit}
            onConfirmDetailsChange={(checked) => setConfirmDetailsChecked(checked)}
            onShowSubmitPopoverChange={(show) => setShowSubmitPopover(show)}
            hasProductAccordions={
              (showMaxillaryChart && maxillaryTeeth.length > 0) ||
              (showMandibularChart && mandibularTeeth.length > 0) ||
              savedProducts.length > 0
            }
          />

          {/* Modals */}
          {/* Add Ons Modal */}
          {currentProductForModal && currentArchForModal && currentProductForModal.product && (
            <AddOnsModal
              isOpen={showAddOnsModal}
              onClose={() => {
                console.log("🚪 Closing Add Ons Modal")
                setShowAddOnsModal(false)
                setCurrentProductForModal(null)
                setCurrentArchForModal(null)
              }}
              onAddAddOns={(addOns) => {
                // Handle addons addition - save the full product configuration with add-ons
                // This ensures all product fields (material, retention, shades, stage, impressions, etc.) are preserved
                setSavedProducts((prev) =>
                  prev.map((product) => {
                    if (product.id !== currentProductForModal.id) {
                      return product
                    }

                    // Get current product details for impressions
                    const productDetails = product.productDetails || currentProductForModal.productDetails
                    const impressions = productDetails?.impressions || []

                    // Get latest impression selections for this product
                    const maxillaryImpressions = getImpressionSelections(product.id, "maxillary", impressions)
                    const mandibularImpressions = getImpressionSelections(product.id, "mandibular", impressions)

                    // Save the complete product configuration with all fields preserved
                    // The product already contains all its configuration from the accordion
                    // We just need to add the new add-ons and ensure impressions are up to date
                    const updatedProduct: SavedProduct = {
                      ...product, // Preserve all existing configuration (material, retention, shades, stage, etc.)
                      // Update impressions if we have new selections
                      ...(maxillaryImpressions.length > 0 && { maxillaryImpressions }),
                      ...(mandibularImpressions.length > 0 && { mandibularImpressions }),
                      // Add the new add-ons
                      ...(currentArchForModal === "maxillary"
                        ? { maxillaryAddOnsStructured: addOns }
                        : { mandibularAddOnsStructured: addOns }),
                    }

                    return updatedProduct
                  })
                )
                toast({
                  title: "Add-ons Added",
                  description: `${addOns.length} add-on(s) have been added to the ${currentArchForModal} product. Product configuration saved.`,
                })
                setShowAddOnsModal(false)
                setCurrentProductForModal(null)
                setCurrentArchForModal(null)
              }}
              labId={selectedLab?.id || 0}
              productId={String(currentProductForModal.product.id)}
              arch={currentArchForModal}
            />
          )}

          {/* File Attachment Modal */}
          <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
              <FileAttachmentModalContent
                setShowAttachModal={setShowAttachModal}
                isCaseSubmitted={isSubmitting}
                doctorName={selectedDoctor ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}` : undefined}
                patientName={patientData?.name}
                savedProducts={savedProducts}
              />
            </DialogContent>
          </Dialog>

          {/* Rush Request Modal */}
          {currentProductForModal && (
            <RushRequestModal
              isOpen={showRushModal}
              onClose={() => {
                setShowRushModal(false)
                setCurrentProductForModal(null)
              }}
              onConfirm={(rushData) => {
                // Handle rush request confirmation - update the saved product
                setSavedProducts((prev) =>
                  prev.map((product) =>
                    product.id === currentProductForModal.id
                      ? {
                        ...product,
                        rushData: {
                          targetDate: rushData.targetDate || "",
                          daysSaved: rushData.daysSaved,
                          rushPercentage: rushData.rushPercentage,
                          rushFee: rushData.rushFee,
                          totalPrice: rushData.totalPrice,
                        },
                      }
                      : product
                  )
                )
                toast({
                  title: "Rush Request Added",
                  description: "Rush request has been added to the product",
                })
                setShowRushModal(false)
                setCurrentProductForModal(null)
              }}
              product={{
                name: currentProductForModal.product.name || "Product",
                stage: currentProductForModal.maxillaryStage || currentProductForModal.mandibularStage || "Not specified",
                deliveryDate: new Date().toISOString(), // You may want to get this from saved product data
                price: currentProductForModal.product.price || 0,
              }}
            />
          )}

          {/* Cancel Slip Creation Modal */}
          <CancelSlipCreationModal
            open={showCancelModal}
            onCancel={() => setShowCancelModal(false)}
            onConfirm={() => {
              setShowCancelModal(false)
              clearSlipCreationStorage()
              router.push("/dashboard")
            }}
          />

          {/* Refresh Warning Modal */}
          {showRefreshWarningModal && (
            <Dialog open={showRefreshWarningModal} onOpenChange={(open) => {
              if (!open) setShowRefreshWarningModal(false)
            }}>
              <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
              <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ zIndex: 100001 }}>
                <DialogHeader className="text-center">
                  <DialogTitle className="text-2xl font-bold text-gray-900">Refresh Page?</DialogTitle>
                  <DialogDescription className="text-black-500 mt-2">
                    Are you sure you want to refresh the page? All unsaved changes will be lost. Your work is saved in the browser, but refreshing will reset your current session.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowRefreshWarningModal(false)}
                    className="px-6 py-2 rounded-lg bg-transparent"
                  >
                    Stay on Page
                  </Button>
                  <Button
                    onClick={() => {
                      // Allow navigation and refresh
                      allowNavigationRef.current = true
                      setShowRefreshWarningModal(false)
                      // Trigger page refresh
                      window.location.reload()
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                  >
                    Yes, Refresh
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Print Preview Modal */}
          <PrintPreviewModal
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            caseData={getPreviewCaseData()}
          />

          {/* Impression Selection Modal */}
          {currentProductForImpression && (currentProductForImpression.productDetails || productDetails) && (
            <ImpressionSelectionModal
              isOpen={showImpressionModal}
              onClose={() => {
                // Use catalog product.id so impression keys match getImpressionCount (saved accordion uses product.id)
                const productId = currentProductForImpression?.product?.id?.toString() || selectedProduct?.id?.toString() || ""
                const impressions = currentProductForImpression?.productDetails?.impressions || productDetails?.impressions || []
                const impressionCount = productId && impressions.length
                  ? getImpressionCount(productId, currentImpressionArch, impressions)
                  : 0
                setShowImpressionModal(false)
                setCurrentProductForImpression(null)
                // Set flag to prevent duplicate auto-save from other effects
                impressionModalJustClosedRef.current = true
                setTimeout(() => {
                  impressionModalJustClosedRef.current = false
                }, 1000)
                // Auto-save when user completed impression (has value) - debounced to coalesce with effect-triggered saves
                if (impressionCount > 0) {
                  debouncedAutoSaveProduct(currentImpressionArch)
                }
              }}
              onSTLFilesAttached={(files, impressionKey) => {
                // Store STL files for this impression
                // Convert STLFile[] to the format expected by stlFilesByImpression
                const convertedFiles = files.map(f => ({
                  file: f.file,
                  url: f.url,
                  type: "stl" as const,
                  description: f.description
                }))
                setStlFilesByImpression((prev) => ({
                  ...prev,
                  [impressionKey]: convertedFiles
                }))
              }}
              impressions={currentProductForImpression?.productDetails?.impressions || productDetails?.impressions || []}
              selectedImpressions={selectedImpressions}
              onUpdateQuantity={handleImpressionQuantityUpdate}
              onRemoveImpression={(impressionKey) => {
                setSelectedImpressions((prev) => {
                  const updated = { ...prev }
                  delete updated[impressionKey]
                  return updated
                })
                // Also remove STL files for this impression
                setStlFilesByImpression((prev) => {
                  const updated = { ...prev }
                  delete updated[impressionKey]
                  return updated
                })
              }}
              productId={currentProductForImpression?.product?.id?.toString() || selectedProduct?.id?.toString() || ""}
              arch={currentImpressionArch}
              stlFilesByImpression={Object.fromEntries(
                Object.entries(stlFilesByImpression).map(([key, files]) => [
                  key,
                  files
                    .filter(f => f.type === "stl")
                    .map(f => ({
                      file: f.file,
                      url: f.url,
                      description: (f as any).description || ""
                    }))
                ])
              )}
            />
          )}

          {/* Tooth Shade Selection Modal */}
          {currentShadeField && (
            <ToothShadeSelectionModal
              isOpen={showShadeModal}
              onClose={() => {
                setShowShadeModal(false)
                setCurrentShadeField(null)
                setCurrentShadeProductId(null)
              }}
              shades={
                productDetails
                  ? (currentShadeField === "tooth_shade"
                    ? (productDetails.teeth_shades || [])
                    : (productDetails.gum_shades || []))
                  : []
              }
              selectedShadeId={
                currentShadeArch === "maxillary"
                  ? (currentShadeField === "tooth_shade"
                    ? maxillaryShadeId
                    : maxillaryGumShadeId)
                  : (currentShadeField === "tooth_shade"
                    ? mandibularShadeId
                    : mandibularGumShadeId)
              }
              onSelectShade={handleShadeSelect}
              fieldType={currentShadeField}
              title={
                currentShadeField === "tooth_shade"
                  ? "Select Tooth Shade"
                  : "Select Stump Shade"
              }
              productId={selectedProduct?.id}
              arch={currentShadeArch}
            />
          )}

          {/* Arch Selection Popover for Removable Restoration + Complete Denture */}
          {showArchSelectionPopover && archSelectionPopoverAnchor && (
            <>
              {/* Backdrop to close popover on outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setShowArchSelectionPopover(false)
                  setPendingProductForArchSelection(null)
                  setArchSelectionPopoverAnchor(null)
                }}
              />
              {/* Popover Content */}
              <div
                className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                style={{
                  left: `${archSelectionPopoverAnchor.x}px`,
                  top: `${archSelectionPopoverAnchor.y}px`,
                  transform: 'translateX(-50%)',
                  minWidth: '180px'
                }}
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => handleArchSelection("maxillary")}
                    className="px-4 py-3 text-sm text-black hover:bg-[rgba(17,98,168,0.1)] transition-colors text-center border-b border-gray-200"
                  >
                    Upper arch only
                  </button>
                  <button
                    onClick={() => handleArchSelection("both")}
                    className="px-4 py-3 text-sm text-black hover:bg-[rgba(17,98,168,0.1)] transition-colors text-center border-b border-gray-200"
                  >
                    Both arches
                  </button>
                  <button
                    onClick={() => handleArchSelection("mandibular")}
                    className="px-4 py-3 text-sm text-black hover:bg-[rgba(17,98,168,0.1)] transition-colors text-center"
                  >
                    Lower arch only
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      <LoadingOverlay
        isLoading={isLoadingProductDetails}
        title="Loading product"
        message="Please wait while we load the product details..."
      />
    </CaseDesignCenterProvider>
  );

  return pageContent;
}
