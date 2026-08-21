"use client"

import { Building2, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface RegistrationListedSuccessProps {
  type: "Lab" | "Office"
  organizationName: string
  locationLabel: string
  logoUrl?: string | null
  planLabel?: string
  isContinuing?: boolean
  onContinue: () => void
  onClose: () => void
  className?: string
}

export function RegistrationListedSuccess({
  type,
  organizationName,
  locationLabel,
  logoUrl,
  planLabel = "Freemium plan",
  isContinuing = false,
  onContinue,
  onClose,
  className,
}: RegistrationListedSuccessProps) {
  const isLab = type === "Lab"

  const headline = isLab ? "You're listed!" : "You're registered!"
  const description = isLab
    ? `Offices searching Rxn3D can now find ${organizationName}. We'll email you when an office wants to send you a case.`
    : `Your practice is now on Rxn3D. Finish setup to connect with labs and send your first case.`
  const statusBadge = isLab ? "Listed" : "Registered"

  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col items-center px-2 py-2 text-center sm:px-1 sm:py-4", className)}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{headline}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>

      <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
        <div className="flex items-start gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-100"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Building2 className="h-5 w-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{organizationName}</p>
            {locationLabel ? (
              <p className="mt-0.5 text-sm text-slate-500">{locationLabel}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-[#1162A8]">
          {statusBadge} · {planLabel}
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-6 h-12 w-full bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-base font-semibold text-white hover:opacity-95"
        onClick={onContinue}
        disabled={isContinuing}
      >
        {isContinuing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          "Continue to dashboard"
        )}
      </Button>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 text-sm text-slate-500 transition-colors hover:text-slate-700"
      >
        I&apos;m done for now — close this window
      </button>
    </div>
  )
}
