import test from "node:test";
import assert from "node:assert/strict";
import {
  flattenCaseCallLogs,
  toCallLogActionStatus,
} from "./call-log-transformers.ts";

test("flattenCaseCallLogs flattens nested case/slip call logs into table rows", () => {
  const rows = flattenCaseCallLogs({
    id: 77,
    patient_name: "John Doe",
    office: { id: 2, name: "Smile Office" },
    doctor: { id: 3, name: "Dr. Smith" },
    slips: [
      {
        id: 10,
        slip_number: "SLIP-010",
        location: { id: 5, name: "Main Lab" },
        products: [{ id: 1, product_name: "Crown", stage_name: "Design" }],
        call_logs: [
          {
            id: 99,
            call_type: "incoming",
            call_date_time: "2025-07-18T14:30:00.000000Z",
            caller_name: "Jane Caller",
            caller_phone: "+123",
            call_notes: "Needs update",
            action_status: "follow_up",
            logged_by: { id: 7, name: "Agent A" },
            action_by: { id: 8, name: "Agent B" },
            has_attachments: true,
            attachments_count: 2,
          },
        ],
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].callLogId, 99);
  assert.equal(rows[0].slipId, 10);
  assert.equal(rows[0].caseId, 77);
  assert.equal(rows[0].callType, "Incoming");
  assert.equal(rows[0].followUp, true);
  assert.equal(rows[0].resolved, false);
  assert.equal(rows[0].pending, false);
  assert.equal(rows[0].patientName, "John Doe");
  assert.equal(rows[0].officeName, "Smile Office");
  assert.equal(rows[0].doctorName, "Dr. Smith");
  assert.equal(rows[0].productSummary, "Crown");
});

test("toCallLogActionStatus maps backend action states predictably", () => {
  assert.deepEqual(toCallLogActionStatus("follow_up"), {
    followUp: true,
    resolved: false,
    pending: false,
  });
  assert.deepEqual(toCallLogActionStatus("resolved"), {
    followUp: false,
    resolved: true,
    pending: false,
  });
  assert.deepEqual(toCallLogActionStatus(null), {
    followUp: false,
    resolved: false,
    pending: true,
  });
});
