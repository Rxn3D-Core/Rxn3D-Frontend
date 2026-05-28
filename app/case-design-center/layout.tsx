import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"

export default function CaseDesignCenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-[100dvh] overflow-hidden bg-white">
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <main className="flex-1 overflow-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute> 
  )
}























