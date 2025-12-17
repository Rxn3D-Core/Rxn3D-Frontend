"use client"

import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ValidationErrorProps {
  message?: string
  className?: string
}

export function ValidationError({ message, className }: ValidationErrorProps) {
  if (!message) return null

  return (
    <div className={cn("flex items-center gap-2 text-sm text-red-600 mt-1", className)}>
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  )
}
