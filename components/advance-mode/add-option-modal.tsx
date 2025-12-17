"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"

interface AddOptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: { image: string | null; label: string }) => void
  title?: string
  option?: { image: string | null; label: string } | null
  isEditing?: boolean
}

export function AddOptionModal({ isOpen, onClose, onSave, title = "Add new option", option = null, isEditing = false }: AddOptionModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    image: null as string | null,
    label: "",
  })

  // Reset form when modal opens/closes or option changes
  useEffect(() => {
    if (isOpen) {
      if (isEditing && option) {
        setFormData({
          image: option.image,
          label: option.label,
        })
      } else {
        setFormData({
          image: null,
          label: "",
        })
      }
    }
  }, [isOpen, isEditing, option])

  const handleSave = () => {
    if (onSave) {
      onSave(formData)
    }
    // Reset form
    setFormData({ image: null, label: "" })
    onClose()
  }

  const handleCancel = () => {
    // Reset form
    setFormData({ image: null, label: "" })
    onClose()
  }

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel()
        }
      }}
      style={{ 
        pointerEvents: 'auto',
        zIndex: 2147483647, // Maximum z-index value
      }}
    >
      <div
        className="bg-white relative w-full max-w-[694px] min-h-[244px] border border-[#E4E6EF] rounded-[10px] shadow-lg"
        style={{
          boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
          filter: 'drop-shadow(9px 7px 21.5px rgba(0, 0, 0, 0.25))',
          zIndex: 2147483647, // Maximum z-index value
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Only stop propagation if not clicking on an input or interactive element
          const target = e.target as HTMLElement
          if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('input, button')) {
            e.stopPropagation()
          }
        }}
      >
        {/* Header */}
        <div className="relative px-4 sm:px-5 pt-3 sm:pt-2.5 pb-3 border-b border-[#B4B0B0]">
          <h2
            className="text-lg sm:text-xl font-bold text-black"
            style={{
              fontFamily: 'Verdana',
            }}
          >
            {title}
          </h2>

          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute right-4 sm:right-5 top-3 sm:top-2.5 text-black hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-7">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Left Side - Image Upload */}
            <div className="flex flex-col items-center gap-3 w-full sm:w-[233px] flex-shrink-0">
              <div className="relative w-full">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center bg-gray-50 w-full h-32 sm:h-[136px] cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-200 group"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          const base64String = reader.result as string
                          setFormData({ ...formData, image: base64String })
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                  }}
                >
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Option preview"
                      className="object-contain h-full w-full rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 group-hover:text-gray-600"
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
              {formData.image && (
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const newWindow = window.open()
                      if (newWindow && formData.image) {
                        newWindow.document.write(`<img src="${formData.image}" style="max-width: 100%; height: auto;" />`)
                      }
                    }}
                    className="flex-1 text-xs"
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setFormData({ ...formData, image: null })}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Right Side - Form Field */}
            <div className="flex items-center flex-1 w-full">
              <div className="relative w-full">
                <Label
                  htmlFor="label"
                  className="absolute left-2.5 -top-1.5 bg-white px-1 text-sm text-[#7F7F7F]"
                  style={{
                    fontFamily: 'Arial',
                  }}
                >
                  Label
                </Label>
                <Input
                  id="label"
                  placeholder="My custom sub category"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  onFocus={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                  className="w-full h-12 sm:h-[57px] pt-6 sm:pt-[25px] px-3 sm:px-[12.32px] pb-2 sm:pb-[9.24px] text-base sm:text-[17px] border-[0.74px] border-[#7F7F7F] rounded-[7.7px]"
                  style={{
                    fontFamily: 'Arial',
                    lineHeight: '18px',
                    color: '#1F2937',
                    pointerEvents: 'auto',
                    zIndex: 2147483647,
                  }}
                  autoFocus={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 sm:px-7 pb-3 sm:pb-2.5 pt-2 border-t border-gray-100">
          <Button
            onClick={handleCancel}
            className="h-8 sm:h-[34px] px-4 sm:px-4 bg-[#CF0202] hover:bg-[#B80202] text-white rounded-[10px] text-xs sm:text-xs font-bold"
            style={{
              fontFamily: 'Verdana',
              letterSpacing: '-0.02em',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="h-8 sm:h-[34px] px-4 sm:px-4 bg-[#1162A8] hover:bg-[#0f5497] text-white rounded-[10px] text-xs sm:text-xs font-bold"
            style={{
              fontFamily: 'Verdana',
              letterSpacing: '-0.02em',
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )

  // Use portal to render outside Dialog's DOM tree
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}
