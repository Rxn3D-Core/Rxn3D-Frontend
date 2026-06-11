import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSlipResponseDataFromVirtualSlip,
  resolveCreatedByFromVirtualSlip,
} from "./slip-header-response-data.ts";

describe("buildSlipResponseDataFromVirtualSlip", () => {
  it("maps slip-details payload for PatientHeader submitted fields", () => {
    const data = buildSlipResponseDataFromVirtualSlip({
      id: 42,
      slip_number: "SL-100",
      status: "In Progress",
      location: { id: 7, name: "Main Lab", current: { id: 7, name: "Main Lab" } },
      casepan: { id: 3, number: "PAN-9", name: "Blue", code: "B", color_code: "#00f", type: "pan" },
      delivery: {
        pickup_date: "2026-06-01T10:00:00.000Z",
        delivery_date: "2026-06-05T15:00:00.000Z",
        delivery_time: "2026-06-05T15:30:00.000Z",
      },
      created_by: { name: "Michael Chen", image: "https://example.com/mc.jpg" },
      case: {
        id: 99,
        case_number: "CASE-200",
        patient_name: "Edit stage",
        gender: "Female",
        age: 23,
        case_status: "In Progress",
      },
    });

    assert.ok(data);
    assert.equal(data.case_number, "CASE-200");
    assert.equal(data.patient_name, "Edit stage");
    assert.equal(data.gender, "Female");
    assert.equal(data.age, 23);
    assert.equal(data.slips?.[0]?.slip_number, "SL-100");
    assert.equal(data.slips?.[0]?.status, "In Progress");
    assert.equal(data.slips?.[0]?.casepan?.number, "PAN-9");
    assert.equal(data.slips?.[0]?.location?.name, "Main Lab");
    assert.equal(data.slips?.[0]?.delivery?.pickup_date, "2026-06-01T10:00:00.000Z");
    assert.equal(data.slips?.[0]?.delivery?.delivery_date, "2026-06-05T15:00:00.000Z");
  });

  it("returns null for invalid input", () => {
    assert.equal(buildSlipResponseDataFromVirtualSlip(null), null);
    assert.equal(buildSlipResponseDataFromVirtualSlip(undefined), null);
  });
});

describe("resolveCreatedByFromVirtualSlip", () => {
  it("reads created_by from slip or nested case", () => {
    assert.deepEqual(
      resolveCreatedByFromVirtualSlip({ created_by: { name: "A", image: "u1" } }),
      { name: "A", imageUrl: "u1" }
    );
    assert.deepEqual(
      resolveCreatedByFromVirtualSlip({ case: { created_by: { name: "B" } } }),
      { name: "B", imageUrl: null }
    );
  });
});
