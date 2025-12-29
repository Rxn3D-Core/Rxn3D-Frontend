import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Plus, AlertCircle, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"

type WatchedTeethShade = {
  teeth_shade_id: number
  sequence?: number
}

type TeethShade = {
  id: number
  name: string
  brand_id: number
  sequence?: number
  status?: string
  color_code_incisal?: string
  color_code_body?: string
  color_code_cervical?: string
}

type TeethShadeBrand = {
  id: number
  name: string
  system_name?: string
  status?: string
  sequence?: number
  shades?: TeethShade[]
}

type TeethShadeSectionProps = {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  teethShadeBrands: TeethShadeBrand[] | { data?: TeethShadeBrand[] }
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: any
  toggleExpanded: (section: string) => void
  handleToggleSelection: (section: string, id: number, sequence?: number) => void
  customTeethShadeNames?: Record<number, string>
  setCustomTeethShadeNames?: React.Dispatch<React.SetStateAction<Record<number, string>>>
}

export function TeethShadeSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  teethShadeBrands,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  customTeethShadeNames = {},
  setCustomTeethShadeNames,
}: TeethShadeSectionProps) {
  const watchedTeethShades = (watch("teeth_shades") || []) as WatchedTeethShade[]
  // Deduplicate by teeth_shade_id
  const uniqueTeethShades = Array.isArray(watchedTeethShades)
    ? watchedTeethShades.filter(
        (item, idx, arr) =>
          arr.findIndex((x) => x.teeth_shade_id === item.teeth_shade_id) === idx
      )
    : []
  
  const [customTeethShadeName, setCustomTeethShadeName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  
  // Defensive: handle both array and object with data property
  let brands: TeethShadeBrand[] = []
  if (Array.isArray(teethShadeBrands)) {
    brands = teethShadeBrands
  } else if (teethShadeBrands && typeof teethShadeBrands === "object" && "data" in teethShadeBrands) {
    const data = (teethShadeBrands as { data?: TeethShadeBrand[] | { data?: TeethShadeBrand[] } }).data
    if (Array.isArray(data)) {
      brands = data
    } else if (data && typeof data === "object" && "data" in data) {
      brands = (data as { data?: TeethShadeBrand[] }).data || []
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

  // Generate a temporary ID for custom teeth shade (using negative number to avoid conflicts)
  const generateCustomTeethShadeId = (): number => {
    const existingIds = uniqueTeethShades.map((ts: WatchedTeethShade) => 
      typeof ts.teeth_shade_id === "number" ? ts.teeth_shade_id : 0
    )
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom teeth shade
  const handleAddCustomTeethShade = () => {
    if (!customTeethShadeName.trim()) {
      return // Don't add if name is empty
    }

    const customTeethShadeId = generateCustomTeethShadeId()
    
    // Store the custom teeth shade name
    if (setCustomTeethShadeNames) {
      setCustomTeethShadeNames((prev) => ({
        ...prev,
        [customTeethShadeId]: customTeethShadeName.trim(),
      }))
    }

    // Add the custom teeth shade to the form
    const currentList = uniqueTeethShades || []
    const newSequence = currentList.length === 0 
      ? 1 
      : Math.max(...currentList.map((ts: WatchedTeethShade) => ts.sequence || 0)) + 1

    const newTeethShade: WatchedTeethShade = {
      teeth_shade_id: customTeethShadeId,
      sequence: newSequence,
    }

    setValue("teeth_shades", [...currentList, newTeethShade], { shouldDirty: true })

    // Reset form
    setCustomTeethShadeName("")
    setShowCustomInput(false)
  }

  // Handle deleting custom teeth shade
  const handleDeleteCustomTeethShade = (id: number) => {
    // Remove from watched teeth shades
    const updatedTeethShades = uniqueTeethShades.filter(
      (ts: WatchedTeethShade) => ts.teeth_shade_id !== id
    )
    setValue("teeth_shades", updatedTeethShades, { shouldDirty: true })

    // Remove from custom teeth shade names
    if (setCustomTeethShadeNames) {
      setCustomTeethShadeNames((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  // Get custom teeth shades - show all custom shades that exist (either in watchedTeethShades or in customTeethShadeNames)
  const getCustomTeethShades = (): Array<{ teeth_shade_id: number; sequence?: number }> => {
    // Get all custom shade IDs from both watchedTeethShades and customTeethShadeNames
    const customIdsFromWatched = uniqueTeethShades
      .filter((ts: WatchedTeethShade) => typeof ts.teeth_shade_id === "number" && ts.teeth_shade_id < 0)
      .map((ts: WatchedTeethShade) => ts.teeth_shade_id as number)
    
    const customIdsFromNames = Object.keys(customTeethShadeNames).map(Number).filter(id => id < 0)
    
    // Combine and deduplicate
    const allCustomIds = [...new Set([...customIdsFromWatched, ...customIdsFromNames])]
    
    // Return array with teeth_shade_id and sequence (get sequence from watchedTeethShades if available)
    return allCustomIds.map((id) => {
      const watchedShade = uniqueTeethShades.find((ts: WatchedTeethShade) => ts.teeth_shade_id === id)
      return {
        teeth_shade_id: id,
        sequence: watchedShade?.sequence ?? 1,
      }
    })
  }

  // Calculate selected count for each brand
  const getBrandSelectedCount = (brand: TeethShadeBrand) => {
    if (!Array.isArray(brand.shades)) return 0
    return brand.shades.filter((shade: TeethShade) =>
      uniqueTeethShades.some((ts: WatchedTeethShade) => ts.teeth_shade_id === shade.id)
    ).length
  }

  // Check if all shades in a brand are selected
  const isBrandAllSelected = (brand: TeethShadeBrand) => {
    if (!Array.isArray(brand.shades) || brand.shades.length === 0) return false
    return brand.shades.every((shade: TeethShade) =>
      uniqueTeethShades.some((ts: WatchedTeethShade) => ts.teeth_shade_id === shade.id)
    )
  }

  // Handle select all shades for a specific brand
  const handleSelectAllBrand = (brand: TeethShadeBrand, checked: boolean) => {
    if (!Array.isArray(brand.shades) || brand.shades.length === 0) return

    const currentList = uniqueTeethShades || []
    let maxSequence = currentList.length === 0 
      ? 0 
      : Math.max(...currentList.map((ts: WatchedTeethShade) => ts.sequence || 0))

    if (checked) {
      // Select all shades in this brand
      const newTeethShades: WatchedTeethShade[] = [...currentList]
      
      brand.shades.forEach((shade: TeethShade, idx: number) => {
        const existingShade = uniqueTeethShades.find((ts: WatchedTeethShade) => ts.teeth_shade_id === shade.id)
        if (!existingShade) {
          maxSequence += 1
          newTeethShades.push({
            teeth_shade_id: shade.id,
            sequence: maxSequence,
          })
        }
      })
      
      setValue("teeth_shades", newTeethShades, { shouldDirty: true })
    } else {
      // Deselect all shades in this brand
      const brandShadeIds = brand.shades.map((shade: TeethShade) => shade.id)
      const updatedTeethShades = currentList.filter(
        (ts: WatchedTeethShade) => !brandShadeIds.includes(ts.teeth_shade_id)
      )
      setValue("teeth_shades", updatedTeethShades, { shouldDirty: true })
    }
  }

  // Get all teeth shades (from all brands + custom)
  const getAllTeethShades = (): Array<{ id: number; sequence?: number }> => {
    const brandShades: Array<{ id: number; sequence?: number }> = []
    brands.forEach((brand) => {
      if (Array.isArray(brand.shades)) {
        brand.shades.forEach((shade: TeethShade, idx: number) => {
          brandShades.push({
            id: shade.id,
            sequence: shade.sequence ?? idx + 1,
          })
        })
      }
    })
    
    const customShades = getCustomTeethShades().map((cs) => ({
      id: cs.teeth_shade_id,
      sequence: cs.sequence,
    }))
    
    return [...brandShades, ...customShades]
  }

  // Check if all teeth shades are selected
  const allTeethShades = getAllTeethShades()
  const allTeethShadeIds = allTeethShades.map((ts) => ts.id)
  const selectedTeethShadeIds = uniqueTeethShades.map((ts: WatchedTeethShade) => ts.teeth_shade_id)
  const allSelected = allTeethShadeIds.length > 0 && allTeethShadeIds.every((id) => selectedTeethShadeIds.includes(id))

  // Handle select all teeth shades
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all
      const currentList = uniqueTeethShades || []
      let maxSequence = currentList.length === 0 
        ? 0 
        : Math.max(...currentList.map((ts: WatchedTeethShade) => ts.sequence || 0))
      
      const newTeethShades: WatchedTeethShade[] = []
      
      allTeethShades.forEach((shade) => {
        const existingShade = uniqueTeethShades.find((ts: WatchedTeethShade) => ts.teeth_shade_id === shade.id)
        if (existingShade) {
          newTeethShades.push(existingShade)
        } else {
          maxSequence += 1
          newTeethShades.push({
            teeth_shade_id: shade.id,
            sequence: maxSequence,
          })
        }
      })
      
      setValue("teeth_shades", newTeethShades, { shouldDirty: true })
    } else {
      // Deselect all
      setValue("teeth_shades", [], { shouldDirty: true })
    }
  }

  // Defensive: ensure brands is always an array
  if (!Array.isArray(brands)) {
    console.error("TeethShadeSection: teethShadeBrands is not an array", teethShadeBrands)
    return (
      <div className="border-t px-6 py-4 text-red-500">
        Teeth shade brands data is invalid or missing.
      </div>
    )
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Teeth Shade</span>
          {sectionHasErrors(["teeth_shades"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${uniqueTeethShades.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{uniqueTeethShades.length} selected</strong>
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-teeth-shades"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
            />
            <Label
              htmlFor="select-all-teeth-shades"
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
            checked={sections.teethShade}
            onCheckedChange={() => toggleSection("teethShade")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.teethShade ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("teethShade")}
          />
        </div>
      </div>
      {expandedSections.teethShade && sections.teethShade && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-700 mb-4">
            Choose your preferred teeth shade system for this product.
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
                      <span className="flex items-center gap-2">
                        {brand.system_name && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            isExpanded 
                              ? "bg-white/20 text-white" 
                              : "bg-[#1162a8]/10 text-[#1162a8]"
                          }`}>
                            {brand.system_name}
                          </span>
                        )}
                        <span>{brand.name}</span>
                      </span>
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
                <span className="text-gray-400 italic">No teeth shade brands available.</span>
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
                        brand.shades.map((shade: TeethShade, idx: number) => {
                          const checkboxId = `teeth-shade-${shade.id}`
                          const isChecked = uniqueTeethShades.some((ts: WatchedTeethShade) => ts.teeth_shade_id === shade.id)

                          const handleLabelClick = (e: React.MouseEvent) => {
                            e.preventDefault()
                            handleToggleSelection(
                              "teeth_shades",
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
                                      "teeth_shades",
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
                                    {shade.color_code_incisal && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Incisal:</span>
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: shade.color_code_incisal }}
                                          />
                                          <span className="text-gray-700 font-mono text-xs">{shade.color_code_incisal}</span>
                                        </div>
                                      </div>
                                    )}
                                    {shade.color_code_body && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Body:</span>
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: shade.color_code_body }}
                                          />
                                          <span className="text-gray-700 font-mono text-xs">{shade.color_code_body}</span>
                                        </div>
                                      </div>
                                    )}
                                    {shade.color_code_cervical && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Cervical:</span>
                                        <div className="flex items-center gap-1">
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: shade.color_code_cervical }}
                                          />
                                          <span className="text-gray-700 font-mono text-xs">{shade.color_code_cervical}</span>
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
            
            {/* Custom Teeth Shades Section */}
            {getCustomTeethShades().length > 0 && (
              <div className="border rounded-lg">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <span className="font-medium text-gray-700">Custom Teeth Shades</span>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <div className="flex flex-wrap gap-2">
                    {getCustomTeethShades().map((customShade) => {
                      const customShadeId = customShade.teeth_shade_id
                      const customShadeName = customTeethShadeNames[customShadeId] || "Custom Teeth Shade"
                      const isChecked = uniqueTeethShades.some(
                        (ts: WatchedTeethShade) => ts.teeth_shade_id === customShadeId
                      )

                      return (
                        <div key={customShadeId} className="relative inline-block">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleSelection(
                                "teeth_shades",
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
                              handleDeleteCustomTeethShade(customShadeId)
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
                  placeholder="Enter teeth shade name"
                  value={customTeethShadeName}
                  onChange={(e) => setCustomTeethShadeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomTeethShade()
                    } else if (e.key === "Escape") {
                      setShowCustomInput(false)
                      setCustomTeethShadeName("")
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomTeethShade}
                  disabled={!customTeethShadeName.trim()}
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
                    setCustomTeethShadeName("")
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
          <ValidationError message={getValidationError("teeth_shades")} />
        </div>
      )}
    </div>
  )
}
