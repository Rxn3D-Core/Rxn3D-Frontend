import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CasePanTrackingLabelState {
  label: string;
  setLabel: (label: string) => void;
  resetLabel: (defaultLabel: string) => void;
}

export const useCasePanTrackingLabelStore = create<CasePanTrackingLabelState>()(
  persist(
    (set) => ({
      // Initial state
      label: "Case Pan Tracking System",
      
      // Actions
      setLabel: (label: string) => {
        set({ label });
      },
      
      resetLabel: (defaultLabel: string) => {
        set({ label: defaultLabel });
      },
    }),
    {
      name: 'case-pan-tracking-label-storage', // unique name for localStorage
      partialize: (state) => ({ 
        label: state.label 
      }),
    }
  )
);

