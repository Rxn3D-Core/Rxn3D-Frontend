"use client"

import Link from "next/link"
import { useEntitlements } from "@/contexts/entitlement-context"

export function TrialBanner() {
  const { trial, payload } = useEntitlements()
  if (!trial && !payload?.on_trial) return null

  const days = trial?.days_remaining ?? 0
  const ended = trial?.status === "expired" || trial?.status === "ended"
  if (ended) {
    return (
      <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-4 py-2 text-sm">
        Your Growth trial has ended. You are on Freemium.{" "}
        <Link href="/billing/subscriptions" className="font-semibold underline">
          Upgrade to keep Growth features
        </Link>
        .
      </div>
    )
  }

  if (!payload?.on_trial) return null

  return (
    <div className="bg-sky-50 text-sky-900 border-b border-sky-200 px-4 py-2 text-sm">
      Growth trial: {days} day{days === 1 ? "" : "s"} remaining. Numeric limits stay on Freemium.{" "}
      <Link href="/billing/subscriptions" className="font-semibold underline">
        View plans
      </Link>
    </div>
  )
}
