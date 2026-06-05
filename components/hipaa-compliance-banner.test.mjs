import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const componentSource = readFileSync(
  new URL("./hipaa-compliance-banner.tsx", import.meta.url),
  "utf8"
);

test("HIPAA compliance banner auto-dismisses after five seconds with cleanup", () => {
  assert.match(
    componentSource,
    /setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setShowBanner\(false\)\s*\}\s*,\s*5000\s*\)/s,
    "Expected the banner to schedule an auto-dismiss after 5000ms"
  );

  assert.match(
    componentSource,
    /return\s*\(\)\s*=>\s*clearTimeout\(autoHideTimeout\)/s,
    "Expected the banner effect to clear the timeout on cleanup"
  );
});
