"use client"

import React from 'react'
import { X } from "lucide-react"

interface ShowingResultsProps {
  productCategory: string
  selectedSubCategory?: string | null
  selectedProductInModal?: string | null
  sortedProducts?: any[]
  onCategoryClear: () => void
  onSubCategoryClear: () => void
  onProductClear: () => void
}

export const ShowingResultsSection: React.FC<ShowingResultsProps> = ({
  productCategory,
  selectedSubCategory,
  selectedProductInModal,
  sortedProducts,
  onCategoryClear,
  onSubCategoryClear,
  onProductClear
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
      <span className="text-sm font-medium text-gray-700 flex-shrink-0">Showing results for:</span>
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">
          <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">{productCategory}</span>
          <button
            onClick={onCategoryClear}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        {selectedSubCategory && (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M6 12L10 8L6 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">
              <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">{selectedSubCategory}</span>
              <button
                onClick={onSubCategoryClear}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
        {selectedProductInModal && sortedProducts && (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M6 12L10 8L6 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">
              <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                {sortedProducts.find((p: any) => String(p.id) === selectedProductInModal)?.name || "Product"}
              </span>
              <button
                onClick={onProductClear}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
