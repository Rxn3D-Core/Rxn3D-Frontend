"use client"

import React, { RefObject } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { SavedProductPills } from "./saved-product-pills"
import { SavedProductSectionContent } from "./saved-product-section-content"
import { MissingTeethCards } from "@/components/missing-teeth-cards"
import { ImplantPartsPopover } from "@/components/implant-parts-popover"
import { useCaseDesignCenterContext } from "../context/case-design-center-context"

const MaxillaryTeethSVG = dynamic(
  () => import("@/components/maxillary-teeth-svg").then((mod) => ({ default: mod.MaxillaryTeethSVG })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)

export interface MaxillarySectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  children?: React.ReactNode
}

/**
 * Maxillary (upper arch) section: label, pills, teeth SVG, MissingTeethCards, and saved product accordion.
 * Uses CaseDesignCenter context for state and handlers.
 */
export function MaxillarySection({ sectionRef, children }: MaxillarySectionProps) {
  const ctx = useCaseDesignCenterContext()
  const showMaxillaryChart = ctx.showMaxillaryChart ?? false
  const savedProducts = ctx.savedProductSectionContextValue?.savedProducts ?? []
  const openAccordionMaxillary = ctx.savedProductSectionContextValue?.openAccordionMaxillary ?? null
  const setOpenAccordionMaxillary = ctx.savedProductSectionContextValue?.handleAccordionChangeMaxillary
    ? (id: string) => ctx.savedProductSectionContextValue?.handleAccordionChangeMaxillary?.(id)
    : undefined
  const maxillaryTeeth = ctx.maxillaryTeeth ?? []
  const handleMaxillaryToothToggle = ctx.handleMaxillaryToothToggle
  const maxillaryRetentionTypes = ctx.maxillaryRetentionTypes ?? {}
  const retentionPopoverState = ctx.retentionPopoverState ?? { arch: null, toothNumber: null }
  const setRetentionPopoverState = ctx.setRetentionPopoverState
  const handleSelectRetentionType = ctx.handleSelectRetentionType
  const handleMaxillaryToothDeselect = ctx.handleMaxillaryToothDeselect
  const shouldShowImplantPopover = ctx.shouldShowImplantPopover ?? false
  const implantPopoverState = ctx.implantPopoverState ?? { arch: null, toothNumber: null }
  const setImplantPopoverState = ctx.setImplantPopoverState
  const selectedProductForMaxillary = ctx.selectedProductForMaxillary ?? null
  const missingTeethCardClicked = ctx.missingTeethCardClicked ?? false
  const productDetails = ctx.productDetails ?? null
  const isOrthodonticsOrRemovable = ctx.isOrthodonticsOrRemovable ?? false
  const handleMissingTeethCardClick = ctx.handleMissingTeethCardClick
  const setMaxillaryTeeth = ctx.setMaxillaryTeeth
  const setOpenAccordionMaxillaryState = ctx.setOpenAccordionMaxillary

  if (!showMaxillaryChart) return null

  const showAccordion =
    (maxillaryTeeth.length > 0 &&
      selectedProductForMaxillary &&
      !savedProducts.some((sp: any) => {
        if (sp.addedFrom !== "maxillary") return false
        const savedTeeth = (sp.maxillaryTeeth || []).map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
        const currentTeeth = maxillaryTeeth.map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
        const sameTeeth = savedTeeth.length === currentTeeth.length && savedTeeth.every((t: number, i: number) => t === currentTeeth[i])
        const sameProduct = String(sp.product?.id ?? "") === String(selectedProductForMaxillary?.id ?? "")
        return sameTeeth && sameProduct
      })) ||
    savedProducts.filter((p: any) => p.addedFrom === "maxillary").length > 0

  return (
    <div
      ref={sectionRef}
      className="flex flex-col w-full lg:flex-1"
      style={{
        flex: "1 1 100%",
        background: "#FDFDFD",
        minHeight: "auto",
      }}
      role="region"
      aria-label="Maxillary section"
    >
      <div
        className="flex items-center justify-between px-2 md:px-4"
        style={{ padding: "8px 0px", marginBottom: "5px" }}
      >
        <p
          style={{
            fontFamily: "Verdana",
            fontStyle: "normal",
            fontWeight: 700,
            fontSize: "16px",
            lineHeight: "20px",
            letterSpacing: "-0.02em",
            color: "#000000",
          }}
        >
          MAXILLARY
        </p>
        {/* Add Product Button */}
        {children && (
          <div>
            {children}
          </div>
        )}
      </div>

      <SavedProductPills
        products={savedProducts.filter((p: any) => p.addedFrom === "maxillary")}
        openId={openAccordionMaxillary ?? undefined}
        onPillClick={(id) => setOpenAccordionMaxillaryState?.(id ?? null) ?? setOpenAccordionMaxillary?.(id)}
        getLabel={(p: any) => p.subcategory || p.product?.name ?? ""}
      />

      <div
        className="flex items-center justify-center relative w-full px-2 md:px-4"
        style={{ width: "100%", padding: "0" }}
      >
        {shouldShowImplantPopover && implantPopoverState.arch === "maxillary" && implantPopoverState.toothNumber !== null && (
          <ImplantPartsPopover
            onImplantPartsIncluded={() => setImplantPopoverState?.({ arch: null, toothNumber: null })}
            onEnterManually={() => setImplantPopoverState?.({ arch: null, toothNumber: null })}
          />
        )}
        {showMaxillaryChart && (
          <MaxillaryTeethSVG
            key={`maxillary-${maxillaryTeeth.join("-")}`}
            selectedTeeth={maxillaryTeeth}
            onToothClick={handleMaxillaryToothToggle}
            className="max-w-full"
            retentionTypesByTooth={maxillaryRetentionTypes}
            showRetentionPopover={retentionPopoverState.arch === "maxillary"}
            retentionPopoverTooth={retentionPopoverState.toothNumber}
            onSelectRetentionType={(tooth, type) => handleSelectRetentionType?.("maxillary", tooth, type)}
            onClosePopover={() => setRetentionPopoverState?.({ arch: null, toothNumber: null })}
            onDeselectTooth={handleMaxillaryToothDeselect}
          />
        )}
      </div>

      {showMaxillaryChart &&
        selectedProductForMaxillary &&
        !missingTeethCardClicked &&
        productDetails &&
        isOrthodonticsOrRemovable &&
        (() => {
          const hasExtractionData =
            (productDetails.extractions && Array.isArray(productDetails.extractions) && productDetails.extractions.length > 0) ||
            (productDetails.data?.extractions && Array.isArray(productDetails.data.extractions) && productDetails.data.extractions.length > 0)
          return hasExtractionData ? (
            <div className="w-full">
              <MissingTeethCards
                type="maxillary"
                selectedTeeth={maxillaryTeeth}
                missingTeeth={[]}
                extractedTeeth={[]}
                willExtractTeeth={[]}
                onAllTeethMissing={() => {}}
                onTeethInMouthClick={handleMissingTeethCardClick}
                onMissingTeethClick={handleMissingTeethCardClick}
                onWillExtractClick={handleMissingTeethCardClick}
                isCaseSubmitted={false}
                showTeethInMouth={true}
                showMissingTeeth={true}
                showWillExtract={true}
                productDetails={productDetails}
                extractionData={productDetails.extractions || productDetails.data?.extractions}
                productId={selectedProductForMaxillary?.id?.toString()}
                selectedProduct={selectedProductForMaxillary.name}
                onExtractionTypeSelect={(extractionType) => {
                  if (extractionType) handleMissingTeethCardClick?.()
                }}
                onTeethSelectionChange={(teeth) => {
                  setMaxillaryTeeth?.(teeth as number[])
                  if (selectedProductForMaxillary && (teeth as number[]).length > 0) {
                    setTimeout(() => {
                      const savedTeeth = (teeth as number[]).map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
                      const matchingProduct = savedProducts.find((sp: any) => {
                        if (sp.addedFrom !== "maxillary") return false
                        const sameProduct = String(sp.product?.id ?? "") === String(selectedProductForMaxillary?.id ?? "")
                        const currentSaved = (sp.maxillaryTeeth || []).map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
                        const sameTeeth = currentSaved.length === savedTeeth.length && currentSaved.every((t: number, i: number) => t === savedTeeth[i])
                        return sameProduct && sameTeeth
                      })
                      if (matchingProduct) setOpenAccordionMaxillaryState?.(matchingProduct.id)
                    }, 100)
                  }
                }}
              />
            </div>
          ) : null
        })()}

      {showMaxillaryChart && showAccordion && (
        <SavedProductSectionContent arch="maxillary">
          {children}
        </SavedProductSectionContent>
      )}
    </div>
  )
}
