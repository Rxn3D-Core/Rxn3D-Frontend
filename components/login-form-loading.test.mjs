import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url);

function readProjectFile(relativePath) {
  return readFileSync(new URL(relativePath, projectRoot), "utf8");
}

test("login form keeps loading feedback in the submit button instead of a page overlay", () => {
  const source = readProjectFile("components/login-form.tsx");

  assert.ok(
    !source.includes('import { LoadingOverlay } from "@/components/ui/loading-overlay"'),
    "login form should not import the shared loading overlay",
  );
  assert.ok(
    !source.includes("<LoadingOverlay"),
    "login form should not render a full-page loading overlay",
  );
  assert.ok(
    source.includes('loginMutation.isPending ? ('),
    "login form should keep a pending branch for the submit button",
  );
  assert.ok(
    source.includes('{t("Logging In...")}'),
    'submit button should show the "Logging In..." label while pending',
  );
});
