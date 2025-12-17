"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductToothStatus } from '@/hooks/use-product-tooth-status';
import { getProductNames, getAvailableToothStatuses, getRequiredToothStatuses } from '@/lib/product-requirements';

export function ProductToothStatusDemo() {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedArch, setSelectedArch] = useState<'maxillary' | 'mandibular'>('maxillary');
  
  const {
    selectedProduct,
    availableStatuses,
    requiredStatuses,
    setSelectedProduct,
    assignStatusToTeeth,
    getTeethWithStatus,
    getAssignmentSummary,
    validateAssignments,
    hasValidationErrors,
    totalAssignedTeeth
  } = useProductToothStatus();

  const productNames = getProductNames();
  const teethRange = selectedArch === 'maxillary' ? [1, 16] : [17, 32];
  const archTeeth = Array.from({ length: 16 }, (_, i) => i + (selectedArch === 'maxillary' ? 1 : 17));

  const handleToothToggle = (toothNumber: number) => {
    setSelectedTeeth(prev => 
      prev.includes(toothNumber) 
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    );
  };

  const handleStatusClick = (status: string) => {
    let teethToAssign: number[] = [];
    
    if (status === 'Missing teeth') {
      // For missing teeth, get all non-selected teeth in the current arch
      teethToAssign = archTeeth.filter(tooth => !selectedTeeth.includes(tooth));
    } else {
      // For other statuses, use selected teeth
      teethToAssign = selectedTeeth.filter(tooth => 
        selectedArch === 'maxillary' ? tooth >= 1 && tooth <= 16 : tooth >= 17 && tooth <= 32
      );
    }
    
    if (teethToAssign.length > 0) {
      assignStatusToTeeth(status, teethToAssign);
    }
  };

  const assignmentSummary = getAssignmentSummary();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product-Based Tooth Status Selection Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Product:</label>
            <Select value={selectedProduct || ''} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Choose a product..." />
              </SelectTrigger>
              <SelectContent>
                {productNames.map(productName => (
                  <SelectItem key={productName} value={productName}>
                    {productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Arch Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Arch:</label>
            <Select value={selectedArch} onValueChange={(value: 'maxillary' | 'mandibular') => setSelectedArch(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maxillary">Maxillary</SelectItem>
                <SelectItem value="mandibular">Mandibular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Info */}
          {selectedProduct && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Product Requirements:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Available Statuses:</strong> {availableStatuses.map(s => s.label).join(', ')}</p>
                <p><strong>Required Statuses:</strong> {requiredStatuses.length > 0 ? requiredStatuses.join(', ') : 'None'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tooth Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedArch === 'maxillary' ? 'Maxillary' : 'Mandibular'} Teeth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-2">
              {archTeeth.map(toothNumber => (
                <button
                  key={toothNumber}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                    selectedTeeth.includes(toothNumber)
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleToothToggle(toothNumber)}
                >
                  {toothNumber}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Selected: {selectedTeeth.length} teeth
            </div>
          </CardContent>
        </Card>

        {/* Status Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Tooth Status Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedProduct ? (
              // Show product-specific statuses
              availableStatuses.map((statusInfo) => {
                const teethWithStatus = getTeethWithStatus(statusInfo.status);
                const archTeethWithStatus = teethWithStatus.filter(tooth => 
                  selectedArch === 'maxillary' ? tooth >= 1 && tooth <= 16 : tooth >= 17 && tooth <= 32
                );
                
                return (
                  <div key={statusInfo.status} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: statusInfo.bgColor }}
                      />
                      <span className="text-sm font-medium">
                        {statusInfo.label}
                        {statusInfo.isRequired && <span className="ml-1 text-orange-600">*</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {archTeethWithStatus.length > 0 ? archTeethWithStatus.join(', ') : '-'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusClick(statusInfo.status)}
                        disabled={statusInfo.status === 'Missing teeth' ? selectedTeeth.length === 16 : selectedTeeth.length === 0}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select a product to see available tooth statuses
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Summary */}
      {Object.keys(assignmentSummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(assignmentSummary).map(([status, teeth]) => (
                <div key={status} className="flex items-center gap-2">
                  <Badge variant="secondary">{status}</Badge>
                  <span className="text-sm text-gray-600">
                    Teeth: {teeth.join(', ')}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Button onClick={validateAssignments} variant="outline">
                Validate Assignments
              </Button>
              {hasValidationErrors && (
                <Badge variant="destructive">Validation Errors Found</Badge>
              )}
              <span className="text-sm text-gray-600">
                Total assigned teeth: {totalAssignedTeeth}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
