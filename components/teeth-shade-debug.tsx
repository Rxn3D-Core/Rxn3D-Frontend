import React from 'react'
import { TeethShadeGuideImage } from './teeth-shade-guide-image'

// Debug component to test teeth shade API integration
export function TeethShadeDebug() {
  const customerId = 123 // Test customer ID

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-2xl font-bold">Teeth Shade Debug</h1>
      
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Teeth Shade Guide (with customerId)</h2>
        <TeethShadeGuideImage 
          type="teeth" 
          customerId={customerId}
          productId={456}
          className="border rounded-lg p-4"
        />
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Teeth Shade Guide (without customerId)</h2>
        <TeethShadeGuideImage 
          type="teeth" 
          className="border rounded-lg p-4"
        />
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Gum Shade Guide (for comparison)</h2>
        <TeethShadeGuideImage 
          type="gum" 
          customerId={customerId}
          productId={456}
          className="border rounded-lg p-4"
        />
      </div>
    </div>
  )
}

