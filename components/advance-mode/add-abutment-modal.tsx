"use client"

import { useState, useEffect } from "react"
import { X, HelpCircle, Copy, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"

interface AddAbutmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: any) => Promise<void> | void
}

interface PlatformOption {
  id: string
  image: string | null
  platformName: string
  isDefault: boolean
  status: boolean
  price?: string
}

export function AddAbutmentModal({ isOpen, onClose, onSave }: AddAbutmentModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"platform-options" | "platform-pricing">("platform-options")
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    type: "",
    description: "",
    abutmentDetails: true,
  })

  const [pricingData, setPricingData] = useState({
    chargeType: "once_per_abutment" as "once_per_abutment" | "per_option",
    additionalCharge: "0.00",
  })

  const [platforms, setPlatforms] = useState<PlatformOption[]>([
    { id: "1", image: null, platformName: "Narrow CrossFit® BL Tapered", isDefault: true, status: true, price: "99" },
    { id: "2", image: null, platformName: "Narrow CrossFit® BL Tapered, Guided", isDefault: false, status: true, price: "99" },
  ])

  const [currentPage, setCurrentPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const itemsPerPage = 10
  const totalPages = Math.ceil(platforms.length / itemsPerPage)

  // Reset all fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("platform-options")
      setSearchQuery("")
      setFormData({
        type: "",
        description: "",
        abutmentDetails: true,
      })
      setPricingData({
        chargeType: "once_per_abutment" as "once_per_abutment" | "per_option",
        additionalCharge: "0.00",
      })
      setPlatforms([])
      setCurrentPage(1)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!formData.type.trim()) {
      return
    }

    const payload = {
      type: formData.type.trim(),
      description: formData.description?.trim() || undefined,
      status: "Active" as const,
      charge_type: pricingData.chargeType,
      price: pricingData.chargeType === "once_per_abutment" ? (parseFloat(pricingData.additionalCharge) || 0) : null,
      options: platforms.map((platform, index) => ({
        name: platform.platformName?.trim(),
        status: platform.status ? "Active" as const : "Inactive" as const,
        is_default: platform.isDefault ? "Yes" as const : "No" as const,
        price: pricingData.chargeType === "per_option" ? (parseFloat(platform.price || "0") || 0) : null,
        sequence: index + 1,
      })).filter((option) => option.name),
    }

    try {
      setIsSaving(true)
      if (onSave) {
        await onSave(payload)
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddOption = () => {
    const newPlatform: PlatformOption = {
      id: String(platforms.length + 1),
      image: null,
      platformName: `Option ${platforms.length + 1}`,
      isDefault: false,
      status: true,
      price: "0.00",
    }
    setPlatforms([...platforms, newPlatform])
  }

  const handleUpdatePlatformName = (id: string, platformName: string) => {
    setPlatforms(
      platforms.map((plat) =>
        plat.id === id ? { ...plat, platformName } : plat
      )
    )
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-3">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-full max-h-[94vh] sm:h-auto sm:max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add Abutment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
            {/* Left Side - Image Upload */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="text-sm font-medium">Abutment details</Label>
                <HelpCircle className="h-4 w-4 text-gray-400" />
                <Switch
                  checked={formData.abutmentDetails}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, abutmentDetails: checked })
                  }
                  className="data-[state=checked]:bg-[#1162a8]"
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center bg-gray-50 h-28 sm:h-36 w-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group">
                    <div className="text-center">
                      <div className="mx-auto w-12 h-12 flex items-center justify-center">
                        <svg
                          className="w-9 h-9 text-gray-400 group-hover:text-gray-600"
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
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Form Fields */}
            <div className="lg:col-span-2 space-y-3">
              <div>
                <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                  Type
                </Label>
                <Input
                  id="type"
                  placeholder="Type 1"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter your field description here."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 min-h-[88px]"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-3">
            <div className="flex gap-3 sm:gap-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("platform-options")}
                className={`pb-2 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "platform-options"
                    ? "border-[#1162a8] text-[#1162a8]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Platform Options
              </button>
              <button
                onClick={() => setActiveTab("platform-pricing")}
                className={`pb-2 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3">
                <div></div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={handleAddOption}
                    variant="outline"
                    className="text-xs sm:text-sm h-8 w-full sm:w-auto"
                  >
                    Add option
                  </Button>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search Platform"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full h-8 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Platforms Table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-left">
                        <Checkbox className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]" />
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-900">Image</th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-900">Platform Name</th>
                  {pricingData.chargeType === "per_option" && (
                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-900">Price</th>
                      )}
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-900">Default</th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-900">Status</th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPlatforms.map((platform) => (
                      <tr key={platform.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-3 py-2">
                          <Checkbox className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]" />
                        </td>
                        <td className="px-2 sm:px-3 py-2">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 rounded border border-gray-200"></div>
                        </td>
                        <td className="px-2 sm:px-3 py-2">
                          <Input
                            value={platform.platformName}
                            onChange={(e) => handleUpdatePlatformName(platform.id, e.target.value)}
                            placeholder="Option name"
                            className="h-8 text-xs"
                          />
                        </td>
                        {pricingData.chargeType === "per_option" && (
                          <td className="px-2 sm:px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">$</span>
                              <Input
                                type="text"
                                value={platform.price || "0.00"}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9.]/g, "")
                                  handleUpdatePlatformPrice(platform.id, value)
                                }}
                                className="pl-6 h-8 text-xs w-20"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2">
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
                        <td className="px-2 sm:px-3 py-2">
                          <Switch
                            checked={platform.status}
                            onCheckedChange={() => toggleStatus(platform.id)}
                            className="data-[state=checked]:bg-[#1162a8]"
                          />
                        </td>
                        <td className="px-2 sm:px-3 py-2">
                          <div className="flex items-center gap-1 sm:gap-2">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mt-3">
                <p className="text-xs text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredPlatforms.length)} of{" "}
                  {filteredPlatforms.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className={`px-2 py-1 text-xs border rounded ${
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
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Platform Pricing Tab Content */}
          {activeTab === "platform-pricing" && (
            <div className="space-y-4">
                  {/* Radio buttons for charge type */}
                  <div>
                    <RadioGroup
                      value={pricingData.chargeType}
                      onValueChange={(value: "once_per_abutment" | "per_option") =>
                        setPricingData({ ...pricingData, chargeType: value })
                      }
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <label
                        htmlFor="charge-once"
                        onClick={() => setPricingData({ ...pricingData, chargeType: "once_per_abutment" })}
                        className="border border-gray-200 rounded-lg p-3 hover:border-[#1162a8] transition-colors cursor-pointer block"
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="once_per_abutment" id="charge-once" className="mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                              Charge once per abutment
                            </div>
                            <p className="text-xs text-gray-500">Fixed fee when this abutment type is used</p>
                          </div>
                        </div>
                      </label>
                      <label
                        htmlFor="charge-per-option"
                        onClick={() => setPricingData({ ...pricingData, chargeType: "per_option" })}
                        className="border border-gray-200 rounded-lg p-3 hover:border-[#1162a8] transition-colors cursor-pointer block"
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="per_option" id="charge-per-option" className="mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                              Charge per selected option
                            </div>
                            <p className="text-xs text-gray-500">Set individual prices per option</p>
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="additionalCharge" className="text-sm font-medium text-gray-700">
                        Price
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
                  </div>

                  {/* Instructional text when "per-selected-option" is selected */}
                  {pricingData.chargeType === "per_option" && (
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border-t border-gray-200 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.type.trim()}
            className="px-4 bg-[#1162a8] hover:bg-[#0f5497] text-white text-sm"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}


