import { useState, useCallback, useMemo, useRef } from 'react';
import { validationEngine } from '@/lib/validation-engine';
import { ValidationData, ValidationResult } from '@/lib/validation-rules';

interface UseDentalValidationProps {
  selectedTeeth: number[];
  toothStatuses: { [toothNumber: number]: string };
  productName: string;
  archType: 'maxillary' | 'mandibular';
  hasScans?: boolean;
  implantCount?: number;
  productExtractions?: Array<{
    name: string;
    is_required: string;
    is_optional: string;
    is_default: string;
    min_teeth?: number | null;
    max_teeth?: number | null;
  }>;
}

interface ChartConfiguration {
  lockChart: boolean;
  hideChart: boolean;
  autoSelectFullArch: boolean;
  scanRequired: boolean;
}

interface UseDentalValidationReturn {
  validate: () => ValidationResult | null;
  validateAll: () => ValidationResult[];
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  currentValidation: ValidationResult | null;
  showValidationModal: boolean;
  openValidationModal: (result: ValidationResult) => void;
  closeValidationModal: () => void;
  validateAndShowModal: () => boolean;
  validateExtractionRules: () => boolean;
  chartConfiguration: ChartConfiguration;
}

export const useDentalValidation = ({
  selectedTeeth,
  toothStatuses,
  productName,
  archType,
  hasScans = false,
  implantCount = 0,
  productExtractions
}: UseDentalValidationProps): UseDentalValidationReturn => {
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const lastClosedTimeRef = useRef<number>(0);

  // Memoize validation data to prevent unnecessary recalculations
  const validationData = useMemo((): ValidationData => ({
    selectedTeeth,
    toothStatuses,
    productName,
    archType,
    hasScans,
    implantCount,
    productExtractions
  }), [selectedTeeth, toothStatuses, productName, archType, hasScans, implantCount, productExtractions]);

  // Validate and get the first critical issue
  const validate = useCallback((): ValidationResult | null => {
    if (!productName || selectedTeeth.length === 0) {
      return null;
    }

    const result = validationEngine.validateAndGetFirstError(validationData);
    setCurrentValidation(result);
    return result;
  }, [validationData, productName, selectedTeeth.length]);

  // Validate and get all issues
  const validateAll = useCallback((): ValidationResult[] => {
    if (!productName || selectedTeeth.length === 0) {
      return [];
    }

    return validationEngine.validateConfiguration(validationData);
  }, [validationData, productName, selectedTeeth.length]);

  // Check if current configuration is valid
  const isValid = useMemo(() => {
    if (!productName || selectedTeeth.length === 0) {
      return true;
    }

    const result = validationEngine.validateAndGetFirstError(validationData);
    return result === null;
  }, [validationData, productName, selectedTeeth.length]);

  // Check if there are any errors
  const hasErrors = useMemo(() => {
    const results = validateAll();
    return results.some(r => r.errorType === 'error');
  }, [validateAll]);

  // Check if there are any warnings
  const hasWarnings = useMemo(() => {
    const results = validateAll();
    return results.some(r => r.errorType === 'warning');
  }, [validateAll]);

  // Open validation modal with a specific result
  const openValidationModal = useCallback((result: ValidationResult) => {
    setCurrentValidation(result);
    setShowValidationModal(true);
  }, []);

  // Close validation modal
  const closeValidationModal = useCallback(() => {
    setShowValidationModal(false);
    setCurrentValidation(null);
    lastClosedTimeRef.current = Date.now();
  }, []);

  // Validate and show modal if there are issues
  const validateAndShowModal = useCallback((): boolean => {
    const result = validate();
    if (result && !result.isValid) {
      // For manual validation, be less restrictive with debouncing
      const timeSinceLastClose = Date.now() - lastClosedTimeRef.current;
      if (timeSinceLastClose < 500) {
        return false; // Don't show modal if it was just closed (reduced to 500ms)
      }
      
      // Don't show modal if it's already open
      if (showValidationModal) {
        return false;
      }
      
      openValidationModal(result);
      return false; // Validation failed
    }
    return true; // Validation passed
  }, [validate, openValidationModal, showValidationModal]);

  // Manual validation for extraction rules only - based on selected teeth
  const validateExtractionRules = useCallback((): boolean => {
    if (!productName || selectedTeeth.length === 0) {
      return true;
    }

    // Create validation data that only includes selected teeth
    const selectedTeethValidationData: ValidationData = {
      ...validationData,
      selectedTeeth: selectedTeeth,
      // Only include tooth statuses for selected teeth
      toothStatuses: Object.fromEntries(
        Object.entries(validationData.toothStatuses).filter(([toothNumber, _]) => 
          selectedTeeth.includes(parseInt(toothNumber))
        )
      )
    };

    // Get only extraction validation rules
    const extractionRules = validationEngine.getRulesForProduct(productName).filter(rule => 
      rule.id.includes('extraction')
    );

    // Run extraction rules only on selected teeth
    for (const rule of extractionRules) {
      try {
        const result = rule.checkFunction(selectedTeethValidationData);
        if (!result.isValid) {
          // For manual validation, be less restrictive with debouncing
          const timeSinceLastClose = Date.now() - lastClosedTimeRef.current;
          if (timeSinceLastClose < 500) {
            return false;
          }
          
          if (showValidationModal) {
            return false;
          }
          
          openValidationModal(result);
          return false;
        }
      } catch (error) {
        console.error(`Error running extraction validation rule ${rule.id}:`, error);
      }
    }
    
    return true; // All extraction rules passed
  }, [validationData, productName, selectedTeeth, showValidationModal, openValidationModal]);

  // Get chart configuration for the current product
  const chartConfiguration = useMemo((): ChartConfiguration => {
    if (!productName) {
      return {
        lockChart: false,
        hideChart: false,
        autoSelectFullArch: false,
        scanRequired: false
      };
    }

    return validationEngine.getChartConfiguration(productName);
  }, [productName]);

  return {
    validate,
    validateAll,
    isValid,
    hasErrors,
    hasWarnings,
    currentValidation,
    showValidationModal,
    openValidationModal,
    closeValidationModal,
    validateAndShowModal,
    validateExtractionRules,
    chartConfiguration
  };
};