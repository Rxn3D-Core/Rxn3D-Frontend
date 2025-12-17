"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InteractiveDentalChart3D from '@/components/interactive-dental-chart-3D';

export function DentalChartWithToolbarDemo() {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedToothMappingMode, setSelectedToothMappingMode] = useState<string | null>(null);
  const [missingTeeth, setMissingTeeth] = useState<number[]>([]);
  const [extractedTeeth, setExtractedTeeth] = useState<number[]>([]);
  const [willExtractTeeth, setWillExtractTeeth] = useState<number[]>([]);
  const [showToothMappingToolbar, setShowToothMappingToolbar] = useState(true);

  const handleToothToggle = (toothNumber: number) => {
    setSelectedTeeth(prev => 
      prev.includes(toothNumber) 
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    );
  };

  const handleStatusAssign = (status: string, teeth: number[]) => {
    
    // Update the appropriate state based on status
    switch (status) {
      case 'Missing teeth':
        setMissingTeeth(prev => [...new Set([...prev, ...teeth])]);
        break;
      case 'Has been extracted':
        setExtractedTeeth(prev => [...new Set([...prev, ...teeth])]);
        break;
      case 'Will extract on delivery':
        setWillExtractTeeth(prev => [...new Set([...prev, ...teeth])]);
        break;
      default:
        // For other statuses, you might want to track them differently
    }
  };

  const handleAllTeethMissing = () => {
    const allTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
    setMissingTeeth(allTeeth);
    setSelectedTeeth([]);
  };

  const handleProductSelect = (productName: string | null) => {
    setSelectedProduct(productName);
  };

  const handleToothMappingModeSelect = (modeId: string) => {
    setSelectedToothMappingMode(modeId);
  };

  const handleProductButtonClick = (productId: string) => {
  };

  // Sample product buttons
  const productButtons = [
    {
      id: 'crown-1',
      name: 'Full Contour Zirconia Crown',
      teeth: '1,2,3',
      color: '#3B82F6',
      maxillaryTeeth: '1,2,3',
      mandibularTeeth: '17,18,19'
    },
    {
      id: 'bridge-1',
      name: 'Standard Bridge',
      teeth: '4,5,6',
      color: '#10B981',
      maxillaryTeeth: '4,5,6',
      mandibularTeeth: '20,21,22'
    },
    {
      id: 'implant-1',
      name: 'Implant-Supported Zirconia Bridge',
      teeth: '7,8,9',
      color: '#F59E0B',
      maxillaryTeeth: '7,8,9',
      mandibularTeeth: '23,24,25'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dental Chart with Tooth Mapping Toolbar Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button
              onClick={() => setShowToothMappingToolbar(!showToothMappingToolbar)}
              variant={showToothMappingToolbar ? "default" : "outline"}
            >
              {showToothMappingToolbar ? 'Hide' : 'Show'} Tooth Mapping Toolbar
            </Button>
            
            <Button
              onClick={() => setSelectedProduct('Full Contour Zirconia Crown')}
              variant="outline"
            >
              Select Sample Product
            </Button>
            
            <Button
              onClick={() => setSelectedProduct(null)}
              variant="outline"
            >
              Clear Product
            </Button>
          </div>

          {/* Status Summary */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Selected: {selectedTeeth.length} teeth
            </Badge>
            {selectedProduct && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Product: {selectedProduct}
              </Badge>
            )}
            {selectedToothMappingMode && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Mapping: {selectedToothMappingMode}
              </Badge>
            )}
            <Badge variant="outline" className="bg-gray-50 text-gray-700">
              Missing: {missingTeeth.length}
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-700">
              Extracted: {extractedTeeth.length}
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">
              Will Extract: {willExtractTeeth.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Dental Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Maxillary Chart */}
        <InteractiveDentalChart3D
          type="maxillary"
          selectedTeeth={selectedTeeth.filter(t => t >= 1 && t <= 16)}
          onToothToggle={handleToothToggle}
          title="MAXILLARY"
          productTeethMap={{}}
          productButtons={productButtons}
          visibleArch="maxillary"
          onProductButtonClick={handleProductButtonClick}
          onStatusAssign={handleStatusAssign}
          selectedProduct={selectedProduct}
          onProductSelect={handleProductSelect}
          showToothMappingToolbar={showToothMappingToolbar}
          onToothMappingModeSelect={handleToothMappingModeSelect}
          selectedToothMappingMode={selectedToothMappingMode}
          missingTeeth={missingTeeth.filter(t => t >= 1 && t <= 16)}
          extractedTeeth={extractedTeeth.filter(t => t >= 1 && t <= 16)}
          willExtractTeeth={willExtractTeeth.filter(t => t >= 1 && t <= 16)}
          onAllTeethMissing={() => {
            const maxillaryTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
            setMissingTeeth(prev => [...new Set([...prev, ...maxillaryTeeth])]);
          }}
        />

        {/* Mandibular Chart */}
        <InteractiveDentalChart3D
          type="mandibular"
          selectedTeeth={selectedTeeth.filter(t => t >= 17 && t <= 32)}
          onToothToggle={handleToothToggle}
          title="MANDIBULAR"
          productTeethMap={{}}
          productButtons={productButtons}
          visibleArch="mandibular"
          onProductButtonClick={handleProductButtonClick}
          onStatusAssign={handleStatusAssign}
          selectedProduct={selectedProduct}
          onProductSelect={handleProductSelect}
          showToothMappingToolbar={showToothMappingToolbar}
          onToothMappingModeSelect={handleToothMappingModeSelect}
          selectedToothMappingMode={selectedToothMappingMode}
          missingTeeth={missingTeeth.filter(t => t >= 17 && t <= 32)}
          extractedTeeth={extractedTeeth.filter(t => t >= 17 && t <= 32)}
          willExtractTeeth={willExtractTeeth.filter(t => t >= 17 && t <= 32)}
          onAllTeethMissing={() => {
            const mandibularTeeth = Array.from({ length: 16 }, (_, i) => i + 17);
            setMissingTeeth(prev => [...new Set([...prev, ...mandibularTeeth])]);
          }}
        />
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. <strong>Select Teeth:</strong> Click on teeth in the 3D chart to select them</p>
          <p>2. <strong>Choose Mapping Mode:</strong> Use the tooth mapping toolbar to select a status (Teeth in Mouth, Prepped, Will Extract, etc.)</p>
          <p>3. <strong>Apply Status:</strong> Click "Apply to Selected" to assign the status to selected teeth</p>
          <p>4. <strong>View Status Cards:</strong> The missing teeth cards show current tooth statuses</p>
          <p>5. <strong>All Teeth Missing:</strong> Use the "All teeth missing" button to mark all teeth in an arch as missing</p>
          <p>6. <strong>Product Selection:</strong> Select a product to see only relevant tooth statuses</p>
        </CardContent>
      </Card>
    </div>
  );
}
