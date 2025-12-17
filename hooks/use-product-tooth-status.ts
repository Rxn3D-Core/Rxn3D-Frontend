import { useState, useMemo, useCallback } from 'react';
import { 
  getAvailableToothStatuses, 
  getRequiredToothStatuses, 
  getStatusEquivalent,
  getInitialLoadingRequirement,
  isStatusValidForProduct,
  TOOTH_STATUS_DISPLAY_MAP,
  ProductToothStatusMapping
} from '@/lib/product-requirements';

export interface ToothStatusInfo {
  status: string;
  label: string;
  color: string;
  bgColor: string;
  isRequired: boolean;
  equivalent?: string;
}

export interface ProductToothStatusState {
  selectedProduct: string | null;
  availableStatuses: ToothStatusInfo[];
  requiredStatuses: string[];
  initialLoading: string;
  selectedStatuses: { [toothNumber: number]: string };
  validationErrors: { [toothNumber: number]: string };
}

export function useProductToothStatus() {
  const [state, setState] = useState<ProductToothStatusState>({
    selectedProduct: null,
    availableStatuses: [],
    requiredStatuses: [],
    initialLoading: "",
    selectedStatuses: {},
    validationErrors: {}
  });

  // Update available statuses when product changes
  const setSelectedProduct = useCallback((productName: string | null) => {
    if (!productName) {
      setState(prev => ({
        ...prev,
        selectedProduct: null,
        availableStatuses: [],
        requiredStatuses: [],
        initialLoading: "",
        selectedStatuses: {},
        validationErrors: {}
      }));
      return;
    }

    const availableStatusNames = getAvailableToothStatuses(productName);
    const requiredStatusNames = getRequiredToothStatuses(productName);
    const initialLoading = getInitialLoadingRequirement(productName);

    const availableStatuses: ToothStatusInfo[] = availableStatusNames.map(statusName => {
      const displayInfo = TOOTH_STATUS_DISPLAY_MAP[statusName] || {
        label: statusName,
        color: "#374151",
        bgColor: "#F5F5F5"
      };
      
      return {
        status: statusName,
        label: displayInfo.label,
        color: displayInfo.color,
        bgColor: displayInfo.bgColor,
        isRequired: requiredStatusNames.includes(statusName),
        equivalent: getStatusEquivalent(productName, statusName) || undefined
      };
    });

    setState(prev => ({
      ...prev,
      selectedProduct: productName,
      availableStatuses,
      requiredStatuses: requiredStatusNames,
      initialLoading,
      selectedStatuses: {},
      validationErrors: {}
    }));
  }, []);

  // Assign status to specific teeth
  const assignStatusToTeeth = useCallback((status: string, teeth: number[]) => {
    if (!state.selectedProduct || !isStatusValidForProduct(state.selectedProduct, status)) {
      return;
    }

    setState(prev => {
      const newSelectedStatuses = { ...prev.selectedStatuses };
      const newValidationErrors = { ...prev.validationErrors };

      teeth.forEach(toothNumber => {
        newSelectedStatuses[toothNumber] = status;
        // Clear any existing validation error for this tooth
        delete newValidationErrors[toothNumber];
      });

      return {
        ...prev,
        selectedStatuses: newSelectedStatuses,
        validationErrors: newValidationErrors
      };
    });
  }, [state.selectedProduct]);

  // Remove status from specific teeth
  const removeStatusFromTeeth = useCallback((teeth: number[]) => {
    setState(prev => {
      const newSelectedStatuses = { ...prev.selectedStatuses };
      const newValidationErrors = { ...prev.validationErrors };

      teeth.forEach(toothNumber => {
        delete newSelectedStatuses[toothNumber];
        delete newValidationErrors[toothNumber];
      });

      return {
        ...prev,
        selectedStatuses: newSelectedStatuses,
        validationErrors: newValidationErrors
      };
    });
  }, []);

  // Validate tooth status assignments
  const validateAssignments = useCallback(() => {
    if (!state.selectedProduct) return true;

    const errors: { [toothNumber: number]: string } = {};
    let isValid = true;

    // Check if all required statuses are assigned
    const assignedStatuses = Object.values(state.selectedStatuses);
    const missingRequiredStatuses = state.requiredStatuses.filter(
      requiredStatus => !assignedStatuses.includes(requiredStatus)
    );

    if (missingRequiredStatuses.length > 0) {
      // Find teeth that don't have any status assigned
      const teethWithoutStatus = Object.keys(state.selectedStatuses)
        .map(Number)
        .filter(toothNumber => !state.selectedStatuses[toothNumber]);
      
      teethWithoutStatus.forEach(toothNumber => {
        errors[toothNumber] = `Missing required status: ${missingRequiredStatuses.join(', ')}`;
        isValid = false;
      });
    }

    setState(prev => ({
      ...prev,
      validationErrors: errors
    }));

    return isValid;
  }, [state.selectedProduct, state.selectedStatuses, state.requiredStatuses]);

  // Get status for a specific tooth
  const getToothStatus = useCallback((toothNumber: number): string | null => {
    return state.selectedStatuses[toothNumber] || null;
  }, [state.selectedStatuses]);

  // Get validation error for a specific tooth
  const getToothValidationError = useCallback((toothNumber: number): string | null => {
    return state.validationErrors[toothNumber] || null;
  }, [state.validationErrors]);

  // Get all teeth with a specific status
  const getTeethWithStatus = useCallback((status: string): number[] => {
    return Object.entries(state.selectedStatuses)
      .filter(([_, assignedStatus]) => assignedStatus === status)
      .map(([toothNumber, _]) => Number(toothNumber));
  }, [state.selectedStatuses]);

  // Clear all assignments
  const clearAllAssignments = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedStatuses: {},
      validationErrors: {}
    }));
  }, []);

  // Get summary of current assignments
  const getAssignmentSummary = useCallback(() => {
    const summary: { [status: string]: number[] } = {};
    
    Object.entries(state.selectedStatuses).forEach(([toothNumber, status]) => {
      if (!summary[status]) {
        summary[status] = [];
      }
      summary[status].push(Number(toothNumber));
    });

    return summary;
  }, [state.selectedStatuses]);

  // Check if a status is available for the current product
  const isStatusAvailable = useCallback((status: string): boolean => {
    if (!state.selectedProduct) return false;
    return isStatusValidForProduct(state.selectedProduct, status);
  }, [state.selectedProduct]);

  // Get equivalent status for a given status
  const getEquivalentStatus = useCallback((status: string): string | null => {
    if (!state.selectedProduct) return null;
    const equivalent = getStatusEquivalent(state.selectedProduct, status);
    return equivalent || null;
  }, [state.selectedProduct]);

  return {
    // State
    selectedProduct: state.selectedProduct,
    availableStatuses: state.availableStatuses,
    requiredStatuses: state.requiredStatuses,
    initialLoading: state.initialLoading,
    selectedStatuses: state.selectedStatuses,
    validationErrors: state.validationErrors,
    
    // Actions
    setSelectedProduct,
    assignStatusToTeeth,
    removeStatusFromTeeth,
    validateAssignments,
    clearAllAssignments,
    
    // Getters
    getToothStatus,
    getToothValidationError,
    getTeethWithStatus,
    getAssignmentSummary,
    isStatusAvailable,
    getEquivalentStatus,
    
    // Computed values
    hasValidationErrors: Object.keys(state.validationErrors).length > 0,
    totalAssignedTeeth: Object.keys(state.selectedStatuses).length,
    isProductSelected: !!state.selectedProduct
  };
}
