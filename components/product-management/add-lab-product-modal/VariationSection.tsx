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

function validateToothCount(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
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

function buildPreview(tooth_count: string, name_template: string): string {
  const countStr = tooth_count?.trim() ?? ""
  const template = name_template?.trim() ?? ""
  if (!countStr || !template) return ""

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
  const isTeethBased = useWatch({ control, name: "is_teeth_based_price" })
  const enableVariation = useWatch({ control, name: "enable_tooth_count_variation" })
  const variations = (useWatch({ control, name: "tooth_count_variations" }) ?? []) as ToothCountVariation[]

  const setVal = React.useCallback(
    (name: string, value: unknown) => (setValue as (name: string, value: unknown) => void)(name, value),
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

  if (isTeethBased !== "Yes") {
    return (
      <div className="px-4 sm:px-6 py-6 bg-white rounded-lg border border-gray-100 flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
        <span className="text-gray-400 text-sm">
          Enable <strong>Charge product per tooth</strong> in Product Details to configure variations.
        </span>
      </div>
    )
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
        <span className="font-semibold text-xl text-gray-900" style={{ fontFamily: "Verdana, sans-serif" }}>
          Variation
        </span>
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
          <span className="text-sm font-medium text-gray-700" style={{ fontFamily: "Verdana, sans-serif" }}>
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
          <div
            className="overflow-hidden"
            style={{ border: "2px solid #E9E9E9", borderRadius: "15px" }}
          >
            {/* Table header block */}
            <div
              className="flex flex-col justify-center items-start"
              style={{
                background: "#E9E9E9",
                borderRadius: "15px 15px 0px 0px",
                padding: "15px 82px",
              }}
            >
              <p
                className="font-bold text-black leading-none"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "15px" }}
              >
                Variation per arch
              </p>
              <p
                className="text-black mt-1"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "11px", fontWeight: 400 }}
              >
                Add your custom name before or after the{" "}
                <span style={{ color: "#1162a8" }}>[x tooth/teeth]</span> text.
              </p>
            </div>

            {/* Column headers + Add variation row */}
            <div
              className="flex items-center bg-white"
              style={{ padding: "12px 82px", gap: "10px", borderBottom: "1px solid #E9E9E9" }}
            >
              {/* Image col */}
              <span
                className="shrink-0 font-bold text-black flex items-center"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px", width: "10%", height: "48px" }}
              >
                Image
              </span>
              {/* Teeth col */}
              <span
                className="shrink-0 font-bold text-black flex items-center"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px", width: "18%", height: "48px" }}
              >
                Total # of teeth
              </span>
              {/* Name col */}
              <span
                className="shrink-0 font-bold text-black flex items-center"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px", width: "25%", height: "48px" }}
              >
                Name
              </span>
              {/* Preview */}
              <span
                className="flex-1 font-bold text-black flex items-center"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px", height: "48px" }}
              >
                Preview
              </span>
              {/* Add variation button — far right */}
              <Button
                type="button"
                size="sm"
                onClick={handleAddVariation}
                className="shrink-0 text-xs px-4 h-9 text-white font-bold"
                style={{
                  background: "linear-gradient(256.66deg, #2AA6DE, #82298D, #C9539F)",
                  borderRadius: "14px",
                  fontFamily: "Verdana, sans-serif",
                  border: "none",
                  minWidth: "130px",
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add variation
              </Button>
            </div>

            {/* Empty state */}
            {variations.length === 0 && (
              <p
                className="text-center py-8 text-gray-400"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
              >
                No variations yet. Click &quot;+ Add variation&quot; to get started.
              </p>
            )}

            {/* Variation rows */}
            {variations.map((variation, index) => {
              const preview = buildPreview(variation.tooth_count ?? "", variation.name_template ?? "")
              const toothCountError = validateToothCount(variation.tooth_count ?? "")
              const fileInputRef = React.createRef<HTMLInputElement>()

              return (
                <div
                  key={index}
                  className="flex items-center border-b border-[#E9E9E9] last:border-b-0"
                  style={{ padding: "12px 82px", gap: "16px" }}
                >
                  {/* Image upload — 10% */}
                  <div className="shrink-0" style={{ width: "10%" }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
                      style={{
                        width: "100%",
                        maxWidth: "90px",
                        height: "44px",
                        background: "#EEF1F4",
                        border: "2px solid #545F71",
                        borderRadius: "8px",
                      }}
                    >
                      {variation.image ? (
                        <img
                          src={variation.image}
                          alt="variation"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5" style={{ color: "#545F71" }} />
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

                  {/* Total # of teeth — 18% */}
                  <div className="shrink-0 space-y-1" style={{ width: "18%" }}>
                    <input
                      type="text"
                      placeholder="e.g. 1 or 4 - 15"
                      value={variation.tooth_count ?? ""}
                      onChange={(e) => handleVariationChange(index, "tooth_count", e.target.value)}
                      className="w-full px-3 bg-white text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1162a8]/30 transition"
                      style={{
                        border: toothCountError ? "1px solid #ef4444" : "1px solid #7F7F7F",
                        borderRadius: "10px",
                        height: "40px",
                        fontFamily: "Verdana, sans-serif",
                        fontSize: "13px",
                      }}
                    />
                    {toothCountError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        {toothCountError}
                      </p>
                    )}
                  </div>

                  {/* Name template — 25% */}
                  <div className="shrink-0" style={{ width: "25%" }}>
                    <input
                      type="text"
                      placeholder="e.g. Flipper [x tooth/teeth]"
                      value={variation.name_template ?? ""}
                      onChange={(e) => handleVariationChange(index, "name_template", e.target.value)}
                      className="w-full px-3 bg-white text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1162a8]/30 transition"
                      style={{
                        border: "1px solid #1162A8",
                        borderRadius: "10px",
                        height: "40px",
                        fontFamily: "Verdana, sans-serif",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  {/* Preview — flex-1 */}
                  <span
                    className="flex-1 truncate text-gray-700"
                    style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
                  >
                    {preview}
                  </span>

                  {/* Delete — fixed width matches button col */}
                  <button
                    type="button"
                    onClick={() => handleDeleteVariation(index)}
                    className="shrink-0 hover:text-red-500 transition-colors"
                    title="Remove variation"
                    style={{ color: "#B9B9B9", width: "130px", display: "flex", justifyContent: "center" }}
                  >
                    <Trash2 className="h-5 w-5" />
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
