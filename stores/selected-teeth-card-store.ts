import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectedTeethCardState {
  // Selected extraction type for color preview/assignment
  selectedExtractionType: string | null;
  
  // Actions
  setSelectedExtractionType: (extractionType: string | null) => void;
  clearSelectedExtractionType: () => void;
  
  // Getters
  isExtractionTypeSelected: (extractionType: string) => boolean;
  getSelectedExtractionType: () => string | null;
}

export const useSelectedTeethCardStore = create<SelectedTeethCardState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedExtractionType: null,
      
      // Actions
      setSelectedExtractionType: (extractionType: string | null) => {
        set({ selectedExtractionType: extractionType });
      },
      
      clearSelectedExtractionType: () => {
        set({ selectedExtractionType: null });
      },
      
      // Getters
      isExtractionTypeSelected: (extractionType: string) => {
        const current = get().selectedExtractionType;
        return current === extractionType;
      },
      
      getSelectedExtractionType: () => {
        return get().selectedExtractionType;
      },
    }),
    {
      name: 'selected-teeth-card-storage', // unique name for localStorage
      // Only persist the selected extraction type
      partialize: (state) => ({ 
        selectedExtractionType: state.selectedExtractionType 
      }),
    }
  )
);




