"use client"

import React, { useState, useRef, useEffect } from 'react'
import { X, Search, Palette, RefreshCw, Copy, Check, Loader2 } from 'lucide-react'
import { TeethShadeGuideImage } from './teeth-shade-guide-image'
import { shadeApiService, ShadeMatch, ShadeConversionRequest, TeethShadeColorMatchRequest } from '../services/shade-api-service'
import { useProductTeethShades } from "@/hooks/use-product-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TeethShadeGuideModalProps {
  isOpen: boolean
  onClose: () => void
  onShadeSelect?: (shade: ShadeMatch) => void
  onContinueToGumShade?: () => void
  selectedShade?: ShadeMatch | null
  selectedShadeId?: string | null
  selectedShadeSystem?: string | null
  productId?: number
}

export function TeethShadeGuideModal({ 
  isOpen, 
  onClose, 
  onShadeSelect,
  onContinueToGumShade,
  selectedShade,
  selectedShadeId,
  selectedShadeSystem,
  productId
}: TeethShadeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'shade' | 'color-picker'>('shade')
  const [localSelectedShadeId, setLocalSelectedShadeId] = useState<string | null>(null)
  const [selectedPrimarySystem, setSelectedPrimarySystem] = useState<string>('')
  const [selectedPrimaryShade, setSelectedPrimaryShade] = useState<string>('')
  const [conversionResults, setConversionResults] = useState<ShadeMatch[]>([])
  const [colorMatchResults, setColorMatchResults] = useState<ShadeMatch[]>([])
  const [isLoadingConversion, setIsLoadingConversion] = useState(false)
  const [isLoadingColorMatch, setIsLoadingColorMatch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customColor, setCustomColor] = useState('#FFFFFF')
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [sliderPosition, setSliderPosition] = useState(0) // 0-100 percentage
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch teeth shades from API - only when modal is open and productId is available
  const { data: apiShadeSystems = [], isLoading: isLoadingShadeSystems } = useProductTeethShades(isOpen && productId ? productId : null)

  // Set the selected shade ID when modal opens and initialize values
  useEffect(() => {
    if (isOpen && selectedShadeId && selectedShadeSystem) {
      setLocalSelectedShadeId(selectedShadeId)
      setSelectedPrimarySystem(selectedShadeSystem)
      setSelectedPrimaryShade(selectedShadeId)
      
      // Automatically trigger conversion
      performShadeConversion(selectedShadeId, selectedShadeSystem)
    }
  }, [isOpen, selectedShadeId, selectedShadeSystem])

  // Trigger initial color match when Color Picker tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'color-picker' && sliderPosition === 0) {
      // Trigger initial color match with the first color
      handleSliderChange(0)
    }
  }, [isOpen, activeTab])
  
  // Perform shade conversion
  const performShadeConversion = async (shadeName: string, brandName: string) => {
    setIsLoadingConversion(true)
    setError(null)
    
    try {
      const request: ShadeConversionRequest = {
        brand_name: brandName,
        shade_name: shadeName,
        limit: 3
      }
      
      const response = await shadeApiService.convertTeethShade(request)
      setConversionResults(response.data)
    } catch (error) {
      console.error("Shade conversion error:", error)
      setError(error instanceof Error ? error.message : "Failed to convert shade")
    } finally {
      setIsLoadingConversion(false)
    }
  }

  // Perform color match based on slider position
  const performColorMatch = async (hexColor: string) => {
    setIsLoadingColorMatch(true)
    setError(null)
    
    try {
      const request: TeethShadeColorMatchRequest = {
        color: hexColor,
        limit: 3
      }
      
      const response = await shadeApiService.matchTeethShadeColor(request)
      setColorMatchResults(response.data)
    } catch (error) {
      console.error("Color match error:", error)
      setError(error instanceof Error ? error.message : "Failed to match color")
    } finally {
      setIsLoadingColorMatch(false)
    }
  }

  // Convert slider position to hex color
  const getColorFromSliderPosition = (position: number): string => {
    const colors = [
      '#F8F6F0', // Bleach
      '#F5EFE0', // Light
      '#F0E6D0', // Medium
      '#E8D9BA', // Dark
      '#D4B890'  // Darkest
    ]
    
    const index = Math.floor((position / 100) * (colors.length - 1))
    return colors[index] || colors[0]
  }

  // Handle slider position change
  const handleSliderChange = (position: number) => {
    setSliderPosition(position)
    const hexColor = getColorFromSliderPosition(position)
    setCustomColor(hexColor)
    performColorMatch(hexColor)
  }

  const handleShadeClick = async (shadeId: string) => {
    setLocalSelectedShadeId(shadeId)
    setError(null)
  }


  const handleColorPickerChange = (color: string) => {
    setCustomColor(color)
    performColorMatch(color)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Extract color from center of image
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = 1
        canvas.height = 1
        ctx.drawImage(img, img.width / 2, img.height / 2, 1, 1, 0, 0, 1, 1)
        const imageData = ctx.getImageData(0, 0, 1, 1)
        const [r, g, b] = imageData.data
        const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
        
        setCustomColor(hexColor)
        performColorMatch(hexColor)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedColor(text)
      setTimeout(() => setCopiedColor(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const formatColorCodes = (colorCodes: ShadeMatch['color_codes']) => {
    return {
      incisal: colorCodes.incisal || '#FFFFFF',
      body: colorCodes.body || '#FFFFFF',
      cervical: colorCodes.cervical || '#FFFFFF'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      
    </div>
  )
}


