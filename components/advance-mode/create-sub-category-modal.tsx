"use client"

import { useState, useEffect } from "react"
import { X, Upload, Loader2, Link as LinkIcon, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "react-i18next"
import { useAdvanceCategories } from "@/lib/api/advance-mode-query"
import { fileToBase64, validateImageFile } from "@/lib/api/advance-mode-query"
import { useToast } from "@/hooks/use-toast"

interface CreateSubCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: any) => void
  editId?: number
  editData?: any
}

export function CreateSubCategoryModal({ isOpen, onClose, onSave, editId, editData }: CreateSubCategoryModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    advance_category_id: "",
    status: "Active" as "Active" | "Inactive",
    sequence: 1,
    image: null as string | null,
    stageDetails: true,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch categories for dropdown
  const { data: categoriesData } = useAdvanceCategories({ per_page: 100, status: "Active" })
  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : []

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editId && editData) {
        setFormData({
          name: editData.name || "",
          code: editData.code || "",
          advance_category_id: editData.advance_category_id?.toString() || "",
          status: editData.status || "Active",
          sequence: editData.sequence || 1,
          image: null,
          stageDetails: editData.stageDetails !== undefined ? editData.stageDetails : true,
        })
        setImagePreview(editData.image_url || null)
      } else {
        setFormData({
          name: "",
          code: "",
          advance_category_id: "",
          status: "Active",
          sequence: 1,
          image: null,
          stageDetails: true,
        })
        setImagePreview(null)
      }
    }
  }, [isOpen, editId, editData])

  if (!isOpen) return null

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateImageFile(file)) {
      toast({
        title: "Error",
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP) under 5MB",
        variant: "destructive",
      })
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setFormData({ ...formData, image: base64 })
      setImagePreview(base64)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.advance_category_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const saveData = {
        name: formData.name,
        code: formData.code,
        advance_category_id: parseInt(formData.advance_category_id),
        status: formData.status,
        sequence: formData.sequence,
        ...(formData.image && { image: formData.image }),
      }

      if (onSave) {
        await onSave(saveData)
      }
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subcategory",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editId ? t("advanceMode.subCategory.editSubcategory", "Edit Sub Category") : t("advanceMode.subCategory.createSubcategory", "Create Sub Category")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Image Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Sub Category Details</Label>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </div>
                <Switch
                  checked={formData.stageDetails}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, stageDetails: checked })
                  }
                  className="data-[state=checked]:bg-[#1162a8]"
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 flex items-center justify-center bg-gray-50 h-32 sm:h-48 w-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        handleImageChange(e as any)
                      }
                      input.click()
                    }}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Sub category preview"
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
                      disabled={isLoading}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setImagePreview(null)
                        setFormData({ ...formData, image: null })
                      }}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="subCategoryName" className="text-sm font-medium text-gray-700">
                  {t("advanceMode.subCategory.name", "Sub Category Name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subCategoryName"
                  placeholder={t("advanceMode.subCategory.namePlaceholder", "Enter sub category name")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                    {t("Code")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder={t("advanceMode.subCategory.codePlaceholder", "Enter code")}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="parentCategory" className="text-sm font-medium text-gray-700">
                    {t("advanceMode.subCategory.parentCategory", "Parent Category")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.advance_category_id}
                    onValueChange={(value) => setFormData({ ...formData, advance_category_id: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("advanceMode.subCategory.selectCategory", "Select category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => {
                  // TODO: Implement link product functionality
                  toast({
                    title: "Info",
                    description: "Link Product functionality will be implemented",
                  })
                }}
                className="w-full bg-[#1162a8] hover:bg-[#0f5497] text-white flex items-center gap-2"
                disabled={isLoading}
              >
                <LinkIcon className="h-4 w-4" />
                {t("advanceMode.subCategory.linkProduct", "Link Product")}
              </Button>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    {t("Status")}
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">{t("Active")}</SelectItem>
                      <SelectItem value="Inactive">{t("Inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sequence" className="text-sm font-medium text-gray-700">
                    {t("advanceMode.subCategory.sequence", "Sequence")}
                  </Label>
                  <Input
                    id="sequence"
                    type="number"
                    min="1"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="px-6 bg-red-500 hover:bg-red-600 text-white"
            disabled={isLoading}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="px-6 bg-[#1162a8] hover:bg-[#0f5497] text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("Saving")}...
              </>
            ) : (
              t("Save")
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
