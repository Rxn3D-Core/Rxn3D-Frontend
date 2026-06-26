import assert from "node:assert/strict";
import test from "node:test";
import {
  getRetentionChartImageUrl,
  getRetentionSelectorShape,
  isToothShowingRetentionChartImage,
  isToothShowingRetentionSelectorShape,
  retentionOptionHasFullArchImages,
} from "./retentionChartImage.ts";

const fullMaxillaryImages = Array.from({ length: 16 }, (_, i) => ({
  tooth_number: i + 1,
  image_url: `https://example.com/${i + 1}.png`,
}));

const implantOpt = {
  id: 1,
  name: "Implant",
  image_url: "https://example.com/fallback.png",
  tooth_chart_type: "Implant",
  selector_shape: "Triangle",
  images: fullMaxillaryImages,
  global_connection: { sample_image_url: "https://example.com/sample.png" },
};

test("retentionOptionHasFullArchImages requires all 16 teeth on arch", () => {
  assert.equal(retentionOptionHasFullArchImages(implantOpt, "maxillary"), true);
  const partial = {
    ...implantOpt,
    images: fullMaxillaryImages.slice(0, 15),
  };
  assert.equal(retentionOptionHasFullArchImages(partial, "maxillary"), false);
});

test("chart image only when full arch images exist", () => {
  const types = { 8: ["Implant"] };
  assert.equal(
    getRetentionChartImageUrl(8, types, [implantOpt]),
    "https://example.com/8.png"
  );
  const partial = {
    ...implantOpt,
    images: fullMaxillaryImages.slice(0, 10),
  };
  assert.equal(getRetentionChartImageUrl(8, types, [partial]), null);
});

test("selector shape when arch images incomplete", () => {
  const types = { 8: ["Implant"] };
  const partial = {
    ...implantOpt,
    images: [{ tooth_number: 8, image_url: "https://example.com/8.png" }],
  };
  assert.equal(getRetentionChartImageUrl(8, types, [partial]), null);
  assert.equal(getRetentionSelectorShape(8, types, [partial]), "Triangle");
  assert.equal(isToothShowingRetentionSelectorShape(8, types, [partial]), true);
  assert.equal(isToothShowingRetentionChartImage(8, types, [implantOpt]), true);
  assert.equal(isToothShowingRetentionChartImage(8, types, [partial]), false);
});

test("matches retention option when images use string tooth_number", () => {
  const types = { 24: ["Implant"] };
  const partial = {
    ...implantOpt,
    images: [{ tooth_number: "24", image_url: "https://example.com/24.png" }],
  };
  assert.equal(getRetentionSelectorShape(24, types, [partial]), "Triangle");
});

test("finds option by tooth_chart_type Prepped for Prep selection", () => {
  const types = { 27: ["Prep"] };
  const prepOpt = {
    id: 2,
    name: "Prepped",
    tooth_chart_type: "Prepped",
    selector_shape: "Diamond",
    images: [],
  };
  assert.equal(getRetentionSelectorShape(27, types, [prepOpt]), "Diamond");
});

test("matches lowercase tooth_chart_type pontic", () => {
  const types = { 11: ["Pontic"] };
  const ponticOpt = {
    id: 3,
    name: "pontic",
    tooth_chart_type: "pontic",
    selector_shape: "Star",
    images: [],
  };
  assert.equal(getRetentionSelectorShape(11, types, [ponticOpt]), "Star");
});

test("matches pontic option by selector_shape without tooth_chart_type", () => {
  const types = { 12: ["Pontic"] };
  const ponticOpt = {
    id: 4,
    name: "Custom label",
    selector_shape: "Pontic",
    has_implant: "No",
    images: [],
  };
  assert.equal(getRetentionSelectorShape(12, types, [ponticOpt]), "Pontic");
});
