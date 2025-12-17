"use client"

import React, { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import SpotlightOverlay from "@/components/spotlight-overlay"
import SpotlightField from "@/components/spotlight-field"
import { useSpotlight } from "@/hooks/use-spotlight"

export default function SpotlightDemo() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: ''
  })

  const [showSpotlight, setShowSpotlight] = useState(false)

  const {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight,
    nextField,
    previousField
  } = useSpotlight()

  // Keyboard navigation for spotlight mode
  React.useEffect(() => {
    if (!showSpotlight) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          previousField()
        } else {
          nextField()
        }
      } else if (e.key === 'Escape') {
        deactivateSpotlight()
        setShowSpotlight(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSpotlight, nextField, previousField, deactivateSpotlight])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Form Spotlight Demo</h1>
          <Button
            variant="outline"
            onClick={() => setShowSpotlight(!showSpotlight)}
            className="flex items-center gap-2"
          >
            {showSpotlight ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSpotlight ? "Hide Spotlight" : "Show Spotlight"}
          </Button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <SpotlightField
                onFocus={showSpotlight ? activateSpotlight : undefined}
                onBlur={showSpotlight ? deactivateSpotlight : undefined}
              >
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </SpotlightField>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <SpotlightField
                onFocus={showSpotlight ? activateSpotlight : undefined}
                onBlur={showSpotlight ? deactivateSpotlight : undefined}
              >
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </SpotlightField>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <SpotlightField
                onFocus={showSpotlight ? activateSpotlight : undefined}
                onBlur={showSpotlight ? deactivateSpotlight : undefined}
              >
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </SpotlightField>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <SpotlightField
                onFocus={showSpotlight ? activateSpotlight : undefined}
                onBlur={showSpotlight ? deactivateSpotlight : undefined}
              >
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </SpotlightField>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role">Job Role</Label>
              <SpotlightField
                onFocus={showSpotlight ? activateSpotlight : undefined}
                onBlur={showSpotlight ? deactivateSpotlight : undefined}
              >
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </SpotlightField>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={() => setFormData({
              name: '',
              email: '',
              phone: '',
              department: '',
              role: ''
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
          <h3 className="font-semibold text-blue-900 mb-2">How to use Spotlight Mode:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click "Show Spotlight" to enable the spotlight effect</li>
            <li>• Click on any form field to focus it with spotlight</li>
            <li>• Use Tab/Shift+Tab to navigate between fields</li>
            <li>• Press Escape to exit spotlight mode</li>
            <li>• The spotlight will blur everything except the focused field</li>
          </ul>
        </div>
      </div>

      {/* Spotlight Overlay */}
      <SpotlightOverlay
        isActive={isSpotlightActive && showSpotlight}
        targetElement={targetElement}
        onClose={deactivateSpotlight}
      >
        {showSpotlight && (
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Form Field Spotlight</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use Tab/Shift+Tab to navigate between fields
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={previousField}
                className="text-xs"
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextField}
                className="text-xs"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </SpotlightOverlay>
    </div>
  )
}

