import assert from "node:assert/strict";
import test from "node:test";
import { resolveRetentionOptionImageUrl } from "./retentionOptionImage.ts";

test("resolveRetentionOptionImageUrl prefers per-tooth images", () => {
  const url = resolveRetentionOptionImageUrl(
    {
      id: 1,
      name: "Implant",
      image_url: "https://example.com/top.png",
      tooth_chart_type: "Implant",
      images: [{ tooth_number: 8, image_url: "https://example.com/tooth-8.png" }],
      global_connection: { sample_image_url: "https://example.com/sample.png" },
    },
    8
  );
  assert.equal(url, "https://example.com/tooth-8.png");
});

test("resolveRetentionOptionImageUrl falls back to image_url", () => {
  const url = resolveRetentionOptionImageUrl(
    {
      id: 1,
      name: "Implant",
      image_url: "https://example.com/top.png",
      tooth_chart_type: "Implant",
      images: [{ tooth_number: 9, image_url: "https://example.com/other.png" }],
    },
    8
  );
  assert.equal(url, "https://example.com/top.png");
});

test("resolveRetentionOptionImageUrl falls back to global sample image", () => {
  const url = resolveRetentionOptionImageUrl(
    {
      id: 1,
      name: "Implant",
      image_url: null,
      tooth_chart_type: "Implant",
      global_connection: { sample_image_url: "https://example.com/sample.png" },
    },
    8
  );
  assert.equal(url, "https://example.com/sample.png");
});
