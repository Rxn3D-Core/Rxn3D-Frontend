/**
 * RXN-65/68: picks the driver label drawing from the saved `labelDesign`. The classic generator is unchanged.
 * `assets.logo` is the already prepared (outlined) logo or null; the generators do no logo networking.
 */

import type { jsPDF } from "jspdf";
import type { GridGeometry } from "./label-layout";
import { generateDriverLabelPdf, type DriverLabelSlip } from "./generate-driver-label-pdf";
import { generateCenteredDriverLabelPdf } from "./generate-driver-label-pdf-centered";
import { generateV3DriverLabelPdf } from "./generate-driver-label-pdf-v3";
import { isV3Size } from "./label-content-layout-v3";
import { DEFAULT_DRIVER_LABEL_PRINT_SETTINGS, type DriverLabelPrintSettings } from "./label-print-settings";
import type { PreparedLogo } from "./logo-outline";

export interface LabelPdfAssets {
  logo: PreparedLogo | null;
}

/** True when this geometry (roll mode and one of the v3 sizes) prints the v3 design. */
export function usesV3Design(geo: GridGeometry): boolean {
  return geo.isRoll && isV3Size(geo.labelWidthIn, geo.labelHeightIn);
}

export async function generateLabelPdf(
  pages: (DriverLabelSlip | null)[][],
  geo: GridGeometry,
  settings: DriverLabelPrintSettings = DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  assets: LabelPdfAssets = { logo: null },
): Promise<jsPDF> {
  // RXN-68: the roll sizes 4x6, 4x2.5, 4x2, 3x2 and 2.25x1.25 always print the v3 design.
  if (usesV3Design(geo)) {
    return generateV3DriverLabelPdf(pages, geo, settings, assets.logo);
  }
  if (settings.labelDesign === "centered") {
    return generateCenteredDriverLabelPdf(pages, geo, settings, assets.logo);
  }
  return generateDriverLabelPdf(pages, geo, settings);
}
