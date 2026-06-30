import React from "react"
import { useWatch, Control, UseFormSetValue } from "react-hook-form"
import type { Path } from "react-hook-form"
import { Switch } from "@/components/ui/switch"
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
import { variationToothCountFormatIssue } from "@/lib/variation-step-validation"
import { MAX_PRODUCT_VARIATIONS } from "@/lib/product-limits"
import { useToast } from "@/hooks/use-toast"

/** Stored in API / form; inserted via button — users are not expected to type it. */
const NAME_PLACEHOLDER_TOKEN = "[x tooth/teeth]"

/** Four equal fr columns + fixed actions column (reliable vs Tailwind arbitrary grid) */
const variationTableGridBase: React.CSSProperties = {
  display: "grid",
  width: "100%",
  minWidth: 0,
  columnGap: 12,
  rowGap: 8,
  gridTemplateColumns: "repeat(4, minmax(0, 1fr)) minmax(120px, 140px)",
}

function insertTokenIntoString(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  token: string
): { next: string; caret: number } {
  const before = value.slice(0, selectionStart)
  const after = value.slice(selectionEnd)
  const next = before + token + after
  const caret = selectionStart + token.length
  return { next, caret }
}

interface ToothCountVariation {
  id?: number
  image?: string | null
  image_url?: string
  tooth_count?: string
  name_template?: string
}

interface VariationSectionProps {
  control: Control<ProductCreateForm>
  setValue: UseFormSetValue<ProductCreateForm>
  sections: Record<string, boolean>
  toggleSection: (section: string) => void
  /** Step-validation messages (Next / Save), keyed as `tooth_count_variations.{i}.tooth_count` / `.name_template` */
  getFieldError?: (field: string) => string | undefined
}

function buildPreview(tooth_count: string, name_template: string): string {
  const countStr = tooth_count?.trim() ?? ""
  const template = name_template?.trim() ?? ""
  if (!countStr || !template) return ""

  const rangeParts = countStr.split("-")
  const num = parseInt(rangeParts[0].trim(), 10)
  if (isNaN(num)) return template.replace(NAME_PLACEHOLDER_TOKEN, countStr)

  const unit = num === 1 ? "tooth" : "teeth"
  return template.replace(NAME_PLACEHOLDER_TOKEN, `${num} ${unit}`)
}

export function VariationSection({
  control,
  setValue,
  sections,
  toggleSection,
  getFieldError,
}: VariationSectionProps) {
  const { toast } = useToast()
  const isTeethBased = useWatch({ control, name: "is_teeth_based_price" })
  const variations = (useWatch({ control, name: "tooth_count_variations" }) ?? []) as ToothCountVariation[]

  const nameInputRefs = React.useRef<Map<number, HTMLInputElement | null>>(new Map())

  const setVal = React.useCallback(
    (name: Path<ProductCreateForm>, value: unknown) => {
      setValue(name, value as never, { shouldDirty: true, shouldValidate: true })
    },
    [setValue]
  )

  const handleAddVariation = () => {
    if (variations.length >= MAX_PRODUCT_VARIATIONS) {
      toast({
        title: "Maximum variations reached",
        description: `You can add up to ${MAX_PRODUCT_VARIATIONS} variations per product.`,
        variant: "destructive",
      })
      return
    }
    setVal("tooth_count_variations", [
      ...variations,
      { image: null, tooth_count: "", name_template: "" },
    ])
  }

  const handleDeleteVariation = (index: number) => {
    nameInputRefs.current.delete(index)
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

  const handleInsertToothCount = (index: number) => {
    const raw = variations[index]?.name_template ?? ""
    if (raw.includes(NAME_PLACEHOLDER_TOKEN)) {
      toast({
        title: "Tooth count already added",
        description: "Remove the placeholder text first if you want to place it elsewhere.",
      })
      return
    }

    const input = nameInputRefs.current.get(index)
    const len = raw.length
    let start = len
    let end = len
    if (input && document.activeElement === input) {
      start = input.selectionStart ?? len
      end = input.selectionEnd ?? len
    }

    const { next, caret } = insertTokenIntoString(raw, start, end, NAME_PLACEHOLDER_TOKEN)
    handleVariationChange(index, "name_template", next)

    queueMicrotask(() => {
      const el = nameInputRefs.current.get(index)
      if (el) {
        el.focus()
        try {
          el.setSelectionRange(caret, caret)
        } catch {
          /* ignore */
        }
      }
    })
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
          Turn on <strong>Charge product per tooth</strong> in Product Details to use variations. The Variation tab is
          available only for per-tooth pricing.
        </span>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-6">
        <Switch
          id="variation-section-toggle"
          checked={sections.variation ?? false}
          onCheckedChange={(checked) => {
            if (checked !== sections.variation) {
              toggleSection("variation")
            }
            setValue("enable_tooth_count_variation", checked ? "Yes" : "No", { shouldDirty: true })
          }}
          className="data-[state=checked]:bg-[#1162a8]"
        />
        <label htmlFor="variation-section-toggle" className="font-semibold text-xl text-gray-900 cursor-pointer select-none" style={{ fontFamily: "Verdana, sans-serif" }}>
          Variation
        </label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8] focus-visible:ring-offset-1"
                aria-label="Tooth-count variation help"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="max-w-sm">
              <p className="font-medium">Tooth-count variations</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                When enabled, set names and images per tooth count so you don&apos;t need separate catalog entries for
                each arch size. Add one or more rows below to activate this on the product.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div
        className={cn(
          "space-y-6",
          !(sections.variation ?? false) && "opacity-50 pointer-events-none select-none"
        )}
      >
        {sections.variation && (
          <div
            className="min-w-0 overflow-x-auto"
            style={{ border: "2px solid #E9E9E9", borderRadius: "15px" }}
          >
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
                Type the product name, then click <strong>Insert tooth count</strong> where the number of teeth should
                appear. You don&apos;t need to type the placeholder.
              </p>
            </div>

            <div
              className="bg-white border-b border-[#E9E9E9]"
              style={{
                ...variationTableGridBase,
                alignItems: "center",
                padding: "12px 82px",
              }}
            >
              <span
                className="min-w-0 font-bold text-black flex items-center h-12"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
              >
                Image
              </span>
              <span
                className="min-w-0 font-bold text-black flex items-center h-12"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
              >
                Total # of teeth
              </span>
              <span
                className="min-w-0 font-bold text-black flex items-center h-12"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
              >
                Name
              </span>
              <span
                className="min-w-0 font-bold text-black flex items-center h-12"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
              >
                Preview
              </span>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddVariation}
                  disabled={variations.length >= MAX_PRODUCT_VARIATIONS}
                  title={
                    variations.length >= MAX_PRODUCT_VARIATIONS
                      ? `Maximum ${MAX_PRODUCT_VARIATIONS} variations per product`
                      : undefined
                  }
                  className="text-xs px-4 h-9 text-white font-bold disabled:opacity-50 disabled:pointer-events-none"
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
                {variations.length >= MAX_PRODUCT_VARIATIONS && (
                  <span className="text-[10px] text-amber-700 text-right max-w-[200px] leading-tight">
                    Maximum {MAX_PRODUCT_VARIATIONS} variations per product.
                  </span>
                )}
              </div>
            </div>

            {variations.length === 0 && (
              <p
                className="text-center py-8 text-gray-400"
                style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
              >
                No variations yet. Click &quot;+ Add variation&quot; to get started.
              </p>
            )}

            {variations.map((variation, index) => {
              const preview = buildPreview(variation.tooth_count ?? "", variation.name_template ?? "")
              const toothFieldKey = `tooth_count_variations.${index}.tooth_count`
              const nameFieldKey = `tooth_count_variations.${index}.name_template`
              const tcTrimmed = (variation.tooth_count ?? "").trim()
              const stepToothErr = getFieldError?.(toothFieldKey)
              const stepNameErr = getFieldError?.(nameFieldKey)
              const formatToothErr = tcTrimmed ? variationToothCountFormatIssue(tcTrimmed) : undefined
              const toothCountErrorMsg = stepToothErr ?? formatToothErr
              const fileInputRef = React.createRef<HTMLInputElement>()
              const imageSrc = variation.image || variation.image_url
              const hasToken = (variation.name_template ?? "").includes(NAME_PLACEHOLDER_TOKEN)

              return (
                <div
                  key={variation.id ?? index}
                  className="border-b border-[#E9E9E9] last:border-b-0"
                  style={{
                    ...variationTableGridBase,
                    alignItems: "start",
                    padding: "12px 82px",
                  }}
                >
                  <div className="min-w-0 pt-0.5 flex justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-11 w-full max-w-[90px] items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
                      style={{
                        background: "#EEF1F4",
                        border: "2px solid #545F71",
                        borderRadius: "8px",
                      }}
                    >
                      {imageSrc ? (
                        <img
                          src={imageSrc && imageSrc.startsWith("http") ? `${imageSrc}${imageSrc.includes("?") ? "&" : "?"}t=${new Date().getTime()}` : imageSrc}
                          alt="variation"
                          className="h-full w-full object-contain"
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

                  <div className="min-w-0 space-y-1 pt-0.5">
                    <input
                      type="text"
                      placeholder="e.g. 1 or 4 - 16"
                      value={variation.tooth_count ?? ""}
                      onChange={(e) => handleVariationChange(index, "tooth_count", e.target.value)}
                      className="w-full px-3 bg-white text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1162a8]/30 transition"
                      style={{
                        border: toothCountErrorMsg ? "1px solid #ef4444" : "1px solid #7F7F7F",
                        borderRadius: "10px",
                        height: "40px",
                        fontFamily: "Verdana, sans-serif",
                        fontSize: "13px",
                      }}
                    />
                    {toothCountErrorMsg && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        {toothCountErrorMsg}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 flex flex-col gap-1.5">
                    <input
                      ref={(el) => {
                        if (el) nameInputRefs.current.set(index, el)
                        else nameInputRefs.current.delete(index)
                      }}
                      type="text"
                      placeholder="e.g. Flipper"
                      value={variation.name_template ?? ""}
                      onChange={(e) => handleVariationChange(index, "name_template", e.target.value)}
                      className="w-full min-w-0 px-2.5 bg-white text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1162a8]/30 transition"
                      style={{
                        border: stepNameErr ? "1px solid #ef4444" : "1px solid #1162A8",
                        borderRadius: "8px",
                        height: "36px",
                        fontFamily: "Verdana, sans-serif",
                        fontSize: "12px",
                      }}
                      aria-label="Variation name template"
                    />
                    {stepNameErr && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        {stepNameErr}
                      </p>
                    )}
                    {!hasToken && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-full text-[11px] border-[#1162a8] text-[#1162a8] hover:bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)]/10 px-2"
                              onClick={() => handleInsertToothCount(index)}
                              aria-label="Insert tooth count placeholder at cursor"
                            >
                              Insert tooth count
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                              Inserts the placeholder where the tooth number will appear in the catalog name. Click in the
                              name field first to choose the position; otherwise it is added at the end.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <p className="text-[9px] text-gray-500 leading-snug">
                      <code className="bg-gray-100 px-0.5 rounded">{NAME_PLACEHOLDER_TOKEN}</code> is filled in Preview.
                    </p>
                  </div>

                  <span
                    className="min-w-0 truncate text-gray-700 pt-2 self-start w-full"
                    style={{ fontFamily: "Verdana, sans-serif", fontSize: "13px" }}
                    title={preview}
                  >
                    {preview}
                  </span>

                  <div className="flex shrink-0 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteVariation(index)}
                      className="hover:text-red-500 transition-colors"
                      title="Remove variation"
                      style={{ color: "#B9B9B9" }}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
