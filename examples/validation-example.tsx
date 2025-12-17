"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDentalValidation } from "@/hooks/use-dental-validation";
import ValidationModal from "@/components/validation-modal";

// Example component demonstrating the validation system
export const ValidationExample = () => {
  // Example state
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([8, 9]); // Front teeth
  const [toothStatuses, setToothStatuses] = useState<{ [key: number]: string }>({
    8: 'Prepped',
    9: 'Missing' // This will cause validation issues for certain products
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('Veneer');

  // Initialize validation hook
  const {
    validate,
    validateAll,
    isValid,
    hasErrors,
    hasWarnings,
    currentValidation,
    showValidationModal,
    openValidationModal,
    closeValidationModal,
    validateAndShowModal
  } = useDentalValidation({
    selectedTeeth,
    toothStatuses,
    productName: selectedProduct,
    archType: 'maxillary',
    hasScans: false,
    implantCount: 0
  });

  // Example scenarios to test
  const testScenarios = [
    {
      name: 'Valid Veneer Setup',
      teeth: [8, 9],
      statuses: { 8: 'Prepped', 9: 'Prepped' },
      product: 'Veneer'
    },
    {
      name: 'Veneer on Posterior (Warning)',
      teeth: [3, 4],
      statuses: { 3: 'Prepped', 4: 'Prepped' },
      product: 'Veneer'
    },
    {
      name: 'Bridge Missing Abutments (Error)',
      teeth: [6, 7, 8],
      statuses: { 6: 'Missing', 7: 'Missing', 8: 'Missing' },
      product: 'Bridge'
    },
    {
      name: 'Valid Bridge Setup',
      teeth: [6, 7, 8],
      statuses: { 6: 'Prepped', 7: 'Missing', 8: 'Prepped' },
      product: 'Bridge'
    },
    {
      name: 'Non-Adjacent Splinted Crown (Error)',
      teeth: [4, 6], // Non-adjacent
      statuses: { 4: 'Prepped', 6: 'Prepped' },
      product: 'Splinted Crown'
    }
  ];

  const applyScenario = (scenario: typeof testScenarios[0]) => {
    setSelectedTeeth(scenario.teeth);
    setToothStatuses(scenario.statuses);
    setSelectedProduct(scenario.product);
  };

  const runValidation = () => {
    validateAndShowModal();
  };

  const getValidationSummary = () => {
    const results = validateAll();
    return {
      total: results.length,
      errors: results.filter(r => r.errorType === 'error').length,
      warnings: results.filter(r => r.errorType === 'warning').length,
      infos: results.filter(r => r.errorType === 'info').length
    };
  };

  const summary = getValidationSummary();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dental Validation System Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Selected Teeth</h3>
              <div className="flex flex-wrap gap-1">
                {selectedTeeth.map(tooth => (
                  <Badge key={tooth} variant="outline">#{tooth}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Product</h3>
              <Badge variant="secondary">{selectedProduct}</Badge>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Tooth Statuses</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(toothStatuses).map(([tooth, status]) => (
                  <div key={tooth}>#{tooth}: {status}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Validation Status */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="font-medium">Validation Status:</span>
            {isValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                ✓ Valid Configuration
              </Badge>
            ) : (
              <>
                {hasErrors && (
                  <Badge variant="destructive">
                    ❌ {summary.errors} Error{summary.errors !== 1 ? 's' : ''}
                  </Badge>
                )}
                {hasWarnings && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    ⚠️ {summary.warnings} Warning{summary.warnings !== 1 ? 's' : ''}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Validation Button */}
          <Button onClick={runValidation} className="w-full md:w-auto">
            Run Validation Check
          </Button>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {testScenarios.map((scenario, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-3 text-left justify-start"
                onClick={() => applyScenario(scenario)}
              >
                <div>
                  <div className="font-medium text-sm">{scenario.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Teeth: {scenario.teeth.join(', ')} | Product: {scenario.product}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {summary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Validation Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validateAll().map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.errorType === 'error'
                      ? 'bg-red-50 border-red-200'
                      : result.errorType === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {result.errorType === 'error' ? '❌' :
                       result.errorType === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium">{result.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      {result.affectedTeeth && result.affectedTeeth.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Affected teeth: </span>
                          {result.affectedTeeth.map(tooth => (
                            <Badge key={tooth} variant="outline" className="mr-1 text-xs">
                              #{tooth}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={closeValidationModal}
        validationResult={currentValidation}
        onConfirm={closeValidationModal}
        onCancel={closeValidationModal}
        onSuggestedAction={closeValidationModal}
        suggestedActionLabel="Fix Issue"
      />
    </div>
  );
};

export default ValidationExample;