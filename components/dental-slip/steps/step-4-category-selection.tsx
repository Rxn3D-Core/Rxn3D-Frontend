"use client"

import React from 'react'
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Step4CategorySelectionProps {
  allCategories: any[]
  allCategoriesLoading: boolean
  productSearch: string
  setProductSearch: (search: string) => void
  productCategory: string
  setProductCategory: (category: string) => void
  setStep: (step: number) => void
  fetchSubcategoriesByCategory: (categoryId: number, language: string) => void
  showSpotlight: boolean
  activateSpotlight: (element: HTMLElement) => void
}

export const Step4CategorySelection: React.FC<Step4CategorySelectionProps> = ({
  allCategories,
  allCategoriesLoading,
  productSearch,
  setProductSearch,
  productCategory,
  setProductCategory,
  setStep,
  fetchSubcategoriesByCategory,
  showSpotlight,
  activateSpotlight,
}) => {
  // Helper for image by category name
  const getCategoryImage = (name: string) => {
    if (!name) return "/images/product-default.png"
    const lower = name.toLowerCase()
    if (lower.includes("fixed")) return "/images/fixed-restoration.png"
    if (lower.includes("removable")) return "/images/removable-restoration.png"
    if (lower.includes("ortho")) return "/images/orthodontics.png"
    // fallback
    return "/images/product-default.png"
  }

  return (
    <div className="flex flex-col bg-white">
      {/* Header Section */}
      <div className="flex flex-col items-center px-4 sm:px-6 py-2 border-b border-gray-200">
        <div className="text-center mb-4">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">Let's start building your case</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">Select a restoration type to begin or search directly by product name.</p>
        </div>
        <div className="flex items-center justify-end w-full mb-4">
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            <Input
              placeholder="Search Product"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pr-8 sm:pr-10 py-2 text-xs sm:text-sm bg-gray-50 border-gray-200 rounded-lg w-full"
            />
          </div>
        </div>
      </div>

      {/* Category Cards Section */}
      <div className="flex items-center justify-center px-4 sm:px-6 py-4">
        {allCategoriesLoading ? (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
              <img
                src="/images/ajax-loader.gif"
                alt="Loading..."
                className="h-24 w-24 mb-6"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Categories</h3>
              <p className="text-sm text-gray-500 text-center">Please wait while we load available restoration types...</p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-6xl">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center flex-wrap">
              {(() => {
                // Desired order
                const order = [
                  "Fixed Restoration",
                  "Removable Restoration",
                  "Orthodontics"
                ];
                // Filter and sort categories by desired order
                const sortedCats = [...allCategories.filter((cat) => cat.status === "Active")].sort((a, b) => {
                  const aIdx = order.indexOf(a.name);
                  const bIdx = order.indexOf(b.name);
                  if (aIdx === -1 && bIdx === -1) return 0;
                  if (aIdx === -1) return 1;
                  if (bIdx === -1) return -1;
                  return aIdx - bIdx;
                });
                return sortedCats.map((cat) => (
                  <div
                    key={cat.id}
                    className={`cursor-pointer transition-all duration-200 rounded-2xl border-2 bg-white flex flex-col items-center p-4 sm:p-6 w-full sm:w-auto sm:min-w-[240px] ${
                      productCategory === cat.name
                        ? "border-blue-500 shadow-lg"
                        : "border-gray-200 hover:border-blue-500 hover:shadow-lg"
                      }`}
                    onClick={(e) => {
                      if (showSpotlight) {
                        activateSpotlight(e.currentTarget as HTMLElement);
                      }
                      setProductCategory(cat.name);
                      // Fetch subcategories for the selected category
                      fetchSubcategoriesByCategory(cat.id, "en");
                      setStep(5);
                    }}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <img
                        src={getCategoryImage(cat.name)}
                        alt={cat.name}
                        className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                      />
                    </div>
                    <h3 className="font-semibold text-base sm:text-xl text-center text-gray-900">{cat.name}</h3>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Step4CategorySelection
