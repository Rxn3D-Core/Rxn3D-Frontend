"use client"

import React from "react"
import type { SavedProduct } from "./types"

export interface SavedProductPillsProps {
  /** Saved products for this arch (maxillary or mandibular) */
  products: SavedProduct[]
  /** Currently expanded accordion product id */
  openId: string | null
  /** Called when a pill is clicked (pass null to deselect) */
  onPillClick: (id: string | null) => void
  /** Label for each product (e.g. subcategory or product name) */
  getLabel: (product: SavedProduct) => string
}

/**
 * Pills that let the user switch between saved products for an arch.
 * Only rendered when there are 2+ saved products.
 */
export function SavedProductPills({
  products,
  openId,
  onPillClick,
  getLabel,
}: SavedProductPillsProps) {
  if (products.length <= 1) return null

  return (
    <div
      className="flex items-center justify-center gap-3 flex-wrap"
      style={{ marginBottom: "12px" }}
    >
      {products.map((savedProduct) => (
        <div
          key={savedProduct.id}
          className="flex items-center justify-center cursor-pointer hover:opacity-80"
          style={{
            padding: "6px 14px",
            background: (openId != null && String(openId) === String(savedProduct.id)) ? "#DFEEFB" : "#FFFFFF",
            boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)",
            borderRadius: "6px",
          }}
          onClick={() => onPillClick((openId != null && String(openId) === String(savedProduct.id)) ? null : savedProduct.id)}
        >
          <span
            style={{
              fontFamily: "Verdana",
              fontSize: "11px",
              lineHeight: "22px",
              letterSpacing: "-0.02em",
              color: "#000000",
            }}
          >
            {getLabel(savedProduct)}
          </span>
        </div>
      ))}
    </div>
  )
}
