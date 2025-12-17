# Dental Case Design Validation System

This validation system provides comprehensive rule-based validation for dental case configurations, ensuring that product selections and tooth statuses meet clinical requirements.

## Overview

The validation system consists of:

1. **Validation Rules Engine** (`lib/validation-rules.ts`) - Defines validation rules and logic
2. **Validation Engine** (`lib/validation-engine.ts`) - Orchestrates rule execution
3. **Validation Hook** (`hooks/use-dental-validation.ts`) - React integration
4. **Validation Modal** (`components/validation-modal.tsx`) - User interface component

## Key Features

- **Product-specific validation rules** - Different rules apply to different dental products
- **Real-time validation** - Validates as users make selections
- **Tiered validation levels** - Errors, warnings, and informational messages
- **Modal dialogs** - User-friendly error reporting and guidance
- **Extensible rule system** - Easy to add new validation rules

## Validation Rule Types

### Error Rules (Must Fix)
- **Invalid Status**: Wrong tooth status for selected product
- **Incomplete Bridge**: Missing required abutments or pontics
- **Non-Continuous Span**: Bridge teeth are not continuous
- **Non-Adjacent Selection**: Splinted crowns must be adjacent
- **Incorrect Tooth Count**: Wrong number of teeth selected
- **Missing Scans**: Required digital scans not provided

### Warning Rules (Can Proceed)
- **Unusual Location**: Product used in atypical location (e.g., veneers on molars)
- **Single Clasp**: Flipper with only one clasp may have less retention

### Info Rules (Informational)
- **Product Context**: Additional products may be needed
- **Confirmation Messages**: Confirming user intent

## Usage

### Basic Integration

```tsx
import { useDentalValidation } from "@/hooks/use-dental-validation";
import ValidationModal from "@/components/validation-modal";

const YourComponent = () => {
  const {
    validateAndShowModal,
    isValid,
    hasErrors,
    hasWarnings,
    showValidationModal,
    closeValidationModal,
    currentValidation
  } = useDentalValidation({
    selectedTeeth: [8, 9],
    toothStatuses: { 8: 'Prepped', 9: 'Prepped' },
    productName: 'Veneer',
    archType: 'maxillary',
    hasScans: true,
    implantCount: 0
  });

  return (
    <>
      {/* Your UI with validation indicators */}
      {hasErrors && (
        <Badge variant="destructive" onClick={() => validateAndShowModal()}>
          ⚠️ Validation Error
        </Badge>
      )}

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={closeValidationModal}
        validationResult={currentValidation}
        onConfirm={closeValidationModal}
        onCancel={closeValidationModal}
      />
    </>
  );
};
```

### Advanced Usage

```tsx
// Custom validation trigger
const handleProductSelect = (product: string) => {
  setSelectedProduct(product);

  // Validate after product selection
  setTimeout(() => {
    const result = validate();
    if (result && !result.isValid) {
      if (result.errorType === 'error') {
        // Block submission
        openValidationModal(result);
      } else if (result.errorType === 'warning') {
        // Allow but warn user
        openValidationModal(result);
      }
    }
  }, 100);
};

// Get all validation issues
const allIssues = validateAll();
const errorCount = allIssues.filter(r => r.errorType === 'error').length;
const warningCount = allIssues.filter(r => r.errorType === 'warning').length;
```

## Validation Rules Configuration

### Sample Validation Rules

```typescript
export const VALIDATION_RULES: ValidationRule[] = [
  // Bridge validation
  {
    id: 'incomplete_bridge',
    productName: 'Bridge',
    type: 'error',
    title: 'Incomplete Bridge',
    message: "A bridge requires at least two 'Prepped' abutments and one 'Missing' tooth.",
    checkFunction: (data) => {
      const preppedTeeth = getTeethWithStatus(data.toothStatuses, 'Prepped');
      const missingTeeth = getTeethWithStatus(data.toothStatuses, 'Missing');

      if (preppedTeeth.length < 2 || missingTeeth.length < 1) {
        return {
          isValid: false,
          errorType: 'error',
          title: 'Incomplete Bridge',
          message: "A bridge requires at least two 'Prepped' abutments and one 'Missing' tooth.",
          affectedTeeth: data.selectedTeeth
        };
      }
      return { isValid: true };
    }
  },

  // Location-based warning
  {
    id: 'unusual_veneer_location',
    productName: 'Veneer',
    type: 'warning',
    title: 'Unusual Location',
    message: "Veneers are typically used on anterior teeth. Are you sure you want to proceed?",
    checkFunction: (data) => {
      const posteriorTeeth = data.selectedTeeth.filter(tooth => !isToothType(tooth, 'anterior'));

      if (posteriorTeeth.length > 0) {
        return {
          isValid: false,
          errorType: 'warning',
          title: 'Unusual Location',
          message: `Veneers are typically used on anterior teeth. Are you sure you want to proceed with tooth #${posteriorTeeth[0]}?`,
          affectedTeeth: posteriorTeeth
        };
      }
      return { isValid: true };
    }
  }
];
```

### Adding Custom Rules

```typescript
import { validationEngine } from '@/lib/validation-engine';

// Add a custom rule
validationEngine.addRule({
  id: 'custom_rule',
  productName: 'Custom Product',
  type: 'warning',
  title: 'Custom Validation',
  message: 'This is a custom validation message.',
  checkFunction: (data) => {
    // Your custom validation logic
    return { isValid: true };
  }
});
```

## Tooth Type Configuration

The system includes global tooth type definitions:

```typescript
export const TOOTH_TYPES = {
  anterior: {
    maxillary: [6, 7, 8, 9, 10, 11],    // Central and lateral incisors, canines
    mandibular: [22, 23, 24, 25, 26, 27] // Central and lateral incisors, canines
  },
  premolar: {
    maxillary: [4, 5, 12, 13],           // First and second premolars
    mandibular: [20, 21, 28, 29]         // First and second premolars
  },
  molar: {
    maxillary: [1, 2, 3, 14, 15, 16],    // First, second, and third molars
    mandibular: [17, 18, 19, 30, 31, 32] // First, second, and third molars
  }
};
```

## Helper Functions

### Validation Data Helpers

```typescript
// Get teeth with specific status
const preppedTeeth = getTeethWithStatus(toothStatuses, 'Prepped');

// Check if all selected teeth have required status
const allPrepped = hasRequiredStatus(toothStatuses, selectedTeeth, 'Prepped');

// Check tooth continuity (for bridges)
const isContinuous = isArchContinuous([6, 7, 8]); // true

// Check tooth adjacency (for splints)
const isAdjacent = isArchAdjacent([8, 9]); // true

// Get tooth type
const toothType = getToothType(8); // 'anterior'
const isAnterior = isToothType(8, 'anterior'); // true
```

## Integration with InteractiveDentalChart3D

The validation system is fully integrated into the `InteractiveDentalChart3D` component:

1. **Real-time validation** - Validates on tooth selection and status changes
2. **Visual indicators** - Shows validation badges in the UI
3. **Modal dialogs** - Displays validation issues with suggested solutions
4. **Product filtering** - Only shows applicable validation rules

### Props for Validation

```typescript
interface InteractiveDentalChartProps {
  // ... existing props
  hasScans?: boolean;              // Whether digital scans are available
  implantCount?: number;           // Number of implants placed
  onValidationError?: (error: any) => void; // Validation error callback
}
```

## Testing

See `examples/validation-example.tsx` for a comprehensive testing interface that demonstrates:

- Multiple validation scenarios
- Real-time validation feedback
- Interactive rule testing
- Validation result visualization

## Error Handling

The validation system includes robust error handling:

- **Rule execution errors** are caught and logged
- **Invalid configurations** are handled gracefully
- **Missing data** is validated before rule execution
- **Fallback behaviors** ensure system stability

## Performance Considerations

- **Memoized validation data** prevents unnecessary recalculations
- **Debounced validation** reduces excessive rule execution
- **Selective rule execution** only runs applicable rules
- **Efficient data structures** for fast tooth status lookups

## Extensibility

The system is designed for easy extension:

1. **Add new validation rules** to `VALIDATION_RULES`
2. **Create custom rule categories** for specific workflows
3. **Extend ValidationData interface** for additional context
4. **Customize modal behaviors** for different rule types
5. **Add product-specific rule sets** for specialized validation

## Best Practices

1. **Write specific, actionable error messages**
2. **Provide clear solutions for fixing issues**
3. **Use appropriate validation levels** (error vs warning vs info)
4. **Test rules with edge cases**
5. **Keep rule logic simple and focused**
6. **Document complex validation scenarios**

This validation system ensures clinical accuracy while maintaining a smooth user experience in the dental case design interface.