import type { SavedProduct, Lab } from "@/app/case-design-center/sections/types"

/**
 * Helper function to get field order based on category
 */
export const getFieldOrder = (category: string): string[] => {
  // Handle undefined or null category
  if (!category) {
    return ["product_material", "retention", "stage"]
  }
  
  const categoryLower = category.toLowerCase()
  const isFixedRestoration = categoryLower.includes("fixed")
  const isRemovableOrOrtho = categoryLower.includes("removable") || 
                              categoryLower.includes("orthodontic") || 
                              categoryLower.includes("ortho")
  
  if (isFixedRestoration) {
    return [
      "product_material",
      "retention",
      "implant",
      "stump_shade",
      "crown_third_shade",
      "tooth_shade",
      "stage",
      "pontic_design",
      "embrasures",
      "occlusal_contact",
      "interproximal_contact",
      "gap",
      "impressions",
      "add_ons"
    ]
  } else if (isRemovableOrOrtho) {
    return [
      "product_material",
      "implant",
      "grade",
      "stage",
      "teeth_shade",
      "gum_shade",
      "impression",
      "advance_fields"
    ]
  }
  // Default order (fallback)
  return ["product_material", "retention", "stage"]
}

/**
 * Helper function to get the correct customer_id based on role
 * For office_admin, use selectedLab.id; for others, use the user's customerId
 */
export const getCustomerIdForApi = (selectedLab: Lab | null): number | undefined => {
  if (typeof window === "undefined") return undefined
  const role = localStorage.getItem("role")
  if (role === "office_admin") {
    // For office_admin, use the selected lab's ID as customer_id
    // Check state first, then localStorage as fallback
    const lab = selectedLab || (() => {
      const storedLab = localStorage.getItem("selectedLab")
      if (storedLab) {
        try {
          return JSON.parse(storedLab)
        } catch {
          return null
        }
      }
      return null
    })()
    if (lab) {
      return lab.id || lab.customer_id || undefined
    }
  }
  // For other roles, use the user's customerId
  const customerId = localStorage.getItem("customerId")
  return customerId ? Number(customerId) : undefined
}

/**
 * Helper to check if any tooth in the saved product has a retention type selected from popover
 */
export const hasRetentionTypeSelected = (
  savedProduct: SavedProduct,
  arch: "maxillary" | "mandibular",
  retentionTypes: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>
): boolean => {
  const teeth = arch === "maxillary" ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth
  
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

/**
 * Helper to check if retention value is valid (not empty, not placeholder)
 */
export const hasValidRetentionValue = (retentionValue: string | undefined | null): boolean => {
  if (!retentionValue) return false
  const trimmed = String(retentionValue).trim()
  return trimmed !== '' && 
         trimmed !== 'Not specified' && 
         trimmed !== 'Select' && 
         trimmed !== 'Retention type'
}

/**
 * Helper function to get advance field by name
 */
export const getAdvanceFieldByName = (fieldName: string, advanceFields: any[]): any | null => {
  if (!advanceFields || !Array.isArray(advanceFields)) return null
  
  const nameLower = fieldName.toLowerCase()
  return advanceFields.find(field => {
    const fieldNameLower = (field.name || "").toLowerCase()
    if (nameLower === "stump_shade") {
      return fieldNameLower.includes("stump") && fieldNameLower.includes("shade")
    } else if (nameLower === "crown_third_shade") {
      return fieldNameLower.includes("crown") && (fieldNameLower.includes("third") || fieldNameLower.includes("3rd")) && fieldNameLower.includes("shade")
    } else if (nameLower === "pontic_design") {
      return fieldNameLower.includes("pontic") && fieldNameLower.includes("design")
    } else if (nameLower === "embrasures") {
      return fieldNameLower.includes("embrasure")
    } else if (nameLower === "occlusal_contact") {
      return fieldNameLower.includes("occlusal") && fieldNameLower.includes("contact")
    } else if (nameLower === "interproximal_contact") {
      return (fieldNameLower.includes("interproximal") || fieldNameLower.includes("proximal")) && fieldNameLower.includes("contact")
    } else if (nameLower === "gap") {
      return fieldNameLower.includes("gap")
    }
    return false
  }) || null
}

/**
 * Helper function to check if a field is configured for the product
 */
export const isFieldConfigured = (
  fieldName: string,
  productDetails: any,
  savedProduct: SavedProduct,
  archType: "maxillary" | "mandibular",
  retentionTypes: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>,
  productAdvanceFields: { [productId: string]: any[] }
): boolean => {
  if (!productDetails) return false

  switch (fieldName) {
    case "retention":
      // Only show retention field if user has selected a retention type from popover
      if (!archType) return false
      return hasRetentionTypeSelected(savedProduct, archType, retentionTypes)
    case "implant":
      const implantDetails = archType === "maxillary" ? "" : savedProduct.mandibularImplantDetails
      return !!(productDetails.implant || implantDetails)
    case "grade":
      return !!(productDetails.grades && Array.isArray(productDetails.grades) && productDetails.grades.length > 0)
    case "teeth_shade":
      return !!(productDetails.teeth_shades && Array.isArray(productDetails.teeth_shades) && productDetails.teeth_shades.length > 0)
    case "gum_shade":
      return !!(productDetails.gum_shades && Array.isArray(productDetails.gum_shades) && productDetails.gum_shades.length > 0)
    case "stump_shade":
      // Check if stump_shade exists as an advance field
      const advanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
      const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
      // If stump_shade exists as an advance field, use that; otherwise, check if it's configured as a regular field
      if (stumpShadeField) {
        return true
      }
      // Fallback: check if advance fields exist (for backward compatibility)
      return advanceFields.length > 0
    case "crown_third_shade":
    case "pontic_design":
    case "embrasures":
    case "occlusal_contact":
    case "interproximal_contact":
    case "gap":
    case "advance_fields":
      const allAdvanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
      return allAdvanceFields.length > 0
    default:
      return true // Always show product_material, stage, impressions, add_ons
  }
}

/**
 * Helper function to get advance field value from saved product
 */
export const getAdvanceFieldValue = (
  savedProduct: SavedProduct,
  fieldId: number,
  archType: "maxillary" | "mandibular"
): any => {
  if (!savedProduct.advanceFields || !Array.isArray(savedProduct.advanceFields)) {
    return null
  }
  
  // Find the advance field data for this field ID
  const savedField = savedProduct.advanceFields.find((af: any) => af.advance_field_id === fieldId)
  if (!savedField) {
    return null
  }
  
  return savedField
}

/**
 * Helper function to check if a field is completed
 */
export const isFieldCompleted = (
  fieldName: string,
  savedProduct: SavedProduct,
  archType: "maxillary" | "mandibular"
): boolean => {
  const material = archType === "maxillary" ? savedProduct.maxillaryMaterial : savedProduct.mandibularMaterial
  const retention = archType === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
  const implantDetails = archType === "maxillary" ? "" : savedProduct.mandibularImplantDetails
  const stage = archType === "maxillary" ? savedProduct.maxillaryStage : savedProduct.mandibularStage
  const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade
  const gumShade = archType === "maxillary" ? savedProduct.maxillaryGumShadeBrand : savedProduct.mandibularGumShadeBrand
  const impression = archType === "maxillary" ? savedProduct.maxillaryImpression : savedProduct.mandibularImpression
  const ponticDesign = archType === "maxillary" ? savedProduct.maxillaryPonticDesign : savedProduct.mandibularPonticDesign
  const embrasure = archType === "maxillary" ? savedProduct.maxillaryEmbrasure : savedProduct.mandibularEmbrasure
  const occlusalContact = archType === "maxillary" ? savedProduct.maxillaryOcclusalContact : savedProduct.mandibularOcclusalContact
  const proximalContact = archType === "maxillary" ? savedProduct.maxillaryProximalContact : savedProduct.mandibularProximalContact
  const gap = archType === "maxillary" ? savedProduct.maxillaryGap : savedProduct.mandibularGap
  const stumpShade = archType === "maxillary" ? savedProduct.maxillaryStumpShade : ""

  switch (fieldName) {
    case "product_material":
      return !!(material && material.trim() !== "")
    case "retention":
      return !!(retention && retention.trim() !== "")
    case "implant":
      return !!(implantDetails && implantDetails.trim() !== "")
    case "grade":
      // Grade is typically stored in material field or separate grade field
      return !!(material && material.trim() !== "")
    case "stage":
      return !!(stage && stage.trim() !== "")
    case "teeth_shade":
      return !!(toothShade && toothShade.trim() !== "")
    case "gum_shade":
      return !!(gumShade)
    case "impression":
    case "impressions":
      return !!(impression && impression.trim() !== "")
    case "stump_shade":
      return !!(stumpShade && stumpShade.trim() !== "")
    case "crown_third_shade":
      // Check if advance field value is set
      return false // Will be checked via advance fields
    case "pontic_design":
      return !!(ponticDesign && ponticDesign.trim() !== "")
    case "embrasures":
      return !!(embrasure && embrasure.trim() !== "")
    case "occlusal_contact":
      return !!(occlusalContact && occlusalContact.trim() !== "")
    case "interproximal_contact":
      return !!(proximalContact && proximalContact.trim() !== "")
    case "gap":
      return !!(gap && gap.trim() !== "")
    case "add_ons":
      const addOns = archType === "maxillary" ? savedProduct.maxillaryAddOns : savedProduct.mandibularAddOns
      return !!(addOns && Array.isArray(addOns) && addOns.length > 0)
    default:
      return false
  }
}

/**
 * Helper function to check if a field should be visible (progressive disclosure)
 */
export const isFieldVisible = (
  fieldName: string,
  productId: string,
  savedProduct: SavedProduct,
  productDetails: any,
  archType: "maxillary" | "mandibular",
  retentionTypes: Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>,
  productAdvanceFields: { [productId: string]: any[] }
): boolean => {
  // Special case: impression field should ONLY show if stage field is visible
  // Check this FIRST - impression is initially hidden and only shows when stage is visible
  if (fieldName === "impression" || fieldName === "impressions") {
    // Helper to check if a value is actually set (not empty, not "Not specified", not undefined, not null)
    const hasValue = (value: string | undefined | null): boolean => {
      if (!value) return false
      const trimmed = String(value).trim()
      return trimmed !== "" && trimmed.toLowerCase() !== "not specified" && trimmed.toLowerCase() !== "finish" && trimmed.toLowerCase() !== "select"
    }
    
    // Get tooth shade value - stage is visible only when tooth shade has a value
    const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade
    
    // Impression field is initially hidden - only show if stage field is visible
    // Stage field is visible only when tooth shade has a real value
    if (!hasValue(toothShade)) {
      return false // Initially hidden - tooth shade not set
    }
    
    // Also verify using isAccordionFieldVisible for consistency
    if (!isAccordionFieldVisible("stage", savedProduct, archType)) {
      return false // Stage field is not visible
    }
  }
  
  const fieldOrder = getFieldOrder(savedProduct.category)
  const currentFieldIndex = fieldOrder.indexOf(fieldName)
  
  // If field is not in the order, don't show it
  if (currentFieldIndex === -1) return false
  
  // First field is always visible
  if (currentFieldIndex === 0) return true
  
  // Check if field is configured
  if (!isFieldConfigured(fieldName, productDetails, savedProduct, archType, retentionTypes, productAdvanceFields)) {
    return false
  }
  
  // Check if all previous fields are completed
  for (let i = 0; i < currentFieldIndex; i++) {
    const previousField = fieldOrder[i]
    if (!isFieldCompleted(previousField, savedProduct, archType)) {
      return false
    }
  }
  
  return true
}

/**
 * Helper function to check if accordion field should be visible (progressive disclosure for accordion)
 * Fields are hidden initially and shown automatically when the previous field has a value
 */
export const isAccordionFieldVisible = (
  fieldName: "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details",
  savedProduct: SavedProduct,
  archType: "maxillary" | "mandibular"
): boolean => {
  const retention = archType === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
  const stumpShade = archType === "maxillary" ? savedProduct.maxillaryStumpShade : ""
  const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade
  const stage = archType === "maxillary" ? savedProduct.maxillaryStage : savedProduct.mandibularStage

  // Helper to check if a value is actually set (not empty, not "Not specified", not undefined, not null)
  const hasValue = (value: string | undefined | null): boolean => {
    if (!value) return false
    const trimmed = String(value).trim()
    return trimmed !== "" && trimmed.toLowerCase() !== "not specified" && trimmed.toLowerCase() !== "finish"
  }

  switch (fieldName) {
    case "stump_shade":
      // Show stump shade ONLY after retention has a real value (only for maxillary)
      // Initially hidden, shows automatically when retention is filled
      return archType === "maxillary" && hasValue(retention)
    case "tooth_shade":
      // For maxillary: show tooth shade ONLY after stump shade has a real value
      // For mandibular: show tooth shade ONLY after retention has a real value
      // Initially hidden, shows automatically when previous field is filled
      if (archType === "maxillary") {
        return hasValue(stumpShade)
      } else {
        return hasValue(retention)
      }
    case "stage":
      // Show stage ONLY after tooth shade has a real value
      // Initially hidden, shows automatically when tooth shade is filled
      return hasValue(toothShade)
    case "notes":
      // Show notes ONLY after stage has a real value (for maxillary)
      // Initially hidden, shows automatically when stage is filled
      return archType === "maxillary" && hasValue(stage)
    case "implant_details":
      // Show implant details ONLY after stage has a real value (for mandibular)
      // Initially hidden, shows automatically when stage is filled
      return archType === "mandibular" && hasValue(stage)
    default:
      return false
  }
}

/**
 * Helper function to get shade display text with brand and code
 */
export const getShadeDisplayText = (
  shadeName: string | undefined,
  shadeId: number | undefined,
  shadeBrandId: number | undefined,
  shadeType: "stump_shade" | "tooth_shade",
  productDetails: any
): string => {
  if (!shadeName || shadeName.trim() === "" || shadeName === "Select" || shadeName === "Select stump shade" || shadeName === "Select tooth shade") {
    return shadeType === "stump_shade" ? "Select stump shade" : "Select tooth shade"
  }

  if (!productDetails) {
    return shadeName
  }

  // Get the appropriate shade array
  const shades = shadeType === "stump_shade" 
    ? productDetails.gum_shades 
    : productDetails.teeth_shades

  if (!shades || !Array.isArray(shades)) {
    return shadeName
  }

  // Find the shade by ID or name
  const shade = shades.find((s: any) => {
    if (shadeId && (s.id === shadeId || String(s.id) === String(shadeId))) {
      return true
    }
    if (s.name === shadeName || s.system_name === shadeName) {
      return true
    }
    return false
  })

  if (!shade) {
    return shadeName
  }

  // Get brand name
  const brandName = shade.brand?.name || shade.brand_name || ""
  // Get shade code
  const shadeCode = shade.code || shade.shade_code || shade.name || ""

  // Format: "Brand Name - Shade Code" or just "Shade Code" if no brand
  if (brandName && shadeCode) {
    return `${brandName} - ${shadeCode}`
  } else if (shadeCode) {
    return shadeCode
  } else {
    return shadeName
  }
}

/**
 * Helper function to format advance field values for notes
 */
export const formatAdvanceFields = (product: SavedProduct, arch: "maxillary" | "mandibular"): string => {
  if (!product.advanceFields || product.advanceFields.length === 0) {
    return ""
  }

  // Get advance field definitions from productDetails
  const fieldDefinitions = product.productDetails?.advance_fields || []
  if (!fieldDefinitions || fieldDefinitions.length === 0) {
    return ""
  }

  const fieldTexts: string[] = []

  product.advanceFields.forEach((savedField) => {
    // Find the field definition
    const fieldDef = fieldDefinitions.find((f: any) => f.id === savedField.advance_field_id)
    if (!fieldDef) return

    const fieldName = fieldDef.name || fieldDef.description || "Advanced Field"
    let fieldValue = ""

    // Handle different field types
    if (savedField.advance_field_value) {
      if (fieldDef.field_type === "dropdown" || fieldDef.field_type === "radio") {
        // For dropdown/radio, find the option name
        const option = fieldDef.options?.find((opt: any) => 
          opt.id === savedField.advance_field_value || 
          opt.name === savedField.advance_field_value ||
          String(opt.id) === String(savedField.advance_field_value)
        )
        fieldValue = option?.name || savedField.advance_field_value
      } else if (fieldDef.field_type === "checkbox") {
        // For checkbox, might have multiple values
        if (Array.isArray(savedField.advance_field_value)) {
          const optionNames = savedField.advance_field_value.map((val: any) => {
            const option = fieldDef.options?.find((opt: any) => 
              opt.id === val || opt.name === val || String(opt.id) === String(val)
            )
            return option?.name || val
          })
          fieldValue = optionNames.join(", ")
        } else {
          fieldValue = savedField.advance_field_value
        }
      } else if (fieldDef.field_type === "file") {
        // For file uploads, show file name if available
        fieldValue = savedField.file?.name || savedField.advance_field_value || "File uploaded"
      } else {
        // For text, textarea, number, etc.
        fieldValue = savedField.advance_field_value
      }
    }

    if (fieldValue) {
      // Include teeth number if specified
      const teethInfo = savedField.teeth_number ? ` (tooth #${savedField.teeth_number})` : ""
      fieldTexts.push(`${fieldName}: ${fieldValue}${teethInfo}`)
    }
  })

  return fieldTexts.length > 0 ? fieldTexts.join("; ") : ""
}
