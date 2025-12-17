/**
 * Utility functions for teeth shade processing
 */

/**
 * Extracts the display name from a teeth shade full name
 * @param fullName - The full teeth shade name (e.g., "VITA Zahnfabrik - VITA Classical" or "3M")
 * @returns The display name (e.g., "VITA Classical" or "3M") or the original name if no dash is found
 */
export const getTeethShadeDisplayName = (fullName: string): string => {
  if (!fullName) return ""
  // If the name contains " - ", it's a system name format, so extract the display part
  // Otherwise, it's already a preferred brand name (like "3M"), so return as-is
  const parts = fullName.split(' - ')
  return parts.length > 1 ? parts[1] : fullName
}

/**
 * Creates a complete teeth shade string with display name and part 2
 * @param teethShadePart1 - The full teeth shade brand name
 * @param teethShadePart2 - The specific teeth shade name
 * @returns The formatted teeth shade string
 */
export const getCompleteTeethShadeString = (teethShadePart1: string, teethShadePart2: string): string => {
  const displayName = getTeethShadeDisplayName(teethShadePart1)
  return `${displayName} ${teethShadePart2 || ""}`.trim()
}

/**
 * Gets the display format "Brand - Shade Name" from brand/shade IDs or names
 * @param teethShadePart1 - Brand ID (numeric string) or brand name
 * @param teethShadePart2 - Shade ID (numeric string) or shade name  
 * @param teethShadeBrandId - Brand ID (number, optional)
 * @param teethShadeId - Shade ID (number, optional)
 * @param teethShadeBrandName - Brand name (string, optional)
 * @param teethShadeName - Shade name (string, optional)
 * @param productTeethShades - Array of brand objects with shades (optional, for ID lookup)
 * @returns The formatted string "Brand - Shade Name" (e.g., "3M - A1")
 */
export const getTeethShadeDisplayText = (
  teethShadePart1?: string,
  teethShadePart2?: string,
  teethShadeBrandId?: number,
  teethShadeId?: number,
  teethShadeBrandName?: string,
  teethShadeName?: string,
  productTeethShades?: any[]
): string => {
  if (!teethShadePart1 || !teethShadePart2) {
    return "Select Teeth Shade"
  }

  // If we have stored names, use them directly (preferred)
  if (teethShadeBrandName && teethShadeName) {
    return `${teethShadeBrandName} - ${teethShadeName}`
  }

  // Check if Part1 and Part2 are numeric IDs
  const isPart1Numeric = /^\d+$/.test(teethShadePart1?.toString() || '')
  const isPart2Numeric = /^\d+$/.test(teethShadePart2?.toString() || '')

  // If we have stored IDs and product data, look them up
  if ((isPart1Numeric || isPart2Numeric) && productTeethShades && productTeethShades.length > 0) {
    const brandId = teethShadeBrandId || (isPart1Numeric ? parseInt(teethShadePart1) : null)
    const shadeId = teethShadeId || (isPart2Numeric ? parseInt(teethShadePart2) : null)

    // Find brand by ID
    const brand = brandId ? productTeethShades.find((b: any) => b.id === brandId) : null
    
    // Find shade by ID
    let shade = null
    if (brand?.shades && shadeId) {
      shade = brand.shades.find((s: any) => s.id === shadeId)
    }
    
    // If shade not found in brand, search all brands
    if (!shade && shadeId && productTeethShades) {
      for (const b of productTeethShades) {
        if (b.shades) {
          const foundShade = b.shades.find((s: any) => s.id === shadeId)
          if (foundShade) {
            shade = foundShade
            // Find the brand for this shade
            const foundBrand = productTeethShades.find((br: any) => 
              br.id === brandId || br.shades?.some((s: any) => s.id === shadeId)
            )
            if (foundBrand) {
              return `${foundBrand.name} - ${foundShade.name}`
            }
            break
          }
        }
      }
    }

    if (brand && shade) {
      return `${brand.name} - ${shade.name}`
    }
    
    // Fallback: use stored names if available
    const brandName = brand?.name || teethShadeBrandName || teethShadePart1
    const shadeName = shade?.name || teethShadeName || teethShadePart2
    return `${brandName} - ${shadeName}`
  }

  // If not numeric, assume they're already names (backward compatibility)
  const brandName = getTeethShadeDisplayName(teethShadePart1)
  return `${brandName} - ${teethShadePart2}`
}

/**
 * Gets the color for a specific teeth shade
 * @param teethShadePart1 - The full teeth shade brand name or ID
 * @param teethShadePart2 - The specific teeth shade name or ID
 * @param productTeethShades - Optional array of brand objects for ID lookup
 * @returns The hex color code for the shade
 */
export const getShadeColor = (
  teethShadePart1: string, 
  teethShadePart2: string,
  productTeethShades?: any[]
): string => {
  if (!teethShadePart1 || !teethShadePart2) return '#F5F0E8'
  
  // Resolve shade name from ID if needed
  let shadeName = teethShadePart2
  if (/^\d+$/.test(teethShadePart2) && productTeethShades) {
    for (const brand of productTeethShades) {
      if (brand.shades) {
        const shade = brand.shades.find((s: any) => s.id?.toString() === teethShadePart2)
        if (shade) {
          shadeName = shade.name
          break
        }
      }
    }
  }
  
  // Resolve brand name from ID if needed
  let brandName = teethShadePart1
  if (/^\d+$/.test(teethShadePart1) && productTeethShades) {
    const brand = productTeethShades.find((b: any) => b.id?.toString() === teethShadePart1)
    if (brand) {
      brandName = brand.name
    }
  }
  
  // VITA Classical shades
  if (brandName.includes('VITA Classical') || brandName.includes('VITA Zahnfabrik')) {
    const shadeColors: Record<string, string> = {
      'A1': '#F5F0E8',
      'A2': '#F2EDE5',
      'A3': '#EFEBE2',
      'A3.5': '#EDE9E0',
      'A4': '#EBE7DE',
      'B1': '#F3F0E9',
      'B2': '#F0EDE6',
      'B3': '#EDEBE4',
      'B4': '#EAE8E1',
      'C1': '#F4F1EA',
      'C2': '#F1EEE7',
      'C3': '#EEECE5',
      'C4': '#EBEAE3',
      'D2': '#F0EEE7',
      'D3': '#EDECE5',
      'D4': '#EAEAE3',
      'OM1': '#F8F3EB',
      'OM2': '#F5F0E8',
      'OM3': '#F2EDE5'
    }
    return shadeColors[shadeName] || '#F5F0E8'
  }
  
  // Ivoclar Chromascop shades
  if (brandName.includes('Ivoclar') || brandName.includes('Chromascop')) {
    const shadeColors: Record<string, string> = {
      '110': '#F8F4EC',
      '120': '#F5F1E9',
      '130': '#F2EEE6',
      '140': '#EFEBE3',
      '210': '#F6F2EA',
      '220': '#F3EFE7',
      '230': '#F0ECE4',
      '240': '#EDE9E1',
      'B16': '#F5F0E8' // Default for B16 as shown in the image
    }
    return shadeColors[shadeName] || '#F5F0E8'
  }
  
  // Default color for other systems
  return '#F5F0E8'
} 