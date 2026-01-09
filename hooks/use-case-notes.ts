import { useState, useRef, useCallback } from "react"
import { generateCaseNotes, parseCaseNotes, type ParseResult } from "@/utils/case-notes-parser"
import type { SavedProduct, Product, ProductCategoryApi } from "@/app/case-design-center/sections/types"

interface UseCaseNotesOptions {
  savedProducts: SavedProduct[]
  labProducts: Product[] | null
  allCategories: ProductCategoryApi[] | null
  subcategoriesByCategory: any[]
  fetchSubcategoriesByCategory: (categoryId: number, lang: string, customerId?: number) => Promise<void>
  getCustomerIdForApi: () => number | undefined
  onProductsParsed?: (result: ParseResult) => void
}

/**
 * Hook to manage case notes parsing and generation
 */
export function useCaseNotes(options: UseCaseNotesOptions) {
  const {
    savedProducts,
    labProducts,
    allCategories,
    subcategoriesByCategory,
    fetchSubcategoriesByCategory,
    getCustomerIdForApi,
    onProductsParsed
  } = options

  const [notes, setNotes] = useState<string>("")
  const previousNotesRef = useRef<string>("")
  const isParsingRef = useRef<boolean>(false)

  // Generate case notes from saved products
  const generateNotes = useCallback((): string => {
    return generateCaseNotes(savedProducts)
  }, [savedProducts])

  // Parse case notes and extract product information
  const parseNotes = useCallback(async (notesText: string): Promise<ParseResult | null> => {
    const result = await parseCaseNotes(notesText, {
      isParsingRef,
      previousNotesRef,
      savedProducts,
      labProducts,
      allCategories,
      subcategoriesByCategory,
      fetchSubcategoriesByCategory,
      getCustomerIdForApi
    })

    if (result && onProductsParsed) {
      onProductsParsed(result)
    }

    return result
  }, [
    savedProducts,
    labProducts,
    allCategories,
    subcategoriesByCategory,
    fetchSubcategoriesByCategory,
    getCustomerIdForApi,
    onProductsParsed
  ])

  // Update notes when products change (only if notes are empty or first product)
  const updateNotesFromProducts = useCallback((currentNotes: string, isFirstProduct: boolean) => {
    const generatedNotes = generateNotes()
    if (generatedNotes) {
      // Only update if notes are empty or if we're adding the first product
      // This preserves user edits while auto-updating when products change
      if (!currentNotes || isFirstProduct) {
        setNotes(generatedNotes)
        previousNotesRef.current = generatedNotes
      } else {
        // If user has edited notes, only update if the generated notes are significantly different
        const currentNotesLength = currentNotes.length
        const generatedNotesLength = generatedNotes.length
        // If generated notes are much longer (new product added), update them
        if (generatedNotesLength > currentNotesLength * 1.5) {
          setNotes(generatedNotes)
          previousNotesRef.current = generatedNotes
        }
      }
    }
  }, [generateNotes])

  return {
    notes,
    setNotes,
    generateNotes,
    parseNotes,
    updateNotesFromProducts,
    previousNotesRef,
    isParsingRef
  }
}
