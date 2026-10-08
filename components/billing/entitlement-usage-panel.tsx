"use client"

import { useEntitlements } from "@/contexts/entitlement-context"
import { FEATURE_KEYS } from "@/lib/entitlements"

function Meter({
  label,
  used,
  limit,
  remaining,
  unlimited,
}: {
  label: string
  used?: number
  limit?: number | string | null
  remaining?: number | null
  unlimited?: boolean
}) {
  const cap = unlimited || limit === "unlimited" ? null : Number(limit ?? 0)
  const pct = cap && cap > 0 ? Math.min(100, Math.round(((used ?? 0) / cap) * 100)) : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-slate-500">
          {unlimited ? `${used ?? 0} / unlimited` : `${used ?? 0} / ${cap ?? 0}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: unlimited ? "8%" : `${pct}%` }}
        />
      </div>
      {remaining != null && !unlimited ? (
        <p className="text-xs text-slate-500">{remaining} remaining</p>
      ) : null}
    </div>
  )
}

export function EntitlementUsagePanel() {
  const { usage, payload } = useEntitlements()
  const slips = usage[FEATURE_KEYS.slipCreationMonthlyLimit]
  const storage = usage[FEATURE_KEYS.storageLimitGb]
  const connections = usage[FEATURE_KEYS.connectionsOfficeLimit]
  const admins = usage[FEATURE_KEYS.seatsAdminLimit]
  const users = usage[FEATURE_KEYS.seatsUserLimit]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Plan usage</p>
        <p className="text-xs text-slate-500">
          {payload?.plan?.name ?? "Current plan"}
          {payload?.on_trial ? " · Growth trial overlay (limits stay Freemium)" : ""}
        </p>
      </div>
      <Meter
        label="Slips this cycle"
        used={slips?.used}
        limit={slips?.effective_limit}
        remaining={slips?.remaining}
        unlimited={slips?.is_unlimited}
      />
      <Meter
        label="Storage (GB)"
        used={storage?.used}
        limit={storage?.effective_limit}
        remaining={storage?.remaining}
        unlimited={storage?.is_unlimited}
      />
      <Meter
        label="Office connections"
        used={connections?.used}
        limit={connections?.effective_limit}
        remaining={connections?.remaining}
        unlimited={connections?.is_unlimited}
      />
      <Meter
        label="Admin seats"
        used={admins?.used}
        limit={admins?.effective_limit}
        remaining={admins?.remaining}
        unlimited={admins?.is_unlimited}
      />
      <Meter
        label="User seats"
        used={users?.used}
        limit={users?.effective_limit}
        remaining={users?.remaining}
        unlimited={users?.is_unlimited}
      />
    </div>
  )
}
