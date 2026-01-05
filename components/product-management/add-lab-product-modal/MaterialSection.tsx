import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Plus, AlertCircle, X, Trash2, Search } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { generateCodeFromName } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useWatch } from "react-hook-form"

type WatchedMaterial = {
  material_id: number
  sequence?: number
  is_default?: "Yes" | "No"
  price?: number
}

type Material = {
  id: number
  name: string
  sequence?: number
}

type MaterialSectionProps = {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  materials: Material[]
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: any
  toggleExpanded: (section: string) => void
  handleToggleSelection: (section: string, id: number, sequence?: number) => void
  customMaterialNames?: Record<number, string>
  setCustomMaterialNames?: React.Dispatch<React.SetStateAction<Record<number, string>>>
  onMaterialCreated?: () => void // Callback to refresh materials list
}

export function MaterialSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  materials,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  customMaterialNames = {},
  setCustomMaterialNames,
  onMaterialCreated,
}: MaterialSectionProps) {
  const watchedMaterials = (useWatch({ control, name: "materials" }) || []) as WatchedMaterial[]
  const [customMaterialName, setCustomMaterialName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [hideUnselected, setHideUnselected] = useState(false)
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false)
  const { toast } = useToast()

  // Helper function to get auth token
  const getAuthToken = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('token') || ''
  }

  // Helper function to get customer ID
  const getCustomerId = () => {
    if (typeof window === 'undefined') return null
    
    const role = localStorage.getItem('role')
    const isLabAdmin = role === 'lab_admin'
    const isSuperAdmin = role === 'superadmin'
    const isOfficeAdmin = role === 'office_admin'
    const isDoctor = role === 'doctor'
    
    if (isOfficeAdmin || isDoctor) {
      const selectedLabId = localStorage.getItem('selectedLabId')
      if (selectedLabId) {
        return Number(selectedLabId)
      }
    } else if (isLabAdmin || isSuperAdmin) {
      const customerId = localStorage.getItem('customerId')
      if (customerId) {
        return parseInt(customerId, 10)
      }
    }
    
    return null
  }
  
  // Generate a temporary ID for custom material (using negative number to avoid conflicts)
  const generateCustomMaterialId = (): number => {
    const existingIds = watchedMaterials.map((m: WatchedMaterial) => 
      typeof m.material_id === "number" ? m.material_id : 0
    )
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom material
  const handleAddCustomMaterial = async () => {
    if (!customMaterialName.trim()) {
      return // Don't add if name is empty
    }

    setIsCreatingMaterial(true)

    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found",
          variant: "destructive",
        })
        setIsCreatingMaterial(false)
        return
      }

      const customerId = getCustomerId()
      const materialName = customMaterialName.trim()
      const materialCode = generateCodeFromName(materialName)

      // Prepare payload
      const payload: any = {
        name: materialName,
        code: materialCode,
        sequence: 1,
        status: "Active",
        price: 0,
      }

      // Add customer_id if available (for lab admin)
      if (customerId) {
        payload.customer_id = customerId
        payload.is_custom = "Yes"
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"
      const response = await fetch(`${API_BASE_URL}/library/materials`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        
        const errorData = await response.json().catch(() => ({}))
        
        // Handle validation errors
        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              messages.forEach((message) => {
                toast({
                  title: `Validation Error - ${field}`,
                  description: message,
                  variant: "destructive",
                })
              })
            }
          })
        } else {
          toast({
            title: "Error",
            description: errorData?.message || "Failed to create material",
            variant: "destructive",
          })
        }
        
        setIsCreatingMaterial(false)
        return
      }

      const result = await response.json()

      if (result?.data && result.data.id) {
        // Ensure material_id is a number
        const createdMaterialId = Number(result.data.id)
        
        if (isNaN(createdMaterialId) || createdMaterialId <= 0) {
          throw new Error(`Invalid material ID received: ${result.data.id}`)
        }

        // Add the created material to the form
        const currentList = watchedMaterials || []
        const newSequence = currentList.length === 0 
          ? 1 
          : Math.max(...currentList.map((m: WatchedMaterial) => m.sequence || 0), 0) + 1

        const newMaterial: WatchedMaterial = {
          material_id: createdMaterialId,
          sequence: newSequence,
          is_default: "No",
          price: 0,
        }

        setValue("materials", [...currentList, newMaterial], { 
          shouldDirty: true,
          shouldValidate: true 
        })

        toast({
          title: "Material Created",
          description: `Successfully created ${materialName}`,
          variant: "default",
        })

        // Refresh materials list if callback is provided
        if (onMaterialCreated) {
          try {
            await onMaterialCreated()
          } catch (error) {
            console.error("Error refreshing materials list:", error)
            // Don't throw - material was created successfully, just refresh failed
          }
        }

        // Reset form
        setCustomMaterialName("")
        setShowCustomInput(false)
      } else {
        throw new Error(`Invalid response from server. Expected data.id, got: ${JSON.stringify(result)}`)
      }
    } catch (error: any) {
      console.error("Error creating material:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create material. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingMaterial(false)
    }
  }

  // Handle deleting custom material
  const handleDeleteCustomMaterial = (id: number) => {
    // Remove from watched materials
    const updatedMaterials = watchedMaterials.filter(
      (m: WatchedMaterial) => m.material_id !== id
    )
    setValue("materials", updatedMaterials, { shouldDirty: true })

    // Remove from custom material names
    if (setCustomMaterialNames) {
      setCustomMaterialNames((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  // Get custom materials - show all custom materials that exist (either in watchedMaterials or in customMaterialNames)
  const getCustomMaterials = (): Array<{ material_id: number; sequence?: number }> => {
    // Get all custom material IDs from both watchedMaterials and customMaterialNames
    const customIdsFromWatched = watchedMaterials
      .filter((m: WatchedMaterial) => typeof m.material_id === "number" && m.material_id < 0)
      .map((m: WatchedMaterial) => m.material_id as number)
    
    const customIdsFromNames = Object.keys(customMaterialNames).map(Number).filter(id => id < 0)
    
    // Combine and deduplicate
    const allCustomIds = [...new Set([...customIdsFromWatched, ...customIdsFromNames])]
    
    // Return array with material_id and sequence (get sequence from watchedMaterials if available)
    return allCustomIds.map((id) => {
      const watchedMaterial = watchedMaterials.find((m: WatchedMaterial) => m.material_id === id)
      return {
        material_id: id,
        sequence: watchedMaterial?.sequence ?? 1,
      }
    })
  }

  // Helper to get selected material by id
  const getSelectedMaterial = (id: number) => watchedMaterials.find((m: WatchedMaterial) => m.material_id === id)

  // Handle setting default material
  const handleSetDefaultMaterial = (materialId: number, isDefault: "Yes" | "No") => {
    const updated = watchedMaterials.map((m) =>
      m.material_id === materialId
        ? { ...m, is_default: isDefault }
        : { ...m, is_default: "No" as const }
    )
    setValue("materials", updated, { shouldDirty: true })
  }

  // Handle price update
  const handlePriceChange = (materialId: number, price: string) => {
    const numPrice = price === "" ? 0 : parseFloat(price) || 0
    const updated = watchedMaterials.map((m) =>
      m.material_id === materialId
        ? { ...m, price: numPrice }
        : m
    )
    setValue("materials", updated, { shouldDirty: true })
  }

  // Filter materials by search query
  const filteredMaterials = materials.filter((material) =>
    material.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter custom materials by search query
  const filteredCustomMaterials = getCustomMaterials().filter((customMaterial) => {
    const customName = customMaterialNames[customMaterial.material_id] || "Custom Material"
    return customName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Combine all materials (regular + custom) for filtering
  const allMaterialsForDisplay = [
    ...filteredMaterials.map((m) => ({ id: m.id, name: m.name, isCustom: false })),
    ...filteredCustomMaterials.map((m) => ({
      id: m.material_id,
      name: customMaterialNames[m.material_id] || "Custom Material",
      isCustom: true,
    })),
  ]

  // Filter based on hideUnselected
  const displayMaterials = hideUnselected
    ? allMaterialsForDisplay.filter((m) => watchedMaterials.some((wm) => wm.material_id === m.id))
    : allMaterialsForDisplay

  // Check if all filtered materials are selected
  const allFilteredMaterialIds = displayMaterials.map((m) => m.id)
  const selectedIds = watchedMaterials.map((m: WatchedMaterial) => m.material_id)
  const allSelected = allFilteredMaterialIds.length > 0 && allFilteredMaterialIds.every((id) => selectedIds.includes(id))

  // Handle select all materials
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all filtered materials
      const currentList = watchedMaterials || []
      const newMaterials = [...currentList]
      let maxSequence = currentList.length === 0 
        ? 0 
        : Math.max(...currentList.map((m: WatchedMaterial) => m.sequence || 0), 0)
      
      displayMaterials.forEach((material) => {
        const existing = watchedMaterials.find((m: WatchedMaterial) => m.material_id === material.id)
        if (!existing) {
          maxSequence += 1
          newMaterials.push({
            material_id: material.id,
            sequence: maxSequence,
            is_default: "No",
            price: 0,
          })
        }
      })
      
      setValue("materials", newMaterials, { shouldDirty: true })
    } else {
      // Deselect all filtered materials
      const remainingMaterials = watchedMaterials.filter(
        (m) => !displayMaterials.some((dm) => dm.id === m.material_id)
      )
      setValue("materials", remainingMaterials, { shouldDirty: true })
    }
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Material</span>
          {sectionHasErrors(["materials"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedMaterials.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedMaterials.length} selected</strong>
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-materials"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
            />
            <Label
              htmlFor="select-all-materials"
              className="text-xs text-[#1162a8] cursor-pointer font-medium"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.material}
            onCheckedChange={() => toggleSection("material")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.material ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("material")}
          />
        </div>
      </div>
      {expandedSections.material && sections.material && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="hide-unselected-materials">Hide unselected materials?</Label>
            {["Yes", "No"].map((option) => (
              <div key={option} className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 ${(option === "Yes" && hideUnselected) || (option === "No" && !hideUnselected) ? "border-[#1162a8]" : "border-gray-300"
                    } flex items-center justify-center cursor-pointer`}
                  onClick={() => setHideUnselected(option === "Yes")}
                >
                  {((option === "Yes" && hideUnselected) || (option === "No" && !hideUnselected)) && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1162a8]"></div>
                  )}
                </div>
                <span className="ml-2 text-sm">{option}</span>
              </div>
            ))}
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search Materials to change default"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="border rounded">
            <div
              className="grid grid-cols-[40px_1fr_120px_140px_32px] gap-2 font-medium text-sm border-b px-4 py-2"
              style={{ color: "rgb(17 98 168)" }}
            >
              <div></div>
              <div>Material</div>
              <div>Use Default</div>
              <div>Price</div>
              <div></div>
            </div>
            {displayMaterials.map((material) => {
              const selected = getSelectedMaterial(material.id)
              const isDefault = selected?.is_default === "Yes"
              const isCustom = material.isCustom
              
              return (
                <div
                  key={material.id}
                  className="grid grid-cols-[40px_1fr_120px_140px_32px] items-center gap-2 px-4 py-2 border-b last:border-b-0"
                  style={selected ? { backgroundColor: "rgba(17,98,168,0.07)" } : {}}
                >
                  <div>
                    <Checkbox
                      checked={!!selected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const currentList = watchedMaterials || []
                          const maxSequence = currentList.length === 0 
                            ? 0 
                            : Math.max(...currentList.map((m: WatchedMaterial) => m.sequence || 0), 0)
                          const newMaterial: WatchedMaterial = {
                            material_id: material.id,
                            sequence: maxSequence + 1,
                            is_default: "No",
                            price: 0,
                          }
                          setValue("materials", [...currentList, newMaterial], { shouldDirty: true })
                        } else {
                          setValue(
                            "materials",
                            watchedMaterials.filter((m: WatchedMaterial) => m.material_id !== material.id),
                            { shouldDirty: true }
                          )
                        }
                      }}
                      className="data-[state=checked]:bg-[rgb(17,98,168)] border-[rgb(17,98,168)]"
                    />
                  </div>
                  <div className={selected ? "font-medium" : ""} style={selected ? { color: "rgb(17,98,168)" } : {}}>
                    {material.name}
                  </div>
                  <div className="flex items-center">
                    {selected ? (
                      <Checkbox
                        checked={isDefault}
                        onCheckedChange={(checked) => {
                          handleSetDefaultMaterial(material.id, checked ? "Yes" : "No")
                        }}
                        className="data-[state=checked]:bg-[rgb(17,98,168)] border-[rgb(17,98,168)]"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </div>
                  <div>
                    {selected ? (
                      <Input
                        type="number"
                        min="0"
                        max="999999.99"
                        step="0.01"
                        placeholder="0.00"
                        value={selected.price !== undefined && selected.price !== null ? selected.price : ""}
                        onChange={(e) => handlePriceChange(material.id, e.target.value)}
                        className="h-8 text-sm"
                        onBlur={(e) => {
                          const value = e.target.value
                          if (value === "" || isNaN(parseFloat(value))) {
                            handlePriceChange(material.id, "0")
                          }
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </div>
                  <div>
                    {isCustom && selected && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteCustomMaterial(material.id)
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Add Custom Input or Button */}
          {showCustomInput ? (
            <div className="flex items-center gap-2 mt-4">
              <Input
                type="text"
                placeholder="Enter material name"
                value={customMaterialName}
                onChange={(e) => setCustomMaterialName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingMaterial) {
                    e.preventDefault()
                    handleAddCustomMaterial()
                  } else if (e.key === "Escape") {
                    setShowCustomInput(false)
                    setCustomMaterialName("")
                  }
                }}
                className="flex-1"
                autoFocus
                disabled={isCreatingMaterial}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddCustomMaterial}
                disabled={!customMaterialName.trim() || isCreatingMaterial}
                className="bg-[#1162a8] hover:bg-[#1162a8]/90"
              >
                {isCreatingMaterial ? "Creating..." : "Add"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomMaterialName("")
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
              className="text-[#1162a8] pl-0 flex items-center gap-1 mt-4"
              onClick={() => setShowCustomInput(true)}
            >
              <Plus className="h-4 w-4" /> Add Custom
            </Button>
          )}
          <ValidationError message={getValidationError("materials")} />
        </div>
      )}
    </div>
  )
}
