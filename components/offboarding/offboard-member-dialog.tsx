"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { offboardingPreviewKey, useOffboardingPreview, useOffboardMember } from "@/hooks/use-offboarding"
import {
  blockedBy,
  blockerMessageKey,
  buildOffboardPayload,
  findUncoveredCaseIds,
  mapValidationErrors,
  type CaseTargets,
} from "@/lib/offboarding/offboarding"
import { OffboardingApiError } from "@/services/offboarding-service"
import type { OffboardingPreview, OffboardResult } from "@/types/offboarding"

export interface OffboardMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Organization the member leaves. */
  customerId: number | null
  /** Member being removed by an admin; null/omitted = the signed-in user leaving. */
  userId?: number | null
  /** Name shown before the preview loads. */
  memberName?: string
  organizationName?: string
  /** Called after the server confirmed. The caller reloads its list or profile. */
  onCompleted: (result: OffboardResult) => void
}

const selectClass =
  "h-10 w-full rounded-lg border-[1.5px] border-[#d1d5db] bg-white px-3 text-sm text-slate-900 focus:border-[#1162a8] focus:outline-none disabled:opacity-40"

export function OffboardMemberDialog({
  open,
  onOpenChange,
  customerId,
  userId = null,
  memberName,
  organizationName,
  onCompleted,
}: OffboardMemberDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const preview = useOffboardingPreview(customerId, userId, open)
  const mutation = useOffboardMember(customerId, userId)

  const [defaultTarget, setDefaultTarget] = useState<number | null>(null)
  const [caseTargets, setCaseTargets] = useState<CaseTargets>({})
  const [reason, setReason] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [defaultError, setDefaultError] = useState<string | null>(null)
  const [caseErrors, setCaseErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open) {
      setDefaultTarget(null)
      setCaseTargets({})
      setReason("")
      setFormError(null)
      setDefaultError(null)
      setCaseErrors({})
    }
  }, [open])

  const data: OffboardingPreview | undefined = preview.data
  const isSelf = userId === null
  const orgName = data?.customer.name ?? organizationName ?? ""
  const name = data?.member.name ?? memberName ?? ""
  const blockers = useMemo(() => (data ? blockedBy(data) : []), [data])
  const cases = data?.transferable_cases ?? []
  const uncovered = data ? findUncoveredCaseIds(cases, defaultTarget, caseTargets) : []
  const canSubmit = Boolean(data) && data!.can_offboard && blockers.length === 0 && uncovered.length === 0 && !mutation.isPending

  const submit = async () => {
    if (!data || !canSubmit) return
    setFormError(null)
    setDefaultError(null)
    setCaseErrors({})
    const payload = buildOffboardPayload({ cases, defaultTargetId: defaultTarget, caseTargets, reason })
    try {
      const result = await mutation.mutateAsync(payload)
      const base = isSelf
        ? t("offboarding.success.self", "You have left {{office}}.", { office: orgName })
        : t("offboarding.success.admin", "{{name}} was removed from {{office}}.", { name, office: orgName })
      const moved =
        result.transferred.length > 0
          ? ` ${t("offboarding.success.transferred", "{{count}} cases were transferred.", { count: result.transferred.length })}`
          : ""
      toast({ title: t("offboarding.success.title", "Removed"), description: base + moved })
      onOpenChange(false)
      onCompleted(result)
    } catch (error) {
      if (!(error instanceof OffboardingApiError)) {
        setFormError(error instanceof Error ? error.message : t("offboarding.errors.generic", "Something went wrong. Please try again."))
        return
      }
      if (error.status === 409 && error.code === "transfer_map_stale" && error.data) {
        queryClient.setQueryData(offboardingPreviewKey(customerId, userId), error.data)
        setCaseTargets({})
        setFormError(t("offboarding.errors.stale", "The open cases changed. Review the list again."))
      } else if (error.status === 422) {
        const mapped = mapValidationErrors(error.errors, payload.transfers)
        setDefaultError(mapped.default ?? null)
        setCaseErrors(mapped.byCase)
        setFormError(t("offboarding.errors.invalidTarget", "Choose an active doctor in this office."))
      } else {
        setFormError(error.message)
        void preview.refetch()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent
        data-testid="offboarding-dialog"
        showCloseButton
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="space-y-1 border-b border-slate-200 px-4 py-4 text-left sm:px-6">
          <DialogTitle data-testid="offboarding-title" className="pr-6 text-lg font-semibold text-slate-900">
            {isSelf
              ? t("offboarding.title.self", "Leave {{office}}", { office: orgName })
              : t("offboarding.title.admin", "Remove {{name}} from {{office}}", { name, office: orgName })}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isSelf
              ? t("offboarding.description.self", "You will lose access to {{office}}. Your account, history and other organizations stay as they are.", { office: orgName })
              : t("offboarding.description.admin", "{{name}} will lose access to {{office}}. Their account, history and other organizations stay as they are.", { name, office: orgName })}
          </DialogDescription>
        </DialogHeader>

        <div data-testid="offboarding-body" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          {preview.isLoading ? (
            <div data-testid="offboarding-loading" className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("offboarding.loading", "Checking open cases…")}
            </div>
          ) : preview.isError || !data ? (
            <div data-testid="offboarding-load-error" className="space-y-3 text-sm text-red-700">
              <p>{preview.error instanceof Error ? preview.error.message : t("offboarding.loadError", "Could not load the open cases.")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void preview.refetch()}>
                {t("offboarding.retry", "Try again")}
              </Button>
            </div>
          ) : (
            <>
              {blockers.length > 0 ? (
                <ul data-testid="offboarding-blockers" className="space-y-2">
                  {blockers.map((code) => (
                    <li
                      key={code}
                      data-testid={`offboarding-blocker-${code}`}
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t(blockerMessageKey(code), "This member cannot be removed right now.", { office: orgName })}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {data.requires_transfer && data.eligible_targets.length > 0 ? (
                <section data-testid="offboarding-transfer" className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t("offboarding.transfer.title", "Open cases to transfer ({{count}})", { count: cases.length })}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t("offboarding.transfer.hint", "Choose the doctor who takes over these cases. Closed and invoiced cases are not moved.")}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="offboarding-default-target">{t("offboarding.transfer.defaultTarget", "Transfer all open cases to")}</Label>
                    <select
                      id="offboarding-default-target"
                      data-testid="offboarding-default-target"
                      className={selectClass}
                      value={defaultTarget ?? ""}
                      onChange={(e) => setDefaultTarget(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">{t("offboarding.transfer.chooseDoctor", "Choose a doctor")}</option>
                      {data.eligible_targets.map((target) => (
                        <option key={target.user_id} value={target.user_id}>
                          {target.name}
                        </option>
                      ))}
                    </select>
                    {defaultError ? (
                      <p data-testid="offboarding-default-error" className="text-xs text-red-600">{defaultError}</p>
                    ) : null}
                  </div>

                  <ul data-testid="offboarding-case-list" className="space-y-2">
                    {cases.map((c) => (
                      <li key={c.case_id} data-testid={`offboarding-case-${c.case_id}`} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-sm font-semibold text-slate-900">{c.case_number}</span>
                          <span className="text-xs text-slate-500">
                            {[c.patient_name, c.lab ? t("offboarding.transfer.lab", "Lab: {{name}}", { name: c.lab.name }) : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                          {c.slips.map((s) => (
                            <li key={s.slip_id} className="text-xs leading-4">{[s.slip_number, s.status, s.location].filter(Boolean).join(" · ")}</li>
                          ))}
                        </ul>
                        <select
                          aria-label={t("offboarding.transfer.caseTarget", "Doctor for case {{number}}", { number: c.case_number })}
                          data-testid={`offboarding-case-target-${c.case_id}`}
                          className={`${selectClass} mt-2`}
                          value={caseTargets[c.case_id] ?? ""}
                          onChange={(e) =>
                            setCaseTargets((prev) => ({ ...prev, [c.case_id]: e.target.value ? Number(e.target.value) : null }))
                          }
                        >
                          <option value="">
                            {defaultTarget !== null
                              ? t("offboarding.transfer.sameAsAll", "Same as above")
                              : t("offboarding.transfer.chooseDoctor", "Choose a doctor")}
                          </option>
                          {data.eligible_targets.map((target) => (
                            <option key={target.user_id} value={target.user_id}>
                              {target.name}
                            </option>
                          ))}
                        </select>
                        {caseErrors[c.case_id] ? (
                          <p data-testid={`offboarding-case-error-${c.case_id}`} className="mt-1 text-xs text-red-600">{caseErrors[c.case_id]}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!data.requires_transfer && blockers.length === 0 && data.customer.type !== "lab" ? (
                <p data-testid="offboarding-no-open-cases" className="text-sm text-slate-600">
                  {t("offboarding.noOpenCases", "There are no open cases to transfer.")}
                </p>
              ) : null}

              {data.staying_cases.length > 0 ? (
                <section data-testid="offboarding-staying" className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("offboarding.staying.title", "Cases that stay with {{name}} ({{count}})", { name, count: data.staying_cases.length })}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t("offboarding.staying.hint", "These cases are in a late stage or have finished or invoiced work, so they are not moved. An automatic case note records that they stay with {{name}}.", { name })}
                  </p>
                  <ul className="space-y-1">
                    {data.staying_cases.map((c) => (
                      <li key={c.case_id} data-testid={`offboarding-staying-${c.case_id}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-4 text-slate-700">
                        <span className="text-xs font-semibold">{c.case_number}</span>
                        {c.patient_name ? ` · ${c.patient_name}` : ""} ·{" "}
                        {c.reason === "mixed"
                          ? t("offboarding.staying.mixed", "Open and finished work")
                          : t("offboarding.staying.lateStage", "Late stage")}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {data.staying_counts.closed > 0 ? (
                <p data-testid="offboarding-closed-count" className="text-xs text-slate-500">
                  {t("offboarding.closedCount", "Closed cases that are not affected: {{count}}", { count: data.staying_counts.closed })}
                </p>
              ) : null}

              {data.can_offboard && blockers.length === 0 ? (
                <div className="space-y-1">
                  <Label htmlFor="offboarding-reason">{t("offboarding.reason.label", "Reason (optional)")}</Label>
                  <Textarea
                    id="offboarding-reason"
                    data-testid="offboarding-reason"
                    maxLength={500}
                    rows={2}
                    value={reason}
                    placeholder={t("offboarding.reason.placeholder", "Added to the audit record")}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              ) : null}

              {formError ? (
                <p data-testid="offboarding-form-error" role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            data-testid="offboarding-cancel"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t("offboarding.cancel", "Cancel")}
          </Button>
          <Button
            type="button"
            data-testid="offboarding-confirm"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {mutation.isPending
              ? t("offboarding.working", "Working…")
              : isSelf
                ? t("offboarding.confirm.self", "Leave office")
                : t("offboarding.confirm.admin", "Remove member")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
