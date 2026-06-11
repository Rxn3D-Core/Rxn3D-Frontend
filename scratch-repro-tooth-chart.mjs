/**
 * TEMP repro: trace slip_product_teeth_selections per-tooth images through
 * buildVirtualSlipVM (virtual-slip-v2) and buildVirtualSlipInitialState (CDC preload).
 * Payload modeled on GET /v1/slip/slip/{id}/details from the DevTools screenshot:
 * Metal Frame Acrylic (removable) #7,8,9,10, WEOD on 1/16, MT on 2/15.
 */
import { buildVirtualSlipVM } from "./lib/virtual-slip-view-model.ts";
import { buildVirtualSlipInitialState } from "./lib/virtual-slip-transformer.ts";
import {
  buildExtractionDisplayFromSlipProduct,
  hasExtractionChartOverlay,
  scopeChartExtractionDisplayForProductTeeth,
  chartStatusTeethFromExtractionDisplay,
} from "./lib/virtual-slip-extraction-display.ts";

const s3 = (name) => `https://rxn3d-media-files.s3.us-west-2.amazonaws.com/library/extractions/tooth-images/${name}.png`;

const weodNested = { id: 11, name: "Will extract on delivery", code: "WEOD_L1_G3", color: "#E92520", tooth_chart: "Yes" };
const mtNested = { id: 10, name: "Missing teeth", code: "MT_L1_G2", color: "#D3D3D3", tooth_chart: "Yes" };

const teethSelections = [
  { id: 612, tooth_number: 1, extraction_id: 11, retention_option_id: null, extraction: weodNested, selected_tooth_image_url: s3("extraction_3_tooth_1"), visibility_type: "Image" },
  { id: 613, tooth_number: 2, extraction_id: 10, retention_option_id: null, extraction: mtNested, selected_tooth_image_url: s3("extraction_2_tooth_2"), visibility_type: "Image" },
  { id: 614, tooth_number: 7, extraction_id: null, retention_option_id: null, extraction: null, selected_tooth_image_url: s3("tim_tooth_7"), visibility_type: "Image" },
  { id: 615, tooth_number: 8, extraction_id: null, retention_option_id: null, extraction: null, selected_tooth_image_url: s3("tim_tooth_8"), visibility_type: "Image" },
  { id: 616, tooth_number: 9, extraction_id: null, retention_option_id: null, extraction: null, selected_tooth_image_url: s3("tim_tooth_9"), visibility_type: "Image" },
  { id: 617, tooth_number: 10, extraction_id: null, retention_option_id: null, extraction: null, selected_tooth_image_url: s3("tim_tooth_10"), visibility_type: "Image" },
  { id: 618, tooth_number: 15, extraction_id: 10, retention_option_id: null, extraction: mtNested, selected_tooth_image_url: s3("extraction_2_tooth_15"), visibility_type: "Image" },
  { id: 619, tooth_number: 16, extraction_id: 11, retention_option_id: null, extraction: weodNested, selected_tooth_image_url: s3("extraction_3_tooth_16"), visibility_type: "Image" },
];

const productRow = {
  id: 1,
  type: "Upper",
  teeth_selection: "7,8,9,10",
  category: { name: "Removable Restorations" },
  product: { id: 100, name: "Metal Frame Acrylic", code: "MF", description: "", price: "300.00" },
  product_extractions: [
    { id: 9, extraction_id: 9, name: "Teeth in mouth", code: "TIM1", color: "#F3EBD7", url: null, is_tim: "Yes", visibility_type: "Image", overlay: "No", status: "Active", images: [] },
    { id: 11, extraction_id: 11, name: "Will extract on delivery", code: "WEOD_L1_G3", color: "#E92520", url: null, visibility_type: "Image", overlay: "No", status: "Active", images: [] },
    { id: 10, extraction_id: 10, name: "Missing teeth", code: "MT_L1_G2", color: "#D3D3D3", url: null, visibility_type: "Image", overlay: "No", status: "Active", images: [] },
  ],
  product_impressions: [{ id: 7, impression_id: 7, name: "STL file", code: "STL_L1_G1" }],
  product_opposite_extractions: [
    { id: 9, extraction_id: 9, name: "Teeth in mouth", code: "TIM1", color: "#F3EBD7", url: null },
  ],
  retention_options: [],
  retentions: [],
  slip_product_teeth_selections: teethSelections,
  // Grouped saved extractions: status teeth only (product teeth excluded per v2 contract)
  extractions: [
    { id: 1, extraction_id: 11, teeth_numbers: [1, 16], extraction: { ...weodNested, visibility_type: "Image", overlay: "No" } },
    { id: 2, extraction_id: 10, teeth_numbers: [2, 15], extraction: { ...mtNested, visibility_type: "Image", overlay: "No" } },
  ],
  impressions: [{ impression_id: 1, quantity: 1, impression: { id: 1, name: "Alginate", code: "ALG" } }],
};

const payload = { case: {}, products: [productRow] };

// ── Virtual slip v2 path ────────────────────────────────────────────────────
const vm = buildVirtualSlipVM(payload);
const arch = vm.arches.maxillary;
console.log("── ArchVM (virtual-slip-v2) ──");
console.log("selectedTeeth:", arch.selectedTeeth);
console.log("toothExtractionMap:", arch.extractionDisplay.toothExtractionMap);
console.log("extractionImagesByCode:", JSON.stringify(arch.extractionDisplay.extractionImagesByCode, null, 2));
console.log("toothChartSelectionsByTooth:", JSON.stringify(arch.toothChartSelectionsByTooth, null, 2));

// Simulate VirtualSlipToothChart's prop derivation
const useOverlay = hasExtractionChartOverlay(arch.extractionDisplay);
const chartDisplay = useOverlay
  ? scopeChartExtractionDisplayForProductTeeth(arch.extractionDisplay, arch.selectedTeeth)
  : arch.extractionDisplay;
console.log("\n── Simulated VirtualSlipToothChart inputs ──");
console.log("useExtractionOverlay:", useOverlay);
const chartMap = { ...chartDisplay.toothExtractionMap };
for (const tooth of arch.selectedTeeth) {
  if (arch.toothChartSelectionsByTooth[tooth]?.imageUrl) delete chartMap[tooth];
}
console.log("chartToothExtractionMap:", chartMap);
console.log("chartStatus:", chartStatusTeethFromExtractionDisplay(chartDisplay, { excludeTeeth: arch.selectedTeeth }));
for (const t of [1, 2, 7, 8, 9, 10, 15, 16]) {
  const code = chartMap[t];
  const url = code ? chartDisplay.extractionImagesByCode[code]?.[t] : undefined;
  const retentionUrl = arch.selectedTeeth.includes(t) ? arch.toothChartSelectionsByTooth[t]?.imageUrl : undefined;
  console.log(`tooth ${t}: code=${code ?? "-"} s3Url=${url ?? "-"} retentionOverlayUrl=${retentionUrl ?? "-"}`);
}

// ── CDC preload path (new stage / edit stage) ───────────────────────────────
import { buildAddedProducts } from "./lib/virtual-slip-transformer.ts";
const initial = buildVirtualSlipInitialState([productRow]);
console.log("\n── CDC preload (buildVirtualSlipInitialState) ──");
console.log("maxillaryTeeth:", initial.maxillaryTeeth);
console.log("maxillaryToothExtractionMap:", initial.maxillaryToothExtractionMap);
console.log("maxillaryNoActiveBoxTeeth:", initial.maxillaryNoActiveBoxTeeth);

const added = buildAddedProducts([productRow]);
const addedExts = added[0].product.extractions ?? [];
console.log("addedProducts[0].product.extractions codes:", addedExts.map((e) => e.code));
for (const e of addedExts) {
  console.log(`  ${e.code}: visibility=${e.visibility_type} images=${(e.images ?? []).map((i) => `${i.tooth_number}`).join(",")}`);
}

console.log("\n── raw display from buildExtractionDisplayFromSlipProduct ──");
const display = buildExtractionDisplayFromSlipProduct(productRow);
console.log("toothExtractionMap:", display.toothExtractionMap);
console.log("extractionsByCode keys:", Object.keys(display.extractionsByCode));
console.log("extractionImagesByCode:", JSON.stringify(display.extractionImagesByCode));

// ── Variant: product-teeth rows WITHOUT selected_tooth_image_url, TIM images in
// row-level product_extractions catalog ──────────────────────────────────────
const timImages = [7, 8, 9, 10].map((t) => ({ tooth_number: t, image_url: s3(`catalog_tim_tooth_${t}`) }));
const productRowNoRowUrls = {
  ...productRow,
  product_extractions: productRow.product_extractions.map((e) =>
    e.code === "TIM1" ? { ...e, images: timImages } : e,
  ),
  slip_product_teeth_selections: teethSelections.map((r) =>
    r.extraction ? r : { ...r, selected_tooth_image_url: null },
  ),
};
const display2 = buildExtractionDisplayFromSlipProduct(productRowNoRowUrls);
console.log("\n── Variant (no row URLs, catalog TIM images) ──");
console.log("toothExtractionMap:", display2.toothExtractionMap);
console.log("TIM1 images:", JSON.stringify(display2.extractionImagesByCode.TIM1));

const vm2 = buildVirtualSlipVM({ case: {}, products: [productRowNoRowUrls] });
console.log("toothChartSelectionsByTooth (variant):", JSON.stringify(vm2.arches.maxillary.toothChartSelectionsByTooth));
