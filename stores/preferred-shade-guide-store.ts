import { create } from "zustand"

/**
 * Tracks whether the current customer has explicitly saved a preferred teeth/gum shade guide.
 * Used for sidebar warnings and table UI; synced from preferred-shades API responses.
 */
interface PreferredShadeGuideState {
  teethExplicit: boolean | null
  gumExplicit: boolean | null
  setTeethExplicit: (value: boolean | null) => void
  setGumExplicit: (value: boolean | null) => void
}

export const usePreferredShadeGuideStore = create<PreferredShadeGuideState>((set) => ({
  teethExplicit: null,
  gumExplicit: null,
  setTeethExplicit: (value) => set({ teethExplicit: value }),
  setGumExplicit: (value) => set({ gumExplicit: value }),
}))
