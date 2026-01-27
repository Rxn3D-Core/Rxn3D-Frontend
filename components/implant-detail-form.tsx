import React, { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"

interface ImplantDetailFormProps {
  fieldKey: string
  fieldId: number
  selectedBrand: any
  selectedPlatform: any | null
  selectedSize: string | null
  onSizeChange: (size: string) => void
  onInclusionsChange: (inclusions: string) => void
  onAbutmentDetailChange: (detail: string) => void
  onAbutmentTypeChange: (type: string) => void
  onPlatformChange?: (platform: any) => void
  onPlatformFieldClick?: () => void
  onBrandFieldClick?: () => void
  teethNumbers: number[]
  arch: "maxillary" | "mandibular"
  initialInclusions?: string
  initialAbutmentDetail?: string
  initialAbutmentType?: string
  initialInclusionsQuantity?: number
  onInclusionsQuantityChange?: (quantity: number) => void
}

export const ImplantDetailForm: React.FC<ImplantDetailFormProps> = ({
  fieldKey,
  fieldId,
  selectedBrand,
  selectedPlatform,
  selectedSize,
  onSizeChange,
  onInclusionsChange,
  onAbutmentDetailChange,
  onAbutmentTypeChange,
  onPlatformChange,
  onPlatformFieldClick,
  onBrandFieldClick,
  teethNumbers,
  arch,
  initialInclusions,
  initialAbutmentDetail,
  initialAbutmentType,
  initialInclusionsQuantity,
  onInclusionsQuantityChange
}) => {
  const [inclusions, setInclusions] = useState<string>(initialInclusions || "")
  const [abutmentDetail, setAbutmentDetail] = useState<string>(initialAbutmentDetail || "")
  const [abutmentType, setAbutmentType] = useState<string>(initialAbutmentType || "")
  const [inclusionsQuantity, setInclusionsQuantity] = useState<number>(initialInclusionsQuantity || 1)

  // Delayed visibility states to prevent Radix UI ref composition infinite loops
  // When Select components are conditionally rendered rapidly, Radix's compose-refs can enter an infinite update cycle
  const [showInclusions, setShowInclusions] = useState<boolean>(!!selectedSize)
  const [showAbutmentRow, setShowAbutmentRow] = useState<boolean>(!!inclusions)
  const [showAbutmentType, setShowAbutmentType] = useState<boolean>(!!abutmentDetail)

  // Open states for auto-opening dropdowns when they appear
  const [sizeOpen, setSizeOpen] = useState<boolean>(false)
  const [inclusionsOpen, setInclusionsOpen] = useState<boolean>(false)
  const [abutmentDetailOpen, setAbutmentDetailOpen] = useState<boolean>(false)
  const [abutmentTypeOpen, setAbutmentTypeOpen] = useState<boolean>(false)

  // Delay showing dependent fields to prevent rapid mounting/unmounting
  useEffect(() => {
    if (selectedSize) {
      const timer = setTimeout(() => setShowInclusions(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowInclusions(false)
    }
  }, [selectedSize])

  useEffect(() => {
    if (inclusions) {
      const timer = setTimeout(() => setShowAbutmentRow(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowAbutmentRow(false)
    }
  }, [inclusions])

  useEffect(() => {
    if (abutmentDetail) {
      const timer = setTimeout(() => setShowAbutmentType(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowAbutmentType(false)
    }
  }, [abutmentDetail])

  // Auto-open Size dropdown when platform is selected and size is not yet set
  useEffect(() => {
    if (selectedPlatform?.name && !selectedSize) {
      const timer = setTimeout(() => setSizeOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [selectedPlatform?.name, selectedSize])

  // Auto-open Inclusions dropdown when it becomes visible and is not yet set
  useEffect(() => {
    if (showInclusions && !inclusions) {
      const timer = setTimeout(() => setInclusionsOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showInclusions, inclusions])

  // Auto-open Abutment Detail dropdown when it becomes visible and is not yet set
  useEffect(() => {
    if (showAbutmentRow && !abutmentDetail) {
      const timer = setTimeout(() => setAbutmentDetailOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showAbutmentRow, abutmentDetail])

  // Auto-open Abutment Type dropdown when it becomes visible and is not yet set
  useEffect(() => {
    if (showAbutmentType && !abutmentType) {
      const timer = setTimeout(() => setAbutmentTypeOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showAbutmentType, abutmentType])

  // Store callbacks in refs to get latest version without triggering re-renders
  // These refs are updated synchronously during render, not via useEffect
  const onInclusionsChangeRef = useRef(onInclusionsChange)
  const onAbutmentDetailChangeRef = useRef(onAbutmentDetailChange)
  const onAbutmentTypeChangeRef = useRef(onAbutmentTypeChange)

  // Update refs synchronously during render (no useEffect needed)
  onInclusionsChangeRef.current = onInclusionsChange
  onAbutmentDetailChangeRef.current = onAbutmentDetailChange
  onAbutmentTypeChangeRef.current = onAbutmentTypeChange

  // Sync local state with props when they change
  useEffect(() => {
    if (initialInclusions !== undefined && initialInclusions !== inclusions) {
      setInclusions(initialInclusions)
    }
  }, [initialInclusions])

  useEffect(() => {
    if (initialAbutmentDetail !== undefined && initialAbutmentDetail !== abutmentDetail) {
      setAbutmentDetail(initialAbutmentDetail)
    }
  }, [initialAbutmentDetail])

  useEffect(() => {
    if (initialAbutmentType !== undefined && initialAbutmentType !== abutmentType) {
      setAbutmentType(initialAbutmentType)
    }
  }, [initialAbutmentType])

  useEffect(() => {
    if (initialInclusionsQuantity !== undefined && initialInclusionsQuantity !== inclusionsQuantity) {
      setInclusionsQuantity(initialInclusionsQuantity)
    }
  }, [initialInclusionsQuantity])
  
  // Removed automatic clearing logic to prevent infinite loops
  // The useEffect hooks that cleared subsequent fields when previous fields were cleared
  // were causing "Maximum update depth exceeded" errors due to rapid re-renders.
  // Fields will now be cleared manually by user or can be handled at parent level if needed.
  
  // Common sizes for implants
  const implantSizes = ["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"]
  
  // Common inclusions options
  const inclusionOptions = [
    "No inclusion",
    "Model with Tissue",
    "Model with Tissue + QTY"
  ]
  
  // Common abutment details
  const abutmentDetailOptions = [
    "Office provided",
    "Lab provided",
    "Custom"
  ]
  
  // Common abutment types
  const abutmentTypeOptions = [
    "Stock Abutment",
    "Custom Abutment",
    "Multi-Unit abutment"
  ]
  
  const primaryToothNumber = teethNumbers && teethNumbers.length > 0 ? teethNumbers[0] : null
  
  // Helper to check if a value is actually set (not empty, not placeholder)
  const hasValue = (value: string | undefined | null): boolean => {
    if (!value) return false
    const trimmed = String(value).trim()
    return trimmed !== "" && 
           trimmed.toLowerCase() !== "not specified" &&
           trimmed !== "Select Implant size" &&
           trimmed !== "Select Inclusions" &&
           trimmed !== "Select Abutment type" &&
           trimmed !== "Select Platform"
  }

  // Helper to determine border color for a field
  const getFieldBorderColor = (value: string | undefined | null): string => {
    if (hasValue(value)) {
      return '#119933' // green
    }
    // Show red border if empty or placeholder
    if (!value || value.trim() === "" || 
        value === "Select Implant size" || 
        value === "Select Inclusions" || 
        value === "Select Abutment type" ||
        value === "Select Platform") {
      return '#ef4444' // red
    }
    // Default gray border
    return '#7F7F7F' // gray
  }

  // Helper to determine label color for a field
  const getFieldLabelColor = (value: string | undefined | null): string => {
    if (hasValue(value)) {
      return '#119933' // green
    }
    // Show red label if empty or placeholder
    if (!value || value.trim() === "" || 
        value === "Select Implant size" || 
        value === "Select Inclusions" || 
        value === "Select Abutment type" ||
        value === "Select Platform") {
      return '#ef4444' // red
    }
    // Default gray label
    return '#7F7F7F' // gray
  }
  
  return (
    <div
      className="w-full max-w-full"
      style={{
        width: '100%',
        maxWidth: '100%',
        minHeight: '208px',
        flex: 'none',
        order: 2,
        alignSelf: 'stretch',
        flexGrow: 0,
        position: 'relative',
        marginTop: '20px'
      }}
    >
      {/* Frame 2463 - Main container */}
      <div
        className="w-full"
        style={{
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          minHeight: '167px',
          padding: '10.17px 0',
          background: '#FFFFFF',
          border: '1px solid #7F7F7F',
          borderRadius: '7.7px'
        }}
      >
        {/* Frame 2461 - Content container */}
        <div
          className="w-full flex flex-col items-center"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px',
            gap: '0px',
            width: 'calc(100% - 90px)',
            marginLeft: '90px',
            minHeight: '167.55px'
          }}
        >
          {/* Row 1: Implant Brand, Platform, Size */}
          <div
            className="w-full flex flex-col sm:flex-row flex-wrap"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0px',
              gap: '0px',
              width: '100%',
              minHeight: '42.27px',
              flex: 'none',
              order: 0,
              flexGrow: 0
            }}
          >
            {/* Implant Brand */}
            <div className="relative flex-1" style={{ minHeight: '43px', flex: '1 1 auto', order: 0 }}>
              <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                <Input
                  type="text"
                  value={selectedBrand?.brand_name || ""}
                  readOnly
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (onBrandFieldClick) {
                      onBrandFieldClick()
                    }
                  }}
                  onFocus={(e) => {
                    e.stopPropagation()
                    if (onBrandFieldClick) {
                      onBrandFieldClick()
                    }
                  }}
                  className="w-full cursor-pointer"
                  style={{
                    padding: '12px 15px 5px 15px',
                    gap: '5px',
                    width: '100%',
                    height: '37px',
                    position: 'relative',
                    marginTop: '0px',
                    background: '#FFFFFF',
                    border: `0.740384px solid ${getFieldBorderColor(selectedBrand?.brand_name)}`,
                    borderRadius: '7.7px',
                    boxSizing: 'border-box',
                    fontFamily: 'Verdana',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    fontSize: '14.4px',
                    lineHeight: '20px',
                    letterSpacing: '-0.02em',
                    color: '#000000'
                  }}
                />
                <label
                  className="absolute bg-white"
                  style={{
                    padding: '0px',
                    height: '14px',
                    left: '8.9px',
                    top: '0px',
                    fontFamily: 'Arial',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '14px',
                    color: getFieldLabelColor(selectedBrand?.brand_name)
                  }}
                >
                  Implant Brand
                </label>
              </div>
            </div>
            
            {/* Implant Platform - Show only if Implant Brand has value */}
            {selectedBrand?.brand_name && (
              <div className="relative flex-1" style={{ minHeight: '43px', flex: '1 1 auto', order: 1 }}>
                <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                  <Input
                    type="text"
                    value={selectedPlatform?.name || ""}
                    readOnly
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (onPlatformFieldClick) {
                        onPlatformFieldClick()
                      }
                    }}
                    onFocus={(e) => {
                      e.stopPropagation()
                      if (onPlatformFieldClick) {
                        onPlatformFieldClick()
                      }
                    }}
                    className="w-full cursor-pointer"
                    style={{
                      padding: '12px 15px 5px 15px',
                      gap: '5px',
                      width: '100%',
                      height: '37px',
                      position: 'relative',
                      marginTop: '0px',
                      background: '#FFFFFF',
                      border: `0.740384px solid ${getFieldBorderColor(selectedPlatform?.name)}`,
                      borderRadius: '7.7px',
                      boxSizing: 'border-box',
                      fontFamily: 'Verdana',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14.4px',
                      lineHeight: '20px',
                      letterSpacing: '-0.02em',
                      color: '#000000'
                    }}
                    placeholder="Select Platform"
                  />
                  <label
                    className="absolute bg-white"
                    style={{
                      padding: '0px',
                      height: '14px',
                      left: '8.9px',
                      top: '0px',
                      fontFamily: 'Arial',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '14px',
                      color: getFieldLabelColor(selectedPlatform?.name)
                    }}
                  >
                    Implant Platform
                  </label>
                </div>
              </div>
            )}
            
            {/* Implant Size - Show only if Implant Platform has value */}
            {selectedPlatform?.name && (
              <div className="relative flex-1" style={{ minHeight: '43px', flex: '1 1 auto', order: 2 }}>
                <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                  <Select
                    value={selectedSize || ""}
                    open={sizeOpen}
                    onOpenChange={setSizeOpen}
                    onValueChange={(value: string) => {
                      onSizeChange(value)
                      setSizeOpen(false)
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{
                        padding: '12px 15px 5px 15px',
                        gap: '5px',
                        width: '100%',
                        height: '37px',
                        position: 'relative',
                        marginTop: '0px',
                        background: '#FFFFFF',
                        border: `0.740384px solid ${getFieldBorderColor(selectedSize)}`,
                        borderRadius: '7.7px',
                        boxSizing: 'border-box',
                        fontFamily: 'Verdana',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        fontSize: '14.4px',
                        lineHeight: '20px',
                        letterSpacing: '-0.02em',
                        color: '#000000'
                      }}
                    >
                      <SelectValue placeholder="Select Implant size" />
                    </SelectTrigger>
                    <SelectContent>
                      {implantSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label
                    className="absolute bg-white"
                    style={{
                      padding: '0px',
                      height: '14px',
                      left: '8.9px',
                      top: '0px',
                      fontFamily: 'Arial',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '14px',
                      color: getFieldLabelColor(selectedSize)
                    }}
                  >
                    Implant Size
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Row 2: Implant inclusions - Show only if Implant Size has value */}
          {/* Using delayed visibility state to prevent Radix UI ref composition infinite loops */}
          {showInclusions && (
            <div 
              className="relative w-full flex items-center gap-2"
              style={{ 
                minHeight: '43px', 
                flex: 'none', 
                order: 1, 
                flexGrow: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div className="relative flex-1" style={{ flex: '1 1 auto', minHeight: '43px' }}>
                <Select
                  value={inclusions}
                  open={inclusionsOpen}
                  onOpenChange={setInclusionsOpen}
                  onValueChange={(value) => {
                    setInclusions(value)
                    onInclusionsChange(value)
                    // Reset quantity to 1 when changing inclusion type
                    if (value === "Model with Tissue + QTY") {
                      setInclusionsQuantity(1)
                      if (onInclusionsQuantityChange) {
                        onInclusionsQuantityChange(1)
                      }
                    } else {
                      setInclusionsQuantity(1)
                    }
                    setInclusionsOpen(false)
                  }}
                >
                  <SelectTrigger
                    className="w-full"
                    style={{
                      padding: '12px 15px 5px 15px',
                      gap: '5px',
                      width: '100%',
                      height: '37px',
                      position: 'relative',
                      marginTop: '0px',
                      background: '#FFFFFF',
                      border: `0.740384px solid ${getFieldBorderColor(inclusions)}`,
                      borderRadius: '7.7px',
                      boxSizing: 'border-box',
                      fontFamily: 'Verdana',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14.4px',
                      lineHeight: '20px',
                      letterSpacing: '-0.02em',
                      color: '#000000'
                    }}
                  >
                    <SelectValue placeholder="Select Inclusions" />
                  </SelectTrigger>
                  <SelectContent>
                    {inclusionOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label
                  className="absolute bg-white"
                  style={{
                    padding: '0px',
                    height: '14px',
                    left: '8.9px',
                    top: '0px',
                    fontFamily: 'Arial',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '14px',
                    color: getFieldLabelColor(inclusions)
                  }}
                >
                  Implant inclusions
                </label>
              </div>
              
              {/* Quantity controls - Show only when "Model with Tissue + QTY" is selected */}
              {inclusions === "Model with Tissue + QTY" && (
                <div
                  className="flex items-center gap-1"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-md border-2 hover:bg-gray-100"
                    onClick={() => {
                      const newQuantity = Math.max(1, inclusionsQuantity - 1)
                      setInclusionsQuantity(newQuantity)
                      if (onInclusionsQuantityChange) {
                        onInclusionsQuantityChange(newQuantity)
                      }
                    }}
                    style={{
                      height: '37px',
                      width: '37px',
                      padding: '0px',
                      borderRadius: '7.7px',
                      border: '2px solid #7F7F7F',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Minus className="h-4 w-4" style={{ height: '16px', width: '16px' }} />
                  </Button>
                  <div
                    style={{
                      minWidth: '40px',
                      textAlign: 'center',
                      fontFamily: 'Verdana',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14.4px',
                      lineHeight: '20px',
                      color: '#000000'
                    }}
                  >
                    {inclusionsQuantity}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-md border-2 hover:bg-gray-100"
                    onClick={() => {
                      const newQuantity = inclusionsQuantity + 1
                      setInclusionsQuantity(newQuantity)
                      if (onInclusionsQuantityChange) {
                        onInclusionsQuantityChange(newQuantity)
                      }
                    }}
                    style={{
                      height: '37px',
                      width: '37px',
                      padding: '0px',
                      borderRadius: '7.7px',
                      border: '2px solid #7F7F7F',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus className="h-4 w-4" style={{ height: '16px', width: '16px' }} />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Row 3: Abutment details - Show only if Implant inclusions has value */}
          {/* Using delayed visibility state to prevent Radix UI ref composition infinite loops */}
          {showAbutmentRow && (
            <div
              className="w-full flex flex-col sm:flex-row flex-wrap"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                padding: '0px',
                gap: '0px',
                width: '100%',
                minHeight: '42.27px',
                flex: 'none',
                order: 2,
                flexGrow: 0
              }}
            >
              {/* Abutment Detail */}
              <div className="relative flex-1" style={{ minHeight: '43px', flex: '1 1 auto', order: 0 }}>
                <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                  <Select
                    value={abutmentDetail}
                    open={abutmentDetailOpen}
                    onOpenChange={setAbutmentDetailOpen}
                    onValueChange={(value) => {
                      setAbutmentDetail(value)
                      onAbutmentDetailChange(value)
                      setAbutmentDetailOpen(false)
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{
                        padding: '12px 15px 5px 15px',
                        gap: '5px',
                        width: '100%',
                        height: '37px',
                        position: 'relative',
                        marginTop: '0px',
                        background: '#FFFFFF',
                        border: `0.740384px solid ${getFieldBorderColor(abutmentDetail)}`,
                        borderRadius: '7.7px',
                        boxSizing: 'border-box',
                        fontFamily: 'Verdana',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        fontSize: '14.4px',
                        lineHeight: '20px',
                        letterSpacing: '-0.02em',
                        color: '#000000'
                      }}
                    >
                      <SelectValue placeholder="Office provided" />
                    </SelectTrigger>
                    <SelectContent>
                      {abutmentDetailOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label
                    className="absolute bg-white"
                    style={{
                      padding: '0px',
                      height: '14px',
                      left: '8.9px',
                      top: '0px',
                      fontFamily: 'Arial',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '14px',
                      color: getFieldLabelColor(abutmentDetail)
                    }}
                  >
                    Abutment Detail
                  </label>
                </div>
              </div>

              {/* Abutment type - Show only if Abutment Detail has value */}
              {/* Using delayed visibility state to prevent Radix UI ref composition infinite loops */}
              {showAbutmentType && (
                <div className="relative flex-1" style={{ minHeight: '43px', flex: '1 1 auto', order: 1 }}>
                  <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                    <Select
                      value={abutmentType}
                      open={abutmentTypeOpen}
                      onOpenChange={setAbutmentTypeOpen}
                      onValueChange={(value) => {
                        setAbutmentType(value)
                        onAbutmentTypeChange(value)
                        setAbutmentTypeOpen(false)
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        style={{
                          padding: '12px 15px 5px 15px',
                          gap: '5px',
                          width: '100%',
                          height: '37px',
                          position: 'relative',
                          marginTop: '0px',
                          background: '#FFFFFF',
                          border: `0.740384px solid ${getFieldBorderColor(abutmentType)}`,
                          borderRadius: '7.7px',
                          boxSizing: 'border-box',
                          fontFamily: 'Verdana',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          fontSize: '14.4px',
                          lineHeight: '20px',
                          letterSpacing: '-0.02em',
                          color: '#000000'
                        }}
                      >
                        <SelectValue placeholder="Select Abutment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {abutmentTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label
                      className="absolute bg-white"
                      style={{
                        padding: '0px',
                        height: '14px',
                        left: '8.9px',
                        top: '0px',
                        fontFamily: 'Arial',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        fontSize: '14px',
                        lineHeight: '14px',
                        color: getFieldLabelColor(abutmentType)
                      }}
                    >
                      Abutment type
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Frame 2462 - Left side with tooth number and label */}
        <div
          className="hidden sm:flex"
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0px',
            gap: '10px',
            position: 'absolute',
            width: '90px',
            minHeight: '166.82px',
            left: '0px',
            top: '0px'
          }}
        >
          {/* Tooth Number */}
          {primaryToothNumber && (
            <div
              style={{
                width: '34px',
                height: '27px',
                fontFamily: 'Arial',
                fontStyle: 'normal',
                fontWeight: 400,
                fontSize: '20px',
                lineHeight: '27px',
                textAlign: 'center',
                color: '#7F7F7F',
                flex: 'none',
                order: 0,
                flexGrow: 0
              }}
            >
              #{primaryToothNumber}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
