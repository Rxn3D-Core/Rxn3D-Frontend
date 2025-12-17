"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToothMappingToolbar } from '@/components/tooth-mapping-toolbar';

export function ToolbarPositioningTest() {
  const [maxillaryToolbarOpen, setMaxillaryToolbarOpen] = useState(false);
  const [mandibularToolbarOpen, setMandibularToolbarOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Tooth Mapping Toolbar Positioning Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button
              onClick={() => setMaxillaryToolbarOpen(!maxillaryToolbarOpen)}
              variant={maxillaryToolbarOpen ? "default" : "outline"}
            >
              Toggle Maxillary Toolbar (Left Side)
            </Button>
            <Button
              onClick={() => setMandibularToolbarOpen(!mandibularToolbarOpen)}
              variant={mandibularToolbarOpen ? "default" : "outline"}
            >
              Toggle Mandibular Toolbar (Right Side)
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Expected Behavior:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Maxillary toolbar should appear on the <strong>left side</strong> of the screen</li>
              <li>Mandibular toolbar should appear on the <strong>right side</strong> of the screen</li>
              <li>Both toolbars should be vertically centered</li>
              <li>Maxillary toolbar should have a blue left border</li>
              <li>Mandibular toolbar should have a blue right border</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Click the buttons above to test the toolbar positioning. 
              The toolbars should appear on opposite sides of the screen as specified.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Maxillary Toolbar */}
      <ToothMappingToolbar
        isOpen={maxillaryToolbarOpen}
        onClose={() => setMaxillaryToolbarOpen(false)}
        selectedMode={selectedMode}
        onModeSelect={setSelectedMode}
        onApplyToSelected={() => {}}
        selectedTeethCount={3}
        archType="maxillary"
      />

      {/* Mandibular Toolbar */}
      <ToothMappingToolbar
        isOpen={mandibularToolbarOpen}
        onClose={() => setMandibularToolbarOpen(false)}
        selectedMode={selectedMode}
        onModeSelect={setSelectedMode}
        onApplyToSelected={() => {}}
        selectedTeethCount={2}
        archType="mandibular"
      />
    </div>
  );
}
