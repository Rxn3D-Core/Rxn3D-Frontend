import assert from "node:assert/strict"
import test from "node:test"
import {
  DEGREE_FORMAT_ERROR,
  DEGREE_LENGTH_ERROR,
  normalizeDegree,
  validateDegree,
  withDegree,
} from "./doctor-degree.ts"

test("empty, DDS, DMD and doctors' own degrees are valid", () => {
  for (const value of ["", undefined, null, "DDS", "DMD", "DDS, MS", "D.D.S.", "DMD, PhD (Ortho)", "BDS / MDS", "  dds  "]) {
    assert.equal(validateDegree(value), null, String(value))
  }
})

test("unsafe characters are rejected", () => {
  for (const value of ["<script>", "DDS; DROP TABLE", "DDS\u0007", "DDS|DMD"]) {
    assert.equal(validateDegree(value), DEGREE_FORMAT_ERROR, value)
  }
})

test("at most 50 characters", () => {
  assert.equal(validateDegree("A".repeat(50)), null)
  assert.equal(validateDegree("A".repeat(51)), DEGREE_LENGTH_ERROR)
})

test("normalizeDegree trims and single-spaces", () => {
  assert.equal(normalizeDegree("  DDS,   MS "), "DDS, MS")
  assert.equal(normalizeDegree(undefined), "")
})

test("withDegree puts the degree after the name, and leaves the name alone without one", () => {
  assert.equal(withDegree("Maria Pavlova", "DDS"), "Maria Pavlova, DDS")
  assert.equal(withDegree("Maria Pavlova", " DDS,   MS "), "Maria Pavlova, DDS, MS")
  assert.equal(withDegree("Maria Pavlova", ""), "Maria Pavlova")
  assert.equal(withDegree("Maria Pavlova", null), "Maria Pavlova")
})
