"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

function toPickerHex(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  if (trimmed && HEX_COLOR_PATTERN.test(trimmed)) return trimmed
  return fallback
}

export function ShadeColorField({
  value,
  defaultHex,
  onChange,
  disabled,
  id,
}: {
  value?: string
  defaultHex: string
  onChange: (hex: string) => void
  disabled?: boolean
  id?: string
}) {
  if (disabled) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const pickerValue = toPickerHex(value, defaultHex)

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
      <input
        id={id}
        type="color"
        value={pickerValue}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label="Pick color"
      />
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultHex}
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
        maxLength={7}
      />
    </div>
  )
}

export type ShadeColorFieldConfig = {
  id: string
  label: string
  value: string
  defaultHex: string
  onChange: (hex: string) => void
}

export type AddCustomShadePanelProps = {
  idPrefix: string
  name: string
  onNameChange: (name: string) => void
  namePlaceholder?: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  colorFields: ShadeColorFieldConfig[]
  persistHint: string
  onAdd: () => void
  isValid: boolean
  isSubmitting: boolean
  className?: string
}

export function AddCustomShadePanel({
  idPrefix,
  name,
  onNameChange,
  namePlaceholder = "e.g. A2",
  enabled,
  onEnabledChange,
  colorFields,
  persistHint,
  onAdd,
  isValid,
  isSubmitting,
  className,
}: AddCustomShadePanelProps) {
  const previewColors = colorFields.map((f) => toPickerHex(f.value, f.defaultHex))

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      <div className="border-b border-gray-100 bg-gray-50/90 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1162a8]/10 text-[#1162a8]">
            <Plus className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Add new shade</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{persistHint}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div
          className="h-2.5 w-full rounded-full border border-gray-200/80"
          style={{
            background: `linear-gradient(90deg, ${previewColors.join(", ")})`,
          }}
          role="img"
          aria-label="Shade color preview"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-name`} className="text-sm font-medium text-gray-700">
              Shade name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${idPrefix}-name`}
              placeholder={namePlaceholder}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-10 bg-white"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:min-w-[200px] sm:flex-col sm:items-stretch sm:justify-center sm:gap-2 sm:py-3">
            <Label
              htmlFor={`${idPrefix}-status`}
              className="text-sm font-medium text-gray-700 sm:text-center"
            >
              Status
            </Label>
            <div className="flex items-center justify-end gap-2 sm:justify-center">
              <Switch
                id={`${idPrefix}-status`}
                checked={enabled}
                onCheckedChange={onEnabledChange}
                className="data-[state=checked]:bg-[#1162a8]"
              />
              <span
                className={cn(
                  "inline-flex min-w-[4.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                  enabled
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                    : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                )}
              >
                {enabled ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Shade colors
          </p>
          <div
            className={cn(
              "grid gap-3",
              colorFields.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2"
            )}
          >
            {colorFields.map((field) => (
              <div
                key={field.id}
                className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
              >
                <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                  {field.label} <span className="text-red-500">*</span>
                </Label>
                <ShadeColorField
                  id={field.id}
                  value={field.value}
                  defaultHex={field.defaultHex}
                  onChange={field.onChange}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1 border-t border-gray-100">
          <Button
            type="button"
            onClick={onAdd}
            className="bg-[#1162a8] hover:bg-[#0d4d87] w-full sm:w-auto min-w-[140px]"
            disabled={!isValid || isSubmitting}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {isSubmitting ? "Saving…" : "Add shade"}
          </Button>
        </div>
      </div>
    </div>
  )
}
