"use client"

import { useState, useRef, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  predefinedColors?: string[]
}

export function ColorPicker({ value, onChange, predefinedColors = [] }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customColor, setCustomColor] = useState(value)
  const [rgb, setRgb] = useState({ r: 0, g: 172, b: 193 })
  const [hue, setHue] = useState(185)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const [saturation, setSaturation] = useState(50)
  const [lightness, setLightness] = useState(50)

  const defaultPredefinedColors = [
    "#D32F2F", // Red
    "#1976D2", // Blue
    "#388E3C", // Green
    "#F57C00", // Orange
    "#7B1FA2", // Purple
    "#0097A7", // Cyan
    "#C2185B", // Pink
    "#5D4037", // Brown
    "#689F38", // Lime Green
    "#E64A19", // Deep Orange
    "#512DA8", // Deep Purple
    "#00796B", // Teal
  ]

  const colors = predefinedColors.length > 0 ? predefinedColors : defaultPredefinedColors

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  // Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }).join("")
  }

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  // Initialize RGB from hex value
  useEffect(() => {
    if (value && value.startsWith('#')) {
      const rgbVal = hexToRgb(value)
      setRgb(rgbVal)
      setCustomColor(value)
      const hsl = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b)
      setHue(hsl.h)
    }
  }, [value])

  // Draw color gradient on canvas
  useEffect(() => {
    if (!canvasRef.current || !showCustomPicker) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 200

    // Create gradient based on current hue
    // White to pure color (left to right)
    const hueColor = `hsl(${hue}, 100%, 50%)`
    const gradientH = ctx.createLinearGradient(0, 0, canvas.width, 0)
    gradientH.addColorStop(0, '#ffffff')
    gradientH.addColorStop(1, hueColor)
    ctx.fillStyle = gradientH
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Transparent to black (top to bottom)
    const gradientV = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradientV.addColorStop(0, 'rgba(0,0,0,0)')
    gradientV.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = gradientV
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [hue, showCustomPicker])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(x, y, 1, 1)
    const pixel = imageData.data

    const newRgb = { r: pixel[0], g: pixel[1], b: pixel[2] }
    setRgb(newRgb)

    const hex = rgbToHex(pixel[0], pixel[1], pixel[2])
    setCustomColor(hex)
    onChange(hex)
  }

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const hueBar = hueRef.current
    if (!hueBar) return

    const rect = hueBar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newHue = Math.round(percentage * 360)
    setHue(newHue)
  }

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(value) || 0))
    const newRgb = { ...rgb, [channel]: numValue }
    setRgb(newRgb)

    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
    setCustomColor(hex)
    onChange(hex)
  }

  const handleHexChange = (hex: string) => {
    setCustomColor(hex)
    if (hex.match(/^#[0-9A-Fa-f]{6}$/)) {
      const rgbVal = hexToRgb(hex)
      setRgb(rgbVal)
      onChange(hex)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-lg border-2 border-gray-300 hover:border-[#1162a8] transition-colors p-3 overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: value }}
        >
          <span className="text-white font-semibold text-sm tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)'
          }}>
            {value.toUpperCase()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[520px] p-0" align="start">
        {!showCustomPicker ? (
          <div className="p-4">
            <h3 className="font-semibold mb-3">Preset Colors</h3>
            <div className="grid grid-cols-6 gap-3 mb-4">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:border-[#1162a8] transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color)
                    setCustomColor(color)
                    const rgbVal = hexToRgb(color)
                    setRgb(rgbVal)
                    setIsOpen(false)
                  }}
                />
              ))}
            </div>

            <div className="flex items-center mb-3 gap-2">
              <h3 className="font-semibold">Custom Color</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center"
                      aria-label="Custom color picker tip"
                    >
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click the color box below to open the picker</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-12 rounded-lg border-2 border-gray-300"
                style={{ backgroundColor: customColor }}
                onClick={() => setShowCustomPicker(true)}
              />
              <Input
                value={customColor.toUpperCase()}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#00ACC1"
                className="flex-1"
                readOnly
              />
            </div>
          </div>
        ) : (
          <div className="p-4 relative">
            <button
              type="button"
              onClick={() => setShowCustomPicker(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#00ACC1] text-white flex items-center justify-center hover:bg-[#0097A7] transition-colors z-10"
            >
              ✓
            </button>

            <h3 className="font-semibold mb-3">Color</h3>

            {/* Color Gradient Canvas */}
            <div className="mb-4 relative">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full h-48 rounded-lg cursor-crosshair border border-gray-300"
                style={{ maxWidth: '400px', height: '200px' }}
              />
            </div>

            {/* Hue Slider */}
            <div
              ref={hueRef}
              onClick={handleHueClick}
              className="w-full h-6 rounded-full cursor-pointer mb-4 relative"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
            >
              <div
                className="absolute w-5 h-5 bg-white border-2 border-gray-400 rounded-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 shadow-md"
                style={{ left: `${(hue / 360) * 100}%` }}
              />
            </div>

            {/* RGB Inputs */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <Input
                  type="number"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', e.target.value)}
                  min="0"
                  max="255"
                  className="w-full text-center"
                />
                <p className="text-xs text-center mt-1 text-gray-500">R</p>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', e.target.value)}
                  min="0"
                  max="255"
                  className="w-full text-center"
                />
                <p className="text-xs text-center mt-1 text-gray-500">G</p>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', e.target.value)}
                  min="0"
                  max="255"
                  className="w-full text-center"
                />
                <p className="text-xs text-center mt-1 text-gray-500">B</p>
              </div>
            </div>

            {/* Hex Input */}
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-12 rounded-lg border-2 border-gray-300"
                style={{ backgroundColor: customColor }}
              />
              <Input
                value={customColor.toUpperCase()}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#00ACC1"
                className="flex-1"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
