import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_STATEMENT_TOGGLES,
  defaultDueDays,
  resolveStatementDisplay,
  showsRecipientName,
  statementSettingsFromApi,
  statementSettingsToApi,
  statementTermsLabel,
} from "./statement-settings.ts"

test("a missing snapshot shows everything", () => {
  assert.deepEqual(resolveStatementDisplay(null), DEFAULT_STATEMENT_TOGGLES)
  assert.deepEqual(resolveStatementDisplay(undefined), DEFAULT_STATEMENT_TOGGLES)
})

test("a partial snapshot hides only what it says, ignoring non-boolean values", () => {
  const display = resolveStatementDisplay({ show_due_date: false, show_lab_logo: "no" })
  assert.equal(display.show_due_date, false)
  assert.equal(display.show_lab_logo, true)
  assert.equal(display.show_statement_number, true)
})

test("office name still shows when recipient name and email are both hidden", () => {
  const both = resolveStatementDisplay({ show_recipient_name: false, show_recipient_email: false })
  assert.equal(showsRecipientName(both), true)
  const nameOnly = resolveStatementDisplay({ show_recipient_name: false })
  assert.equal(showsRecipientName(nameOnly), false)
})

test("terms label needs the toggle and a stored term", () => {
  const shown = resolveStatementDisplay(null)
  assert.equal(statementTermsLabel(shown, 30), "Net 30")
  assert.equal(statementTermsLabel(shown, null), null)
  assert.equal(statementTermsLabel(shown, undefined), null)
  assert.equal(statementTermsLabel(resolveStatementDisplay({ show_payment_terms: false }), 60), null)
})

test("default due days use the lab term, else 30", () => {
  assert.equal(defaultDueDays(60), 60)
  assert.equal(defaultDueDays(null), 30)
  assert.equal(defaultDueDays(undefined), 30)
})

test("settings map from and to the API", () => {
  const settings = statementSettingsFromApi({ show_lab_phone: false, payment_terms_days: 15 })
  assert.equal(settings.toggles.show_lab_phone, false)
  assert.equal(settings.toggles.show_lab_email, true)
  assert.equal(settings.paymentTermsDays, 15)
  assert.equal(statementSettingsFromApi({ payment_terms_days: 45 }).paymentTermsDays, null)
  assert.equal(statementSettingsFromApi(undefined).paymentTermsDays, null)
  const body = statementSettingsToApi(settings)
  assert.equal(body.show_lab_phone, false)
  assert.equal(body.payment_terms_days, 15)
  assert.equal(Object.keys(body).length, 13)
})
