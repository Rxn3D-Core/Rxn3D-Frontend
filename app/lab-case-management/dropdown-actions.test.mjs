import test from "node:test";
import assert from "node:assert/strict";
import { buildLabCaseDropdownActions } from "./dropdown-actions.mjs";

test("buildLabCaseDropdownActions preserves the expected menu order", () => {
  const actions = buildLabCaseDropdownActions({});

  assert.deepEqual(
    actions.map((action) => action.label),
    [
      "Edit Case",
      "Duplicate",
      "Change due date",
      "Print Driver label",
      "Print Paper slip",
      "Print Statement",
      "Send back to office",
      "Rush case",
      "Cancel",
    ]
  );
});

test("buildLabCaseDropdownActions marks missing handlers disabled and calls the wired ones", () => {
  const calls = [];
  const actions = buildLabCaseDropdownActions({
    onEditCase: () => calls.push("edit"),
    onPrintPaperSlip: () => calls.push("paper"),
    onSendBackToOffice: () => calls.push("send-back"),
    onCancelCase: () => calls.push("cancel"),
  });

  assert.equal(actions.find((action) => action.key === "edit-case")?.disabled, false);
  assert.equal(actions.find((action) => action.key === "duplicate")?.disabled, true);
  assert.equal(actions.find((action) => action.key === "print-paper-slip")?.disabled, false);
  assert.equal(actions.find((action) => action.key === "send-back-to-office")?.disabled, false);
  assert.equal(actions.find((action) => action.key === "cancel-case")?.disabled, false);

  actions.find((action) => action.key === "edit-case")?.onSelect?.();
  actions.find((action) => action.key === "print-paper-slip")?.onSelect?.();
  actions.find((action) => action.key === "send-back-to-office")?.onSelect?.();
  actions.find((action) => action.key === "cancel-case")?.onSelect?.();

  assert.deepEqual(calls, ["edit", "paper", "send-back", "cancel"]);
});
