"use client"

import { useState, useRef, useEffect } from "react"
import { RotateCcw } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface ShadePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shadeCode: string, shadeSystem: string, customColor?: string) => void
  initialShadeCode?: string
  initialShadeSystem?: string
  initialCustomColor?: string
}

interface ShadeSystem {
  id: string
  name: string
  shades: string[]
}

const SHADE_SYSTEMS: ShadeSystem[] = [
  {
    id: "vita-classical",
    name: "VITA Classical",
    shades: ["A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4"]
  },
  {
    id: "ivoclar-chromascop",
    name: "Ivoclar Chromascop",
    shades: ["B16", "B14", "B12", "B10", "A16", "A14", "A12", "A10"]
  }
]

const SHADE_LABELS = ["Bleach", "Light", "Medium", "Dark", "Darkest"]

export function ShadePickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialShadeCode = "A1",
  initialShadeSystem = "vita-classical",
  initialCustomColor
}: ShadePickerModalProps) {
  const [activeTab, setActiveTab] = useState<"shade" | "color-picker">("color-picker")
  const [shadeCode, setShadeCode] = useState(initialShadeCode)
  const [shadeSystem, setShadeSystem] = useState(initialShadeSystem)
  const [sliderValue, setSliderValue] = useState([0])
  const [customColor, setCustomColor] = useState(initialCustomColor)
  
  const sliderRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShadeCode(initialShadeCode)
      setShadeSystem(initialShadeSystem)
      setCustomColor(initialCustomColor)
      setSliderValue([0])
    }
  }, [isOpen, initialShadeCode, initialShadeSystem, initialCustomColor])

  const currentSystem = SHADE_SYSTEMS.find(system => system.id === shadeSystem)

  const handleConfirm = () => {
    onConfirm(shadeCode, currentSystem?.name || "", customColor)
    onClose()
  }

  const handleReset = () => {
    setShadeCode("A1")
    setShadeSystem("vita-classical")
    setSliderValue([0])
    setCustomColor(undefined)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose()
    }
  }

  const getShadeFromSlider = (value: number): string => {
    const shades = currentSystem?.shades || []
    const index = Math.floor((value / 100) * (shades.length - 1))
    return shades[index] || shades[0] || "A1"
  }

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value)
    const newShade = getShadeFromSlider(value[0])
    setShadeCode(newShade)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] p-0 overflow-hidden border-2 border-blue-200 shadow-xl"
        onKeyDown={handleKeyDown}
      >
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "shade" | "color-picker")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-none">
            <TabsTrigger 
              value="shade" 
              className="rounded-none data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:bg-blue-600 data-[state=inactive]:text-white"
            >
              Shade
            </TabsTrigger>
            <TabsTrigger 
              value="color-picker" 
              className="rounded-none data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700"
            >
              Color Picker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shade" className="p-6 space-y-6">
            {/* Shade Selection Content */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Select Shade</h3>
                <p className="text-sm text-gray-500 mt-1">Choose from available shade systems</p>
              </div>
              
              {/* Shade System Selection */}
              <div className="space-y-4">
                <Label htmlFor="shade-system" className="text-sm font-medium text-gray-700">
                  Shade System
                </Label>
                <select
                  id="shade-system"
                  value={shadeSystem}
                  onChange={(e) => setShadeSystem(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SHADE_SYSTEMS.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Individual Shade Selection */}
              <div className="space-y-4">
                <Label htmlFor="individual-shade" className="text-sm font-medium text-gray-700">
                  Individual Shade
                </Label>
                <select
                  id="individual-shade"
                  value={shadeCode}
                  onChange={(e) => setShadeCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {currentSystem?.shades.map((shade) => (
                    <option key={shade} value={shade}>
                      {shade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="color-picker" className="p-6 space-y-6">
            {/* Selected Shade Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900" aria-label={`Selected shade: ${shadeCode}`}>
                  {shadeCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="h-8 w-8 rounded-full hover:bg-gray-100"
                  aria-label="Reset shade selection"
                >
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                </Button>
              </div>
            </div>

            {/* System Information */}
            <div className="space-y-1">
              <p className="text-lg font-medium text-gray-900">{currentSystem?.name}</p>
              <p className="text-sm text-gray-500">Selected System</p>
            </div>

            {/* Gradient Slider */}
            <div className="space-y-3">
              <Label htmlFor="shade-slider" className="text-sm font-medium text-gray-700 sr-only">
                Shade intensity slider
              </Label>
              <div className="relative" ref={sliderRef}>
                <Slider
                  id="shade-slider"
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  max={100}
                  step={1}
                  className="w-full"
                  aria-label="Shade intensity"
                />
                <div className="h-8 bg-gradient-to-r from-white via-yellow-100 to-yellow-300 rounded-lg absolute inset-0 pointer-events-none" />
              </div>
              
              {/* Slider Labels */}
              <div className="flex justify-between text-xs text-gray-600">
                {SHADE_LABELS.map((label, index) => (
                  <span key={label} className="text-center">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirm Button */}
        <div className="flex justify-center p-6 border-t bg-gray-50">
          <Button 
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-md font-medium"
            aria-label="Confirm shade selection"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
