import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  buildPayload,
  buildSaveOptions,
  canonicalTimeZone,
  cardActions,
  emptyForm,
  featureFormValue,
  filterGroups,
  formFromPayload,
  groupTickState,
  isTicked,
  localToUtcIso,
  notificationSummary,
  notifyCheckboxState,
  notifyLabsValue,
  parseApiError,
  pendingBadge,
  primaryActionKey,
  recipientCounts,
  reviewPreview,
  setGroupAll,
  stepForField,
  totalTickState,
  trialAllowed,
  utcToLocalParts,
  validateSchedule,
  validateStep,
  withTicked,
} from "./plan-editor.ts"

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../../tests/fixtures/billing-config/${name}`, import.meta.url), "utf8"))

const liveGroups = fixture("plan-feature-groups.live.json").data.groups
const draftGroups = fixture("plan-feature-groups.draft.json").data.groups
const versionNone = fixture("plan-version.none.json").data
const versionDraft = fixture("plan-version.draft.json").data
const preview = fixture("plan-version.preview.200.json").data
const previewNoChanges = fixture("plan-version.preview.no-visible-changes.json").data

const allFeatures = (groups) => groups.flatMap((g) => g.features)
const featureByKey = (groups, key) => allFeatures(groups).find((f) => f.key === key)
const containsMinusOne = (value) => JSON.stringify(value).match(/(^|[^0-9.])-1([^0-9]|$)/) !== null

test("featureFormValue maps unlimited and legacy -1 to is_unlimited, never -1", () => {
  const slip = { value_type: "integer", enum_options: null, supports_unlimited: true, default_value: "100" }
  const storage = { value_type: "integer", enum_options: null, supports_unlimited: false, default_value: "15" }
  const cases = [
    { name: "unlimited string", f: slip, raw: { value: "unlimited", is_unlimited: true }, expected: { value: "", is_unlimited: true } },
    { name: "legacy -1", f: slip, raw: { value: -1 }, expected: { value: "", is_unlimited: true } },
    { name: "-1 without unlimited support", f: storage, raw: { value: -1 }, expected: { value: "0", is_unlimited: false } },
    { name: "number", f: storage, raw: { value: 25 }, expected: { value: "25", is_unlimited: false } },
    { name: "numeric string", f: storage, raw: { value: "40" }, expected: { value: "40", is_unlimited: false } },
    { name: "garbage", f: storage, raw: { value: "abc" }, expected: { value: "0", is_unlimited: false } },
  ]
  for (const c of cases) {
    const got = featureFormValue(c.f, c.raw)
    assert.equal(got.value, c.expected.value, c.name)
    assert.equal(got.is_unlimited, c.expected.is_unlimited, c.name)
  }
  assert.equal(featureFormValue({ value_type: "boolean" }, { value: "true" }).value, true)
  assert.equal(featureFormValue({ value_type: "boolean" }, { value: false }).value, false)
  const en = { value_type: "enum", enum_options: ["none", "flag_only"], default_value: "flag_only" }
  assert.equal(featureFormValue(en, { value: "none" }).value, "none")
  assert.equal(featureFormValue(en, { value: "bogus" }).value, "flag_only")
})

test("live payload + groups -> form -> payload round trips and never contains -1", () => {
  const form = formFromPayload(versionNone.live, liveGroups)
  assert.equal(form.name, "Freemium")
  assert.deepEqual(form.frequencies, ["monthly"])
  assert.equal(form.features["storage.limit_gb"].value, "15")

  const payload = buildPayload(form, liveGroups)
  assert.equal(payload.features.length, allFeatures(liveGroups).length)
  const keys = payload.features.map((f) => f.feature_key)
  assert.equal(new Set(keys).size, keys.length, "feature keys are distinct")
  assert.equal(payload.features.find((f) => f.feature_key === "storage.limit_gb").value, 15)
  assert.equal("status" in payload, false, "status is not part of the version payload")
  assert.equal("feature_limits" in payload, false)
  assert.equal(containsMinusOne(payload), false)
})

test("unlimited integer is sent as is_unlimited with value 0, never -1", () => {
  const form = formFromPayload(versionNone.live, liveGroups)
  form.features["slip.creation.monthly_limit"] = { ...form.features["slip.creation.monthly_limit"], is_unlimited: true }
  // A key that does not support unlimited ignores the flag.
  form.features["storage.limit_gb"] = { value: "-5", is_unlimited: true, included_in_trial: false }
  const payload = buildPayload(form, liveGroups)
  const slip = payload.features.find((f) => f.feature_key === "slip.creation.monthly_limit")
  const storage = payload.features.find((f) => f.feature_key === "storage.limit_gb")
  assert.deepEqual([slip.value, slip.is_unlimited], [0, true])
  assert.deepEqual([storage.value, storage.is_unlimited], [0, false])
  assert.equal(containsMinusOne(payload), false)
})

test("staged version: draft groups drive the feature values", () => {
  const form = formFromPayload(versionDraft.version.payload, draftGroups)
  assert.equal(form.features["storage.limit_gb"].value, "25")
  assert.equal(form.features["product.advance_mode"].value, true)
})

test("overage feature row always follows the Pricing step", () => {
  const form = formFromPayload(versionNone.live, liveGroups)
  form.overage.enabled = true
  const payload = buildPayload(form, liveGroups)
  assert.equal(payload.features.find((f) => f.feature_key === "slip.overage.enabled").value, true)
  assert.equal(payload.overage_policy.enabled, true)
})

test("pricing: first selected frequency is the default; trial days omitted when trial is off", () => {
  const form = emptyForm()
  form.name = "Pro"
  form.frequencies = ["annual", "monthly"]
  form.prices.annual = "100"
  form.prices.monthly = "10"
  form.trial = { enabled: false, trial_days: "14", access_mode: "full_access" }
  const payload = buildPayload(form, [])
  assert.deepEqual(payload.pricing.prices, [
    { frequency: "annual", price: 100, is_default: true },
    { frequency: "monthly", price: 10, is_default: false },
  ])
  assert.equal(payload.trial.trial_days, null)
})

test("tick boxes: booleans, enums (lowest = unticked) and group select-all", () => {
  const slipGroup = liveGroups.find((g) => g.key === "slip")
  const dueRush = featureByKey(liveGroups, "slip.due_rush_date")
  const form = formFromPayload(versionNone.live, liveGroups)

  assert.equal(isTicked(dueRush, form.features["slip.due_rush_date"]), true, "flag_only is above none")
  assert.equal(isTicked(dueRush, { value: "none" }), false)
  assert.equal(withTicked(dueRush, { value: "none", is_unlimited: false, included_in_trial: false }, true).value, "flag_and_billing")
  assert.equal(withTicked(dueRush, { value: "flag_only", is_unlimited: false, included_in_trial: false }, true).value, "flag_only", "already ticked keeps its level")
  assert.equal(withTicked(dueRush, { value: "flag_only", is_unlimited: false, included_in_trial: false }, false).value, "none")

  // Slip group: integer and the Pricing-owned overage row are not tickable.
  const state = groupTickState(slipGroup, form.features)
  assert.equal(state.total, 3) // due/rush, paper slip, virtual slip
  const cleared = setGroupAll(slipGroup, form.features, false)
  assert.deepEqual(groupTickState(slipGroup, cleared), { on: 0, total: 3, allOn: false })
  const all = setGroupAll(slipGroup, cleared, true)
  assert.deepEqual(groupTickState(slipGroup, all), { on: 3, total: 3, allOn: true })
  assert.equal(all["slip.creation.monthly_limit"].value, form.features["slip.creation.monthly_limit"].value, "integers untouched")

  // Clone scope is a radio, not a tick box.
  const product = liveGroups.find((g) => g.key === "product")
  const productAll = setGroupAll(product, form.features, true)
  assert.equal(productAll["product.library_clone_scope"].value, form.features["product.library_clone_scope"].value)

  const total = totalTickState(liveGroups, form.features)
  assert.ok(total.total > 0 && total.on <= total.total)
})

test("search filters by name, description and key, dropping empty groups", () => {
  assert.deepEqual(filterGroups(liveGroups, "advance mode").flatMap((g) => g.features.map((f) => f.key)), ["product.advance_mode"])
  assert.deepEqual(filterGroups(liveGroups, "ADVANCE").flatMap((g) => g.features.map((f) => f.key)), ["attachments.advanced", "product.advance_mode"])
  assert.ok(filterGroups(liveGroups, "STL").some((g) => g.key === "tools"), "matches description")
  assert.ok(filterGroups(liveGroups, "seats.admin").some((g) => g.key === "seats"), "matches key")
  assert.equal(filterGroups(liveGroups, "zzz-nothing").length, 0)
  assert.equal(filterGroups(liveGroups, "  ").length, liveGroups.length)
})

test("trial toggle is only allowed on Growth", () => {
  assert.equal(trialAllowed("Growth"), true)
  assert.equal(trialAllowed(" Growth "), true)
  assert.equal(trialAllowed("Freemium"), false)
  assert.equal(trialAllowed("growth plus"), false)
})

test("schedule converts local wall time to UTC across DST", () => {
  const cases = [
    // America/New_York switches to EDT on 2026-03-08 at 02:00.
    { date: "2026-03-07", time: "09:00", tz: "America/New_York", utc: "2026-03-07T14:00:00.000Z" },
    { date: "2026-03-08", time: "09:00", tz: "America/New_York", utc: "2026-03-08T13:00:00.000Z" },
    { date: "2026-11-01", time: "09:00", tz: "America/New_York", utc: "2026-11-01T14:00:00.000Z" },
    { date: "2026-12-01", time: "09:00", tz: "Asia/Kolkata", utc: "2026-12-01T03:30:00.000Z" },
    { date: "2026-03-29", time: "12:00", tz: "Europe/Berlin", utc: "2026-03-29T10:00:00.000Z" },
    { date: "2026-07-01", time: "00:00", tz: "UTC", utc: "2026-07-01T00:00:00.000Z" },
  ]
  for (const c of cases) assert.equal(localToUtcIso(c.date, c.time, c.tz), c.utc, `${c.date} ${c.time} ${c.tz}`)
  assert.equal(localToUtcIso("2026-13-01", "09:00", "UTC"), null)
  assert.equal(localToUtcIso("2026-12-01", "9am", "UTC"), null)
  assert.equal(localToUtcIso("2026-12-01", "09:00", "Mars/Olympus"), null)
  assert.deepEqual(utcToLocalParts("2026-12-01T03:30:00Z", "Asia/Kolkata"), { date: "2026-12-01", time: "09:00" })
})

test("browser CLDR zone names map to canonical IANA names accepted by the backend", () => {
  assert.equal(canonicalTimeZone("Asia/Calcutta"), "Asia/Kolkata")
  assert.equal(canonicalTimeZone("America/Buenos_Aires"), "America/Argentina/Buenos_Aires")
  assert.equal(canonicalTimeZone("Europe/Berlin"), "Europe/Berlin")
  assert.equal(localToUtcIso("2026-12-01", "09:00", canonicalTimeZone("Asia/Calcutta")), "2026-12-01T03:30:00.000Z")
})

test("schedule validation rejects < 5 minutes ahead, > 365 days, bad zone and blanks", () => {
  const now = Date.parse("2026-11-24T10:00:00Z")
  const at = (date, time, timeZone = "UTC") => validateSchedule({ date, time, timeZone }, now)
  assert.equal(at("2026-11-24", "10:04"), "tooSoon")
  assert.equal(at("2026-11-24", "09:00"), "tooSoon")
  assert.equal(at("2026-11-24", "10:05"), null)
  assert.equal(at("2027-11-25", "10:00"), "tooFar")
  assert.equal(at("2026-11-24", "10:30", "Nowhere/City"), "invalidZone")
  assert.equal(at("", "10:30"), "required")
  // 15:34 in Kolkata is 10:04 UTC: still too soon.
  assert.equal(at("2026-11-24", "15:34", "Asia/Kolkata"), "tooSoon")
})

test("save options map the chosen option to save_mode", () => {
  assert.deepEqual(buildSaveOptions({ mode: "draft", notifyLabs: true }), { save_mode: "draft", notify_labs: true })
  assert.deepEqual(buildSaveOptions({ mode: "publish_now", notifyLabs: false, expectedVersionUpdatedAt: "2026-11-24T16:50:00Z" }), {
    save_mode: "publish_now",
    notify_labs: false,
    expected_version_updated_at: "2026-11-24T16:50:00Z",
  })
  assert.deepEqual(
    buildSaveOptions({ mode: "schedule", schedule: { date: "2026-12-01", time: "09:00", timeZone: "Asia/Kolkata" }, notifyLabs: true }),
    { save_mode: "schedule", scheduled_publish_at: "2026-12-01T03:30:00.000Z", schedule_timezone: "Asia/Kolkata", notify_labs: true },
  )
  assert.deepEqual(buildSaveOptions({ mode: "publish_now", isNewPlan: true, notifyLabs: true }), { save_mode: "publish_now" })
  assert.equal(primaryActionKey("publish_now"), "planEditor.save.publishNowButton")
  assert.equal(primaryActionKey("schedule"), "planEditor.save.scheduleButton")
  assert.equal(primaryActionKey("draft"), "planEditor.save.draftButton")
})

test("notify checkbox: on by default, disabled without visible changes, hidden with 0 labs", () => {
  assert.deepEqual(notifyCheckboxState(preview, true), { visible: true, disabled: false, checked: true })
  assert.deepEqual(notifyCheckboxState(preview, false), { visible: true, disabled: false, checked: false })
  assert.deepEqual(notifyCheckboxState(previewNoChanges, true), { visible: true, disabled: true, checked: false })
  const noLabs = { ...preview, recipients: { ...preview.recipients, labs: 0, addresses: 0 } }
  assert.equal(notifyCheckboxState(noLabs, true).visible, false)
  assert.equal(notifyCheckboxState(null, true).visible, false)
  assert.equal(notifyLabsValue(preview, true), true)
  assert.equal(notifyLabsValue(previewNoChanges, true), false)
  assert.equal(notifyLabsValue(noLabs, true), false)
})

test("recipient counts for 'Will email {addresses} addresses at {labs} labs'", () => {
  assert.deepEqual(recipientCounts(preview), { addresses: 58, labs: 42, skipped: 1 })
  assert.deepEqual(recipientCounts(null), { addresses: 0, labs: 0, skipped: 0 })
})

test("422 errors map to steps, and features.N.* maps to the feature key that was sent", () => {
  const form = formFromPayload(versionNone.live, liveGroups)
  const payload = buildPayload(form, liveGroups)
  const body = fixture("plan-version.put.422.json")
  const err = parseApiError(Object.assign(new Error(body.message), { status: 422, body }), payload)
  assert.equal(err.kind, "validation")
  assert.deepEqual(err.steps, ["pricing", "features"])
  assert.equal(err.features[payload.features[7].feature_key], body.errors["features.7.value"][0])
  assert.equal(err.fields["trial.enabled"], "Free trial is only available on the Growth plan.")

  const cases = [
    ["name", "basics"],
    ["display_order", "basics"],
    ["pricing.prices.0.price", "pricing"],
    ["overage_policy.standard_rate", "pricing"],
    ["enforcement.grace_period_days", "features"],
    ["capacity_type", "features"],
    ["scheduled_publish_at", "review"],
  ]
  for (const [field, step] of cases) assert.equal(stepForField(field), step, field)
})

test("409 and 502 codes map to in-dialog messages", () => {
  const make = (status, name) => {
    const body = fixture(name)
    return Object.assign(new Error(body.message), { status, body })
  }
  assert.equal(parseApiError(make(409, "plan-version.put.409-conflict.json")).kind, "version_conflict")
  assert.equal(parseApiError(make(409, "plan-version.put.409-publish-in-progress.json")).kind, "publish_in_progress")
  const stripe = parseApiError(make(502, "plan-version.put.502-stripe.json"))
  assert.equal(stripe.kind, "stripe")
  assert.equal(stripe.stripeError, "No such product: prod_123")
  assert.equal(parseApiError(new Error("Network down")).kind, "generic")
  assert.equal(parseApiError(Object.assign(new Error("x"), { status: 404, body: { success: false } })).kind, "not_found")
})

test("per-step zod validation", () => {
  const form = emptyForm()
  assert.deepEqual(validateStep("basics", form), { name: "planEditor.errors.nameRequired" })
  form.name = "Pro"
  form.display_order = "1.5"
  assert.deepEqual(validateStep("basics", form), { display_order: "planEditor.errors.displayOrderNumber" })
  form.display_order = "2"
  assert.deepEqual(validateStep("basics", form), {})

  form.frequencies = []
  assert.equal(validateStep("pricing", form).frequencies, "planEditor.errors.frequencyRequired")
  form.frequencies = ["monthly"]
  form.prices.monthly = "-1"
  assert.equal(validateStep("pricing", form)["prices.monthly"], "planEditor.errors.priceInvalid")
  form.prices.monthly = "9"
  form.trial = { enabled: true, trial_days: "", access_mode: "full_access" }
  assert.equal(validateStep("pricing", form)["trial.trial_days"], "planEditor.errors.trialDaysInvalid")
  form.trial.trial_days = "14"
  assert.deepEqual(validateStep("pricing", form), {})

  const full = formFromPayload(versionNone.live, liveGroups)
  assert.deepEqual(validateStep("features", full, liveGroups), {})
  full.features["storage.limit_gb"] = { value: "", is_unlimited: false, included_in_trial: false }
  full.enforcement.grace_period_days = "x"
  assert.deepEqual(validateStep("features", full, liveGroups), {
    "enforcement.grace_period_days": "planEditor.errors.graceInvalid",
    "features.storage.limit_gb": "planEditor.errors.limitInvalid",
  })
  assert.deepEqual(validateStep("review", full), {})
})

test("plan card badges, actions and the email result line", () => {
  const plans = fixture("plans.all.json").data
  const [freemium, growth, business, starter] = plans
  assert.equal(pendingBadge(freemium), null)
  const scheduled = pendingBadge(growth)
  assert.equal(scheduled.kind, "scheduled")
  assert.match(scheduled.local, /09:00/)
  assert.match(scheduled.utc, /03:30/)
  assert.equal(pendingBadge(business).kind, "failed")
  assert.equal(pendingBadge(starter).kind, "draft")

  assert.deepEqual(cardActions(freemium), ["edit"])
  assert.deepEqual(cardActions(growth), ["edit", "publish_now", "reschedule", "cancel_schedule", "discard"])
  assert.deepEqual(cardActions(business), ["edit", "publish_now", "reschedule", "discard"])
  assert.deepEqual(cardActions(starter), ["edit", "publish_now", "reschedule", "discard"])

  const published = fixture("plan-version.put.publish.200.json").data.version.notification_stats
  assert.deepEqual(notificationSummary(published), { sent: 57, total: 58, failed: 1 })
  assert.equal(notificationSummary({ ...published, state: "skipped_disabled" }), null)
  assert.equal(notificationSummary(null), null)
})

// ---- RXN-121: Review "What changed" must not list changes the user did not make ----

const growthLive = {
  ...versionNone.live,
  name: "Growth",
  display_order: 2,
  overage_policy: { enabled: true, standard_rate: 1, discounted_continuous_rate: 0.5, billing_method: null },
  enforcement: { at_slip_limit: null, at_storage_limit: null, grace_period_days: 15 },
}
const usageRules = (items) => ({ key: "usage_rules", label: "Usage rules", items })
const serverPreview = (groups, internal_only = []) => ({
  ...preview,
  has_customer_visible_changes: groups.some((g) => g.items.length > 0),
  change_summary: { groups, internal_only },
})
const changeCount = (p) => p.change_summary.groups.reduce((n, g) => n + g.items.length, 0)

test("unedited published plan: defaults filled for null live values are not listed as changes", () => {
  const form = formFromPayload(growthLive, liveGroups)
  // What the server returns today for the unedited Growth payload (Quinn's repro).
  const server = serverPreview([
    usageRules([
      { label: "Overage billing", from: null, to: "End of cycle" },
      { label: "At the slip limit", from: null, to: "Block new case creation" },
      { label: "At the storage limit", from: null, to: "Block new file upload" },
    ]),
  ])
  const shown = reviewPreview(server, growthLive, form)
  assert.equal(changeCount(shown), 0)
  assert.equal(shown.has_customer_visible_changes, false)
  assert.equal(notifyLabsValue(shown, true), false)
})

test("new draft plan: 'Display order 0 -> —' (null = keep current) is not listed", () => {
  const draftPayload = { ...versionNone.live, display_order: null }
  const form = formFromPayload(draftPayload, liveGroups)
  const server = serverPreview([], [{ label: "Display order", from: "0", to: null }])
  const shown = reviewPreview(server, draftPayload, form)
  assert.deepEqual(shown.change_summary.internal_only, [])
})

test("real edits still show, including a changed value for a field that was null on live", () => {
  const form = formFromPayload(growthLive, liveGroups)
  form.overage.billing_method = "real_time"
  form.display_order = "3"
  const server = serverPreview(
    [
      { key: "price", label: "Price", items: [{ label: "Monthly price", from: "$0.00", to: "$9.00" }] },
      usageRules([
        { label: "Overage billing", from: null, to: "Real time" },
        { label: "At the slip limit", from: null, to: "Block new case creation" },
      ]),
    ],
    [{ label: "Display order", from: "2", to: "3" }],
  )
  const shown = reviewPreview(server, growthLive, form)
  assert.deepEqual(
    shown.change_summary.groups.flatMap((g) => g.items.map((i) => i.label)),
    ["Monthly price", "Overage billing"],
  )
  assert.equal(shown.has_customer_visible_changes, true)
  assert.deepEqual(shown.change_summary.internal_only, [{ label: "Display order", from: "2", to: "3" }])
  // A staged value that differs from live (source not null) is a real change and is kept.
  const staged = { ...growthLive, enforcement: { ...growthLive.enforcement, at_slip_limit: "block_new_case_creation" } }
  const kept = reviewPreview(server, staged, formFromPayload(staged, liveGroups))
  assert.ok(kept.change_summary.groups.some((g) => g.items.some((i) => i.label === "At the slip limit")))
})

test("reviewPreview passes through a missing preview", () => {
  assert.equal(reviewPreview(undefined, growthLive, emptyForm()), undefined)
})
