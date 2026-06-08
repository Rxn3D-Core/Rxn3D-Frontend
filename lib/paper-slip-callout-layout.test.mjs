import test from "node:test";
import assert from "node:assert/strict";

import {
  getPaperSlipCalloutLayout,
  getPaperSlipCalloutVisual,
} from "./paper-slip-callout-layout.ts";

test("status callouts with icons reserve edge space and anchor the icon on the box edge", () => {
  const missingLayout = getPaperSlipCalloutLayout("missing");
  const extractionLayout = getPaperSlipCalloutLayout("extraction");

  assert.ok(extractionLayout.wrapperClass.includes("min-w-[280px]"));
  assert.ok(missingLayout.wrapperClass.includes("min-w-[180px]"));

  for (const layout of [missingLayout, extractionLayout]) {
    assert.equal(layout.hasIcon, true);
    assert.ok(layout.wrapperClass.includes("min-h-[52px]"));
    assert.ok(layout.wrapperClass.includes("shrink-0"));
    assert.ok(layout.wrapperClass.includes("border-[0.5px]"));
    assert.ok(layout.wrapperClass.includes("rounded-[5.79053px]"));
    assert.ok(layout.wrapperClass.includes("justify-start"));
    assert.ok(layout.wrapperClass.includes("gap-[8px]"));
    assert.ok(layout.wrapperClass.includes("pr-[14px]"));
    assert.equal(layout.boxClass, "");
    assert.ok(layout.iconClass.includes("ml-[-14px]"));
    assert.ok(layout.iconClass.includes("h-[30.53px]"));
    assert.ok(layout.iconClass.includes("w-[19.17px]"));
    assert.equal(layout.iconClass.includes("absolute"), false);
    assert.ok(layout.textClass.includes("flex-1"));
    assert.ok(layout.textClass.includes("gap-[6px]"));
    assert.ok(layout.textClass.includes("[font-family:Verdana,Arial,sans-serif]"));
    assert.ok(layout.textClass.includes("tracking-[-0.02em]"));
    assert.ok(layout.textClass.includes("text-center"));
    assert.equal(layout.labelClass, "w-full whitespace-nowrap text-center text-[7.12368px] leading-[11px]");
    assert.equal(layout.teethClass, "w-full whitespace-nowrap text-center text-[7.12368px] leading-[11px]");
  }
});

test("retention callouts stay centered without an edge icon anchor", () => {
  const layout = getPaperSlipCalloutLayout("retention");
  const visual = getPaperSlipCalloutVisual("retention");

  assert.equal(layout.hasIcon, false);
  assert.equal(layout.wrapperClass.includes("min-w-0"), false);
  assert.equal(layout.boxClass, "");
  assert.equal(layout.iconClass, "");
  assert.equal(visual.icon, null);
});
