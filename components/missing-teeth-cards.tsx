"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { getToothMappingColor } from '@/lib/tooth-mapping-materials';
import { useTeethSelectionStore } from '@/stores/teeth-selection-store';
import { getAllExtractionTypes } from '@/lib/extraction-type-colors';
import { VALIDATION_RULES, ValidationData, ValidationResult } from '@/lib/validation-rules';

export interface MissingTeethCardsProps {
  type: 'maxillary' | 'mandibular';
  // Legacy props for backward compatibility - will be replaced by Zustand store
  selectedTeeth?: number[];
  missingTeeth: number[];
  extractedTeeth: number[];
  willExtractTeeth: number[];
  onAllTeethMissing: () => void;
  onTeethInMouthClick: () => void;
  onMissingTeethClick: () => void;
  onWillExtractClick: () => void;
  onAutoSelectTeethInMouth?: (teeth: number[]) => void;
  isCaseSubmitted?: boolean;
  // New props for color application
  selectedWillExtractForColor?: boolean;
  onWillExtractColorSelect?: (selected: boolean) => void;
  // Tooth mapping toolbar integration
  selectedToothMappingMode?: string | null;
  // Product extraction data to control visibility
  productDetails?: {
    has_extraction?: string;
    extractions?: any[];
    extraction_options?: any[];
    data?: {
      extractions?: any[];
    };
  } | null;
  // Hide/show individual cards
  showTeethInMouth?: boolean;
  showMissingTeeth?: boolean;
  showWillExtract?: boolean;
  showHasBeenExtracted?: boolean;
  showPrepped?: boolean;
  showImplant?: boolean;
  // Additional extraction type handlers
  onHasBeenExtractedClick?: () => void;
  onPreppedClick?: () => void;
  onImplantClick?: () => void;
  // Tooth status tracking (source of truth)
  currentToothStatuses?: { [toothNumber: number]: string };
  // Callback to clear teeth selection when switching extraction types
  onClearTeethSelection?: () => void;
  // New props for 3D chart integration
  onExtractionTypeSelect?: (extractionType: string | null) => void;
  onTeethSelectionChange?: (teeth: number[], archType?: 'maxillary' | 'mandibular') => void;
  // Product ID for default extraction types lookup
  productId?: string;
  // Direct extraction data prop
  extractionData?: any[];
  // Selected product name for Zustand store lookup
  selectedProduct?: string;
  // Note: selectedExtractionType and teeth selection are now managed by Zustand store
}

/**
 * MissingTeethCards Component
 * 
 * This component displays extraction type cards based on the selected product's configuration.
 * It only shows extraction types that are marked as default for the product:
 * - Default types (is_default="Yes")
 * 
 * If no default extractions are found, no cards will be displayed (no fallback cards).
 */
export const MissingTeethCards: React.FC<MissingTeethCardsProps> = ({
  type,
  selectedTeeth = [], // Default to empty array for backward compatibility
  missingTeeth,
  extractedTeeth,
  willExtractTeeth,
  onAllTeethMissing,
  onTeethInMouthClick,
  onMissingTeethClick,
  onWillExtractClick,
  onAutoSelectTeethInMouth,
  isCaseSubmitted = false,
  selectedWillExtractForColor = false,
  onWillExtractColorSelect,
  selectedToothMappingMode = null,
  productDetails = null,
  showTeethInMouth = true,
  showMissingTeeth = true,
  showWillExtract = true,
  showHasBeenExtracted = false,
  showPrepped = false,
  showImplant = false,
  onHasBeenExtractedClick,
  onPreppedClick,
  onImplantClick,
  currentToothStatuses = {},
  onClearTeethSelection,
  onExtractionTypeSelect,
  onTeethSelectionChange,
  productId,
  extractionData,
  selectedProduct
}) => {
  // Use new Zustand store for independent teeth selection and extraction type
  const {
    selectedExtractionType,
    setSelectedExtractionType,
    isExtractionTypeSelected,
    getSelectedTeeth,
    getExtractionTypeTeeth,
    setExtractionTypeTeeth,
    toggleExtractionTypeTooth,
    clearMaxillarySelection,
    clearMandibularSelection,
    getDefaultExtractionTypes,
    setDefaultExtractionTypes,
    cleanupOverlappingTeeth,
    getProductExtractions,
    productExtractions
  } = useTeethSelectionStore();
  
  // Get the current selected teeth for this arch type from Zustand store
  const currentSelectedTeeth = getSelectedTeeth(type);
  
  // Get teeth selection for the currently selected extraction type
  const effectiveSelectedTeeth = React.useMemo(() => {
    if (selectedExtractionType) {
      // If an extraction type is selected, use the per-extraction-type selection
      return getExtractionTypeTeeth(selectedExtractionType, type);
    } else {
      // Otherwise, use the general teeth selection
      return currentSelectedTeeth.length > 0 ? currentSelectedTeeth : selectedTeeth;
    }
  }, [selectedExtractionType, getExtractionTypeTeeth, type, currentSelectedTeeth, selectedTeeth]);

  // Reduced logging to avoid console spam
  const archTeeth = type === 'maxillary'
    ? Array.from({ length: 16 }, (_, i) => i + 1)
    : Array.from({ length: 16 }, (_, i) => i + 17);

  // Calculate teeth for each extraction type from currentToothStatuses
  const teethByExtractionType = React.useMemo(() => {
    const result: { [key: string]: number[] } = {
      'Teeth in mouth': [],
      'Missing teeth': [],
      'Will extract on delivery': [],
      'Has been extracted': [],
      'Prepped': [],
      'Implant': []
    };

    // Get teeth assigned to each extraction type from all teeth in arch
    archTeeth.forEach(tooth => {
      const status = currentToothStatuses[tooth];
      // Only add teeth that have an explicit status - don't default to "Teeth in mouth"
      if (status && result[status]) {
        result[status].push(tooth);
      }
    });

    return result;
  }, [currentToothStatuses, archTeeth]);

  // Teeth in mouth = teeth that have explicit "Teeth in mouth" status from Zustand store
  const teethInMouth = teethByExtractionType['Teeth in mouth'];

  // Note: We now handle extraction type filtering directly in filteredAvailableExtractionTypes
  // This simplifies the logic and ensures we only show product-specific extraction types

  // Get default extraction types for this product from Zustand store
  const defaultExtractionTypes = React.useMemo(() => {
    if (!productId) return [];
    return getDefaultExtractionTypes(productId);
  }, [productId, getDefaultExtractionTypes]);

  // Cleanup overlapping teeth when component mounts
  React.useEffect(() => {
    cleanupOverlappingTeeth();
  }, [cleanupOverlappingTeeth]);

  // Set default extraction types when product changes
  React.useEffect(() => {
    if (productId && productDetails) {
      // Handle different data structures: direct array, nested in data, or nested in extractions
      let extractionsForDefault = productDetails?.data?.extractions || productDetails?.extractions || productDetails;
      
      // If productDetails is an array directly (from API), use it
      if (Array.isArray(productDetails)) {
        extractionsForDefault = productDetails;
      }
      
      if (extractionsForDefault && Array.isArray(extractionsForDefault)) {
        // Extract default extraction types from product details
        const defaultTypes = extractionsForDefault
          .filter((extraction: any) => extraction.is_default === "Yes")
          .map((extraction: any) => extraction.name);
        
        setDefaultExtractionTypes(productId, defaultTypes);
      }
    }
  }, [productId, productDetails, setDefaultExtractionTypes]);

  // Separate effect for auto-selecting teeth for default extraction types
  React.useEffect(() => {
    if (productId && defaultExtractionTypes.length > 0) {
      const allTeethInArch = type === 'maxillary' 
        ? Array.from({ length: 16 }, (_, i) => i + 1)
        : Array.from({ length: 16 }, (_, i) => i + 17);
      
      // Auto-select teeth for each default extraction type
      defaultExtractionTypes.forEach(defaultType => {
        const existingTeeth = getExtractionTypeTeeth(defaultType, type);
        if (existingTeeth.length === 0) {
          setExtractionTypeTeeth(defaultType, type, allTeethInArch, true);
          
          // Notify 3D chart about auto-selection
          if (onTeethSelectionChange) {
            onTeethSelectionChange(allTeethInArch, type);
          }
          
          console.log(`Auto-selected all teeth for default extraction type: ${defaultType}`, {
            extractionType: defaultType,
            archType: type,
            selectedTeeth: allTeethInArch
          });
        }
      });
    }
  }, [productId, defaultExtractionTypes, type, getExtractionTypeTeeth, setExtractionTypeTeeth, onTeethSelectionChange]);

  // Get extraction types based on product configuration flags
  // Shows only extraction types where: is_default="Yes" (no fallback cards)
  const filteredAvailableExtractionTypes = React.useMemo(() => {
    // Get the product extractions to determine which types to show
    // Priority: 1. extractionData prop, 2. Zustand store, 3. localStorage caseDesignCache, 4. productDetails
    let extractions = extractionData;
    
    // If no extractionData prop, try to get from Zustand store first (since we're storing it there)
    if (!extractions && productId) {
      // Try full product ID first
      let storeData = getProductExtractions(productId);
      
      // If not found and productId has a timestamp (format: "baseId-timestamp"), try base ID
      if (!storeData && productId.includes('-')) {
        const baseProductId = productId.split('-')[0];
        storeData = getProductExtractions(baseProductId);
        if (storeData) {
          console.log('✅ Found extraction data using base product ID:', baseProductId, 'for product:', productId);
        }
      }
      
      extractions = storeData?.extractions;
    }
    
    // If still no extractions, try to get from localStorage caseDesignCache
    if (!extractions && typeof window !== "undefined") {
      try {
        const caseDesignCacheStr = localStorage.getItem("caseDesignCache");
        if (caseDesignCacheStr) {
          const caseDesignCache = JSON.parse(caseDesignCacheStr);
          
          // Try to find extraction data from products array
          if (caseDesignCache.products && Array.isArray(caseDesignCache.products)) {
            // If we have a productId, try to match it
            if (productId) {
              // Try full product ID match
              let product = caseDesignCache.products.find((p: any) => p.id === productId);
              
              // If not found and productId has a timestamp, try base ID match
              if (!product && productId.includes('-')) {
                const baseProductId = productId.split('-')[0];
                product = caseDesignCache.products.find((p: any) => {
                  const pBaseId = p.id?.split('-')[0];
                  return pBaseId === baseProductId;
                });
              }
              
              if (product) {
                extractions = product.extractions || product.data?.extractions;
                if (extractions) {
                  console.log('✅ Found extraction data from localStorage caseDesignCache.products for product:', productId);
                }
              }
            }
            
            // If still no extractions, try first product with extraction data
            if (!extractions) {
              for (const product of caseDesignCache.products) {
                const productExtractions = product.extractions || product.data?.extractions;
                if (productExtractions && Array.isArray(productExtractions) && productExtractions.length > 0) {
                  extractions = productExtractions;
                  console.log('✅ Found extraction data from localStorage caseDesignCache.products (first available)');
                  break;
                }
              }
            }
          }
          
          // Also try slipData.selectedProduct
          if (!extractions && caseDesignCache.slipData?.selectedProduct) {
            const selectedProduct = caseDesignCache.slipData.selectedProduct;
            extractions = selectedProduct.extractions || selectedProduct.data?.extractions;
            if (extractions) {
              console.log('✅ Found extraction data from localStorage caseDesignCache.slipData.selectedProduct');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error reading caseDesignCache from localStorage:', error);
      }
    }
    
    // If still no extractions, try to get from Zustand store using selectedProduct name
    if (!extractions && selectedProduct) {
      // Try to find the product ID from the selectedProduct name by checking all stored extractions
      // Find the product ID that matches the selectedProduct name
      for (const [productId, data] of Object.entries(productExtractions)) {
        if (data.extractions && data.extractions.length > 0) {
          // This is a heuristic - if we have extraction data for this product, use it
          extractions = data.extractions;
          break;
        }
      }
    }
    
    // If still no extractions and no specific product selected, use the first available product with extraction data
    if (!extractions && !selectedProduct && !productId) {
      for (const [productId, data] of Object.entries(productExtractions)) {
        if (data.extractions && data.extractions.length > 0) {
          extractions = data.extractions;
          break;
        }
      }
    }
    
    // Fallback to productDetails if still no extractions
    if (!extractions) {
      extractions = productDetails?.data?.extractions || productDetails?.extractions;
      
      // If productDetails is an array directly (from API), use it
      if (Array.isArray(productDetails)) {
        extractions = productDetails;
      }
    }

    // If no product extractions are available, return empty array (no cards should be shown)
    if (!extractions || !Array.isArray(extractions) || extractions.length === 0) {
      return [];
    }

    // Filter based on product configuration: show extraction types where is_default="Yes" OR is_required="Yes" OR is_optional="Yes"
    // This matches the logic in shouldShowTeethCards function
    const availableExtractions = Array.isArray(extractions) ? extractions.filter((extraction: any) => {
      return extraction.status === "Active" && (
        extraction.is_default === "Yes" ||
        extraction.is_required === "Yes" ||
        extraction.is_optional === "Yes"
      );
    }) : [];

    // If no available extractions found, return empty array (no cards should be shown)
    if (availableExtractions.length === 0) {
      return [];
    }

    // Map to the format expected by the component
    return availableExtractions.map((extraction: any) => ({
      name: extraction.name,
      color: extraction.color,
      code: extraction.code,
      id: extraction.id
    }));
  }, [productDetails, extractionData, productId, selectedProduct, getProductExtractions, productExtractions]);

  // Helper function to get extraction requirements
  const getExtractionRequirements = React.useCallback((extractionTypeName: string): string | null => {
    // Get extraction data
    let extractions = extractionData;
    if (!extractions && productId) {
      // Try full product ID first
      let storeData = getProductExtractions(productId);
      
      // If not found and productId has a timestamp, try base ID
      if (!storeData && productId.includes('-')) {
        const baseProductId = productId.split('-')[0];
        storeData = getProductExtractions(baseProductId);
      }
      
      extractions = storeData?.extractions;
    }
    
    // If still no extractions, try localStorage caseDesignCache
    if (!extractions && typeof window !== "undefined") {
      try {
        const caseDesignCacheStr = localStorage.getItem("caseDesignCache");
        if (caseDesignCacheStr) {
          const caseDesignCache = JSON.parse(caseDesignCacheStr);
          
          if (productId && caseDesignCache.products && Array.isArray(caseDesignCache.products)) {
            let product = caseDesignCache.products.find((p: any) => p.id === productId);
            if (!product && productId.includes('-')) {
              const baseProductId = productId.split('-')[0];
              product = caseDesignCache.products.find((p: any) => {
                const pBaseId = p.id?.split('-')[0];
                return pBaseId === baseProductId;
              });
            }
            if (product) {
              extractions = product.extractions || product.data?.extractions;
            }
          }
          
          if (!extractions && caseDesignCache.slipData?.selectedProduct) {
            extractions = caseDesignCache.slipData.selectedProduct.extractions || 
                         caseDesignCache.slipData.selectedProduct.data?.extractions;
          }
        }
      } catch (error) {
        console.error('❌ Error reading caseDesignCache from localStorage:', error);
      }
    }

    if (!extractions || !Array.isArray(extractions)) {
      return null;
    }

    // Find this extraction type
    const extraction = extractions.find((ext: any) => ext.name === extractionTypeName);
    if (!extraction) {
      return null;
    }

    // Build requirements message
    const parts: string[] = [];

    if (extraction.min_teeth !== null && extraction.min_teeth !== undefined) {
      parts.push(`Min: ${extraction.min_teeth} ${extraction.min_teeth === 1 ? 'tooth' : 'teeth'}`);
    }

    if (extraction.max_teeth !== null && extraction.max_teeth !== undefined) {
      parts.push(`Max: ${extraction.max_teeth} ${extraction.max_teeth === 1 ? 'tooth' : 'teeth'}`);
    }

    if (parts.length === 0) {
      return null;
    }

    return parts.join(' | ');
  }, [extractionData, productId, getProductExtractions]);

  // Helper function to validate a specific extraction type
  const validateExtractionType = React.useCallback((extractionTypeName: string): ValidationResult | null => {
    // Get teeth for this extraction type
    const teethForType = getExtractionTypeTeeth(extractionTypeName, type);

    // Get extraction data for validation
    let extractions = extractionData;
    if (!extractions && productId) {
      // Try full product ID first
      let storeData = getProductExtractions(productId);
      
      // If not found and productId has a timestamp, try base ID
      if (!storeData && productId.includes('-')) {
        const baseProductId = productId.split('-')[0];
        storeData = getProductExtractions(baseProductId);
      }
      
      extractions = storeData?.extractions;
    }
    
    // If still no extractions, try localStorage caseDesignCache
    if (!extractions && typeof window !== "undefined") {
      try {
        const caseDesignCacheStr = localStorage.getItem("caseDesignCache");
        if (caseDesignCacheStr) {
          const caseDesignCache = JSON.parse(caseDesignCacheStr);
          
          if (productId && caseDesignCache.products && Array.isArray(caseDesignCache.products)) {
            let product = caseDesignCache.products.find((p: any) => p.id === productId);
            if (!product && productId.includes('-')) {
              const baseProductId = productId.split('-')[0];
              product = caseDesignCache.products.find((p: any) => {
                const pBaseId = p.id?.split('-')[0];
                return pBaseId === baseProductId;
              });
            }
            if (product) {
              extractions = product.extractions || product.data?.extractions;
            }
          }
          
          if (!extractions && caseDesignCache.slipData?.selectedProduct) {
            extractions = caseDesignCache.slipData.selectedProduct.extractions || 
                         caseDesignCache.slipData.selectedProduct.data?.extractions;
          }
        }
      } catch (error) {
        console.error('❌ Error reading caseDesignCache from localStorage:', error);
      }
    }

    if (!extractions || !Array.isArray(extractions)) {
      return null;
    }

    // Find the specific extraction type being validated
    const currentExtraction = extractions.find((ext: any) => ext.name === extractionTypeName);
    if (!currentExtraction) {
      return null; // No validation if extraction type not found
    }

    // Build validation data - only for the current extraction type
    const validationData: ValidationData = {
      selectedTeeth: teethForType,
      toothStatuses: teethForType.reduce((acc, tooth) => {
        acc[tooth] = extractionTypeName;
        return acc;
      }, {} as { [key: number]: string }),
      productName: selectedProduct || '',
      archType: type,
      productExtractions: extractions
    };

    // Run extraction validation rules - but only validate the current extraction type
    const extractionRules = VALIDATION_RULES.filter(rule =>
      rule.id.includes('extraction')
    );

    for (const rule of extractionRules) {
      try {
        // For EX2 rule (teeth count validation), we need to check only the current extraction type
        if (rule.id === 'EX2_extraction_teeth_count_validation') {
          // Only validate if this extraction type has constraints
          if (currentExtraction.min_teeth === null && currentExtraction.max_teeth === null) {
            continue; // No constraints for this extraction type
          }

          const teethCount = teethForType.length;

          // Check min_teeth constraint
          if (currentExtraction.min_teeth !== null && currentExtraction.min_teeth !== undefined && teethCount < currentExtraction.min_teeth) {
            return {
              isValid: false,
              errorType: 'error',
              title: 'Insufficient Teeth Selected',
              message: `"${extractionTypeName}" requires at least ${currentExtraction.min_teeth} tooth${currentExtraction.min_teeth > 1 ? 'es' : ''}, but only ${teethCount} selected tooth${teethCount === 1 ? ' has' : 's have'} this status. (${teethForType.length} tooth${teethForType.length === 1 ? '' : 's'} selected in UI: ${teethForType.join(', ')})`,
              affectedTeeth: teethForType,
              solution: `Please assign "${extractionTypeName}" status to at least ${currentExtraction.min_teeth} selected tooth${currentExtraction.min_teeth > 1 ? 'es' : ''}.`,
              suggestedAction: {
                label: 'Assign Status to More Teeth',
                action: 'changeStatus',
                targetStatus: extractionTypeName
              }
            };
          }

          // Check max_teeth constraint
          if (currentExtraction.max_teeth !== null && currentExtraction.max_teeth !== undefined && teethCount > currentExtraction.max_teeth) {
            return {
              isValid: false,
              errorType: 'error',
              title: 'Too Many Teeth Selected',
              message: `"${extractionTypeName}" allows at most ${currentExtraction.max_teeth} tooth${currentExtraction.max_teeth > 1 ? 'es' : ''}, but ${teethCount} selected tooth${teethCount === 1 ? ' has' : 's have'} this status.`,
              affectedTeeth: teethForType,
              solution: `Please change the status of some selected teeth from "${extractionTypeName}" to a different status.`,
              suggestedAction: {
                label: 'Change Status of Some Teeth',
                action: 'changeStatus'
              }
            };
          }
        } else {
          // For other rules, run normally but they should only check the current extraction type
          const result = rule.checkFunction(validationData);
          if (!result.isValid) {
            // Only return error if it's related to the current extraction type
            // Check if the error message mentions the current extraction type
            if (result.message?.includes(extractionTypeName) || result.solution?.includes(extractionTypeName)) {
              return result;
            }
            // Otherwise, continue to next rule
          }
        }
      } catch (error) {
        console.error(`Error running validation rule ${rule.id}:`, error);
      }
    }

    return null;
  }, [getExtractionTypeTeeth, type, extractionData, productId, getProductExtractions, selectedProduct]);

  // Calculate total selected teeth across all extraction types for this arch
  const totalSelectedTeethCount = React.useMemo(() => {
    const allTeeth: number[] = [];

    // Use only the filtered extraction types that are configured for this product
    filteredAvailableExtractionTypes.forEach(extractionType => {
      const teethForType = getExtractionTypeTeeth(extractionType.name, type);
      if (teethForType.length > 0) {
        allTeeth.push(...teethForType);
      }
    });

    // Remove duplicates and count unique teeth
    const uniqueTeeth = [...new Set(allTeeth)];
    const totalCount = uniqueTeeth.length;

    return totalCount;
  }, [filteredAvailableExtractionTypes, getExtractionTypeTeeth, type]);

  // Get all selected teeth across all extraction types for this arch
  const allSelectedTeeth = React.useMemo(() => {
    const allTeeth: number[] = [];
    
    // Use only the filtered extraction types that are configured for this product
    filteredAvailableExtractionTypes.forEach(extractionType => {
      const teethForType = getExtractionTypeTeeth(extractionType.name, type);
      if (teethForType.length > 0) {
        allTeeth.push(...teethForType);
      }
    });
    
    // Remove duplicates and sort
    const uniqueTeeth = [...new Set(allTeeth)].sort((a, b) => a - b);
    
    return uniqueTeeth;
  }, [filteredAvailableExtractionTypes, getExtractionTypeTeeth, type]);

  // Reduced logging to avoid console spam

  const formatTeethList = (teeth: number[]) => {
    if (teeth.length === 0) return 'None';
    if (teeth.length <= 8) return teeth.join(', ');
    return `${teeth.slice(0, 8).join(', ')}... (+${teeth.length - 8} more)`;
  };

  // Enhanced function to format teeth with better visual separation
  const formatTeethListWithVisual = (teeth: number[], extractionTypeName?: string, bgColor?: string) => {
    if (teeth.length === 0) return 'None';
    
    // Get the appropriate text color for this extraction type
    const textColor = bgColor ? getTextColor(bgColor, extractionTypeName) : '#000000';
    
    // Show all teeth without maxDisplay limitation
    return teeth.map(tooth => (
      <span key={tooth} className="text-xs font-bold mx-0.5" style={{ color: textColor }}>
        {tooth}
      </span>
    ));
  };

  // Determine text color based on background color brightness
  const getTextColor = (bgColor: string, extractionTypeName?: string): string => {
    // Special case for "Will extract on delivery" - always use white text
    if (extractionTypeName === 'Will extract on delivery') {
      return '#FFFFFF';
    }
    
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate perceived brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return white for dark backgrounds, black for light backgrounds
    return brightness < 128 ? '#FFFFFF' : '#000000';
  };

  // Add a ref to track if we're currently processing a click to prevent rapid clicking
  const isProcessingClick = React.useRef(false);
  
  // State to track which tooltip is being hovered
  const [hoveredTooltip, setHoveredTooltip] = React.useState<string | null>(null);

  // Generic handler for extraction type clicks
  const handleExtractionTypeClick = (extractionTypeName: string) => {
    if (isCaseSubmitted || isProcessingClick.current) return;

    // Set processing flag to prevent rapid clicking
    isProcessingClick.current = true;

    // Check if this extraction type is currently selected using Zustand
    const isCurrentlySelected = isExtractionTypeSelected(extractionTypeName);
    const newValue = isCurrentlySelected ? null : extractionTypeName;

    // Toggle active extraction type selection using Zustand
    setSelectedExtractionType(newValue);

    // Notify 3D chart about extraction type selection
    if (onExtractionTypeSelect) {
      onExtractionTypeSelect(newValue);
    }

    // Handle teeth selection when clicking on cards
    if (newValue && !isCurrentlySelected) {
      // Get existing teeth selection for this extraction type
      const existingTeeth = getExtractionTypeTeeth(extractionTypeName, type);
      
      // If there are already teeth selected for this extraction type, preserve them
      if (existingTeeth.length > 0) {
        // Keep existing selection and notify 3D chart
        if (onTeethSelectionChange) {
          onTeethSelectionChange(existingTeeth, type);
        }
      } else {
        // Only auto-select if no existing selection
        // Check if this extraction type is marked as default
        let extractionsForCheck = productDetails?.data?.extractions || productDetails?.extractions || productDetails;
        
        // If productDetails is an array directly (from API), use it
        if (Array.isArray(productDetails)) {
          extractionsForCheck = productDetails;
        }
        
        const isDefaultExtraction = Array.isArray(extractionsForCheck) ? extractionsForCheck.find((ext: any) => 
          ext.name === extractionTypeName && ext.is_default === "Yes"
        ) : null;
        
        // Get teeth that should be selected for this extraction type
        const teethToSelect = teethByExtractionType[extractionTypeName] || [];
        
        if (teethToSelect.length > 0) {
          // Set the teeth selection for this extraction type (preserve others when auto-selecting)
          setExtractionTypeTeeth(extractionTypeName, type, teethToSelect, true);
          
          // Also update the general teeth selection to reflect in 3D chart
          if (onTeethSelectionChange) {
            onTeethSelectionChange(teethToSelect, type);
          }
        } else if (isDefaultExtraction || extractionTypeName === 'Teeth in mouth') {
          // Auto-select all teeth for default extraction types or "Teeth in mouth"
          const allTeethInArch = type === 'maxillary' 
            ? Array.from({ length: 16 }, (_, i) => i + 1)
            : Array.from({ length: 16 }, (_, i) => i + 17);
          
          // Set all teeth for this extraction type (preserve others when auto-selecting)
          setExtractionTypeTeeth(extractionTypeName, type, allTeethInArch, true);
          
          // Also update the general teeth selection to reflect in 3D chart
          if (onTeethSelectionChange) {
            onTeethSelectionChange(allTeethInArch, type);
          }
        } else {
          // For other extraction types, don't auto-select anything - let user choose
          setExtractionTypeTeeth(extractionTypeName, type, [], true);
          if (onTeethSelectionChange) {
            onTeethSelectionChange([], type);
          }
        }
      }
    } else if (isCurrentlySelected) {
      // If deselecting, preserve the teeth selection - don't clear it
      // Just notify 3D chart about the current selection
      const currentTeeth = getExtractionTypeTeeth(extractionTypeName, type);
      if (onTeethSelectionChange) {
        onTeethSelectionChange(currentTeeth, type);
      }
    }

    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessingClick.current = false;
    }, 100);
  };

  // Notify 3D chart when teeth selection changes
  React.useEffect(() => {
    if (onTeethSelectionChange && effectiveSelectedTeeth.length > 0) {
      onTeethSelectionChange(effectiveSelectedTeeth, type);
    }
  }, [effectiveSelectedTeeth, onTeethSelectionChange, type]);


  // No viewport change handling needed - Zustand store maintains state automatically

  // Check if there are any extraction types to show
  if (filteredAvailableExtractionTypes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* All Teeth Missing Button - Only show when there are selected teeth and missing teeth extraction type exists, and case is not submitted */}
      {!isCaseSubmitted && effectiveSelectedTeeth.length > 0 && filteredAvailableExtractionTypes.some((et: any) => et.name === 'Missing teeth') && (
        <Button
          onClick={onAllTeethMissing}
          disabled={isCaseSubmitted}
          className={`w-full h-12 rounded-lg border-2 transition-all duration-200 ${
            isCaseSubmitted
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
          }`}
          style={{
            backgroundColor: '#F5F5F5',
            borderColor: '#D1D5DB',
            color: '#374151'
          }}
        >
          <span className="text-sm font-medium">All teeth missing</span>
        </Button>
      )}

      {/* Bordered container with tooltip for extraction type cards */}
      <div className={`${!selectedExtractionType ? 'border-4 border-amber-300 rounded-lg p-3 bg-gradient-to-r from-amber-50 to-yellow-50' : ''}`}>
        {/* Tooltip - Only show when no extraction type is selected */}
        {!selectedExtractionType && (
          <div className="mb-3 flex items-center justify-center">
            <p className="text-xs font-bold text-amber-900">Click to select extraction type and start</p>
          </div>
        )}

        {/* Dynamic Extraction Type Cards */}
        <div className="space-y-2">
        {filteredAvailableExtractionTypes
          .filter((extractionType) => {
            // Hide "Missing teeth" card when case is submitted
            if (isCaseSubmitted && extractionType.name === 'Missing teeth') {
              return false;
            }
            return true;
          })
          .map((extractionType: any) => {
        const isSelected = selectedExtractionType === extractionType.name;
        const textColor = getTextColor(extractionType.color, extractionType.name);

        // Get teeth for this extraction type
        // Always show the teeth that have been selected for this specific extraction type
        const teethForType = getExtractionTypeTeeth(extractionType.name, type);


        // Get validation result for this extraction type
        const validationResult = validateExtractionType(extractionType.name);
        const requirements = getExtractionRequirements(extractionType.name);

        // Determine validation status
        const hasError = validationResult && validationResult.errorType === 'error';
        const hasWarning = validationResult && validationResult.errorType === 'warning';
        const isValidated = !hasError && !hasWarning && teethForType.length > 0;
        
        // Only show border/icon when there's an actual validation issue
        const showValidationIndicator = hasError || hasWarning;

        return (
          <div key={extractionType.name} className="relative">
            <div
              className={`w-full min-h-[60px] rounded-lg flex items-center justify-center px-3 py-2 transition-all duration-300 ease-in-out relative ${
                isCaseSubmitted
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:shadow-lg hover:scale-[1.03] active:scale-[0.98]'
              } ${
                isSelected
                  ? showValidationIndicator
                    ? hasError
                      ? 'border-4 border-red-600 shadow-2xl ring-4 ring-red-300 ring-opacity-50 transform scale-[1.04]'
                      : 'border-4 border-yellow-600 shadow-2xl ring-4 ring-yellow-300 ring-opacity-50 transform scale-[1.04]'
                    : 'border-4 border-blue-600 shadow-2xl ring-4 ring-blue-300 ring-opacity-50 transform scale-[1.04] animate-pulse-slow'
                  : showValidationIndicator
                    ? hasError
                      ? 'border-4 border-red-500 hover:border-red-600 hover:shadow-red-200'
                      : 'border-4 border-yellow-500 hover:border-yellow-600 hover:shadow-yellow-200'
                    : 'border-2 hover:border-blue-400 hover:shadow-blue-200'
              }`}
              style={{
                backgroundColor: extractionType.color,
                borderColor: isSelected 
                  ? (showValidationIndicator ? (hasError ? '#DC2626' : '#D97706') : '#2563EB')
                  : (showValidationIndicator ? (hasError ? '#EF4444' : '#F59E0B') : extractionType.color),
                boxShadow: isSelected
                  ? showValidationIndicator
                    ? hasError
                      ? '0 0 0 4px rgba(220, 38, 38, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 20px rgba(220, 38, 38, 0.4)'
                      : '0 0 0 4px rgba(217, 119, 6, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 20px rgba(217, 119, 6, 0.4)'
                    : '0 0 0 4px rgba(59, 130, 246, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 20px rgba(59, 130, 246, 0.4)'
                  : undefined,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onClick={() => {
                if (!isCaseSubmitted) {
                  handleExtractionTypeClick(extractionType.name);
                }
              }}
            >
              <div className="flex flex-col items-center text-center w-full">
                <div className="flex items-center gap-1 mb-1 relative w-full justify-center">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: textColor }}
                  >
                    {extractionType.name}
                  </span>
                  {isSelected && !showValidationIndicator && (
                    <div className="relative">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping absolute"></div>
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  {/* Question mark icon for validation errors/warnings - only show when there's an issue, hover to show tooltip */}
                  {showValidationIndicator && (
                    <div 
                      className="relative"
                      onMouseEnter={() => setHoveredTooltip(extractionType.name)}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <div className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-help">
                        <svg 
                          className="w-4 h-4" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          style={{ color: hasError ? '#DC2626' : '#D97706' }}
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      {/* Tooltip on hover - styled like submit case popover */}
                      <div 
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none transition-opacity duration-200 z-50" 
                        style={{ 
                          minWidth: '300px',
                          opacity: hoveredTooltip === extractionType.name ? 1 : 0
                        }}
                      >
                        <div className="bg-white border-2 border-amber-200 rounded-lg shadow-xl p-3 relative">
                          {/* Arrow pointing down */}
                          <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-amber-200 transform rotate-45" />
                          
                          {/* Content */}
                          <div className="relative z-10 flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                            </div>
                            
                            {/* Message */}
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {validationResult.solution || validationResult.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced teeth display */}
                <div className="w-full">
                  {teethForType.length > 0 ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex flex-wrap justify-center gap-1 max-w-full">
                        {formatTeethListWithVisual(teethForType, extractionType.name, extractionType.color)}
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-xs font-medium"
                      style={{ color: textColor, opacity: 0.7 }}
                    >
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      </div>

    </div>
  );
};
