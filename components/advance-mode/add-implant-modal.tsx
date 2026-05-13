"use client"

import { useState, useEffect, useRef } from "react"
import { X, HelpCircle, Copy, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Implant, ImplantPlatform } from "@/lib/api/advance-mode-query"
import { generateCodeFromName } from "@/lib/utils"

interface AddImplantModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: any) => void
  implant?: Implant | null
  isEditMode?: boolean
  isCopying?: boolean
  isSaving?: boolean
}

interface PlatformOption {
  id: string
  image: string | null
  platformName: string
  isDefault: boolean
  status: boolean
  price?: string
  sizes: SizeOption[]
}

interface SizeOption {
  id: string
  isDefault: boolean
  diameterMm: string
  lengthMm: string
  label: string
  price?: string
  status: boolean
}

export function AddImplantModal({ isOpen, onClose, onSave, implant, isEditMode = false, isCopying = false, isSaving: externalIsSaving = false }: AddImplantModalProps) {
  const [activeTab, setActiveTab] = useState<"platform-options" | "additional-pricing">("platform-options")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    brandName: "",
    systemName: "",
    code: "",
    allowUserInput: true,
    description: "",
    implantDetails: true,
  })

  const [pricingData, setPricingData] = useState({
    canAddAdditionalCharges: false,
    chargeType: "once-per-implant" as "once-per-implant" | "per-platform-option" | "per-size-option",
    additionalCharge: "0.00",
    chargeScope: "per_case",
  })

  const [platforms, setPlatforms] = useState<PlatformOption[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(platforms.length / itemsPerPage)
  const [internalIsSaving, setInternalIsSaving] = useState(false)
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const platformImageInputRef = useRef<HTMLInputElement>(null)

  // Use external isSaving if provided, otherwise use internal state
  const isSaving = externalIsSaving || internalIsSaving

  // Load implant data when in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && implant) {
      setInternalIsSaving(false)
      setIsCodeManuallyEdited(true)
      setFormData({
        brandName: implant.brand_name || "",
        systemName: implant.system_name || "",
        code: implant.code || "",
        allowUserInput: implant.allow_user_input === "Yes",
        description: implant.description || "",
        implantDetails: true,
      })

      const apiChargeType = implant.charge_type as string | null | undefined
      setPricingData({
        canAddAdditionalCharges: implant.has_additional_pricing === "Yes",
        chargeType:
          apiChargeType === "per_size_option"
            ? "per-size-option"
            : apiChargeType === "per_platform_option"
              ? "per-platform-option"
              : "once-per-implant",
        additionalCharge: implant.price?.toString() || "0.00",
        chargeScope: implant.charge_scope || "per_case",
      })

      // Set image preview if implant has image
      if (implant.image_url) {
        setImagePreview(implant.image_url)
        // Don't set imageBase64 for existing images (only for newly uploaded ones)
        setImageBase64(null)
      } else {
        setImagePreview(null)
        setImageBase64(null)
      }

      // Convert platforms to PlatformOption format
      if (implant.platforms && implant.platforms.length > 0) {
        const convertedPlatforms: PlatformOption[] = implant.platforms.map((platform: ImplantPlatform, index: number) => ({
          id: platform.id?.toString() || String(index + 1),
          image: platform.image_url || null,
          platformName: platform.name || "",
          isDefault: platform.is_default === "Yes",
          status: platform.status === "Active",
          price: platform.price?.toString() || "0.00",
          sizes: ((platform as any).sizes || []).map((size: any, sizeIndex: number) => ({
            id: size.id?.toString() || `${platform.id || index + 1}-size-${sizeIndex + 1}`,
            isDefault: size.is_default === "Yes",
            diameterMm: size.diameter_mm?.toString() || "",
            lengthMm: size.length_mm?.toString() || "",
            label: size.label || "",
            price: size.price?.toString() || "0",
            status: (size.status || "Active") === "Active",
          })),
        }))
        setPlatforms(convertedPlatforms)
        setSelectedPlatformId(convertedPlatforms[0]?.id ?? null)
      } else {
        setPlatforms([])
        setSelectedPlatformId(null)
      }
    } else if (isOpen && isCopying && implant) {
      setInternalIsSaving(false)
      setIsCodeManuallyEdited(true)
      setFormData({
        brandName: implant.brand_name || "",
        systemName: implant.system_name || "",
        code: `${implant.code || ""}-copy`,
        allowUserInput: implant.allow_user_input === "Yes",
        description: implant.description || "",
        implantDetails: true,
      })

      const apiChargeType = implant.charge_type as string | null | undefined
      setPricingData({
        canAddAdditionalCharges: implant.has_additional_pricing === "Yes",
        chargeType:
          apiChargeType === "per_size_option"
            ? "per-size-option"
            : apiChargeType === "per_platform_option"
              ? "per-platform-option"
              : "once-per-implant",
        additionalCharge: implant.price?.toString() || "0.00",
        chargeScope: implant.charge_scope || "per_case",
      })

      // Set image preview if implant has image
      if (implant.image_url) {
        setImagePreview(implant.image_url)
        setImageBase64(null)
      } else {
        setImagePreview(null)
        setImageBase64(null)
      }

      // Convert platforms to PlatformOption format
      if (implant.platforms && implant.platforms.length > 0) {
        const convertedPlatforms: PlatformOption[] = implant.platforms.map((platform: ImplantPlatform, index: number) => ({
          id: `clone-${platform.id || index}-${Date.now()}`,
          image: platform.image_url || null,
          platformName: platform.name || "",
          isDefault: platform.is_default === "Yes",
          status: platform.status === "Active",
          price: platform.price?.toString() || "0.00",
          sizes: ((platform as any).sizes || []).map((size: any, sizeIndex: number) => ({
            id: `clone-size-${size.id || sizeIndex}-${Date.now()}`,
            isDefault: size.is_default === "Yes",
            diameterMm: size.diameter_mm?.toString() || "",
            lengthMm: size.length_mm?.toString() || "",
            label: size.label || "",
            price: size.price?.toString() || "0",
            status: (size.status || "Active") === "Active",
          })),
        }))
        setPlatforms(convertedPlatforms)
        setSelectedPlatformId(convertedPlatforms[0]?.id ?? null)
      } else {
        setPlatforms([])
        setSelectedPlatformId(null)
      }
    } else if (isOpen && !isEditMode && !isCopying) {
      // Reset all fields when modal opens in create mode
      setActiveTab("platform-options")
      setSearchQuery("")
      setInternalIsSaving(false)
      setIsCodeManuallyEdited(false)
      setFormData({
        brandName: "",
        systemName: "",
        code: "",
        allowUserInput: true,
        description: "",
        implantDetails: true,
      })
      setPricingData({
        canAddAdditionalCharges: false,
        chargeType: "once-per-implant" as "once-per-implant" | "per-platform-option" | "per-size-option",
        additionalCharge: "0.00",
        chargeScope: "per_case",
      })
      setPlatforms([])
      setSelectedPlatformId(null)
      setCurrentPage(1)
      setImageBase64(null)
      setImagePreview(null)
    }
  }, [isOpen, isEditMode, isCopying, implant])

  // Auto-generate code for new implants from brand + system.
  // Keep it user-editable by stopping auto-generation after manual code edit.
  useEffect(() => {
    if (!isOpen || isEditMode || isCodeManuallyEdited) return
    const sourceName = `${formData.brandName || ""} ${formData.systemName || ""}`.trim()
    if (!sourceName) {
      if (formData.code) {
        setFormData((prev) => ({ ...prev, code: "" }))
      }
      return
    }
    const generated = generateCodeFromName(sourceName)
    if (generated && formData.code !== generated) {
      setFormData((prev) => ({ ...prev, code: generated }))
    }
  }, [isOpen, isEditMode, isCodeManuallyEdited, formData.brandName, formData.systemName, formData.code])

  if (!isOpen) return null

  // Image handling functions
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should not exceed 5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImageBase64(base64String)
        setImagePreview(base64String)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
      setImageBase64(null)
    }
    // Clear the input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    // Prevent multiple clicks
    if (isSaving) {
      return
    }

    // Set loading state immediately (only if not using external state)
    if (!externalIsSaving) {
      setInternalIsSaving(true)
    }
    
    if (!formData.brandName || !formData.systemName || !formData.code) {
      // Validation would be handled by parent component
      if (!externalIsSaving) {
        setInternalIsSaving(false)
      }
      if (onSave) {
        onSave({ ...formData, platforms, pricing: pricingData })
      }
      return
    }

    try {
      // Format data for API
      const apiData: any = {
        brand_name: formData.brandName,
        system_name: formData.systemName,
        code: formData.code,
        description: formData.description,
        allow_user_input: formData.allowUserInput ? "Yes" : "No",
        status: "Active",
        has_additional_pricing: pricingData.canAddAdditionalCharges ? "Yes" : "No",
      }

      if (pricingData.canAddAdditionalCharges) {
        if (pricingData.chargeType === "once-per-implant") {
          apiData.charge_type = "once_per_implant"
          apiData.price = parseFloat(pricingData.additionalCharge) || 0
          apiData.charge_scope = pricingData.chargeScope
        } else {
          apiData.charge_type = pricingData.chargeType === "per-size-option" ? "per_size_option" : "per_platform_option"
          apiData.charge_scope = pricingData.chargeScope
        }
      }

      // Format platforms
      if (platforms.length > 0) {
        apiData.platforms = platforms.map((platform, index) => {
          const platformData: any = {
            name: platform.platformName,
            status: platform.status ? "Active" : "Inactive",
            is_default: platform.isDefault ? "Yes" : "No",
            sequence: index + 1,
          }
          
          if (platform.image && platform.image.startsWith("data:image/")) {
            platformData.image = platform.image
          }
          
          if (pricingData.chargeType === "per-platform-option" && platform.price) {
            platformData.price = parseFloat(platform.price) || 0
          }

          if (platform.sizes.length > 0) {
            platformData.sizes = platform.sizes.map((size, sizeIndex) => {
              const sizeData: any = {
                is_default: size.isDefault ? "Yes" : "No",
                diameter_mm: parseFloat(size.diameterMm) || 0,
                length_mm: parseFloat(size.lengthMm) || 0,
                label: size.label?.trim() || `Ø ${size.diameterMm || 0} mm × ${size.lengthMm || 0} mm`,
                status: size.status ? "Active" : "Inactive",
                sequence: sizeIndex + 1,
              }

              if (pricingData.chargeType === "per-size-option") {
                sizeData.price = parseFloat(size.price || "0") || 0
              }

              if (isEditMode) {
                const sizeId = parseInt(size.id, 10)
                if (!isNaN(sizeId)) {
                  sizeData.id = sizeId
                }
              }

              return sizeData
            })
          }
          
          // Include id if editing existing platform
          if (platform.id && isEditMode) {
            const platformId = parseInt(platform.id)
            if (!isNaN(platformId)) {
              platformData.id = platformId
            }
          }
          
          return platformData
        })
      }

      // Add customer_id if role is lab_admin (only for create mode)
      if (!isEditMode && typeof window !== 'undefined') {
        const role = localStorage.getItem('role')
        if (role === 'lab_admin') {
          const customerId = localStorage.getItem('customerId')
          if (customerId) {
            apiData.customer_id = parseInt(customerId, 10)
          }
        }
      }

      // Price is already included above when canAddAdditionalCharges is true and chargeType is "once-per-implant"
      // The price will be in apiData.price if those conditions are met

      // Add image as base64 if it exists (only if it's a newly uploaded base64 string)
      if (imageBase64 && imageBase64.startsWith('data:image/')) {
        apiData.image = imageBase64
      }

      if (onSave) {
        // If onSave is async, await it
        await onSave(apiData)
      }
    } catch (error) {
      console.error("Error saving implant:", error)
    } finally {
      // Only reset internal state if not using external state
      if (!externalIsSaving) {
        setInternalIsSaving(false)
      }
    }
  }

  const handleAddOption = () => {
    const newPlatform: PlatformOption = {
      id: `tmp-platform-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      image: null,
      platformName: "",
      isDefault: false,
      status: true,
      price: "0.00",
      sizes: [],
    }
    const updated = [...platforms, newPlatform]
    setPlatforms(updated)
    if (!selectedPlatformId) {
      setSelectedPlatformId(newPlatform.id)
    }
  }

  const handleUpdatePlatformPrice = (id: string, price: string) => {
    setPlatforms(
      platforms.map((plat) =>
        plat.id === id ? { ...plat, price } : plat
      )
    )
  }

  const handleUpdatePlatformName = (id: string, platformName: string) => {
    setPlatforms(
      platforms.map((plat) =>
        plat.id === id ? { ...plat, platformName } : plat
      )
    )
  }

  const handlePlatformImageClick = () => {
    platformImageInputRef.current?.click()
  }

  const handlePlatformImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetPlatformId = selectedPlatformId
    if (!file || !targetPlatformId) return

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should not exceed 5MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.id === targetPlatformId ? { ...platform, image: base64String } : platform,
        ),
      )
    }
    reader.readAsDataURL(file)

    if (platformImageInputRef.current) {
      platformImageInputRef.current.value = ""
    }
  }

  const handleRemovePlatformImage = (platformId: string) => {
    setPlatforms((prev) =>
      prev.map((platform) => (platform.id === platformId ? { ...platform, image: null } : platform)),
    )
    if (platformImageInputRef.current) {
      platformImageInputRef.current.value = ""
    }
  }

  const handleDeletePlatform = (id: string) => {
    const updated = platforms.filter((plat) => plat.id !== id)
    setPlatforms(updated)
    if (selectedPlatformId === id) {
      setSelectedPlatformId(updated[0]?.id ?? null)
    }
  }

  const handleDuplicatePlatform = (id: string) => {
    const platform = platforms.find((plat) => plat.id === id)
    if (platform) {
      const newPlatform = {
        ...platform,
        id: String(platforms.length + 1),
        platformName: `${platform.platformName} (Copy)`,
        price: platform.price || "0.00",
        sizes: platform.sizes.map((size) => ({
          ...size,
          id: `tmp-size-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        })),
      }
      setPlatforms([...platforms, newPlatform])
    }
  }

  const toggleDefault = (id: string) => {
    setPlatforms(
      platforms.map((plat) => ({
        ...plat,
        isDefault: plat.id === id,
      }))
    )
  }

  const toggleStatus = (id: string) => {
    setPlatforms(
      platforms.map((plat) =>
        plat.id === id ? { ...plat, status: !plat.status } : plat
      )
    )
  }

  const getSelectedPlatform = () => platforms.find((platform) => platform.id === selectedPlatformId) ?? null

  const handleAddSize = () => {
    if (!selectedPlatformId) return
    setPlatforms((prev) =>
      prev.map((platform) => {
        if (platform.id !== selectedPlatformId) return platform
        const newSize: SizeOption = {
          id: `tmp-size-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          isDefault: platform.sizes.length === 0,
          diameterMm: "",
          lengthMm: "",
          label: "",
          price: "0",
          status: true,
        }
        return { ...platform, sizes: [...platform.sizes, newSize] }
      }),
    )
  }

  const handleUpdateSize = (platformId: string, sizeId: string, patch: Partial<SizeOption>) => {
    setPlatforms((prev) =>
      prev.map((platform) => {
        if (platform.id !== platformId) return platform
        return {
          ...platform,
          sizes: platform.sizes.map((size) => {
            if (size.id !== sizeId) return size
            const previousAutoLabel = `Ø ${size.diameterMm || "0"} mm × ${size.lengthMm || "0"} mm`
            const next = { ...size, ...patch }
            if (
              patch.diameterMm !== undefined ||
              patch.lengthMm !== undefined
            ) {
              const d = next.diameterMm || "0"
              const l = next.lengthMm || "0"
              // Keep manual label edits, but keep auto-generated labels in sync with inputs.
              if (!size.label || size.label === previousAutoLabel) {
                next.label = `Ø ${d} mm × ${l} mm`
              }
            }
            return next
          }),
        }
      }),
    )
  }

  const handleDeleteSize = (platformId: string, sizeId: string) => {
    setPlatforms((prev) =>
      prev.map((platform) => {
        if (platform.id !== platformId) return platform
        const filtered = platform.sizes.filter((size) => size.id !== sizeId)
        return { ...platform, sizes: filtered }
      }),
    )
  }

  const toggleSizeDefault = (platformId: string, sizeId: string) => {
    setPlatforms((prev) =>
      prev.map((platform) => {
        if (platform.id !== platformId) return platform
        return {
          ...platform,
          sizes: platform.sizes.map((size) => ({ ...size, isDefault: size.id === sizeId })),
        }
      }),
    )
  }

  const filteredPlatforms = platforms.filter((platform) =>
    platform.platformName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedPlatforms = filteredPlatforms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl h-full max-h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isEditMode ? "Edit Implant" : isCopying ? "Clone Implant" : "Add Implant"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Left Side - Image Upload */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm sm:text-base font-medium">Implant details</Label>
                <HelpCircle className="h-4 w-4 text-gray-400" />
                <Switch
                  checked={formData.implantDetails}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, implantDetails: checked })
                  }
                  className="data-[state=checked]:bg-[#1162a8]"
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 flex items-center justify-center bg-gray-50 h-32 sm:h-48 w-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group"
                    onClick={handleImageClick}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Implant preview"
                        className="object-cover h-full w-full rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="mx-auto w-16 h-16 flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-gray-400 group-hover:text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 mt-2 block">Click to upload image</span>
                      </div>
                    )}
                  </div>
                </div>
                {imagePreview && (
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const newWindow = window.open()
                        if (newWindow && imagePreview) {
                          newWindow.document.write(`<img src="${imagePreview}" style="max-width: 100%; height: auto;" />`)
                        }
                      }}
                      className="flex-1"
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Right Side - Form Fields */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <Label htmlFor="brandName" className="text-sm font-medium text-gray-700">
                  Brand Name
                </Label>
                <Input
                  id="brandName"
                  placeholder="Straumann"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="systemName" className="text-sm font-medium text-gray-700">
                  System name
                </Label>
                <Input
                  id="systemName"
                  placeholder="Bone Level Implants (BL)"
                  value={formData.systemName}
                  onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                  Code
                </Label>
                <Input
                  id="code"
                  placeholder="STR-BLX"
                  value={formData.code}
                  onChange={(e) => {
                    setIsCodeManuallyEdited(true)
                    setFormData({ ...formData, code: e.target.value })
                  }}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="allowUserInput"
                  checked={formData.allowUserInput}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowUserInput: !!checked })
                  }
                  className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                />
                <Label htmlFor="allowUserInput" className="text-sm font-medium text-gray-700">
                  Allow user to input own system, platform and size
                </Label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 sm:mb-6">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter your field description here."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 min-h-[80px] sm:min-h-[100px]"
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-4 sm:gap-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("platform-options")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "platform-options"
                    ? "border-[#1162a8] text-[#1162a8]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Platform Options
              </button>
              <button
                onClick={() => setActiveTab("additional-pricing")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "additional-pricing"
                    ? "border-[#1162a8] text-[#1162a8]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Additional Pricing
              </button>
            </div>
          </div>

          {/* Platform Options Tab Content */}
          {activeTab === "platform-options" && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-3 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Button onClick={handleAddOption} variant="outline" size="sm">
                      Add Platform
                    </Button>
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search platform..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {paginatedPlatforms.map((platform) => (
                      <div
                        key={platform.id}
                        onClick={() => setSelectedPlatformId(platform.id)}
                        className={`rounded border p-2 cursor-pointer transition-colors ${
                          selectedPlatformId === platform.id ? "border-[#1162a8] bg-[#eaf2fb]" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedPlatformId === platform.id}
                            onCheckedChange={() => setSelectedPlatformId(platform.id)}
                            className="data-[state=checked]:bg-[#8b5cf6] data-[state=checked]:border-[#8b5cf6]"
                          />
                          <div className="flex-1">
                            <Input
                              value={platform.platformName}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdatePlatformName(platform.id, e.target.value)}
                              className="h-8 text-sm bg-white"
                            />
                          </div>
                          <Switch
                            checked={platform.status}
                            onCheckedChange={() => toggleStatus(platform.id)}
                            className="data-[state=checked]:bg-[#2563eb]"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePlatform(platform.id)
                            }}
                            aria-label="Delete platform"
                            title="Delete platform"
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">{platform.sizes.length} sizes</p>

                        {pricingData.canAddAdditionalCharges && pricingData.chargeType === "per-platform-option" && (
                          <div className="mt-2">
                            <Input
                              type="text"
                              value={platform.price || "0"}
                              onChange={(e) => handleUpdatePlatformPrice(platform.id, e.target.value.replace(/[^0-9.]/g, ""))}
                              className="h-7 text-xs"
                              placeholder="0"
                            />
                            <p className="text-[10px] text-right text-gray-500 mt-1">+ ${platform.price || "0.00"}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {paginatedPlatforms.length === 0 && (
                      <div className="rounded border border-gray-100 px-3 py-4 text-sm text-gray-500">
                        No platforms yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-9 border border-gray-200 rounded-lg p-3">
                  {getSelectedPlatform() ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{getSelectedPlatform()?.platformName}</h3>
                          <p className="text-xs text-gray-500">Add sizes under the selected platform.</p>
                        </div>
                        <Button onClick={handleAddSize} variant="outline" size="sm">
                          Add Size
                        </Button>
                      </div>

                      <div className="mb-3">
                        <div
                          className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded border border-gray-200"
                          onClick={handlePlatformImageClick}
                          title="Click to upload/replace platform image"
                        >
                          {getSelectedPlatform()?.image ? (
                            <>
                              <img
                                src={getSelectedPlatform()?.image || ""}
                                alt="Platform preview"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemovePlatformImage(getSelectedPlatform()!.id)
                                }}
                                className="absolute inset-0 hidden items-center justify-center bg-black/45 text-white group-hover:flex"
                                aria-label="Remove platform image"
                                title="Remove image"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <div className="h-full w-full border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-500 flex items-center justify-center text-center px-1">
                              Add
                            </div>
                          )}
                        </div>
                        <input
                          ref={platformImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePlatformImageChange}
                          className="hidden"
                        />
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px]">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left text-xs text-gray-600 py-2 pr-2">Default</th>
                              <th className="text-left text-xs text-gray-600 py-2 pr-2">Diameter (mm)</th>
                              <th className="text-left text-xs text-gray-600 py-2 pr-2">Length (mm)</th>
                              <th className="text-left text-xs text-gray-600 py-2 pr-2">Label</th>
                              {pricingData.canAddAdditionalCharges && pricingData.chargeType === "per-size-option" && (
                                <th className="text-left text-xs text-gray-600 py-2 pr-2">Add. Price</th>
                              )}
                              <th className="text-left text-xs text-gray-600 py-2 pr-2">Status</th>
                              <th className="text-left text-xs text-gray-600 py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getSelectedPlatform()?.sizes.map((size) => (
                              <tr key={size.id} className="border-b border-gray-100">
                                <td className="py-2 pr-2">
                                  <Checkbox
                                    checked={size.isDefault}
                                    onCheckedChange={() => toggleSizeDefault(getSelectedPlatform()!.id, size.id)}
                                    className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <Input
                                    value={size.diameterMm}
                                    onChange={(e) =>
                                      handleUpdateSize(getSelectedPlatform()!.id, size.id, {
                                        diameterMm: e.target.value.replace(/[^0-9.]/g, ""),
                                      })
                                    }
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <Input
                                    value={size.lengthMm}
                                    onChange={(e) =>
                                      handleUpdateSize(getSelectedPlatform()!.id, size.id, {
                                        lengthMm: e.target.value.replace(/[^0-9.]/g, ""),
                                      })
                                    }
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <Input
                                    value={size.label}
                                    onChange={(e) => handleUpdateSize(getSelectedPlatform()!.id, size.id, { label: e.target.value })}
                                    className="h-8 text-xs"
                                    placeholder="Auto (Ø diameter mm × length mm)"
                                  />
                                </td>
                                {pricingData.canAddAdditionalCharges && pricingData.chargeType === "per-size-option" && (
                                  <td className="py-2 pr-2">
                                    <Input
                                      value={size.price || "0"}
                                      onChange={(e) =>
                                        handleUpdateSize(getSelectedPlatform()!.id, size.id, {
                                          price: e.target.value.replace(/[^0-9.]/g, ""),
                                        })
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </td>
                                )}
                                <td className="py-2 pr-2">
                                  <Switch
                                    checked={size.status}
                                    onCheckedChange={(checked) => handleUpdateSize(getSelectedPlatform()!.id, size.id, { status: checked })}
                                    className="scale-75 data-[state=checked]:bg-[#1162a8]"
                                  />
                                </td>
                                <td className="py-2">
                                  <button
                                    onClick={() => handleDeleteSize(getSelectedPlatform()!.id, size.id)}
                                    aria-label="Delete size"
                                    title="Delete size"
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {getSelectedPlatform()?.sizes.length === 0 && (
                              <tr>
                                <td colSpan={pricingData.canAddAdditionalCharges && pricingData.chargeType === "per-size-option" ? 7 : 6} className="py-6 text-center text-sm text-gray-500">
                                  No sizes added yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center text-sm text-gray-500">
                      Pick a platform on the left.
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredPlatforms.length)} of{" "}
                  {filteredPlatforms.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    const page = currentPage <= 2 ? i + 1 : currentPage - 1 + i
                    if (page > totalPages) return null
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded ${
                          currentPage === page
                            ? "bg-[#1162a8] text-white border-[#1162a8]"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Additional Pricing Tab Content */}
          {activeTab === "additional-pricing" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Checkbox for additional charges */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="canAddAdditionalCharges"
                  checked={pricingData.canAddAdditionalCharges}
                  onCheckedChange={(checked) =>
                    setPricingData({ ...pricingData, canAddAdditionalCharges: !!checked })
                  }
                  className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                />
                <Label htmlFor="canAddAdditionalCharges" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                  This field can add additional charges
                </Label>
              </div>

              {/* Show all 4 fields when checkbox is checked */}
              {pricingData.canAddAdditionalCharges && (
                <>
                  {/* Radio buttons for charge type */}
                  <div>
                    <RadioGroup
                      value={pricingData.chargeType}
                      onValueChange={(value: "once-per-implant" | "per-platform-option" | "per-size-option") =>
                        setPricingData({ ...pricingData, chargeType: value })
                      }
                      className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                      <label
                        htmlFor="charge-once"
                        onClick={() => setPricingData({ ...pricingData, chargeType: "once-per-implant" })}
                        className="border border-gray-200 rounded-lg p-4 hover:border-[#1162a8] transition-colors cursor-pointer block"
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="once-per-implant" id="charge-once" className="mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                              Charge once per implant
                            </div>
                            <p className="text-xs text-gray-500">Fixed fee when this implant is used</p>
                          </div>
                        </div>
                      </label>
                      <label
                        htmlFor="charge-per-option"
                        onClick={() => setPricingData({ ...pricingData, chargeType: "per-platform-option" })}
                        className="border border-gray-200 rounded-lg p-4 hover:border-[#1162a8] transition-colors cursor-pointer block"
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="per-platform-option" id="charge-per-option" className="mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                              Charge per platform option
                            </div>
                            <p className="text-xs text-gray-500">Set individual prices per platform</p>
                          </div>
                        </div>
                      </label>
                      <label
                        htmlFor="charge-per-size"
                        onClick={() => setPricingData({ ...pricingData, chargeType: "per-size-option" })}
                        className="border border-gray-200 rounded-lg p-4 hover:border-[#1162a8] transition-colors cursor-pointer block"
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="per-size-option" id="charge-per-size" className="mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                              Charge per size option
                            </div>
                            <p className="text-xs text-gray-500">Set additional price per size under a platform</p>
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pricingData.chargeType === "once-per-implant" ? (
                      <div>
                        <Label htmlFor="additionalCharge" className="text-sm font-medium text-gray-700">
                          Additional Charge
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input
                            id="additionalCharge"
                            type="text"
                            value={pricingData.additionalCharge}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, "")
                              setPricingData({ ...pricingData, additionalCharge: value })
                            }}
                            className="pl-7"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 self-end pb-2">
                        Set price adjustments in the Platforms & Sizes tab.
                      </div>
                    )}
                    <div>
                      <Label htmlFor="chargeScope" className="text-sm font-medium text-gray-700">
                        Charge Scope
                      </Label>
                      <Select
                        value={pricingData.chargeScope}
                        onValueChange={(value) => setPricingData({ ...pricingData, chargeScope: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_case">Per case</SelectItem>
                          <SelectItem value="per_tooth">Per tooth</SelectItem>
                          <SelectItem value="per_item">Per item</SelectItem>
                          <SelectItem value="per_slip">Per slip</SelectItem>
                          <SelectItem value="per_arch">Per arch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(pricingData.chargeType === "per-platform-option" || pricingData.chargeType === "per-size-option") && (
                    <div className="text-sm text-gray-600">
                      Set price adjustments per option in the{" "}
                      <button
                        onClick={() => setActiveTab("platform-options")}
                        className="text-[#1162a8] hover:underline font-medium"
                      >
                        Platforms & Sizes tab
                      </button>
                      .
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 sm:px-6 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 sm:px-6 bg-[#1162a8] hover:bg-[#0f5497] text-white text-sm sm:text-base"
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

    </div>
  )
}
