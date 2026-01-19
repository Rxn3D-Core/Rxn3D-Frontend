"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import Image from "next/image"
import { ToothShadeSelectionSVG } from "./tooth-shade-selection-svg"

interface ShadeOption {
  id: number
  name: string
  code?: string
  brand?: {
    id: number
    name: string
    system_name?: string
  }
  brand_id?: number
  sequence?: number
  is_default?: "Yes" | "No" | boolean
}

interface ToothShadeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  shades: ShadeOption[]
  selectedShadeId?: number
  onSelectShade: (shadeId: number, shadeName: string, brandId?: number) => void
  fieldType: "tooth_shade" | "stump_shade"
  title?: string
  productId?: number
  arch?: "maxillary" | "mandibular"
}

export function ToothShadeSelectionModal({
  isOpen,
  onClose,
  shades,
  selectedShadeId,
  onSelectShade,
  fieldType,
  title,
  productId,
  arch,
}: ToothShadeSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedShades, setSelectedShades] = useState<string[]>([])

  // Reset selected shades when modal opens with no selectedShadeId (for tooth shade after stump shade is selected)
  useEffect(() => {
    if (isOpen && fieldType === "tooth_shade" && !selectedShadeId) {
      setSelectedShades([])
    }
  }, [isOpen, fieldType, selectedShadeId])

  const handleShadeClick = (shade: string) => {
    if (selectedShades.includes(shade)) {
      setSelectedShades(selectedShades.filter(s => s !== shade))
    } else {
      setSelectedShades([...selectedShades, shade])
    }
  }

  const handleCustomShade = () => {
    // Handle custom shade selection
    // This can be implemented based on your requirements
    console.log("Custom Shade Patient comes to the lab")
  }

  const handleSetAsStumpShade = () => {
    // Handle setting as stump shade
    // This can be implemented based on your requirements
    console.log("Set as Stump Shade")
  }

  const handleConfirmSelection = () => {
    if (selectedShades.length > 0) {
      // For now, we'll use the first selected shade
      // You can modify this logic based on your requirements
      const shadeName = selectedShades[0]
      // Find the shade from the shades array if needed
      const shade = shades.find(s => s.name === shadeName || s.code === shadeName)
      if (shade) {
        onSelectShade(shade.id, shade.name, shade.brand_id)
      }
    }
    onClose()
  }

  const displayTitle = title || (fieldType === "tooth_shade" ? "Select Tooth Shade" : "Select Stump Shade")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {displayTitle}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search shades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* New Design with SVG and Buttons */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="w-full h-full flex flex-col items-center justify-center gap-6">
            {/* Buttons */}
            <div className="flex gap-4 w-full max-w-2xl justify-center">
              <Button
                onClick={handleCustomShade}
                variant="outline"
                className="flex-1 max-w-xs"
              >
                Custom Shade Patient comes to the lab
              </Button>
              <Button
                onClick={handleSetAsStumpShade}
                variant="outline"
                className="flex-1 max-w-xs"
              >
                Set as Stump Shade
              </Button>
            </div>

            {/* SVG Container */}
            <div className="w-full max-w-4xl flex items-center justify-center">
              <ToothShadeSelectionSVG
                selectedShades={selectedShades}
                onShadeClick={handleShadeClick}
                className="w-full"
              />
            </div>

            {/* Selected Shades Display */}
            {selectedShades.length > 0 && (
              <div className="w-full max-w-2xl">
                <div className="text-sm text-gray-600 mb-2">
                  Selected Shades:
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedShades.map((shade) => (
                    <div
                      key={shade}
                      className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                    >
                      {shade}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={selectedShades.length === 0}
          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

