/**
 * RXN-65: picks the driver label drawing from the saved `labelDesign`. Both designs print the logo when one is given.
 * `assets.logo` is the already prepared (outlined) logo or null; the generators do no logo networking.
 */

import type { jsPDF } from "jspdf";
import type { GridGeometry } from "./label-layout";
import { generateDriverLabelPdf, type DriverLabelSlip } from "./generate-driver-label-pdf";
import { generateCenteredDriverLabelPdf } from "./generate-driver-label-pdf-centered";
import { DEFAULT_DRIVER_LABEL_PRINT_SETTINGS, type DriverLabelPrintSettings } from "./label-print-settings";
import type { PreparedLogo } from "./logo-outline";

export interface LabelPdfAssets {
  logo: PreparedLogo | null;
}

export async function generateLabelPdf(
  pages: (DriverLabelSlip | null)[][],
  geo: GridGeometry,
  settings: DriverLabelPrintSettings = DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  assets: LabelPdfAssets = { logo: null },
): Promise<jsPDF> {
  if (settings.labelDesign === "centered") {
    return generateCenteredDriverLabelPdf(pages, geo, settings, assets.logo);
  }
  return generateDriverLabelPdf(pages, geo, settings, assets.logo);
}
