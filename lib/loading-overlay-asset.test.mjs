import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url);

function readProjectFile(relativePath) {
  return readFileSync(new URL(relativePath, projectRoot), "utf8");
}

test("shared loading overlays use the ajax-loader asset with cache busting", () => {
  const filesToCheck = [
    "components/ui/loading-overlay.tsx",
    "components/dental-slip/steps/step-2-doctor-selection.tsx",
    "components/dental-slip/steps/step-4-category-selection.tsx",
    "components/case-design-center/components/CaseSubmissionOverlays.tsx",
  ];

  for (const relativePath of filesToCheck) {
    const source = readProjectFile(relativePath);

    assert.ok(
      source.includes('/images/ajax-loader.gif?v=20260602'),
      `${relativePath} should reference /images/ajax-loader.gif?v=20260602`,
    );
    assert.ok(
      !source.includes('/images/ajax-loader2.gif'),
      `${relativePath} should not reference /images/ajax-loader2.gif`,
    );
  }
});
