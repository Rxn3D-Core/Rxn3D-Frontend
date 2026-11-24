"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, ChevronDown, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  CLONE_SCOPE_KEY,
  PRICING_OWNED_KEYS,
  featureFormValue,
  filterGroups,
  groupTickState,
  isTickable,
  isTicked,
  setGroupAll,
  totalTickState,
  withTicked,
  type FeatureFormValue,
  type PlanForm,
} from "@/lib/billing/plan-editor"
import type {
  CapacityType,
  CatalogFeature,
  FeatureGroup,
  SlipLimitEnforcement,
  StorageLimitEnforcement,
} from "@/lib/api/billing-config-plans"

const humanize = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())

export function StepFeatures({
  form,
  groups,
  onChange,
  errors,
  featureErrors,
}: {
  form: PlanForm
  groups: FeatureGroup[]
  onChange: (patch: Partial<PlanForm>) => void
  errors: Record<string, string>
  featureErrors: Record<string, string>
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const visibleGroups = useMemo(() => filterGroups(groups, query), [groups, query])
  const total = totalTickState(groups, form.features)
  const err = (field: string) => (errors[field] ? t(errors[field], { defaultValue: errors[field] }) : undefined)

  const setFeature = (key: string, value: FeatureFormValue) => onChange({ features: { ...form.features, [key]: value } })
  const valueOf = (feature: CatalogFeature) => form.features[feature.key] ?? featureFormValue(feature, feature)

  return (
    <div className="space-y-4" data-testid="plan-editor-panel-features">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("planEditor.features.search")}
            aria-label={t("planEditor.features.search")}
            className="h-10 w-full rounded-lg border-[1.5px] border-[#D0D5DD] bg-white pl-9 pr-3 text-sm outline-none transition-colors duration-200 focus:border-[#1162A8]"
            data-testid="plan-editor-feature-search"
          />
        </div>
        <p className="text-sm text-muted-foreground" data-testid="plan-editor-features-count">
          {t("planEditor.features.totalOn", { on: total.on, total: total.total })}
        </p>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("planEditor.features.noMatch")}</p>
      ) : null}

      <div className="space-y-2">
        {visibleGroups.map((group) => {
          const fullGroup = groups.find((g) => g.key === group.key) ?? group
          const state = groupTickState(fullGroup, form.features)
          const isCollapsed = collapsed[group.key] && !query
          return (
            <section key={group.key} className="rounded-lg border border-[#E5E7EB]" data-testid={`plan-editor-group-${group.key}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F9FAFB] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !c[group.key] }))}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#101828]"
                  aria-expanded={!isCollapsed}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isCollapsed && "-rotate-90")} />
                  {t(`planEditor.groups.${group.key}`, { defaultValue: humanize(group.key) })}
                </button>
                <div className="flex items-center gap-3">
                  {state.total > 0 ? (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {t("planEditor.features.groupOn", { on: state.on, total: state.total })}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange({ features: setGroupAll(fullGroup, form.features, !state.allOn) })}
                        className="text-xs font-medium text-[#1162A8] hover:underline"
                        data-testid={`plan-editor-group-select-all-${group.key}`}
                      >
                        {state.allOn ? t("planEditor.features.clearAll") : t("planEditor.features.selectAll")}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {!isCollapsed ? (
                <div className="divide-y divide-[#F2F4F7]">
                  {group.features.map((feature) => (
                    <FeatureRow
                      key={feature.key}
                      feature={feature}
                      value={valueOf(feature)}
                      overageEnabled={form.overage.enabled}
                      error={featureErrors[feature.key] ?? err(`features.${feature.key}`)}
                      onChange={(value) => setFeature(feature.key, value)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      <section className="space-y-3 rounded-lg border border-[#E5E7EB] p-3" data-testid="plan-editor-usage-rules">
        <p className="text-sm font-semibold">{t("planEditor.features.usageRules")}</p>
        <RadioGroup
          value={form.capacity_type}
          onValueChange={(value: CapacityType) => onChange({ capacity_type: value })}
          className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6"
        >
          <label className="inline-flex items-center gap-2">
            <RadioGroupItem value="reset_each_cycle" />
            {t("planEditor.features.resetEachCycle")}
          </label>
          <label className="inline-flex items-center gap-2">
            <RadioGroupItem value="carry_over_unused" />
            {t("planEditor.features.carryOver")}
          </label>
        </RadioGroup>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("planEditor.features.atSlipLimit")}</p>
            <Select
              value={form.enforcement.at_slip_limit}
              onValueChange={(value: SlipLimitEnforcement) => onChange({ enforcement: { ...form.enforcement, at_slip_limit: value } })}
            >
              <SelectTrigger aria-label={t("planEditor.features.atSlipLimit")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="block_new_case_creation">{t("planEditor.enforcement.block_new_case_creation")}</SelectItem>
                <SelectItem value="allow_overage_standard_rate">{t("planEditor.enforcement.allow_overage_standard_rate")}</SelectItem>
                <SelectItem value="warning_only">{t("planEditor.enforcement.warning_only")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("planEditor.features.atStorageLimit")}</p>
            <Select
              value={form.enforcement.at_storage_limit}
              onValueChange={(value: StorageLimitEnforcement) => onChange({ enforcement: { ...form.enforcement, at_storage_limit: value } })}
            >
              <SelectTrigger aria-label={t("planEditor.features.atStorageLimit")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="block_new_file_upload">{t("planEditor.enforcement.block_new_file_upload")}</SelectItem>
                <SelectItem value="allow_with_overage_charges">{t("planEditor.enforcement.allow_with_overage_charges")}</SelectItem>
                <SelectItem value="warning_only">{t("planEditor.enforcement.warning_only")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            label={t("planEditor.features.graceDays")}
            inputMode="numeric"
            value={form.enforcement.grace_period_days}
            onChange={(e) => onChange({ enforcement: { ...form.enforcement, grace_period_days: e.target.value } })}
            validationState={err("enforcement.grace_period_days") ? "error" : "default"}
            errorMessage={err("enforcement.grace_period_days")}
          />
        </div>
      </section>
    </div>
  )
}

function FeatureRow({
  feature,
  value,
  overageEnabled,
  error,
  onChange,
}: {
  feature: CatalogFeature
  value: FeatureFormValue
  overageEnabled: boolean
  error?: string
  onChange: (value: FeatureFormValue) => void
}) {
  const { t } = useTranslation()
  const testId = `plan-editor-feature-${feature.key.replace(/[._]/g, "-")}`
  const optionLabel = (option: string) => t(`planEditor.enumOptions.${option}`, { defaultValue: humanize(option) })

  const label = (
    <span className="min-w-0">
      <span className="block text-sm font-medium text-[#101828]">{feature.name}</span>
      {feature.description ? <span className="block text-xs text-muted-foreground">{feature.description}</span> : null}
    </span>
  )

  let control: ReactNode
  if (PRICING_OWNED_KEYS.includes(feature.key)) {
    control = (
      <div className="flex items-start gap-2.5">
        <Checkbox checked={overageEnabled} disabled className="mt-0.5" aria-label={feature.name} />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-[#101828]">{feature.name}</span>
          <span className="block text-xs text-muted-foreground">{t("planEditor.features.setInPricing")}</span>
        </span>
      </div>
    )
  } else if (feature.key === CLONE_SCOPE_KEY) {
    control = (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {label}
        <RadioGroup
          value={String(value.value)}
          onValueChange={(next) => onChange({ ...value, value: next })}
          className="flex shrink-0 items-center gap-4"
          aria-label={feature.name}
        >
          {(feature.enum_options ?? []).map((option) => (
            <label key={option} className="inline-flex items-center gap-2 text-sm">
              <RadioGroupItem value={option} />
              {optionLabel(option)}
            </label>
          ))}
        </RadioGroup>
      </div>
    )
  } else if (isTickable(feature)) {
    const ticked = isTicked(feature, value)
    control = (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            checked={ticked}
            onCheckedChange={(checked) => onChange(withTicked(feature, value, checked === true))}
            className="mt-0.5"
            data-testid={testId}
          />
          {label}
        </label>
        {feature.value_type === "enum" ? (
          <div className="w-full shrink-0 pl-7 sm:w-44 sm:pl-0">
            <Select value={String(value.value)} onValueChange={(next) => onChange({ ...value, value: next })}>
              <SelectTrigger className="h-9" aria-label={t("planEditor.features.level", { name: feature.name })}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(feature.enum_options ?? []).map((option) => (
                  <SelectItem key={option} value={option}>{optionLabel(option)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    )
  } else {
    control = (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {label}
        <div className="flex shrink-0 items-center gap-3">
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={value.is_unlimited ? "" : String(value.value)}
            disabled={value.is_unlimited}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            aria-label={feature.name}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-9 w-28 rounded-lg border-[1.5px] border-[#D0D5DD] bg-white px-3 text-sm outline-none transition-colors duration-200 focus:border-[#1162A8] disabled:opacity-40",
              error && "border-[#CF0202]",
            )}
            data-testid={testId}
          />
          {feature.supports_unlimited ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.is_unlimited}
                onCheckedChange={(checked) =>
                  onChange({ ...value, is_unlimited: checked === true, value: checked === true ? "" : String(value.value || "0") })
                }
                data-testid={`${testId}-unlimited`}
              />
              {t("planEditor.features.unlimited")}
            </label>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2.5" data-feature-key={feature.key}>
      {control}
      {feature.drift ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-[#B45309]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t("planEditor.features.drift", { value: String(feature.value), column: String(feature.drift.column_value ?? "") })}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-[#CF0202]">{t(error, { defaultValue: error })}</p> : null}
    </div>
  )
}
