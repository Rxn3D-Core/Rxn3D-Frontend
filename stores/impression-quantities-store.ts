import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface ImpressionQuantity {
  [key: string]: number
}

interface ImpressionQuantitiesState {
  // Impression quantities state
  impressionQuantities: ImpressionQuantity
  
  // Actions
  addImpressionQuantity: (key: string, quantity?: number) => void
  removeImpressionQuantity: (key: string) => void
  updateImpressionQuantity: (key: string, quantity: number) => void
  decreaseImpressionQuantity: (key: string) => void
  getImpressionQuantitiesForProduct: (productId: string, arch: 'maxillary' | 'mandibular') => { name: string; quantity: number }[]
  hasChosenImpressions: (productId: string, arch: 'maxillary' | 'mandibular') => boolean
  getTotalImpressionCount: () => number
  clearAllImpressionQuantities: () => void
  clearImpressionQuantitiesForProduct: (productId: string) => void
}

export const useImpressionQuantitiesStore = create<ImpressionQuantitiesState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        impressionQuantities: {},

        // Add impression quantity
        addImpressionQuantity: (key: string, quantity: number = 1) => {
          set((state) => ({
            impressionQuantities: {
              ...state.impressionQuantities,
              [key]: (state.impressionQuantities[key] || 0) + quantity
            }
          }))
        },

        // Remove impression quantity
        removeImpressionQuantity: (key: string) => {
          set((state) => {
            const newState = { ...state.impressionQuantities }
            delete newState[key]
            return { impressionQuantities: newState }
          })
        },

        // Update impression quantity
        updateImpressionQuantity: (key: string, quantity: number) => {
          if (quantity <= 0) {
            get().removeImpressionQuantity(key)
          } else {
            set((state) => ({
              impressionQuantities: {
                ...state.impressionQuantities,
                [key]: quantity
              }
            }))
          }
        },

        // Decrease impression quantity
        decreaseImpressionQuantity: (key: string) => {
          set((state) => {
            const currentQuantity = state.impressionQuantities[key] || 0
            if (currentQuantity <= 1) {
              const newState = { ...state.impressionQuantities }
              delete newState[key]
              return { impressionQuantities: newState }
            }
            return {
              impressionQuantities: {
                ...state.impressionQuantities,
                [key]: currentQuantity - 1
              }
            }
          })
        },

        // Get impression quantities for a specific product and arch
        getImpressionQuantitiesForProduct: (productId: string, arch: 'maxillary' | 'mandibular') => {
          const state = get()
          return Object.entries(state.impressionQuantities)
            .filter(([key]) => key.startsWith(`${productId}_${arch}_`))
            .map(([key, quantity]) => ({
              name: key.replace(`${productId}_${arch}_`, ''),
              quantity
            }))
        },

        // Check if user has chosen impressions for a product/arch
        hasChosenImpressions: (productId: string, arch: 'maxillary' | 'mandibular') => {
          const state = get()
          return Object.entries(state.impressionQuantities)
            .some(([key, qty]) => key.startsWith(`${productId}_${arch}_`) && qty > 0)
        },

        // Get total impression count
        getTotalImpressionCount: () => {
          const state = get()
          return Object.values(state.impressionQuantities).reduce((total, quantity) => total + quantity, 0)
        },

        // Clear all impression quantities
        clearAllImpressionQuantities: () => {
          set({ impressionQuantities: {} })
        },

        // Clear impression quantities for a specific product
        clearImpressionQuantitiesForProduct: (productId: string) => {
          set((state) => {
            const newState = { ...state.impressionQuantities }
            Object.keys(newState).forEach(key => {
              if (key.startsWith(`${productId}_`)) {
                delete newState[key]
              }
            })
            return { impressionQuantities: newState }
          })
        },
      }),
      {
        name: 'impression-quantities-store',
        // Only persist the impression quantities, not the functions
        partialize: (state) => ({ impressionQuantities: state.impressionQuantities }),
      }
    ),
    {
      name: 'impression-quantities-store',
    }
  )
)
