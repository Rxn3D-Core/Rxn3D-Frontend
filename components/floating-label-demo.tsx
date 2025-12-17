"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * Demo component showing all floating label input states
 * Based on RXN3D Design System specifications
 */
export function FloatingLabelDemo() {
  const [defaultValue, setDefaultValue] = useState("")
  const [validValue, setValidValue] = useState("john.doe@email.com")
  const [warningValue, setWarningValue] = useState("pending-verification")
  const [errorValue, setErrorValue] = useState("invalid@")

  return (
    <div className="w-full max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Input Fields with Floating Labels</h1>
        <p className="text-gray-600">
          Form inputs with floating label animation and validation states
        </p>
      </div>

      {/* Default State */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Default State (hover and click to see label float)</h2>
        <Input
          label="Insert patient name"
          value={defaultValue}
          onChange={(e) => setDefaultValue(e.target.value)}
          placeholder="Insert patient name"
        />
      </div>

      {/* Valid State */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Valid State (green label and border)</h2>
        <Input
          label="Email address"
          value={validValue}
          onChange={(e) => setValidValue(e.target.value)}
          validationState="valid"
          placeholder="Email address"
        />
      </div>

      {/* Warning State */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Needs Action (orange label and border)</h2>
        <Input
          label="Username"
          value={warningValue}
          onChange={(e) => setWarningValue(e.target.value)}
          validationState="warning"
          warningMessage="This username is pending verification"
          placeholder="Username"
        />
      </div>

      {/* Error State */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Invalid State (red label and border)</h2>
        <Input
          label="Email verification"
          value={errorValue}
          onChange={(e) => setErrorValue(e.target.value)}
          validationState="error"
          errorMessage="Please enter a valid email address"
          placeholder="Email verification"
        />
      </div>

      {/* Disabled State */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Disabled State</h2>
        <Input label="Locked field" value="Cannot edit this field" disabled placeholder="Locked field" />
      </div>

      {/* Color Tokens Reference */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold mb-4">Color Tokens</h2>
        <p className="text-gray-600 mb-4">
          Global color system for consistent theming across the Rxn3D platform
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Blue */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg bg-[#1162A8]"></div>
              <div>
                <div className="font-semibold">Primary / Blue</div>
                <div className="text-sm text-gray-600">#1162A8</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">Focus & selection border</div>
            <button className="mt-2 rxn-pill rxn-pill-primary text-sm">
              Pill Background
            </button>
          </div>

          {/* Success Green */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg bg-[#119933]"></div>
              <div>
                <div className="font-semibold">Success / Green</div>
                <div className="text-sm text-gray-600">#119933</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">Valid / Active / Connected</div>
            <button className="mt-2 rxn-pill rxn-pill-success text-sm">
              Pill Background
            </button>
          </div>

          {/* Warning Orange */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg bg-[#FF9900]"></div>
              <div>
                <div className="font-semibold">Warning / Orange</div>
                <div className="text-sm text-gray-600">#FF9900</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">Needs Action / Pending</div>
            <button className="mt-2 rxn-pill rxn-pill-warning text-sm">
              Pill Background
            </button>
          </div>

          {/* Error Red */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg bg-[#CF0202]"></div>
              <div>
                <div className="font-semibold">Error / Red</div>
                <div className="text-sm text-gray-600">#CF0202</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">Invalid / Disconnected</div>
            <button className="mt-2 rxn-pill rxn-pill-error text-sm">
              Pill Background
            </button>
          </div>

          {/* Neutral Gray */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg bg-[#E0E0E0]"></div>
              <div>
                <div className="font-semibold">Neutral / Gray</div>
                <div className="text-sm text-gray-600">#E0E0E0</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">Default borders</div>
            <button className="mt-2 rxn-pill rxn-pill-neutral text-sm">
              Pill Background
            </button>
          </div>

          {/* Disabled Gray */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg bg-[#BDBDBD]"></div>
              <div>
                <div className="font-semibold">Disabled / Gray</div>
                <div className="text-sm text-gray-600">#BDBDBD</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">40% opacity layer</div>
            <button className="mt-2 rxn-pill rxn-pill-disabled text-sm">
              Pill Background
            </button>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold mb-4">Usage Guidelines</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Hover Glow:</strong> 20% opacity of primary color (150ms ease-out)
          </div>
          <div>
            <strong>Selected Halo:</strong> Blue border with 15-20% opacity outer glow (250ms
            ease-in-out)
          </div>
          <div>
            <strong>Disabled State:</strong> 40% opacity with gray tint (200ms ease-in)
          </div>
          <div>
            <strong>Corner Radius:</strong> 8px for inputs/buttons, 10px for pills
          </div>
          <div>
            <strong>Border Thickness:</strong> 1.5px consistently applied
          </div>
          <div>
            <strong>Shadow:</strong> Soft neutral gray (rgba(0,0,0,0.05))
          </div>
          <div>
            <strong>Pill Backgrounds:</strong> Light tints with color-matched borders and text
          </div>
          <div>
            <strong>Label Float:</strong> 200ms ease-out animation with white background strip
          </div>
        </div>
      </div>

      {/* Interaction States */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold mb-4">Interaction States Reference</h2>
        <p className="text-gray-600 mb-4">
          Visual guide to the four core interaction states in the Rxn3D design system
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Default */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-semibold">Default</div>
            <div className="text-sm text-gray-600">Neutral base state</div>
            <div className="font-medium text-sm">Effect:</div>
            <div className="text-xs text-gray-600">Gray outline, no effects</div>
            <Button className="w-full mt-2" variant="default">
              Button
            </Button>
            <Input type="text" placeholder="Placeholder" />
          </div>

          {/* Hover */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-semibold">Hover</div>
            <div className="text-sm text-gray-600">User hover state</div>
            <div className="font-medium text-sm">Effect:</div>
            <div className="text-xs text-gray-600">Soft glow (20% opacity)</div>
            <Button className="w-full mt-2" variant="default">
              Button
            </Button>
            <Input type="text" placeholder="Placeholder" />
          </div>

          {/* Selected */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-semibold">Selected</div>
            <div className="text-sm text-gray-600">Focused/active state</div>
            <div className="font-medium text-sm">Effect:</div>
            <div className="text-xs text-gray-600">Blue border + halo</div>
            <Button className="w-full mt-2" variant="default">
              Button
            </Button>
            <Input type="text" placeholder="Placeholder" />
          </div>

          {/* Disabled */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-semibold">Disabled</div>
            <div className="text-sm text-gray-600">Inactive/locked state</div>
            <div className="font-medium text-sm">Effect:</div>
            <div className="text-xs text-gray-600">40% opacity, grayed out</div>
            <Button className="w-full mt-2" variant="default" disabled>
              Button
            </Button>
            <Input type="text" placeholder="Placeholder" disabled />
          </div>
        </div>
      </div>

      {/* Buttons Section */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold mb-4">Buttons</h2>
        <p className="text-gray-600 mb-4">
          Interactive buttons with hover, selected, and disabled states
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Active Buttons</h3>
            <div className="flex gap-3 flex-wrap">
              <Button variant="default">Continue</Button>
              <Button variant="success">Save</Button>
              <Button variant="warning">Review</Button>
              <Button variant="destructive">Delete</Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Disabled Buttons</h3>
            <div className="flex gap-3 flex-wrap">
              <Button variant="default" disabled>
                Continue
              </Button>
              <Button variant="success" disabled>
                Save
              </Button>
              <Button variant="warning" disabled>
                Review
              </Button>
              <Button variant="destructive" disabled>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
