"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { notifyCheckboxState, recipientCounts } from "@/lib/billing/plan-editor"
import type { ChangeSummaryItem, PlanVersionPreview } from "@/lib/api/billing-config-plans"

function ChangeRow({ item, muted }: { item: ChangeSummaryItem; muted?: boolean }) {
  return (
    <li className="grid grid-cols-1 gap-0.5 py-1.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
      <span className={muted ? "text-muted-foreground" : "text-[#101828]"}>{item.label}</span>
      {item.from !== null || item.to !== null ? (
        <span className="font-medium tabular-nums text-[#434343]">
          {item.from ?? "—"} <span aria-hidden>→</span> {item.to ?? "—"}
        </span>
      ) : null}
    </li>
  )
}

export function StepReview({
  isNewPlan,
  preview,
  isLoading,
  isError,
  onRetry,
  notifyChoice,
  onNotifyChange,
}: {
  isNewPlan: boolean
  preview: PlanVersionPreview | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  notifyChoice: boolean
  onNotifyChange: (value: boolean) => void
}) {
  const { t } = useTranslation()
  const [emailOpen, setEmailOpen] = useState(false)

  if (isNewPlan) {
    return (
      <section className="rounded-lg border border-[#E5E7EB] p-3 text-sm text-muted-foreground" data-testid="plan-editor-review-new">
        {t("planEditor.review.newPlan")}
      </section>
    )
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground" data-testid="plan-editor-review-loading">{t("planEditor.review.loading")}</p>
  }
  if (isError || !preview) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#CF0202]/30 bg-[#CF0202]/5 p-3 text-sm text-[#CF0202]">
        {t("planEditor.review.loadFailed")}
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>{t("planEditor.actions.tryAgain")}</Button>
      </div>
    )
  }

  const groups = preview.change_summary.groups.filter((g) => g.items.length > 0)
  const internal = preview.change_summary.internal_only ?? []
  const notify = notifyCheckboxState(preview, notifyChoice)
  const counts = recipientCounts(preview)
  const changeCount = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-3" data-testid="plan-editor-review">
      <section className="rounded-lg border border-[#E5E7EB] p-3" data-testid="plan-editor-what-changed">
        <p className="text-sm font-semibold">{t("planEditor.review.whatChanged", { count: changeCount })}</p>
        {groups.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t("planEditor.review.noVisibleChanges")}</p>
        ) : (
          <div className="mt-1 space-y-2">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <ul className="divide-y divide-[#F2F4F7]">
                  {group.items.map((item, i) => <ChangeRow key={`${group.key}-${i}`} item={item} />)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {internal.length > 0 ? (
          <div className="mt-2 border-t pt-2" data-testid="plan-editor-internal-changes">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("planEditor.review.internalOnly")}</p>
            <ul className="divide-y divide-[#F2F4F7]">
              {internal.map((item, i) => <ChangeRow key={`internal-${i}`} item={item} muted />)}
            </ul>
          </div>
        ) : null}
      </section>

      {counts.labs > 0 ? (
        <p className="flex items-start gap-2 rounded-lg bg-[#FF9900]/10 px-3 py-2 text-sm text-[#7A4A00]" data-testid="plan-editor-labs-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t("planEditor.review.labsAffected", { count: counts.labs })}
        </p>
      ) : null}

      {notify.visible ? (
        <section className="space-y-1.5 rounded-lg border border-[#E5E7EB] p-3" data-testid="plan-editor-notify">
          <label className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
              checked={notify.checked}
              disabled={notify.disabled}
              onCheckedChange={(checked) => onNotifyChange(checked === true)}
              className="mt-0.5"
              data-testid="plan-editor-notify-checkbox"
            />
            <span className="text-sm font-medium">{t("planEditor.review.notifyLabel")}</span>
          </label>
          {notify.disabled ? (
            <p className="pl-6 text-xs text-muted-foreground">{t("planEditor.review.notifyNoChanges")}</p>
          ) : (
            <p className="pl-6 text-xs text-muted-foreground" data-testid="plan-editor-recipient-count">
              {t("planEditor.review.willEmail", { addresses: counts.addresses, labs: counts.labs })}
              {counts.skipped > 0 ? ` ${t("planEditor.review.skippedInvalid", { count: counts.skipped })}` : ""}
            </p>
          )}
          {preview.email_preview ? (
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="ml-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#1162A8] hover:underline"
              data-testid="plan-editor-preview-email"
            >
              <Mail className="h-3.5 w-3.5" />
              {t("planEditor.review.previewEmail")}
            </button>
          ) : null}
        </section>
      ) : null}

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent
          className="flex max-h-[90dvh] w-[calc(100vw-32px)] max-w-2xl flex-col gap-3 p-4"
          data-testid="plan-editor-email-preview"
          // Radix would focus the sandboxed iframe, which swallows Escape; focus the dialog instead.
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement | null)?.focus()
          }}
        >
          <DialogTitle className="pr-6 text-base font-semibold">{t("planEditor.review.emailPreviewTitle")}</DialogTitle>
          <DialogDescription className="text-sm">
            <span className="text-muted-foreground">{t("planEditor.review.subject")}: </span>
            <span className="font-medium text-[#101828]" data-testid="plan-editor-email-subject">{preview.email_preview?.subject}</span>
          </DialogDescription>
          {/* Server-rendered HTML in a sandboxed frame: no scripts, no same-origin access. */}
          <iframe
            title={t("planEditor.review.emailPreviewTitle")}
            sandbox=""
            srcDoc={preview.email_preview?.html ?? ""}
            className="min-h-[50dvh] w-full flex-1 rounded-md border border-[#E5E7EB] bg-white"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
