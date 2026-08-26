"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useToast } from "@/hooks/use-toast"
import { useCustomer } from "@/contexts/customer-context"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { TOP_BAR_RECOMMENDED_LOGO_SIZES } from "@/components/case-design-center/components/TopBar"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface LocationOption {
  id: number
  name: string
}

export interface EditCustomerProfileData {
  id: number
  name: string
  email?: string
  website?: string | null
  address?: string
  city?: string
  postal_code?: string
  stateName?: string
  stateId?: number | null
  countryName?: string
  countryId?: number | null
  release_casepan?: string
  code?: string
  logo_url?: string | null
}

interface EditCustomerProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerType: "lab" | "office"
  customer: EditCustomerProfileData | null
  onSuccess?: (updated: Partial<EditCustomerProfileData> & { logo_url?: string }) => void
}

const isLocationOption = (item: any): item is LocationOption =>
  !!item && typeof item.id === "number" && typeof item.name === "string"

const normalizeLocationList = (items: any): LocationOption[] => {
  if (!Array.isArray(items)) return []
  return items.filter(isLocationOption).map((item) => ({ id: item.id, name: item.name }))
}

export function EditCustomerProfileModal({
  open,
  onOpenChange,
  customerType,
  customer,
  onSuccess,
}: EditCustomerProfileModalProps) {
  const { toast } = useToast()
  const { updateCustomerProfile, updateCustomerLogo, fetchCustomerProfile } = useCustomer()
  const { setCustomerLogo, setCurrentCustomerLogo } = useCustomerLogoStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState("")
  const [countries, setCountries] = useState<LocationOption[]>([])
  const [states, setStates] = useState<LocationOption[]>([])
  const [isCountryLoading, setIsCountryLoading] = useState(false)
  const [isStateLoading, setIsStateLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
    country_id: null as number | null,
    state: "",
    state_id: null as number | null,
    release_casepan: "",
    code: "",
  })

  const entityLabel = customerType === "lab" ? "Lab" : "Office"

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    const name = formData.name.trim()
    const website = formData.website.trim()
    const code = formData.code.trim()
    const address = formData.address.trim()
    const city = formData.city.trim()
    const postalCode = formData.postal_code.trim()

    if (!name) {
      errors.name = `${entityLabel} name is required.`
    } else if (name.length > 255) {
      errors.name = `${entityLabel} name must not exceed 255 characters.`
    }

    if (!code) {
      errors.code = `${entityLabel} code is required.`
    } else if (code.length > 50) {
      errors.code = `${entityLabel} code must not exceed 50 characters.`
    }

    if (!website) {
      errors.website = "Website is required."
    } else if (website.length > 255) {
      errors.website = "Website must not exceed 255 characters."
    }

    if (customerType === "lab" && formData.release_casepan) {
      if (!["After Stage", "After Product"].includes(formData.release_casepan)) {
        errors.release_casepan = 'Release casepan must be "After Stage" or "After Product".'
      }
    }

    if (!address) {
      errors.address = "Street address is required."
    } else if (address.length > 255) {
      errors.address = "Street address must not exceed 255 characters."
    }

    if (!city) {
      errors.city = "City is required."
    } else if (city.length > 255) {
      errors.city = "City must not exceed 255 characters."
    }

    if (!postalCode) {
      errors.postal_code = "Postal code is required."
    } else if (postalCode.length > 20) {
      errors.postal_code = "Postal code must not exceed 20 characters."
    }

    if (!formData.country_id) {
      errors.country = "Country is required."
    }

    if (!formData.state_id) {
      errors.state = "State / Province is required."
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Validation failed",
        description: Object.values(errors)[0],
        variant: "destructive",
      })
      return false
    }
    return true
  }

  useEffect(() => {
    if (!open || !customer) return

    const initial = {
      name: customer.name || "",
      website: customer.website || "",
      address: customer.address || "",
      city: customer.city || "",
      postal_code: customer.postal_code || "",
      country: customer.countryName || "",
      country_id: customer.countryId ?? null,
      state: customer.stateName || "",
      state_id: customer.stateId ?? null,
      release_casepan: customer.release_casepan || "",
      code: customer.code || "",
    }
    setFormData(initial)
    setFieldErrors({})
    setLogoUrl(customer.logo_url || "")

    const loadLatest = async () => {
      setIsLoadingProfile(true)
      try {
        const profile = await fetchCustomerProfile(customer.id)
        if (!profile) return
        const profileData = profile as any
        const next = {
          name: profileData.name || initial.name,
          website: profileData.website || "",
          address: profileData.address || "",
          city: profileData.city || "",
          postal_code: profileData.postal_code || "",
          country: profileData.country?.name || "",
          country_id: profileData.country?.id ?? profileData.country_id ?? null,
          state: profileData.state?.name || "",
          state_id: profileData.state?.id ?? profileData.state_id ?? null,
          release_casepan: profileData.release_casepan || "",
          code: profileData.code || "",
        }
        setFormData(next)
        if (profileData.logo_url) setLogoUrl(profileData.logo_url)
      } catch (error) {
        console.error("Failed to load customer profile for edit:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    void loadLatest()
  }, [open, customer, fetchCustomerProfile])

  useEffect(() => {
    if (!open) return
    const loadCountries = async () => {
      if (!API_BASE_URL) {
        setCountries([])
        return
      }
      setIsCountryLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/general/countries`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) throw new Error("Failed to fetch countries")
        const result = await response.json()
        const dataSource = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
        setCountries(normalizeLocationList(dataSource))
      } catch (error) {
        console.error("Error fetching countries:", error)
      } finally {
        setIsCountryLoading(false)
      }
    }
    void loadCountries()
  }, [open])

  useEffect(() => {
    const loadStates = async () => {
      if (!formData.country_id || !API_BASE_URL) {
        setStates([])
        return
      }
      setIsStateLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/general/states/${formData.country_id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) throw new Error("Failed to fetch states")
        const result = await response.json()
        const dataSource = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
        setStates(normalizeLocationList(dataSource))
      } catch (error) {
        console.error("Error fetching states:", error)
        setStates([])
      } finally {
        setIsStateLoading(false)
      }
    }
    void loadStates()
  }, [formData.country_id])

  const handleCountrySelect = (value: string) => {
    clearFieldError("country")
    clearFieldError("state")
    const countryId = Number(value)
    if (!value || Number.isNaN(countryId)) {
      setFormData((prev) => ({
        ...prev,
        country: "",
        country_id: null,
        state: "",
        state_id: null,
      }))
      return
    }
    const selectedCountry = countries.find((country) => country.id === countryId)
    setFormData((prev) => ({
      ...prev,
      country_id: selectedCountry?.id ?? countryId,
      country: selectedCountry?.name ?? prev.country,
      state: "",
      state_id: null,
    }))
  }

  const handleStateSelect = (value: string) => {
    clearFieldError("state")
    const stateId = Number(value)
    if (!value || Number.isNaN(stateId)) {
      setFormData((prev) => ({ ...prev, state: "", state_id: null }))
      return
    }
    const selectedState = states.find((state) => state.id === stateId)
    setFormData((prev) => ({
      ...prev,
      state_id: selectedState?.id ?? stateId,
      state: selectedState?.name ?? prev.state,
    }))
  }

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !customer) return

    const validTypes = ["image/png", "image/jpg", "image/jpeg", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, JPEG, or SVG file.",
        variant: "destructive",
      })
      return
    }

    const maxSize = 1 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must not exceed 1MB.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const result = await updateCustomerLogo(customer.id, file)
      if (!result) return
      const newLogoUrl = (result as any)?.logo_url || logoUrl
      if (newLogoUrl) {
        setLogoUrl(newLogoUrl)
        setCustomerLogo(String(customer.id), newLogoUrl)
        setCurrentCustomerLogo(newLogoUrl)
        onSuccess?.({ logo_url: newLogoUrl })
      }
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!customer) return
    if (!validateForm()) return

    setIsSaving(true)
    try {
      // Always submit the full editable payload so backend validation runs on all fields
      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        website: formData.website.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        postal_code: formData.postal_code.trim(),
        country_id: formData.country_id,
        state_id: formData.state_id,
      }
      if (customerType === "lab" && formData.release_casepan) {
        updateData.release_casepan = formData.release_casepan
      }

      const result = await updateCustomerProfile(customer.id, updateData as any)
      if (result) {
        onSuccess?.({
          name: formData.name.trim(),
          website: formData.website.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          postal_code: formData.postal_code.trim(),
          stateName: formData.state,
          stateId: formData.state_id,
          countryName: formData.country,
          countryId: formData.country_id,
          release_casepan: formData.release_casepan,
          code: formData.code.trim(),
          logo_url: logoUrl,
        })
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error(`Failed to update ${entityLabel.toLowerCase()} profile:`, error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) setFieldErrors({})
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {entityLabel} Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4 relative">
          {isLoadingProfile && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-gray-700 font-medium">Loading latest data...</span>
              </div>
            </div>
          )}

          <div className={isLoadingProfile ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50 overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${formData.name || entityLabel} Logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <span className="text-blue-600 text-2xl font-bold">
                    {formData.name?.[0]?.toUpperCase() || entityLabel[0]}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isLoadingProfile}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: {TOP_BAR_RECOMMENDED_LOGO_SIZES.center.md.width} ×{" "}
                  {TOP_BAR_RECOMMENDED_LOGO_SIZES.center.md.height} px
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="edit-customer-name">{entityLabel} Name *</Label>
                <Input
                  id="edit-customer-name"
                  value={formData.name}
                  onChange={(e) => {
                    clearFieldError("name")
                    setFormData({ ...formData, name: e.target.value })
                  }}
                  placeholder={`Enter ${entityLabel.toLowerCase()} name`}
                  disabled={isLoadingProfile}
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-customer-code">{entityLabel} Code *</Label>
                <Input
                  id="edit-customer-code"
                  value={formData.code}
                  onChange={(e) => {
                    clearFieldError("code")
                    setFormData({ ...formData, code: e.target.value })
                  }}
                  placeholder={`Enter ${entityLabel.toLowerCase()} code`}
                  disabled={isLoadingProfile}
                  aria-invalid={!!fieldErrors.code}
                />
                {fieldErrors.code && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.code}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="edit-customer-website">Website *</Label>
                <Input
                  id="edit-customer-website"
                  type="text"
                  value={formData.website}
                  onChange={(e) => {
                    clearFieldError("website")
                    setFormData({ ...formData, website: e.target.value })
                  }}
                  placeholder="https://example.com"
                  disabled={isLoadingProfile}
                  aria-invalid={!!fieldErrors.website}
                />
                {fieldErrors.website && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.website}</p>
                )}
              </div>
              {customerType === "lab" && (
                <div>
                  <Label htmlFor="edit-release-casepan">Release Casepan</Label>
                  <Select
                    value={formData.release_casepan}
                    onValueChange={(value) => {
                      clearFieldError("release_casepan")
                      setFormData({ ...formData, release_casepan: value })
                    }}
                    disabled={isLoadingProfile}
                  >
                    <SelectTrigger id="edit-release-casepan" className="w-full h-11">
                      <SelectValue placeholder="Select release casepan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="After Stage">After Stage</SelectItem>
                      <SelectItem value="After Product">After Product</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.release_casepan && (
                    <p className="text-sm text-destructive mt-1">{fieldErrors.release_casepan}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4">
              <Label htmlFor="edit-customer-address">Street Address *</Label>
              <Input
                id="edit-customer-address"
                value={formData.address}
                onChange={(e) => {
                  clearFieldError("address")
                  setFormData({ ...formData, address: e.target.value })
                }}
                placeholder="Enter street address"
                disabled={isLoadingProfile}
                aria-invalid={!!fieldErrors.address}
              />
              {fieldErrors.address && (
                <p className="text-sm text-destructive mt-1">{fieldErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <Label htmlFor="edit-customer-city">City *</Label>
                <Input
                  id="edit-customer-city"
                  value={formData.city}
                  onChange={(e) => {
                    clearFieldError("city")
                    setFormData({ ...formData, city: e.target.value })
                  }}
                  placeholder="Enter city"
                  disabled={isLoadingProfile}
                  aria-invalid={!!fieldErrors.city}
                />
                {fieldErrors.city && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.city}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-customer-postal">Postal Code *</Label>
                <Input
                  id="edit-customer-postal"
                  value={formData.postal_code}
                  onChange={(e) => {
                    clearFieldError("postal_code")
                    setFormData({ ...formData, postal_code: e.target.value })
                  }}
                  placeholder="Enter postal code"
                  disabled={isLoadingProfile}
                  aria-invalid={!!fieldErrors.postal_code}
                />
                {fieldErrors.postal_code && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.postal_code}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <Label htmlFor="edit-customer-country">Country *</Label>
                <Select
                  value={formData.country_id ? formData.country_id.toString() : ""}
                  onValueChange={handleCountrySelect}
                  disabled={isLoadingProfile}
                >
                  <SelectTrigger id="edit-customer-country" className="w-full h-11">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {isCountryLoading ? (
                      <SelectItem value="loading-countries" disabled>
                        Loading countries...
                      </SelectItem>
                    ) : countries.length === 0 ? (
                      <SelectItem value="no-countries" disabled>
                        No countries available
                      </SelectItem>
                    ) : (
                      countries.map((country) => (
                        <SelectItem key={country.id} value={country.id.toString()}>
                          {country.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.country && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.country}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-state">State / Province *</Label>
                <SearchableSelect
                  value={formData.state_id ? formData.state_id.toString() : ""}
                  onValueChange={handleStateSelect}
                  placeholder="Select state"
                  disabled={!formData.country_id || isLoadingProfile}
                  className="h-11"
                  options={
                    isStateLoading
                      ? [{ value: "loading-states", label: "Loading states...", disabled: true }]
                      : states.map((state) => ({
                          value: state.id.toString(),
                          label: state.name,
                        }))
                  }
                  emptyMessage={!formData.country_id ? "Select a country first" : "No states available"}
                  searchPlaceholder="Search states..."
                />
                {fieldErrors.state && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.state}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isLoadingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoadingProfile}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
