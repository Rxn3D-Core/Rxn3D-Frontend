import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"

export default function CaseDesignCenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute> 
  )
}























