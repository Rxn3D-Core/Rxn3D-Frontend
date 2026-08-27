"use client"

import type { ReactNode } from "react"
import { PlanRoute } from "@/components/plan-route"
import { FEATURE_KEYS } from "@/lib/entitlements"

export default function GenerateStatementsLayout({
  children,
}: {
  children: ReactNode
}) {
  return <PlanRoute feature={FEATURE_KEYS.billingStatements}>{children}</PlanRoute>
}
