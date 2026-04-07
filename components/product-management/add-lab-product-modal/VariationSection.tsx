import React from "react"
import { Controller, useWatch, Control, UseFormSetValue } from "react-hook-form"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Info, Image as ImageIcon, AlertCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ProductCreateForm } from "@/lib/schemas"

const MAX_TOOTH_COUNT = 15

/** Returns an error message if any number in the tooth_count string exceeds MAX_TOOTH_COUNT. */
function validateToothCount(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  // Accept "N" or "N - M" formats
  const parts = trimmed.split("-").map((p) => p.trim())
  for (const part of parts) {
    const n = parseInt(part, 10)
    if (!isNaN(n) && n > MAX_TOOTH_COUNT) {
      return `Max is ${MAX_TOOTH_COUNT} (16 teeth = Full Denture)`
    }
  }
  return null
}

interface ToothCountVariation {
  image?: string | null
  tooth_count?: string
  name_template?: string
}

interface VariationSectionProps {
  control: Control<ProductCreateForm>
  setValue: UseFormSetValue<ProductCreateForm>
  sections: Record<string, boolean>
  toggleSection: (section: string) => void
}

// Parse the preview label from tooth_count and name_template
// e.g. tooth_count "4 - 15", name_template "Stay plate [x tooth/teeth]" → "Stay plate 4 teeth"
function buildPreview(tooth_count: string, name_template: string): string {
  const countStr = tooth_count?.trim() ?? ""
  const template = name_template?.trim() ?? ""
  if (!countStr || !template) return ""

  // Determine displayed number: for ranges take the lower bound
  const rangeParts = countStr.split("-")
  const num = parseInt(rangeParts[0].trim(), 10)
  if (isNaN(num)) return template.replace("[x tooth/teeth]", countStr)

  const unit = num === 1 ? "tooth" : "teeth"
  return template.replace("[x tooth/teeth]", `${num} ${unit}`)
}

export function VariationSection({
  control,
  setValue,
  sections,
  toggleSection,
}: VariationSectionProps) {
  const enableVariation = useWatch({ control, name: "enable_tooth_count_variation" })
  const variations = (useWatch({ control, name: "tooth_count_variations" }) ?? []) as ToothCountVariation[]

  const setVal = React.useCallback(
    (name: string, value: any) => (setValue as any)(name, value),
    [setValue]
  )

  const handleAddVariation = () => {
    setVal("tooth_count_variations", [
      ...variations,
      { image: null, tooth_count: "", name_template: "" },
    ])
  }

  const handleDeleteVariation = (index: number) => {
    setVal(
      "tooth_count_variations",
      variations.filter((_, i) => i !== index)
    )
  }

  const handleVariationChange = (
    index: number,
    field: keyof ToothCountVariation,
    value: string | null
  ) => {
    const updated = variations.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    )
    setVal("tooth_count_variations", updated)
  }

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      handleVariationChange(index, "image", reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="px-4 sm:px-6 py-6 bg-white rounded-lg border border-gray-100">
      {/* Section header toggle */}
      <div className="flex items-center gap-3 mb-6">
        <Switch
          checked={sections.variation ?? false}
          onCheckedChange={() => toggleSection("variation")}
          className="data-[state=checked]:bg-[#1162a8]"
        />
        <span className="font-semibold text-xl text-gray-900">Variation</span>
      </div>

      <div
        className={cn(
          "space-y-6",
          !(sections.variation ?? false) && "opacity-50 pointer-events-none select-none"
        )}
      >
        {/* Enable dynamic variation toggle */}
        <div className="flex items-center gap-3">
          <Controller
            name="enable_tooth_count_variation"
            control={control}
            defaultValue="No"
            render={({ field }) => (
              <Switch
                checked={field.value === "Yes"}
                onCheckedChange={(checked) => field.onChange(checked ? "Yes" : "No")}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            )}
          />
          <span className="text-sm font-medium text-gray-700">
            Enable dynamic variation based on tooth count
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Dynamically update product names and images based on tooth count—no need
                  to clutter your catalog with separate listings.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Variation table — only visible when toggle is ON */}
        {enableVariation === "Yes" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div>
              <p className="font-semibold text-gray-800">Variation per arch</p>
              <p className="text-xs text-gray-500 mt-1">
                Add your custom name before or after the{" "}
                <span className="text-[#1162a8] font-medium">[x tooth/teeth]</span> text.
              </p>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_40px] gap-3 items-center text-xs font-semibold text-gray-600 border-b border-gray-200 pb-2">
              <span>Image</span>
              <span>Total # of teeth</span>
              <span>Name</span>
              <span>Preview</span>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddVariation}
                  className="text-xs px-3 py-1 h-7 rounded-lg"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #a855f7)", color: "white" }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add variation
                </Button>
              </div>
            </div>

            {/* Variation rows */}
            {variations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No variations yet. Click "+ Add variation" to get started.
              </p>
            )}

            {variations.map((variation, index) => {
              const preview = buildPreview(
                variation.tooth_count ?? "",
                variation.name_template ?? ""
              )
              const toothCountError = validateToothCount(variation.tooth_count ?? "")
              const fileInputRef = React.createRef<HTMLInputElement>()

              return (
                <div
                  key={index}
                  className="grid grid-cols-[80px_1fr_1fr_1fr_40px] gap-3 items-center"
                >
                  {/* Image upload */}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-14 w-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white hover:border-gray-400 transition-colors overflow-hidden"
                    >
                      {variation.image ? (
                        <img
                          src={variation.image}
                          alt="variation"
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(index, e)}
                    />
                  </div>

                  {/* Total # of teeth — allows ranges like "4 - 15", max 15 */}
                  <div className="space-y-1">
                    <Input
                      label="e.g. 1 or 4 - 15"
                      value={variation.tooth_count ?? ""}
                      onChange={(e) => handleVariationChange(index, "tooth_count", e.target.value)}
                      validationState={toothCountError ? "error" : undefined}
                    />
                    {toothCountError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        {toothCountError}
                      </p>
                    )}
                  </div>

                  {/* Name template */}
                  <Input
                    label="Name with [x tooth/teeth]"
                    value={variation.name_template ?? ""}
                    onChange={(e) =>
                      handleVariationChange(index, "name_template", e.target.value)
                    }
                    placeholder="e.g. Flipper [x tooth/teeth]"
                  />

                  {/* Preview */}
                  <span className="text-sm text-gray-700 truncate">{preview}</span>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteVariation(index)}
                    className="flex items-center justify-end text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove variation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
