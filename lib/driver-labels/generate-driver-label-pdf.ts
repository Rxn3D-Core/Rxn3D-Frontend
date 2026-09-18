/**
 * Builds the driver-label PDF from a page/cell placement grid.
 *
 * Layout matches Figma driver slips (4×2.5 PLS780 / 3.75×2 PLS618):
 *   header (lab / PT / OFC / DR + QR) | mid (CASE·SLIP, STAGE·PAN, PROD, STATUS) | footer (PICKUP · DELIVER)
 *
 * `pages` is one entry per physical page; each inner array is that page's cells
 * (length === geo.cellsPerPage). A cell holds a slip or null (blank). Roll mode
 * passes one-slip pages. jsPDF is imported dynamically so it never runs on the
 * server and stays out of the initial client bundle.
 */

import type { jsPDF } from "jspdf";
import { cellOrigin, type GridGeometry } from "./label-layout";
import {
  DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  fieldLabel,
  type DriverLabelPrintSettings,
} from "./label-print-settings";

export interface DriverLabelSlip {
  slip_id: number;
  case_id?: number;
  lab_name?: string;
  office_code?: string;
  pt_name?: string;
  doctor_name?: string;
  stage_code?: string;
  case_pan_number?: string;
  case_number?: string;
  slip_number?: string;
  product_name?: string;
  /** Location / workflow status label (e.g. READY FOR PICKUP). */
  status?: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_date?: string;
  delivery_time?: string;
  /** QR image from the API — a data URL or a fetchable URL. */
  qr_code?: string;
}

/** Detect the jsPDF image format from a data URL; null lets jsPDF auto-detect. */
function parseImageFormat(dataUrl: string): "PNG" | "JPEG" | undefined {
  const m = /^data:image\/(png|jpe?g)/i.exec(dataUrl);
  if (!m) return undefined;
  return /png/i.test(m[1]) ? "PNG" : "JPEG";
}

/** Resolve a QR source (data URL or remote URL) to an embeddable data URL. */
async function loadImageAsDataUrl(src?: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Trim text with an ellipsis so it fits within maxW (current font/unit). */
function fitText(doc: jsPDF, text: string, maxW: number): string {
  if (!text) return "";
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function val(v?: string | null): string {
  return v && String(v).trim() ? String(v).trim() : "-";
}

/** Y-m-d or similar → MM/DD/YY (Figma: 08/25/26). */
function formatShortDate(d?: string | null): string {
  if (!d || !String(d).trim()) return "-";
  const raw = String(d).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) return `${m[2]}/${m[3]}/${m[1].slice(2)}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const yy = String(parsed.getFullYear()).slice(2);
    return `${mm}/${dd}/${yy}`;
  }
  return raw;
}

/** H:mm or HH:mm → h:mm AM/PM (Figma: 4:00 PM). */
function formatClock(t?: string | null): string {
  if (!t || !String(t).trim()) return "";
  const raw = String(t).trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return raw;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function formatDeliver(date?: string | null, time?: string | null): string {
  const d = formatShortDate(date);
  const clock = formatClock(time);
  if (d === "-" && !clock) return "-";
  if (!clock) return d;
  if (d === "-") return clock;
  return `${d} · ${clock}`;
}

/** Figma artboard for Label art · 4" × 2" (480×240 @ 120px/in). */
const FIGMA_DPI = 120;
const FIGMA_W_IN = 4;
const FIGMA_H_IN = 2;

const COLOR_INK = "#17191F";
const COLOR_MUTED = "#555B66";
const COLOR_BORDER = "#1B1D21";
const COLOR_RULE = "#D3D7DE";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** CSS top (line box) → jsPDF baseline, in inches from label origin. */
function textBaseline(topPx: number, fontPt: number, sy: number, sFont: number): number {
  return (topPx / FIGMA_DPI) * sy + ((fontPt * sFont) / 72) * 0.78;
}

function drawFigmaLine(
  doc: jsPDF,
  absX: number,
  absY: number,
  leftPx: number,
  topPx: number,
  maxWPx: number,
  text: string,
  /** Figma CSS font-size number, treated as pt for print readability. */
  fontPt: number,
  color: string,
  sx: number,
  sy: number,
  bold: boolean,
) {
  const sFont = Math.min(sx, sy);
  const x = absX + (leftPx / FIGMA_DPI) * sx;
  const y = absY + textBaseline(topPx, fontPt, sy, sFont);
  const maxW = (maxWPx / FIGMA_DPI) * sx;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontPt * sFont);
  doc.setTextColor(...hexRgb(color));
  doc.text(fitText(doc, text, maxW), x, y);
}

/**
 * Draw one sticker from Figma CSS (Label art · 4" × 2").
 * Optional fields / display toggles come from DriverLabelPrintSettings.
 */
function drawSticker(
  doc: jsPDF,
  slip: DriverLabelSlip,
  x: number,
  y: number,
  w: number,
  h: number,
  qrDataUrl: string | null,
  settings: DriverLabelPrintSettings,
) {
  const sx = w / FIGMA_W_IN;
  const sy = h / FIGMA_H_IN;
  const sFont = Math.min(sx, sy);
  const compact = settings.compactAbbreviations;
  const L = (key: Parameters<typeof fieldLabel>[0]) => fieldLabel(key, compact);

  const radius = (8 / FIGMA_DPI) * Math.min(sx, sy);
  doc.setDrawColor(...hexRgb(COLOR_BORDER));
  doc.setLineWidth((1 / FIGMA_DPI) * sFont);
  doc.roundedRect(x, y, w, h, radius, radius, "S");

  // QR · 70×70 @ (396, 14) — always shown
  const qrSize = (70 / FIGMA_DPI) * Math.min(sx, sy);
  const qrX = x + (396 / FIGMA_DPI) * sx;
  const qrY = y + (14 / FIGMA_DPI) * sy;
  if (qrDataUrl) {
    try {
      doc.addImage({
        imageData: qrDataUrl,
        format: parseImageFormat(qrDataUrl),
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });
    } catch {
      /* QR failed to embed — sticker still prints without it. */
    }
  }

  // Header (locked: lab, patient, office; optional: doctor)
  drawFigmaLine(
    doc, x, y, 14, 14, 368,
    (slip.lab_name || "").toUpperCase(),
    12, COLOR_INK, sx, sy, true,
  );
  drawFigmaLine(
    doc, x, y, 14, 36, 368,
    `${L("pt")} ${val(slip.pt_name)}`,
    12, COLOR_INK, sx, sy, true,
  );
  drawFigmaLine(
    doc, x, y, 14, 60, 368,
    `${L("ofc")} ${val(slip.office_code)}`,
    9.5, COLOR_MUTED, sx, sy, true,
  );
  if (settings.showDoctor) {
    drawFigmaLine(
      doc, x, y, 14, 76, 368,
      `${L("dr")} ${val(slip.doctor_name)}`,
      9.5, COLOR_MUTED, sx, sy, true,
    );
  }

  const ruleX = x + (14 / FIGMA_DPI) * sx;
  const ruleW = (452 / FIGMA_DPI) * sx;
  doc.setDrawColor(...hexRgb(COLOR_RULE));
  doc.setLineWidth((1 / FIGMA_DPI) * sFont);
  if (settings.showDividers) {
    doc.line(ruleX, y + (96 / FIGMA_DPI) * sy, ruleX + ruleW, y + (96 / FIGMA_DPI) * sy);
  }

  // Mid rows — pack when optional fields are off
  const body = 9.5;
  const midTops = [106, 125.5, 145, 164.5];
  type MidRow =
    | { kind: "pair"; left: string; right: string }
    | { kind: "full"; text: string };

  const rows: MidRow[] = [
    {
      kind: "pair",
      left: `${L("case")} ${val(slip.case_number)}`,
      right: `${L("slip")} ${val(slip.slip_number)}`,
    },
  ];
  if (settings.showStage || settings.showPan) {
    rows.push({
      kind: "pair",
      left: settings.showStage ? `${L("stage")} ${val(slip.stage_code)}` : "",
      right: settings.showPan ? `${L("pan")} ${val(slip.case_pan_number)}` : "",
    });
  }
  if (settings.showProduct) {
    rows.push({ kind: "full", text: `${L("prod")} ${val(slip.product_name)}` });
  }
  if (settings.showStatus) {
    let statusText = val(slip.status);
    if (statusText !== "-" && settings.uppercaseStatus) statusText = statusText.toUpperCase();
    rows.push({ kind: "full", text: `${L("status")} ${statusText}` });
  }

  rows.forEach((row, i) => {
    const top = midTops[Math.min(i, midTops.length - 1)];
    if (row.kind === "pair") {
      if (row.left) drawFigmaLine(doc, x, y, 14, top, 220, row.left, body, COLOR_MUTED, sx, sy, true);
      if (row.right) drawFigmaLine(doc, x, y, 246, top, 220, row.right, body, COLOR_MUTED, sx, sy, true);
    } else {
      drawFigmaLine(doc, x, y, 14, top, 452, row.text, body, COLOR_MUTED, sx, sy, true);
    }
  });

  if (settings.showDividers) {
    doc.line(ruleX, y + (192 / FIGMA_DPI) * sy, ruleX + ruleW, y + (192 / FIGMA_DPI) * sy);
  }

  // Footer locked
  drawFigmaLine(
    doc, x, y, 14, 202, 190,
    `${L("pickup")} ${formatShortDate(slip.pickup_date)}`,
    body, COLOR_MUTED, sx, sy, true,
  );
  drawFigmaLine(
    doc, x, y, 203.84, 202, 262,
    `${L("deliver")} ${formatDeliver(slip.delivery_date, slip.delivery_time)}`,
    body, COLOR_MUTED, sx, sy, true,
  );
}

export async function generateDriverLabelPdf(
  pages: (DriverLabelSlip | null)[][],
  geo: GridGeometry,
  settings: DriverLabelPrintSettings = DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const orientation = geo.pageWidthIn > geo.pageHeightIn ? "landscape" : "portrait";
  const format: [number, number] = [geo.pageWidthIn, geo.pageHeightIn];
  const doc = new JsPDF({ unit: "in", format, orientation });

  const qrCache = new Map<string, string | null>();
  const sources = new Set<string>();
  for (const cells of pages) for (const s of cells) if (s?.qr_code) sources.add(s.qr_code);
  await Promise.all(
    Array.from(sources).map(async (src) => qrCache.set(src, await loadImageAsDataUrl(src))),
  );

  pages.forEach((cells, pageIdx) => {
    if (pageIdx > 0) doc.addPage(format, orientation);
    cells.forEach((slip, cellIdx) => {
      if (!slip) return;
      const { x, y } = cellOrigin(geo, cellIdx);
      const qr = slip.qr_code ? qrCache.get(slip.qr_code) ?? null : null;
      drawSticker(doc, slip, x, y, geo.labelWidthIn, geo.labelHeightIn, qr, settings);
    });
  });

  return doc;
}

/** Open a built PDF in a hidden iframe and trigger the browser print dialog. */
export function printPdfDoc(doc: jsPDF) {
  doc.autoPrint();
  const blobUrl = doc.output("bloburl") as unknown as string;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }, 60000);
}
