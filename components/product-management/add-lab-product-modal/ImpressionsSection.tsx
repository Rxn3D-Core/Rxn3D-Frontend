import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Plus, AlertCircle, X, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"

type WatchedImpression = {
  impression_id: number
  sequence?: number
  status?: string
}

type ImpressionsSectionProps = {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  impressions: Array<{ id: number; name: string; sequence?: number }>
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: any
  toggleExpanded: (section: string) => void
  handleToggleSelection: (section: string, id: number, sequence?: number) => void
  customImpressionNames?: Record<number, string>
  setCustomImpressionNames?: React.Dispatch<React.SetStateAction<Record<number, string>>>
}

export function ImpressionsSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  impressions,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  customImpressionNames = {},
  setCustomImpressionNames,
}: ImpressionsSectionProps) {
  const watchedImpressions = watch("impressions") || []
  const [customImpressionName, setCustomImpressionName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Generate a temporary ID for custom impression (using negative number to avoid conflicts)
  const generateCustomImpressionId = (): number => {
    const existingIds = watchedImpressions.map((i: WatchedImpression) => typeof i.impression_id === "number" ? i.impression_id : 0)
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom impression
  const handleAddCustomImpression = () => {
    if (!customImpressionName.trim()) {
      return // Don't add if name is empty
    }

    const customImpressionId = generateCustomImpressionId()
    
    // Store the custom impression name
    if (setCustomImpressionNames) {
      setCustomImpressionNames((prev) => ({
        ...prev,
        [customImpressionId]: customImpressionName.trim(),
      }))
    }

    // Add the custom impression to the form
    const currentList = watchedImpressions || []
    const newSequence = currentList.length === 0 ? 1 : Math.max(...currentList.map((i: WatchedImpression) => i.sequence || 0)) + 1

    const newImpression = {
      impression_id: customImpressionId,
      sequence: newSequence,
      status: "Active",
    }

    setValue("impressions", [...currentList, newImpression], { shouldDirty: true })

    // Reset form
    setCustomImpressionName("")
    setShowCustomInput(false)
  }

  // Handle deleting custom impression
  const handleDeleteCustomImpression = (id: number) => {
    // Remove from watched impressions
    const updatedImpressions = watchedImpressions.filter(
      (i: WatchedImpression) => i.impression_id !== id
    )
    setValue("impressions", updatedImpressions, { shouldDirty: true })

    // Remove from custom impression names
    if (setCustomImpressionNames) {
      setCustomImpressionNames((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  // Get all impressions including custom ones
  const getAllImpressions = () => {
    const standardImpressions = impressions.map((imp) => ({
      id: imp.id,
      name: imp.name,
      sequence: imp.sequence,
      isCustom: false,
    }))

    // Add custom impressions from watchedImpressions
    const customImpressionIds = watchedImpressions
      .map((i: WatchedImpression) => i.impression_id)
      .filter((id: number | string | undefined): id is number => typeof id === "number" && id < 0)

    const customImpressions = customImpressionIds.map((id: number) => ({
      id: id,
      name: customImpressionNames[id] || "Custom Impression",
      sequence: undefined,
      isCustom: true,
    }))

    return [...standardImpressions, ...customImpressions]
  }

  // Check if all impressions are selected
  const allImpressions = getAllImpressions()
  const allImpressionIds = allImpressions.map((imp) => imp.id)
  const selectedImpressionIds = watchedImpressions.map((i: WatchedImpression) => i.impression_id)
  const allSelected = allImpressionIds.length > 0 && allImpressionIds.every((id) => selectedImpressionIds.includes(id))

  // Handle select all impressions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all
      const currentList = watchedImpressions || []
      let maxSequence = currentList.length === 0 
        ? 0 
        : Math.max(...currentList.map((i: WatchedImpression) => i.sequence || 0))
      
      const newImpressions: WatchedImpression[] = []
      
      allImpressions.forEach((impression) => {
        const existingImpression = watchedImpressions.find((i: WatchedImpression) => i.impression_id === impression.id)
        if (existingImpression) {
          newImpressions.push(existingImpression)
        } else {
          maxSequence += 1
          newImpressions.push({
            impression_id: impression.id,
            sequence: maxSequence,
            status: "Active",
          })
        }
      })
      
      setValue("impressions", newImpressions, { shouldDirty: true })
    } else {
      // Deselect all
      setValue("impressions", [], { shouldDirty: true })
    }
  }
  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Impressions</span>
          {sectionHasErrors(["impressions"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedImpressions.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedImpressions.length} selected</strong>
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-impressions"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
            />
            <Label
              htmlFor="select-all-impressions"
              className="text-xs text-[#1162a8] cursor-pointer font-medium"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.impressions}
            onCheckedChange={() => toggleSection("impressions")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.impressions ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("impressions")}
          />
        </div>
      </div>
      {expandedSections.impressions && sections.impressions && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-700 mb-4">
            Choose the impressions you accept for this product.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
            {getAllImpressions().map((impression) => {
              const checked = watchedImpressions.some((i: WatchedImpression) => i.impression_id === impression.id)
              const checkboxId = `impression-${impression.id}`
              const isCustom = impression.isCustom || false
              
              return (
                <div
                  key={impression.id}
                  className={`flex items-center gap-2 ${!isCustom ? "rounded-md px-2 py-1 transition-colors" : ""}
                    ${!isCustom && checked
                      ? "bg-[#1162a8]/10 text-[#1162a8] font-semibold"
                      : !isCustom
                      ? "bg-white text-gray-700"
                      : ""
                    }`}
                >
                  <Checkbox
                    id={checkboxId}
                    className={`border-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white`}
                    checked={checked}
                    onCheckedChange={() =>
                      handleToggleSelection("impressions", impression.id, impression.sequence)
                    }
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="cursor-pointer flex-1"
                    onClick={(e) => {
                      e.preventDefault()
                      handleToggleSelection("impressions", impression.id, impression.sequence)
                    }}
                  >
                    {impression.name}
                  </Label>
                  {isCustom && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteCustomImpression(impression.id)
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
            {showCustomInput ? (
              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 mt-2">
                <Input
                  type="text"
                  placeholder="Enter impression name"
                  value={customImpressionName}
                  onChange={(e) => setCustomImpressionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomImpression()
                    } else if (e.key === "Escape") {
                      setShowCustomInput(false)
                      setCustomImpressionName("")
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomImpression}
                  disabled={!customImpressionName.trim()}
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
                    setCustomImpressionName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="flex items-center gap-2 text-[#1162a8] col-span-2 sm:col-span-4 mt-2 px-2 py-1 rounded hover:bg-[#1162a8]/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Custom</span>
              </button>
            )}
          </div>
          <ValidationError message={getValidationError("impressions")} />
        </div>
      )}
    </div>
  )
}
