/**
 * RXN-65: the "centered" driver label design. Lab logo (outline) or lab name centred at the top, QR on the
 * right, Stage and Pan on one line, Ofc / Dr / Pt on the left, Case / Slip on the right, Pku / Del at the bottom.
 * Positions come from `planCenteredLayout` (pure, unit tested). The classic design lives in
 * generate-driver-label-pdf.ts and is not changed by this file.
 */

import type { jsPDF } from "jspdf";
import { cellOrigin, type GridGeometry } from "./label-layout";
import {
  COLOR_INK,
  COLOR_RULE,
  fitText,
  hexRgb,
  loadImageAsDataUrl,
  parseImageFormat,
  val,
  type DriverLabelSlip,
} from "./generate-driver-label-pdf";
import { fitLogoInBox, planCenteredLayout, type CenteredFieldKey } from "./label-content-layout-centered";
import { fieldLabel, officeText, type DriverLabelPrintSettings } from "./label-print-settings";

import type { PreparedLogo } from "./logo-outline";

/** Field names of the centred design, as on the user's sample: "Ofc:", "Dr:", "Pt:", "Case #", "Stage #", "Pku:", "Del:". */
const CENTERED_COMPACT_NAMES: Partial<Record<CenteredFieldKey, string>> = { stage: "Stage #", pan: "Pan #" };

/** Y-m-d (or similar) to MM/DD/YYYY, as on the sample label. */
function fullDate(d?: string | null): string {
  if (!d || !String(d).trim()) return "-";
  const raw = String(d).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}/${parsed.getFullYear()}`;
}

/** H:mm to hh:mm AM/PM (sample: "04:00 PM"); empty when there is no time. */
function clock(t?: string | null): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? "").trim());
  if (!m) return "";
  const h = Number(m[1]);
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

function deliverText(date?: string | null, time?: string | null): string {
  const d = fullDate(date);
  const c = clock(time);
  return d === "-" ? c || "-" : c ? `${d} ${c}` : d;
}

/** Field names ("Ofc:", "Dr:") in grey; #999999 was too light, values stay in ink. */
const COLOR_LABEL = "#666666";

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
  const L = (key: CenteredFieldKey) =>
    (settings.compactAbbreviations ? CENTERED_COMPACT_NAMES[key] : undefined) ?? fieldLabel(key, settings.compactAbbreviations);
  const plan = planCenteredLayout(settings, w, h);

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
    doc.setFont("helvetica", "normal");
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
  // Field name and value are drawn separately: the value is larger than the name (as on the user's sample).
  const text: Record<CenteredFieldKey, [string, string]> = {
    stage: [L("stage"), val(slip.stage_code)],
    pan: [L("pan"), val(slip.case_pan_number)],
    ofc: [L("ofc"), val(officeText(slip, settings.officeDisplay))],
    dr: [L("dr"), val(slip.doctor_name)],
    pt: [L("pt"), val(slip.pt_name)],
    case: [L("case"), val(slip.case_number)],
    slip: [L("slip"), val(slip.slip_number)],
    prod: [L("prod"), val(slip.product_name)],
    status: [L("status"), statusText],
    pickup: [L("pickup"), fullDate(slip.pickup_date)],
    deliver: [L("deliver"), deliverText(slip.delivery_date, slip.delivery_time)],
  };
  const ended = new Map<CenteredFieldKey, number>(); // x where each drawn text actually ends
  for (const cell of plan.cells) {
    const [name, value] = text[cell.key];
    let left = cell.x;
    let maxW = cell.w;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(cell.fontPt);
    const prev = cell.after ? ended.get(cell.after) : undefined;
    if (prev !== undefined) {
      // Follow the previous text with a small gap, keeping the right limit of the planned box.
      const limit = cell.x + cell.w;
      left = Math.min(prev + doc.getTextWidth("   "), limit);
      maxW = Math.max(0, limit - left);
    }
    const nameW = doc.getTextWidth(name);
    const gap = doc.getTextWidth("  ");
    doc.setFontSize(cell.valuePt);
    const shownValue = fitText(doc, value, Math.max(0, maxW - nameW - gap));
    const valueW = doc.getTextWidth(shownValue);
    const total = nameW + gap + valueW;
    const startX = cell.align === "right" ? cell.x + cell.w - total : left;
    const base = y + baseline(cell.y, cell.valuePt);
    doc.setTextColor(...hexRgb(COLOR_INK));
    doc.text(shownValue, x + startX + nameW + gap, base);
    doc.setFontSize(cell.fontPt);
    doc.setTextColor(...hexRgb(COLOR_LABEL));
    doc.text(name, x + startX, base);
    ended.set(cell.key, startX + total);
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
