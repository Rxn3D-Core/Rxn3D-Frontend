"use client"

import { redirect } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import LoadingOverlay from "@/components/ui/loading-overlay"

function LoadingDots() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

export default function Page() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <LoadingOverlay
        isLoading={true}
        title="Loading application..."
        message="Please wait while we initialize the application"
        zIndex={99999}
      />
    )
  }

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }

  return null
}
