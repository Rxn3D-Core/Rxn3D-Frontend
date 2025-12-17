import { useState, useCallback, useMemo } from 'react'

interface ImpressionQuantity {
  [key: string]: number
}

export function useImpressionQuantities() {
  const [impressionQuantities, setImpressionQuantities] = useState<ImpressionQuantity>({})

  // Add impression quantity
  const addImpressionQuantity = useCallback((key: string, quantity: number = 1) => {
    setImpressionQuantities(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + quantity
    }))
  }, [])

  // Remove impression quantity
  const removeImpressionQuantity = useCallback((key: string) => {
    setImpressionQuantities(prev => {
      const newState = { ...prev }
      delete newState[key]
      return newState
    })
  }, [])

  // Update impression quantity
  const updateImpressionQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      removeImpressionQuantity(key)
    } else {
      setImpressionQuantities(prev => ({
        ...prev,
        [key]: quantity
      }))
    }
  }, [removeImpressionQuantity])

  // Decrease impression quantity
  const decreaseImpressionQuantity = useCallback((key: string) => {
    setImpressionQuantities(prev => {
      const currentQuantity = prev[key] || 0
      if (currentQuantity <= 1) {
        const newState = { ...prev }
        delete newState[key]
        return newState
      }
      return {
        ...prev,
        [key]: currentQuantity - 1
      }
    })
  }, [])

  // Get impression quantities for a specific product and arch
  const getImpressionQuantitiesForProduct = useCallback((productId: string, arch: 'maxillary' | 'mandibular') => {
    return Object.entries(impressionQuantities)
      .filter(([key]) => key.startsWith(`${productId}_${arch}_`))
      .map(([key, quantity]) => ({
        name: key.replace(`${productId}_${arch}_`, ''),
        quantity
      }))
  }, [impressionQuantities])

  // Check if user has chosen impressions for a product/arch
  const hasChosenImpressions = useCallback((productId: string, arch: 'maxillary' | 'mandibular') => {
    return Object.entries(impressionQuantities)
      .some(([key, qty]) => key.startsWith(`${productId}_${arch}_`) && qty > 0)
  }, [impressionQuantities])

  // Get total impression count
  const getTotalImpressionCount = useMemo(() => {
    return Object.values(impressionQuantities).reduce((total, quantity) => total + quantity, 0)
  }, [impressionQuantities])

  // Clear all impression quantities
  const clearAllImpressionQuantities = useCallback(() => {
    setImpressionQuantities({})
  }, [])

  // Clear impression quantities for a specific product
  const clearImpressionQuantitiesForProduct = useCallback((productId: string) => {
    setImpressionQuantities(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(key => {
        if (key.startsWith(`${productId}_`)) {
          delete newState[key]
        }
      })
      return newState
    })
  }, [])

  return {
    impressionQuantities,
    addImpressionQuantity,
    removeImpressionQuantity,
    updateImpressionQuantity,
    decreaseImpressionQuantity,
    getImpressionQuantitiesForProduct,
    hasChosenImpressions,
    getTotalImpressionCount,
    clearAllImpressionQuantities,
    clearImpressionQuantitiesForProduct,
  }
} 