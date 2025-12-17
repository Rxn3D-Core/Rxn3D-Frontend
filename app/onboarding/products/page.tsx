"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Plus, ImageIcon, HelpCircle, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthHeader } from "@/components/auth-header"
import { useLibraryItems } from "@/contexts/product-library-items-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useAuth } from "@/contexts/auth-context"

export default function ProductsAndServicesPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const {
    libraryData,
    selectedProducts,
    isLoading,
    error,
    searchQuery,
    toggleProductSelection,
    toggleStageSelection,
    setSearchQuery,
    resetError,
    getSelectedProductsCount,
    fetchLibraryItems,
  } = useLibraryItems()

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLibraryItems()
  }, [fetchLibraryItems])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Set first category as selected by default
  useEffect(() => {
    if (libraryData && libraryData.categories.length > 0 && selectedCategoryId === null) {
      setSelectedCategoryId(libraryData.categories[0].id)
    }
  }, [libraryData, selectedCategoryId])

  // Validate onboarding status - redirect if already onboarded
  useEffect(() => {
    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      if (!isSuperAdmin) {
        router.replace("/dashboard")
      }
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  // Toggle subcategory dropdown
  const handleSubcategoryClick = (categoryId: number, subcategoryId: number) => {
    const subcategoryKey = `${categoryId}-${subcategoryId}`

    if (activeDropdown === subcategoryKey) {
      setActiveDropdown(null)
    } else {
      setActiveDropdown(subcategoryKey)
    }
  }

  // Get selected category
  const getSelectedCategory = () => {
    if (!libraryData || !selectedCategoryId) return null
    return libraryData.categories.find((cat) => cat.id === selectedCategoryId)
  }

  // Check if subcategory has any selected products
  const isSubcategorySelected = (categoryId: number, subcategoryId: number) => {
    const selectedCategory = getSelectedCategory()
    if (!selectedCategory) return false

    const subcategory = selectedCategory.subcategories.find((sub) => sub.id === subcategoryId)
    if (!subcategory) return false

    return subcategory.products.some((product) => {
      const productKey = `${categoryId}-${subcategoryId}-${product.id}`
      return selectedProducts[productKey]
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f7fbff]">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1162a8]" />
            <p className="text-gray-600">Loading product library...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f7fbff]">
      {/* Header */}
      <AuthHeader />

      {/* Progress bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
          <div className="absolute h-1 w-3/5 bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">60% complete</div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetError}
                  className="ml-2 h-auto p-0 text-red-600 hover:text-red-800"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">Products and Services</h1>
              <p className="text-[#545f71]">
                Select the products that you offer from the library below. You can also enter your own custom products!
              </p>
              {getSelectedProductsCount() > 0 && (
                <p className="text-sm text-[#1162a8] mt-2">
                  {getSelectedProductsCount()} product{getSelectedProductsCount() !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Search Product Library"
                className="pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Category tabs - First Row */}
            {libraryData && (
              <div className="grid grid-cols-3 gap-0 mb-6">
                {libraryData.categories.map((category, index) => (
                  <button
                    key={category.id}
                    className={`py-3 px-4 text-center text-sm ${
                      selectedCategoryId === category.id
                        ? "bg-[#dfeefb] text-[#1162a8]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } ${index === 0 ? "rounded-l-md" : ""} ${
                      index === libraryData.categories.length - 1 ? "rounded-r-md" : ""
                    }`}
                    onClick={() => {
                      setSelectedCategoryId(category.id)
                      setActiveDropdown(null)
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            {/* Subcategory buttons - Second Row */}
            <div className="flex flex-wrap gap-3 mb-6" ref={dropdownRef}>
              {getSelectedCategory()?.subcategories.map((subcategory) => {
                const subcategoryKey = `${selectedCategoryId}-${subcategory.id}`
                const isOpen = activeDropdown === subcategoryKey

                return (
                  <div key={subcategory.id} className="relative">
                    <ProductButton
                      label={subcategory.name}
                      selected={isSubcategorySelected(selectedCategoryId!, subcategory.id)}
                      onClick={() => handleSubcategoryClick(selectedCategoryId!, subcategory.id)}
                      hasDropdown={true}
                      isOpen={isOpen}
                    />

                    {isOpen && (
                      <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60 mt-1">
                        <div>
                          {subcategory.products.map((product, index) => {
                            const productKey = `${selectedCategoryId}-${subcategory.id}-${product.id}`
                            const isProductSelected = !!selectedProducts[productKey]

                            return (
                              <div key={product.id}>
                                <div className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                                  <div
                                    className="px-3 py-3 flex items-center space-x-3 hover:bg-[#e6eef7] cursor-pointer"
                                    onClick={() =>
                                      toggleProductSelection(selectedCategoryId!, subcategory.id, product.id)
                                    }
                                  >
                                    <div
                                      className={`w-5 h-5 flex items-center justify-center rounded border ${
                                        isProductSelected ? "bg-[#1162a8] border-[#1162a8]" : "bg-white border-gray-400"
                                      }`}
                                    >
                                      {isProductSelected && <Check className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <label className="text-sm font-medium leading-none cursor-pointer">
                                      {product.name}
                                    </label>
                                  </div>
                                </div>

                                {/* Stages */}
                                {isProductSelected && product.stages.length > 0 && (
                                  <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
                                    {product.stages.map((stage) => {
                                      const selectedStages = selectedProducts[productKey]?.selectedStages || []
                                      const isStageSelected = selectedStages.includes(stage.id)

                                      return (
                                        <div key={stage.id} className="flex items-center space-x-2 py-1">
                                          <div
                                            className={`w-4 h-4 flex items-center justify-center rounded border ${
                                              isStageSelected
                                                ? "bg-[#1162a8] border-[#1162a8]"
                                                : "bg-white border-gray-400"
                                            }`}
                                            onClick={() => toggleStageSelection(productKey, stage.id)}
                                          >
                                            {isStageSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                          </div>
                                          <label
                                            className="text-xs text-gray-600 cursor-pointer"
                                            onClick={() => toggleStageSelection(productKey, stage.id)}
                                          >
                                            {stage.name}
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add Custom Product Button */}
              <Button onClick={() => setShowAddProduct(true)} className="bg-[#1162a8] hover:bg-[#1162a8]/90 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add Custom Product
              </Button>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => {
                setTimeout(() => {
                  logout()
                }, 0)
              }}
            >
              Continue Later
            </Button>
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => router.push("/onboarding/business-hours")}
            >
              Previous
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#1162a8]/90 border border-[#1162a8]"
              onClick={() => router.push("/onboarding/product-grades")}
              disabled={getSelectedProductsCount() === 0}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Product</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Product Details</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-[#1162a8]">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Enter the details for your custom product</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-md p-4 flex flex-col items-center justify-center text-center h-24">
                <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Click or drag file to upload</p>
              </div>

              <div className="space-y-2">
                <Input placeholder="Product Name" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {libraryData?.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {getSelectedCategory()?.subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input placeholder="Days to Process" type="number" min="1" />
            </div>

            <div className="flex justify-end">
              <Button
                className="bg-[#1162a8] hover:bg-[#1162a8]/90 text-white"
                onClick={() => setShowAddProduct(false)}
              >
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ProductButtonProps {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  hasDropdown?: boolean
  isOpen?: boolean
}

function ProductButton({
  label,
  selected,
  onClick,
  disabled = false,
  hasDropdown = false,
  isOpen = false,
}: ProductButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md flex items-center justify-between gap-2
        ${selected ? "bg-[#1162a8] text-white" : "bg-white border border-gray-300 text-gray-700"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${!selected ? "hover:bg-gray-100" : ""}
        min-w-[180px]`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
      {hasDropdown && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-300">
          <span className="text-[#1162a8] font-bold text-lg">{isOpen ? "-" : "+"}</span>
        </div>
      )}
    </button>
  )
}

interface CheckboxOptionProps {
  id: string
  label: string
  checked: boolean
  onChange: () => void
}

function CheckboxOption({ id, label, checked, onChange }: CheckboxOptionProps) {
  return (
    <div
      className={`px-3 py-3 flex items-center space-x-3 hover:bg-[#e6eef7] cursor-pointer ${
        checked ? "bg-[#f2f8ff]" : ""
      }`}
      onClick={onChange}
    >
      <div
        className={`w-5 h-5 flex items-center justify-center rounded border ${
          checked ? "bg-[#1162a8] border-[#1162a8]" : "bg-white border-gray-400"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
        {label}
      </label>
    </div>
  )
}
