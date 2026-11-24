/**
 * Pure helpers for the plan editor (RXN-116 / RXN-119): plan <-> form mapping, payload building,
 * feature tick logic, schedule conversion to UTC, error mapping and save options.
 * No React, no network: everything here is unit tested in plan-editor.test.mjs.
 */
import { z } from "zod"
import type {
  BillingConfigPlan,
  CapacityType,
  CatalogFeature,
  FeatureGroup,
  NotificationStats,
  OverageBillingMethod,
  PlanPayload,
  PlanVersionPreview,
  PriceFrequency,
  SaveMode,
  SaveOptions,
  SlipLimitEnforcement,
  StorageLimitEnforcement,
  TrialAccessMode,
} from "@/lib/api/billing-config-plans"

export type EditorStep = "basics" | "pricing" | "features" | "review"
export const EDITOR_STEPS: EditorStep[] = ["basics", "pricing", "features", "review"]

export const FREQUENCIES: PriceFrequency[] = ["monthly", "quarterly", "semi_annual", "annual"]
/** Owned by the Pricing step (overage_policy.enabled); shown read-only in Features. */
export const PRICING_OWNED_KEYS = ["slip.overage.enabled"]
/** Enum rendered as a radio (Half / Full), not as a tick box. */
export const CLONE_SCOPE_KEY = "product.library_clone_scope"
export const TRIAL_PLAN_NAME = "Growth"
export const MIN_SCHEDULE_LEAD_MS = 5 * 60 * 1000
export const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000

export interface FeatureFormValue {
  /** boolean for booleans, option string for enums, digits string for integers ("" = empty). */
  value: boolean | string
  is_unlimited: boolean
  included_in_trial: boolean
}

export interface PlanForm {
  name: string
  description: string
  badge_label: string
  display_order: string
  preview_bg_color: string
  currency: string
  frequencies: PriceFrequency[]
  prices: Record<PriceFrequency, string>
  trial: { enabled: boolean; trial_days: string; access_mode: TrialAccessMode }
  overage: {
    enabled: boolean
    standard_rate: string
    discounted_continuous_rate: string
    billing_method: OverageBillingMethod
  }
  capacity_type: CapacityType
  enforcement: {
    at_slip_limit: SlipLimitEnforcement
    at_storage_limit: StorageLimitEnforcement
    grace_period_days: string
  }
  features: Record<string, FeatureFormValue>
}

const str = (value: unknown): string => (value === null || value === undefined ? "" : String(value))

export function emptyForm(): PlanForm {
  return {
    name: "",
    description: "",
    badge_label: "",
    display_order: "",
    preview_bg_color: "",
    currency: "usd",
    frequencies: ["monthly"],
    prices: { monthly: "0.00", quarterly: "0.00", semi_annual: "0.00", annual: "0.00" },
    trial: { enabled: false, trial_days: "", access_mode: "full_access" },
    overage: { enabled: false, standard_rate: "0.00", discounted_continuous_rate: "0.00", billing_method: "end_of_cycle" },
    capacity_type: "reset_each_cycle",
    enforcement: { at_slip_limit: "block_new_case_creation", at_storage_limit: "block_new_file_upload", grace_period_days: "15" },
    features: {},
  }
}

function isUnlimitedRaw(value: unknown): boolean {
  return value === "unlimited" || value === -1 || value === "-1"
}

/** Map one server value to the form. "unlimited" and legacy -1 become is_unlimited (never -1 in the form). */
export function featureFormValue(
  feature: Pick<CatalogFeature, "value_type" | "enum_options" | "supports_unlimited" | "default_value">,
  raw: { value: unknown; is_unlimited?: boolean; included_in_trial?: boolean },
): FeatureFormValue {
  const included_in_trial = Boolean(raw.included_in_trial)
  if (feature.value_type === "boolean") {
    const v = raw.value
    return { value: v === true || v === 1 || v === "1" || v === "true", is_unlimited: false, included_in_trial }
  }
  if (feature.value_type === "enum") {
    const options = feature.enum_options ?? []
    const v = str(raw.value)
    return { value: options.includes(v) ? v : str(feature.default_value ?? options[0]), is_unlimited: false, included_in_trial }
  }
  const unlimited = Boolean(raw.is_unlimited) || isUnlimitedRaw(raw.value)
  if (unlimited) {
    return feature.supports_unlimited
      ? { value: "", is_unlimited: true, included_in_trial }
      : { value: "0", is_unlimited: false, included_in_trial }
  }
  const n = Number(raw.value)
  return { value: Number.isFinite(n) && n >= 0 ? String(Math.trunc(n)) : "0", is_unlimited: false, included_in_trial }
}

export function featuresFromGroups(groups: FeatureGroup[]): Record<string, FeatureFormValue> {
  const out: Record<string, FeatureFormValue> = {}
  for (const group of groups) {
    for (const feature of group.features) out[feature.key] = featureFormValue(feature, feature)
  }
  return out
}

/** Plan payload (live or staged version) + catalogue groups -> form. Feature values come from the groups. */
export function formFromPayload(payload: PlanPayload | null | undefined, groups: FeatureGroup[] = []): PlanForm {
  const form = emptyForm()
  form.features = featuresFromGroups(groups)
  if (!payload) return form

  form.name = str(payload.name)
  form.description = str(payload.description)
  form.badge_label = str(payload.badge_label)
  form.display_order = str(payload.display_order)
  form.preview_bg_color = str(payload.preview_bg_color)
  form.currency = payload.pricing?.currency || "usd"
  const prices = payload.pricing?.prices ?? []
  const sorted = [...prices].sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)))
  const frequencies = sorted.map((p) => p.frequency).filter((f): f is PriceFrequency => FREQUENCIES.includes(f))
  form.frequencies = frequencies.length ? Array.from(new Set(frequencies)) : ["monthly"]
  for (const p of prices) if (FREQUENCIES.includes(p.frequency)) form.prices[p.frequency] = str(p.price) || "0.00"
  form.trial = {
    enabled: Boolean(payload.trial?.enabled),
    trial_days: str(payload.trial?.trial_days),
    access_mode: payload.trial?.access_mode === "feature_limited" ? "feature_limited" : "full_access",
  }
  form.overage = {
    enabled: Boolean(payload.overage_policy?.enabled),
    standard_rate: str(payload.overage_policy?.standard_rate) || "0.00",
    discounted_continuous_rate: str(payload.overage_policy?.discounted_continuous_rate) || "0.00",
    billing_method: payload.overage_policy?.billing_method === "real_time" ? "real_time" : "end_of_cycle",
  }
  form.capacity_type = payload.capacity_type === "carry_over_unused" ? "carry_over_unused" : "reset_each_cycle"
  form.enforcement = {
    at_slip_limit: payload.enforcement?.at_slip_limit ?? "block_new_case_creation",
    at_storage_limit: payload.enforcement?.at_storage_limit ?? "block_new_file_upload",
    grace_period_days: str(payload.enforcement?.grace_period_days ?? 15),
  }

  // Keys the groups do not know (e.g. no catalogue loaded yet) fall back to the payload rows.
  for (const row of payload.features ?? []) {
    if (form.features[row.feature_key]) continue
    form.features[row.feature_key] = {
      value: typeof row.value === "boolean" ? row.value : str(row.value),
      is_unlimited: Boolean(row.is_unlimited),
      included_in_trial: Boolean(row.included_in_trial),
    }
  }
  return form
}

const toNumber = (value: string, fallback = 0): number => {
  const n = Number(String(value).trim())
  return value.trim() !== "" && Number.isFinite(n) ? n : fallback
}

/** Form -> Contract v2 PlanPayload. Features follow catalogue order; the payload never contains -1. */
export function buildPayload(form: PlanForm, groups: FeatureGroup[]): PlanPayload {
  const features: PlanPayload["features"] = []
  for (const group of groups) {
    for (const feature of group.features) {
      const v = form.features[feature.key] ?? featureFormValue(feature, feature)
      if (PRICING_OWNED_KEYS.includes(feature.key)) {
        features.push({ feature_key: feature.key, value: form.overage.enabled, is_unlimited: false, included_in_trial: v.included_in_trial })
        continue
      }
      if (feature.value_type === "boolean") {
        features.push({ feature_key: feature.key, value: v.value === true, is_unlimited: false, included_in_trial: v.included_in_trial })
      } else if (feature.value_type === "enum") {
        features.push({ feature_key: feature.key, value: String(v.value), is_unlimited: false, included_in_trial: v.included_in_trial })
      } else {
        const unlimited = feature.supports_unlimited && v.is_unlimited
        const n = Math.max(0, Math.trunc(toNumber(String(v.value))))
        features.push({ feature_key: feature.key, value: unlimited ? 0 : n, is_unlimited: unlimited, included_in_trial: v.included_in_trial })
      }
    }
  }

  const frequencies = form.frequencies.length ? form.frequencies : (["monthly"] as PriceFrequency[])
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    badge_label: form.badge_label.trim() || null,
    display_order: form.display_order.trim() === "" ? null : toNumber(form.display_order),
    preview_bg_color: form.preview_bg_color.trim() || null,
    capacity_type: form.capacity_type,
    pricing: {
      currency: form.currency || "usd",
      prices: frequencies.map((frequency, index) => ({
        frequency,
        price: Math.max(0, toNumber(form.prices[frequency] ?? "0")),
        is_default: index === 0,
      })),
    },
    trial: {
      enabled: form.trial.enabled,
      trial_days: form.trial.enabled && form.trial.trial_days.trim() !== "" ? toNumber(form.trial.trial_days) : null,
      access_mode: form.trial.access_mode,
      requires_payment_method: false,
    },
    overage_policy: {
      enabled: form.overage.enabled,
      standard_rate: toNumber(form.overage.standard_rate),
      discounted_continuous_rate: toNumber(form.overage.discounted_continuous_rate),
      billing_method: form.overage.billing_method,
    },
    enforcement: {
      at_slip_limit: form.enforcement.at_slip_limit,
      at_storage_limit: form.enforcement.at_storage_limit,
      grace_period_days: toNumber(form.enforcement.grace_period_days),
    },
    features,
  }
}

// ---- Feature tick boxes ----

export function isTickable(feature: Pick<CatalogFeature, "key" | "value_type">): boolean {
  if (PRICING_OWNED_KEYS.includes(feature.key) || feature.key === CLONE_SCOPE_KEY) return false
  return feature.value_type === "boolean" || feature.value_type === "enum"
}

/** Boolean: true. Enum: anything above its lowest option. */
export function isTicked(feature: Pick<CatalogFeature, "value_type" | "enum_options">, v: FeatureFormValue | undefined): boolean {
  if (!v) return false
  if (feature.value_type === "boolean") return v.value === true
  if (feature.value_type === "enum") {
    const lowest = feature.enum_options?.[0]
    return v.value !== lowest
  }
  return false
}

/** Ticking an enum picks its highest option; unticking picks the lowest. */
export function withTicked(
  feature: Pick<CatalogFeature, "value_type" | "enum_options">,
  v: FeatureFormValue,
  ticked: boolean,
): FeatureFormValue {
  if (feature.value_type === "boolean") return { ...v, value: ticked }
  if (feature.value_type === "enum") {
    const options = feature.enum_options ?? []
    if (!options.length) return v
    if (!ticked) return { ...v, value: options[0] }
    return isTicked(feature, v) ? v : { ...v, value: options[options.length - 1] }
  }
  return v
}

export function groupTickState(group: FeatureGroup, features: Record<string, FeatureFormValue>) {
  const tickable = group.features.filter(isTickable)
  const on = tickable.filter((f) => isTicked(f, features[f.key])).length
  return { on, total: tickable.length, allOn: tickable.length > 0 && on === tickable.length }
}

export function setGroupAll(
  group: FeatureGroup,
  features: Record<string, FeatureFormValue>,
  ticked: boolean,
): Record<string, FeatureFormValue> {
  const next = { ...features }
  for (const feature of group.features) {
    if (!isTickable(feature)) continue
    next[feature.key] = withTicked(feature, next[feature.key] ?? featureFormValue(feature, feature), ticked)
  }
  return next
}

export function totalTickState(groups: FeatureGroup[], features: Record<string, FeatureFormValue>) {
  return groups.reduce(
    (acc, group) => {
      const s = groupTickState(group, features)
      return { on: acc.on + s.on, total: acc.total + s.total }
    },
    { on: 0, total: 0 },
  )
}

/** Case-insensitive search over name, description and key. Empty groups are dropped. */
export function filterGroups(groups: FeatureGroup[], query: string): FeatureGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((group) => ({
      ...group,
      features: group.features.filter((f) =>
        [f.name, f.description ?? "", f.key].some((text) => text.toLowerCase().includes(q)),
      ),
    }))
    .filter((group) => group.features.length > 0)
}

// ---- Trial rule ----

export function trialAllowed(planName: string): boolean {
  return planName.trim() === TRIAL_PLAN_NAME
}

// ---- Schedule (local date + time + IANA zone -> UTC) ----

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return asUtc - utcMs
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * "2026-03-08" + "09:00" in "America/New_York" -> "2026-03-08T13:00:00.000Z".
 * Uses the zone's offset at the target instant, so DST changes are handled. Returns null on bad input.
 */
export function localToUtcIso(date: string, time: string, timeZone: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const t = /^(\d{2}):(\d{2})$/.exec(time)
  if (!d || !t || !isValidTimeZone(timeZone)) return null
  const wallMs = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]))
  const wall = new Date(wallMs)
  if (
    wall.getUTCMonth() !== Number(d[2]) - 1 ||
    wall.getUTCDate() !== Number(d[3]) ||
    wall.getUTCHours() !== Number(t[1]) ||
    wall.getUTCMinutes() !== Number(t[2])
  ) {
    return null
  }
  let utc = wallMs - zoneOffsetMs(wallMs, timeZone)
  const corrected = wallMs - zoneOffsetMs(utc, timeZone)
  if (corrected !== utc) utc = corrected
  return new Date(utc).toISOString()
}

export type ScheduleError = "required" | "invalidZone" | "tooSoon" | "tooFar"

export function validateSchedule(
  input: { date: string; time: string; timeZone: string },
  nowMs: number = Date.now(),
): ScheduleError | null {
  if (!input.date || !input.time) return "required"
  if (!isValidTimeZone(input.timeZone)) return "invalidZone"
  const iso = localToUtcIso(input.date, input.time, input.timeZone)
  if (!iso) return "required"
  const at = Date.parse(iso)
  if (at < nowMs + MIN_SCHEDULE_LEAD_MS) return "tooSoon"
  if (at > nowMs + MAX_SCHEDULE_AHEAD_MS) return "tooFar"
  return null
}

/** UTC ISO -> { date, time } wall clock in the zone (for prefilling a reschedule). */
export function utcToLocalParts(iso: string, timeZone: string): { date: string; time: string } | null {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || !isValidTimeZone(timeZone)) return null
  const wall = new Date(ms + zoneOffsetMs(ms, timeZone))
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`,
    time: `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`,
  }
}

/** "1 Dec 2026, 09:00 GMT+5:30" style label in the given zone. */
export function formatInZone(iso: string, timeZone: string, locale = "en-GB"): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ""
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC"
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(new Date(ms))
}

/**
 * Browsers report CLDR zone names (e.g. "Asia/Calcutta"); PHP's `timezone:all` rule only accepts the
 * canonical IANA names, so the old aliases are mapped before they are shown or sent.
 */
const CLDR_TO_IANA: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Mendoza": "America/Argentina/Mendoza",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Louisville": "America/Kentucky/Louisville",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
}

export function canonicalTimeZone(timeZone: string): string {
  return CLDR_TO_IANA[timeZone] ?? timeZone
}

export function browserTimeZone(): string {
  try {
    return canonicalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
  } catch {
    return "UTC"
  }
}

// ---- Save options ----

export interface ScheduleInput {
  date: string
  time: string
  timeZone: string
}

export function buildSaveOptions(args: {
  mode: SaveMode
  schedule?: ScheduleInput
  notifyLabs?: boolean
  expectedVersionUpdatedAt?: string | null
  isNewPlan?: boolean
}): SaveOptions {
  const options: SaveOptions = { save_mode: args.mode }
  if (args.mode === "schedule" && args.schedule) {
    const iso = localToUtcIso(args.schedule.date, args.schedule.time, args.schedule.timeZone)
    if (iso) options.scheduled_publish_at = iso
    options.schedule_timezone = args.schedule.timeZone
  }
  if (!args.isNewPlan) {
    options.notify_labs = args.notifyLabs ?? true
    if (args.expectedVersionUpdatedAt) options.expected_version_updated_at = args.expectedVersionUpdatedAt
  }
  return options
}

/** i18n key of the primary footer button for the chosen save mode. */
export function primaryActionKey(mode: SaveMode): string {
  if (mode === "publish_now") return "planEditor.save.publishNowButton"
  if (mode === "schedule") return "planEditor.save.scheduleButton"
  return "planEditor.save.draftButton"
}

// ---- Review: notify checkbox and recipients ----

export function notifyCheckboxState(preview: Pick<PlanVersionPreview, "has_customer_visible_changes" | "recipients"> | null | undefined, userChoice: boolean) {
  const labs = preview?.recipients?.labs ?? 0
  const visible = Boolean(preview) && labs > 0
  const disabled = !preview?.has_customer_visible_changes
  return { visible, disabled, checked: disabled ? false : userChoice }
}

/** What actually goes into notify_labs: false whenever the checkbox is disabled or hidden. */
export function notifyLabsValue(preview: Pick<PlanVersionPreview, "has_customer_visible_changes" | "recipients"> | null | undefined, userChoice: boolean): boolean {
  const state = notifyCheckboxState(preview, userChoice)
  return state.visible ? state.checked : false
}

/**
 * Fields the server can send as null that formFromPayload fills with a default. `label` is the
 * row label from the backend's PlanChangeSummary (app/Support/Billing/PlanChangeSummary.php).
 */
const DEFAULT_FILLED_FIELDS: Array<{ label: string; source: (p: PlanPayload) => unknown; isDefault: (f: PlanForm) => boolean }> = [
  { label: "Overage billing", source: (p) => p.overage_policy?.billing_method, isDefault: (f) => f.overage.billing_method === "end_of_cycle" },
  { label: "At the slip limit", source: (p) => p.enforcement?.at_slip_limit, isDefault: (f) => f.enforcement.at_slip_limit === "block_new_case_creation" },
  { label: "At the storage limit", source: (p) => p.enforcement?.at_storage_limit, isDefault: (f) => f.enforcement.at_storage_limit === "block_new_file_upload" },
]

/**
 * RXN-121: the server's "What changed" with rows the user did not make removed.
 * - A field that was null in the payload the form was loaded from (`source`) and still holds the
 *   default the form filled in is not a change (the server shows it as "— -> default").
 * - "Display order X -> —": a null display_order keeps the current value on apply, so it is not a change.
 */
export function reviewPreview(
  preview: PlanVersionPreview | undefined,
  source: PlanPayload | null | undefined,
  form: PlanForm | null | undefined,
): PlanVersionPreview | undefined {
  if (!preview) return preview
  const filled = new Set(
    source && form
      ? DEFAULT_FILLED_FIELDS.filter((f) => (f.source(source) ?? null) === null && f.isDefault(form)).map((f) => f.label)
      : [],
  )
  const groups = preview.change_summary.groups.map((g) => ({
    ...g,
    items: g.items.filter((item) => !(item.from === null && filled.has(item.label))),
  }))
  const internal_only = (preview.change_summary.internal_only ?? []).filter(
    (item) => !(item.label === "Display order" && item.to === null),
  )
  return {
    ...preview,
    has_customer_visible_changes: preview.has_customer_visible_changes && groups.some((g) => g.items.length > 0),
    change_summary: { ...preview.change_summary, groups, internal_only },
  }
}

export function recipientCounts(preview: Pick<PlanVersionPreview, "recipients"> | null | undefined) {
  return {
    addresses: preview?.recipients?.addresses ?? 0,
    labs: preview?.recipients?.labs ?? 0,
    skipped: preview?.recipients?.skipped_invalid ?? 0,
  }
}

// ---- Plan cards ----

export type PendingBadge =
  | { kind: "draft" }
  | { kind: "scheduled"; local: string; utc: string }
  | { kind: "failed"; error: string | null }
  | { kind: "publishing" }

export function pendingBadge(plan: Pick<BillingConfigPlan, "pending_version">, locale = "en-GB"): PendingBadge | null {
  const v = plan.pending_version
  if (!v) return null
  if (v.state === "scheduled" && v.scheduled_publish_at) {
    const ms = Date.parse(v.scheduled_publish_at)
    const zone = v.schedule_timezone && isValidTimeZone(v.schedule_timezone) ? v.schedule_timezone : "UTC"
    const short = (timeZone: string, withDay: boolean) =>
      new Intl.DateTimeFormat(locale, {
        timeZone,
        ...(withDay ? { day: "numeric", month: "short" } : {}),
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZoneName: "short",
      }).format(new Date(ms))
    // Card label: "1 Dec, 09:00 GMT+5:30" (UTC: "03:30 UTC")
    return { kind: "scheduled", local: short(zone, true), utc: short("UTC", false) }
  }
  if (v.state === "failed") return { kind: "failed", error: v.last_error }
  if (v.state === "publishing") return { kind: "publishing" }
  if (v.state === "draft") return { kind: "draft" }
  return null
}

export type CardAction = "edit" | "publish_now" | "reschedule" | "cancel_schedule" | "discard"

export function cardActions(plan: Pick<BillingConfigPlan, "pending_version" | "status">): CardAction[] {
  const state = plan.pending_version?.state
  if (!state || state === "published" || state === "discarded") return ["edit"]
  if (state === "publishing") return ["edit"]
  if (state === "scheduled") return ["edit", "publish_now", "reschedule", "cancel_schedule", "discard"]
  return ["edit", "publish_now", "reschedule", "discard"]
}

export function notificationSummary(stats: NotificationStats | null | undefined) {
  if (!stats || stats.state === "skipped_disabled" || stats.state === "skipped_no_changes") return null
  return { sent: stats.sent, total: stats.addresses, failed: stats.failed }
}

// ---- Errors from the API ----

export type EditorErrorKind = "validation" | "version_conflict" | "publish_in_progress" | "stripe" | "not_found" | "generic"

export interface EditorError {
  kind: EditorErrorKind
  message: string
  /** field path (e.g. "name", "pricing.prices.0.price") -> first message */
  fields: Record<string, string>
  /** feature_key -> first message, mapped from features.N.* using the payload that was sent */
  features: Record<string, string>
  steps: EditorStep[]
  stripeError?: string
}

export function stepForField(field: string): EditorStep {
  const root = field.split(".")[0]
  if (["name", "description", "badge_label", "display_order", "preview_bg_color", "status"].includes(root)) return "basics"
  // "prices", "frequencies" and "overage" are the client-side (form) paths of the Pricing step.
  if (["pricing", "trial", "overage_policy", "prices", "frequencies", "overage"].includes(root)) return "pricing"
  if (["features", "enforcement", "capacity_type", "feature_limits", "library_clone_scope"].includes(root)) return "features"
  return "review"
}

export function parseApiError(error: unknown, sentPayload?: Pick<PlanPayload, "features"> | null): EditorError {
  const err = error as { status?: number; body?: any; message?: string } | null
  const status = err?.status
  const body = err?.body ?? null
  const message = String(body?.message || err?.message || "")
  const base: EditorError = { kind: "generic", message, fields: {}, features: {}, steps: [] }

  if (status === 422 && body?.errors && typeof body.errors === "object") {
    const steps = new Set<EditorStep>()
    for (const [field, messages] of Object.entries(body.errors as Record<string, unknown>)) {
      const first = Array.isArray(messages) ? String(messages[0] ?? "") : String(messages ?? "")
      base.fields[field] = first
      steps.add(stepForField(field))
      const m = /^features\.(\d+)\./.exec(field)
      const key = m ? sentPayload?.features?.[Number(m[1])]?.feature_key : undefined
      if (key && !base.features[key]) base.features[key] = first
    }
    return { ...base, kind: "validation", steps: EDITOR_STEPS.filter((s) => steps.has(s)) }
  }
  if (status === 409 && body?.code === "version_conflict") return { ...base, kind: "version_conflict" }
  if (status === 409 && body?.code === "publish_in_progress") return { ...base, kind: "publish_in_progress" }
  if (status === 502 || body?.code === "stripe_sync_failed") {
    return { ...base, kind: "stripe", stripeError: body?.data?.stripe_error ? String(body.data.stripe_error) : undefined }
  }
  if (status === 404) return { ...base, kind: "not_found" }
  return base
}

// ---- Per-step validation (zod). Messages are i18n keys. ----

const numberString = (key: string, { min = 0, integer = false, optional = false } = {}) =>
  z.string().refine(
    (raw) => {
      const value = raw.trim()
      if (value === "") return optional
      const n = Number(value)
      return Number.isFinite(n) && n >= min && (!integer || Number.isInteger(n))
    },
    { message: key },
  )

export const basicsSchema = z.object({
  name: z.string().trim().min(1, "planEditor.errors.nameRequired").max(255, "planEditor.errors.nameTooLong"),
  display_order: numberString("planEditor.errors.displayOrderNumber", { integer: true, optional: true }),
})

export const pricingSchema = z
  .object({
    frequencies: z.array(z.string()).min(1, "planEditor.errors.frequencyRequired").max(4),
    prices: z.record(z.string()),
    trial: z.object({ enabled: z.boolean(), trial_days: z.string() }),
    overage: z.object({ enabled: z.boolean(), standard_rate: z.string(), discounted_continuous_rate: z.string() }),
  })
  .superRefine((value, ctx) => {
    for (const frequency of value.frequencies) {
      const raw = (value.prices[frequency] ?? "").trim()
      const n = Number(raw)
      if (raw === "" || !Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prices", frequency], message: "planEditor.errors.priceInvalid" })
      }
    }
    if (value.trial.enabled) {
      const raw = value.trial.trial_days.trim()
      const n = Number(raw)
      if (raw === "" || !Number.isInteger(n) || n < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trial", "trial_days"], message: "planEditor.errors.trialDaysInvalid" })
      }
    }
    if (value.overage.enabled) {
      for (const key of ["standard_rate", "discounted_continuous_rate"] as const) {
        const n = Number(value.overage[key].trim())
        if (value.overage[key].trim() === "" || !Number.isFinite(n) || n < 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["overage", key], message: "planEditor.errors.rateInvalid" })
        }
      }
    }
  })

export const featuresSchema = z.object({
  enforcement: z.object({ grace_period_days: numberString("planEditor.errors.graceInvalid", { integer: true }) }),
})

const integerLimit = numberString("planEditor.errors.limitInvalid", { integer: true })

/**
 * Returns { "path.to.field": "i18n.key" } for the step, or {} when valid. Review has no form fields.
 * Integer features are checked against the catalogue types in `groups`.
 */
export function validateStep(step: EditorStep, form: PlanForm, groups: FeatureGroup[] = []): Record<string, string> {
  const schema = step === "basics" ? basicsSchema : step === "pricing" ? pricingSchema : step === "features" ? featuresSchema : null
  if (!schema) return {}
  const out: Record<string, string> = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".")
      if (!out[path]) out[path] = issue.message
    }
  }
  if (step === "features") {
    for (const group of groups) {
      for (const feature of group.features) {
        const v = form.features[feature.key]
        if (feature.value_type !== "integer" || !v || v.is_unlimited) continue
        if (!integerLimit.safeParse(String(v.value)).success) out[`features.${feature.key}`] = "planEditor.errors.limitInvalid"
      }
    }
  }
  return out
}

/** Steps whose client-side validation fails. */
export function invalidSteps(form: PlanForm, groups: FeatureGroup[] = []): EditorStep[] {
  return EDITOR_STEPS.filter((step) => Object.keys(validateStep(step, form, groups)).length > 0)
}
