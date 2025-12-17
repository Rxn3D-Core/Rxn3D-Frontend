import { ValidationRule, ValidationData, ValidationResult, VALIDATION_RULES, matchesProductName } from './validation-rules';

export class ValidationEngine {
  private rules: ValidationRule[] = VALIDATION_RULES;

  /**
   * Validates the current dental chart configuration against all applicable rules
   */
  validateConfiguration(data: ValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Find rules that apply to the current product
    const applicableRules = this.rules.filter(rule =>
      this.isRuleApplicable(rule, data.productName)
    );

    // Run each applicable rule
    for (const rule of applicableRules) {
      try {
        const result = rule.checkFunction(data);
        if (!result.isValid) {
          results.push({
            ...result,
            title: result.title || rule.title,
            message: result.message || rule.message,
            errorType: result.errorType || rule.type
          });
        }
      } catch (error) {
        console.error(`Error running validation rule ${rule.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Validates and returns the first critical error (if any)
   */
  validateAndGetFirstError(data: ValidationData): ValidationResult | null {
    const results = this.validateConfiguration(data);

    // Prioritize errors over warnings
    const errors = results.filter(r => r.errorType === 'error');
    if (errors.length > 0) {
      // Since we now only have extraction validation rules, return the first error
      return errors[0];
    }

    // Then warnings
    const warnings = results.filter(r => r.errorType === 'warning');
    if (warnings.length > 0) {
      return warnings[0];
    }

    // Finally info messages
    const infos = results.filter(r => r.errorType === 'info');
    if (infos.length > 0) {
      return infos[0];
    }

    return null;
  }

  /**
   * Checks if a rule applies to the given product
   */
  private isRuleApplicable(rule: ValidationRule, productName: string): boolean {
    // Handle wildcard rules that apply to all products
    if (rule.productName === '*') {
      return true;
    }

    // Use the utility function to handle both string and array product names
    if (matchesProductName(rule.productName, productName)) {
      return true;
    }

    // Enhanced category-based matching for additional product variations
    const productMappings = {
      'crown': ['crown', 'cap', 'onlay', 'inlay'],
      'bridge': ['bridge', 'fixed partial denture', 'fpd'],
      'implant': ['implant', 'implant-supported'],
      'denture': ['denture', 'complete denture', 'full denture', 'partial denture'],
      'veneer': ['veneer', 'laminate'],
      'retainer': ['retainer', 'hawley', 'essix'],
      'flipper': ['flipper', 'temporary partial'],
      'night guard': ['night guard', 'occlusal guard', 'bite guard'],
      'splint': ['splint', 'repositioning']
    };

    const normalizedProductName = productName.toLowerCase();

    // Check if any rule product name matches product category variations
    const ruleProductNames = Array.isArray(rule.productName) ? rule.productName : [rule.productName];

    for (const ruleName of ruleProductNames) {
      const normalizedRuleName = ruleName.toLowerCase();

      for (const [category, variations] of Object.entries(productMappings)) {
        if (normalizedRuleName.includes(category)) {
          if (variations.some(variation => normalizedProductName.includes(variation))) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Adds a custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Removes a validation rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Gets all validation rules
   */
  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  /**
   * Gets rules for a specific product
   */
  getRulesForProduct(productName: string): ValidationRule[] {
    return this.rules.filter(rule => this.isRuleApplicable(rule, productName));
  }

  /**
   * Gets chart configuration for a specific product
   */
  getChartConfiguration(productName: string): {
    lockChart: boolean;
    hideChart: boolean;
    autoSelectFullArch: boolean;
    scanRequired: boolean;
  } {
    const applicableRules = this.getRulesForProduct(productName);

    // Aggregate chart configuration from all applicable rules
    const config = {
      lockChart: false,
      hideChart: false,
      autoSelectFullArch: false,
      scanRequired: false
    };

    for (const rule of applicableRules) {
      if (rule.lockChart) config.lockChart = true;
      if (rule.hideChart) config.hideChart = true;
      if (rule.autoSelectFullArch) config.autoSelectFullArch = true;
      if (rule.scanRequired) config.scanRequired = true;
    }

    return config;
  }
}

// Export a singleton instance
export const validationEngine = new ValidationEngine();