"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, X, HelpCircle, Check, Loader2 } from "lucide-react"
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

export default function ProductConfigurationsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)

  // Add safety check - if auth is still loading, show loading state
  if (authLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f7fbff]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1162a8]" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  const {
    libraryData,
    selectedGrades,
    selectedImpressions,
    selectedTeethShades,
    selectedGumShades,
    selectedMaterials,
    selectedRetentions,
    selectedAddons,
    isLoading,
    error,
    toggleGradeSelection,
    toggleImpressionSelection,
    toggleTeethShadeSelection,
    toggleGumShadeSelection,
    toggleMaterialSelection,
    toggleRetentionSelection,
    toggleAddonSelection,
    submitOnboarding,
    getSelectedIds,
    resetError,
    setIsLoading,
    setError,
    fetchLibraryItems,
  } = useLibraryItems()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const customerIdStored = localStorage.getItem("customerId")
      if (customerIdStored) setCustomerId(customerIdStored)
    }
  }, [])

  // Fetch library items when component mounts
  useEffect(() => {
    if (user && !libraryData && !isLoading) {
      const token = localStorage.getItem("token") || localStorage.getItem("library_token")
      if (token) {
        fetchLibraryItems()
      } else {
        setError("Authentication token not found. Please log in again.")
      }
    }
  }, [user, libraryData, isLoading, fetchLibraryItems])

  // Validate onboarding status - redirect if already onboarded
  useEffect(() => {
    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      if (!isSuperAdmin) {
        router.replace("/dashboard")
      }
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleDropdownToggle = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName)
  }

  const handleSubmit = async () => {
    if (!customerId) {
      return
    }
    try {
      setIsLoading(true)
      const selectedIds = getSelectedIds()

      const payload = {
        customer_id: Number(customerId),
        categories: selectedIds.categories,
        subcategories: selectedIds.subcategories,
        products: selectedIds.products,
        grades: selectedIds.grades,
        impressions: selectedIds.impressions,
        teeth_shades: selectedIds.teeth_shades,
        gum_shades: selectedIds.gum_shades,
        materials: selectedIds.materials,
        retentions: selectedIds.retentions,
        addons: selectedIds.addons,
        office_invitations: [], // Can be added later if needed
      }
      await submitOnboarding(Number(customerId))
      router.push("/onboarding/invite-users")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during onboarding"
      setError(errorMessage)
      console.error("Onboarding failed:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getSelectedCount = () => {
    const ids = getSelectedIds()
    return (
      ids.grades.length +
      ids.impressions.length +
      ids.teeth_shades.length +
      ids.gum_shades.length +
      ids.materials.length +
      ids.retentions.length +
      ids.addons.length
    )
  }

  const filterItems = (items: any[], query: string) => {
    if (!query) return items
    return items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
  }

  // Show loading state while fetching library data
  if (!libraryData && isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f7fbff]">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1162a8]" />
            <p className="text-gray-600">Loading configurations...</p>
            {error && (
              <p className="text-red-600 mt-2 text-sm">{error}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show error state if fetch failed
  if (error && !libraryData) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f7fbff]">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => {
                resetError()
                fetchLibraryItems()
              }}
              className="bg-[#1162a8] hover:bg-[#1162a8]/90 text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Still loading but no error - show loading state
  if (!libraryData) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f7fbff]">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1162a8]" />
            <p className="text-gray-600">Loading configurations...</p>
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
          <div className="absolute h-1 w-4/5 bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">80% complete</div>
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
              <h1 className="text-2xl font-bold mb-1">Product Configurations</h1>
              <p className="text-[#545f71]">
                What are your product grades, impressions that you need and gum shades that you offer?
              </p>
              {getSelectedCount() > 0 && (
                <p className="text-sm text-[#1162a8] mt-2">
                  {getSelectedCount()} configuration{getSelectedCount() !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Search Library"
                className="pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Configuration dropdowns */}
            <div className="flex flex-wrap gap-3 mb-6" ref={dropdownRef}>
              {/* Product Grades */}
              <div className="relative">
                <ProductButton
                  label="Product Grades"
                  selected={Object.values(selectedGrades).some(Boolean)}
                  onClick={() => handleDropdownToggle("grades")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "grades"}
                />
                {activeDropdown === "grades" && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {filterItems(libraryData.grades, searchQuery).map((grade, index) => (
                        <div key={grade.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                          <CheckboxOption
                            id={`grade-${grade.id}`}
                            label={grade.name}
                            checked={!!selectedGrades[grade.id]}
                            onChange={() => toggleGradeSelection(grade.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Impressions */}
              <div className="relative">
                <ProductButton
                  label="Impressions"
                  selected={Object.values(selectedImpressions).some(Boolean)}
                  onClick={() => handleDropdownToggle("impressions")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "impressions"}
                />
                {activeDropdown === "impressions" && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {filterItems(libraryData.impressions, searchQuery).map((impression, index) => (
                        <div key={impression.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                          <CheckboxOption
                            id={`impression-${impression.id}`}
                            label={impression.name}
                            checked={!!selectedImpressions[impression.id]}
                            onChange={() => toggleImpressionSelection(impression.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Teeth Shades */}
              <div className="relative">
                <ProductButton
                  label="Teeth Shades"
                  selected={Object.values(selectedTeethShades).some(Boolean)}
                  onClick={() => handleDropdownToggle("teeth-shades")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "teeth-shades"}
                />
                {activeDropdown === "teeth-shades" && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {libraryData.teeth_shade_brands.map((brand) =>
                        filterItems(brand.teeth_shades, searchQuery).map((shade, index) => (
                          <div key={shade.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                            <CheckboxOption
                              id={`teeth-shade-${shade.id}`}
                              label={`${brand.name} - ${shade.name}`}
                              checked={!!selectedTeethShades[shade.id]}
                              onChange={() => toggleTeethShadeSelection(shade.id)}
                            />
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Gum Shades */}
              <div className="relative">
                <ProductButton
                  label="Gum Shades"
                  selected={Object.values(selectedGumShades).some(Boolean)}
                  onClick={() => handleDropdownToggle("gum-shades")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "gum-shades"}
                />
                {activeDropdown === "gum-shades" && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {libraryData.gum_shade_brands.map((brand) =>
                        filterItems(brand.gum_shades, searchQuery).map((shade, index) => (
                          <div key={shade.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                            <CheckboxOption
                              id={`gum-shade-${shade.id}`}
                              label={`${brand.name} - ${shade.name}`}
                              checked={!!selectedGumShades[shade.id]}
                              onChange={() => toggleGumShadeSelection(shade.id)}
                            />
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Materials */}
              <div className="relative">
                <ProductButton
                  label="Materials"
                  selected={Object.values(selectedMaterials).some(Boolean)}
                  onClick={() => handleDropdownToggle("materials")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "materials"}
                />
                {activeDropdown === "materials" && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {filterItems(libraryData.materials, searchQuery).map((material, index) => (
                        <div key={material.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                          <CheckboxOption
                            id={`material-${material.id}`}
                            label={material.name}
                            checked={!!selectedMaterials[material.id]}
                            onChange={() => toggleMaterialSelection(material.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Retentions */}
              <div className="relative">
                <ProductButton
                  label="Retentions"
                  selected={Object.values(selectedRetentions).some(Boolean)}
                  onClick={() => handleDropdownToggle("retentions")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "retentions"}
                />
                {activeDropdown === "retentions" && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {filterItems(libraryData.retentions, searchQuery).map((retention, index) => (
                        <div key={retention.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                          <CheckboxOption
                            id={`retention-${retention.id}`}
                            label={retention.name}
                            checked={!!selectedRetentions[retention.id]}
                            onChange={() => toggleRetentionSelection(retention.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add-ons */}
              <div className="relative">
                <ProductButton
                  label="Add-ons"
                  selected={Object.values(selectedAddons).some(Boolean)}
                  onClick={() => handleDropdownToggle("addons")}
                  hasDropdown={true}
                  isOpen={activeDropdown === "addons"}
                />
                {activeDropdown === "addons" && (
                  <div className="absolute left-0 top-full w-100 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
                    <div>
                      {libraryData.addon_categories.map((category) =>
                        category.subcategories.map((subcategory) =>
                          filterItems(subcategory.addons, searchQuery).map((addon, index) => (
                            <div key={addon.id} className={index % 2 === 0 ? "bg-[#f2f8ff]" : "bg-white"}>
                              <CheckboxOption
                                id={`addon-${addon.id}`}
                                label={`${category.name} - ${addon.name}`}
                                checked={!!selectedAddons[addon.id]}
                                onChange={() => toggleAddonSelection(addon.id)}
                              />
                            </div>
                          )),
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => router.replace("/onboarding/products")}
              disabled={isLoading}
            >
              Previous
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#1162a8]/90 border border-[#1162a8]"
              onClick={handleSubmit}
              disabled={isLoading || getSelectedCount() === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Configuration</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Configuration Details</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-[#1162a8]">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Enter the details for your custom configuration</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Input placeholder="Configuration Name" />

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grade">Product Grade</SelectItem>
                <SelectItem value="impression">Impression</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="retention">Retention</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex justify-end">
              <Button
                className="bg-[#1162a8] hover:bg-[#1162a8]/90 text-white"
                onClick={() => setShowAddProduct(false)}
              >
                Add Configuration
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
      className={`px-4 py-2 rounded-md flex items-center justify-between gap-2 ${
        selected
          ? disabled
            ? "bg-gray-200 text-gray-500"
            : "bg-[#1162a8] text-white"
          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} min-w-[180px]`}
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
        className={`w-5 h-5 flex items-center justify-center rounded border flex-shrink-0 ${
          checked ? "bg-[#1162a8] border-[#1162a8]" : "bg-white border-gray-400"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none cursor-pointer break-words flex-1 min-w-0"
        style={{ wordBreak: "break-word" }}
      >
        {label}
      </label>
    </div>
  )
}
