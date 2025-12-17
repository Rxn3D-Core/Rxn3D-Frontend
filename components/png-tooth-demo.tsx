"use client"

import React, { useState } from 'react';
import { PNGToothIcon } from './png-tooth-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TOOTH_STATUSES = [
  { id: 'teeth_in_mouth', name: 'Teeth in Mouth', description: 'Natural tooth (1.png)', imageNumber: 1 },
  { id: 'missing_teeth', name: 'Missing Teeth', description: 'Missing teeth with mesh (2.png)', imageNumber: 2 },
  { id: 'prepped', name: 'Prepped', description: 'Prepared for restoration (3.png)', imageNumber: 3 },
  { id: 'will_extract', name: 'Will Extract', description: 'Scheduled for extraction (4.png)', imageNumber: 4 },
  { id: 'extracted', name: 'Extracted', description: 'Already extracted (5.png)', imageNumber: 5 },
  { id: 'repair', name: 'Repair', description: 'Needs repair work (6.png)', imageNumber: 6 },
  { id: 'clasp', name: 'Clasp', description: 'Has clasp attachment (7.png)', imageNumber: 7 },
  { id: 'implant', name: 'Implant', description: 'Dental implant (7.png - shared)', imageNumber: 7 }
];

const TOOTH_SIZES = [
  { id: 'small', name: 'Small', description: '20x30px' },
  { id: 'medium', name: 'Medium', description: '40x61px' },
  { id: 'large', name: 'Large', description: '60x91px' }
];

export const PNGToothDemo: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('teeth_in_mouth');
  const [selectedSize, setSelectedSize] = useState<string>('medium');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PNG Tooth Images Integration Demo</h1>
        <p className="text-gray-600">Interactive demonstration of the PNG tooth images (1.png - 7.png) with different statuses and sizes</p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tooth Status (PNG Image)</h3>
            <div className="flex flex-wrap gap-2">
              {TOOTH_STATUSES.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedStatus === status.id
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.name} ({status.imageNumber}.png)
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Size</h3>
            <div className="flex gap-2">
              {TOOTH_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedSize === size.id
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Tooth Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Tooth Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-4 justify-items-center">
            {Array.from({ length: 16 }, (_, i) => i + 1).map((toothNumber) => (
              <div key={toothNumber} className="text-center">
                <div
                  onClick={() => setSelectedTooth(selectedTooth === toothNumber ? null : toothNumber)}
                  className="cursor-pointer"
                >
                  <PNGToothIcon
                    toothNumber={toothNumber}
                    status={selectedStatus as any}
                    size={selectedSize as any}
                    isSelected={selectedTooth === toothNumber}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">{toothNumber}</span>
              </div>
            ))}
          </div>
          {selectedTooth && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Selected: Tooth #{selectedTooth} - {TOOTH_STATUSES.find(s => s.id === selectedStatus)?.name} 
                ({TOOTH_STATUSES.find(s => s.id === selectedStatus)?.imageNumber}.png)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All PNG Images Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>All PNG Tooth Images (1.png - 7.png)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TOOTH_STATUSES.map((status) => (
              <div key={status.id} className="text-center p-3 border rounded-lg">
                <PNGToothIcon
                  status={status.id as any}
                  size="medium"
                />
                <h4 className="font-medium text-sm mt-2">{status.name}</h4>
                <p className="text-xs text-gray-500">{status.description}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {status.imageNumber}.png
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Size Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Size Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6 justify-center">
            {TOOTH_SIZES.map((size) => (
              <div key={size.id} className="text-center">
                <PNGToothIcon
                  status="teeth_in_mouth"
                  size={size.id as any}
                />
                <h4 className="font-medium text-sm mt-2">{size.name}</h4>
                <p className="text-xs text-gray-500">{size.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">✓</Badge>
            <div>
              <h4 className="font-medium">PNG Image Mapping</h4>
              <p className="text-sm text-gray-600">Each tooth status is mapped to a specific PNG image: 1.png (teeth in mouth), 2.png (prepped), 3.png (will extract), etc.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">✓</Badge>
            <div>
              <h4 className="font-medium">Tooth Mapping Toolbar</h4>
              <p className="text-sm text-gray-600">The tooth mapping toolbar now uses your custom PNG images instead of CSS-based icons.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">✓</Badge>
            <div>
              <h4 className="font-medium">Next.js Image Optimization</h4>
              <p className="text-sm text-gray-600">Using Next.js Image component for automatic optimization and responsive loading.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">🔄</Badge>
            <div>
              <h4 className="font-medium">Ready for Production</h4>
              <p className="text-sm text-gray-600">The PNG tooth images are now integrated and ready to use in your dental application.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PNGToothDemo;
