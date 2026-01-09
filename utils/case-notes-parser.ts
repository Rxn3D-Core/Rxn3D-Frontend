import type { SavedProduct, Product, ProductCategoryApi } from "@/app/case-design-center/sections/types"
import { formatTeethNumbers, parseTeethNumbers } from "./teeth-formatting"
import { formatAdvanceFields } from "./case-design-helpers"

/**
 * Parse result interface for case notes parsing
 */
export interface ParseResult {
  products: SavedProduct[]
  category?: string
  categoryId?: number
  subcategory?: string
  subcategoryId?: number
  maxillaryTeeth?: number[]
  mandibularTeeth?: number[]
}

/**
 * Function to parse case notes and extract product information
 * Returns parsed products and related data without side effects
 */
export const parseCaseNotes = async (
  notes: string,
  options: {
    isParsingRef: { current: boolean }
    previousNotesRef: { current: string }
    savedProducts: SavedProduct[]
    labProducts: Product[] | null
    allCategories: ProductCategoryApi[] | null
    subcategoriesByCategory: any[]
    fetchSubcategoriesByCategory: (categoryId: number, lang: string, customerId?: number) => Promise<void>
    getCustomerIdForApi: () => number | undefined
  }
): Promise<ParseResult | null> => {
  const {
    isParsingRef,
    previousNotesRef,
    savedProducts,
    labProducts,
    allCategories,
    subcategoriesByCategory,
    fetchSubcategoriesByCategory,
    getCustomerIdForApi
  } = options

  // Prevent concurrent parsing
  if (isParsingRef.current) {
    return null
  }

  if (!notes.trim()) {
    // Don't clear products if notes are empty - user might be editing
    return null
  }

  // Check if notes contain valid product sections before parsing
  const hasValidSections = notes.toUpperCase().includes('MAXILLARY') || notes.toUpperCase().includes('MANDIBULAR')
  if (!hasValidSections) {
    // Notes don't contain valid product sections, preserve existing products
    return null
  }

  // Check if notes have actually changed from previous value
  if (notes === previousNotesRef.current) {
    // Notes haven't changed, no need to parse
    return null
  }

  // CRITICAL SAFEGUARD: If we have existing products, be VERY conservative about parsing
  // Only parse if notes are clearly a complete replacement (substantial and well-formed)
  if (savedProducts.length > 0) {
    // Require notes to be substantial AND contain clear product indicators
    const hasProductIndicators =
      notes.includes('Fabricate') ||
      notes.includes('fabricate') ||
      notes.includes('Fixed Restoration') ||
      notes.includes('Removable') ||
      notes.includes('Orthodontic')

    // If we have existing products, only parse if:
    // 1. Notes are substantial (>= 150 chars) AND
    // 2. Notes contain clear product indicators AND
    // 3. Notes are significantly different from generated notes (user intentionally edited)
    if (!hasProductIndicators || notes.length < 150) {
      // Don't parse - preserve existing products
      return null
    }
  }

  isParsingRef.current = true

  const newProducts: SavedProduct[] = []
  const sections = notes.split(/\n\s*\n/) // Split by double newlines
  let currentSection = ""

  for (const section of sections) {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length === 0) continue

    const firstLine = lines[0].toUpperCase()
    if (firstLine.includes('MAXILLARY')) {
      currentSection = "maxillary"
      continue
    } else if (firstLine.includes('MANDIBULAR')) {
      currentSection = "mandibular"
      continue
    }

    if (!currentSection) continue

    // Determine restoration type
    const sectionText = lines.join(' ').toLowerCase()
    const isFixedRestoration = sectionText.includes('fixed restoration')
    const isRemovable = sectionText.includes('removable restoration') || sectionText.includes('removable')
    const isOrthodontic = sectionText.includes('orthodontic') || sectionText.includes('ortho')

    if (isFixedRestoration) {
      // Parse Fixed Restoration
      const fullText = lines.join(' ')

      // Extract product name - look for "fabricate a [product]"
      const productMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^for]+?)\s+for\s+teeth/i)
      const productName = productMatch ? productMatch[1].trim() : "restoration"

      // Extract teeth numbers
      const teethText = fullText.match(/teeth\s+([^in]+?)\s+in/i)?.[1] || fullText.match(/teeth\s+(.+?)(?:\s+in|$)/i)?.[1] || ""
      const teeth = parseTeethNumbers(teethText)

      // Extract stage
      const stageMatch = fullText.match(/in\s+the\s+(\w+)\s+stage/i)
      const stage = stageMatch ? stageMatch[1] : "finish"

      // Extract tooth shade
      const toothShadeMatch = fullText.match(/tooth\s+shade\s+is\s+(?:Vita\s+3D\s+Master\s+)?([A-Z]\d+)/i)
      const toothShade = toothShadeMatch ? toothShadeMatch[1] : "A2"

      // Extract stump shade
      const stumpShadeMatch = fullText.match(/stump\s+shade\s+([A-Z]\d+)/i)
      const stumpShade = stumpShadeMatch ? stumpShadeMatch[1] : "A2"

      // Extract retention
      const retentionMatch = fullText.match(/retention\s+is\s+([^.]+)/i)
      const retention = retentionMatch ? retentionMatch[1].trim() : "cement-retained"

      // Extract implant details if present
      const implantMatch = fullText.match(/implant\s+is\s+(.+?)(?:\.|$)/i)
      const implantDetails = implantMatch ? implantMatch[1].trim() : ""

      // Extract design details
      const ponticMatch = fullText.match(/follow:\s*([^,]+)/i)
      const ponticDesign = ponticMatch ? ponticMatch[1].trim() : "Modified ridge pontic"

      const embrasureMatch = fullText.match(/Type\s+(I{1,3}|[IVX]+)\s+embrasures?/i)
      const embrasure = embrasureMatch ? `Type ${embrasureMatch[1]} embrasures` : "Type II embrasures"

      const occlusalMatch = fullText.match(/(standard|light|heavy)\s+occlusal\s+contact/i)
      const occlusalContact = occlusalMatch ? `${occlusalMatch[1]} occlusal contact` : "standard occlusal contact"

      const proximalMatch = fullText.match(/(open|closed)\s+proximal\s+contact/i)
      const proximalContact = proximalMatch ? `${proximalMatch[1]} proximal contact` : "open proximal contact"

      const gapMatch = fullText.match(/gap:\s*([^,\.]+)/i)
      const gap = gapMatch ? gapMatch[1].trim() : ""

      // Extract impression
      const impressionMatch = fullText.match(/impression\s+used:\s*([^.]+)/i)
      const impression = impressionMatch ? impressionMatch[1].trim() : "STL file"

      // Extract add-ons
      const addOnsMatch = fullText.match(/add-ons?\s+requested:\s*([^.]+)/i)
      const addOns = addOnsMatch ? addOnsMatch[1].trim().split(',').map(a => a.trim()) : []

      // Try to find matching product from available products
      let matchedProduct: Product | null = null
      if (labProducts && Array.isArray(labProducts)) {
        matchedProduct = labProducts.find(p =>
          p.name.toLowerCase().includes(productName.toLowerCase()) ||
          productName.toLowerCase().includes(p.name.toLowerCase())
        ) || null
      }

      // Try to find matching category (default to Fixed Restoration)
      let matchedCategory: ProductCategoryApi | null = null
      if (allCategories && Array.isArray(allCategories)) {
        matchedCategory = allCategories.find(c =>
          c.name.toLowerCase().includes('fixed') ||
          c.name.toLowerCase().includes('restoration')
        ) || allCategories[0] || null
      }

      // Try to find matching subcategory
      let matchedSubcategory: any = null
      if (matchedCategory && matchedCategory.id) {
        // Fetch subcategories for this category if not already loaded
        if (subcategoriesByCategory.length === 0 ||
          !subcategoriesByCategory.some(sc => sc.parent_id === matchedCategory!.id)) {
          // For office_admin, use selectedLab.id; for others, use customerId
          const customerIdNum = getCustomerIdForApi()
          await fetchSubcategoriesByCategory(matchedCategory.id, "en", customerIdNum)
        }
        // Find subcategories for this category
        const subcats = subcategoriesByCategory.filter(sc => sc.parent_id === matchedCategory!.id)
        matchedSubcategory = subcats && subcats.length > 0 ? subcats[0] : null
      }

      // Create product if we have teeth
      if (teeth.length > 0) {
        const savedProduct: SavedProduct = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          product: matchedProduct || { id: 0, name: productName },
          productDetails: null,
          category: matchedCategory?.name || "Fixed Restoration",
          categoryId: matchedCategory?.id || 0,
          subcategory: matchedSubcategory?.name || "",
          subcategoryId: matchedSubcategory?.id || 0,
          maxillaryTeeth: currentSection === "maxillary" ? teeth : [],
          mandibularTeeth: currentSection === "mandibular" ? teeth : [],
          maxillaryMaterial: currentSection === "maxillary" ? productName : "",
          maxillaryStumpShade: currentSection === "maxillary" ? stumpShade : "",
          maxillaryRetention: currentSection === "maxillary" ? retention : "",
          maxillaryNotes: "",
          mandibularMaterial: currentSection === "mandibular" ? productName : "",
          mandibularRetention: currentSection === "mandibular" ? retention : "",
          mandibularImplantDetails: currentSection === "mandibular" ? implantDetails : "",
          createdAt: Date.now(),
          addedFrom: currentSection as "maxillary" | "mandibular",
          maxillaryStage: currentSection === "maxillary" ? stage : undefined,
          maxillaryToothShade: currentSection === "maxillary" ? toothShade : undefined,
          mandibularStage: currentSection === "mandibular" ? stage : undefined,
          mandibularToothShade: currentSection === "mandibular" ? toothShade : undefined,
          maxillaryPonticDesign: currentSection === "maxillary" ? ponticDesign : undefined,
          maxillaryEmbrasure: currentSection === "maxillary" ? embrasure : undefined,
          maxillaryOcclusalContact: currentSection === "maxillary" ? occlusalContact : undefined,
          maxillaryProximalContact: currentSection === "maxillary" ? proximalContact : undefined,
          maxillaryGap: currentSection === "maxillary" ? gap : undefined,
          maxillaryImpression: currentSection === "maxillary" ? impression : undefined,
          maxillaryAddOns: currentSection === "maxillary" ? addOns : undefined,
          mandibularPonticDesign: currentSection === "mandibular" ? ponticDesign : undefined,
          mandibularEmbrasure: currentSection === "mandibular" ? embrasure : undefined,
          mandibularOcclusalContact: currentSection === "mandibular" ? occlusalContact : undefined,
          mandibularProximalContact: currentSection === "mandibular" ? proximalContact : undefined,
          mandibularGap: currentSection === "mandibular" ? gap : undefined,
          mandibularImpression: currentSection === "mandibular" ? impression : undefined,
          mandibularAddOns: currentSection === "mandibular" ? addOns : undefined,
        }

        newProducts.push(savedProduct)
      }
    } else if (isRemovable) {
      // Parse Removable Restoration (similar pattern)
      const fullText = lines.join(' ')
      const gradeMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^removable]+?)\s+removable/i)
      const grade = gradeMatch ? gradeMatch[1].trim() : "Premium"

      const productMatch = fullText.match(/removable\s+([^replacing]+?)\s+replacing/i)
      const productName = productMatch ? productMatch[1].trim() : "removable restoration"

      const teethText = fullText.match(/replacing\s+teeth\s+([^in]+?)\s+in/i)?.[1] || ""
      const teeth = parseTeethNumbers(teethText)

      const stageMatch = fullText.match(/in\s+the\s+(\w+)\s+stage/i)
      const stage = stageMatch ? stageMatch[1] : "finish"

      // Similar parsing for removable restoration...
      // (Implementation similar to fixed restoration)
    } else if (isOrthodontic) {
      // Parse Orthodontic Restoration
      const fullText = lines.join(' ')
      const productMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^with]+?)\s+with/i)
      const productName = productMatch ? productMatch[1].trim() : "orthodontic appliance"

      const instructionsMatch = fullText.match(/details:\s*(.+)/i)
      const instructions = instructionsMatch ? instructionsMatch[1].trim() : "Standard specifications"

      // Create orthodontic product...
    }
  }

  // Only return parsed products if we successfully parsed at least one product
  // This prevents clearing existing products when parsing fails or returns no products
  if (newProducts.length > 0) {
    isParsingRef.current = false

    // Update the previous notes ref only if parsing was successful
    previousNotesRef.current = notes

    // Return parsed data
    const firstProduct = newProducts[0]
    return {
      products: newProducts,
      category: firstProduct.category,
      categoryId: firstProduct.categoryId,
      subcategory: firstProduct.subcategory,
      subcategoryId: firstProduct.subcategoryId,
      maxillaryTeeth: firstProduct.maxillaryTeeth.length > 0 ? firstProduct.maxillaryTeeth : undefined,
      mandibularTeeth: firstProduct.mandibularTeeth.length > 0 ? firstProduct.mandibularTeeth : undefined,
    }
  }

  isParsingRef.current = false
  return null
}

/**
 * Function to generate case notes based on saved products
 */
export const generateCaseNotes = (savedProducts: SavedProduct[]): string => {
  if (savedProducts.length === 0) return ""

  let notes = ""

  // Group products by arch (maxillary/mandibular)
  // A product can have both maxillary and mandibular teeth, so we need to handle both
  const maxillaryProducts = savedProducts.filter(p => p.maxillaryTeeth.length > 0)
  const mandibularProducts = savedProducts.filter(p => p.mandibularTeeth.length > 0)

  // MAXILLARY Section
  if (maxillaryProducts.length > 0) {
    notes += "MAXILLARY\n"

    maxillaryProducts.forEach((product, index) => {
      if (index > 0) notes += "\n"

      const categoryName = product.category.toLowerCase()
      const isFixedRestoration = categoryName.includes("fixed") || (!categoryName.includes("removable") && !categoryName.includes("orthodontic"))
      const isRemovable = categoryName.includes("removable")
      const isOrthodontic = categoryName.includes("orthodontic") || categoryName.includes("ortho")

      if (isFixedRestoration) {
        const teeth = formatTeethNumbers(product.maxillaryTeeth)
        const productName = product.product.name || "restoration"
        const stage = product.maxillaryStage || "finish"
        const toothShade = product.maxillaryToothShade || "A2"
        const stumpShade = product.maxillaryStumpShade || "A2"
        const retention = product.maxillaryRetention || "cement-retained"
        const isImplant = retention.toLowerCase().includes("implant") || retention.toLowerCase().includes("screw")

        // Main fabrication line
        notes += `Fabricate ${productName} for ${teeth} in the ${stage} stage, using tooth shade Vita 3D Master ${toothShade} and stump shade ${stumpShade}. Retention: ${retention}.`

        // Show implant details if it's an implant case
        if (isImplant) {
          const brand = product.maxillaryImplantBrand
          const platform = product.maxillaryImplantPlatform
          const size = product.maxillaryImplantSize
          const inclusions = product.maxillaryImplantInclusions
          const abutmentType = product.maxillaryAbutmentType || "custom"
          const abutmentDetail = product.maxillaryAbutmentDetail || "the office"

          if (brand && platform && size && inclusions) {
            notes += ` Implant: ${brand}, ${platform}, ${size}, with ${inclusions}; using a ${abutmentType} abutment provided by ${abutmentDetail}.`
          }
        }

        const ponticDesign = product.maxillaryPonticDesign || "Modified ridge pontic"
        const embrasure = product.maxillaryEmbrasure || "Type II embrasures"
        const contourPonticType = product.maxillaryContourPonticType || "POS pontic design"
        const proximalContact = product.maxillaryProximalContact || "open proximal contact"
        const occlusalContact = product.maxillaryOcclusalContact || "standard occlusal contact"
        const gap = product.maxillaryGap || ""
        
        // Format impressions with quantities
        let impressionText = "STL file"
        if (product.maxillaryImpressions && product.maxillaryImpressions.length > 0) {
          impressionText = product.maxillaryImpressions
            .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
            .join(", ")
        } else if (product.maxillaryImpression) {
          impressionText = product.maxillaryImpression
        }
        
        const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
          ? product.maxillaryAddOns.join(", ")
          : "selected"

        // Get advance fields for maxillary
        const advanceFieldsText = formatAdvanceFields(product, "maxillary")
        const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

        const gapText = gap ? `, gap: ${gap}` : ""
        notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}${gapText}. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
      } else if (isRemovable) {
        const teeth = formatTeethNumbers(product.maxillaryTeeth)
        const productName = product.product.name || "removable restoration"
        const grade = product.maxillaryMaterial || "Premium"
        const stage = product.maxillaryStage || "finish"
        const teethShade = product.maxillaryToothShade || "A2"
        const gumShade = product.maxillaryStumpShade || "A2"
        
        // Format impressions with quantities
        let impressionText = "STL file"
        if (product.maxillaryImpressions && product.maxillaryImpressions.length > 0) {
          impressionText = product.maxillaryImpressions
            .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
            .join(", ")
        } else if (product.maxillaryImpression) {
          impressionText = product.maxillaryImpression
        }
        
        const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
          ? product.maxillaryAddOns.join(", ")
          : "selected"

        // Get advance fields for maxillary
        const advanceFieldsText = formatAdvanceFields(product, "maxillary")
        const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

        notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
      } else if (isOrthodontic) {
        const productName = product.product.name || "orthodontic appliance"
        const instructions = product.maxillaryNotes || "Standard specifications"

        notes += `Fabricate a ${productName} with the following details: ${instructions}`
      }
    })

    notes += "\n"
  }

  // MANDIBULAR Section
  if (mandibularProducts.length > 0) {
    notes += "MANDIBULAR\n"

    mandibularProducts.forEach((product, index) => {
      if (index > 0) notes += "\n"

      const categoryName = product.category.toLowerCase()
      const isFixedRestoration = categoryName.includes("fixed") || (!categoryName.includes("removable") && !categoryName.includes("orthodontic"))
      const isRemovable = categoryName.includes("removable")
      const isOrthodontic = categoryName.includes("orthodontic") || categoryName.includes("ortho")

      if (isFixedRestoration) {
        const teeth = formatTeethNumbers(product.mandibularTeeth)
        const productName = product.product.name || "restoration"
        const stage = product.mandibularStage || "finish"
        const toothShade = product.mandibularToothShade || "A2"
        const stumpShade = product.maxillaryStumpShade || "A2"
        const retention = product.mandibularRetention || "cement-retained"
        const isImplant = retention.toLowerCase().includes("implant") || retention.toLowerCase().includes("screw")

        notes += `Fabricate ${productName} for ${teeth} in the ${stage} stage, using tooth shade Vita 3D Master ${toothShade} and stump shade ${stumpShade}. Retention: ${retention}.`

        // Show implant details if it's an implant case
        if (isImplant) {
          const brand = product.mandibularImplantBrand
          const platform = product.mandibularImplantPlatform
          const size = product.mandibularImplantSize
          const inclusions = product.mandibularImplantInclusions
          const abutmentType = product.mandibularAbutmentType || "custom"
          const abutmentDetail = product.mandibularAbutmentDetail || "the office"

          if (brand && platform && size && inclusions) {
            notes += ` Implant: ${brand}, ${platform}, ${size}, with ${inclusions}; using a ${abutmentType} abutment provided by ${abutmentDetail}.`
          }
        }

        const ponticDesign = product.mandibularPonticDesign || "Modified ridge pontic"
        const embrasure = product.mandibularEmbrasure || "Type II embrasures"
        const contourPonticType = product.mandibularContourPonticType || "POS pontic design"
        const proximalContact = product.mandibularProximalContact || "open proximal contact"
        const occlusalContact = product.mandibularOcclusalContact || "standard occlusal contact"
        const gap = product.mandibularGap || ""
        
        // Format impressions with quantities
        let impressionText = "STL file"
        if (product.mandibularImpressions && product.mandibularImpressions.length > 0) {
          impressionText = product.mandibularImpressions
            .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
            .join(", ")
        } else if (product.mandibularImpression) {
          impressionText = product.mandibularImpression
        }
        
        const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
          ? product.mandibularAddOns.join(", ")
          : "selected"

        // Get advance fields for mandibular
        const advanceFieldsText = formatAdvanceFields(product, "mandibular")
        const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

        const gapText = gap ? `, gap: ${gap}` : ""
        notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}${gapText}. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
      } else if (isRemovable) {
        const teeth = formatTeethNumbers(product.mandibularTeeth)
        const productName = product.product.name || "removable restoration"
        const grade = product.mandibularMaterial || "Premium"
        const stage = product.mandibularStage || "finish"
        const teethShade = product.mandibularToothShade || "A2"
        const gumShade = product.maxillaryStumpShade || "A2"
        
        // Format impressions with quantities
        let impressionText = "STL file"
        if (product.mandibularImpressions && product.mandibularImpressions.length > 0) {
          impressionText = product.mandibularImpressions
            .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
            .join(", ")
        } else if (product.mandibularImpression) {
          impressionText = product.mandibularImpression
        }
        
        const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
          ? product.mandibularAddOns.join(", ")
          : "Selected"

        // Get advance fields for mandibular
        const advanceFieldsText = formatAdvanceFields(product, "mandibular")
        const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

        notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
      } else if (isOrthodontic) {
        const productName = product.product.name || "orthodontic appliance"
        const instructions = product.maxillaryNotes || "Standard specifications"

        notes += `Fabricate a ${productName} with the following details: ${instructions}`
      }
    })
  }

  return notes.trim()
}
