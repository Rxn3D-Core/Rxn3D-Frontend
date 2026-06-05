import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaperSlipSectionModels,
  parseCaseIdsParam,
  parseSlipIdsParam,
  resolvePaperSlipPrintRequest,
} from "./page-helpers.ts";

test("parseSlipIdsParam normalizes comma-separated and repeated slip ids", () => {
  assert.deepEqual(parseSlipIdsParam("10, 20, 20,abc, 30"), [10, 20, 30]);
});

test("parseSlipIdsParam accepts repeated query params and preserves first-seen order", () => {
  assert.deepEqual(parseSlipIdsParam(["7,8", "8", "9"]), [7, 8, 9]);
});

test("parseCaseIdsParam normalizes comma-separated and repeated case ids", () => {
  assert.deepEqual(parseCaseIdsParam(["101,102", "102", "bad", "103"]), [101, 102, 103]);
});

test("resolvePaperSlipPrintRequest decodes serialized slip payloads and ids", () => {
  const payload = encodeURIComponent(
    JSON.stringify([
      { slipId: 11, slipNumber: "SLIP-11", caseNumber: "CASE-1" },
      { slipId: 12, slipNumber: "SLIP-12", caseNumber: "CASE-1" },
    ]),
  );

  const request = resolvePaperSlipPrintRequest({
    slip_ids: "11,12",
    data: payload,
  });

  assert.deepEqual(request.slipIds, [11, 12]);
  assert.equal(request.initialSlips.length, 2);
  assert.equal(request.error, null);
});

test("resolvePaperSlipPrintRequest accepts office-flow case ids when slip ids are absent", () => {
  const request = resolvePaperSlipPrintRequest({
    case_ids: "91,92",
  });

  assert.deepEqual(request.caseIds, [91, 92]);
  assert.deepEqual(request.slipIds, []);
  assert.equal(request.error, null);
});

test("resolvePaperSlipPrintRequest reports an error when slip ids are missing", () => {
  const request = resolvePaperSlipPrintRequest({});

  assert.equal(request.error, "No slip or case IDs were provided for paper slip printing.");
  assert.deepEqual(request.slipIds, []);
  assert.deepEqual(request.initialSlips, []);
});

test("buildPaperSlipSectionModels creates one printable section per slip with page breaks after the first", () => {
  const sections = buildPaperSlipSectionModels([
    { slipId: 21, slipNumber: "SLIP-21", caseNumber: "CASE-21" },
    { slipId: 22, slipNumber: "SLIP-22", caseNumber: "CASE-21" },
  ]);

  assert.deepEqual(
    sections.map((section) => ({
      slipId: section.slip.slipId,
      pageBreakBefore: section.pageBreakBefore,
    })),
    [
      { slipId: 21, pageBreakBefore: false },
      { slipId: 22, pageBreakBefore: true },
    ],
  );
});
