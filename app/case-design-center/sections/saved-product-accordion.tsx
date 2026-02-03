"use client"

import React from "react"
import { Accordion } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

export interface SavedProductAccordionProps {
  /** Controlled value (open accordion item id) */
  value: string
  /** Called when accordion selection changes */
  onValueChange: (value: string) => void
  /** Optional class name for the accordion */
  className?: string
  /** Accordion items (current product card + saved product cards) */
  children: React.ReactNode
}

/**
 * Accordion wrapper for the saved product section (current product + saved products).
 * Renders the Accordion container; items are passed as children from the page.
 * Uses flex + items-center to center accordion cards within the column.
 */
export function SavedProductAccordion({
  value,
  onValueChange,
  className = "w-full mt-4",
  children,
}: SavedProductAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className={cn("flex flex-col items-center w-full", className)}
      value={value}
      onValueChange={onValueChange}
    >
      {children}
    </Accordion>
  )
}
