import React, { memo, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTeethShadeDisplayName, getTeethShadeDisplayText } from "@/utils/teeth-shade-utils"
import { Label } from "@/components/ui/label"

interface ProductConfigurationFormProps {
  product: any
  arch: 'maxillary' | 'mandibular'
  isCaseSubmitted: boolean
  currentVisibility: any
  selectOpen: any
  setSelectOpen: (value: any) => void
  handleLocalProductDetailChange: (productId: string, arch: string, field: string, value: any) => void
  teethShadeOptions: any[]
  gumShadeOptions: any[]
  impressionOptions: any[]
  impressionQuantities: any
  setImpressionQuantities: (value: any) => void
  errors: any
  getGradeOptions: (product: any) => Array<{ value: string; label: string }>
  getStageOptions: (product: any) => Array<{ value: string; label: string }>
  handleStageDropdownOpen: (productId: string) => void
  calculateDeliveryDate: (productId: number, stageId: number) => Promise<any>
  handleUpdateDatesFromApi?: (pickupDate: string, deliveryDate: string, deliveryTime: string) => void
}

const ProductConfigurationForm = memo(({
  product,
  arch,
  isCaseSubmitted,
  currentVisibility,
  selectOpen,
  setSelectOpen,
  handleLocalProductDetailChange,
  teethShadeOptions,
  gumShadeOptions,
  impressionOptions,
  impressionQuantities,
  setImpressionQuantities,
  errors,
  getGradeOptions,
  getStageOptions,
  handleStageDropdownOpen,
  calculateDeliveryDate,
  handleUpdateDatesFromApi
}: ProductConfigurationFormProps) => {

  const config = product[`${arch}Config`]
  const isBothArches = product.type.includes("Maxillary") && product.type.includes("Mandibular")

  // Memoize options to prevent unnecessary re-renders
  const gradeOptions = useMemo(() => getGradeOptions(product), [product, getGradeOptions])
  const stageOptions = useMemo(() => getStageOptions(product), [product, getStageOptions])

  const handleStageChange = async (value: string) => {
    handleLocalProductDetailChange(product.id, arch, "stage", value)
    handleStageDropdownOpen(product.id)
    
    const prodId = Number(product.id.split('-')[0]) || Number(product.id)
    const stageObj = product.stages?.find((s: any) => s.name === value)
    
    if (prodId && stageObj?.id) {
      try {
        const deliveryData = await calculateDeliveryDate(prodId, stageObj.id)
        handleUpdateDatesFromApi?.(
          deliveryData?.pickup_date || "", 
          deliveryData?.delivery_date || "", 
          deliveryData?.delivery_time || ""
        )
      } catch (error) {
        console.error('Failed to calculate delivery date:', error)
      }
    }
  }

  const handleImpressionQuantityChange = (impressionName: string, quantity: number) => {
    const key = `${product.id}_${arch}_${impressionName}`
    if (quantity <= 0) {
      setImpressionQuantities((prev: any) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
    } else {
      setImpressionQuantities((prev: any) => ({
        ...prev,
        [key]: quantity
      }))
    }
  }

  const getImpressionDisplayText = () => {
    return Object.entries(impressionQuantities)
      .filter(([key, qty]) => key.startsWith(`${product.id}_${arch}_`) && qty > 0)
      .map(([key, qty]) => {
        const name = key.replace(`${product.id}_${arch}_`, "")
        return `${qty}x ${name}`
      })
      .join(", ") || "Select Impression(s)"
  }

  if (!isBothArches && arch === 'mandibular') {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Restoration */}
      {currentVisibility[arch]?.restoration && (
        <div>
          {isCaseSubmitted ? (
            <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
              {config.restoration}
            </div>
          ) : (
            <Select value={config.restoration} disabled>
              <SelectTrigger className="h-9 mt-1 w-full" disabled>
                <SelectValue placeholder="Select Restoration" />
              </SelectTrigger>
              <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                <SelectItem value={config.restoration}>
                  {config.restoration}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          {errors[`${arch}.restoration`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.restoration`]}</span>
          )}
        </div>
      )}

      {/* Product Name */}
      {currentVisibility[arch]?.productName && (
        <div>
          {isCaseSubmitted ? (
            <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
              {config.productName}
            </div>
          ) : (
            <Select value={config.productName} disabled>
              <SelectTrigger className="h-9 mt-1 w-full" disabled>
                <SelectValue placeholder="Select Product Name" />
              </SelectTrigger>
              <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                <SelectItem value={config.productName}>
                  {config.productName}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          {errors[`${arch}.productName`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.productName`]}</span>
          )}
        </div>
      )}

      {/* Grade */}
      {currentVisibility[arch]?.grade && (
        <div>
          {isCaseSubmitted ? (
            <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
              {config.grade}
            </div>
          ) : (
            <Select
              open={selectOpen[product.id]?.[arch] === "grade"}
              onOpenChange={(open) =>
                setSelectOpen((prev: any) => ({ 
                  ...prev, 
                  [product.id]: { 
                    ...prev[product.id], 
                    [arch]: open ? "grade" : undefined 
                  } 
                }))
              }
              value={config.grade || "placeholder"}
              onValueChange={(value) => {
                handleLocalProductDetailChange(product.id, arch, "grade", value)
              }}
            >
              <SelectTrigger className="h-9 mt-1 w-full">
                <SelectValue placeholder="Select Grade" />
              </SelectTrigger>
              <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                <SelectItem value="placeholder">Select Grade</SelectItem>
                {gradeOptions.map((opt, idx) => (
                  <SelectItem key={idx} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors[`${arch}.grade`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.grade`]}</span>
          )}
        </div>
      )}

      {/* Stage */}
      {currentVisibility[arch]?.stage && (
        <div>
          {isCaseSubmitted ? (
            <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
              {config.stage}
            </div>
          ) : (
            <Select
              open={selectOpen[product.id]?.[arch] === "stage"}
              onOpenChange={(open) =>
                setSelectOpen((prev: any) => ({ 
                  ...prev, 
                  [product.id]: { 
                    ...prev[product.id], 
                    [arch]: open ? "stage" : undefined 
                  } 
                }))
              }
              value={config.stage || "placeholder"}
              onValueChange={handleStageChange}
            >
              <SelectTrigger className="h-9 mt-1 w-full">
                <SelectValue placeholder="Select Stage" />
              </SelectTrigger>
              <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                <SelectItem value="placeholder">Select Stage</SelectItem>
                {stageOptions.map((opt, idx) => (
                  <SelectItem key={idx} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors[`${arch}.stage`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.stage`]}</span>
          )}
        </div>
      )}

      {/* Teeth Shade */}
      {currentVisibility[arch]?.teethShadePart1 && (
        <div>
          {isCaseSubmitted ? (
            <div className="h-9 flex items-center text-sm text-gray-800 pl-3 mt-1">
              {getTeethShadeDisplayText(
                config.teethShadePart1,
                config.teethShadePart2,
                config.teethShadeBrandId,
                config.teethShadeId,
                config.teethShadeBrandName,
                config.teethShadeName,
                product.productTeethShades
              )}
            </div>
          ) : (
            <div className="mt-1">
              <div className="h-9 flex items-center text-sm text-gray-800 pl-3 border border-gray-300 rounded-md bg-gray-50">
                {getTeethShadeDisplayText(
                  config.teethShadePart1,
                  config.teethShadePart2,
                  config.teethShadeBrandId,
                  config.teethShadeId,
                  config.teethShadeBrandName,
                  config.teethShadeName,
                  product.productTeethShades
                )}
              </div>
            </div>
          )}
          {errors[`${arch}.teethShadePart1`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.teethShadePart1`]}</span>
          )}
          {errors[`${arch}.teethShadePart2`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.teethShadePart2`]}</span>
          )}
        </div>
      )}

      {/* Gum Shade */}
      {(() => {
          productId: product.id,
          arch,
          currentVisibility: currentVisibility[arch],
          gumShadePart1Visible: currentVisibility[arch]?.gumShadePart1,
          config: config
        });
        return currentVisibility[arch]?.gumShadePart1;
      })() && (
        <div>
          {isCaseSubmitted ? (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="h-9 flex items-center text-sm text-gray-800 pl-3">
                {config.gumShadePart1}
              </div>
              <div className="h-9 flex items-center text-sm text-gray-800 pl-3">
                {config.gumShadePart2}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Select
                open={selectOpen[product.id]?.[arch] === "gumShadePart1"}
                onOpenChange={(open) =>
                  setSelectOpen((prev: any) => ({ 
                    ...prev, 
                    [product.id]: { 
                      ...prev[product.id], 
                      [arch]: open ? "gumShadePart1" : undefined 
                    } 
                  }))
                }
                value={config.gumShadeBrandId?.toString() || "placeholder"}
                onValueChange={(id) => {
                    productId: product.id,
                    arch,
                    selectedId: id,
                    gumShadeOptions: gumShadeOptions
                  });
                  
                  const gumShadeBrand = gumShadeOptions.find((brand) => brand.id?.toString() === id)
                  
                  handleLocalProductDetailChange(product.id, arch, "gumShadePart1", gumShadeBrand?.name)
                    productId: product.id,
                    arch,
                    field: "gumShadePart1",
                    value: gumShadeBrand?.name
                  });
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select Gum Shade Brand" />
                </SelectTrigger>
                <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                  <SelectItem value="placeholder">Select Gum Shade</SelectItem>
                  {gumShadeOptions.map((brand, idx) => (
                    <SelectItem key={brand.id || idx} value={brand.id?.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                open={selectOpen[product.id]?.[arch] === "gumShadePart2"}
                onOpenChange={(open) =>
                  setSelectOpen((prev: any) => ({ 
                    ...prev, 
                    [product.id]: { 
                      ...prev[product.id], 
                      [arch]: open ? "gumShadePart2" : undefined 
                    } 
                  }))
                }
                value={(() => {
                  const gumShadeBrand = gumShadeOptions.find(
                    (brand) => brand.name === config.gumShadePart1
                  )
                  const shade = gumShadeBrand?.shades?.find(
                    (s: any) => s.name === config.gumShadePart2
                  )
                  return shade?.id?.toString() || "placeholder"
                })()}
                onValueChange={(id) => {
                    productId: product.id,
                    arch,
                    selectedId: id,
                    configGumShadePart1: config.gumShadePart1,
                    gumShadeOptions: gumShadeOptions
                  });
                  
                  const gumShadeBrand = gumShadeOptions.find((brand) => brand.name === config.gumShadePart1)
                  const shade = gumShadeBrand?.shades?.find((s: any) => s.id?.toString() === id)
                  
                    gumShadeBrand,
                    shade
                  });
                  
                  handleLocalProductDetailChange(product.id, arch, "gumShadePart2", shade?.name)
                    productId: product.id,
                    arch,
                    field: "gumShadePart2",
                    value: shade?.name
                  });
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select Gum Shade" />
                </SelectTrigger>
                <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                  <SelectItem value="placeholder">Select Gum Shade</SelectItem>
                  {gumShadeOptions
                    .find((brand) => brand.name === config.gumShadePart1)
                    ?.shades?.map((shade: any, idx: number) => (
                      <SelectItem key={shade.id || idx} value={shade.id?.toString()}>
                        {shade.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Impression */}
      {currentVisibility[arch]?.impression && (
        <div>
          {isCaseSubmitted ? (
            <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
              {getImpressionDisplayText()}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                className="w-full h-9 px-2 py-1 border rounded bg-white text-left"
                onClick={() =>
                  setSelectOpen((prev: any) => ({
                    ...prev,
                    [product.id]: {
                      ...prev[product.id],
                      [arch]: prev[product.id]?.[arch] === "impression" ? undefined : "impression",
                    },
                  }))
                }
              >
                {getImpressionDisplayText()}
              </button>
              {selectOpen[product.id]?.[arch] === "impression" && (
                <div className="absolute z-[50] bg-white border shadow-lg w-full rounded p-2 mt-1">
                  <ul>
                    {impressionOptions.map((imp, idx) => {
                      const key = `${product.id}_${arch}_${imp.name}`
                      const qty = impressionQuantities[key] || 0
                      return (
                        <li key={imp.name} className="flex items-center justify-between py-1 gap-2">
                          <span className="flex-1">{imp.name}</span>
                          {qty > 0 ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="px-2 py-0.5 border rounded bg-gray-100"
                                onClick={() => handleImpressionQuantityChange(imp.name, qty - 1)}
                                disabled={qty <= 1}
                              >
                                -
                              </button>
                              <span className="px-2">{qty}</span>
                              <button
                                type="button"
                                className="px-2 py-0.5 border rounded bg-gray-100"
                                onClick={() => handleImpressionQuantityChange(imp.name, qty + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="px-2 py-0.5 border rounded bg-blue-100 text-blue-800"
                              onClick={() => handleImpressionQuantityChange(imp.name, 1)}
                            >
                              + QTY
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
          {errors[`${arch}.impression`] && (
            <span className="text-red-500 text-xs">{errors[`${arch}.impression`]}</span>
          )}
        </div>
      )}
    </div>
  )
})

ProductConfigurationForm.displayName = 'ProductConfigurationForm'

export default ProductConfigurationForm 