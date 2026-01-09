"use client"

import React from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Product, ProductCategoryApi, ProductCategory } from "../sections/types"

interface ProductSelectionFlowProps {
  // State
  searchQuery: string
  selectedCategory: string | null
  selectedSubcategory: string | null
  showSubcategories: boolean
  showProducts: boolean
  showProductDetails: boolean
  selectedProduct: Product | null
  products: Product[]
  isLoadingProducts: boolean
  subcategoriesLoading: boolean
  subcategoriesError: string | null
  
  // Data
  mainCategories: ProductCategoryApi[]
  filteredSubcategories: ProductCategory[]
  filteredProducts: Product[]
  productSearchResults: Product[]
  isSearchingProducts: boolean
  
  // Handlers
  setSearchQuery: (query: string) => void
  handleCategorySelect: (category: ProductCategoryApi) => void
  handleSubcategorySelect: (subcategory: ProductCategory) => void
  handleProductSelect: (product: Product) => void
  handleBackToCategories: () => void
  handleBackToSubcategories: () => void
  
  // Scroll handlers
  subcategoriesScrollRef: React.RefObject<HTMLDivElement>
  productsScrollRef: React.RefObject<HTMLDivElement>
  showSubcategoriesLeftArrow: boolean
  showSubcategoriesRightArrow: boolean
  showProductsLeftArrow: boolean
  showProductsRightArrow: boolean
  scrollSubcategories: (direction: 'left' | 'right') => void
  scrollProducts: (direction: 'left' | 'right') => void
  checkSubcategoriesScroll: () => void
  checkProductsScroll: () => void
  
  // Helpers
  getCategoryImage: (name: string) => string
  getSubcategoryImage: (name: string) => string
}

export function ProductSelectionFlow({
  searchQuery,
  selectedCategory,
  selectedSubcategory,
  showSubcategories,
  showProducts,
  showProductDetails,
  selectedProduct,
  products,
  isLoadingProducts,
  subcategoriesLoading,
  subcategoriesError,
  mainCategories,
  filteredSubcategories,
  filteredProducts,
  productSearchResults,
  isSearchingProducts,
  setSearchQuery,
  handleCategorySelect,
  handleSubcategorySelect,
  handleProductSelect,
  handleBackToCategories,
  handleBackToSubcategories,
  subcategoriesScrollRef,
  productsScrollRef,
  showSubcategoriesLeftArrow,
  showSubcategoriesRightArrow,
  showProductsLeftArrow,
  showProductsRightArrow,
  scrollSubcategories,
  scrollProducts,
  checkSubcategoriesScroll,
  checkProductsScroll,
  getCategoryImage,
  getSubcategoryImage,
}: ProductSelectionFlowProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Unified Search Bar - Show in all views */}
      {!showProductDetails && (
        <div className="flex justify-center mb-4">
          <div className="relative max-w-[373px] w-full">
            <Input
              type="text"
              placeholder="Search Products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[34px] pl-3 pr-10 border-[#b4b0b0] rounded"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#b4b0b0]" />
          </div>
        </div>
      )}

      {/* Product Search Results - Show when there's a search query, regardless of view */}
      {!showProductDetails && searchQuery.trim() && (
        <div className="w-full mb-6">
          {isSearchingProducts ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">Searching products...</div>
            </div>
          ) : productSearchResults.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <p className="text-gray-600">No products found matching "{searchQuery}"</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap">
              {productSearchResults.map((product: Product) => {
                const isSelected = selectedProduct?.id === product.id
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                      } rounded-lg h-[210px] w-[155px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all`}
                  >
                    <div className="w-[117px] h-[117px] rounded overflow-hidden">
                      <img
                        src={product.image_url || "/images/product-default.png"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/images/product-default.png"
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-black text-center">
                      {product.name}
                    </p>
                    <div className="flex flex-col gap-1 items-start w-[87px]">
                      <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                        <p className="text-[#1162a8] text-[9.5px]">
                          ${product.price || 999}
                        </p>
                      </div>
                      <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                        <p className="text-[#929393] text-[9.5px]">
                          est {product.estimated_days || 14} days
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Product Category Cards - Show when no subcategories, products, or product details are shown, and no search query */}
      {!showSubcategories && !showProducts && !showProductDetails && !searchQuery.trim() && (
        <div className="w-full flex flex-col gap-4 mb-6">
          {/* Category Cards */}
          <div className="flex gap-4 justify-center">
            {mainCategories.map((category: ProductCategoryApi) => {
              const isSelected = selectedCategory === category.name
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                    } rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all`}
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
                  <p className="text-base text-black text-center">
                    {category.name}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subcategory Cards - Show when category is selected and no search query */}
      {showSubcategories && !showProducts && !showProductDetails && !searchQuery.trim() && (
        <div className="w-full flex flex-col gap-4">
          {subcategoriesLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">Loading subcategories...</div>
            </div>
          ) : subcategoriesError ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-red-600 mb-4">Error loading subcategories: {subcategoriesError}</p>
                <Button onClick={handleBackToCategories} variant="outline">
                  Back to Categories
                </Button>
              </div>
            </div>
          ) : filteredSubcategories.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  {searchQuery.trim()
                    ? `No subcategories found matching "${searchQuery}"`
                    : "No subcategories available for this category."}
                </p>
                <Button onClick={handleBackToCategories} variant="outline">
                  Back to Categories
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative w-full">
              {/* Left Arrow Button */}
              {showSubcategoriesLeftArrow && (
                <button
                  onClick={() => scrollSubcategories('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-700" />
                </button>
              )}

              {/* Scrollable Container */}
              <div
                ref={subcategoriesScrollRef}
                onScroll={checkSubcategoriesScroll}
                className={`flex gap-4 overflow-x-auto scrollbar-hide py-2 ${showSubcategoriesLeftArrow || showSubcategoriesRightArrow ? 'px-12' : 'px-0 justify-center'
                  }`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {filteredSubcategories.map((subcategory: ProductCategory) => {
                  const isSelected = selectedSubcategory === subcategory.sub_name
                  return (
                    <div
                      key={subcategory.id}
                      onClick={() => handleSubcategorySelect(subcategory)}
                      className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                        } rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
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
                      <p className="text-base text-black text-center">
                        {subcategory.sub_name || ""}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Right Arrow Button */}
              {showSubcategoriesRightArrow && (
                <button
                  onClick={() => scrollSubcategories('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-6 w-6 text-gray-700" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Product Cards - Show when subcategory is selected and no search query */}
      {showProducts && !showProductDetails && !searchQuery.trim() && (
        <div className="w-full flex flex-col gap-4">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  {searchQuery.trim()
                    ? `No products found matching "${searchQuery}"`
                    : "No products available for this subcategory."}
                </p>
                <Button onClick={handleBackToSubcategories} variant="outline">
                  Back to Subcategories
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative w-full">
              {/* Left Arrow Button */}
              {showProductsLeftArrow && (
                <button
                  onClick={() => scrollProducts('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-700" />
                </button>
              )}

              {/* Scrollable Container */}
              <div
                ref={productsScrollRef}
                onScroll={checkProductsScroll}
                className={`flex gap-4 overflow-x-auto scrollbar-hide py-2 ${showProductsLeftArrow || showProductsRightArrow ? 'px-12' : 'px-0 justify-center'
                  }`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {filteredProducts.map((product: Product) => {
                  const isSelected = selectedProduct?.id === product.id
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                        } rounded-lg h-[250px] w-[200px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
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
                      <p className="text-base text-black text-center">
                        {product.name}
                      </p>
                      <div className="flex flex-col gap-1 items-start w-[120px]">
                        <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[20px] flex items-center justify-center w-full">
                          <p className="text-[#1162a8] text-xs">
                            ${product.price || 999}
                          </p>
                        </div>
                        <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[20px] flex items-center justify-center w-full">
                          <p className="text-[#929393] text-xs">
                            est {product.estimated_days || 14} days
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Right Arrow Button */}
              {showProductsRightArrow && (
                <button
                  onClick={() => scrollProducts('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-6 w-6 text-gray-700" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
