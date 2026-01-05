import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ChevronDown, Info, AlertCircle, Search, Trash2, Plus, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { generateCodeFromName } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export function AddOnsSection({
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
  onAddonCreated,
}) {
  const watchedAddons = watch("addons") || []

  // Add search state
  const [searchQuery, setSearchQuery] = useState("")
  const [customAddonName, setCustomAddonName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isCreatingAddon, setIsCreatingAddon] = useState(false)
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

  // Get default subcategory from existing addons
  const getDefaultSubcategoryId = (): number | null => {
    if (addOns.length === 0) return null
    // Get the first addon's subcategory_id
    const firstAddon = addOns[0]
    return firstAddon?.subcategory?.id || firstAddon?.subcategory_id || null
  }

  // Handle adding custom addon
  const handleAddCustomAddon = async () => {
    if (!customAddonName.trim()) {
      return // Don't add if name is empty
    }

    // Check if we have a subcategory to use
    const defaultSubcategoryId = getDefaultSubcategoryId()
    if (!defaultSubcategoryId) {
      toast({
        title: "Error",
        description: "No subcategory available. Please ensure at least one addon exists with a subcategory.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingAddon(true)

    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found",
          variant: "destructive",
        })
        setIsCreatingAddon(false)
        return
      }

      const customerId = getCustomerId()
      const addonName = customAddonName.trim()
      const addonCode = generateCodeFromName(addonName)

      // Prepare payload
      const payload: any = {
        name: addonName,
        code: addonCode,
        subcategory_id: defaultSubcategoryId,
        type: "Both", // Default type
        sequence: 1,
        status: "Active",
      }

      // Add customer_id and price if available (for lab admin)
      if (customerId) {
        payload.customer_id = customerId
        payload.is_custom = "Yes"
        payload.price = 0 // Required when customer_id is present
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"
      const response = await fetch(`${API_BASE_URL}/library/addons`, {
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
            description: errorData?.message || "Failed to create addon",
            variant: "destructive",
          })
        }
        
        setIsCreatingAddon(false)
        return
      }

      const result = await response.json()

      if (result?.data && result.data.id) {
        // Ensure addon_id is a number
        const createdAddonId = Number(result.data.id)
        
        if (isNaN(createdAddonId) || createdAddonId <= 0) {
          throw new Error(`Invalid addon ID received: ${result.data.id}`)
        }

        // Add the created addon to the form
        const currentList = watchedAddons || []
        const newSequence = currentList.length === 0 
          ? 1 
          : Math.max(...currentList.map((a: any) => a.sequence || 0), 0) + 1

        const newAddon = {
          addon_id: createdAddonId,
          sequence: newSequence,
          is_default: "No",
          price: customerId ? 0 : "",
          quantity: 1,
        }

        setValue("addons", [...currentList, newAddon], { 
          shouldDirty: true,
          shouldValidate: true 
        })

        toast({
          title: "Addon Created",
          description: `Successfully created ${addonName}`,
          variant: "default",
        })

        // Reset form first
        setCustomAddonName("")
        setShowCustomInput(false)

        // Refresh addons list if callback is provided
        // Use a small delay to ensure backend has processed the creation
        if (onAddonCreated) {
          try {
            // Wait a bit to ensure the backend has fully processed the creation
            await new Promise(resolve => setTimeout(resolve, 300))
            // Fetch all addons without pagination (page 1, high limit)
            await onAddonCreated(1, 9999, "", undefined, undefined)
          } catch (error) {
            console.error("Error refreshing addons list:", error)
            // Don't throw - addon was created successfully, just refresh failed
          }
        }
      } else {
        throw new Error(`Invalid response from server. Expected data.id, got: ${JSON.stringify(result)}`)
      }
    } catch (error: any) {
      console.error("Error creating addon:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create addon. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingAddon(false)
    }
  }

  // Helper to get selected add-on by id
  const getSelectedAddon = (id: number) => watchedAddons.find((a) => a.addon_id === id)

  const normalizeQuantityValue = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value >= 1 ? Math.floor(value) : 1
    }

    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed !== "") {
        const parsed = Number(trimmed)
        if (Number.isFinite(parsed) && parsed >= 1) {
          return Math.floor(parsed)
        }
      }
    }

    return 1
  }

  const buildSelectedAddon = (addOn: any) => {
    const quantity = normalizeQuantityValue(addOn.lab_addon?.quantity ?? addOn.quantity)
    const isDefaultCandidate = addOn.lab_addon?.is_default ?? addOn.is_default
    const isDefault = isDefaultCandidate === "Yes" ? "Yes" : "No"

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
    // Normalize quantity: if empty or invalid, default to 1, otherwise ensure it's at least 1
    let normalizedValue: number
    if (value === "" || value === null || value === undefined) {
      normalizedValue = 1
    } else {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed >= 1) {
        normalizedValue = Math.floor(parsed)
      } else {
        normalizedValue = 1
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
          return { ...a, is_default: isDefaultValue }
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

  // Filter addOns by search query
  const filteredAddOns = addOns.filter(addOn =>
    addOn.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <Switch
            checked={sections.addOns}
            onCheckedChange={() => toggleSection("addOns")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.addOns ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("addOns")}
          />
        </div>
      </div>
      {expandedSections.addOns && sections.addOns && (
        <div className="px-6 pb-6">
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
              const defaultQuantity = normalizeQuantityValue(addOn.lab_addon?.quantity ?? addOn.quantity)
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
                    {selected ? (
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={selected.quantity ?? defaultQuantity}
                        onChange={e => handleQuantityChange(addOn.id, e.target.value)}
                        className="w-20"
                        disabled={!selected}
                        style={selected ? { borderColor: "rgb(17,98,168)" } : {}}
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
          {showCustomInput ? (
            <div className="flex items-center gap-2 mt-4">
              <Input
                type="text"
                placeholder="Enter addon name"
                value={customAddonName}
                onChange={(e) => setCustomAddonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingAddon) {
                    e.preventDefault()
                    handleAddCustomAddon()
                  } else if (e.key === "Escape") {
                    setShowCustomInput(false)
                    setCustomAddonName("")
                  }
                }}
                className="flex-1"
                autoFocus
                disabled={isCreatingAddon}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddCustomAddon}
                disabled={!customAddonName.trim() || isCreatingAddon}
                className="bg-[#1162a8] hover:bg-[#1162a8]/90"
              >
                {isCreatingAddon ? "Creating..." : "Add"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomAddonName("")
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
          <ValidationError message={getValidationError("addons")} />
        </div>
      )}
    </div>
  )
}
