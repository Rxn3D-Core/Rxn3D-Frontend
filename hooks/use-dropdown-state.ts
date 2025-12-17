import { useState, useCallback } from 'react'

interface DropdownVisibilityState {
  restoration: boolean
  productName: boolean
  grade: boolean
  stage: boolean
  teethShadePart1: boolean
  teethShadePart2: boolean
  gumShadePart1: boolean
  gumShadePart2: boolean
  impression: boolean
}

interface ProductConfiguration {
  restoration: string
  productName: string
  grade: string
  stage: string
  teethShadePart1: string
  teethShadePart2: string
  gumShadePart1: string
  gumShadePart2: string
  impressions?: { id: number; name: string; qty: number }[]
}

interface Product {
  id: string
  maxillaryConfig: ProductConfiguration
  mandibularConfig: ProductConfiguration
  type: string
}

export function useDropdownState(products: Product[] = []) {
  const [dropdownVisibility, setDropdownVisibility] = useState<{
    [productId: string]: {
      maxillary: Partial<DropdownVisibilityState>
      mandibular: Partial<DropdownVisibilityState>
    } & { _autoOpenedFor?: string }
  }>({})

  const [selectOpen, setSelectOpen] = useState<{
    [productId: string]: {
      maxillary?: keyof DropdownVisibilityState
      mandibular?: keyof DropdownVisibilityState
    }
  }>({})

  const [autoOpenedFor, setAutoOpenedFor] = useState<{ [productId: string]: boolean }>({})

  // Helper function to check if a field has a real value (not placeholder)
  const hasRealValue = useCallback((arch: "maxillary" | "mandibular", field: keyof ProductConfiguration, product: Product): boolean => {
    const value = product[`${arch}Config`]?.[field]
    const result = field === 'impressions'
      ? Array.isArray(value) && value.length > 0
      : Boolean(value && value !== "placeholder" && value !== "")

    return result
  }, [])

  // Helper function to determine if a dropdown should be visible
  const shouldShowDropdown = useCallback((arch: "maxillary" | "mandibular", field: keyof DropdownVisibilityState, product: Product): boolean => {
    const isBothArches = product.type.includes("Maxillary") && product.type.includes("Mandibular")
    
    const result = (() => {
      switch (field) {
        case "restoration":
        case "productName":
        case "grade":
        case "stage":
          return true // Always show these basic fields
        case "teethShadePart1":
          return hasRealValue(arch, "stage", product)
        case "teethShadePart2":
          return hasRealValue(arch, "teethShadePart1", product)
        case "gumShadePart1":
          return true // Always show gum shade fields
        case "gumShadePart2":
          return true // Always show gum shade fields
        case "impression":
          return true // Always show impression field
        default:
          return false
      }
    })()
    
    // For both arches products, show mandibular dropdowns when maxillary has values
    if (isBothArches && arch === "mandibular") {
      const maxillaryResult = (() => {
        switch (field) {
          case "restoration":
          case "productName":
          case "grade":
          case "stage":
            return true // Always show these basic fields
          case "teethShadePart1":
            return hasRealValue("maxillary", "stage", product)
          case "teethShadePart2":
            return hasRealValue("maxillary", "teethShadePart1", product)
          case "gumShadePart1":
            return true // Always show gum shade fields
          case "gumShadePart2":
            return true // Always show gum shade fields
          case "impression":
            return true // Always show impression field
          default:
            return false
        }
      })()
      
      return maxillaryResult || result
    }
    
    // For both arches products, also show maxillary dropdowns when mandibular has values (symmetrical behavior)
    if (isBothArches && arch === "maxillary") {
      const mandibularResult = (() => {
        switch (field) {
          case "restoration":
          case "productName":
          case "grade":
          case "stage":
            return true // Always show these basic fields
          case "teethShadePart1":
            return hasRealValue("mandibular", "stage", product)
          case "teethShadePart2":
            return hasRealValue("mandibular", "teethShadePart1", product)
          case "gumShadePart1":
            return true // Always show gum shade fields
          case "gumShadePart2":
            return true // Always show gum shade fields
          case "impression":
            return true // Always show impression field
          default:
            return false
        }
      })()
      
      return mandibularResult || result
    }
    
    return result
  }, [hasRealValue])

  // Initialize dropdown visibility for a product
  const initializeDropdownVisibility = useCallback((productId: string, product: Product) => {
    setDropdownVisibility(prev => {
      if (prev[productId]) {
        return prev // Product already has visibility state, don't overwrite
      }
      
      const maxillaryGrade = shouldShowDropdown("maxillary", "grade", product)
      const mandibularGrade = shouldShowDropdown("mandibular", "grade", product)
      
      return {
        ...prev,
        [productId]: {
          maxillary: {
            restoration: shouldShowDropdown("maxillary", "restoration", product),
            productName: shouldShowDropdown("maxillary", "productName", product),
            grade: maxillaryGrade,
            stage: shouldShowDropdown("maxillary", "stage", product),
            teethShadePart1: shouldShowDropdown("maxillary", "teethShadePart1", product),
            teethShadePart2: shouldShowDropdown("maxillary", "teethShadePart2", product),
            gumShadePart1: shouldShowDropdown("maxillary", "gumShadePart1", product),
            gumShadePart2: shouldShowDropdown("maxillary", "gumShadePart2", product),
            impression: shouldShowDropdown("maxillary", "impression", product),
          },
          mandibular: {
            restoration: shouldShowDropdown("mandibular", "restoration", product),
            productName: shouldShowDropdown("mandibular", "productName", product),
            grade: mandibularGrade,
            stage: shouldShowDropdown("mandibular", "stage", product),
            teethShadePart1: shouldShowDropdown("mandibular", "teethShadePart1", product),
            teethShadePart2: shouldShowDropdown("mandibular", "teethShadePart2", product),
            gumShadePart1: shouldShowDropdown("mandibular", "gumShadePart1", product),
            gumShadePart2: shouldShowDropdown("mandibular", "gumShadePart2", product),
            impression: shouldShowDropdown("mandibular", "impression", product),
          },
          _autoOpenedFor: productId,
        },
      }
    })
  }, [shouldShowDropdown])

  // Update dropdown visibility when a field changes
  const updateDropdownVisibility = useCallback((
    productId: string, 
    arch: "maxillary" | "mandibular", 
    field: keyof ProductConfiguration | "stage" | "grade" | "restoration" | "productName"
  ) => {
    setDropdownVisibility(prev => {
      const next = { ...prev }
      const cur = next[productId] || { maxillary: {}, mandibular: {} }
      const vis = cur[arch] || {}
      
      // Sequential dropdown opening logic - show next dropdown when current field is filled
      const dropdownOrder: (keyof DropdownVisibilityState)[] = [
        "restoration", "productName", "grade", "stage",
        "teethShadePart1", "teethShadePart2", "gumShadePart1", "gumShadePart2", "impression"
      ]
      
      const currentIndex = dropdownOrder.indexOf(field as keyof DropdownVisibilityState)
      if (currentIndex >= 0 && currentIndex < dropdownOrder.length - 1) {
        const nextField = dropdownOrder[currentIndex + 1]
        vis[nextField] = true
      }
      
      cur[arch] = vis
      next[productId] = cur
      
      // If both arches are selected, update both arches visibility symmetrically
      const product = products.find(p => p.id === productId)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular")) {
        if (arch === "maxillary") {
          const mandibularVis = cur.mandibular || {}
          if (currentIndex >= 0 && currentIndex < dropdownOrder.length - 1) {
            const nextField = dropdownOrder[currentIndex + 1]
            mandibularVis[nextField] = true
          }
          cur.mandibular = mandibularVis
          next[productId] = cur
        } else if (arch === "mandibular") {
          const maxillaryVis = cur.maxillary || {}
          if (currentIndex >= 0 && currentIndex < dropdownOrder.length - 1) {
            const nextField = dropdownOrder[currentIndex + 1]
            maxillaryVis[nextField] = true
          }
          cur.maxillary = maxillaryVis
          next[productId] = cur
        }
      }
      
      return next
    })
  }, [products])

  // Auto-open next dropdown
  const openNextDropdown = useCallback((
    productId: string, 
    arch: "maxillary" | "mandibular", 
    field: keyof ProductConfiguration | "stage" | "grade" | "restoration" | "productName"
  ) => {
    setTimeout(() => {
      setSelectOpen(prev => {
        const next = { ...prev }
        if (!next[productId]) next[productId] = {}
        
        const dropdownOrder: (keyof DropdownVisibilityState)[] = [
          "restoration", "productName", "grade", "stage",
          "teethShadePart1", "teethShadePart2", "gumShadePart1", "gumShadePart2", "impression"
        ]
        
        const currentIndex = dropdownOrder.indexOf(field as keyof DropdownVisibilityState)
        if (currentIndex >= 0 && currentIndex < dropdownOrder.length - 1) {
          const nextDropdown = dropdownOrder[currentIndex + 1]
          next[productId] = { ...next[productId], [arch]: nextDropdown }
        }
        
        return next
      })
    }, 100)
  }, [])

  // Check if auto-opened for a product
  const isAutoOpenedFor = useCallback((productId: string) => {
    return autoOpenedFor[productId] || false
  }, [autoOpenedFor])

  // Mark as auto-opened for a product
  const markAsAutoOpened = useCallback((productId: string) => {
    setAutoOpenedFor(prev => ({ ...prev, [productId]: true }))
  }, [])

  return {
    dropdownVisibility,
    selectOpen,
    autoOpenedFor,
    initializeDropdownVisibility,
    updateDropdownVisibility,
    openNextDropdown,
    isAutoOpenedFor,
    markAsAutoOpened,
    setSelectOpen,
  }
} 