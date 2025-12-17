import React from 'react'
import { TeethShadeGuideImage } from './teeth-shade-guide-image'

// Example usage of the updated TeethShadeGuideImage component
export function TeethShadeGuideExample() {
  const customerId = 123 // This would come from your app state/context

  return (
    <div className="space-y-8">
      {/* Upper Jaw Only */}
      <div>
        <h2 className="text-xl font-bold mb-4">Upper Jaw (Maxillary)</h2>
        <TeethShadeGuideImage 
          type="gum" 
          arch="maxillary" 
          customerId={customerId}
          productId={456}
          className="border rounded-lg p-4"
        />
      </div>

      {/* Lower Jaw Only */}
      <div>
        <h2 className="text-xl font-bold mb-4">Lower Jaw (Mandibular)</h2>
        <TeethShadeGuideImage 
          type="gum" 
          arch="mandibular" 
          customerId={customerId}
          productId={456}
          className="border rounded-lg p-4"
        />
      </div>

      {/* Combined View (Fallback) */}
      <div>
        <h2 className="text-xl font-bold mb-4">Combined View (Both Jaws)</h2>
        <TeethShadeGuideImage 
          type="gum" 
          customerId={customerId}
          productId={456}
          className="border rounded-lg p-4"
        />
      </div>

      {/* Teeth Shade Guide (Dynamic) */}
      <div>
        <h2 className="text-xl font-bold mb-4">Teeth Shade Guide (Dynamic)</h2>
        <TeethShadeGuideImage 
          type="teeth" 
          customerId={customerId}
          productId={456}
          className="border rounded-lg p-4"
        />
      </div>

      {/* Teeth Shade Guide (Fallback) */}
      <div>
        <h2 className="text-xl font-bold mb-4">Teeth Shade Guide (Fallback)</h2>
        <TeethShadeGuideImage 
          type="teeth" 
          className="border rounded-lg p-4"
        />
      </div>
    </div>
  )
}
