import assert from "node:assert/strict"
import test from "node:test"
import {
  canAddSlipNotes,
  isSlipCaseCancelled,
  isSlipCaseDeleted,
} from "./slip-case-status.ts"
import {
  friendlySlipAttachmentError,
  SLIP_DELETED_ATTACHMENT_MESSAGE,
} from "./slip-attachment-error.ts"
import { resolveSlipRowActionVisibility } from "./slip-row-action-visibility.ts"
import { resolveSlipDeleteDetail } from "./slip-hold-info.ts"

test("isSlipCaseDeleted matches the API's Deleted status only", () => {
  assert.equal(isSlipCaseDeleted("Deleted"), true)
  assert.equal(isSlipCaseDeleted(" deleted "), true)
  assert.equal(isSlipCaseDeleted("Cancelled"), false)
  assert.equal(isSlipCaseDeleted(null), false)
  // Cancelled detection is unchanged.
  assert.equal(isSlipCaseCancelled("Deleted"), false)
  assert.equal(isSlipCaseCancelled("Cancelled"), true)
})

test("canAddSlipNotes is false for deleted slips", () => {
  assert.equal(canAddSlipNotes("Deleted"), false)
  assert.equal(canAddSlipNotes("In Progress"), true)
})

test("friendlySlipAttachmentError maps the missing-slip error", () => {
  assert.equal(
    friendlySlipAttachmentError(
      "Failed to upload attachment: No query results for model [App\\Models\\Slip] 1146"
    ),
    SLIP_DELETED_ATTACHMENT_MESSAGE
  )
  assert.equal(friendlySlipAttachmentError("File too large"), "File too large")
})

test("row actions hide upload and edit for deleted slips", () => {
  const visibility = resolveSlipRowActionVisibility({
    status: "Deleted",
    locationId: 3,
    location: "In lab",
  })
  assert.equal(visibility.attach, false)
  assert.equal(visibility.editSlip, false)
  assert.equal(visibility.restoreSlip, true)
})

test("resolveSlipDeleteDetail prefers the soft_delete note", () => {
  const notes = [
    {
      id: 2,
      slip_id: 1146,
      action_type: "soft_delete",
      note: "Duplicate slip",
      created_at: "2026-10-01T10:00:00Z",
      created_by: { id: 1, name: "Pat Lab" },
    },
  ]
  const detail = resolveSlipDeleteDetail(notes, 1146, { deleted_at: "2026-10-02T00:00:00Z" })
  assert.equal(detail?.reason, "Duplicate slip")
  assert.equal(detail?.heldAt, "2026-10-01T10:00:00Z")
})

test("resolveSlipDeleteDetail falls back to deleted_at", () => {
  const detail = resolveSlipDeleteDetail([], 1146, { deleted_at: "2026-10-02T00:00:00Z" })
  assert.deepEqual(detail, {
    authorName: "Unknown",
    heldAt: "2026-10-02T00:00:00Z",
    reason: "",
  })
  assert.equal(resolveSlipDeleteDetail([], 1146, {}), null)
})
