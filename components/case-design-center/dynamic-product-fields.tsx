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
  onOpenShadeModal?: (fieldKey: string) => void
}

export function DynamicProductFields({
  productDetails,
  savedProduct,
  arch,
  fieldConfigs,
  onFieldChange,
  onOpenImpressionModal,
  getImpressionCount,
  onOpenShadeModal,
}: DynamicProductFieldsProps) {
  // Filter and sort fields that should be displayed
  const visibleFields = fieldConfigs
    .filter(config => {
      if (!productDetails) return false
      const apiData = productDetails[config.apiProperty]
      if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
        return false
      }

      // Check dependencies
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

  const renderField = (config: FieldConfig) => {
    const value = getFieldValue(config)
    const currentId = getFieldId(config)
    const options = getFieldOptions(config)

    if (config.fieldType === "modal" && config.key === "impression") {
      const impressionCount = getImpressionCount ? getImpressionCount() : 0
      const displayText = impressionCount > 0
        ? `${impressionCount} impression${impressionCount > 1 ? "s" : ""} selected`
        : "Not specified"

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
              padding: '12px 39px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              position: 'relative',
              marginTop: '5.27px',
              background: '#FFFFFF',
              border: '0.740384px solid #7F7F7F',
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
              color: '#7F7F7F'
            }}
          >
            {config.label}
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
                padding: '12px 39px 5px 15px',
                gap: '5px',
                width: '100%',
                height: '37px',
                position: 'relative',
                marginTop: '5.27px',
                background: '#FFFFFF',
                border: '0.740384px solid #7F7F7F',
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
              color: '#7F7F7F'
            }}
          >
            {config.label}
          </label>
        </div>
      )
    }

    if (config.fieldType === "shade") {
      const shadeValue = value || "Not specified"
      const shadeBrand = arch === "maxillary"
        ? savedProduct.maxillaryShadeBrand
        : savedProduct.mandibularShadeBrand
      const brandName = shadeBrand ? "Vita 3D Master" : ""

      return (
        <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onOpenShadeModal) {
                onOpenShadeModal(config.key)
              } else {
                console.warn("onOpenShadeModal not provided")
              }
            }}
            style={{
              padding: '12px 39px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              background: '#FFFFFF',
              border: '0.740384px solid #7F7F7F',
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
                  background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                  borderRadius: '8px',
                  position: 'absolute',
                  right: '0px',
                  top: '-1px'
                }}
              >
                <span style={{
                  fontFamily: 'Verdana',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '12.8603px',
                  lineHeight: '18px',
                  letterSpacing: '-0.02em',
                  color: '#000000'
                }}>{value}</span>
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
              color: '#7F7F7F'
            }}
          >
            {config.label}
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
        gap: '20px',
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

