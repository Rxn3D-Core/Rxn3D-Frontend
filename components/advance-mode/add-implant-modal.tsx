"use client"

import { useState, useEffect, useRef } from "react"
import { X, HelpCircle, Edit, Copy, Trash2, Search, Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { AddOptionModal } from "./add-option-modal"
import { Implant, ImplantPlatform } from "@/lib/api/advance-mode-query"

interface AddImplantModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: any) => void
  implant?: Implant | null
  isEditMode?: boolean
  isSaving?: boolean
}

interface PlatformOption {
  id: string
  image: string | null
  platformName: string
  isDefault: boolean
  status: boolean
  price?: string
}

export function AddImplantModal({ isOpen, onClose, onSave, implant, isEditMode = false, isSaving: externalIsSaving = false }: AddImplantModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"platform-options" | "platform-pricing">("platform-options")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false)
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
    chargeType: "once-per-implant" as "once-per-implant" | "per-platform-option",
    additionalCharge: "0.00",
    chargeScope: "per-case",
  })

  const [platforms, setPlatforms] = useState<PlatformOption[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(platforms.length / itemsPerPage)
  const [internalIsSaving, setInternalIsSaving] = useState(false)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use external isSaving if provided, otherwise use internal state
  const isSaving = externalIsSaving || internalIsSaving

  // Load implant data when in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && implant) {
      setInternalIsSaving(false)
      setFormData({
        brandName: implant.brand_name || "",
        systemName: implant.system_name || "",
        code: implant.code || "",
        allowUserInput: implant.allow_user_input === "Yes",
        description: implant.description || "",
        implantDetails: true,
      })

      setPricingData({
        canAddAdditionalCharges: implant.has_additional_pricing === "Yes",
        chargeType: implant.charge_type === "once_per_implant" ? "once-per-implant" : "per-platform-option",
        additionalCharge: implant.price?.toString() || "0.00",
        chargeScope: implant.charge_scope || "per-case",
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
        }))
        setPlatforms(convertedPlatforms)
      } else {
        setPlatforms([])
      }
    } else if (isOpen && !isEditMode) {
      // Reset all fields when modal opens in create mode
      setActiveTab("platform-options")
      setSearchQuery("")
      setIsAddOptionModalOpen(false)
      setInternalIsSaving(false)
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
        chargeType: "once-per-implant" as "once-per-implant" | "per-platform-option",
        additionalCharge: "0.00",
        chargeScope: "per-case",
      })
      setPlatforms([])
      setCurrentPage(1)
      setImageBase64(null)
      setImagePreview(null)
    }
  }, [isOpen, isEditMode, implant])

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
          apiData.charge_type = "per_platform_option"
          // Platforms will be included with prices
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
          
          if (platform.image) {
            platformData.image = platform.image
          }
          
          if (pricingData.chargeType === "per-platform-option" && platform.price) {
            platformData.price = parseFloat(platform.price) || 0
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
    setIsAddOptionModalOpen(true)
  }

  const handleSaveNewOption = (data: { image: string | null; label: string }) => {
    const newPlatform: PlatformOption = {
      id: String(platforms.length + 1),
      image: data.image,
      platformName: data.label,
      isDefault: false,
      status: true,
      price: "0.00",
    }
    setPlatforms([...platforms, newPlatform])
  }

  const handleUpdatePlatformPrice = (id: string, price: string) => {
    setPlatforms(
      platforms.map((plat) =>
        plat.id === id ? { ...plat, price } : plat
      )
    )
  }

  const handleDeletePlatform = (id: string) => {
    setPlatforms(platforms.filter((plat) => plat.id !== id))
  }

  const handleDuplicatePlatform = (id: string) => {
    const platform = platforms.find((plat) => plat.id === id)
    if (platform) {
      const newPlatform = {
        ...platform,
        id: String(platforms.length + 1),
        platformName: `${platform.platformName} (Copy)`,
        price: platform.price || "0.00",
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
            {isEditMode ? "Edit Implant" : "Add Implant"}
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
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                onClick={() => setActiveTab("platform-pricing")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "platform-pricing"
                    ? "border-[#1162a8] text-[#1162a8]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Platform Pricing
              </button>
            </div>
          </div>

          {/* Platform Options Tab Content */}
          {activeTab === "platform-options" && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                <div></div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={handleAddOption}
                    variant="outline"
                    className="text-sm w-full sm:w-auto"
                  >
                    Add option
                  </Button>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search Platform"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Platforms Table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                        <Checkbox className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]" />
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Image</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Platform Name</th>
                        {pricingData.chargeType === "per-platform-option" && (
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Price</th>
                      )}
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Default</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPlatforms.map((platform) => (
                      <tr key={platform.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <Checkbox className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]" />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded border border-gray-200"></div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className="text-xs sm:text-sm text-gray-900">{platform.platformName}</span>
                        </td>
                        {pricingData.chargeType === "per-platform-option" && (
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">$</span>
                              <Input
                                type="text"
                                value={platform.price || "0.00"}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9.]/g, "")
                                  handleUpdatePlatformPrice(platform.id, value)
                                }}
                                className="pl-6 h-8 text-xs sm:text-sm w-20 sm:w-24"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <button
                            onClick={() => toggleDefault(platform.id)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${
                              platform.isDefault
                                ? "border-[#1162a8] bg-[#1162a8] flex items-center justify-center"
                                : "border-gray-300"
                            }`}
                          >
                            {platform.isDefault && (
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                            )}
                          </button>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <Switch
                            checked={platform.status}
                            onCheckedChange={() => toggleStatus(platform.id)}
                            className="data-[state=checked]:bg-[#1162a8]"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button className="text-gray-600 hover:text-[#1162a8]">
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicatePlatform(platform.id)}
                              className="text-gray-600 hover:text-[#1162a8]"
                            >
                              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePlatform(platform.id)}
                              className="text-gray-600 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

          {/* Platform Pricing Tab Content */}
          {activeTab === "platform-pricing" && (
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
                      onValueChange={(value: "once-per-implant" | "per-platform-option") =>
                        setPricingData({ ...pricingData, chargeType: value })
                      }
                      className="grid grid-cols-2 gap-4"
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
                    </RadioGroup>
                  </div>

                  {/* Additional Charge and Charge Scope */}
                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="chargeScope" className="text-sm font-medium text-gray-700">
                        Charge Scope
                      </Label>
                      <Select
                        value={pricingData.chargeScope}
                        onValueChange={(value) => setPricingData({ ...pricingData, chargeScope: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Per case" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_case">Per case</SelectItem>
                          <SelectItem value="per_tooth">Per tooth</SelectItem>
                          <SelectItem value="per_slip">Per slip</SelectItem>
                          <SelectItem value="per_arch">Per arch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Instructional text when "per-platform-option" is selected */}
                  {pricingData.chargeType === "per-platform-option" && (
                    <div className="text-sm text-gray-600">
                      Set price adjustments per option in the{" "}
                      <button
                        onClick={() => setActiveTab("platform-options")}
                        className="text-[#1162a8] hover:underline font-medium"
                      >
                        Platform Options tab
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

      {/* Add Option Modal */}
      <AddOptionModal
        isOpen={isAddOptionModalOpen}
        onClose={() => setIsAddOptionModalOpen(false)}
        onSave={handleSaveNewOption}
        title="Add new option"
      />
    </div>
  )
}
