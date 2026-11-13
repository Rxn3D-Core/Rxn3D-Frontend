/**
 * RXN-65: the "centered" driver label design. Lab logo (outline) or lab name centred at the top, QR on the
 * right, Stage and Pan on one line, Ofc / Dr / Pt on the left, Case / Slip on the right, Pku / Del at the bottom.
 * Positions come from `planCenteredLayout` (pure, unit tested). The classic design lives in
 * generate-driver-label-pdf.ts and is not changed by this file.
 */

import type { jsPDF } from "jspdf";
import { cellOrigin, type GridGeometry } from "./label-layout";
import {
  COLOR_BORDER,
  COLOR_INK,
  COLOR_MUTED,
  COLOR_RULE,
  fitText,
  formatDeliver,
  formatShortDate,
  hexRgb,
  loadImageAsDataUrl,
  parseImageFormat,
  val,
  type DriverLabelSlip,
} from "./generate-driver-label-pdf";
import { fitLogoInBox, planCenteredLayout, type CenteredFieldKey } from "./label-content-layout-centered";
import { fieldLabel, type DriverLabelPrintSettings } from "./label-print-settings";
import type { PreparedLogo } from "./logo-outline";

const FIGMA_DPI = 120;
const FIGMA_W_IN = 4;
const FIGMA_H_IN = 2;

function drawSticker(
  doc: jsPDF,
  slip: DriverLabelSlip,
  x: number,
  y: number,
  w: number,
  h: number,
  qrDataUrl: string | null,
  settings: DriverLabelPrintSettings,
  logo: PreparedLogo | null,
) {
  const sx = w / FIGMA_W_IN;
  const sy = h / FIGMA_H_IN;
  const sFont = Math.min(sx, sy);
  const L = (key: Parameters<typeof fieldLabel>[0]) => fieldLabel(key, settings.compactAbbreviations);
  const plan = planCenteredLayout(settings, w, h);

  const radius = (8 / FIGMA_DPI) * Math.min(sx, sy);
  doc.setDrawColor(...hexRgb(COLOR_BORDER));
  doc.setLineWidth((1 / FIGMA_DPI) * sFont);
  doc.roundedRect(x, y, w, h, radius, radius, "S");

  if (plan.qr && qrDataUrl) {
    try {
      doc.addImage({
        imageData: qrDataUrl,
        format: parseImageFormat(qrDataUrl),
        x: x + plan.qr.x,
        y: y + plan.qr.y,
        width: plan.qr.w,
        height: plan.qr.h,
      });
    } catch {
      /* QR failed to embed: the sticker still prints without it. */
    }
  }

  // Header: logo when one is ready, otherwise the lab name, centred in the region left of the QR.
  let logoDrawn = false;
  if (logo) {
    const fit = fitLogoInBox(plan.logoBox, logo.aspect);
    if (fit.w > 0 && fit.h > 0) {
      try {
        doc.addImage({
          imageData: logo.dataUrl,
          format: "PNG",
          x: x + fit.x,
          y: y + fit.y,
          width: fit.w,
          height: fit.h,
        });
        logoDrawn = true;
      } catch {
        /* falls back to the lab name below */
      }
    }
  }
  const baseline = (top: number, fontPt: number) => top + (fontPt / 72) * 0.78;
  if (!logoDrawn) {
    const n = plan.nameCell;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(n.fontPt);
    doc.setTextColor(...hexRgb(COLOR_INK));
    doc.text(fitText(doc, (slip.lab_name || "").toUpperCase(), n.w), x + n.x + n.w / 2, y + baseline(n.y, n.fontPt), {
      align: "center",
    });
  }

  if (plan.rule) {
    doc.setDrawColor(...hexRgb(COLOR_RULE));
    doc.setLineWidth((1 / FIGMA_DPI) * sFont);
    doc.line(x + plan.rule.x, y + plan.rule.y, x + plan.rule.x + plan.rule.w, y + plan.rule.y);
  }

  let statusText = val(slip.status);
  if (statusText !== "-" && settings.uppercaseStatus) statusText = statusText.toUpperCase();
  const text: Record<CenteredFieldKey, string> = {
    stage: `${L("stage")} ${val(slip.stage_code)}`,
    pan: `${L("pan")} ${val(slip.case_pan_number)}`,
    ofc: `${L("ofc")} ${val(slip.office_code)}`,
    dr: `${L("dr")} ${val(slip.doctor_name)}`,
    pt: `${L("pt")} ${val(slip.pt_name)}`,
    case: `${L("case")} ${val(slip.case_number)}`,
    slip: `${L("slip")} ${val(slip.slip_number)}`,
    prod: `${L("prod")} ${val(slip.product_name)}`,
    status: `${L("status")} ${statusText}`,
    pickup: `${L("pickup")} ${formatShortDate(slip.pickup_date)}`,
    deliver: `${L("deliver")} ${formatDeliver(slip.delivery_date, slip.delivery_time)}`,
  };
  for (const cell of plan.cells) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cell.fontPt);
    doc.setTextColor(...hexRgb(cell.muted ? COLOR_MUTED : COLOR_INK));
    doc.text(fitText(doc, text[cell.key], cell.w), x + cell.x, y + baseline(cell.y, cell.fontPt));
  }
}

export async function generateCenteredDriverLabelPdf(
  pages: (DriverLabelSlip | null)[][],
  geo: GridGeometry,
  settings: DriverLabelPrintSettings,
  logo: PreparedLogo | null,
): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const orientation = geo.pageWidthIn > geo.pageHeightIn ? "landscape" : "portrait";
  const format: [number, number] = [geo.pageWidthIn, geo.pageHeightIn];
  const doc = new JsPDF({ unit: "in", format, orientation });

  const qrCache = new Map<string, string | null>();
  const sources = new Set<string>();
  for (const cells of pages) for (const s of cells) if (s?.qr_code) sources.add(s.qr_code);
  await Promise.all(Array.from(sources).map(async (src) => qrCache.set(src, await loadImageAsDataUrl(src))));

  pages.forEach((cells, pageIdx) => {
    if (pageIdx > 0) doc.addPage(format, orientation);
    cells.forEach((slip, cellIdx) => {
      if (!slip) return;
      const { x, y } = cellOrigin(geo, cellIdx);
      const qr = slip.qr_code ? qrCache.get(slip.qr_code) ?? null : null;
      drawSticker(doc, slip, x, y, geo.labelWidthIn, geo.labelHeightIn, qr, settings, logo);
    });
  });

  return doc;
}
