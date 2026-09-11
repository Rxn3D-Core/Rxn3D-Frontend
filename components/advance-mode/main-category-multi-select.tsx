"use client"

import { ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

export function parseAbutmentOptionCategoryIds(value?: string | null): number[] {
  if (!value) return []
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
}

export function formatAbutmentOptionCategoryIds(ids: number[]): string {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
    .sort((a, b) => a - b)
    .join(",")
}

export function MainCategoryMultiSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select categories",
}: MainCategoryMultiSelectProps) {
  const selected = options.filter((option) => value.includes(option.id))
  const label =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map((option) => option.name).join(", ")
        : `${selected.length} selected`

  const toggle = (id: number, checked: boolean) => {
    if (checked) {
      onChange([...value, id])
      return
    }
    onChange(value.filter((current) => current !== id))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-8 w-full min-w-[148px] justify-between px-2 text-xs font-normal"
        >
          <span className={`truncate ${selected.length === 0 ? "text-muted-foreground" : "text-gray-900"}`}>
            {label}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[80] w-56 p-2" align="start" onOpenAutoFocus={(event) => event.preventDefault()}>
        {options.length === 0 ? (
          <p className="px-1 py-2 text-xs text-gray-500">No main categories found</p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {options.map((option) => {
              const checked = value.includes(option.id)
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
      </PopoverContent>
    </Popover>
  )
}
