"use client"

import { useState, useRef, useEffect } from "react"
import { Edit, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useCustomer } from "@/contexts/customer-context"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { TOP_BAR_RECOMMENDED_LOGO_SIZES } from "@/components/case-design-center/components/TopBar"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface LocationOption {
  id: number
  name: string
}

const isLocationOption = (item: any): item is LocationOption =>
  !!item && typeof item.id === "number" && typeof item.name === "string"

const normalizeLocationList = (items: any): LocationOption[] => {
  if (!Array.isArray(items)) {
    return []
  }
  return items.filter(isLocationOption).map((item) => ({
    id: item.id,
    name: item.name,
  }))
}
interface OverviewTabProps {
  labData: {
    name: string
    id: string
    number: string
    email: string
    address: string
    website: string
    contactName: string
    contactEmail: string
    contactNumber: string
    joiningDate: string
    position: string
    logo_url?: string
    stateName?: string
    stateId?: number | null
    countryName?: string
    countryId?: number | null
    release_casepan?: string
  }
  onLogoUpdate?: (logoUrl: string) => void
  onProfileUpdate?: () => void
}

export default function OverviewTab({ labData, onLogoUpdate, onProfileUpdate }: OverviewTabProps) {
  const [logoUrl, setLogoUrl] = useState<string>(labData.logo_url || "")
  const [isUploading, setIsUploading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [originalFormData, setOriginalFormData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { updateCustomerProfile } = useCustomer()
  const { setCustomerLogo, setCurrentCustomerLogo } = useCustomerLogoStore()
  const [countries, setCountries] = useState<LocationOption[]>([])
  const [states, setStates] = useState<LocationOption[]>([])
  const [isCountryLoading, setIsCountryLoading] = useState(false)
  const [isStateLoading, setIsStateLoading] = useState(false)

  // Form state - parse address on mount
  const parseAddress = (addressString: string) => {
    const parts = addressString.split(',').map(p => p.trim()).filter(Boolean)
    
    // Extract postal code - it's typically the last part, but may contain country name
    let postalCode = parts[parts.length - 1] || ""
    
    // Remove country names and extract only the postal code
    // Postal codes are typically numeric or alphanumeric patterns
    // Try to match common postal code patterns: digits, digits with letters, or alphanumeric
    const postalCodePatterns = [
      /\d{5}(-\d{4})?/,           // US ZIP: 12345 or 12345-6789
      /\d{5}/,                     // Simple 5-digit
      /\d{4,10}/,                  // 4-10 digit codes
      /[A-Za-z]\d+[A-Za-z\d]*/,    // Alphanumeric like Canadian: A1B2C3
      /\d+[A-Za-z]/,               // UK style: SW1A1AA (simplified)
    ]
    
    // Try each pattern
    for (const pattern of postalCodePatterns) {
      const match = postalCode.match(pattern)
      if (match) {
        postalCode = match[0].trim()
        break
      }
    }
    
    // If no pattern matched, try to extract just numbers as fallback
    if (!postalCode || postalCode === parts[parts.length - 1]) {
      const numbersOnly = parts[parts.length - 1]?.match(/\d+/)
      postalCode = numbersOnly ? numbersOnly[0] : ""
    }
    
    return {
      address: parts[0] || "",
      city: parts[1] || "",
      postal_code: postalCode,
    }
  }

  const [formData, setFormData] = useState(() => {
    const parsed = parseAddress(labData.address)
    return {
      name: labData.name,
      email: labData.email,
      website: labData.website || "",
      address: parsed.address,
      city: parsed.city,
      postal_code: parsed.postal_code,
      country: labData.countryName || "",
      country_id: labData.countryId ?? null,
      state: labData.stateName || "",
      state_id: labData.stateId ?? null,
      release_casepan: labData.release_casepan || "",
    }
  })

  // Update form data when labData changes
  useEffect(() => {
    const parsed = parseAddress(labData.address)
    setFormData({
      name: labData.name,
      email: labData.email,
      website: labData.website || "",
      address: parsed.address,
      city: parsed.city,
      postal_code: parsed.postal_code,
      country: labData.countryName || "",
      country_id: labData.countryId ?? null,
      state: labData.stateName || "",
      state_id: labData.stateId ?? null,
      release_casepan: labData.release_casepan || "",
    })
  }, [labData])

  useEffect(() => {
    const loadCountries = async () => {
      if (!API_BASE_URL) {
        setCountries([])
        return
      }

      setIsCountryLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/general/countries`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch countries")
        }

        const result = await response.json()
        const dataSource = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
        setCountries(normalizeLocationList(dataSource))
      } catch (error) {
        console.error("Error fetching countries:", error)
      } finally {
        setIsCountryLoading(false)
      }
    }

    loadCountries()
  }, [])

  useEffect(() => {
    const loadStates = async () => {
      if (!formData.country_id || !API_BASE_URL) {
        setStates([])
        setIsStateLoading(false)
        return
      }

      setStates([])
      setIsStateLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/general/states/${formData.country_id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch states")
        }

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

    loadStates()
  }, [formData.country_id])

  // Update logo URL when labData changes
  useEffect(() => {
    if (labData.logo_url) {
      setLogoUrl(labData.logo_url)
    } else {
      setLogoUrl("")
    }
  }, [labData.logo_url])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, JPEG, or SVG file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (1MB max)
    const maxSize = 1 * 1024 * 1024 // 1MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must not exceed 1MB.",
        variant: "destructive",
      })
      return
    }

    // Upload the file
    await uploadLogo(file)
  }

  const uploadLogo = async (file: File) => {
    setIsUploading(true)
    try {
      const customerId = labData.id
      const token = localStorage.getItem('token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Create FormData for multipart form submission
      const formData = new FormData()
      formData.append('logo', file)

      // Upload the logo
      const response = await fetch(`${apiBaseUrl}/customers/${customerId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        },
        body: formData,
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to upload logo: ${response.status}`)
      }

      const result = await response.json()
      const newLogoUrl = result.data?.logo_url || result.logo_url

      if (newLogoUrl) {
        setLogoUrl(newLogoUrl)
        
        // Update Zustand store and localStorage
        const customerId = labData.id
        setCustomerLogo(customerId, newLogoUrl)
        setCurrentCustomerLogo(newLogoUrl)
        
        if (onLogoUpdate) {
          onLogoUpdate(newLogoUrl)
        }
        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        })
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const fetchCustomerData = async (customerId: number) => {
    setIsLoadingProfile(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return null
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch customer data: ${response.status}`)
      }

      const result = await response.json()
      const customerData = result.data

      // Populate form with fetched data
      const fetchedFormData = {
        name: customerData.name || "",
        email: customerData.email || "",
        website: customerData.website || "",
        address: customerData.address || "",
        city: customerData.city || "",
        postal_code: customerData.postal_code || "",
        country: customerData.country?.name || "",
        country_id: customerData.country?.id ?? null,
        state: customerData.state?.name || "",
        state_id: customerData.state?.id ?? null,
        release_casepan: customerData.release_casepan || "",
      }
      
      setFormData(fetchedFormData)
      // Store original values for comparison
      setOriginalFormData({ ...fetchedFormData })

      return customerData
    } catch (error: any) {
      console.error("Error fetching customer data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch customer data. Please try again.",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleEditClick = async () => {
    setIsEditModalOpen(true)
    
    // Initialize form with current data first (for immediate display)
    const parsed = parseAddress(labData.address)
    const initialFormData = {
      name: labData.name,
      email: labData.email,
      website: labData.website || "",
      address: parsed.address,
      city: parsed.city,
      postal_code: parsed.postal_code,
      country: labData.countryName || "",
      country_id: labData.countryId ?? null,
      state: labData.stateName || "",
      state_id: labData.stateId ?? null,
      release_casepan: labData.release_casepan || "",
    }
    
    setFormData(initialFormData)
    // Store original values for comparison (will be updated after API fetch)
    setOriginalFormData({ ...initialFormData })

    // Fetch latest data from API
    const customerId = Number(labData.id)
    if (customerId) {
      await fetchCustomerData(customerId)
    }
  }

  const handleCountrySelect = (value: string) => {
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
    const stateId = Number(value)
    if (!value || Number.isNaN(stateId)) {
      setFormData((prev) => ({
        ...prev,
        state: "",
        state_id: null,
      }))
      return
    }

    const selectedState = states.find((state) => state.id === stateId)
    setFormData((prev) => ({
      ...prev,
      state_id: selectedState?.id ?? stateId,
      state: selectedState?.name ?? prev.state,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!originalFormData) {
        toast({
          title: "Error",
          description: "Original data not found. Please try again.",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      const updateData: any = {}

      // Only include fields that have changed
      if (formData.name !== originalFormData.name) {
        updateData.name = formData.name
      }

      if (formData.email !== originalFormData.email) {
        updateData.email = formData.email
      }

      if (formData.website !== originalFormData.website) {
        updateData.website = formData.website
      }

      if (formData.address !== originalFormData.address) {
        updateData.address = formData.address
      }

      if (formData.city !== originalFormData.city) {
        updateData.city = formData.city
      }

      if (formData.postal_code !== originalFormData.postal_code) {
        updateData.postal_code = formData.postal_code
      }

      // Compare country_id
      if (formData.country_id !== originalFormData.country_id) {
        updateData.country_id = formData.country_id
      }

      // Compare state_id
      if (formData.state_id !== originalFormData.state_id) {
        updateData.state_id = formData.state_id
      }

      // Compare release_casepan
      if (formData.release_casepan !== originalFormData.release_casepan) {
        // Only include if it has a value
        if (formData.release_casepan && formData.release_casepan !== "") {
          updateData.release_casepan = formData.release_casepan
        }
      }

      // If no fields have changed, show a message and return
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes",
          description: "No fields have been modified.",
        })
        setIsSaving(false)
        return
      }

      console.log("Update payload (only changed fields):", JSON.stringify(updateData, null, 2)) // Debug log

      const result = await updateCustomerProfile(Number(labData.id), updateData)
      
      if (result) {
        setOriginalFormData(null) // Reset original data
        setIsEditModalOpen(false)
        if (onProfileUpdate) {
          onProfileUpdate()
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6">
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Lab Info
            <button 
              onClick={handleEditClick}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit Lab Info"
            >
              <Edit className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50 overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${labData.name} Logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback: hide image and show initial if load fails
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.parentElement?.querySelector('.lab-initial-fallback');
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span
                  className={`lab-initial-fallback text-blue-600 text-2xl font-bold ${logoUrl ? "hidden" : ""}`}
                  style={{ lineHeight: "4rem" }}
                >
                  {labData.name?.[0]?.toUpperCase() || "L"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-1">
                <Button 
                  size="sm" 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading....
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: {TOP_BAR_RECOMMENDED_LOGO_SIZES.center.md.width} × {TOP_BAR_RECOMMENDED_LOGO_SIZES.center.md.height} px (displays in header center).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab Name:</label>
                <p className="font-medium text-sm">{labData.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab ID:</label>
                <p className="font-medium text-sm">{labData.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab Number:</label>
                <p className="font-medium text-sm">{labData.number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab email:</label>
                <p className="font-medium text-sm">{labData.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Address:</label>
                <p className="font-medium text-sm">{labData.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">State:</label>
                <p className="font-medium text-sm">{labData.stateName || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Country:</label>
                <p className="font-medium text-sm">{labData.countryName || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Website:</label>
                <p className="font-medium text-blue-600 text-sm">{labData.website}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Name:</label>
                <p className="font-medium text-sm">{labData.contactName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Email:</label>
                <p className="font-medium text-sm">{labData.contactEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact number:</label>
                <p className="font-medium text-sm">{labData.contactNumber}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Joining Date:</label>
                <p className="font-medium text-sm">{labData.joiningDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Position:</label>
                <p className="font-medium text-sm">{labData.position}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Release Casepan:</label>
                <p className="font-medium text-sm">{labData.release_casepan || "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog 
        open={isEditModalOpen} 
        onOpenChange={(open) => {
          setIsEditModalOpen(open)
          if (!open) {
            // Reset original data when modal closes
            setOriginalFormData(null)
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lab Information</DialogTitle>
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Lab Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter lab name"
                    disabled={isLoadingProfile}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                    disabled={isLoadingProfile}
                  />
                </div>
              </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  disabled={isLoadingProfile}
                />
              </div>

              <div>
                <Label htmlFor="release-casepan-select">Release Casepan</Label>
                <Select
                  value={formData.release_casepan}
                  onValueChange={(value) => setFormData({ ...formData, release_casepan: value })}
                  disabled={isLoadingProfile}
                >
                  <SelectTrigger id="release-casepan-select" className="w-full h-11">
                    <SelectValue placeholder="Select release casepan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="After Stage">After Stage</SelectItem>
                    <SelectItem value="After Product">After Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter street address"
                disabled={isLoadingProfile}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter city"
                  disabled={isLoadingProfile}
                />
              </div>

              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="Enter postal code"
                  disabled={isLoadingProfile}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="country-select">Country</Label>
                <Select
                  value={formData.country_id ? formData.country_id.toString() : ""}
                  onValueChange={handleCountrySelect}
                  disabled={isLoadingProfile}
                >
                  <SelectTrigger id="country-select" className="w-full h-11">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="state-select">State / Province</Label>
                <SearchableSelect
                  value={formData.state_id ? formData.state_id.toString() : ""}
                  onValueChange={handleStateSelect}
                  placeholder="Select state"
                  disabled={!formData.country_id || isLoadingProfile}
                  className="h-11"
                  options={
                    isStateLoading
                      ? [
                          {
                            value: "loading-states",
                            label: "Loading states...",
                            disabled: true,
                          },
                        ]
                      : states.map((state) => ({
                          value: state.id.toString(),
                          label: state.name,
                        }))
                  }
                  emptyMessage={
                    !formData.country_id
                      ? "Select a country first"
                      : "No states available"
                  }
                  searchPlaceholder="Search states..."
                />
              </div>
            </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving || isLoadingProfile}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoadingProfile || !formData.name || !formData.email}
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
    </div>
  )
}

