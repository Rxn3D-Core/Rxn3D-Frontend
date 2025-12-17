import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TeethSelectionState {
  // Independent teeth selection for each card type
  maxillarySelectedTeeth: number[];
  mandibularSelectedTeeth: number[];
  
  // Selected extraction type for color preview/assignment
  selectedExtractionType: string | null;
  
  // Per-extraction-type teeth selection
  extractionTypeTeethSelection: {
    [extractionType: string]: {
      maxillary: number[];
      mandibular: number[];
    };
  };
  
  // Product extraction data storage
  productExtractions: {
    [productId: string]: {
      extractions: any[];
      has_extraction?: string;
      extraction_options?: any[];
    };
  };
  
  // Default extraction types for current product
  defaultExtractionTypes: {
    [productId: string]: string[];
  };
  
  // Actions for teeth selection
  setMaxillarySelectedTeeth: (teeth: number[]) => void;
  setMandibularSelectedTeeth: (teeth: number[]) => void;
  toggleMaxillaryTooth: (toothNumber: number) => void;
  toggleMandibularTooth: (toothNumber: number) => void;
  clearMaxillarySelection: () => void;
  clearMandibularSelection: () => void;
  clearAllSelections: () => void;
  
  // Actions for extraction type selection
  setSelectedExtractionType: (extractionType: string | null) => void;
  clearSelectedExtractionType: () => void;
  
  // Actions for per-extraction-type teeth selection
  setExtractionTypeTeeth: (extractionType: string, archType: 'maxillary' | 'mandibular', teeth: number[], preserveOthers?: boolean) => void;
  toggleExtractionTypeTooth: (extractionType: string, archType: 'maxillary' | 'mandibular', toothNumber: number) => void;
  clearExtractionTypeSelection: (extractionType: string, archType: 'maxillary' | 'mandibular') => void;
  
  // Actions for product extraction data
  setProductExtractions: (productId: string, extractionData: { extractions: any[]; has_extraction?: string; extraction_options?: any[] }) => void;
  getProductExtractions: (productId: string) => { extractions: any[]; has_extraction?: string; extraction_options?: any[] } | null;
  clearProductExtractions: (productId: string) => void;
  
  // Actions for default extraction types
  setDefaultExtractionTypes: (productId: string, defaultTypes: string[]) => void;
  getDefaultExtractionTypes: (productId: string) => string[];
  clearDefaultExtractionTypes: (productId: string) => void;
  
  // Getters
  getSelectedTeeth: (type: 'maxillary' | 'mandibular') => number[];
  getExtractionTypeTeeth: (extractionType: string, archType: 'maxillary' | 'mandibular') => number[];
  isToothSelected: (toothNumber: number, type: 'maxillary' | 'mandibular') => boolean;
  isExtractionTypeToothSelected: (extractionType: string, archType: 'maxillary' | 'mandibular', toothNumber: number) => boolean;
  isExtractionTypeSelected: (extractionType: string) => boolean;
  getSelectedExtractionType: () => string | null;
  
  // Combined getters for backward compatibility
  getAllSelectedTeeth: () => number[];
  
  // Cleanup function to remove overlapping teeth
  cleanupOverlappingTeeth: () => void;
}

export const useTeethSelectionStore = create<TeethSelectionState>()(
  persist(
    (set, get) => ({
      // Initial state
      maxillarySelectedTeeth: [],
      mandibularSelectedTeeth: [],
      selectedExtractionType: null,
      extractionTypeTeethSelection: {},
      productExtractions: {},
      defaultExtractionTypes: {},
      
      // Actions for teeth selection
      setMaxillarySelectedTeeth: (teeth: number[]) => {
        // Clear these teeth from all extraction type selections to maintain uniqueness
        const current = get().extractionTypeTeethSelection;
        const updatedState = { ...current };
        
        // Remove these teeth from all extraction types for maxillary arch
        Object.keys(updatedState).forEach(type => {
          if (updatedState[type]?.maxillary) {
            updatedState[type].maxillary = updatedState[type].maxillary.filter(t => !teeth.includes(t));
          }
        });
        
        set({ 
          maxillarySelectedTeeth: teeth,
          extractionTypeTeethSelection: updatedState
        });
      },
      
      setMandibularSelectedTeeth: (teeth: number[]) => {
        // Clear these teeth from all extraction type selections to maintain uniqueness
        const current = get().extractionTypeTeethSelection;
        const updatedState = { ...current };
        
        // Remove these teeth from all extraction types for mandibular arch
        Object.keys(updatedState).forEach(type => {
          if (updatedState[type]?.mandibular) {
            updatedState[type].mandibular = updatedState[type].mandibular.filter(t => !teeth.includes(t));
          }
        });
        
        set({ 
          mandibularSelectedTeeth: teeth,
          extractionTypeTeethSelection: updatedState
        });
      },
      
      toggleMaxillaryTooth: (toothNumber: number) => {
        const current = get().maxillarySelectedTeeth;
        const isCurrentlySelected = current.includes(toothNumber);
        
        if (!isCurrentlySelected) {
          // If adding the tooth, remove it from all extraction type selections first
          const extractionState = get().extractionTypeTeethSelection;
          const updatedExtractionState = { ...extractionState };
          
          // Remove tooth from all extraction types for maxillary arch
          Object.keys(updatedExtractionState).forEach(type => {
            if (updatedExtractionState[type]?.maxillary) {
              updatedExtractionState[type].maxillary = updatedExtractionState[type].maxillary.filter(t => t !== toothNumber);
            }
          });
          
          set({ 
            maxillarySelectedTeeth: [...current, toothNumber],
            extractionTypeTeethSelection: updatedExtractionState
          });
        } else {
          // If removing the tooth, just remove it from general selection
          set({ maxillarySelectedTeeth: current.filter(t => t !== toothNumber) });
        }
      },
      
      toggleMandibularTooth: (toothNumber: number) => {
        const current = get().mandibularSelectedTeeth;
        const isCurrentlySelected = current.includes(toothNumber);
        
        if (!isCurrentlySelected) {
          // If adding the tooth, remove it from all extraction type selections first
          const extractionState = get().extractionTypeTeethSelection;
          const updatedExtractionState = { ...extractionState };
          
          // Remove tooth from all extraction types for mandibular arch
          Object.keys(updatedExtractionState).forEach(type => {
            if (updatedExtractionState[type]?.mandibular) {
              updatedExtractionState[type].mandibular = updatedExtractionState[type].mandibular.filter(t => t !== toothNumber);
            }
          });
          
          set({ 
            mandibularSelectedTeeth: [...current, toothNumber],
            extractionTypeTeethSelection: updatedExtractionState
          });
        } else {
          // If removing the tooth, just remove it from general selection
          set({ mandibularSelectedTeeth: current.filter(t => t !== toothNumber) });
        }
      },
      
      clearMaxillarySelection: () => {
        set({ maxillarySelectedTeeth: [] });
      },
      
      clearMandibularSelection: () => {
        set({ mandibularSelectedTeeth: [] });
      },
      
      clearAllSelections: () => {
        set({ 
          maxillarySelectedTeeth: [], 
          mandibularSelectedTeeth: [],
          selectedExtractionType: null 
        });
      },
      
      // Actions for extraction type selection
      setSelectedExtractionType: (extractionType: string | null) => {
        set({ selectedExtractionType: extractionType });
      },
      
      clearSelectedExtractionType: () => {
        set({ selectedExtractionType: null });
      },
      
      // Actions for per-extraction-type teeth selection
      setExtractionTypeTeeth: (extractionType: string, archType: 'maxillary' | 'mandibular', teeth: number[], preserveOthers: boolean = false) => {
        const current = get().extractionTypeTeethSelection;
        const updatedState = { ...current };
        
        // Only remove teeth from other extraction types if not preserving others
        if (!preserveOthers) {
          Object.keys(updatedState).forEach(type => {
            if (type !== extractionType && updatedState[type]?.[archType]) {
              updatedState[type][archType] = updatedState[type][archType].filter(t => !teeth.includes(t));
            }
          });
        }
        
        // Set teeth for current extraction type
        updatedState[extractionType] = {
          ...updatedState[extractionType],
          [archType]: teeth
        };
        
        set({ extractionTypeTeethSelection: updatedState });
      },
      
      toggleExtractionTypeTooth: (extractionType: string, archType: 'maxillary' | 'mandibular', toothNumber: number) => {
        const current = get().extractionTypeTeethSelection[extractionType]?.[archType] || [];
        const isCurrentlySelected = current.includes(toothNumber);
        
        // If adding the tooth (not removing), remove it from all other extraction types first
        if (!isCurrentlySelected) {
          const currentState = get().extractionTypeTeethSelection;
          const updatedState = { ...currentState };
          
          // Remove tooth from all other extraction types for this arch
          Object.keys(updatedState).forEach(type => {
            if (type !== extractionType && updatedState[type]?.[archType]) {
              updatedState[type][archType] = updatedState[type][archType].filter(t => t !== toothNumber);
            }
          });
          
          // Add tooth to current extraction type
          updatedState[extractionType] = {
            ...updatedState[extractionType],
            [archType]: [...(updatedState[extractionType]?.[archType] || []), toothNumber]
          };
          
          set({ extractionTypeTeethSelection: updatedState });
        } else {
          // If removing the tooth, just remove it from current extraction type
          const currentState = get().extractionTypeTeethSelection;
          set({
            extractionTypeTeethSelection: {
              ...currentState,
              [extractionType]: {
                ...currentState[extractionType],
                [archType]: current.filter(t => t !== toothNumber)
              }
            }
          });
        }
      },
      
      clearExtractionTypeSelection: (extractionType: string, archType: 'maxillary' | 'mandibular') => {
        
        // Directly update the state instead of calling another function to avoid circular dependency
        const currentState = get().extractionTypeTeethSelection;
        set({
          extractionTypeTeethSelection: {
            ...currentState,
            [extractionType]: {
              ...currentState[extractionType],
              [archType]: []
            }
          }
        });
      },
      
      // Actions for product extraction data
      setProductExtractions: (productId: string, extractionData: { extractions: any[]; has_extraction?: string; extraction_options?: any[] }) => {
        set((state) => ({
          productExtractions: {
            ...state.productExtractions,
            [productId]: extractionData
          }
        }));
      },
      
      getProductExtractions: (productId: string) => {
        const state = get();
        return state.productExtractions[productId] || null;
      },
      
      clearProductExtractions: (productId: string) => {
        set((state) => {
          const newProductExtractions = { ...state.productExtractions };
          delete newProductExtractions[productId];
          return { productExtractions: newProductExtractions };
        });
      },
      
      // Actions for default extraction types
      setDefaultExtractionTypes: (productId: string, defaultTypes: string[]) => {
        set((state) => ({
          defaultExtractionTypes: {
            ...state.defaultExtractionTypes,
            [productId]: defaultTypes
          }
        }));
      },
      
      getDefaultExtractionTypes: (productId: string) => {
        const state = get();
        return state.defaultExtractionTypes[productId] || [];
      },
      
      clearDefaultExtractionTypes: (productId: string) => {
        set((state) => {
          const newDefaultExtractionTypes = { ...state.defaultExtractionTypes };
          delete newDefaultExtractionTypes[productId];
          return { defaultExtractionTypes: newDefaultExtractionTypes };
        });
      },
      
      // Getters
      getSelectedTeeth: (type: 'maxillary' | 'mandibular') => {
        return type === 'maxillary' 
          ? get().maxillarySelectedTeeth 
          : get().mandibularSelectedTeeth;
      },
      
      getExtractionTypeTeeth: (extractionType: string, archType: 'maxillary' | 'mandibular') => {
        return get().extractionTypeTeethSelection[extractionType]?.[archType] || [];
      },
      
      isToothSelected: (toothNumber: number, type: 'maxillary' | 'mandibular') => {
        const selectedTeeth = get().getSelectedTeeth(type);
        return selectedTeeth.includes(toothNumber);
      },
      
      isExtractionTypeToothSelected: (extractionType: string, archType: 'maxillary' | 'mandibular', toothNumber: number) => {
        const selectedTeeth = get().getExtractionTypeTeeth(extractionType, archType);
        return selectedTeeth.includes(toothNumber);
      },
      
      isExtractionTypeSelected: (extractionType: string) => {
        const current = get().selectedExtractionType;
        return current === extractionType;
      },
      
      getSelectedExtractionType: () => {
        return get().selectedExtractionType;
      },
      
      // Combined getters for backward compatibility
      getAllSelectedTeeth: () => {
        const state = get();
        return [...state.maxillarySelectedTeeth, ...state.mandibularSelectedTeeth];
      },
      
      // Cleanup function to remove overlapping teeth (only when there are actual conflicts)
      cleanupOverlappingTeeth: () => {
        const state = get();
        const extractionTypes = state.extractionTypeTeethSelection;
        const updatedExtractionTypes = { ...extractionTypes };
        
        // Define priority order for extraction types (higher priority = keep teeth)
        const extractionTypePriority = [
          'Teeth in mouth',
          'Missing teeth', 
          'Will extract on delivery',
          'Has been extracted',
          'Prepped',
          'Implant'
        ];
        
        // Track teeth that have been assigned to extraction types
        const assignedTeeth = {
          maxillary: new Map<number, string[]>(), // tooth -> array of extraction types
          mandibular: new Map<number, string[]>()
        };
        
        // First pass: collect all teeth assigned to extraction types
        Object.keys(extractionTypes).forEach(type => {
          if (extractionTypes[type]?.maxillary) {
            extractionTypes[type].maxillary.forEach(tooth => {
              if (!assignedTeeth.maxillary.has(tooth)) {
                assignedTeeth.maxillary.set(tooth, []);
              }
              assignedTeeth.maxillary.get(tooth)!.push(type);
            });
          }
          if (extractionTypes[type]?.mandibular) {
            extractionTypes[type].mandibular.forEach(tooth => {
              if (!assignedTeeth.mandibular.has(tooth)) {
                assignedTeeth.mandibular.set(tooth, []);
              }
              assignedTeeth.mandibular.get(tooth)!.push(type);
            });
          }
        });
        
        // Second pass: only remove duplicates where the same tooth appears in multiple extraction types
        Object.keys(extractionTypes).forEach(type => {
          if (extractionTypes[type]?.maxillary) {
            const uniqueTeeth = extractionTypes[type].maxillary.filter(tooth => {
              const typesWithTooth = assignedTeeth.maxillary.get(tooth) || [];
              if (typesWithTooth.length > 1) {
                // This tooth appears in multiple extraction types - keep only the highest priority
                const currentPriority = extractionTypePriority.indexOf(type);
                const otherTypes = typesWithTooth.filter(t => t !== type);
                const otherPriorities = otherTypes.map(t => extractionTypePriority.indexOf(t));
                const highestOtherPriority = Math.min(...otherPriorities);
                return currentPriority < highestOtherPriority; // Lower index = higher priority
              }
              return true;
            });
            updatedExtractionTypes[type] = {
              ...updatedExtractionTypes[type],
              maxillary: uniqueTeeth
            };
          }
          
          if (extractionTypes[type]?.mandibular) {
            const uniqueTeeth = extractionTypes[type].mandibular.filter(tooth => {
              const typesWithTooth = assignedTeeth.mandibular.get(tooth) || [];
              if (typesWithTooth.length > 1) {
                // This tooth appears in multiple extraction types - keep only the highest priority
                const currentPriority = extractionTypePriority.indexOf(type);
                const otherTypes = typesWithTooth.filter(t => t !== type);
                const otherPriorities = otherTypes.map(t => extractionTypePriority.indexOf(t));
                const highestOtherPriority = Math.min(...otherPriorities);
                return currentPriority < highestOtherPriority; // Lower index = higher priority
              }
              return true;
            });
            updatedExtractionTypes[type] = {
              ...updatedExtractionTypes[type],
              mandibular: uniqueTeeth
            };
          }
        });
        
        set({ extractionTypeTeethSelection: updatedExtractionTypes });
      },
    }),
    {
      name: 'teeth-selection-storage', // unique name for localStorage
      // Persist all state
      partialize: (state) => ({
        maxillarySelectedTeeth: state.maxillarySelectedTeeth,
        mandibularSelectedTeeth: state.mandibularSelectedTeeth,
        selectedExtractionType: state.selectedExtractionType,
        extractionTypeTeethSelection: state.extractionTypeTeethSelection,
        productExtractions: state.productExtractions,
        defaultExtractionTypes: state.defaultExtractionTypes
      }),
      // Skip hydration to prevent localStorage from overriding state on resize
      skipHydration: false,
      // Use merge strategy to avoid overriding existing state
      merge: (persistedState, currentState) => {
        // Only use persisted state if current state is empty
        const persisted = persistedState as Partial<TeethSelectionState>;
        return {
          ...currentState,
          // Only restore from localStorage if current state has no selections
          maxillarySelectedTeeth: currentState.maxillarySelectedTeeth.length > 0
            ? currentState.maxillarySelectedTeeth
            : (persisted?.maxillarySelectedTeeth || []),
          mandibularSelectedTeeth: currentState.mandibularSelectedTeeth.length > 0
            ? currentState.mandibularSelectedTeeth
            : (persisted?.mandibularSelectedTeeth || []),
          selectedExtractionType: currentState.selectedExtractionType
            ? currentState.selectedExtractionType
            : (persisted?.selectedExtractionType || null),
          extractionTypeTeethSelection: currentState.extractionTypeTeethSelection && Object.keys(currentState.extractionTypeTeethSelection).length > 0
            ? currentState.extractionTypeTeethSelection
            : (persisted?.extractionTypeTeethSelection || {}),
          productExtractions: currentState.productExtractions && Object.keys(currentState.productExtractions).length > 0
            ? currentState.productExtractions
            : (persisted?.productExtractions || {}),
          defaultExtractionTypes: currentState.defaultExtractionTypes && Object.keys(currentState.defaultExtractionTypes).length > 0
            ? currentState.defaultExtractionTypes
            : (persisted?.defaultExtractionTypes || {}),
        };
      },
    }
  )
);
