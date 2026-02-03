"use client"

import React, { RefObject } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { SavedProductPills } from "./saved-product-pills"
import { SavedProductSectionContent } from "./saved-product-section-content"
import { MissingTeethCards } from "@/components/missing-teeth-cards"
import { ImplantPartsPopover } from "@/components/implant-parts-popover"
import { useCaseDesignCenterContext } from "../context/case-design-center-context"

const MandibularTeethSVG = dynamic(
  () => import("@/components/mandibular-teeth-svg").then((mod) => ({ default: mod.MandibularTeethSVG })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)

export interface MandibularSectionProps {
  sectionRef: RefObject<HTMLDivElement | null>
  children?: React.ReactNode
}

/**
 * Mandibular (lower arch) section: label, pills, teeth SVG, MissingTeethCards, and saved product accordion.
 * Uses CaseDesignCenter context for state and handlers.
 */
export function MandibularSection({ sectionRef, children }: MandibularSectionProps) {
  const ctx = useCaseDesignCenterContext()
  const showMandibularChart = ctx.showMandibularChart ?? false
  const savedProducts = ctx.savedProductSectionContextValue?.savedProducts ?? []
  const openAccordionMandibular = ctx.savedProductSectionContextValue?.openAccordionMandibular ?? null
  const setOpenAccordionMandibular = ctx.savedProductSectionContextValue?.handleAccordionChangeMandibular
    ? (id: string) => ctx.savedProductSectionContextValue?.handleAccordionChangeMandibular?.(id)
    : undefined
  const mandibularTeeth = ctx.mandibularTeeth ?? []
  const handleMandibularToothToggle = ctx.handleMandibularToothToggle
  const mandibularRetentionTypes = ctx.mandibularRetentionTypes ?? {}
  const retentionPopoverState = ctx.retentionPopoverState ?? { arch: null, toothNumber: null }
  const setRetentionPopoverState = ctx.setRetentionPopoverState
  const handleSelectRetentionType = ctx.handleSelectRetentionType
  const handleMandibularToothDeselect = ctx.handleMandibularToothDeselect
  const shouldShowImplantPopover = ctx.shouldShowImplantPopover ?? false
  const implantPopoverState = ctx.implantPopoverState ?? { arch: null, toothNumber: null }
  const setImplantPopoverState = ctx.setImplantPopoverState
  const selectedProductForMandibular = ctx.selectedProductForMandibular ?? null
  const missingTeethCardClicked = ctx.missingTeethCardClicked ?? false
  const productDetails = ctx.productDetails ?? null
  const isOrthodonticsOrRemovable = ctx.isOrthodonticsOrRemovable ?? false
  const handleMissingTeethCardClick = ctx.handleMissingTeethCardClick
  const setMandibularTeeth = ctx.setMandibularTeeth
  const setOpenAccordionMandibularState = ctx.setOpenAccordionMandibular

  if (!showMandibularChart) return null

  const showAccordion =
    (mandibularTeeth.length > 0 &&
      selectedProductForMandibular &&
      !savedProducts.some((sp: any) => {
        if (sp.addedFrom !== "mandibular") return false
        const savedTeeth = (sp.mandibularTeeth || []).map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
        const currentTeeth = mandibularTeeth.map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
        const sameTeeth = savedTeeth.length === currentTeeth.length && savedTeeth.every((t: number, i: number) => t === currentTeeth[i])
        const sameProduct = String(sp.product?.id ?? "") === String(selectedProductForMandibular?.id ?? "")
        return sameTeeth && sameProduct
      })) ||
    savedProducts.filter((p: any) => p.addedFrom === "mandibular").length > 0

  return (
    <div
      ref={sectionRef as React.RefObject<HTMLDivElement>}
      className="flex flex-col w-full lg:flex-1"
      style={{
        flex: "1 1 49%",
        background: "#FFFFFF",
      }}
      role="region"
      aria-label="Mandibular section"
    >
      <SavedProductPills
        products={savedProducts.filter((p: any) => p.addedFrom === "mandibular")}
        openId={openAccordionMandibular != null ? String(openAccordionMandibular) : null}
        onPillClick={(id) => {
          if (id == null) {
            setOpenAccordionMandibularState?.(null)
            setOpenAccordionMandibular?.(null)
          } else {
            const idStr = String(id)
            setOpenAccordionMandibularState?.(idStr)
            setOpenAccordionMandibular?.(idStr)
          }
        }}
        getLabel={(p: any) => (p.subcategory || p.product?.name) ?? ""}
      />

      <div
        className="flex items-center justify-center px-2 md:px-4"
        style={{ padding: "8px 0px", marginBottom: "10px" }}
      >
        <p
          style={{
            fontFamily: "Verdana",
            fontStyle: "normal",
            fontWeight: 700,
            fontSize: "16px",
            lineHeight: "18px",
            letterSpacing: "-0.02em",
            color: "#000000",
          }}
        >
          MANDIBULAR
        </p>
      </div>

      <div
        className="flex items-center justify-center relative w-full px-2 md:px-4"
        style={{ width: "100%", padding: "0" }}
      >
        {shouldShowImplantPopover && implantPopoverState.arch === "mandibular" && implantPopoverState.toothNumber !== null && (
          <ImplantPartsPopover
            onImplantPartsIncluded={() => setImplantPopoverState?.({ arch: null, toothNumber: null })}
            onEnterManually={() => setImplantPopoverState?.({ arch: null, toothNumber: null })}
          />
        )}
        {showMandibularChart && (
          <MandibularTeethSVG
            key={`mandibular-${mandibularTeeth.join("-")}`}
            selectedTeeth={mandibularTeeth}
            onToothClick={handleMandibularToothToggle}
            className="max-w-full"
            retentionTypesByTooth={mandibularRetentionTypes}
            showRetentionPopover={retentionPopoverState.arch === "mandibular"}
            retentionPopoverTooth={retentionPopoverState.toothNumber}
            onSelectRetentionType={(tooth, type) => handleSelectRetentionType?.("mandibular", tooth, type)}
            onClosePopover={() => setRetentionPopoverState?.({ arch: null, toothNumber: null })}
            onDeselectTooth={handleMandibularToothDeselect}
          />
        )}
      </div>

      {showMandibularChart &&
        selectedProductForMandibular &&
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
                type="mandibular"
                selectedTeeth={mandibularTeeth}
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
                productId={selectedProductForMandibular?.id?.toString()}
                selectedProduct={selectedProductForMandibular.name}
                onExtractionTypeSelect={(extractionType) => {
                  if (extractionType) handleMissingTeethCardClick?.()
                }}
                onTeethSelectionChange={(teeth) => {
                  setMandibularTeeth?.(teeth as number[])
                  if (selectedProductForMandibular && (teeth as number[]).length > 0) {
                    setTimeout(() => {
                      const savedTeeth = (teeth as number[]).map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
                      const matchingProduct = savedProducts.find((sp: any) => {
                        if (sp.addedFrom !== "mandibular") return false
                        const sameProduct = String(sp.product?.id ?? "") === String(selectedProductForMandibular?.id ?? "")
                        const currentSaved = (sp.mandibularTeeth || []).map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
                        const sameTeeth = currentSaved.length === savedTeeth.length && currentSaved.every((t: number, i: number) => t === savedTeeth[i])
                        return sameProduct && sameTeeth
                      })
                      if (matchingProduct) setOpenAccordionMandibularState?.(matchingProduct.id)
                    }, 100)
                  }
                }}
              />
            </div>
          ) : null
        })()}

      {showMandibularChart && showAccordion && (
        <SavedProductSectionContent arch="mandibular" className="w-full mt-2">
          {children}
        </SavedProductSectionContent>
      )}
    </div>
  )
}
