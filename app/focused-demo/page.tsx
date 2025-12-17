"use client"

import React, { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import FocusedSpotlight from "@/components/focused-spotlight"
import { useFocusedSpotlight } from "@/hooks/use-focused-spotlight"

export default function FocusedDemo() {
  const [formData, setFormData] = useState({
    office: '',
    patient: ''
  })

  const [showSpotlight, setShowSpotlight] = useState(false)

  const {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight
  } = useFocusedSpotlight()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="office">Office/Lab</Label>
              <div
                onFocus={() => showSpotlight && activateSpotlight(document.activeElement as HTMLElement)}
                onBlur={() => showSpotlight && deactivateSpotlight()}
              >
                <Select
                  value={formData.office}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, office: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office or lab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office-1">Main Office</SelectItem>
                    <SelectItem value="office-2">Branch Office</SelectItem>
                    <SelectItem value="lab-1">Central Lab</SelectItem>
                    <SelectItem value="lab-2">Regional Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient">Patient Name</Label>
              <div
                onFocus={() => showSpotlight && activateSpotlight(document.activeElement as HTMLElement)}
                onBlur={() => showSpotlight && deactivateSpotlight()}
              >
                <Input
                  id="patient"
                  value={formData.patient}
                  onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}
                  placeholder="Enter patient name"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={() => setFormData({
              office: '',
              patient: ''
            })}>
              Clear Form
            </Button>
            <Button onClick={() => {}}>
              Submit
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How to use Focused Spotlight:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click "Show Focus" to enable the spotlight effect</li>
            <li>• Click on the Office/Lab dropdown or Patient Name field</li>
            <li>• The spotlight will shadow the background and focus on the selected field</li>
            <li>• Click outside to exit the spotlight mode</li>
            <li>• Perfect for guiding users through critical form fields</li>
          </ul>
        </div>
      </div>

      {/* Focused Spotlight Overlay */}
      <FocusedSpotlight
        isActive={isSpotlightActive && showSpotlight}
        targetElement={targetElement}
        onClose={deactivateSpotlight}
      />
    </div>
  )
}

