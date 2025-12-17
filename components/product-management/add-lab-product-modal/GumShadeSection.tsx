import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Plus, AlertCircle, X, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"

type WatchedGumShade = {
  gum_shade_id: number
  sequence?: number
}

type GumShade = {
  id: number
  name: string
  brand_id: number
  sequence?: number
  status?: string
  color_code_top?: string
  color_code_middle?: string
  color_code_bottom?: string
}

type GumShadeBrand = {
  id: number
  name: string
  system_name?: string
  status?: string
  sequence?: number
  shades?: GumShade[]
}

type GumShadeSectionProps = {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  gumShadeBrands: GumShadeBrand[] | { data?: GumShadeBrand[] }
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: any
  toggleExpanded: (section: string) => void
  handleToggleSelection: (section: string, id: number, sequence?: number) => void
  customGumShadeNames?: Record<number, string>
  setCustomGumShadeNames?: React.Dispatch<React.SetStateAction<Record<number, string>>>
}

export function GumShadeSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  gumShadeBrands,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  customGumShadeNames = {},
  setCustomGumShadeNames,
}: GumShadeSectionProps) {
  const watchedGumShades = (watch("gum_shades") || []) as WatchedGumShade[]
  const [customGumShadeName, setCustomGumShadeName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  // Defensive: handle both array and object with data property
  let brands: GumShadeBrand[] = []
  if (Array.isArray(gumShadeBrands)) {
    brands = gumShadeBrands
  } else if (gumShadeBrands && typeof gumShadeBrands === "object" && "data" in gumShadeBrands) {
    const data = (gumShadeBrands as { data?: GumShadeBrand[] | { data?: GumShadeBrand[] } }).data
    if (Array.isArray(data)) {
      brands = data
    } else if (data && typeof data === "object" && "data" in data) {
      brands = (data as { data?: GumShadeBrand[] }).data || []
    }
  }

  // State to track which brands are expanded
  const [expandedBrands, setExpandedBrands] = useState<Record<number, boolean>>({})

  // Toggle brand expansion
  const toggleBrandExpansion = (brandId: number) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brandId]: !prev[brandId],
    }))
  }

  // Generate a temporary ID for custom gum shade (using negative number to avoid conflicts)
  const generateCustomGumShadeId = (): number => {
    const existingIds = watchedGumShades.map((gs: WatchedGumShade) => 
      typeof gs.gum_shade_id === "number" ? gs.gum_shade_id : 0
    )
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom gum shade
  const handleAddCustomGumShade = () => {
    if (!customGumShadeName.trim()) {
      return // Don't add if name is empty
    }

    const customGumShadeId = generateCustomGumShadeId()
    
    // Store the custom gum shade name
    if (setCustomGumShadeNames) {
      setCustomGumShadeNames((prev) => ({
        ...prev,
        [customGumShadeId]: customGumShadeName.trim(),
      }))
    }

    // Add the custom gum shade to the form
    const currentList = watchedGumShades || []
    const newSequence = currentList.length === 0 
      ? 1 
      : Math.max(...currentList.map((gs: WatchedGumShade) => gs.sequence || 0)) + 1

    const newGumShade: WatchedGumShade = {
      gum_shade_id: customGumShadeId,
      sequence: newSequence,
    }

    setValue("gum_shades", [...currentList, newGumShade], { shouldDirty: true })

    // Reset form
    setCustomGumShadeName("")
    setShowCustomInput(false)
  }

  // Handle deleting custom gum shade
  const handleDeleteCustomGumShade = (id: number) => {
    // Remove from watched gum shades
    const updatedGumShades = watchedGumShades.filter(
      (gs: WatchedGumShade) => gs.gum_shade_id !== id
    )
    setValue("gum_shades", updatedGumShades, { shouldDirty: true })

    // Remove from custom gum shade names
    if (setCustomGumShadeNames) {
      setCustomGumShadeNames((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  // Get custom gum shades - show all custom shades that exist (either in watchedGumShades or in customGumShadeNames)
  const getCustomGumShades = (): Array<{ gum_shade_id: number; sequence?: number }> => {
    // Get all custom shade IDs from both watchedGumShades and customGumShadeNames
    const customIdsFromWatched = watchedGumShades
      .filter((gs: WatchedGumShade) => typeof gs.gum_shade_id === "number" && gs.gum_shade_id < 0)
      .map((gs: WatchedGumShade) => gs.gum_shade_id as number)
    
    const customIdsFromNames = Object.keys(customGumShadeNames).map(Number).filter(id => id < 0)
    
    // Combine and deduplicate
    const allCustomIds = [...new Set([...customIdsFromWatched, ...customIdsFromNames])]
    
    // Return array with gum_shade_id and sequence (get sequence from watchedGumShades if available)
    return allCustomIds.map((id) => {
      const watchedShade = watchedGumShades.find((gs: WatchedGumShade) => gs.gum_shade_id === id)
      return {
        gum_shade_id: id,
        sequence: watchedShade?.sequence ?? 1,
      }
    })
  }

  // Calculate selected count for each brand
  const getBrandSelectedCount = (brand: GumShadeBrand) => {
    if (!Array.isArray(brand.shades)) return 0
    return brand.shades.filter((shade: GumShade) =>
      watchedGumShades.some((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)
    ).length
  }

  // Check if all shades in a brand are selected
  const isBrandAllSelected = (brand: GumShadeBrand) => {
    if (!Array.isArray(brand.shades) || brand.shades.length === 0) return false
    return brand.shades.every((shade: GumShade) =>
      watchedGumShades.some((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)
    )
  }

  // Handle select all shades for a specific brand
  const handleSelectAllBrand = (brand: GumShadeBrand, checked: boolean) => {
    if (!Array.isArray(brand.shades) || brand.shades.length === 0) return

    const currentList = watchedGumShades || []
    let maxSequence = currentList.length === 0 
      ? 0 
      : Math.max(...currentList.map((gs: WatchedGumShade) => gs.sequence || 0))

    if (checked) {
      // Select all shades in this brand
      const newGumShades: WatchedGumShade[] = [...currentList]
      
      brand.shades.forEach((shade: GumShade, idx: number) => {
        const existingShade = watchedGumShades.find((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)
        if (!existingShade) {
          maxSequence += 1
          newGumShades.push({
            gum_shade_id: shade.id,
            sequence: maxSequence,
          })
        }
      })
      
      setValue("gum_shades", newGumShades, { shouldDirty: true })
    } else {
      // Deselect all shades in this brand
      const brandShadeIds = brand.shades.map((shade: GumShade) => shade.id)
      const updatedGumShades = currentList.filter(
        (gs: WatchedGumShade) => !brandShadeIds.includes(gs.gum_shade_id)
      )
      setValue("gum_shades", updatedGumShades, { shouldDirty: true })
    }
  }

  // Get all gum shades (from all brands + custom)
  const getAllGumShades = (): Array<{ id: number; sequence?: number }> => {
    const brandShades: Array<{ id: number; sequence?: number }> = []
    brands.forEach((brand) => {
      if (Array.isArray(brand.shades)) {
        brand.shades.forEach((shade: GumShade, idx: number) => {
          brandShades.push({
            id: shade.id,
            sequence: shade.sequence ?? idx + 1,
          })
        })
      }
    })
    
    const customShades = getCustomGumShades().map((cs) => ({
      id: cs.gum_shade_id,
      sequence: cs.sequence,
    }))
    
    return [...brandShades, ...customShades]
  }

  // Check if all gum shades are selected
  const allGumShades = getAllGumShades()
  const allGumShadeIds = allGumShades.map((gs) => gs.id)
  const selectedGumShadeIds = watchedGumShades.map((gs: WatchedGumShade) => gs.gum_shade_id)
  const allSelected = allGumShadeIds.length > 0 && allGumShadeIds.every((id) => selectedGumShadeIds.includes(id))

  // Handle select all gum shades
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all
      const currentList = watchedGumShades || []
      let maxSequence = currentList.length === 0 
        ? 0 
        : Math.max(...currentList.map((gs: WatchedGumShade) => gs.sequence || 0))
      
      const newGumShades: WatchedGumShade[] = []
      
      allGumShades.forEach((shade) => {
        const existingShade = watchedGumShades.find((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)
        if (existingShade) {
          newGumShades.push(existingShade)
        } else {
          maxSequence += 1
          newGumShades.push({
            gum_shade_id: shade.id,
            sequence: maxSequence,
          })
        }
      })
      
      setValue("gum_shades", newGumShades, { shouldDirty: true })
    } else {
      // Deselect all
      setValue("gum_shades", [], { shouldDirty: true })
    }
  }

  // Defensive: ensure brands is always an array
  if (!Array.isArray(brands)) {
    console.error("GumShadeSection: gumShadeBrands is not an array", gumShadeBrands)
    return (
      <div className="border-t px-6 py-4 text-red-500">
        Gum shade brands data is invalid or missing.
      </div>
    )
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Gum Shade</span>
          {sectionHasErrors(["gum_shades"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedGumShades.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedGumShades.length} selected</strong>
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-gum-shades"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
            />
            <Label
              htmlFor="select-all-gum-shades"
              className="text-xs text-[#1162a8] cursor-pointer font-medium"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(true)}
              className="text-xs h-7 px-3 border-[#1162a8] text-[#1162a8] hover:bg-[#1162a8] hover:text-white"
            >
              Use Default
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.gumShade}
            onCheckedChange={() => toggleSection("gumShade")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.gumShade ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("gumShade")}
          />
        </div>
      </div>
      {expandedSections.gumShade && sections.gumShade && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-700 mb-4">
            Choose the gum shade you accept for this product.
          </p>
          <div className="flex flex-col gap-4">
            {/* Brand Buttons */}
            <div className="flex flex-wrap gap-2">
              {brands.length > 0 ? (
                brands.map((brand) => {
                  const isExpanded = expandedBrands[brand.id] || false
                  const selectedCount = getBrandSelectedCount(brand)

                  return (
                    <Button
                      key={brand.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleBrandExpansion(brand.id)}
                      className={`rounded-full px-4 py-2 h-auto transition-colors ${
                        isExpanded
                          ? "bg-[#1162a8] text-white border-[#1162a8] hover:bg-[#1162a8]/90"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {!isExpanded && <Plus className="h-4 w-4 mr-1" />}
                      {brand.name}
                      {selectedCount > 0 && (
                        <span className={`ml-1.5 text-xs font-semibold ${
                          isExpanded ? "text-white" : "text-[#1162a8]"
                        }`}>
                          ({selectedCount})
                        </span>
                      )}
                    </Button>
                  )
                })
              ) : (
                <span className="text-gray-400 italic">No gum shade brands available.</span>
              )}
            </div>

            {/* Expanded Brand Shades List */}
            {brands.map((brand) => {
              const isExpanded = expandedBrands[brand.id] || false
              const totalShades = Array.isArray(brand.shades) ? brand.shades.length : 0

              if (!isExpanded) return null

              return (
                <div key={`shades-${brand.id}`} className="border rounded-lg">
                  <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700">{brand.name} Shades</span>
                      {Array.isArray(brand.shades) && brand.shades.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`select-all-brand-${brand.id}`}
                            checked={isBrandAllSelected(brand)}
                            onCheckedChange={(checked) => handleSelectAllBrand(brand, checked as boolean)}
                            className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                          />
                          <Label
                            htmlFor={`select-all-brand-${brand.id}`}
                            className="text-xs text-[#1162a8] cursor-pointer font-medium"
                          >
                            Select All
                          </Label>
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {totalShades} {totalShades === 1 ? "shade" : "shades"}
                    </span>
                  </div>
                  <div className="px-4 pb-4 pt-3">
                    <div className="flex flex-col gap-2">
                      {Array.isArray(brand.shades) && brand.shades.length > 0 ? (
                        brand.shades.map((shade: GumShade, idx: number) => {
                          const checkboxId = `gum-shade-${shade.id}`
                          const isChecked = watchedGumShades.some((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)

                          const handleLabelClick = (e: React.MouseEvent) => {
                            e.preventDefault()
                            handleToggleSelection(
                              "gum_shades",
                              shade.id,
                              shade.sequence ?? idx + 1
                            )
                          }

                          return (
                            <div key={shade.id} className="border rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors">
                                <Checkbox
                                  id={checkboxId}
                                  className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    handleToggleSelection(
                                      "gum_shades",
                                      shade.id,
                                      shade.sequence ?? idx + 1
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={checkboxId}
                                  className="cursor-pointer select-none flex-1 font-medium"
                                  onClick={handleLabelClick}
                                >
                                  {shade.name}
                                </Label>
                                {isChecked && (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>

                              {/* Accordion Content - Shows when selected */}
                              {isChecked && (
                                <div className="px-3 pb-3 pt-1 bg-gray-50 border-t">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    {shade.color_code_top && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Top:</span>
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: shade.color_code_top }}
                                          />
                                          <span className="text-gray-700 font-mono text-xs">{shade.color_code_top}</span>
                                        </div>
                                      </div>
                                    )}
                                    {shade.color_code_middle && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Middle:</span>
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: shade.color_code_middle }}
                                          />
                                          <span className="text-gray-700 font-mono text-xs">{shade.color_code_middle}</span>
                                        </div>
                                      </div>
                                    )}
                                    {shade.color_code_bottom && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Bottom:</span>
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: shade.color_code_bottom }}
                                          />
                                          <span className="text-gray-700 font-mono text-xs">{shade.color_code_bottom}</span>
                                        </div>
                                      </div>
                                    )}
                                    {shade.sequence && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Sequence:</span>
                                        <span className="text-gray-700">{shade.sequence}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-gray-400 italic">No shades for this brand.</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Custom Gum Shades Section */}
            {getCustomGumShades().length > 0 && (
              <div className="border rounded-lg">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <span className="font-medium text-gray-700">Custom Gum Shades</span>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <div className="flex flex-wrap gap-2">
                    {getCustomGumShades().map((customShade: WatchedGumShade) => {
                      const customShadeId = customShade.gum_shade_id
                      const customShadeName = customGumShadeNames[customShadeId] || "Custom Gum Shade"
                      const isChecked = watchedGumShades.some(
                        (gs: WatchedGumShade) => gs.gum_shade_id === customShadeId
                      )

                      return (
                        <div key={customShadeId} className="relative inline-block">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleSelection(
                                "gum_shades",
                                customShadeId,
                                customShade.sequence ?? 1
                              )
                            }
                            className={`rounded-full px-4 py-2 h-auto pr-8 transition-colors ${
                              isChecked
                                ? "bg-[#1162a8] text-white border-[#1162a8] hover:bg-[#1162a8]/90"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {!isChecked && <Plus className="h-4 w-4 mr-1" />}
                            {customShadeName}
                          </Button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteCustomGumShade(customShadeId)
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Add Custom Input or Button */}
            {showCustomInput ? (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="text"
                  placeholder="Enter gum shade name"
                  value={customGumShadeName}
                  onChange={(e) => setCustomGumShadeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomGumShade()
                    } else if (e.key === "Escape") {
                      setShowCustomInput(false)
                      setCustomGumShadeName("")
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomGumShade}
                  disabled={!customGumShadeName.trim()}
                  className="bg-[#1162a8] hover:bg-[#1162a8]/90"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomGumShadeName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[#1162a8] pl-0 flex items-center gap-1 mt-2"
                onClick={() => setShowCustomInput(true)}
              >
                <Plus className="h-4 w-4" /> Add Custom
              </Button>
            )}
          </div>
          <ValidationError message={getValidationError("gum_shades")} />
        </div>
      )}
    </div>
  )
}