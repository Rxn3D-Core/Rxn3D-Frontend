"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export interface MainCategoryOption {
  id: number
  name: string
}

interface MainCategoryMultiSelectProps {
  value: number[]
  onChange: (ids: number[]) => void
  options: MainCategoryOption[]
  disabled?: boolean
  placeholder?: string
}

export function parseAbutmentOptionCategoryIds(
  value?: string | number[] | number | null
): number[] {
  if (value == null || value === "") return []
  const raw = Array.isArray(value)
    ? value
    : typeof value === "number"
      ? [value]
      : String(value).split(",")
  return [
    ...new Set(
      raw
        .map((part) => Number(typeof part === "string" ? part.trim() : part))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ]
}

export function formatAbutmentOptionCategoryIds(ids: number[]): string {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
    .sort((a, b) => a - b)
    .join(",")
}

/**
 * Lightweight multi-select (no Radix Popover). Tables can mount many of these;
 * Popover/Popper on every row can hit React's nested-update limit (#185).
 */
export function MainCategoryMultiSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select categories",
}: MainCategoryMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedIds = new Set(value.map((id) => Number(id)))
  const selected = options.filter((option) => selectedIds.has(Number(option.id)))
  const label =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map((option) => option.name).join(", ")
        : `${selected.length} selected`

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  const toggle = (id: number, checked: boolean) => {
    if (checked) {
      onChange([...value, id])
      return
    }
    onChange(value.filter((current) => current !== id))
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-[148px]">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="h-8 w-full justify-between px-2 text-xs font-normal"
      >
        <span className={`truncate ${selected.length === 0 ? "text-muted-foreground" : "text-gray-900"}`}>
          {label}
        </span>
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[80] w-56 rounded-md border bg-white p-2 shadow-md">
          {options.length === 0 ? (
            <p className="px-1 py-2 text-xs text-gray-500">No main categories found</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {options.map((option) => {
                const checked = selectedIds.has(Number(option.id))
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => toggle(option.id, next === true)}
                      className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                    <span className="text-xs text-gray-800">{option.name}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
