"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <div className={cn("border rounded-md", className)}>
      <button
        type="button"
        className={cn(
          "flex items-center justify-between w-full p-4 font-medium text-left hover:bg-gray-50 transition-colors",
          headerClassName
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {title}
          <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
            ?
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      
      {isOpen && (
        <div className={cn("p-4 border-t", contentClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}
