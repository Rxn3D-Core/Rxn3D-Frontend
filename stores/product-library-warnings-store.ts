import { create } from "zustand"

/**
 * Tracks which product library sidebar items have warnings (incomplete products).
 * Items: teeth-shade, gum-shade, material, retention-type, retention-option
 * A warning means one or more products are missing a required item of that type
 * because the item was deleted/deactivated.
 */

interface ProductLibraryWarningsState {
  /** Set of sidebar item IDs that currently have warnings */
  warnings: Set<string>
  /** Add a warning for a sidebar item */
  addWarning: (itemId: string) => void
  /** Remove a warning for a sidebar item */
  removeWarning: (itemId: string) => void
  /** Set all warnings at once */
  setWarnings: (itemIds: string[]) => void
  /** Check if a specific item has a warning */
  hasWarning: (itemId: string) => boolean
  /** Check if the "Products" parent menu should show a warning (any child has one) */
  hasAnyWarning: () => boolean
}

export const useProductLibraryWarningsStore = create<ProductLibraryWarningsState>((set, get) => ({
  warnings: new Set<string>(),

  addWarning: (itemId: string) =>
    set((state) => {
      const next = new Set(state.warnings)
      next.add(itemId)
      return { warnings: next }
    }),

  removeWarning: (itemId: string) =>
    set((state) => {
      const next = new Set(state.warnings)
      next.delete(itemId)
      return { warnings: next }
    }),

  setWarnings: (itemIds: string[]) =>
    set({ warnings: new Set(itemIds) }),

  hasWarning: (itemId: string) => get().warnings.has(itemId),

  hasAnyWarning: () => get().warnings.size > 0,
}))
