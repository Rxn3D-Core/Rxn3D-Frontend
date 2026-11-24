"use client"

import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FREQUENCIES, trialAllowed, type PlanForm } from "@/lib/billing/plan-editor"
import type { OverageBillingMethod, PriceFrequency, TrialAccessMode } from "@/lib/api/billing-config-plans"

export function StepPricing({
  form,
  onChange,
  errors,
}: {
  form: PlanForm
  onChange: (patch: Partial<PlanForm>) => void
  errors: Record<string, string>
}) {
  const { t } = useTranslation()
  const err = (field: string) => (errors[field] ? t(errors[field], { defaultValue: errors[field] }) : undefined)
  const canTrial = trialAllowed(form.name)
  const trialError = err("trial.enabled")

  const toggleFrequency = (frequency: PriceFrequency, checked: boolean) => {
    const next = checked
      ? FREQUENCIES.filter((f) => f === frequency || form.frequencies.includes(f))
      : form.frequencies.filter((f) => f !== frequency)
    // Keep the current default (first) frequency first.
    const first = form.frequencies[0]
    const ordered = first && next.includes(first) ? [first, ...next.filter((f) => f !== first)] : next
    onChange({ frequencies: ordered })
  }

  const trialSwitch = (
    <Switch
      checked={form.trial.enabled}
      disabled={!canTrial}
      onCheckedChange={(enabled) => onChange({ trial: { ...form.trial, enabled } })}
      data-testid="plan-editor-trial-toggle"
      aria-label={t("planEditor.pricing.trial")}
    />
  )

  return (
    <div className="space-y-4" data-testid="plan-editor-panel-pricing">
      <section className="space-y-2">
        <p className="text-sm font-semibold">{t("planEditor.pricing.frequencies")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {FREQUENCIES.map((frequency) => (
            <label key={frequency} className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.frequencies.includes(frequency)}
                onCheckedChange={(checked) => toggleFrequency(frequency, checked === true)}
                data-testid={`plan-editor-frequency-${frequency}`}
              />
              {t(`planEditor.frequency.${frequency}`)}
            </label>
          ))}
        </div>
        {err("frequencies") ? <p className="text-xs text-[#CF0202]">{err("frequencies")}</p> : null}
        <div className="grid gap-3 pt-1 md:grid-cols-2">
          {form.frequencies.map((frequency, index) => {
            const fieldError = err(`prices.${frequency}`) ?? err(`pricing.prices.${index}.price`)
            return (
              <Input
                key={frequency}
                label={t("planEditor.pricing.priceLabel", { frequency: t(`planEditor.frequency.${frequency}`) })}
                inputMode="decimal"
                value={form.prices[frequency]}
                onChange={(e) => onChange({ prices: { ...form.prices, [frequency]: e.target.value.replace("$", "").trim() } })}
                validationState={fieldError ? "error" : "default"}
                errorMessage={fieldError}
                data-testid={`plan-editor-price-${frequency}`}
              />
            )
          })}
        </div>
        {form.frequencies.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            {t("planEditor.pricing.defaultFrequency", { frequency: t(`planEditor.frequency.${form.frequencies[0]}`) })}
          </p>
        ) : null}
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">{t("planEditor.pricing.trial")}</p>
          {canTrial ? (
            trialSwitch
          ) : (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} data-testid="plan-editor-trial-disabled-hint">{trialSwitch}</span>
                </TooltipTrigger>
                <TooltipContent>{t("planEditor.pricing.trialGrowthOnly")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {!canTrial ? <p className="text-xs text-muted-foreground">{t("planEditor.pricing.trialGrowthOnly")}</p> : null}
        {trialError ? <p className="text-xs text-[#CF0202]" data-testid="plan-editor-trial-error">{trialError}</p> : null}
        {form.trial.enabled ? (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <Input
              label={t("planEditor.pricing.trialDays")}
              inputMode="numeric"
              value={form.trial.trial_days}
              onChange={(e) => onChange({ trial: { ...form.trial, trial_days: e.target.value } })}
              validationState={err("trial.trial_days") ? "error" : "default"}
              errorMessage={err("trial.trial_days")}
              data-testid="plan-editor-trial-days"
            />
            <RadioGroup
              value={form.trial.access_mode}
              onValueChange={(value: TrialAccessMode) => onChange({ trial: { ...form.trial, access_mode: value } })}
              className="flex flex-wrap items-center gap-4"
            >
              <label className="inline-flex items-center gap-2 text-sm">
                <RadioGroupItem value="full_access" />
                {t("planEditor.pricing.fullAccess")}
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <RadioGroupItem value="feature_limited" />
                {t("planEditor.pricing.featureLimited")}
              </label>
            </RadioGroup>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">{t("planEditor.pricing.overage")}</p>
          <Switch
            checked={form.overage.enabled}
            onCheckedChange={(enabled) => onChange({ overage: { ...form.overage, enabled } })}
            data-testid="plan-editor-overage-toggle"
            aria-label={t("planEditor.pricing.overage")}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("planEditor.pricing.overageHint")}</p>
        {form.overage.enabled ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label={t("planEditor.pricing.standardRate")}
                inputMode="decimal"
                value={form.overage.standard_rate}
                onChange={(e) => onChange({ overage: { ...form.overage, standard_rate: e.target.value } })}
                validationState={err("overage.standard_rate") ?? err("overage_policy.standard_rate") ? "error" : "default"}
                errorMessage={err("overage.standard_rate") ?? err("overage_policy.standard_rate")}
              />
              <Input
                label={t("planEditor.pricing.continuousRate")}
                inputMode="decimal"
                value={form.overage.discounted_continuous_rate}
                onChange={(e) => onChange({ overage: { ...form.overage, discounted_continuous_rate: e.target.value } })}
                validationState={err("overage.discounted_continuous_rate") ?? err("overage_policy.discounted_continuous_rate") ? "error" : "default"}
                errorMessage={err("overage.discounted_continuous_rate") ?? err("overage_policy.discounted_continuous_rate")}
              />
            </div>
            <RadioGroup
              value={form.overage.billing_method}
              onValueChange={(value: OverageBillingMethod) => onChange({ overage: { ...form.overage, billing_method: value } })}
              className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-5"
            >
              <label className="inline-flex items-center gap-2">
                <RadioGroupItem value="end_of_cycle" />
                {t("planEditor.pricing.endOfCycle")}
              </label>
              <label className="inline-flex items-center gap-2">
                <RadioGroupItem value="real_time" />
                {t("planEditor.pricing.realTime")}
              </label>
            </RadioGroup>
          </>
        ) : null}
      </section>
    </div>
  )
}
