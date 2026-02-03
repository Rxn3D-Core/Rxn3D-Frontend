"use client"

import React from "react"
import { ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useSavedProductSection } from "./saved-product-section-context"
import { useCaseDesignCenterContext } from "../context/case-design-center-context"
import type { SavedProduct } from "./types"

export interface SavedProductAccordionItemsProps {
  arch: "maxillary" | "mandibular"
}

/**
 * Renders accordion items for one arch: current product card + saved product cards.
 * Uses useSavedProductSection() and useCaseDesignCenterContext() for data.
 * When the page does not pass children to SavedProductSectionContent, this component is used.
 */
export function SavedProductAccordionItems({ arch }: SavedProductAccordionItemsProps) {
  const ctx = useSavedProductSection()
  const caseCtx = useCaseDesignCenterContext()
  const isMaxillary = arch === "maxillary"
  const teeth = isMaxillary ? ctx.maxillaryTeeth : ctx.mandibularTeeth
  const selectedProduct = isMaxillary ? ctx.selectedProductForMaxillary : ctx.selectedProductForMandibular
  const openAccordionId = isMaxillary ? ctx.openAccordionMaxillary : ctx.openAccordionMandibular
  const cardValue = `${arch}-card`
  const productsForArch = ctx.savedProducts.filter((p) => p.addedFrom === arch)
  const selectedCategory = caseCtx.selectedCategory ?? null
  const selectedSubcategory = caseCtx.selectedSubcategory ?? null

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

  const hasCurrentProductCard = teeth.length > 0 && !!selectedProduct && !hasMatchingSaved
  const sortedTeeth = [...teeth].sort((a, b) => a - b)
  const teethDisplay = sortedTeeth.length > 0 ? sortedTeeth.map((t) => `#${t}`).join(", ") : ""

  return (
    <>
      {hasCurrentProductCard && (
        <AccordionItem value={cardValue} className="border-0">
          <Card className="border-0 shadow-sm w-full">
            <div
              className="w-full"
              style={{
                position: "relative",
                minHeight: "38px",
                background: openAccordionId === cardValue ? "#E0EDF8" : "#F5F5F5",
                boxShadow: "0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)",
                borderRadius: openAccordionId === cardValue ? "8px 8px 0px 0px" : "8px",
                display: ctx.currentShadeField ? "none" : "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "8px 6px",
                gap: "2px",
                borderBottom: openAccordionId === cardValue ? "1px dotted #B0D0F0" : "none",
              }}
            >
              <AccordionTrigger
                className="hover:no-underline w-full group [&>svg]:hidden"
                style={{
                  padding: "0px",
                  gap: "10px",
                  width: "100%",
                  background: "transparent",
                  boxShadow: "none",
                  borderRadius: "0px",
                }}
              >
                <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "6px", paddingRight: "20px" }}>
                  <div
                    style={{
                      width: "28px",
                      minWidth: "28px",
                      height: "28px",
                      background: `url(${selectedProduct?.image_url || "/images/tooth-icon.png"}), #FFFFFF`,
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", minWidth: 0, alignItems: "flex-start" }}>
                    {selectedProduct?.name && (
                      <span
                        style={{
                          fontFamily: "Verdana",
                          fontStyle: "normal",
                          fontWeight: 600,
                          fontSize: "12px",
                          lineHeight: "14px",
                          letterSpacing: "-0.02em",
                          color: "#000000",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        {selectedProduct.name}
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "Verdana",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "10px",
                          lineHeight: "12px",
                          letterSpacing: "-0.02em",
                          color: "#000000",
                        }}
                      >
                        {teethDisplay}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                      {selectedCategory && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "1px 6px",
                            background: "#F0F0F0",
                            borderRadius: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "Verdana",
                              fontStyle: "normal",
                              fontWeight: 400,
                              fontSize: "9px",
                              lineHeight: "11px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {selectedCategory}
                          </span>
                        </div>
                      )}
                      {selectedSubcategory && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "1px 6px",
                            background: "#F0F0F0",
                            borderRadius: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "Verdana",
                              fontStyle: "normal",
                              fontWeight: 400,
                              fontSize: "9px",
                              lineHeight: "11px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {selectedSubcategory}
                          </span>
                        </div>
                      )}
                      <span
                        style={{
                          fontFamily: "Verdana",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "9px",
                          lineHeight: "11px",
                          letterSpacing: "-0.02em",
                          color: "#B4B0B0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Est days: {selectedProduct?.estimated_days || 10} work days after submission
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    width: "21.6px",
                    height: "21.6px",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  <ChevronDown
                    className="w-full h-full transition-transform duration-200 text-black"
                    style={{
                      transform: openAccordionId === cardValue ? "rotate(0deg)" : "rotate(-180deg)",
                    }}
                  />
                </div>
              </AccordionTrigger>
            </div>
            <AccordionContent className="pt-0" style={{ position: "relative", minHeight: "auto", overflowY: "auto" }}>
              {/* Full content (DynamicProductFields, etc.) is still rendered by the page when it passes children.
                  When migrating fully, move the accordion content from the page into this component. */}
              <div className="p-4 text-sm text-gray-500">
                Product form content — when children are not passed, page should use internal accordion items; expand this component with full content from page.
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      )}
      {productsForArch.map((savedProduct: SavedProduct) => (
        <AccordionItem key={savedProduct.id} value={savedProduct.id} className="border-0">
          <Card className="border-0 shadow-sm w-full">
            <div
              className="w-full"
              style={{
                position: "relative",
                minHeight: "38px",
                background: openAccordionId === savedProduct.id ? "#E0EDF8" : "#F5F5F5",
                boxShadow: "0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)",
                borderRadius: openAccordionId === savedProduct.id ? "8px 8px 0px 0px" : "8px",
                display: ctx.currentShadeField ? "none" : "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "8px 6px",
                gap: "2px",
                borderBottom: openAccordionId === savedProduct.id ? "1px dotted #B0D0F0" : "none",
              }}
            >
              <AccordionTrigger
                className="hover:no-underline w-full group [&>svg]:hidden"
                style={{
                  padding: "0px",
                  gap: "10px",
                  width: "100%",
                  background: "transparent",
                  boxShadow: "none",
                  borderRadius: "0px",
                }}
                onClick={() => ctx.handleSavedProductCardClick(savedProduct)}
              >
                <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "6px", paddingRight: "20px" }}>
                  <div
                    style={{
                      width: "28px",
                      minWidth: "28px",
                      height: "28px",
                      background: `url(${savedProduct.product?.image_url || "/images/tooth-icon.png"}), #FFFFFF`,
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", minWidth: 0, alignItems: "flex-start" }}>
                    {savedProduct.product?.name && (
                      <span
                        style={{
                          fontFamily: "Verdana",
                          fontStyle: "normal",
                          fontWeight: 600,
                          fontSize: "12px",
                          lineHeight: "14px",
                          letterSpacing: "-0.02em",
                          color: "#000000",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        {savedProduct.product.name}
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "Verdana",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "10px",
                          lineHeight: "12px",
                          letterSpacing: "-0.02em",
                          color: "#000000",
                        }}
                      >
                        {(isMaxillary ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth)?.length
                          ? (isMaxillary ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth)
                              ?.slice()
                              .sort((a: number, b: number) => a - b)
                              .map((t: number) => `#${t}`)
                              .join(", ")
                          : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                      {savedProduct.category && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "1px 6px",
                            background: "#F0F0F0",
                            borderRadius: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "Verdana",
                              fontStyle: "normal",
                              fontWeight: 400,
                              fontSize: "9px",
                              lineHeight: "11px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {savedProduct.category}
                          </span>
                        </div>
                      )}
                      {savedProduct.subcategory && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "1px 6px",
                            background: "#F0F0F0",
                            borderRadius: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "Verdana",
                              fontStyle: "normal",
                              fontWeight: 400,
                              fontSize: "9px",
                              lineHeight: "11px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {savedProduct.subcategory}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    width: "21.6px",
                    height: "21.6px",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  <ChevronDown
                    className="w-full h-full transition-transform duration-200 text-black"
                    style={{
                      transform: openAccordionId === savedProduct.id ? "rotate(0deg)" : "rotate(-180deg)",
                    }}
                  />
                </div>
              </AccordionTrigger>
            </div>
            <AccordionContent className="pt-0" style={{ position: "relative", minHeight: "auto", overflowY: "auto" }}>
              {/* Saved product card content — expand with full content from page (fields, stage, retention, etc.) */}
              <div className="p-4 text-sm text-gray-500">
                Saved product form content — expand with full content from page.
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      ))}
    </>
  )
}
