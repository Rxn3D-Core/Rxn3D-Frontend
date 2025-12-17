"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, use } from "react"
import type { LibraryItemsData, LibraryItemsResponse, Category, ProductSelection } from "@/types/library-items"

interface LibraryItemsContextType {
  // State
  libraryData: LibraryItemsData | null
  selectedProducts: ProductSelection
  isLoading: boolean
  error: string | null
  searchQuery: string
  activeCategory: string

  // Additional selections
  selectedGrades: Record<number, boolean>
  selectedImpressions: Record<number, boolean>
  selectedTeethShades: Record<number, boolean>
  selectedGumShades: Record<number, boolean>
  selectedMaterials: Record<number, boolean>
  selectedRetentions: Record<number, boolean>
  selectedAddons: Record<number, boolean>

  // Actions
  fetchLibraryItems: () => Promise<void>
  setSelectedProducts: (products: ProductSelection) => void
  toggleProductSelection: (categoryId: number, subcategoryId: number, productId: number) => void
  toggleStageSelection: (productKey: string, stageId: number) => void
  setSearchQuery: (query: string) => void
  setActiveCategory: (category: string) => void
  resetError: () => void
  getFilteredCategories: () => Category[]
  getSelectedProductsCount: () => number
  toggleGradeSelection: (gradeId: number) => void
  toggleImpressionSelection: (impressionId: number) => void
  toggleTeethShadeSelection: (shadeId: number) => void
  toggleGumShadeSelection: (shadeId: number) => void
  toggleMaterialSelection: (materialId: number) => void
  toggleRetentionSelection: (retentionId: number) => void
  toggleAddonSelection: (addonId: number) => void
  submitOnboarding: (customerId: number) => Promise<any>
  getSelectedIds: () => any
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const LibraryItemsContext = createContext<LibraryItemsContextType | undefined>(undefined)

export function useLibraryItems() {
  const context = useContext(LibraryItemsContext)
  if (context === undefined) {
    throw new Error("useLibraryItems must be used within a LibraryItemsProvider")
  }
  return context
}

interface LibraryItemsProviderProps {
  children: ReactNode
}

export function LibraryItemsProvider({ children }: LibraryItemsProviderProps) {
  const [libraryData, setLibraryData] = useState<LibraryItemsData | null>(null)
  const [selectedProducts, setSelectedProductsState] = useState<ProductSelection>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("")

  // Add these state variables
  const [selectedGrades, setSelectedGrades] = useState<Record<number, boolean>>({})
  const [selectedImpressions, setSelectedImpressions] = useState<Record<number, boolean>>({})
  const [selectedTeethShades, setSelectedTeethShades] = useState<Record<number, boolean>>({})
  const [selectedGumShades, setSelectedGumShades] = useState<Record<number, boolean>>({})
  const [selectedMaterials, setSelectedMaterials] = useState<Record<number, boolean>>({})
  const [selectedRetentions, setSelectedRetentions] = useState<Record<number, boolean>>({})
  const [selectedAddons, setSelectedAddons] = useState<Record<number, boolean>>({})

  const fetchLibraryItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/labs/library-items?lang=en`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("library_token")}`
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: LibraryItemsResponse = await response.json()
      setLibraryData(result.data)

      // Set the first category as active by default
      if (result.data.categories.length > 0) {
        setActiveCategory(result.data.categories[0].name.toLowerCase().replace(/\s+/g, "-"))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while fetching library items"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setSelectedProducts = useCallback((products: ProductSelection) => {
    setSelectedProductsState(products)
  }, [])

  const toggleProductSelection = useCallback(
    (categoryId: number, subcategoryId: number, productId: number) => {
      const productKey = `${categoryId}-${subcategoryId}-${productId}`

      setSelectedProductsState((prev) => {
        const newSelection = { ...prev }

        if (newSelection[productKey]) {
          // Remove the product if it's already selected
          delete newSelection[productKey]
        } else {
          // Add the product with all stages selected by default
          const category = libraryData?.categories.find((c) => c.id === categoryId)
          const subcategory = category?.subcategories.find((s) => s.id === subcategoryId)
          const product = subcategory?.products.find((p) => p.id === productId)

          if (product) {
            newSelection[productKey] = {
              categoryId,
              subcategoryId,
              productId,
              selectedStages: product.stages.map((stage) => stage.id),
            }
          }
        }

        return newSelection
      })
    },
    [libraryData],
  )

  const toggleStageSelection = useCallback((productKey: string, stageId: number) => {
    setSelectedProductsState((prev) => {
      const newSelection = { ...prev }

      if (newSelection[productKey]) {
        const selectedStages = newSelection[productKey].selectedStages
        const stageIndex = selectedStages.indexOf(stageId)

        if (stageIndex > -1) {
          // Remove stage
          newSelection[productKey].selectedStages = selectedStages.filter((id) => id !== stageId)
        } else {
          // Add stage
          newSelection[productKey].selectedStages = [...selectedStages, stageId]
        }
      }

      return newSelection
    })
  }, [])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  const getFilteredCategories = useCallback(() => {
    if (!libraryData) return []

    let filteredCategories = libraryData.categories

    // Filter by active category
    if (activeCategory) {
      filteredCategories = filteredCategories.filter(
        (category) => category.name.toLowerCase().replace(/\s+/g, "-") === activeCategory,
      )
    }

    // Filter by search query
    if (searchQuery) {
      filteredCategories = filteredCategories
        .map((category) => ({
          ...category,
          subcategories: category.subcategories
            .map((subcategory) => ({
              ...subcategory,
              products: subcategory.products.filter((product) =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()),
              ),
            }))
            .filter((subcategory) => subcategory.products.length > 0),
        }))
        .filter((category) => category.subcategories.length > 0)
    }

    return filteredCategories
  }, [libraryData, activeCategory, searchQuery])

  const getSelectedProductsCount = useCallback(() => {
    return Object.keys(selectedProducts).length
  }, [selectedProducts])

  // Add these toggle methods
  const toggleGradeSelection = useCallback((gradeId: number) => {
    setSelectedGrades((prev) => ({ ...prev, [gradeId]: !prev[gradeId] }))
  }, [])

  const toggleImpressionSelection = useCallback((impressionId: number) => {
    setSelectedImpressions((prev) => ({ ...prev, [impressionId]: !prev[impressionId] }))
  }, [])

  const toggleTeethShadeSelection = useCallback((shadeId: number) => {
    setSelectedTeethShades((prev) => ({ ...prev, [shadeId]: !prev[shadeId] }))
  }, [])

  const toggleGumShadeSelection = useCallback((shadeId: number) => {
    setSelectedGumShades((prev) => ({ ...prev, [shadeId]: !prev[shadeId] }))
  }, [])

  const toggleMaterialSelection = useCallback((materialId: number) => {
    setSelectedMaterials((prev) => ({ ...prev, [materialId]: !prev[materialId] }))
  }, [])

  const toggleRetentionSelection = useCallback((retentionId: number) => {
    setSelectedRetentions((prev) => ({ ...prev, [retentionId]: !prev[retentionId] }))
  }, [])

  const toggleAddonSelection = useCallback((addonId: number) => {
    setSelectedAddons((prev) => ({ ...prev, [addonId]: !prev[addonId] }))
  }, [])

  // Add method to get all selected IDs
  const getSelectedIds = useCallback(() => {
    const categories = new Set<number>()
    const subcategories = new Set<number>()
    const products = new Set<number>()

    Object.values(selectedProducts).forEach((product) => {
      categories.add(product.categoryId)
      subcategories.add(product.subcategoryId)
      products.add(product.productId)
    })

    return {
      categories: Array.from(categories),
      subcategories: Array.from(subcategories),
      products: Array.from(products),
      grades: Object.keys(selectedGrades)
        .filter((id) => selectedGrades[Number(id)])
        .map(Number),
      impressions: Object.keys(selectedImpressions)
        .filter((id) => selectedImpressions[Number(id)])
        .map(Number),
      teeth_shades: Object.keys(selectedTeethShades)
        .filter((id) => selectedTeethShades[Number(id)])
        .map(Number),
      gum_shades: Object.keys(selectedGumShades)
        .filter((id) => selectedGumShades[Number(id)])
        .map(Number),
      materials: Object.keys(selectedMaterials)
        .filter((id) => selectedMaterials[Number(id)])
        .map(Number),
      retentions: Object.keys(selectedRetentions)
        .filter((id) => selectedRetentions[Number(id)])
        .map(Number),
      addons: Object.keys(selectedAddons)
        .filter((id) => selectedAddons[Number(id)])
        .map(Number),
    }
  }, [
    selectedProducts,
    selectedGrades,
    selectedImpressions,
    selectedTeethShades,
    selectedGumShades,
    selectedMaterials,
    selectedRetentions,
    selectedAddons,
  ])

  const submitOnboarding = useCallback(
    async (customerId: number) => {
      setIsLoading(true)
      setError(null)

      try {
        const selectedIds = getSelectedIds()

        // Find preferred brand IDs from selected shades
        // For teeth shades: find the brand of the first selected teeth shade
        let preferredTeethShadeBrandId: number | null = null
        if (selectedIds.teeth_shades.length > 0 && libraryData) {
          const firstTeethShadeId = selectedIds.teeth_shades[0]
          for (const brand of libraryData.teeth_shade_brands) {
            const shade = brand.teeth_shades.find((s) => s.id === firstTeethShadeId)
            if (shade) {
              preferredTeethShadeBrandId = brand.id
              break
            }
          }
        }
        // If no preferred brand found from selected shades, use the first available brand
        if (!preferredTeethShadeBrandId && libraryData && libraryData.teeth_shade_brands.length > 0) {
          preferredTeethShadeBrandId = libraryData.teeth_shade_brands[0].id
        }

        // For gum shades: find the brand of the first selected gum shade
        let preferredGumShadeBrandId: number | null = null
        if (selectedIds.gum_shades.length > 0 && libraryData) {
          const firstGumShadeId = selectedIds.gum_shades[0]
          for (const brand of libraryData.gum_shade_brands) {
            const shade = brand.gum_shades.find((s) => s.id === firstGumShadeId)
            if (shade) {
              preferredGumShadeBrandId = brand.id
              break
            }
          }
        }
        // If no preferred brand found from selected shades, use the first available brand
        if (!preferredGumShadeBrandId && libraryData && libraryData.gum_shade_brands.length > 0) {
          preferredGumShadeBrandId = libraryData.gum_shade_brands[0].id
        }

        // Validate that we have preferred brand IDs
        if (!preferredTeethShadeBrandId || !preferredGumShadeBrandId) {
          throw new Error("Preferred brand IDs are required. Please select at least one teeth shade and one gum shade.")
        }

        const payload = {
          customer_id: customerId,
          ...selectedIds,
          preferred_teeth_shade_brand_id: preferredTeethShadeBrandId,
          preferred_gum_shade_brand_id: preferredGumShadeBrandId,
          office_invitations: [], 
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/labs/onboard`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("library_token")}`,
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error_description || `HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        return result
      } catch (err) {
        const errorMessage = err instanceof Error && 'error_description' in err ? (err as any).error_description : "An error occurred during onboarding"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getSelectedIds, libraryData],
  )

  // Update the context value to include all new properties and methods
  const value: LibraryItemsContextType = {
    libraryData,
    selectedProducts,
    isLoading,
    error,
    searchQuery,
    activeCategory,
    fetchLibraryItems,
    setSelectedProducts,
    toggleProductSelection,
    toggleStageSelection,
    setSearchQuery,
    setActiveCategory,
    resetError,
    getFilteredCategories,
    getSelectedProductsCount,
    selectedGrades,
    selectedImpressions,
    selectedTeethShades,
    selectedGumShades,
    selectedMaterials,
    selectedRetentions,
    selectedAddons,
    toggleGradeSelection,
    toggleImpressionSelection,
    toggleTeethShadeSelection,
    toggleGumShadeSelection,
    toggleMaterialSelection,
    toggleRetentionSelection,
    toggleAddonSelection,
    submitOnboarding,
    getSelectedIds,
    setIsLoading,
    setError,
  }

  return <LibraryItemsContext.Provider value={value}>{children}</LibraryItemsContext.Provider>
}
