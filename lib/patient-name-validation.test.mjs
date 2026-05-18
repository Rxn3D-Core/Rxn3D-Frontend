import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidPatientName,
  shouldShowPatientGenderField,
  shouldAutoOpenPatientGender,
  getPatientNameFieldLabel,
} from "./patient-name-validation.ts";

test("requires at least two words", () => {
  assert.equal(isValidPatientName("Joe"), false);
  assert.equal(isValidPatientName(""), false);
});

test("requires at least two words with 2+ characters", () => {
  assert.equal(isValidPatientName("Jo X"), false);
  assert.equal(isValidPatientName("Joe X"), false);
  assert.equal(isValidPatientName("Jo Li"), true);
  assert.equal(isValidPatientName("Joe Li"), true);
});

test("allows single-character middle initials when two other words qualify", () => {
  assert.equal(isValidPatientName("Heidi C Reyes"), true);
  assert.equal(isValidPatientName("Ann XY"), true);
});

test("user examples are valid", () => {
  assert.equal(isValidPatientName("Heidi C Reyes"), true);
  assert.equal(isValidPatientName("Joe Li"), true);
  assert.equal(isValidPatientName("Jo Li"), true);
});

test("shouldShowPatientGenderField matches typing threshold", () => {
  assert.equal(shouldShowPatientGenderField("Joe"), false);
  assert.equal(shouldShowPatientGenderField("Joe X"), true);
  assert.equal(shouldShowPatientGenderField("Joe Li"), true);
  assert.equal(shouldShowPatientGenderField("Heidi C"), true);
});

test("shouldAutoOpenPatientGender for two-word and middle-initial names", () => {
  assert.equal(shouldAutoOpenPatientGender("Joe Li", ""), true);
  assert.equal(shouldAutoOpenPatientGender("Jo Li", ""), true);
  assert.equal(shouldAutoOpenPatientGender("Joe Lee", ""), false);
  assert.equal(shouldAutoOpenPatientGender("Heidi C", ""), true);
});

test("getPatientNameFieldLabel prompts for longer first name", () => {
  assert.equal(getPatientNameFieldLabel("J"), "Enter patient's full name");
  assert.equal(getPatientNameFieldLabel("Joe Li"), "Patient name");
  assert.equal(getPatientNameFieldLabel("Heidi C Reyes"), "Patient name");
});
