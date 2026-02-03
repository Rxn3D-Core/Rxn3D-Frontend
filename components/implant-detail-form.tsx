import React, { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Minus, Check } from "lucide-react"
import { useImplantDetailFormCache, type ImplantDetailFormCacheState } from "@/hooks/use-implant-detail-form-cache"

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
  /** When true, do not auto-open platform cards (e.g. in saved product accordion where saved value is shown) */
  disableAutoShowPlatformCards?: boolean
  /**
   * Optional storage key for React Query cache. When provided, user selections
   * (platform, size, inclusions, abutment) are persisted and restored so they
   * are not lost when accordion closes or component re-mounts.
   */
  storageKey?: string
  /**
   * Called when cache has platform/size but parent has not set them yet (e.g. after accordion open).
   * Parent can restore selectedImplantPlatformPerProduct and selectedImplantSize from the cached data.
   */
  onRestoreFromCache?: (data: ImplantDetailFormCacheState) => void
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
  onInclusionsQuantityChange,
  disableAutoShowPlatformCards = false,
  storageKey,
  onRestoreFromCache,
}) => {
  const { cachedState, setCachedState, hasCache } = useImplantDetailFormCache(storageKey)

  const hasRestoredRef = useRef(false)
  useEffect(() => {
    if (!hasCache || !onRestoreFromCache || hasRestoredRef.current) return
    if (cachedState.platformId != null || cachedState.size) {
      hasRestoredRef.current = true
      onRestoreFromCache(cachedState)
    }
  }, [hasCache, onRestoreFromCache, cachedState])

  const resolvedInclusions = (hasCache && cachedState.inclusions) ? cachedState.inclusions : (initialInclusions || "")
  const resolvedAbutmentDetail = (hasCache && cachedState.abutmentDetail) ? cachedState.abutmentDetail : (initialAbutmentDetail || "")
  const resolvedAbutmentType = (hasCache && cachedState.abutmentType) ? cachedState.abutmentType : (initialAbutmentType || "")
  const resolvedInclusionsQuantity = (hasCache && cachedState.inclusionsQuantity != null) ? cachedState.inclusionsQuantity : (initialInclusionsQuantity ?? 1)

  const [inclusions, setInclusions] = useState<string>(resolvedInclusions)
  const [abutmentDetail, setAbutmentDetail] = useState<string>(resolvedAbutmentDetail)
  const [abutmentType, setAbutmentType] = useState<string>(resolvedAbutmentType)
  const [inclusionsQuantity, setInclusionsQuantity] = useState<number>(resolvedInclusionsQuantity)

  const [showInclusions, setShowInclusions] = useState<boolean>(!!selectedSize)
  const [showAbutmentRow, setShowAbutmentRow] = useState<boolean>(!!inclusions)
  const [showAbutmentType, setShowAbutmentType] = useState<boolean>(!!abutmentDetail)

  const [sizeOpen, setSizeOpen] = useState<boolean>(false)
  const [inclusionsOpen, setInclusionsOpen] = useState<boolean>(false)
  const [abutmentDetailOpen, setAbutmentDetailOpen] = useState<boolean>(false)
  const [abutmentTypeOpen, setAbutmentTypeOpen] = useState<boolean>(false)

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

  useEffect(() => {
    if (disableAutoShowPlatformCards) return
    if (selectedBrand?.brand_name && !selectedPlatform?.name && onPlatformFieldClick) {
      const timer = setTimeout(() => {
        onPlatformFieldClick()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [disableAutoShowPlatformCards, selectedBrand?.brand_name, selectedPlatform?.name, onPlatformFieldClick])

  useEffect(() => {
    if (selectedPlatform?.name && !selectedSize) {
      const timer = setTimeout(() => setSizeOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [selectedPlatform?.name, selectedSize])

  useEffect(() => {
    if (showInclusions && !inclusions) {
      const timer = setTimeout(() => setInclusionsOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showInclusions, inclusions])

  useEffect(() => {
    if (showAbutmentRow && !abutmentDetail) {
      const timer = setTimeout(() => setAbutmentDetailOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showAbutmentRow, abutmentDetail])

  useEffect(() => {
    if (showAbutmentType && !abutmentType) {
      const timer = setTimeout(() => setAbutmentTypeOpen(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showAbutmentType, abutmentType])

  const onInclusionsChangeRef = useRef(onInclusionsChange)
  const onAbutmentDetailChangeRef = useRef(onAbutmentDetailChange)
  const onAbutmentTypeChangeRef = useRef(onAbutmentTypeChange)

  onInclusionsChangeRef.current = onInclusionsChange
  onAbutmentDetailChangeRef.current = onAbutmentDetailChange
  onAbutmentTypeChangeRef.current = onAbutmentTypeChange

  useEffect(() => {
    if (resolvedInclusions !== inclusions) {
      setInclusions(resolvedInclusions)
    }
  }, [resolvedInclusions])

  useEffect(() => {
    if (resolvedAbutmentDetail !== abutmentDetail) {
      setAbutmentDetail(resolvedAbutmentDetail)
    }
  }, [resolvedAbutmentDetail])

  useEffect(() => {
    if (resolvedAbutmentType !== abutmentType) {
      setAbutmentType(resolvedAbutmentType)
    }
  }, [resolvedAbutmentType])

  useEffect(() => {
    if (resolvedInclusionsQuantity !== inclusionsQuantity) {
      setInclusionsQuantity(resolvedInclusionsQuantity)
    }
  }, [resolvedInclusionsQuantity])

  useEffect(() => {
    if (!hasCache) return
    if (selectedPlatform != null || selectedSize != null) {
      setCachedState({
        platformId: selectedPlatform?.id ?? null,
        platformName: selectedPlatform?.name ?? null,
        size: selectedSize ?? null,
      })
    }
  }, [hasCache, selectedPlatform?.id, selectedPlatform?.name, selectedSize])

  const implantSizes = ["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"]

  const inclusionOptions = [
    "No inclusion",
    "Model with Tissue",
    "Model with Tissue + QTY"
  ]

  const abutmentDetailOptions = [
    "Office provided",
    "Lab provided",
    "Custom"
  ]

  const abutmentTypeOptions = [
    "Stock Abutment",
    "Custom Abutment",
    "Multi-Unit abutment"
  ]

  const primaryToothNumber = teethNumbers && teethNumbers.length > 0 ? teethNumbers[0] : null

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

  const isFormComplete = (): boolean => {
    return hasValue(selectedBrand?.brand_name) &&
           hasValue(selectedPlatform?.name) &&
           hasValue(selectedSize) &&
           hasValue(inclusions) &&
           hasValue(abutmentDetail) &&
           hasValue(abutmentType)
  }

  const getFieldBorderColor = (value: string | undefined | null): string => {
    if (hasValue(value)) {
      return '#119933'
    }
    return '#ef4444'
  }

  const getFieldLabelColor = (value: string | undefined | null): string => {
    if (hasValue(value)) {
      return '#119933'
    }
    return '#ef4444'
  }

  const getContainerBorderColor = (): string => {
    if (isFormComplete()) {
      return '#119933'
    }
    return '#ef4444'
  }

  const getImplantDetailLabelColor = (): string => {
    if (isFormComplete()) {
      return '#119933'
    }
    return '#ef4444'
  }

  // Common field styles
  const fieldInputStyle = {
    padding: '8px 30px 8px 12px',
    width: '100%',
    height: '37px',
    background: '#FFFFFF',
    borderRadius: '7.7px',
    boxSizing: 'border-box' as const,
    fontFamily: 'Verdana',
    fontSize: '14px',
    lineHeight: '20px',
    color: '#000000'
  }

  const fieldLabelStyle = {
    padding: '0px 4px',
    height: '14px',
    left: '8px',
    top: '0px',
    fontFamily: 'Arial',
    fontSize: '12px',
    lineHeight: '14px',
  }

  return (
    <div className="w-full">
      {/* Main container */}
      <div
        className="w-full"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: '12px 16px',
          background: '#FFFFFF',
          border: `1px solid ${getContainerBorderColor()}`,
          borderRadius: '7.7px'
        }}
      >
        {/* Header: Implant details label and tooth number */}
        <div
          className="flex items-center gap-2 mb-3"
          style={{ marginBottom: '12px' }}
        >
          <span
            style={{
              fontFamily: 'Arial',
              fontSize: '14px',
              lineHeight: '14px',
              color: '#7F7F7F'
            }}
          >
            Implant details
          </span>
          {primaryToothNumber && (
            <span
              style={{
                fontFamily: 'Arial',
                fontSize: '20px',
                lineHeight: '20px',
                color: '#7F7F7F'
              }}
            >
              #{primaryToothNumber}
            </span>
          )}
        </div>

        {/* Content - 3 column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            width: '100%'
          }}
        >
          {/* Row 1: Implant Brand, Platform, Size */}

          {/* Implant Brand - Always visible */}
          <div className="relative" style={{ minHeight: '50px', paddingTop: '8px', width: '100%' }}>
            <Input
              type="text"
              value={selectedBrand?.brand_name || ""}
              readOnly
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (onBrandFieldClick) onBrandFieldClick()
              }}
              onFocus={(e) => {
                e.stopPropagation()
                if (onBrandFieldClick) onBrandFieldClick()
              }}
              className="w-full cursor-pointer"
              style={{
                ...fieldInputStyle,
                border: `1px solid ${getFieldBorderColor(selectedBrand?.brand_name)}`
              }}
            />
            {hasValue(selectedBrand?.brand_name) && (
              <div className="absolute right-[10px] top-1/2 translate-y-[4px] pointer-events-none">
                <Check className="h-4 w-4 text-[#119933]" />
              </div>
            )}
            <label
              className="absolute bg-white px-1"
              style={{
                ...fieldLabelStyle,
                color: getFieldLabelColor(selectedBrand?.brand_name)
              }}
            >
              Implant brand
            </label>
          </div>

          {/* Implant Platform - Show only if Brand is selected */}
          {hasValue(selectedBrand?.brand_name) && (
            <div className="relative" style={{ minHeight: '50px', paddingTop: '8px', width: '100%' }}>
              <Input
                type="text"
                value={selectedPlatform?.name || ""}
                readOnly
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (onPlatformFieldClick) onPlatformFieldClick()
                }}
                onFocus={(e) => {
                  e.stopPropagation()
                  if (onPlatformFieldClick) onPlatformFieldClick()
                }}
                className="w-full cursor-pointer"
                style={{
                  ...fieldInputStyle,
                  border: `1px solid ${getFieldBorderColor(selectedPlatform?.name)}`
                }}
                placeholder=""
              />
              {hasValue(selectedPlatform?.name) && (
                <div className="absolute right-[10px] top-1/2 translate-y-[4px] pointer-events-none">
                  <Check className="h-4 w-4 text-[#119933]" />
                </div>
              )}
              <label
                className="absolute bg-white px-1"
                style={{
                  ...fieldLabelStyle,
                  color: getFieldLabelColor(selectedPlatform?.name)
                }}
              >
                Implant platform
              </label>
            </div>
          )}

          {/* Implant Size - Show only if Platform is selected */}
          {hasValue(selectedPlatform?.name) && (
            <div className="relative" style={{ minHeight: '50px', paddingTop: '8px', width: '100%' }}>
              <Select
                value={selectedSize || ""}
                open={sizeOpen}
                onOpenChange={setSizeOpen}
                onValueChange={(value: string) => {
                  if (hasCache) setCachedState({ size: value })
                  onSizeChange(value)
                  setSizeOpen(false)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  style={{
                    ...fieldInputStyle,
                    border: `1px solid ${getFieldBorderColor(selectedSize)}`
                  }}
                >
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {implantSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasValue(selectedSize) && (
                <div className="absolute right-[30px] top-1/2 translate-y-[4px] pointer-events-none">
                  <Check className="h-4 w-4 text-[#119933]" />
                </div>
              )}
              <label
                className="absolute bg-white px-1"
                style={{
                  ...fieldLabelStyle,
                  color: getFieldLabelColor(selectedSize)
                }}
              >
                Implant size
              </label>
            </div>
          )}

          {/* Row 2: Inclusions, Abutment Details, Abutment Type */}

          {/* Implant Inclusions - Show only if Size is selected */}
          {showInclusions && (
            <div className="relative" style={{ minHeight: '50px', paddingTop: '8px', width: '100%' }}>
              <Select
                value={inclusions}
                open={inclusionsOpen}
                onOpenChange={setInclusionsOpen}
                onValueChange={(value) => {
                  setInclusions(value)
                  if (hasCache) setCachedState({ inclusions: value, inclusionsQuantity: value === "Model with Tissue + QTY" ? 1 : undefined })
                  onInclusionsChange(value)
                  if (value === "Model with Tissue + QTY") {
                    setInclusionsQuantity(1)
                    if (onInclusionsQuantityChange) onInclusionsQuantityChange(1)
                  } else {
                    setInclusionsQuantity(1)
                  }
                  setInclusionsOpen(false)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  style={{
                    ...fieldInputStyle,
                    border: `1px solid ${getFieldBorderColor(inclusions)}`
                  }}
                >
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {inclusionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasValue(inclusions) && (
                <div className="absolute right-[30px] top-1/2 translate-y-[4px] pointer-events-none">
                  <Check className="h-4 w-4 text-[#119933]" />
                </div>
              )}
              <label
                className="absolute bg-white px-1"
                style={{
                  ...fieldLabelStyle,
                  color: getFieldLabelColor(inclusions)
                }}
              >
                Implant inclusions
              </label>
            </div>
          )}

          {/* Abutment Details - Show only if Inclusions is selected */}
          {showAbutmentRow && (
            <div className="relative" style={{ minHeight: '50px', paddingTop: '8px', width: '100%' }}>
              <Select
                value={abutmentDetail}
                open={abutmentDetailOpen}
                onOpenChange={setAbutmentDetailOpen}
                onValueChange={(value) => {
                  setAbutmentDetail(value)
                  if (hasCache) setCachedState({ abutmentDetail: value })
                  onAbutmentDetailChange(value)
                  setAbutmentDetailOpen(false)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  style={{
                    ...fieldInputStyle,
                    border: `1px solid ${getFieldBorderColor(abutmentDetail)}`
                  }}
                >
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {abutmentDetailOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasValue(abutmentDetail) && (
                <div className="absolute right-[30px] top-1/2 translate-y-[4px] pointer-events-none">
                  <Check className="h-4 w-4 text-[#119933]" />
                </div>
              )}
              <label
                className="absolute bg-white px-1"
                style={{
                  ...fieldLabelStyle,
                  color: getFieldLabelColor(abutmentDetail)
                }}
              >
                Abutment Details
              </label>
            </div>
          )}

          {/* Abutment Type - Show only if Abutment Details is selected */}
          {showAbutmentType && (
            <div className="relative" style={{ minHeight: '50px', paddingTop: '8px', width: '100%' }}>
              <Select
                value={abutmentType}
                open={abutmentTypeOpen}
                onOpenChange={setAbutmentTypeOpen}
                onValueChange={(value) => {
                  setAbutmentType(value)
                  if (hasCache) setCachedState({ abutmentType: value })
                  onAbutmentTypeChange(value)
                  setAbutmentTypeOpen(false)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  style={{
                    ...fieldInputStyle,
                    border: `1px solid ${getFieldBorderColor(abutmentType)}`
                  }}
                >
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {abutmentTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasValue(abutmentType) && (
                <div className="absolute right-[30px] top-1/2 translate-y-[4px] pointer-events-none">
                  <Check className="h-4 w-4 text-[#119933]" />
                </div>
              )}
              <label
                className="absolute bg-white px-1"
                style={{
                  ...fieldLabelStyle,
                  color: getFieldLabelColor(abutmentType)
                }}
              >
                Abutment type
              </label>
            </div>
          )}
        </div>

        {/* Quantity controls - Show only when "Model with Tissue + QTY" is selected */}
        {inclusions === "Model with Tissue + QTY" && (
          <div
            className="flex items-center gap-2 mt-3"
            style={{ marginTop: '12px' }}
          >
            <span style={{ fontFamily: 'Arial', fontSize: '12px', color: '#7F7F7F' }}>
              Quantity:
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newQuantity = Math.max(1, inclusionsQuantity - 1)
                setInclusionsQuantity(newQuantity)
                if (hasCache) setCachedState({ inclusionsQuantity: newQuantity })
                if (onInclusionsQuantityChange) onInclusionsQuantityChange(newQuantity)
              }}
              style={{
                height: '28px',
                width: '28px',
                padding: '0px',
                borderRadius: '4px',
                border: '1px solid #7F7F7F'
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span style={{ minWidth: '30px', textAlign: 'center', fontFamily: 'Verdana', fontSize: '14px' }}>
              {inclusionsQuantity}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newQuantity = inclusionsQuantity + 1
                setInclusionsQuantity(newQuantity)
                if (hasCache) setCachedState({ inclusionsQuantity: newQuantity })
                if (onInclusionsQuantityChange) onInclusionsQuantityChange(newQuantity)
              }}
              style={{
                height: '28px',
                width: '28px',
                padding: '0px',
                borderRadius: '4px',
                border: '1px solid #7F7F7F'
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
