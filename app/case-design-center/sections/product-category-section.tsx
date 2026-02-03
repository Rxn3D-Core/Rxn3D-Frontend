"use client"

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCaseDesignCenterContext } from "../context/case-design-center-context"
import type { ProductCategoryApi, Product } from "./types"
import type { ProductCategory } from "@/contexts/product-category-context"

function getCategoryImage(name: string): string {
  if (!name) return "/images/product-default.png"
  const lower = name.toLowerCase()
  if (lower.includes("fixed")) return "/images/fixed-restoration.png"
  if (lower.includes("removable")) return "/images/removable-restoration.png"
  if (lower.includes("ortho")) return "/images/orthodontics.png"
  return "/images/product-default.png"
}

function getSubcategoryImage(name: string): string {
  if (!name) return "/images/product-default.png"
  const lower = name.toLowerCase()
  if (lower.includes("ortho")) return "/images/orthodontics.png"
  // Use product-default.png as fallback - specific subcategory images should come from API's image_url
  return "/images/product-default.png"
}

/**
 * Renders category cards, subcategory scroll list, or product scroll list
 * based on current navigation state. Uses CaseDesignCenter context.
 */
export function ProductCategorySection() {
  const ctx = useCaseDesignCenterContext()
  const showSubcategories = ctx.showSubcategories ?? false
  const showProducts = ctx.showProducts ?? false
  const showProductDetails = ctx.showProductDetails ?? false
  const searchQuery = (ctx.searchQuery ?? "").trim()
  const mainCategories = ctx.mainCategories ?? []
  const allCategoriesLoading = ctx.allCategoriesLoading ?? false
  const selectedCategory = ctx.selectedCategory ?? null
  const handleCategorySelect = ctx.handleCategorySelect
  const filteredSubcategories = ctx.filteredSubcategories ?? []
  const subcategoriesLoading = ctx.subcategoriesLoading ?? false
  const subcategoriesError = ctx.subcategoriesError
  const selectedSubcategory = ctx.selectedSubcategory ?? null
  const handleSubcategorySelect = ctx.handleSubcategorySelect
  const handleBackToCategories = ctx.handleBackToCategories
  const filteredProducts = ctx.filteredProducts ?? []
  const isLoadingProducts = ctx.isLoadingProducts ?? false
  const selectedProduct = ctx.selectedProduct ?? null
  const pendingProductForArchSelection = ctx.pendingProductForArchSelection ?? null
  const handleProductSelect = ctx.handleProductSelect
  const handleBackToSubcategories = ctx.handleBackToSubcategories
  const showSubcategoriesLeftArrow = ctx.showSubcategoriesLeftArrow ?? false
  const showSubcategoriesRightArrow = ctx.showSubcategoriesRightArrow ?? false
  const scrollSubcategories = ctx.scrollSubcategories
  const checkSubcategoriesScroll = ctx.checkSubcategoriesScroll
  const subcategoriesScrollRef = ctx.subcategoriesScrollRef
  const showProductsLeftArrow = ctx.showProductsLeftArrow ?? false
  const showProductsRightArrow = ctx.showProductsRightArrow ?? false
  const scrollProducts = ctx.scrollProducts
  const checkProductsScroll = ctx.checkProductsScroll
  const productsScrollRef = ctx.productsScrollRef

  const showCategory = !showSubcategories && !showProducts && !showProductDetails && !searchQuery
  const showSubcategory = showSubcategories && !showProducts && !showProductDetails && !searchQuery
  const showProduct = showProducts && !showProductDetails && !searchQuery

  if (!showCategory && !showSubcategory && !showProduct) return null

  if (showCategory) {
    return (
      <div className="w-full flex flex-col gap-4 mb-4">
        {allCategoriesLoading ? (
          <div className="flex gap-4 justify-center flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-200 rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4"
              >
                <Skeleton className="w-[150px] h-[150px] rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : mainCategories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-gray-600">No categories available.</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            {mainCategories.map((category: ProductCategoryApi) => {
              const isSelected = selectedCategory === category.name
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect?.(category)}
                  className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"} rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all`}
                >
                  <div className="w-[150px] h-[150px] rounded overflow-hidden">
                    <img
                      src={category.image_url || getCategoryImage(category.name)}
                      alt={category.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getCategoryImage(category.name)
                      }}
                    />
                  </div>
                  <p className="text-base text-black text-center">{category.name}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (showSubcategory) {
    return (
      <div className="w-full flex flex-col gap-4">
        {subcategoriesLoading ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-200 rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 flex-shrink-0"
              >
                <Skeleton className="w-[150px] h-[150px] rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : subcategoriesError ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-red-600 mb-4">Error loading subcategories: {subcategoriesError}</p>
              <Button onClick={() => handleBackToCategories?.()} variant="outline">
                Back to Categories
              </Button>
            </div>
          </div>
        ) : filteredSubcategories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {searchQuery ? `No subcategories found matching "${searchQuery}"` : "No subcategories available for this category."}
              </p>
              <Button onClick={() => handleBackToCategories?.()} variant="outline">
                Back to Categories
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            {showSubcategoriesLeftArrow && (
              <button
                onClick={() => scrollSubcategories?.("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </button>
            )}
            <div
              ref={subcategoriesScrollRef as React.RefObject<HTMLDivElement>}
              onScroll={() => checkSubcategoriesScroll?.()}
              className={`flex gap-4 overflow-x-auto scrollbar-hide py-2 ${showSubcategoriesLeftArrow || showSubcategoriesRightArrow ? "px-12" : "px-0 justify-center"}`}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filteredSubcategories.map((subcategory: ProductCategory) => {
                const isSelected = selectedSubcategory === subcategory.sub_name
                return (
                  <div
                    key={subcategory.id}
                    onClick={() => handleSubcategorySelect?.(subcategory)}
                    className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"} rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
                  >
                    <div className="w-[150px] h-[150px] rounded overflow-hidden">
                      <img
                        src={subcategory.image_url || getSubcategoryImage(subcategory.sub_name || "")}
                        alt={subcategory.sub_name || ""}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getSubcategoryImage(subcategory.sub_name || "")
                        }}
                      />
                    </div>
                    <p className="text-base text-black text-center">{subcategory.sub_name || ""}</p>
                  </div>
                )
              })}
            </div>
            {showSubcategoriesRightArrow && (
              <button
                onClick={() => scrollSubcategories?.("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (showProduct) {
    return (
      <div className="w-full flex flex-col gap-4">
        {isLoadingProducts ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-200 rounded-lg h-[250px] w-[200px] p-4 flex flex-col items-center justify-center gap-2 flex-shrink-0"
              >
                <Skeleton className="w-[150px] h-[150px] rounded" />
                <Skeleton className="h-4 w-28" />
                <div className="flex flex-col gap-1 items-start w-[120px]">
                  <Skeleton className="h-5 w-full rounded-[10px]" />
                  <Skeleton className="h-5 w-full rounded-[10px]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {searchQuery ? `No products found matching "${searchQuery}"` : "No products available for this subcategory."}
              </p>
              <Button onClick={() => handleBackToSubcategories?.()} variant="outline">
                Back to Subcategories
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            {showProductsLeftArrow && (
              <button
                onClick={() => scrollProducts?.("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </button>
            )}
            <div
              ref={productsScrollRef as React.RefObject<HTMLDivElement>}
              onScroll={() => checkProductsScroll?.()}
              className={`flex gap-4 overflow-x-auto scrollbar-hide py-2 ${showProductsLeftArrow || showProductsRightArrow ? "px-12" : "px-0 justify-center"}`}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filteredProducts.map((product: Product) => {
                const isSelected = selectedProduct?.id === product.id
                const isPending = pendingProductForArchSelection?.id === product.id
                return (
                  <div
                    key={product.id}
                    onClick={(e) => handleProductSelect?.(product, e)}
                    className={`bg-white border-2 ${isSelected || isPending ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"} rounded-lg h-[250px] w-[200px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
                  >
                    <div className="w-[150px] h-[150px] rounded overflow-hidden">
                      <img
                        src={product.image_url || "/images/product-default.png"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/images/product-default.png"
                        }}
                      />
                    </div>
                    <p className="text-base text-black text-center">{product.name}</p>
                    <div className="flex flex-col gap-1 items-start w-[120px]">
                      <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[20px] flex items-center justify-center w-full">
                        <p className="text-[#1162a8] text-xs">${product.price ?? 999}</p>
                      </div>
                      <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[20px] flex items-center justify-center w-full">
                        <p className="text-[#929393] text-xs">est {product.estimated_days ?? 14} days</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {showProductsRightArrow && (
              <button
                onClick={() => scrollProducts?.("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}
