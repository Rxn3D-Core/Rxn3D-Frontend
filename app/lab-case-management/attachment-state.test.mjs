import test from "node:test";
import assert from "node:assert/strict";
import { applySlipAttachmentState } from "./attachment-state.mjs";

test("applySlipAttachmentState marks the matching slip as having attachments", () => {
  const rows = [
    { id: 111, attachment: false, patient: "A" },
    { id: 112, attachment: false, patient: "B" },
  ];

  const updated = applySlipAttachmentState(rows, 112, true);

  assert.equal(updated[0].attachment, false);
  assert.equal(updated[1].attachment, true);
  assert.notEqual(updated[1], rows[1]);
});

test("applySlipAttachmentState can clear attachment state for one slip only", () => {
  const rows = [
    { id: 111, attachment: true },
    { id: 112, attachment: true },
  ];

  const updated = applySlipAttachmentState(rows, 111, false);

  assert.equal(updated[0].attachment, false);
  assert.equal(updated[1].attachment, true);
});
