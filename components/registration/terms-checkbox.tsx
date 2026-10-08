"use client"

import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TermsCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
  className?: string
}

export function TermsCheckbox({ checked, onCheckedChange, error, className }: TermsCheckboxProps) {
  return (
    <div className={cn("space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4", className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id="accepted_terms"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5 border-slate-300 data-[state=checked]:border-[#1162A8] data-[state=checked]:bg-[#1162A8]"
        />
        <Label htmlFor="accepted_terms" className="cursor-pointer text-sm leading-relaxed text-slate-600">
          I agree to the{" "}
          <Link href="/terms" className="font-medium text-[#1162A8] hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-[#1162A8] hover:underline">
            Privacy Policy
          </Link>
        </Label>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
