"use client"

import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type { BillingConfigPlan } from "@/lib/api/billing-config-plans"
import { cardActions, notificationSummary, pendingBadge, type CardAction } from "@/lib/billing/plan-editor"

/** Live / Draft pill plus the pending-version badge ("Draft changes", "Scheduled · local (UTC)", "Publish failed"). */
export function PlanCardBadges({ plan }: { plan: BillingConfigPlan }) {
  const { t } = useTranslation()
  const badge = pendingBadge(plan)
  const isLive = plan.status === "active"
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={`plan-card-badges-${plan.id}`}>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
          isLive ? "bg-[#119933]/15 text-[#0B6B24]" : "bg-white text-[#434343]",
        )}
        data-testid={`plan-card-status-${plan.id}`}
      >
        {isLive ? t("planEditor.status.live") : t("planEditor.status.draft")}
      </span>
      {badge ? (
        <span
          title={badge.kind === "failed" && badge.error ? badge.error : undefined}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            badge.kind === "failed" ? "bg-[#CF0202]/10 text-[#CF0202]" : "bg-[#1162A8]/10 text-[#1162A8]",
          )}
          data-testid={`plan-card-pending-${plan.id}`}
        >
          {badge.kind === "scheduled"
            ? t("planEditor.card.scheduled", { local: badge.local, utc: badge.utc })
            : t(`planEditor.card.${badge.kind}`)}
        </span>
      ) : null}
    </div>
  )
}

export function PlanCardNotification({ plan }: { plan: BillingConfigPlan }) {
  const { t } = useTranslation()
  const summary = notificationSummary(plan.last_publish_notification)
  if (!summary) return null
  return (
    <p className="px-5 pb-2 text-[12px] text-[#777777]" data-testid={`plan-card-emailed-${plan.id}`}>
      {t("planEditor.card.emailed", { sent: summary.sent, total: summary.total })}
      {summary.failed > 0 ? (
        <span className="text-[#CF0202]"> · {t("planEditor.card.emailFailed", { count: summary.failed })}</span>
      ) : null}
    </p>
  )
}

/** Actions besides Edit (which the card footer already shows). */
export function PlanCardActions({ plan, onAction }: { plan: BillingConfigPlan; onAction: (action: CardAction) => void }) {
  const { t } = useTranslation()
  const actions = cardActions(plan).filter((a) => a !== "edit")
  if (!actions.length) return null
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-2">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAction(action)
          }}
          className={cn(
            "text-[12px] font-medium hover:underline",
            action === "discard" ? "text-[#CF0202]" : "text-[#1162A8]",
          )}
          data-testid={`plan-card-action-${action.replace("_", "-")}-${plan.id}`}
        >
          {t(`planEditor.card.actions.${action}`)}
        </button>
      ))}
    </div>
  )
}
