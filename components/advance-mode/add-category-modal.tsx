"use client"

import { useState, useEffect } from "react"
import { X, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { AdvanceCategory } from "@/lib/api/advance-mode-query"

interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: {
    name: string
    code: string
    image?: string
    status: string
  }) => void
  isLoading?: boolean
  category?: AdvanceCategory | null
  isEditing?: boolean
}

export function AddCategoryModal({ isOpen, onClose, onSave, isLoading, category, isEditing = false }: AddCategoryModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    image: null as string | null,
    status: "Active",
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageChanged, setImageChanged] = useState(false)

  // Reset all fields when modal opens or populate when editing
  useEffect(() => {
    if (isOpen) {
      if (isEditing && category) {
        // Populate form with category data for editing
        setFormData({
          name: category.name || "",
          code: category.code || "",
          image: null, // Don't set image from URL, user can re-upload if needed
          status: category.status || "Active",
        })
        // Set image preview if available
        if (category.image_url) {
          setImagePreview(category.image_url)
        } else {
          setImagePreview(null)
        }
        setImageChanged(false) // Image hasn't been changed yet
      } else {
        // Reset to empty form for new category
        setFormData({
          name: "",
          code: "",
          image: null,
          status: "Active",
        })
        setImagePreview(null)
        setImageChanged(false)
      }
    }
  }, [isOpen, isEditing, category])

  if (!isOpen) return null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
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
        setImagePreview(base64String)
        setFormData({ ...formData, image: base64String })
        setImageChanged(true) // Mark image as changed
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter category name')
      return
    }

    if (!formData.code.trim()) {
      alert('Please enter category code')
      return
    }

    if (!formData.status) {
      alert('Please select a status')
      return
    }

    if (onSave) {
      // Only include image if it was changed (new upload) or if creating new category
      const imageToSend = (!isEditing || imageChanged) ? (formData.image || undefined) : undefined
      
      onSave({
        name: formData.name,
        code: formData.code,
        image: imageToSend,
        status: formData.status,
      })
    }
  }

  const handleClose = () => {
    setFormData({ name: "", code: "", image: null, status: "Active" })
    setImagePreview(null)
    setImageChanged(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing 
              ? t("advanceMode.category.editCategory", "Edit Category")
              : t("advanceMode.category.addCategory", "Add Category")
            }
          </h2>
          <button
            onClick={handleClose}
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
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 flex items-center justify-center bg-gray-50 h-32 sm:h-48 w-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e: Event) => {
                        const target = e.target as HTMLInputElement
                        if (target.files && target.files[0]) {
                          handleImageChange({
                            target: {
                              files: target.files,
                            },
                          } as React.ChangeEvent<HTMLInputElement>)
                        }
                      }
                      input.click()
                    }}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Category preview"
                        className="object-contain h-full w-full rounded-lg"
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
                        // Open preview in new window or modal
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
                        setImageChanged(true) // Mark as changed (removed)
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
              {/* Category Name */}
              <div>
                <Label htmlFor="categoryName" className="text-sm font-medium text-gray-700">
                  {t("advanceMode.category.categoryName", "Category Name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="categoryName"
                  placeholder={t("advanceMode.category.categoryNamePlaceholder", "Enter category name")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              {/* Category Code */}
              <div>
                <Label htmlFor="categoryCode" className="text-sm font-medium text-gray-700">
                  {t("advanceMode.category.categoryCode", "Category Code")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="categoryCode"
                  placeholder={t("advanceMode.category.categoryCodePlaceholder", "Enter category code (e.g., DS, AS)")}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="mt-1"
                  disabled={isLoading}
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("advanceMode.category.codeHint", "Short code for quick identification")}
                </p>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="categoryStatus" className="text-sm font-medium text-gray-700">
                  {t("advanceMode.category.status", "Status")} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="categoryStatus" className="mt-1">
                    <SelectValue placeholder={t("advanceMode.category.selectStatus", "Select status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">
                      {t("advanceMode.category.active", "Active")}
                    </SelectItem>
                    <SelectItem value="Inactive">
                      {t("advanceMode.category.inactive", "Inactive")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="px-6"
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("Saving...")}
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
