/**
 * Validation + field-state rules for the login "Email" input.
 *
 * The backend only authenticates by email, so there is no username mode. Green ("valid")
 * means the email *syntax* is valid. It never implies the account exists or the
 * credentials are correct.
 */

/** Product decision pending: set to false to drop the amber "incomplete while editing" state. */
export const SHOW_INCOMPLETE_WARNING = true

export type LoginEmailIssue = "required" | "email"
export type LoginEmailFieldStatus = "default" | "valid" | "warning" | "error"

// local@domain.tld: dot-separated alphanumeric/hyphen labels, TLD of 2+ letters (or punycode).
const EMAIL_PATTERN =
  /^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,}|xn--[A-Za-z0-9-]{2,})$/

export function isValidEmailFormat(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

export interface LoginEmailValidation {
  isValid: boolean
  /** Why the value is not valid; null when valid. */
  issue: LoginEmailIssue | null
}

export function validateLoginEmail(rawValue: string): LoginEmailValidation {
  // Mobile keyboards and paste commonly add stray whitespace around an otherwise valid value.
  const value = rawValue.trim()

  if (!value) return { isValid: false, issue: "required" }
  return isValidEmailFormat(value)
    ? { isValid: true, issue: null }
    : { isValid: false, issue: "email" }
}

export interface LoginEmailFieldStateInput {
  value: string
  /** The user has left the field with a value in it. */
  touched: boolean
  /** A login submit has been attempted. */
  submitted: boolean
  /** The field currently has focus. */
  editing: boolean
}

export interface LoginEmailFieldState {
  status: LoginEmailFieldStatus
  issue: LoginEmailIssue | null
}

/**
 * - default: untouched or empty
 * - warning (amber): incomplete while the user is still editing
 * - error (red): invalid after blur or submit
 * - valid (green): syntactically valid email
 */
export function getLoginEmailFieldState({
  value,
  touched,
  submitted,
  editing,
}: LoginEmailFieldStateInput): LoginEmailFieldState {
  const { isValid, issue } = validateLoginEmail(value)
  const result = (status: LoginEmailFieldStatus): LoginEmailFieldState => ({ status, issue })

  if (isValid) return result("valid")

  // Empty is only an error once the user tries to submit; tabbing through must stay neutral.
  if (issue === "required") return result(submitted ? "error" : "default")

  if (touched || submitted) return result("error")
  if (editing && SHOW_INCOMPLETE_WARNING) return result("warning")
  return result("default")
}
