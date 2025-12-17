import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ArchType = 'upper' | 'lower' | 'both' | null

interface ArchSelectionState {
  archType: ArchType
  setArchType: (arch: ArchType) => void
  clearArchType: () => void
}

export const useArchSelectionStore = create<ArchSelectionState>()(
  persist(
    (set) => ({
      archType: null,
      setArchType: (arch: ArchType) => set({ archType: arch }),
      clearArchType: () => set({ archType: null }),
    }),
    {
      name: 'arch-selection',
      partialize: (state) => ({ archType: state.archType }),
    }
  )
)


