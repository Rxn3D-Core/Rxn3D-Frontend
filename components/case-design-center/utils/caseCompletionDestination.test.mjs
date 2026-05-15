import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveCaseSubmissionResult,
  resolveVirtualSlipPath,
} from "./caseCompletionDestination.ts";

test("resolves slip id from the first created slip", () => {
  const result = resolveCaseSubmissionResult({
    success: true,
    message: "ok",
    data: {
      id: 99,
      case_number: "CASE-1",
      patient_name: "Jane Doe",
      gender: "Female",
      age: 45,
      case_status: "In Progress",
      created_at: "",
      updated_at: "",
      slips: [{ id: 42, slip_number: "SLIP-42", status: "In Progress" }],
    },
  });

  assert.equal(result.slipId, 42);
  assert.equal(result.caseNumber, "CASE-1");
  assert.equal(resolveVirtualSlipPath(result), "/virtual-slip/42");
});

test("falls back to top-level response id when slips are missing", () => {
  const result = resolveCaseSubmissionResult({
    success: true,
    message: "ok",
    data: {
      id: 17,
      case_number: "CASE-17",
      patient_name: "John Doe",
      gender: "Male",
      age: 35,
      case_status: "In Progress",
      created_at: "",
      updated_at: "",
    },
  });

  assert.equal(result.slipId, 17);
  assert.equal(resolveVirtualSlipPath(result), "/virtual-slip/17");
});

test("throws when no redirectable slip id exists", () => {
  assert.throws(
    () =>
      resolveCaseSubmissionResult({
        success: true,
        message: "ok",
        data: {
          id: 0,
          case_number: "CASE-0",
          patient_name: "No Slip",
          gender: "",
          case_status: "In Progress",
          created_at: "",
          updated_at: "",
          slips: [],
        },
      }),
    /Unable to resolve created slip id/i,
  );
});
