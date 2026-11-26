import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ChevronDown, Info, AlertCircle, Search, Trash2, Plus, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function AddOnsSection({
  onAddCustom = undefined as (() => void) | undefined, // opens the full create form
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  addOns,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  userRole = "", // <-- default to empty string if undefined
}) {
  const watchedAddons = watch("addons") || []

  // Add search state
  const [searchQuery, setSearchQuery] = useState("")

  // Helper to get selected add-on by id
  const getSelectedAddon = (id: number) => watchedAddons.find((a) => a.addon_id === id)

  const normalizeQuantityValue = (value: unknown): number | "" => {
    if (value === "" || value === null || value === undefined) {
      return ""
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value >= 0 ? Math.floor(value) : ""
    }
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed === "") {
        return ""
      }
      const parsed = Number(trimmed)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.floor(parsed)
      }
    }
    return ""
  }

  const buildSelectedAddon = (addOn: any) => {
    const isDefaultCandidate = addOn.lab_addon?.is_default ?? addOn.is_default
    const isDefault = isDefaultCandidate === "Yes" ? "Yes" : "No"
    const quantity =
      isDefault === "Yes"
        ? normalizeQuantityValue(addOn.lab_addon?.quantity ?? addOn.quantity)
        : ""

    return {
      addon_id: addOn.id,
      price: addOn.lab_addon?.price ?? addOn.price ?? "",
      sequence: addOn.sequence ?? 1,
      quantity,
      is_default: isDefault,
    }
  }

  // Remove add-on from selected list
  const handleRemoveAddon = (addon_id: number) => {
    setValue(
      "addons",
      watchedAddons.filter((a) => a.addon_id !== addon_id),
      { shouldDirty: true }
    )
  }

  // Update price for a selected add-on
  const handlePriceChange = (addon_id: number, value: string | number) => {
    // Convert to string to ensure consistency, but preserve empty string for clearing
    const priceValue = value === "" ? "" : String(value)
    setValue(
      "addons",
      watchedAddons.map((a) =>
        a.addon_id === addon_id ? { ...a, price: priceValue } : a
      ),
      { shouldDirty: true, shouldValidate: true }
    )
  }

  const handleQuantityChange = (addon_id: number, value: string) => {
    let normalizedValue: number | ""
    if (value === "" || value === null || value === undefined) {
      normalizedValue = ""
    } else {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) {
        normalizedValue = ""
      } else if (parsed < 0) {
        normalizedValue = 0
      } else {
        normalizedValue = Math.floor(parsed)
      }
    }
    setValue(
      "addons",
      watchedAddons.map((a) =>
        a.addon_id === addon_id ? { ...a, quantity: normalizedValue } : a
      ),
      { shouldDirty: true, shouldValidate: true }
    )
  }

  const handleDefaultChange = (addon_id: number, checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") return

    const isDefaultValue = checked ? "Yes" : "No"
    setValue(
      "addons",
      watchedAddons.map((a) => {
        if (a.addon_id === addon_id) {
          return {
            ...a,
            is_default: isDefaultValue,
            ...(!checked ? { quantity: "" as const } : {}),
          }
        }
        return a
      }),
      { shouldDirty: true, shouldValidate: true }
    )
  }

  // Add add-on to selected list
  const handleAddAddon = (addOn) => {
    setValue(
      "addons",
      [
        ...watchedAddons,
        buildSelectedAddon(addOn),
      ],
      { shouldDirty: true }
    )
  }

  // Toggle checkbox selection
  const handleCheckboxChange = (addOn, checked) => {
    if (checked) {
      handleAddAddon(addOn)
    } else {
      handleRemoveAddon(addOn.id)
    }
  }

  const selectedAddonIdSet = new Set(watchedAddons.map((a) => a.addon_id))

  // Filter addOns by search query, then show checked add-ons first
  const filteredAddOns = addOns
    .filter((addOn) => addOn.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aSel = selectedAddonIdSet.has(a.id)
      const bSel = selectedAddonIdSet.has(b.id)
      if (aSel === bSel) return 0
      return aSel ? -1 : 1
    })

  // Check if all filtered add-ons are selected
  const allAddOnIds = filteredAddOns.map((addOn) => addOn.id)
  const selectedAddOnIds = watchedAddons.map((a) => a.addon_id)
  const allSelected = allAddOnIds.length > 0 && allAddOnIds.every((id) => selectedAddOnIds.includes(id))

  // Handle select all add-ons
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all filtered add-ons
      const currentList = watchedAddons || []
      const newAddons = [...currentList]
      
        filteredAddOns.forEach((addOn) => {
          const existing = watchedAddons.find((a) => a.addon_id === addOn.id)
          if (!existing) {
            newAddons.push(buildSelectedAddon(addOn))
          }
        })
      
      setValue("addons", newAddons, { shouldDirty: true })
    } else {
      // Deselect all filtered add-ons
      const remainingAddons = watchedAddons.filter(
        (a) => !filteredAddOns.some((addOn) => addOn.id === a.addon_id)
      )
      setValue("addons", remainingAddons, { shouldDirty: true })
    }
  }

  const shouldShowPriceColumn = userRole !== "superadmin"
  const addonGridTemplateColumns = shouldShowPriceColumn
    ? "40px minmax(0,1fr) minmax(0,1fr) 110px 90px 90px 32px"
    : "40px minmax(0,1fr) minmax(0,1fr) 90px 90px 32px"

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={sections.addOns}
            onCheckedChange={() => toggleSection("addOns")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <span className="font-medium">Add-ons</span>
          {sectionHasErrors(["addons"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedAddons.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedAddons.length} selected</strong>
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-addons"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="border-[rgb(17,98,168)] data-[state=checked]:bg-[rgb(17,98,168)]"
            />
            <Label
              htmlFor="select-all-addons"
              className="text-xs cursor-pointer font-medium"
              style={{ color: "rgb(17,98,168)" }}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.addOns ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("addOns")}
          />
        </div>
      </div>
      {expandedSections.addOns && (
        <div className={cn("px-6 pb-6", !sections.addOns && "opacity-50 pointer-events-none select-none")}>
          <div className="relative mb-4">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search Add-ons to change price"
              className="pl-8"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="border rounded">
            <div
              className="grid gap-2 font-medium text-sm border-b px-4 py-2"
              style={{
                color: "rgb(17 98 168)",
                gridTemplateColumns: addonGridTemplateColumns,
              }}
            >
              <div></div>
              <div>Add-ons</div>
              <div>Category</div>
              {shouldShowPriceColumn && <div>Price</div>}
              <div className="text-center">Quantity</div>
              <div className="text-center">Default</div>
              <div></div>
            </div>
            {filteredAddOns.map((addOn) => {
              const selected = getSelectedAddon(addOn.id)
              const qtyEditable = !!selected && selected.is_default === "Yes"
              const quantityDisplay =
                selected && selected.is_default === "Yes"
                  ? selected.quantity === "" ||
                    selected.quantity === undefined ||
                    selected.quantity === null
                    ? ""
                    : String(selected.quantity)
                  : ""
              return (
                <div
                  key={addOn.id}
                  className="grid gap-2 items-center px-4 py-2 border-b last:border-b-0"
                  style={{
                    gridTemplateColumns: addonGridTemplateColumns,
                    ...(selected ? { backgroundColor: "rgba(17,98,168,0.07)" } : {}),
                  }}
                >
                  <div>
                    <Checkbox
                      checked={!!selected}
                      onCheckedChange={checked => handleCheckboxChange(addOn, checked)}
                      className="data-[state=checked]:bg-[rgb(17,98,168)] border-[rgb(17,98,168)]"
                    />
                  </div>
                  <div className={selected ? "font-medium" : ""} style={selected ? { color: "rgb(17,98,168)" } : {}}>
                    {addOn.name}
                  </div>
                  <div>{addOn.subcategory?.name || "N/A"}</div>
                  {shouldShowPriceColumn && (
                    <div>
                      <Input
                        type="number"
                        min={0}
                        value={
                          selected
                            ? (selected.price !== undefined && selected.price !== null 
                                ? selected.price 
                                : addOn.lab_addon?.price ?? addOn.price ?? "")
                            : addOn.lab_addon?.price ?? addOn.price ?? ""
                        }
                        onChange={e => handlePriceChange(addOn.id, e.target.value)}
                        className="w-24"
                        disabled={!selected}
                        style={selected ? { borderColor: "rgb(17,98,168)" } : {}}
                      />
                    </div>
                  )}
                  <div className="flex justify-center">
                    {qtyEditable ? (
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={quantityDisplay}
                        onChange={(e) => handleQuantityChange(addOn.id, e.target.value)}
                        className="w-20"
                        style={{ borderColor: "rgb(17,98,168)" }}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">—</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={selected?.is_default === "Yes"}
                      disabled={!selected}
                      onCheckedChange={(checked) => handleDefaultChange(addOn.id, checked)}
                      className="border-[rgb(17,98,168)] data-[state=checked]:bg-[rgb(17,98,168)]"
                    />
                  </div>
                  <div></div>
                </div>
              )
            })}
          </div>
          
          {/* Add Custom Input or Button */}
          {onAddCustom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[#1162a8] pl-0 flex items-center gap-1 mt-4"
              onClick={onAddCustom}
            >
              <Plus className="h-4 w-4" /> Add Custom
            </Button>
          )}
          <ValidationError message={getValidationError("addons")} />
        </div>
      )}
    </div>
  )
}
