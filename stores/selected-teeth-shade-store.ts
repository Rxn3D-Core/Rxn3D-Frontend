import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface SelectedTeethShade {
  productId: string
  arch: 'maxillary' | 'mandibular'
  shadeSystem: string
  individualShade: string
}

interface SelectedTeethShadeState {
  // Current selection
  selectedShade: SelectedTeethShade | null
  
  // Actions
  setSelectedShade: (shade: SelectedTeethShade) => void
  clearSelectedShade: () => void
  updateShade: (productId: string, arch: 'maxillary' | 'mandibular', shadeSystem: string, individualShade: string) => void
}

export const useSelectedTeethShadeStore = create<SelectedTeethShadeState>()(
  devtools(
    (set, get) => ({
      selectedShade: null,
      
      setSelectedShade: (shade: SelectedTeethShade) => {
        set({ selectedShade: shade })
      },
      
      clearSelectedShade: () => {
        set({ selectedShade: null })
      },
      
      updateShade: (productId: string, arch: 'maxillary' | 'mandibular', shadeSystem: string, individualShade: string) => {
        set({ 
          selectedShade: { 
            productId, 
            arch, 
            shadeSystem, 
            individualShade 
          } 
        })
      }
    }),
    {
      name: 'selected-teeth-shade-store',
    }
  )
)
