"use client"

import React from "react"
import { Trash2 } from "lucide-react"
import type { Product } from "../sections/types"

interface ProductSelectionBadgeProps {
  product: Product
  onAddUpper: () => void
  onAddLower: () => void
  onDeleteUpper?: () => void
  onDeleteLower?: () => void
  hasMaxillaryProduct: boolean
  hasMandibularProduct: boolean
  showMaxillaryChart: boolean
  showMandibularChart: boolean
}

export function ProductSelectionBadge({
  product,
  onAddUpper,
  onAddLower,
  onDeleteUpper,
  onDeleteLower,
  hasMaxillaryProduct,
  hasMandibularProduct,
  showMaxillaryChart,
  showMandibularChart,
}: ProductSelectionBadgeProps) {
  return (
    <div className="w-full max-w-[1400px] grid grid-cols-1 gap-4">
      {/* Left Column - Upper Product Button */}
      <div className="flex items-center justify-center">
        {showMaxillaryChart ? (
          <>
          </>
        ) : (
          <>
            {/* Add Upper Product Button */}
            <button
              onClick={onAddUpper}
              style={{
                position: 'relative',
                width: '140px',
                height: '48px',
                background: 'linear-gradient(180deg, #1162A8 0%, #0D4D87 100%)',
                boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Verdana',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '16px',
                  textAlign: 'center',
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                  userSelect: 'none',
                }}
              >
                Add Upper Product
              </span>
            </button>
          </>
        )}
      </div>

      {/* Right Column - Lower Product Button */}
      <div className="flex items-center justify-center">
        {showMandibularChart ? (
          <>
            {/* Delete Button for Lower */}
            
          </>
        ) : (
          <>
            {/* Add Lower Product Button */}
            <button
              onClick={onAddLower}
              style={{
                position: 'relative',
                width: '140px',
                height: '48px',
                background: 'linear-gradient(180deg, #1162A8 0%, #0D4D87 100%)',
                boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Verdana',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '16px',
                  textAlign: 'center',
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                  userSelect: 'none',
                }}
              >
                Add Lower Product
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
