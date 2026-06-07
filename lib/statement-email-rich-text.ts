export const EMPTY_EDITOR_HTML = "<p><br></p>"

export function normalizeStatementEmailMessageHtml(value: string | null | undefined): string {
  const html = (value ?? "").trim()
  if (!html) return EMPTY_EDITOR_HTML

  return html
    .replace(/\u00a0/g, " ")
    .replace(/<p>(?:\s|<br\s*\/?>|&nbsp;)*<\/p>/gi, "<p><br></p>")
    .trim()
}

export function isStatementEmailMessageHtmlEmpty(value: string | null | undefined): boolean {
  const html = normalizeStatementEmailMessageHtml(value)
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/<\/?(p|div|span|strong|em|u|b|i|ul|ol|li|a)[^>]*>/gi, "")
    .trim()

  return html.length === 0
}

export function applyStatementEmailMessageToPreviewHtml(previewHtml: string, messageHtml: string): string {
  if (!previewHtml) return previewHtml

  return previewHtml.replace(
    /(<div class="intro" data-statement-email-message>)([\s\S]*?)(<\/div>)/,
    `$1${messageHtml}$3`,
  )
}
