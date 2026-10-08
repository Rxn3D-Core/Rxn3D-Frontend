/** Max notification emails allowed per lab/office (matches backend UpdateRequest). */
export const MAX_NOTIFICATION_EMAILS = 10

/** Normalize API/form values into a unique list of lowercase emails. */
export function parseNotificationEmails(
  value: string | string[] | null | undefined
): string[] {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/[,;\n]+/)
        .map((part) => part.trim())

  const emails: string[] = []
  const seen = new Set<string>()
  for (const part of raw) {
    const email = String(part ?? "")
      .trim()
      .toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    emails.push(email)
  }
  return emails
}

/** Display helper for overview cards. */
export function formatNotificationEmails(
  value: string | string[] | null | undefined
): string {
  const emails = parseNotificationEmails(value)
  return emails.length > 0 ? emails.join(", ") : "—"
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Validate a comma-separated (or array) notification email list. Returns an error message or null. */
export function validateNotificationEmailsInput(
  value: string | string[] | null | undefined
): string | null {
  const emails = parseNotificationEmails(value)
  if (emails.length > MAX_NOTIFICATION_EMAILS) {
    return `You may provide at most ${MAX_NOTIFICATION_EMAILS} notification emails.`
  }
  for (const email of emails) {
    if (!EMAIL_RE.test(email) || email.length > 255) {
      return `"${email}" is not a valid email address.`
    }
  }
  return null
}
