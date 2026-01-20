"use client"

import React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getShadeGradientColors } from "@/utils/teeth-shade-utils"

export interface FieldConfig {
  key: string
  label: string
  apiProperty: string
  fieldType: "select" | "modal" | "shade" | "text"
  sequence: number
  maxillaryStateKey?: string
  mandibularStateKey?: string
  maxillaryIdKey?: string
  mandibularIdKey?: string
  dependsOn?: string
  rowGroup?: number
}

interface DynamicProductFieldsProps {
  productDetails: any
  savedProduct: any
  arch: "maxillary" | "mandibular"
  fieldConfigs: FieldConfig[]
  onFieldChange: (fieldKey: string, value: string, id?: number) => void
  onOpenImpressionModal?: () => void
  getImpressionCount?: () => number
  getImpressionDisplayText?: () => string
  onOpenShadeModal?: (fieldKey: string, arch?: "maxillary" | "mandibular") => void
  shadeColors?: Record<string, string> // Map of shade names to gradient colors
  maxillaryRetentionTypes?: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  mandibularRetentionTypes?: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
  maxillaryTeeth?: number[]
  mandibularTeeth?: number[]
}

export function DynamicProductFields({
  productDetails,
  savedProduct,
  arch,
  fieldConfigs,
  onFieldChange,
  onOpenImpressionModal,
  getImpressionCount,
  getImpressionDisplayText,
  onOpenShadeModal,
  shadeColors = {},
  maxillaryRetentionTypes = {},
  mandibularRetentionTypes = {},
  maxillaryTeeth = [],
  mandibularTeeth = [],
}: DynamicProductFieldsProps) {
  // Helper to check if a value is actually set (not empty, not "Not specified", not undefined, not null)
  const hasValue = (value: string | undefined | null): boolean => {
    if (!value) return false
    const trimmed = String(value).trim()
    return trimmed !== "" && trimmed.toLowerCase() !== "not specified" && trimmed.toLowerCase() !== "finish"
  }

  // Helper to check if retention value is valid (not empty, not placeholder)
  const hasValidRetentionValue = (retentionValue: string | undefined | null): boolean => {
    if (!retentionValue) return false
    const trimmed = String(retentionValue).trim()
    return trimmed !== '' && 
           trimmed !== 'Not specified' && 
           trimmed !== 'Select' && 
           trimmed !== 'Select Retention type'
  }

  // Helper to get field value
  const getFieldValueByKey = (fieldKey: string): string | undefined => {
    const config = fieldConfigs.find(f => f.key === fieldKey)
    if (!config) return undefined
    const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
    if (!stateKey) return undefined
    return savedProduct[stateKey as keyof typeof savedProduct] as string | undefined
  }

  // Helper to check if any tooth has a retention type selected from popover
  const hasRetentionTypeSelected = (): boolean => {
    const teeth = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth
    const retentionTypes = arch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes
    
    // If no teeth are selected, don't show the field
    if (!teeth || teeth.length === 0) {
      return false
    }
    
    // Check if any tooth in the product has a retention type selected from popover
    const hasSelection = teeth.some(toothNumber => {
      const types = retentionTypes[toothNumber] || []
      // Only return true if there's actually a retention type selected (Implant, Prep, or Pontic)
      return types.length > 0 && (types.includes('Implant') || types.includes('Prep') || types.includes('Pontic'))
    })
    
    return hasSelection
  }

  // Helper to check if stage field is visible (used by impression field check)
  const isStageFieldVisible = (): boolean => {
    const toothShadeValue = getFieldValueByKey("tooth_shade")
    const stages = productDetails?.stages
    
    // Stage field is not visible if:
    // 1. Tooth shade doesn't have a value
    // 2. Stages don't exist in productDetails
    if (!hasValue(toothShadeValue)) {
      return false
    }
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return false
    }
    
    return true
  }

  // Helper to check if a field should be visible based on progressive disclosure
  const isFieldVisibleProgressive = (config: FieldConfig): boolean => {
    // Always show material (sequence 1) initially
    if (config.sequence === 1) {
      return true
    }
    
    // For retention (sequence 2), only show if retention type selected from popover
    if (config.sequence === 2 || config.key === "retention") {
      return hasRetentionTypeSelected()
    }

    // retention_option (sequence 3) - show after retention has value
    if (config.key === "retention_option") {
      const retentionValue = getFieldValueByKey("retention")
      return hasValue(retentionValue)
    }

    // stage (sequence 4) - show after retention has value and stages exist
    if (config.key === "stage") {
      const retentionValue = getFieldValueByKey("retention")
      if (!hasValue(retentionValue)) {
        return false
      }
      const stages = productDetails?.stages
      if (!stages || !Array.isArray(stages) || stages.length === 0) {
        return false
      }
      return true
    }

    // stump_shade (sequence 5) - show after stage field is visible AND has value (for both maxillary and mandibular)
    if (config.key === "stump_shade") {
      // First check if stage field is visible (retention filled and stages exist)
      const retentionValue = getFieldValueByKey("retention")
      if (!hasValue(retentionValue)) {
        return false
      }
      const stages = productDetails?.stages
      if (!stages || !Array.isArray(stages) || stages.length === 0) {
        return false
      }
      // Then check if stage has a value
      const stageValue = getFieldValueByKey("stage")
      return hasValue(stageValue)
    }

    // tooth_shade (sequence 6) - show after stump_shade has value (for both maxillary and mandibular)
    if (config.key === "tooth_shade") {
      const stumpShadeValue = getFieldValueByKey("stump_shade")
      return hasValue(stumpShadeValue)
    }

    // impression (sequence 7) - exclude from DynamicProductFields, will be rendered separately after advanced fields
    if (config.key === "impression" || config.key === "impressions") {
      return false // Don't render impression here, it will be rendered after advanced fields
    }

    // Other fields (sequence >= 7) - show after stage has value
    if (config.sequence >= 7) {
      const stageValue = getFieldValueByKey("stage")
      return hasValue(stageValue)
    }

    // For any other fields, check dependencies first
    if (config.dependsOn) {
      const dependencyValue = getFieldValueByKey(config.dependsOn)
      if (!hasValue(dependencyValue)) {
        return false
      }
    }

    return true
  }

  // Helper to check if all required fields are filled (for showing advance fields)
  const areAllRequiredFieldsFilled = (): boolean => {
    const materialValue = getFieldValueByKey("material")
    const retentionValue = getFieldValueByKey("retention")
    const stumpShadeValue = getFieldValueByKey("stump_shade")
    const toothShadeValue = getFieldValueByKey("tooth_shade")
    const stageValue = getFieldValueByKey("stage")

    // Check all required fields
    const hasMaterial = hasValue(materialValue)
    const hasRetention = hasValue(retentionValue)
    const hasStumpShade = hasValue(stumpShadeValue) // Both maxillary and mandibular have stump shade
    const hasToothShade = hasValue(toothShadeValue)
    const hasStage = hasValue(stageValue)

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage
  }

  // Filter and sort fields that should be displayed
  const visibleFields = fieldConfigs
    .filter(config => {
      if (!productDetails) return false
      const apiData = productDetails[config.apiProperty]
      if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
        return false
      }

      // Progressive disclosure: hide fields initially, show them one by one as previous fields are filled
      if (!isFieldVisibleProgressive(config)) {
        return false
      }

      // Check dependencies (for fields that have explicit dependsOn)
      if (config.dependsOn) {
        const dependencyConfig = fieldConfigs.find(f => f.key === config.dependsOn)
        if (dependencyConfig) {
          const dependencyValue = arch === "maxillary"
            ? savedProduct[dependencyConfig.maxillaryStateKey as keyof typeof savedProduct] as string
            : savedProduct[dependencyConfig.mandibularStateKey as keyof typeof savedProduct] as string
          if (!dependencyValue || dependencyValue.trim() === "") {
            return false
          }
          // For retention_options, check if selected retention has options
          if (config.key === "retention_option" && productDetails.retention_options) {
            const selectedRetentionId = arch === "maxillary"
              ? savedProduct.maxillaryRetentionId
              : savedProduct.mandibularRetentionId
            const hasOptions = productDetails.retention_options.some((opt: any) =>
              opt.retention_id === selectedRetentionId
            )
            return hasOptions
          }
        }
      }

      return true
    })
    .sort((a, b) => a.sequence - b.sequence)

  // Group fields by rowGroup
  const fieldsByRow = visibleFields.reduce((acc, field) => {
    const row = field.rowGroup || 0
    if (!acc[row]) acc[row] = []
    acc[row].push(field)
    return acc
  }, {} as Record<number, FieldConfig[]>)

  const getFieldValue = (config: FieldConfig): string => {
    const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
    if (!stateKey) return ""
    const value = savedProduct[stateKey as keyof typeof savedProduct] as string
    return value || ""
  }

  const getFieldId = (config: FieldConfig): number | undefined => {
    const idKey = arch === "maxillary" ? config.maxillaryIdKey : config.mandibularIdKey
    if (!idKey) return undefined
    return savedProduct[idKey as keyof typeof savedProduct] as number | undefined
  }

  const getFieldOptions = (config: FieldConfig): any[] => {
    const apiData = productDetails[config.apiProperty]
    if (!apiData || !Array.isArray(apiData)) return []

    // For retention_options, filter by selected retention
    if (config.key === "retention_option" && productDetails.retention_options) {
      const selectedRetentionId = arch === "maxillary"
        ? savedProduct.maxillaryRetentionId
        : savedProduct.mandibularRetentionId
      return apiData.filter((opt: any) => opt.retention_id === selectedRetentionId)
    }

    return apiData
  }

  // Helper function to calculate responsive width for Stage and Impression fields
  // In 2-column layout, fields will fill their container (50% width)
  const getResponsiveFieldWidth = (config: FieldConfig, displayValue: string, options?: any[]): {
    minWidth?: string
    maxWidth?: string
    width?: string
    flex?: string
  } => {
    // For 2-column layout, fields should fill their container
    // No need for custom width calculations as parent handles sizing
    return {
      width: '100%'
    }
  }

  // Helper to check if a field is required
  const isFieldRequired = (config: FieldConfig): boolean => {
    // All standard fields are required (material, retention, stump_shade, tooth_shade, stage, impression)
    const requiredFields = ["material", "retention", "stump_shade", "tooth_shade", "stage", "impression"]
    return requiredFields.includes(config.key)
  }

  // Helper to check if field should show red border (value is "Not specified" or "Select impression" and field is required)
  const shouldShowRedBorder = (config: FieldConfig, value: string | undefined): boolean => {
    if (!isFieldRequired(config)) return false
    if (!value) return true
    const trimmed = String(value).trim().toLowerCase()
    return trimmed === "" || trimmed === "not specified" || trimmed === "select impression"
  }

  // Helper to check if all required fields have valid values (for green border)
  const areAllRequiredFieldsFilledForGreenBorder = (): boolean => {
    const materialValue = getFieldValueByKey("material")
    const retentionValue = getFieldValueByKey("retention")
    const stumpShadeValue = getFieldValueByKey("stump_shade")
    const toothShadeValue = getFieldValueByKey("tooth_shade")
    const stageValue = getFieldValueByKey("stage")
    
    // Check impression count if getImpressionCount is available
    const impressionCount = getImpressionCount ? getImpressionCount() : 0
    const hasImpression = impressionCount > 0

    // Check all required fields
    const hasMaterial = hasValue(materialValue)
    const hasRetention = hasValue(retentionValue)
    const hasStumpShade = hasValue(stumpShadeValue)
    const hasToothShade = hasValue(toothShadeValue)
    const hasStage = hasValue(stageValue)

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage && hasImpression
  }

  // Helper to determine border color for a field
  const getFieldBorderColor = (config: FieldConfig, value: string | undefined, impressionCount?: number): string => {
    const showRedBorder = shouldShowRedBorder(config, value)
    
    // If all required fields are filled, show green border
    if (areAllRequiredFieldsFilledForGreenBorder() && hasValue(value)) {
      // For impression field, check impressionCount instead of value
      if (config.key === "impression") {
        if (impressionCount !== undefined && impressionCount > 0) {
          return '#119933' // green
        }
      } else if (hasValue(value)) {
        return '#119933' // green
      }
    }
    
    // Show red border if invalid
    if (showRedBorder) {
      return '#ef4444' // red
    }
    
    // Default gray border
    return '#7F7F7F' // gray
  }

  // Helper to determine label color for a field
  const getFieldLabelColor = (config: FieldConfig, value: string | undefined, impressionCount?: number): string => {
    const showRedBorder = shouldShowRedBorder(config, value)
    
    // If all required fields are filled, show green label
    if (areAllRequiredFieldsFilledForGreenBorder() && hasValue(value)) {
      // For impression field, check impressionCount instead of value
      if (config.key === "impression") {
        if (impressionCount !== undefined && impressionCount > 0) {
          return '#119933' // green
        }
      } else if (hasValue(value)) {
        return '#119933' // green
      }
    }
    
    // Show red label if invalid
    if (showRedBorder) {
      return '#ef4444' // red
    }
    
    // Default gray label
    return '#7F7F7F' // gray
  }

  const renderField = (config: FieldConfig) => {
    const value = getFieldValue(config)
    const currentId = getFieldId(config)
    const options = getFieldOptions(config)

    if (config.fieldType === "modal" && config.key === "impression") {
      const impressionCount = getImpressionCount ? getImpressionCount() : 0
      const displayText = getImpressionDisplayText 
        ? getImpressionDisplayText()
        : (impressionCount > 0
          ? `${impressionCount} impression${impressionCount > 1 ? "s" : ""} selected`
          : "Select impression")
      
      // Get border color based on validation state
      const borderColor = getFieldBorderColor(config, displayText, impressionCount)
      const labelColor = getFieldLabelColor(config, displayText, impressionCount)

      const fieldWidth = getResponsiveFieldWidth(config, displayText)

      return (
        <div 
          className="relative" 
          style={{ 
            minHeight: '43px',
            ...fieldWidth
          }}
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={onOpenImpressionModal}
            style={{
              padding: '12px 15px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              position: 'relative',
              marginTop: '5.27px',
              background: '#FFFFFF',
              border: `0.740384px solid ${borderColor}`,
              borderRadius: '7.7px',
              boxSizing: 'border-box'
            }}
          >
            <span style={{
              fontFamily: 'Verdana',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '14.4px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#000000',
              whiteSpace: 'nowrap'
            }}>{displayText}</span>
          </div>
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
              color: labelColor
            }}
          >
            {config.label}
            {isFieldRequired(config) && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    if (config.fieldType === "select") {
      // Determine the selected value - prefer ID, then value, then find by name
      let selectedValue = currentId?.toString() || ""
      if (!selectedValue && value) {
        // Try to find option by name
        const optionByName = options.find((opt: any) => opt.name === value)
        if (optionByName) {
          selectedValue = optionByName.id?.toString() || optionByName.name
        } else {
          selectedValue = value
        }
      }

      const displayValue = value || "Not specified"
      const borderColor = getFieldBorderColor(config, value)
      const labelColor = getFieldLabelColor(config, value)
      const fieldWidth = getResponsiveFieldWidth(config, displayValue, options)

      return (
        <div 
          className="relative" 
          style={{ 
            minHeight: '43px',
            ...fieldWidth
          }}
        >
          <Select
            value={selectedValue || ""}
            onValueChange={(selectedValue) => {
              const selectedOption = options.find((opt: any) =>
                opt.id?.toString() === selectedValue || opt.name === selectedValue
              )
              if (selectedOption) {
                onFieldChange(config.key, selectedOption.name, selectedOption.id)
              } else {
                onFieldChange(config.key, selectedValue)
              }
            }}
          >
            <SelectTrigger
              style={{
                padding: '12px 15px 5px 15px',
                gap: '5px',
                width: '100%',
                height: '37px',
                position: 'relative',
                marginTop: '5.27px',
                background: '#FFFFFF',
                border: `0.740384px solid ${borderColor}`,
                borderRadius: '7.7px',
                boxSizing: 'border-box'
              }}
            >
              <SelectValue placeholder="Not specified">
                {value || "Not specified"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => (
                <SelectItem
                  key={option.id || option.name}
                  value={option.id?.toString() || option.name}
                >
                  {option.name}
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
              color: labelColor
            }}
          >
            {config.key === "retention" 
              ? (hasValidRetentionValue(value) ? 'Retention type' : 'Select Retention type')
              : config.label}
            {isFieldRequired(config) && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    if (config.fieldType === "shade") {
      const shadeValue = value || "Not specified"
      const borderColor = getFieldBorderColor(config, value)
      const labelColor = getFieldLabelColor(config, value)
      const shadeBrand = arch === "maxillary"
        ? savedProduct.maxillaryShadeBrand
        : savedProduct.mandibularShadeBrand
      const brandName = shadeBrand ? "Vita 3D Master" : ""
      
      // Extract shade name from value - handle formats like "Brand - Shade" or just "Shade"
      let shadeName = 'A1' // default
      if (value && value !== "Not specified") {
        // If value contains " - ", extract the part after the dash
        if (value.includes(' - ')) {
          const parts = value.split(' - ')
          shadeName = parts[parts.length - 1].trim()
        } else {
          shadeName = value.trim()
        }
      }
      
      // Get gradient colors for the selected shade
      const gradientColors = getShadeGradientColors(shadeName)
      
      // Create unique gradient ID for this field based on value to ensure proper updates
      // Replace dots and other special chars with dashes for valid CSS IDs
      const safeShadeName = shadeName.replace(/[^a-zA-Z0-9]/g, '-')
      const gradientId = `shade-gradient-${config.key}-${arch}-${safeShadeName}`
      const filterId = `filter-${gradientId}`
      const clipId = `clip-shade-${config.key}-${arch}`

      return (
        <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onOpenShadeModal) {
                onOpenShadeModal(config.key, arch)
              } else {
                console.warn("onOpenShadeModal not provided")
              }
            }}
            style={{
              padding: '12px 15px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              background: '#FFFFFF',
              border: `0.740384px solid ${borderColor}`,
              borderRadius: '7.7px',
              boxSizing: 'border-box',
              position: 'relative',
              marginTop: '5.27px'
            }}
          >
            <span style={{
              fontFamily: 'Verdana',
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '14.4px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#000000'
            }}>{brandName || shadeValue}</span>
            {value && value !== "Not specified" && (
              <div
                className="flex items-center justify-center pointer-events-none"
                style={{
                  width: '37.51px',
                  height: '41.97px',
                  borderRadius: '8px',
                  position: 'absolute',
                  right: '0px',
                  top: '-1px'
                }}
              >
                <svg 
                  key={`shade-svg-${shadeName}-${config.key}`}
                  width="38" 
                  height="37" 
                  viewBox="0 0 38 37" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg" 
                  style={{ width: '100%', height: '100%' }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="18.7451" y1="34.9299" x2="18.7451" y2="1.31738" gradientUnits="userSpaceOnUse">
                      {gradientColors && gradientColors.length > 0 ? (
                        gradientColors.map((stop, index) => (
                          <stop key={`${gradientId}-stop-${index}`} offset={stop.offset} stopColor={stop.color} />
                        ))
                      ) : (
                        // Fallback gradient if no colors found
                        <>
                          <stop offset="0" stopColor="#DED2C7" />
                          <stop offset="0.07" stopColor="#E3D4C4" />
                          <stop offset="0.25" stopColor="#EDD9C1" />
                          <stop offset="0.5" stopColor="#F0DBC0" />
                          <stop offset="0.76" stopColor="#F0DCC2" />
                          <stop offset="0.9" stopColor="#F1E0CA" />
                          <stop offset="1" stopColor="#F3E7D7" />
                        </>
                      )}
                    </linearGradient>
                    <filter id={filterId} x="2.8371" y="0.424306" width="35.4067" height="176.788" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                      <feOffset dx="1.78615" dy="6.25154"/>
                      <feGaussianBlur stdDeviation="3.57231"/>
                      <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0"/>
                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                    </filter>
                  </defs>
                  <g clipPath={`url(#${clipId})`}>
                    <g filter={`url(#${filterId})`}>
                      <path d="M28.818 61.9683V163.816H8.68481V61.9683C8.68481 57.1043 11.9055 53.0329 16.2557 51.883V34.8203L21.2471 34.9136V51.8985C25.5973 53.0485 28.818 57.1199 28.818 61.9838V61.9683Z" fill="#8F8C88"/>
                      <path d="M21.2499 32.708V34.8991L16.2585 34.8214V32.708H21.2499Z" fill="#8F8C88"/>
                      <path d="M29.3078 27.8438C29.4452 31.7442 26.8198 34.9921 23.5533 34.9454L21.2484 34.9144L16.2571 34.8211L13.3264 34.7745C10.3194 34.7279 7.96878 31.651 8.213 28.0613L9.28148 12.1641C9.69361 6.04147 13.9675 1.31738 19.0962 1.31738C21.6911 1.31738 24.057 2.54502 25.7971 4.54965C27.5372 6.55428 28.6515 9.3359 28.7583 12.4439L29.2925 27.8438H29.3078Z" fill={`url(#${gradientId})`}/>
                      <path style={{ mixBlendMode: 'screen' }} opacity="0.42" d="M24.8115 29.7413C24.3078 30.2697 24.0789 31.0622 24.2315 31.7926C24.4757 31.9324 24.7963 31.9169 25.0558 31.7926C25.3152 31.6683 25.5442 31.4818 25.7426 31.2953C26.1395 30.9224 28.6733 28.3428 27.5896 27.8144C27.208 27.6279 26.5669 28.234 26.3227 28.4671C25.8342 28.9022 25.2694 29.2751 24.8115 29.7413Z" fill={`url(#${gradientId})`}/>
                      <path style={{ mixBlendMode: 'screen' }} opacity="0.42" d="M26.6397 25.2954C27.1587 25.1089 27.3114 24.4407 27.3724 23.8812C27.5098 22.7935 27.8761 21.1929 27.4487 20.1362C27.2045 19.5301 26.7924 19.2038 26.5329 19.8254C26.3039 20.3537 26.655 21.4415 26.6855 22.0009C26.7161 22.3894 26.8382 25.2021 26.6245 25.2798L26.6397 25.2954Z" fill={`url(#${gradientId})`}/>
                      <path style={{ mixBlendMode: 'screen' }} opacity="0.42" d="M23.2475 5.84099C23.4307 6.12071 23.6291 6.46258 23.9649 6.49366C24.2396 6.52474 24.4991 6.30718 24.5907 6.04301C24.6823 5.77883 24.6518 5.48358 24.5907 5.2194C24.3923 4.55119 23.9038 3.97622 23.2933 3.66542C22.7743 3.41679 21.7364 3.16815 21.8737 4.05392C21.9653 4.65997 22.9422 5.2971 23.2628 5.82545L23.2475 5.84099Z" fill={`url(#${gradientId})`}/>
                    </g>
                    <text 
                      x="18.75" 
                      y="19.5" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      style={{
                        fontFamily: 'Verdana',
                        fontSize: '12.8603px',
                        fontWeight: 400,
                        fill: '#000000',
                        pointerEvents: 'none'
                      }}
                    >
                      {shadeName}
                    </text>
                  </g>
                  <clipPath id={clipId}>
                    <rect width="37.5092" height="41.9746" fill="white" transform="translate(0 -1)"/>
                  </clipPath>
                </svg>
              </div>
            )}
          </div>
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
              color: labelColor
            }}
          >
            {config.label}
            {isFieldRequired(config) && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className="flex flex-wrap"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: '0px',
        gap: '5px',
        width: '100%'
      }}
    >
      {visibleFields.map(field => (
        <div
          key={field.key}
          style={{
            flex: '1 1 calc(50% - 10px)',
            minWidth: '200px',
            maxWidth: 'calc(50% - 10px)'
          }}
        >
          {renderField(field)}
        </div>
      ))}
    </div>
  )
}

