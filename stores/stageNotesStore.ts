import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface StageNotesState {
  // Stage notes content for each product
  stageNotesContent: { [productId: string]: string }
  
  // Stage note IDs for each product (for API operations)
  stageNoteIds: { [productId: string]: number }
  
  // Saving state for each product
  savingStageNotes: { [productId: string]: boolean }
  
  // Selected teeth from dental chart
  selectedMaxillaryTeeth: number[]
  selectedMandibularTeeth: number[]
  
  // Rush requests for each product
  rushRequests: { [productId: string]: any }
  
  // Actions
  setStageNotesContent: (productId: string, content: string) => void
  setStageNoteIds: (productId: string, id: number) => void
  setSavingStageNotes: (productId: string, saving: boolean) => void
  setSelectedMaxillaryTeeth: (teeth: number[]) => void
  setSelectedMandibularTeeth: (teeth: number[]) => void
  setRushRequests: (productId: string, rushRequest: any) => void
  
  // Utility actions
  clearStageNotesContent: () => void
  clearAllState: () => void
  
  // Computed values
  getStageNotesContent: (productId: string) => string
  getSelectedTeeth: () => { maxillary: number[], mandibular: number[] }
}

export const useStageNotesStore = create<StageNotesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      stageNotesContent: {},
      stageNoteIds: {},
      savingStageNotes: {},
      selectedMaxillaryTeeth: [],
      selectedMandibularTeeth: [],
      rushRequests: {},
      
      // Actions
      setStageNotesContent: (productId: string, content: string) =>
        set((state) => ({
          stageNotesContent: {
            ...state.stageNotesContent,
            [productId]: content
          }
        })),
      
      setStageNoteIds: (productId: string, id: number) =>
        set((state) => ({
          stageNoteIds: {
            ...state.stageNoteIds,
            [productId]: id
          }
        })),
      
      setSavingStageNotes: (productId: string, saving: boolean) =>
        set((state) => ({
          savingStageNotes: {
            ...state.savingStageNotes,
            [productId]: saving
          }
        })),
      
      setSelectedMaxillaryTeeth: (teeth: number[]) =>
        set({ selectedMaxillaryTeeth: teeth }),
      
      setSelectedMandibularTeeth: (teeth: number[]) =>
        set({ selectedMandibularTeeth: teeth }),
      
      setRushRequests: (productId: string, rushRequest: any) =>
        set((state) => ({
          rushRequests: {
            ...state.rushRequests,
            [productId]: rushRequest
          }
        })),
      
      // Utility actions
      clearStageNotesContent: () =>
        set({ stageNotesContent: {} }),
      
      clearAllState: () =>
        set({
          stageNotesContent: {},
          stageNoteIds: {},
          savingStageNotes: {},
          selectedMaxillaryTeeth: [],
          selectedMandibularTeeth: [],
          rushRequests: {}
        }),
      
      // Computed values
      getStageNotesContent: (productId: string) => {
        const state = get()
        return state.stageNotesContent[productId] || ''
      },
      
      getSelectedTeeth: () => {
        const state = get()
        return {
          maxillary: state.selectedMaxillaryTeeth,
          mandibular: state.selectedMandibularTeeth
        }
      }
    }),
    {
      name: 'stage-notes-store'
    }
  )
)
