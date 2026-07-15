import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryShowsJawSelection,
  shouldShowJawArchSelection,
} from "./wizardJawSelection.ts";

test("categoryShowsJawSelection defaults to Yes", () => {
  assert.equal(categoryShowsJawSelection(undefined), true);
  assert.equal(categoryShowsJawSelection({ show_jaw_selection: "Yes" }), true);
  assert.equal(categoryShowsJawSelection({ show_jaw_selection: "No" }), false);
});

test("shouldShowJawArchSelection: default tooth chart overrides category No", () => {
  assert.equal(
    shouldShowJawArchSelection({ has_default_tooth_chart: "Yes" }, false),
    true,
  );
});

test("shouldShowJawArchSelection: category No hides removable arch pick", () => {
  assert.equal(
    shouldShowJawArchSelection({ has_retention: "No", retention_options: [] }, false),
    false,
  );
});

test("shouldShowJawArchSelection: category Yes shows removable arch pick", () => {
  assert.equal(
    shouldShowJawArchSelection({ has_retention: "No", retention_options: [] }, true),
    true,
  );
});

test("shouldShowJawArchSelection: fixed without default chart never asks", () => {
  assert.equal(
    shouldShowJawArchSelection(
      { has_retention: "Yes", retention_options: [{ id: 1 }] },
      true,
    ),
    false,
  );
});
