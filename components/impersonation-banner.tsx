"use client"

import { useAuth } from "@/contexts/auth-context"
import { Eye, LogOut } from "lucide-react"
import { useState } from "react"

export function ImpersonationBanner() {
  const { isImpersonating, stopImpersonation, user } = useAuth()
  const [exiting, setExiting] = useState(false)

  if (!isImpersonating) return null

  const handleExit = async () => {
    setExiting(true)
    try {
      await stopImpersonation()
    } finally {
      setExiting(false)
    }
  }

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()
  const email = user?.email?.trim() || ""
  const primaryLabel = fullName || email || "user"
  const secondaryLabel = fullName && email ? email : null

  return (
    <div
      className="text-white px-4 py-1.5"
      style={{
        background:
          "linear-gradient(231.46deg, #2AA6DE -14.5%, #82298D 51.11%, #C9539F 116.71%)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Eye className="h-4 w-4 flex-shrink-0 opacity-95" aria-hidden />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold truncate">
              {primaryLabel}
              {secondaryLabel ? (
                <span className="text-xs font-normal text-white/85"> · {secondaryLabel}</span>
              ) : null}
            </p>
            <p className="text-[11px] text-white/80 truncate">
              Admin access. Changes apply to their account, not yours.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExit}
          disabled={exiting}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/70 bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-[#82298D] disabled:opacity-60 flex-shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          {exiting ? "Exiting..." : "Exit"}
        </button>
      </div>
    </div>
  )
}
