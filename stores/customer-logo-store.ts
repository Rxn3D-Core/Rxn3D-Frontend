import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface CustomerLogoState {
  // Map of customerId to logoUrl
  logos: Record<string, string>
  
  // Current customer logo (for session)
  currentCustomerLogo: string | null
  
  // Actions
  setCustomerLogo: (customerId: number | string, logoUrl: string) => void
  setCurrentCustomerLogo: (logoUrl: string) => void
  getCustomerLogo: (customerId: number | string | null | undefined) => string | null
  clearCustomerLogo: (customerId: number | string) => void
  clearAllLogos: () => void
  
  // Initialize from localStorage
  initializeFromStorage: () => void
}

export const useCustomerLogoStore = create<CustomerLogoState>()(
  devtools(
    (set, get) => ({
      logos: {},
      currentCustomerLogo: null,
      
      setCustomerLogo: (customerId, logoUrl) => {
        const customerIdStr = String(customerId)
        set((state) => ({
          logos: {
            ...state.logos,
            [customerIdStr]: logoUrl,
          },
        }))
        
        // Also update localStorage
        localStorage.setItem(`customerLogo_${customerIdStr}`, logoUrl)
        localStorage.setItem("customerLogo", logoUrl)
      },
      
      setCurrentCustomerLogo: (logoUrl) => {
        set({ currentCustomerLogo: logoUrl })
        localStorage.setItem("customerLogo", logoUrl)
      },
      
      getCustomerLogo: (customerId) => {
        if (!customerId) return null
        
        const state = get()
        const customerIdStr = String(customerId)
        
        // First check store
        if (state.logos[customerIdStr]) {
          return state.logos[customerIdStr]
        }
        
        // Then check localStorage
        const cachedLogo = localStorage.getItem(`customerLogo_${customerIdStr}`) || 
                          localStorage.getItem("customerLogo")
        
        if (cachedLogo) {
          // Update store with cached value
          set((state) => ({
            logos: {
              ...state.logos,
              [customerIdStr]: cachedLogo,
            },
          }))
          return cachedLogo
        }
        
        return null
      },
      
      clearCustomerLogo: (customerId) => {
        const customerIdStr = String(customerId)
        set((state) => {
          const newLogos = { ...state.logos }
          delete newLogos[customerIdStr]
          return { logos: newLogos }
        })
        
        localStorage.removeItem(`customerLogo_${customerIdStr}`)
      },
      
      clearAllLogos: () => {
        set({ logos: {}, currentCustomerLogo: null })
        // Clear all customer logo entries from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('customerLogo_')) {
            localStorage.removeItem(key)
          }
        })
        localStorage.removeItem("customerLogo")
      },
      
      initializeFromStorage: () => {
        if (typeof window === 'undefined') return
        
        const currentLogo = localStorage.getItem("customerLogo")
        const logos: Record<string, string> = {}
        
        // Load all customer logos from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('customerLogo_')) {
            const customerId = key.replace('customerLogo_', '')
            const logoUrl = localStorage.getItem(key)
            if (logoUrl) {
              logos[customerId] = logoUrl
            }
          }
        })
        
        set({ logos, currentCustomerLogo: currentLogo })
      },
    }),
    {
      name: 'customer-logo-store',
    }
  )
)












