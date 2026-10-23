"use client"

import { FormMessage } from "@/components/ui/form"

/**
 * The single error line for a react-hook-form field. Show errors through this alone: giving
 * `Input` an `errorMessage` as well renders the message twice. Space for `lines` is held even
 * with no error so the form does not jump when one appears; 0 renders nothing until there is
 * an error.
 */
export function FieldError({ lines = 1 }: { lines?: 0 | 1 | 2 }) {
  const message = <FormMessage className="px-1 text-xs font-normal leading-4 text-[#CF0202]" />
  if (lines === 0) return message
  return <div className={lines === 2 ? "min-h-8" : "min-h-4"}>{message}</div>
}
