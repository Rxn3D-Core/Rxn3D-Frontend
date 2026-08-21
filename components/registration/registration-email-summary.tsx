"use client"

import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"

interface RegistrationEmailSummaryProps {
  email: string
  label?: string
  className?: string
}

export function RegistrationEmailSummary({
  email,
  label = "Verification email",
  className,
}: RegistrationEmailSummaryProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3",
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1162A8]/10 text-[#1162A8]">
        <Mail className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800">{email}</p>
      </div>
    </div>
  )
}
