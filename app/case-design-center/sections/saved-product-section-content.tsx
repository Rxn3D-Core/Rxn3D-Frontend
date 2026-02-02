"use client"

import React from "react"
import { useSavedProductSection } from "./saved-product-section-context"
import { SavedProductAccordion } from "./saved-product-accordion"

export interface SavedProductSectionContentProps {
  /** Which arch this section is for */
  arch: "maxillary" | "mandibular"
  /** Optional accordion className (e.g. "w-full mt-4" for maxillary, "w-full mt-2" for mandibular) */
  className?: string
  /** Accordion items: current product card + saved product cards. Pass from page for now; can be moved here to put the whole code in this component. */
  children: React.ReactNode
}

/**
 * Renders the saved product section for one arch: condition + accordion wrapper.
 * Uses SavedProductSectionContext for all state/handlers so the page doesn't pass 80+ props.
 *
 * To put the *whole* accordion code in this component: copy the AccordionItem JSX
 * (current product card + savedProducts.map saved cards) from the page into this file,
 * and use useSavedProductSection() + arch to derive openAccordionId, selectedProduct,
 * teeth, onAccordionChange, cardValue, productsForArch, etc. Then the page only
 * renders <SavedProductSectionContent arch="maxillary" /> and <SavedProductSectionContent arch="mandibular" />
 * with no children.
 */
export function SavedProductSectionContent({
  arch,
  className = "w-full mt-4",
  children,
}: SavedProductSectionContentProps) {
  const ctx = useSavedProductSection()
  const isMaxillary = arch === "maxillary"
  const showChart = isMaxillary ? ctx.showMaxillaryChart : ctx.showMandibularChart
  const teeth = isMaxillary ? ctx.maxillaryTeeth : ctx.mandibularTeeth
  const selectedProduct = isMaxillary ? ctx.selectedProductForMaxillary : ctx.selectedProductForMandibular
  const openAccordionId = isMaxillary ? ctx.openAccordionMaxillary : ctx.openAccordionMandibular
  const onAccordionChange = isMaxillary ? ctx.handleAccordionChangeMaxillary : ctx.handleAccordionChangeMandibular
  const cardValue = `${arch}-card`
  const productsForArch = ctx.savedProducts.filter((p) => p.addedFrom === arch)

  const hasMatchingSaved = ctx.savedProducts.some((sp) => {
    if (sp.addedFrom !== arch) return false
    const savedTeeth = (sp[isMaxillary ? "maxillaryTeeth" : "mandibularTeeth"] || [])
      .map((t: number) => Number(t))
      .sort((a: number, b: number) => a - b)
    const currentTeeth = teeth.map((t: number) => Number(t)).sort((a: number, b: number) => a - b)
    const sameTeeth =
      savedTeeth.length === currentTeeth.length && savedTeeth.every((t: number, i: number) => t === currentTeeth[i])
    const sameProduct = String(sp.product?.id ?? "") === String(selectedProduct?.id ?? "")
    return sameTeeth && sameProduct
  })

  const hasCurrentProductCard = showChart && teeth.length > 0 && !!selectedProduct && !hasMatchingSaved
  const showAccordion = hasCurrentProductCard || productsForArch.length > 0
  if (!showChart || !showAccordion) return null

  const accordionValue =
    openAccordionId === cardValue || ctx.savedProducts.some((p) => p.addedFrom === arch && p.id === openAccordionId)
      ? openAccordionId ?? ""
      : ""

  return (
    <SavedProductAccordion value={accordionValue} onValueChange={onAccordionChange} className={className}>
      {children}
    </SavedProductAccordion>
  )
}
