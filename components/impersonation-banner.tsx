"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { AlertCircle, X } from "lucide-react"

export function ImpersonationBanner() {
  const { isImpersonating, stopImpersonation, user, originalUser } = useAuth()

  if (!isImpersonating) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-3 shadow-lg border-b border-amber-600">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>You are currently viewing as</span>
            <span className="font-bold">
              {user?.first_name} {user?.last_name}
            </span>
            {originalUser && (
              <span className="text-amber-100">
                (Original: {originalUser.first_name} {originalUser.last_name})
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={stopImpersonation}
          className="text-white hover:bg-amber-600 hover:text-white flex items-center gap-2 flex-shrink-0"
        >
          <X className="h-4 w-4" />
          Exit View Mode
        </Button>
      </div>
    </div>
  )
}
