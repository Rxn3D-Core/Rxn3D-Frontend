/**
 * RXN-68: draws the v3 driver label (Figma) for the roll sizes listed in `V3_SIZES`. Positions come from
 * `planV3Layout` (pure, unit tested); this file only turns the plan into jsPDF calls. Text that is too wide is
 * shrunk to a minimum size and then cut with an ellipsis, so nothing overlaps its neighbour.
 */

import type { jsPDF } from "jspdf";
import { cellOrigin, type GridGeometry } from "./label-layout";
import {
  fitText,
  formatDeliver,
  formatShortDate,
  hexRgb,
  loadImageAsDataUrl,
  parseImageFormat,
  val,
  type DriverLabelSlip,
} from "./generate-driver-label-pdf";
import {
  fitLogoLeft,
  fitValueSize,
  planV3Layout,
  V3_CAPTIONS,
  V3_COLOR_LABEL,
  V3_COLOR_RULE,
  V3_COLOR_VALUE,
  type V3Key,
} from "./label-content-layout-v3";
import type { DriverLabelPrintSettings } from "./label-print-settings";
import type { PreparedLogo } from "./logo-outline";

/** Baseline offset from the top of a line box, in em (Arial / Helvetica ascent plus half the leading). */
const BASELINE_EM = 0.92;

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
  const plan = planV3Layout(settings, w, h);
  const baseline = (top: number, pt: number) => top + (pt / 72) * BASELINE_EM;
  const measure = (text: string, pt: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(pt);
    return doc.getTextWidth(text);
  };

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
      /* QR failed to embed: the label still prints without it. */
    }
  }

  // Top left: logo when one is ready, otherwise the lab name.
  let logoDrawn = false;
  if (logo) {
    const fit = fitLogoLeft(plan.logoBox, logo.aspect);
    if (fit.w > 0 && fit.h > 0) {
      try {
        doc.addImage({ imageData: logo.dataUrl, format: "PNG", x: x + fit.x, y: y + fit.y, width: fit.w, height: fit.h });
        logoDrawn = true;
      } catch {
        /* falls back to the lab name */
      }
    }
  }
  if (!logoDrawn) {
    const n = plan.nameCell;
    const text = (slip.lab_name || "").toUpperCase();
    const size = fitValueSize((t, pt) => measure(t, pt, true), text, n.w, n.fontPt, n.minPt);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size.pt);
    doc.setTextColor(...hexRgb(V3_COLOR_VALUE));
    doc.text(size.ellipsis ? fitText(doc, text, n.w) : text, x + n.x, y + baseline(n.y, n.fontPt));
  }

  if (plan.rule) {
    doc.setDrawColor(...hexRgb(V3_COLOR_RULE));
    doc.setLineWidth(plan.rule.widthIn);
    doc.line(x + plan.rule.x, y + plan.rule.y, x + plan.rule.x + plan.rule.w, y + plan.rule.y);
  }

  const values: Record<V3Key, string> = {
    slip: val(slip.slip_number),
    case: val(slip.case_number),
    pan: val(slip.case_pan_number),
    pt: val(slip.pt_name),
    ofc: val(slip.office_code),
    dr: val(slip.doctor_name),
    stage: val(slip.stage_code),
    pickup: formatShortDate(slip.pickup_date),
    deliver: formatDeliver(slip.delivery_date, slip.delivery_time),
  };

  for (const c of plan.cells) {
    doc.setFont("helvetica", c.boldLabel ? "bold" : "normal");
    doc.setFontSize(c.labelPt);
    doc.setTextColor(...hexRgb(V3_COLOR_LABEL));
    doc.text(V3_CAPTIONS[c.key], x + c.x, y + baseline(c.labelY, c.labelPt));

    const text = values[c.key];
    const size = fitValueSize((t, pt) => measure(t, pt, c.boldValue), text, c.w, c.valuePt, c.minValuePt);
    doc.setFont("helvetica", c.boldValue ? "bold" : "normal");
    doc.setFontSize(size.pt);
    doc.setTextColor(...hexRgb(V3_COLOR_VALUE));
    doc.text(size.ellipsis ? fitText(doc, text, c.w) : text, x + c.x, y + baseline(c.valueY, c.valuePt));
  }
}

export async function generateV3DriverLabelPdf(
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
