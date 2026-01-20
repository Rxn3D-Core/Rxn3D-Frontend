import React, { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  teethNumbers: number[]
  arch: "maxillary" | "mandibular"
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
  teethNumbers,
  arch
}) => {
  const [inclusions, setInclusions] = useState<string>("")
  const [abutmentDetail, setAbutmentDetail] = useState<string>("")
  const [abutmentType, setAbutmentType] = useState<string>("")
  
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
            gap: '10px',
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
              gap: '15px',
              width: '100%',
              minHeight: '42.27px',
              flex: 'none',
              order: 0,
              flexGrow: 0
            }}
          >
            {/* Implant Brand */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]" style={{ minHeight: '43px', flex: '1 1 auto', order: 0 }}>
              <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                <Input
                  type="text"
                  value={selectedBrand?.brand_name || ""}
                  readOnly
                  className="w-full"
                  style={{
                    padding: '12px 15px 5px 15px',
                    gap: '5px',
                    width: '100%',
                    height: '37px',
                    position: 'relative',
                    marginTop: '5.27px',
                    background: '#FFFFFF',
                    border: '0.740384px solid #7F7F7F',
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
                    color: '#7F7F7F'
                  }}
                >
                  Implant Brand
                </label>
              </div>
            </div>
            
            {/* Implant Platform */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]" style={{ minHeight: '43px', flex: '1 1 auto', order: 1 }}>
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
                    marginTop: '5.27px',
                    background: '#FFFFFF',
                    border: '0.740384px solid #7F7F7F',
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
                    color: '#7F7F7F'
                  }}
                >
                  Implant Platform
                </label>
              </div>
            </div>
            
            {/* Implant Size */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]" style={{ minHeight: '43px', flex: '1 1 auto', order: 2 }}>
              <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                <Select
                  value={selectedSize || ""}
                  onValueChange={(value) => {
                    onSizeChange(value)
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
                      marginTop: '5.27px',
                      background: '#FFFFFF',
                      border: '0.740384px solid #7F7F7F',
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
                    color: '#7F7F7F'
                  }}
                >
                  Implant Size
                </label>
              </div>
            </div>
          </div>
          
          {/* Row 2: Implant inclusions */}
          <div className="relative w-full" style={{ minHeight: '43px', flex: 'none', order: 1, flexGrow: 0 }}>
            <Select
              value={inclusions}
              onValueChange={(value) => {
                setInclusions(value)
                onInclusionsChange(value)
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
                  marginTop: '5.27px',
                  background: '#FFFFFF',
                  border: '0.740384px solid #7F7F7F',
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
                color: '#7F7F7F'
              }}
            >
              Implant inclusions
            </label>
          </div>
          
          {/* Row 3: Abutment details */}
          <div
            className="w-full flex flex-col sm:flex-row flex-wrap"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0px',
              gap: '15px',
              width: '100%',
              minHeight: '42.27px',
              flex: 'none',
              order: 2,
              flexGrow: 0
            }}
          >
            {/* Abutment Detail */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]" style={{ minHeight: '43px', flex: '1 1 auto', order: 0 }}>
              <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                <Select
                  value={abutmentDetail}
                  onValueChange={(value) => {
                    setAbutmentDetail(value)
                    onAbutmentDetailChange(value)
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
                      marginTop: '5.27px',
                      background: '#FFFFFF',
                      border: '0.740384px solid #7F7F7F',
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
                    color: '#7F7F7F'
                  }}
                >
                  Abutment Detail
                </label>
              </div>
            </div>
            
            {/* Abutment type */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]" style={{ minHeight: '43px', flex: '1 1 auto', order: 1 }}>
              <div className="relative" style={{ minHeight: '43px', width: '100%' }}>
                <Select
                  value={abutmentType}
                  onValueChange={(value) => {
                    setAbutmentType(value)
                    onAbutmentTypeChange(value)
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
                      marginTop: '5.27px',
                      background: '#FFFFFF',
                      border: '0.740384px solid #7F7F7F',
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
                    color: '#7F7F7F'
                  }}
                >
                  Abutment type
                </label>
              </div>
            </div>
          </div>
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
