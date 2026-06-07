import test from "node:test"
import assert from "node:assert/strict"

import {
  EMPTY_EDITOR_HTML,
  applyStatementEmailMessageToPreviewHtml,
  isStatementEmailMessageHtmlEmpty,
  normalizeStatementEmailMessageHtml,
} from "./statement-email-rich-text.ts"

test("normalizeStatementEmailMessageHtml falls back to an empty paragraph", () => {
  assert.equal(normalizeStatementEmailMessageHtml(""), EMPTY_EDITOR_HTML)
})

test("isStatementEmailMessageHtmlEmpty detects markup-only content", () => {
  assert.equal(isStatementEmailMessageHtmlEmpty("<p><br></p>"), true)
  assert.equal(isStatementEmailMessageHtmlEmpty("<p><strong>Hello</strong></p>"), false)
})

test("applyStatementEmailMessageToPreviewHtml replaces only the message block", () => {
  const result = applyStatementEmailMessageToPreviewHtml(
    '<div class="intro" data-statement-email-message><p>Old</p></div><div class="summary-box">Summary</div>',
    "<p>New</p>",
  )

  assert.equal(
    result,
    '<div class="intro" data-statement-email-message><p>New</p></div><div class="summary-box">Summary</div>',
  )
})
