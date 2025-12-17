import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface SelectedGumShade {
  productId: string
  arch: 'maxillary' | 'mandibular'
  brandName: string
  shadeName: string
}

interface SelectedGumShadeState {
  // Current selection
  selectedGumShade: SelectedGumShade | null
  tempSelectedShadeName: string | null

  // Actions
  setTempSelectedShade: (shadeName: string | null) => void
  setSelectedGumShade: (shade: SelectedGumShade) => void
  clearSelectedGumShade: () => void
  updateGumShade: (productId: string, arch: 'maxillary' | 'mandibular', brandName: string, shadeName: string) => void
}

export const useSelectedGumShadeStore = create<SelectedGumShadeState>()(
  devtools(
    (set, get) => ({
      selectedGumShade: null,
      tempSelectedShadeName: null,

      setTempSelectedShade: (shadeName: string | null) => {
        set({ tempSelectedShadeName: shadeName })
      },

      setSelectedGumShade: (shade: SelectedGumShade) => {
        set({ selectedGumShade: shade })
      },

      clearSelectedGumShade: () => {
        set({ selectedGumShade: null, tempSelectedShadeName: null })
      },

      updateGumShade: (productId: string, arch: 'maxillary' | 'mandibular', brandName: string, shadeName: string) => {
        set({
          selectedGumShade: {
            productId,
            arch,
            brandName,
            shadeName
          },
          tempSelectedShadeName: shadeName
        })
      }
    }),
    {
      name: 'selected-gum-shade-store',
    }
  )
)
