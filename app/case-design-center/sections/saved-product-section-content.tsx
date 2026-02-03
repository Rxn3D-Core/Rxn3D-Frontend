"use client"

import React from "react"
import { useSavedProductSection } from "./saved-product-section-context"
import { SavedProductAccordion } from "./saved-product-accordion"
import { SavedProductAccordionItems } from "./saved-product-accordion-items"

export interface SavedProductSectionContentProps {
  /** Which arch this section is for */
  arch: "maxillary" | "mandibular"
  /** Optional accordion className (e.g. "w-full mt-4" for maxillary, "w-full mt-2" for mandibular) */
  className?: string
  /** Accordion items: when provided, rendered as children; when omitted, accordion items are rendered internally. */
  children?: React.ReactNode
}

/**
 * Renders the saved product section for one arch: condition + accordion wrapper.
 * When children are not provided, renders accordion items internally (current product card + saved product cards).
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

  // Auto-open accordion: prioritize currently open item, or default to first saved product, or current card
  let autoOpenValue = ""
  if (openAccordionId) {
    autoOpenValue = openAccordionId
  } else if (productsForArch.length > 0) {
    autoOpenValue = productsForArch[0].id
  } else if (hasCurrentProductCard) {
    autoOpenValue = cardValue
  }

  return (
    <SavedProductAccordion value={autoOpenValue} onValueChange={onAccordionChange} className={className}>
      {children !== undefined ? children : <SavedProductAccordionItems arch={arch} />}
    </SavedProductAccordion>
  )
}
