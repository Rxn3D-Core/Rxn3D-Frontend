import test from "node:test";
import assert from "node:assert/strict";

import { resolveRemovableEstDaysText } from "./removableEstDays.ts";

test("resolveRemovableEstDaysText uses estimated_days when product has no stage field", () => {
  const text = resolveRemovableEstDaysText(
    {
      id: 1,
      name: "Sport Guard",
      has_stage: "No",
      estimated_days: 7,
    },
    null
  );
  assert.equal(text, "7 work days after submission");
});

test("resolveRemovableEstDaysText uses stage days when stage is selected", () => {
  const text = resolveRemovableEstDaysText(
    {
      id: 2,
      name: "Partial",
      has_stage: "Yes",
      estimated_days: 7,
      stages: [{ name: "Finish", days_to_process: 12 }],
    },
    "Finish"
  );
  assert.equal(text, "12 work days after submission");
});
