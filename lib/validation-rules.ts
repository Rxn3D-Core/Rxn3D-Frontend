export interface ValidationRule {
  id: string;
  productName: string | string[]; // Support multiple product names
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  solution?: string;
  // Enhanced validation options
  requiredStatuses?: string[];
  forbiddenStatuses?: string[];
  allowedStatuses?: string[];
  minTeethCount?: number;
  maxTeethCount?: number;
  exactTeethCount?: number;
  minAbutmentCount?: number;
  minMissingCount?: number;
  minImplantCount?: number;
  requiresContinuity?: boolean;
  requiresAdjacency?: boolean;
  allowedToothTypes?: ('anterior' | 'premolar' | 'molar')[];
  forbiddenToothTypes?: ('anterior' | 'premolar' | 'molar')[];
  teethBasedPricing?: boolean;
  scanRequired?: boolean;
  implantCountRequired?: number;
  lockChart?: boolean;
  hideChart?: boolean;
  autoSelectFullArch?: boolean;
  allowRepairStatus?: boolean;
  allowClaspAttribute?: boolean;
  forbiddenAttributes?: string[];
  requiredAttributes?: string[];
  suggestedAction?: {
    label: string;
    action: 'switchProduct' | 'changeStatus' | 'selectTeeth' | 'addImplants' | 'uploadScan' | 'markAsPrepped' | 'markAsMissing' | 'markAsImplant' | 'addPontics';
    targetProduct?: string;
    targetStatus?: string;
    targetAttribute?: string;
  };
  checkFunction: (data: ValidationData) => ValidationResult;
}

export interface ValidationData {
  selectedTeeth: number[];
  toothStatuses: { [toothNumber: number]: string };
  toothAttributes?: { [toothNumber: number]: string[] }; // For clasp, repair, etc.
  productName: string;
  archType: 'maxillary' | 'mandibular';
  hasScans?: boolean;
  implantCount?: number;
  abutmentCount?: number;
  missingCount?: number;
  teethInMouthCount?: number;
  preppedCount?: number;
  isTeethBasedPricing?: boolean;
  hasClaspAttribute?: boolean;
  hasRepairAttribute?: boolean;
  // Add product extraction data for validation
  productExtractions?: Array<{
    name: string;
    is_required: string;
    is_optional: string;
    is_default: string;
    min_teeth?: number | null;
    max_teeth?: number | null;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errorType?: 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  solution?: string;
  affectedTeeth?: number[];
  suggestedAction?: {
    label: string;
    action: 'switchProduct' | 'changeStatus' | 'selectTeeth' | 'addImplants' | 'uploadScan' | 'markAsPrepped' | 'markAsMissing' | 'markAsImplant' | 'addPontics';
    targetProduct?: string;
    targetStatus?: string;
    targetTeeth?: number[];
    targetAttribute?: string;
  };
  canProceed?: boolean; // For warnings that allow continuation
}

// Global tooth type configuration
export const TOOTH_TYPES = {
  anterior: {
    maxillary: [6, 7, 8, 9, 10, 11],
    mandibular: [22, 23, 24, 25, 26, 27]
  },
  premolar: {
    maxillary: [4, 5, 12, 13],
    mandibular: [20, 21, 28, 29]
  },
  molar: {
    maxillary: [1, 2, 3, 14, 15, 16],
    mandibular: [17, 18, 19, 30, 31, 32]
  }
};

// Helper functions
export const getToothType = (toothNumber: number): 'anterior' | 'premolar' | 'molar' => {
  for (const [type, ranges] of Object.entries(TOOTH_TYPES)) {
    if (ranges.maxillary.includes(toothNumber) || ranges.mandibular.includes(toothNumber)) {
      return type as 'anterior' | 'premolar' | 'molar';
    }
  }
  return 'molar'; // default
};

export const isToothType = (toothNumber: number, type: 'anterior' | 'premolar' | 'molar'): boolean => {
  return getToothType(toothNumber) === type;
};

export const getTeethWithStatus = (toothStatuses: { [key: number]: string }, status: string): number[] => {
  return Object.entries(toothStatuses)
    .filter(([_, toothStatus]) => toothStatus === status)
    .map(([tooth, _]) => parseInt(tooth));
};

export const getAbutmentCount = (toothStatuses: { [key: number]: string }, selectedTeeth: number[]): number => {
  return selectedTeeth.filter(tooth => {
    const status = toothStatuses[tooth];
    return status === 'Prepped' || status === 'Teeth in mouth';
  }).length;
};

export const getMissingCount = (toothStatuses: { [key: number]: string }, selectedTeeth: number[]): number => {
  return selectedTeeth.filter(tooth => toothStatuses[tooth] === 'Missing teeth').length;
};

export const getImplantCount = (toothStatuses: { [key: number]: string }, selectedTeeth: number[]): number => {
  return selectedTeeth.filter(tooth => toothStatuses[tooth] === 'Implant').length;
};

export const getTeethInMouthCount = (toothStatuses: { [key: number]: string }, selectedTeeth: number[]): number => {
  return selectedTeeth.filter(tooth => toothStatuses[tooth] === 'Teeth in mouth').length;
};

export const getPreppedCount = (toothStatuses: { [key: number]: string }, selectedTeeth: number[]): number => {
  return selectedTeeth.filter(tooth => toothStatuses[tooth] === 'Prepped').length;
};

export const hasToothAttribute = (toothAttributes: { [key: number]: string[] } | undefined, toothNumber: number, attribute: string): boolean => {
  return toothAttributes?.[toothNumber]?.includes(attribute) || false;
};

export const getTeethWithAttribute = (toothAttributes: { [key: number]: string[] } | undefined, selectedTeeth: number[], attribute: string): number[] => {
  return selectedTeeth.filter(tooth => hasToothAttribute(toothAttributes, tooth, attribute));
};

export const matchesProductName = (ruleName: string | string[], productName: string): boolean => {
  if (Array.isArray(ruleName)) {
    return ruleName.some(name => productName.toLowerCase().includes(name.toLowerCase()));
  }
  return productName.toLowerCase().includes(ruleName.toLowerCase());
};

export const hasRequiredStatus = (toothStatuses: { [key: number]: string }, selectedTeeth: number[], requiredStatus: string): boolean => {
  return selectedTeeth.every(tooth => toothStatuses[tooth] === requiredStatus);
};

export const isArchContinuous = (teeth: number[]): boolean => {
  if (teeth.length <= 1) return true;
  const sortedTeeth = [...teeth].sort((a, b) => a - b);
  for (let i = 1; i < sortedTeeth.length; i++) {
    if (sortedTeeth[i] - sortedTeeth[i - 1] !== 1) {
      return false;
    }
  }
  return true;
};

export const isArchAdjacent = (teeth: number[]): boolean => {
  if (teeth.length <= 1) return true;
  const sortedTeeth = [...teeth].sort((a, b) => a - b);
  for (let i = 1; i < sortedTeeth.length; i++) {
    if (Math.abs(sortedTeeth[i] - sortedTeeth[i - 1]) !== 1) {
      return false;
    }
  }
  return true;
};

// Enhanced validation helper functions
export const validateTeethCount = (selectedTeeth: number[], min?: number, max?: number, exact?: number): boolean => {
  if (exact !== undefined) return selectedTeeth.length === exact;
  if (min !== undefined && selectedTeeth.length < min) return false;
  if (max !== undefined && selectedTeeth.length > max) return false;
  return true;
};

export const validateStatusRequirement = (toothStatuses: { [key: number]: string }, selectedTeeth: number[], requiredStatuses: string[]): { isValid: boolean; invalidTeeth: number[] } => {
  const invalidTeeth = selectedTeeth.filter(tooth =>
    !requiredStatuses.includes(toothStatuses[tooth] || '')
  );
  return {
    isValid: invalidTeeth.length === 0,
    invalidTeeth
  };
};

export const validateToothTypes = (selectedTeeth: number[], allowedTypes: ('anterior' | 'premolar' | 'molar')[]): { isValid: boolean; invalidTeeth: number[] } => {
  const invalidTeeth = selectedTeeth.filter(tooth =>
    !allowedTypes.includes(getToothType(tooth))
  );
  return {
    isValid: invalidTeeth.length === 0,
    invalidTeeth
  };
};

export const createExtractionValidationRule = (config: {
  id: string;
  productName: string | string[];
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  solution?: string;
  suggestedAction?: {
    label: string;
    action: 'switchProduct' | 'changeStatus' | 'selectTeeth' | 'addImplants' | 'uploadScan' | 'markAsPrepped' | 'markAsMissing' | 'markAsImplant' | 'addPontics';
    targetProduct?: string;
    targetStatus?: string;
    targetAttribute?: string;
  };
}): ValidationRule => {
  return {
    ...config,
    checkFunction: (data: ValidationData): ValidationResult => {
      // Only validate if we have extraction data
      if (!data.productExtractions || data.productExtractions.length === 0) {
        return { isValid: true };
      }

      // Get allowed extraction statuses (those with is_required, is_optional, or is_default = "Yes")
      const allowedExtractions = data.productExtractions.filter(extraction => 
        extraction.is_required === 'Yes' || 
        extraction.is_optional === 'Yes' || 
        extraction.is_default === 'Yes'
      );

      const allowedStatuses = allowedExtractions.map(extraction => extraction.name);

      // Check if any selected teeth have invalid statuses
      const invalidTeeth: number[] = [];
      const invalidStatuses: string[] = [];

      for (const [toothNumber, status] of Object.entries(data.toothStatuses)) {
        // Only check teeth that are selected
        if (data.selectedTeeth.includes(parseInt(toothNumber)) && status && !allowedStatuses.includes(status)) {
          invalidTeeth.push(parseInt(toothNumber));
          if (!invalidStatuses.includes(status)) {
            invalidStatuses.push(status);
          }
        }
      }

      if (invalidTeeth.length > 0) {
        // Get the default status (is_default = "Yes") for suggested action
        const defaultExtraction = allowedExtractions.find(extraction => extraction.is_default === 'Yes');
        const suggestedStatus = defaultExtraction?.name || allowedStatuses[0];

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: config.message.replace('{statusName}', invalidStatuses.join('", "')),
          solution: config.solution || `Available statuses for this product: ${allowedStatuses.join(', ')}`,
          affectedTeeth: invalidTeeth,
          suggestedAction: config.suggestedAction || {
            label: `Mark as ${suggestedStatus}`,
            action: 'changeStatus',
            targetStatus: suggestedStatus
          },
          canProceed: config.type === 'warning'
        };
      }

      return { isValid: true };
    }
  };
};

export const createGenericValidationRule = (config: {
  id: string;
  productName: string | string[];
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  solution?: string;
  requiredStatuses?: string[];
  forbiddenStatuses?: string[];
  allowedStatuses?: string[];
  minTeethCount?: number;
  maxTeethCount?: number;
  exactTeethCount?: number;
  minAbutmentCount?: number;
  minMissingCount?: number;
  minImplantCount?: number;
  requiresContinuity?: boolean;
  requiresAdjacency?: boolean;
  allowedToothTypes?: ('anterior' | 'premolar' | 'molar')[];
  forbiddenToothTypes?: ('anterior' | 'premolar' | 'molar')[];
  teethBasedPricing?: boolean;
  scanRequired?: boolean;
  implantCountRequired?: number;
  lockChart?: boolean;
  hideChart?: boolean;
  autoSelectFullArch?: boolean;
  allowRepairStatus?: boolean;
  allowClaspAttribute?: boolean;
  forbiddenAttributes?: string[];
  requiredAttributes?: string[];
  suggestedAction?: {
    label: string;
    action: 'switchProduct' | 'changeStatus' | 'selectTeeth' | 'addImplants' | 'uploadScan' | 'markAsPrepped' | 'markAsMissing' | 'markAsImplant' | 'addPontics';
    targetProduct?: string;
    targetStatus?: string;
    targetAttribute?: string;
  };
}): ValidationRule => {
  return {
    ...config,
    checkFunction: (data: ValidationData) => {
      // Calculate counts for validation
      const abutmentCount = getAbutmentCount(data.toothStatuses, data.selectedTeeth);
      const missingCount = getMissingCount(data.toothStatuses, data.selectedTeeth);
      const implantCount = getImplantCount(data.toothStatuses, data.selectedTeeth);

      // Check teeth count requirements
      if (!validateTeethCount(data.selectedTeeth, config.minTeethCount, config.maxTeethCount, config.exactTeethCount)) {
        const actualCount = data.selectedTeeth.length;
        let countMessage = config.message;
        if (config.exactTeethCount !== undefined) {
          countMessage = countMessage.replace('{userNumber}', actualCount.toString()).replace('{requiredNumber}', config.exactTeethCount.toString());
        } else if (config.minTeethCount !== undefined) {
          countMessage = countMessage.replace('{minNumber}', config.minTeethCount.toString()).replace('{remainingNumber}', Math.max(0, config.minTeethCount - actualCount).toString());
        }

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: countMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check abutment count requirements
      if (config.minAbutmentCount !== undefined && abutmentCount < config.minAbutmentCount) {
        let abutmentMessage = config.message
          .replace('{abutmentCount}', abutmentCount.toString())
          .replace('{minAbutmentCount}', config.minAbutmentCount.toString())
          .replace('{remainingAbutments}', (config.minAbutmentCount - abutmentCount).toString());

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: abutmentMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check missing count requirements
      if (config.minMissingCount !== undefined && missingCount < config.minMissingCount) {
        let missingMessage = config.message
          .replace('{missingCount}', missingCount.toString())
          .replace('{minMissingCount}', config.minMissingCount.toString())
          .replace('{remainingMissing}', (config.minMissingCount - missingCount).toString());

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: missingMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check implant count requirements
      if (config.minImplantCount !== undefined && implantCount < config.minImplantCount) {
        let implantMessage = config.message
          .replace('{implantCount}', implantCount.toString())
          .replace('{minImplantCount}', config.minImplantCount.toString())
          .replace('{remainingImplants}', (config.minImplantCount - implantCount).toString());

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: implantMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check required statuses
      if (config.requiredStatuses && config.requiredStatuses.length > 0) {
        const statusValidation = validateStatusRequirement(data.toothStatuses, data.selectedTeeth, config.requiredStatuses);
        if (!statusValidation.isValid) {
          const invalidStatus = data.toothStatuses[statusValidation.invalidTeeth[0]] || 'undefined';
          let statusMessage = config.message
            .replace('{statusName}', invalidStatus)
            .replace('{productName}', data.productName);
          if (statusValidation.invalidTeeth.length > 0) {
            statusMessage = statusMessage.replace('{toothNumber}', statusValidation.invalidTeeth[0].toString());
          }

          return {
            isValid: false,
            errorType: config.type,
            title: config.title,
            message: statusMessage,
            solution: config.solution,
            affectedTeeth: statusValidation.invalidTeeth,
            suggestedAction: config.suggestedAction,
            canProceed: config.type === 'warning'
          };
        }
      }

      // Check forbidden statuses
      if (config.forbiddenStatuses && config.forbiddenStatuses.length > 0) {
        const forbiddenTeeth = data.selectedTeeth.filter(tooth =>
          config.forbiddenStatuses!.includes(data.toothStatuses[tooth])
        );
        if (forbiddenTeeth.length > 0) {
          const forbiddenStatus = data.toothStatuses[forbiddenTeeth[0]];
          let statusMessage = config.message
            .replace('{statusName}', forbiddenStatus)
            .replace('{productName}', data.productName)
            .replace('{toothNumber}', forbiddenTeeth[0].toString());

          return {
            isValid: false,
            errorType: config.type,
            title: config.title,
            message: statusMessage,
            solution: config.solution,
            affectedTeeth: forbiddenTeeth,
            suggestedAction: config.suggestedAction,
            canProceed: config.type === 'warning'
          };
        }
      }

      // Check allowed tooth types
      if (config.allowedToothTypes && config.allowedToothTypes.length > 0) {
        const typeValidation = validateToothTypes(data.selectedTeeth, config.allowedToothTypes);
        if (!typeValidation.isValid) {
          let typeMessage = config.message;
          if (typeValidation.invalidTeeth.length > 0) {
            typeMessage = typeMessage.replace('{toothNumber}', typeValidation.invalidTeeth[0].toString());
          }

          return {
            isValid: false,
            errorType: config.type,
            title: config.title,
            message: typeMessage,
            solution: config.solution,
            affectedTeeth: typeValidation.invalidTeeth,
            suggestedAction: config.suggestedAction,
            canProceed: config.type === 'warning'
          };
        }
      }

      // Check forbidden tooth types
      if (config.forbiddenToothTypes && config.forbiddenToothTypes.length > 0) {
        const invalidTeeth = data.selectedTeeth.filter(tooth =>
          config.forbiddenToothTypes!.includes(getToothType(tooth))
        );
        if (invalidTeeth.length > 0) {
          let typeMessage = config.message;
          if (invalidTeeth.length > 0) {
            typeMessage = typeMessage.replace('{toothNumber}', invalidTeeth[0].toString());
          }

          return {
            isValid: false,
            errorType: config.type,
            title: config.title,
            message: typeMessage,
            solution: config.solution,
            affectedTeeth: invalidTeeth,
            suggestedAction: config.suggestedAction,
            canProceed: config.type === 'warning'
          };
        }
      }

      // Check continuity requirement
      if (config.requiresContinuity && !isArchContinuous(data.selectedTeeth)) {
        const sortedTeeth = [...data.selectedTeeth].sort((a, b) => a - b);
        let continuityMessage = config.message;
        if (sortedTeeth.length > 1) {
          continuityMessage = continuityMessage.replace('{startTooth}', sortedTeeth[0].toString()).replace('{endTooth}', sortedTeeth[sortedTeeth.length - 1].toString());
        }

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: continuityMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check adjacency requirement
      if (config.requiresAdjacency && !isArchAdjacent(data.selectedTeeth)) {
        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: config.message,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check scan requirement
      if (config.scanRequired && !data.hasScans) {
        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: config.message.replace('{productName}', data.productName),
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Check implant count requirement (legacy compatibility)
      if (config.implantCountRequired && (data.implantCount || 0) < config.implantCountRequired) {
        const currentImplants = data.implantCount || 0;
        let implantMessage = config.message
          .replace('{minNumber}', config.implantCountRequired.toString())
          .replace('{remainingNumber}', (config.implantCountRequired - currentImplants).toString());

        return {
          isValid: false,
          errorType: config.type,
          title: config.title,
          message: implantMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: config.type === 'warning'
        };
      }

      // Handle teeth-based pricing information messages
      if (config.teethBasedPricing && config.type === 'info') {
        const userNumber = data.selectedTeeth.length;
        let pricingMessage = config.message.replace('{userNumber}', userNumber.toString());

        return {
          isValid: false, // Show as info message
          errorType: 'info',
          title: config.title,
          message: pricingMessage,
          solution: config.solution,
          affectedTeeth: data.selectedTeeth,
          suggestedAction: config.suggestedAction,
          canProceed: true // Always allow proceeding for info messages
        };
      }

      return { isValid: true };
    }
  };
};

// Validation Rules Configuration
export const VALIDATION_RULES: ValidationRule[] = [
  // ========== EXTRACTION VALIDATION RULES ==========

  // EX1: Validate tooth statuses against product extraction options
  {
    id: 'EX1_extraction_status_validation',
    productName: '*', // Apply to all products that have extraction data
    type: 'error',
    title: 'Invalid Extraction Status',
    message: "The tooth status '{statusName}' is not allowed for this product. Please select a valid status from the available options.",
    checkFunction: (data: ValidationData): ValidationResult => {
      // Only validate if we have extraction data
      if (!data.productExtractions || data.productExtractions.length === 0) {
        return { isValid: true };
      }

      // Get allowed extraction statuses (those with is_required, is_optional, or is_default = "Yes")
      const allowedExtractions = data.productExtractions.filter(extraction =>
        extraction.is_required === 'Yes' ||
        extraction.is_optional === 'Yes' ||
        extraction.is_default === 'Yes'
      );

      const allowedStatuses = allowedExtractions.map(extraction => extraction.name);

      // Check if any selected teeth have invalid statuses
      const invalidTeeth: number[] = [];
      const invalidStatuses: string[] = [];

      for (const [toothNumber, status] of Object.entries(data.toothStatuses)) {
        // Only check teeth that are selected
        if (data.selectedTeeth.includes(parseInt(toothNumber)) && status && !allowedStatuses.includes(status)) {
          invalidTeeth.push(parseInt(toothNumber));
          if (!invalidStatuses.includes(status)) {
            invalidStatuses.push(status);
          }
        }
      }

      if (invalidTeeth.length > 0) {
        // Get the default status (is_default = "Yes") for suggested action
        const defaultExtraction = allowedExtractions.find(extraction => extraction.is_default === 'Yes');
        const suggestedStatus = defaultExtraction?.name || allowedStatuses[0];

        return {
          isValid: false,
          errorType: 'error',
          title: 'Invalid Extraction Status',
          message: `The tooth status${invalidStatuses.length > 1 ? 'es' : ''} "${invalidStatuses.join('", "')}" ${invalidStatuses.length > 1 ? 'are' : 'is'} not allowed for this product. Please select a valid status from the available options.`,
          affectedTeeth: invalidTeeth,
          solution: `Available statuses for this product: ${allowedStatuses.join(', ')}`,
          suggestedAction: {
            label: `Mark as ${suggestedStatus}`,
            action: 'changeStatus',
            targetStatus: suggestedStatus
          }
        };
      }

      return { isValid: true };
    }
  },

  // EX2: Validate tooth count constraints for extraction options
  {
    id: 'EX2_extraction_teeth_count_validation',
    productName: '*', // Apply to all products that have extraction data
    type: 'error',
    title: 'Invalid Extraction Count',
    message: "The number of teeth selected for '{statusName}' does not meet the requirements for this product.",
    checkFunction: (data: ValidationData): ValidationResult => {
      // Only validate if we have extraction data
      if (!data.productExtractions || data.productExtractions.length === 0) {
        return { isValid: true };
      }

      // Get allowed extraction statuses with their constraints
      const allowedExtractions = data.productExtractions.filter(extraction =>
        extraction.is_required === 'Yes' ||
        extraction.is_optional === 'Yes' ||
        extraction.is_default === 'Yes'
      );

      // Check tooth count constraints for each status
      for (const extraction of allowedExtractions) {
        if (extraction.min_teeth === null && extraction.max_teeth === null) {
          continue; // No constraints for this extraction
        }

        // Count teeth with this status that are also selected
        const teethWithStatus = Object.entries(data.toothStatuses)
          .filter(([toothNumber, status]) => 
            status === extraction.name && 
            data.selectedTeeth.includes(parseInt(toothNumber))
          )
          .map(([toothNumber, _]) => parseInt(toothNumber));

        const teethCount = data.selectedTeeth.length;

        // Check min_teeth constraint
        if (extraction.min_teeth !== null && extraction.min_teeth !== undefined && teethCount < extraction.min_teeth) {
          return {
            isValid: false,
            errorType: 'error',
            title: 'Insufficient Teeth Selected',
            message: `"${extraction.name}" requires at least ${extraction.min_teeth} tooth${extraction.min_teeth > 1 ? 'es' : ''}, but only ${teethCount} selected tooth${teethCount === 1 ? ' has' : 's have'} this status. (${data.selectedTeeth.length} tooth${data.selectedTeeth.length === 1 ? '' : 's'} selected in UI: ${data.selectedTeeth.join(', ')})`,
            affectedTeeth: data.selectedTeeth,
            solution: `Please assign "${extraction.name}" status to at least ${extraction.min_teeth} selected tooth${extraction.min_teeth > 1 ? 'es' : ''}.`,
            suggestedAction: {
              label: 'Assign Status to More Teeth',
              action: 'changeStatus',
              targetStatus: extraction.name
            }
          };
        }

        // Check max_teeth constraint
        if (extraction.max_teeth !== null && extraction.max_teeth !== undefined && teethCount > extraction.max_teeth) {
          return {
            isValid: false,
            errorType: 'error',
            title: 'Too Many Teeth Selected',
            message: `"${extraction.name}" allows at most ${extraction.max_teeth} tooth${extraction.max_teeth > 1 ? 'es' : ''}, but ${teethCount} selected tooth${teethCount === 1 ? ' has' : 's have'} this status.`,
            affectedTeeth: teethWithStatus,
            solution: `Please change the status of some selected teeth from "${extraction.name}" to a different status.`,
            suggestedAction: {
              label: 'Change Status of Some Teeth',
              action: 'changeStatus'
            }
          };
        }
      }

      return { isValid: true };
    }
  }
];
