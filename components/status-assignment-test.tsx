"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MissingTeethCards } from './missing-teeth-cards';

export const StatusAssignmentTest: React.FC = () => {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([1, 2, 3]);
  const [missingTeeth, setMissingTeeth] = useState<number[]>([]);
  const [extractedTeeth, setExtractedTeeth] = useState<number[]>([]);
  const [willExtractTeeth, setWillExtractTeeth] = useState<number[]>([]);

  const handleStatusAssign = (status: string, teeth: number[]) => {
    
    switch (status) {
      case 'Missing teeth':
        setMissingTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Has been extracted':
        setExtractedTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Will extract on delivery':
        setWillExtractTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      default:
    }
  };

  const handleAllTeethMissing = () => {
    const allTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
    setMissingTeeth(allTeeth);
    setSelectedTeeth([]);
  };

  const toggleTooth = (toothNumber: number) => {
    setSelectedTeeth(prev => 
      prev.includes(toothNumber) 
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    );
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Status Assignment Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Selected Teeth: {selectedTeeth.join(', ')}</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 16 }, (_, i) => i + 1).map(tooth => (
                  <Button
                    key={tooth}
                    variant={selectedTeeth.includes(tooth) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTooth(tooth)}
                  >
                    {tooth}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Test Buttons</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleStatusAssign('Missing teeth', selectedTeeth)}
                    className="w-full"
                  >
                    Assign "Missing teeth" to selected
                  </Button>
                  <Button 
                    onClick={() => handleStatusAssign('Has been extracted', selectedTeeth)}
                    className="w-full"
                  >
                    Assign "Has been extracted" to selected
                  </Button>
                  <Button 
                    onClick={() => handleStatusAssign('Will extract on delivery', selectedTeeth)}
                    className="w-full"
                  >
                    Assign "Will extract on delivery" to selected
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Current State</h3>
                <div className="text-sm space-y-1">
                  <div>Missing: {missingTeeth.join(', ') || 'None'}</div>
                  <div>Extracted: {extractedTeeth.join(', ') || 'None'}</div>
                  <div>Will Extract: {willExtractTeeth.join(', ') || 'None'}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Missing Teeth Cards Component</CardTitle>
        </CardHeader>
        <CardContent>
          <MissingTeethCards
            type="maxillary"
            selectedTeeth={selectedTeeth}
            missingTeeth={missingTeeth}
            extractedTeeth={extractedTeeth}
            willExtractTeeth={willExtractTeeth}
            onAllTeethMissing={handleAllTeethMissing}
            onTeethInMouthClick={() => {}}
            onMissingTeethClick={() => {}}
            onWillExtractClick={() => {}}
            isCaseSubmitted={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
