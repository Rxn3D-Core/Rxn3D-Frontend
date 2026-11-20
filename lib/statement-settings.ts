/** RXN-100: lab statement settings (what shows on a statement, payment terms). Pure helpers, no React. */

export const STATEMENT_TOGGLE_KEYS = [
  "show_statement_number",
  "show_statement_date",
  "show_due_date",
  "show_payment_terms",
  "show_lab_logo",
  "show_lab_address",
  "show_lab_phone",
  "show_lab_email",
  "show_recipient_name",
  "show_recipient_address",
  "show_recipient_email",
  "show_recipient_phone",
] as const

export type StatementToggleKey = (typeof STATEMENT_TOGGLE_KEYS)[number]
export type StatementDisplayToggles = Record<StatementToggleKey, boolean>

export const STATEMENT_PAYMENT_TERMS = [15, 30, 60, 90] as const
export type StatementPaymentTerm = (typeof STATEMENT_PAYMENT_TERMS)[number]

/** Due date offset when the lab has no payment term (the behaviour before RXN-100). */
export const DEFAULT_STATEMENT_DUE_DAYS = 30

export interface LabStatementSettings {
  toggles: StatementDisplayToggles
  paymentTermsDays: StatementPaymentTerm | null
}

export const DEFAULT_STATEMENT_TOGGLES: StatementDisplayToggles = Object.fromEntries(
  STATEMENT_TOGGLE_KEYS.map((key) => [key, true]),
) as StatementDisplayToggles

export const DEFAULT_LAB_STATEMENT_SETTINGS: LabStatementSettings = {
  toggles: DEFAULT_STATEMENT_TOGGLES,
  paymentTermsDays: null,
}

function isTerm(value: unknown): value is StatementPaymentTerm {
  return (STATEMENT_PAYMENT_TERMS as readonly unknown[]).includes(value)
}

/**
 * The toggles of a statement. A missing snapshot (`null`, or an API that does not send it yet) shows
 * everything, and so does any key that is absent from a partial snapshot.
 */
export function resolveStatementDisplay(
  displaySettings: Partial<Record<StatementToggleKey, unknown>> | null | undefined,
): StatementDisplayToggles {
  const out = { ...DEFAULT_STATEMENT_TOGGLES }
  if (displaySettings && typeof displaySettings === "object") {
    for (const key of STATEMENT_TOGGLE_KEYS) {
      if (typeof displaySettings[key] === "boolean") out[key] = displaySettings[key] as boolean
    }
  }
  return out
}

/** With the recipient name and email both hidden, the office name still shows. */
export function showsRecipientName(display: StatementDisplayToggles): boolean {
  return display.show_recipient_name || !display.show_recipient_email
}

/** "Net 30", or null when the line must not show (toggle off, or the statement has no term). */
export function statementTermsLabel(
  display: StatementDisplayToggles,
  paymentTermsDays: number | null | undefined,
): string | null {
  if (!display.show_payment_terms) return null
  return typeof paymentTermsDays === "number" && paymentTermsDays > 0 ? `Net ${paymentTermsDays}` : null
}

/** Days to add to today for the default due date of a new statement. */
export function defaultDueDays(paymentTermsDays: number | null | undefined): number {
  return typeof paymentTermsDays === "number" && paymentTermsDays > 0 ? paymentTermsDays : DEFAULT_STATEMENT_DUE_DAYS
}

/** `data.settings` of GET/PUT /v1/slip-settings/statements. */
export function statementSettingsFromApi(raw: unknown): LabStatementSettings {
  const settings = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return {
    toggles: resolveStatementDisplay(settings as Partial<Record<StatementToggleKey, unknown>>),
    paymentTermsDays: isTerm(settings.payment_terms_days) ? settings.payment_terms_days : null,
  }
}

export function statementSettingsToApi(settings: LabStatementSettings): Record<string, boolean | number | null> {
  return { ...settings.toggles, payment_terms_days: settings.paymentTermsDays }
}
