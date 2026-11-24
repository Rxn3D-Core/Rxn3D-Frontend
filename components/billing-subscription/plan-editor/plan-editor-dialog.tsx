"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, ArrowLeft, ArrowRight, Check, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { usePlanFeatureGroups, usePlanVersion, usePlanVersionPreview, useSavePlan } from "@/hooks/use-plan-editor"
import { cn } from "@/lib/utils"
import {
  EDITOR_STEPS,
  browserTimeZone,
  buildPayload,
  buildSaveOptions,
  formFromPayload,
  formatInZone,
  localToUtcIso,
  notifyLabsValue,
  parseApiError,
  primaryActionKey,
  reviewPreview,
  stepForField,
  utcToLocalParts,
  validateSchedule,
  validateStep,
  type EditorError,
  type EditorStep,
  type PlanForm,
  type ScheduleInput,
} from "@/lib/billing/plan-editor"
import type { PlanStatus, SaveMode, VersionState } from "@/lib/api/billing-config-plans"
import { StepBasics } from "./step-basics"
import { StepFeatures } from "./step-features"
import { StepPricing } from "./step-pricing"
import { StepReview } from "./step-review"
import { StepSave } from "./step-save"

const OPEN_STATES: VersionState[] = ["draft", "scheduled", "publishing", "failed"]

function defaultSchedule(): ScheduleInput {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
    time: "09:00",
    timeZone: browserTimeZone(),
  }
}

export interface PlanEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new plan */
  planId: number | null
  planName?: string
  planStatus?: PlanStatus
  initialStep?: EditorStep
  initialMode?: SaveMode
}

/** Mount with a fresh `key` per opening so state starts clean. */
export function PlanEditorDialog({ open, onOpenChange, planId, planName, planStatus, initialStep, initialMode }: PlanEditorDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isNew = planId === null

  const versionQuery = usePlanVersion(planId, open)
  const envelope = versionQuery.data
  const openVersion = envelope?.version && OPEN_STATES.includes(envelope.version.state) ? envelope.version : null
  const source: "live" | "draft" = openVersion ? "draft" : "live"
  const groupsQuery = usePlanFeatureGroups(planId, source, open && (isNew || versionQuery.isSuccess))
  const groups = useMemo(() => groupsQuery.data?.groups ?? [], [groupsQuery.data])

  const [form, setForm] = useState<PlanForm | null>(null)
  const [step, setStep] = useState<EditorStep>(initialStep ?? "basics")
  const [visited, setVisited] = useState<Set<EditorStep>>(() => new Set([initialStep ?? "basics"]))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [featureErrors, setFeatureErrors] = useState<Record<string, string>>({})
  const [errorSteps, setErrorSteps] = useState<EditorStep[]>([])
  const [editorError, setEditorError] = useState<EditorError | null>(null)
  const [mode, setMode] = useState<SaveMode>(initialMode ?? "publish_now")
  const [schedule, setSchedule] = useState<ScheduleInput>(defaultSchedule)
  const [showScheduleErrors, setShowScheduleErrors] = useState(false)
  const [notifyChoice, setNotifyChoice] = useState(true)
  const [lastMode, setLastMode] = useState<SaveMode>("publish_now")
  const saveMutation = useSavePlan()
  const stepNavRef = useRef<HTMLElement>(null)

  // On narrow screens the step bar scrolls sideways: keep the current step visible.
  useEffect(() => {
    const active = stepNavRef.current?.querySelector<HTMLElement>('[aria-current="step"]')
    active?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
  }, [step])

  // Initialise the form once the live payload / open version and the catalogue are loaded.
  useEffect(() => {
    if (form || !groupsQuery.data) return
    if (!isNew && !envelope) return
    const payload = openVersion?.payload ?? envelope?.live ?? null
    setForm(formFromPayload(payload, groupsQuery.data.groups))
    if (openVersion) {
      setNotifyChoice(openVersion.notify_labs !== false)
      if (openVersion.scheduled_publish_at && openVersion.schedule_timezone) {
        const parts = utcToLocalParts(openVersion.scheduled_publish_at, openVersion.schedule_timezone)
        if (parts) setSchedule({ ...parts, timeZone: openVersion.schedule_timezone })
      }
      if (!initialMode && openVersion.state === "scheduled") setMode("schedule")
    }
  }, [form, groupsQuery.data, envelope, openVersion, isNew, initialMode])

  const payload = useMemo(() => (form ? buildPayload(form, groups) : null), [form, groups])
  const previewQuery = usePlanVersionPreview(planId, payload, open && step === "review" && !isNew && form !== null)
  // The payload the form was loaded from: lets the Review step drop rows the user did not change (RXN-121).
  const sourcePayload = openVersion?.payload ?? envelope?.live ?? null
  const preview = useMemo(() => reviewPreview(previewQuery.data, sourcePayload, form), [previewQuery.data, sourcePayload, form])

  const updateForm = (patch: Partial<PlanForm>) => {
    setForm((current) => (current ? { ...current, ...patch } : current))
    // Editing clears the matching client/server messages for this step.
    setFieldErrors((current) => {
      const keys = Object.keys(patch)
      const next = { ...current }
      for (const field of Object.keys(next)) {
        const root = field.split(".")[0]
        if (keys.includes(root) || (root === "pricing" && keys.includes("prices")) || (root === "overage_policy" && keys.includes("overage"))) delete next[field]
      }
      return next
    })
    if ("features" in patch) setFeatureErrors({})
  }

  const goTo = (next: EditorStep) => {
    setStep(next)
    setVisited((v) => new Set(v).add(next))
  }

  const checkStep = (target: EditorStep): boolean => {
    if (!form) return false
    const errors = validateStep(target, form, groups)
    setFieldErrors((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([field]) => stepForField(field) !== target)),
      ...errors,
    }))
    const failed = Object.keys(errors).length > 0
    setErrorSteps((current) => (failed ? Array.from(new Set([...current, target])) : current.filter((s) => s !== target)))
    return !failed
  }

  const next = () => {
    if (!checkStep(step)) return
    const index = EDITOR_STEPS.indexOf(step)
    if (index < EDITOR_STEPS.length - 1) goTo(EDITOR_STEPS[index + 1])
  }
  const back = () => {
    const index = EDITOR_STEPS.indexOf(step)
    if (index > 0) goTo(EDITOR_STEPS[index - 1])
  }

  const submit = (submitMode: SaveMode) => {
    if (!form || !payload) return
    setEditorError(null)
    setLastMode(submitMode)
    const errors: Record<string, string> = {}
    const failedSteps: EditorStep[] = []
    for (const s of ["basics", "pricing", "features"] as EditorStep[]) {
      const e = validateStep(s, form, groups)
      if (Object.keys(e).length) failedSteps.push(s)
      Object.assign(errors, e)
    }
    if (failedSteps.length) {
      setFieldErrors(errors)
      setErrorSteps(failedSteps)
      goTo(failedSteps[0])
      return
    }
    if (submitMode === "schedule" && validateSchedule(schedule)) {
      setShowScheduleErrors(true)
      setMode("schedule")
      goTo("review")
      return
    }
    const notifyLabs = preview ? notifyLabsValue(preview, notifyChoice) : notifyChoice
    const options = buildSaveOptions({
      mode: submitMode,
      schedule,
      notifyLabs,
      expectedVersionUpdatedAt: openVersion?.updated_at,
      isNewPlan: isNew,
    })
    saveMutation.mutate(
      { planId, payload, options },
      {
        onSuccess: (result) => {
          if (submitMode === "publish_now") {
            const stats = result.version?.notification_stats
            toast({
              title: t("planEditor.toast.published", { name: payload.name }),
              description:
                stats && stats.state === "sending"
                  ? t("planEditor.toast.emailing", { addresses: stats.addresses, labs: stats.labs })
                  : undefined,
            })
          } else if (submitMode === "schedule") {
            const iso = localToUtcIso(schedule.date, schedule.time, schedule.timeZone)
            toast({
              title: t("planEditor.toast.scheduled", { name: payload.name }),
              description: iso ? formatInZone(iso, schedule.timeZone) : undefined,
            })
          } else {
            toast({ title: t("planEditor.toast.draftSaved", { name: payload.name }) })
          }
          onOpenChange(false)
        },
        onError: (error) => {
          const parsed = parseApiError(error, payload)
          setEditorError(parsed)
          if (parsed.kind === "validation") {
            setFieldErrors(parsed.fields)
            setFeatureErrors(parsed.features)
            setErrorSteps(parsed.steps)
            if (parsed.steps[0] && parsed.steps[0] !== "review") goTo(parsed.steps[0])
          }
        },
      },
    )
  }

  const reload = async () => {
    setEditorError(null)
    setFieldErrors({})
    setFeatureErrors({})
    setErrorSteps([])
    await versionQuery.refetch()
    await groupsQuery.refetch()
    setForm(null)
  }

  const loadFailed = versionQuery.isError || groupsQuery.isError
  const busy = saveMutation.isPending
  const title = isNew ? t("planEditor.titleNew") : t("planEditor.titleEdit", { name: form?.name || planName || "" })
  const isLive = !isNew && (envelope?.live_status ?? planStatus) === "active"
  const statusLabel = isNew ? t("planEditor.status.new") : isLive ? t("planEditor.status.live") : t("planEditor.status.draft")

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent
        className="flex max-h-[92dvh] w-[calc(100vw-32px)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0"
        showCloseButton={false}
        data-testid="plan-editor-dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3 md:px-5">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="truncate text-lg font-semibold md:text-xl">{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    isLive ? "bg-[#119933]/15 text-[#0B6B24]" : "bg-[#F2F4F7] text-[#434343]",
                  )}
                  data-testid="plan-editor-status"
                >
                  {statusLabel}
                </span>
                {openVersion ? (
                  <span className="rounded-full bg-[#1162A8]/10 px-2 py-0.5 text-xs font-medium text-[#1162A8]">
                    {t(`planEditor.versionState.${openVersion.state}`)}
                  </span>
                ) : null}
              </div>
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={busy} aria-label={t("planEditor.actions.close")}>
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        {/* shrink-0: overflow-x makes the nav's min-height 0, so a tall step (Features) squeezed and clipped it. */}
        <nav ref={stepNavRef} className="flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-2 md:px-4" aria-label={t("planEditor.stepsLabel")}>
          {EDITOR_STEPS.map((s, index) => {
            const hasError = errorSteps.includes(s)
            const ok = !hasError && visited.has(s) && s !== step && s !== "review"
            return (
              <button
                key={s}
                type="button"
                onClick={() => form && goTo(s)}
                aria-current={s === step ? "step" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-200",
                  s === step ? "bg-[#1162A8]/10 text-[#1162A8]" : "text-muted-foreground hover:text-foreground",
                  hasError && "text-[#CF0202]",
                )}
                data-testid={`plan-editor-step-${s}`}
                data-state={hasError ? "error" : ok ? "ok" : undefined}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                    s === step ? "border-[#1162A8]" : "border-current",
                    hasError && "border-[#CF0202] bg-[#CF0202] text-white",
                    ok && "border-[#119933] bg-[#119933] text-white",
                  )}
                >
                  {hasError ? <AlertCircle className="h-3 w-3" /> : ok ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {t(`planEditor.steps.${s}`)}
              </button>
            )
          })}
        </nav>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 md:px-5" data-testid="plan-editor-body">
          {openVersion ? (
            <div className="space-y-1 rounded-lg border border-[#1162A8]/30 bg-[#1162A8]/5 px-3 py-2 text-sm text-[#0d4a7e]" data-testid="plan-editor-staged-banner">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {t("planEditor.banner.staged")}
              </p>
              {openVersion.state === "failed" && openVersion.last_error ? (
                <p className="pl-6 text-xs text-[#CF0202]">{t("planEditor.banner.lastFailed", { error: openVersion.last_error })}</p>
              ) : null}
              {openVersion.live_changed_since_draft ? (
                <p className="pl-6 text-xs text-[#7A4A00]">{t("planEditor.banner.liveChanged")}</p>
              ) : null}
            </div>
          ) : null}

          {editorError ? <ErrorBanner error={editorError} lastMode={lastMode} busy={busy} onReload={reload} onRetry={() => submit(lastMode)} onSaveDraft={() => { setMode("draft"); submit("draft") }} /> : null}

          {loadFailed ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#CF0202]/30 bg-[#CF0202]/5 p-3 text-sm text-[#CF0202]">
              {t("planEditor.errors.loadFailed")}
              <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>{t("planEditor.actions.tryAgain")}</Button>
            </div>
          ) : !form ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="plan-editor-loading">{t("planEditor.loading")}</p>
          ) : (
            <>
              {step === "basics" ? <StepBasics form={form} onChange={updateForm} errors={fieldErrors} /> : null}
              {step === "pricing" ? <StepPricing form={form} onChange={updateForm} errors={fieldErrors} /> : null}
              {step === "features" ? (
                <StepFeatures form={form} groups={groups} onChange={updateForm} errors={fieldErrors} featureErrors={featureErrors} />
              ) : null}
              {step === "review" ? (
                <div className="space-y-4">
                  <StepReview
                    isNewPlan={isNew}
                    preview={preview}
                    isLoading={previewQuery.isLoading}
                    isError={previewQuery.isError}
                    onRetry={() => void previewQuery.refetch()}
                    notifyChoice={notifyChoice}
                    onNotifyChange={setNotifyChoice}
                  />
                  <StepSave
                    mode={mode}
                    onModeChange={(value) => {
                      setMode(value)
                      setShowScheduleErrors(false)
                    }}
                    schedule={schedule}
                    onScheduleChange={setSchedule}
                    showScheduleErrors={showScheduleErrors}
                  />
                  {fieldErrors.scheduled_publish_at || fieldErrors.schedule_timezone ? (
                    <p className="text-xs text-[#CF0202]">{fieldErrors.scheduled_publish_at || fieldErrors.schedule_timezone}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 md:px-5">
          {step === "basics" ? (
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="h-9 px-2 text-sm" disabled={busy}>{t("planEditor.actions.cancel")}</Button>
            </DialogClose>
          ) : (
            <Button type="button" variant="ghost" className="h-9 px-2 text-sm" onClick={back} disabled={busy}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("planEditor.actions.back")}
            </Button>
          )}
          {step !== "review" ? (
            <Button type="button" className="h-9 px-4 text-sm" onClick={next} disabled={!form || busy} data-testid="plan-editor-next">
              {t(`planEditor.actions.next.${step}`)}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-9 px-4 text-sm"
              onClick={() => submit(mode)}
              disabled={!form || busy}
              data-testid="plan-editor-submit"
            >
              {busy ? t("planEditor.actions.saving") : t(primaryActionKey(mode))}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ErrorBanner({
  error,
  lastMode,
  busy,
  onReload,
  onRetry,
  onSaveDraft,
}: {
  error: EditorError
  lastMode: SaveMode
  busy: boolean
  onReload: () => void
  onRetry: () => void
  onSaveDraft: () => void
}) {
  const { t } = useTranslation()
  let message: string
  let actions: ReactNode = null
  if (error.kind === "validation") {
    message = t("planEditor.errors.validation", { steps: error.steps.map((s) => t(`planEditor.steps.${s}`)).join(", ") })
  } else if (error.kind === "version_conflict") {
    message = t("planEditor.errors.versionConflict")
    actions = <Button type="button" size="sm" variant="outline" onClick={onReload} disabled={busy} data-testid="plan-editor-reload">{t("planEditor.actions.reload")}</Button>
  } else if (error.kind === "publish_in_progress") {
    message = t("planEditor.errors.publishInProgress")
  } else if (error.kind === "stripe") {
    message = error.stripeError ? t("planEditor.errors.stripeWithDetail", { detail: error.stripeError }) : t("planEditor.errors.stripe")
    actions = (
      <>
        <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={busy} data-testid="plan-editor-retry">{t("planEditor.actions.tryAgain")}</Button>
        {lastMode !== "draft" ? (
          <Button type="button" size="sm" onClick={onSaveDraft} disabled={busy} data-testid="plan-editor-save-draft-instead">{t("planEditor.actions.saveDraftInstead")}</Button>
        ) : null}
      </>
    )
  } else if (error.kind === "not_found") {
    message = t("planEditor.errors.notFound")
  } else {
    message = error.message ? t("planEditor.errors.genericWithDetail", { detail: error.message }) : t("planEditor.errors.generic")
  }
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-[#CF0202]/30 bg-[#CF0202]/5 px-3 py-2 text-sm text-[#CF0202]" data-testid="plan-editor-error">
      <p className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </p>
      {actions ? <div className="flex flex-wrap gap-2 pl-6">{actions}</div> : null}
    </div>
  )
}
