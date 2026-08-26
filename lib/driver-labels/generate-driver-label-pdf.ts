/**
 * Builds the driver-label PDF from a page/cell placement grid.
 *
 * `pages` is one entry per physical page; each inner array is that page's cells
 * (length === geo.cellsPerPage). A cell holds a slip or null (blank). Roll mode
 * passes one-slip pages. jsPDF is imported dynamically so it never runs on the
 * server and stays out of the initial client bundle.
 */

import type { jsPDF } from "jspdf";
import { cellOrigin, type GridGeometry } from "./label-layout";

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
  pickup_date?: string;
  pickup_time?: string;
  delivery_date?: string;
  delivery_time?: string;
  /** QR image from the API — a data URL or a fetchable URL. */
  qr_code?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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

interface StickerRow {
  k: string;
  v: string;
}

function joinDateTime(d?: string, t?: string): string {
  return [d, t].filter((x) => x && x.trim()).join(" ");
}

/** Info rows in priority order — the layout keeps as many as the height allows. */
function buildRows(slip: DriverLabelSlip): StickerRow[] {
  const val = (v?: string) => (v && v.trim() ? v : "-");
  return [
    { k: "CASE#", v: val(slip.case_number) },
    { k: "SLIP#", v: val(slip.slip_number) },
    { k: "STAGE", v: val(slip.stage_code) },
    { k: "OFC", v: val(slip.office_code) },
    { k: "DR", v: val(slip.doctor_name) },
    { k: "PAN#", v: val(slip.case_pan_number) },
    { k: "PROD", v: val(slip.product_name) },
    { k: "DEL", v: val(joinDateTime(slip.delivery_date, slip.delivery_time)) },
    { k: "PKU", v: val(joinDateTime(slip.pickup_date, slip.pickup_time)) },
  ];
}

/**
 * Draw one sticker, auto-arranged to fill the label: type and QR scale with the
 * label size, and the info rows spread evenly down the body — more fields are
 * shown when there is more height — so large stickers don't look empty.
 */
function drawSticker(
  doc: jsPDF,
  slip: DriverLabelSlip,
  x: number,
  y: number,
  w: number,
  h: number,
  qrDataUrl: string | null
) {
  const pad = clamp(Math.min(w, h) * 0.05, 0.06, 0.16);
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const radius = Math.min(w, h) * 0.04;

  doc.setDrawColor(30);
  doc.setLineWidth(0.012);
  doc.roundedRect(x, y, w, h, radius, radius, "S");

  // Scale factor relative to a 4×2 label (area 8).
  const s = clamp(Math.sqrt((w * h) / 8), 0.72, 2.2);
  const nameFont = clamp(11 * s, 9, 24);
  const ptFont = clamp(9 * s, 8, 18);

  // QR grows with the label.
  const qrSize = qrDataUrl ? clamp(Math.min(w, h) * 0.34, 0.5, 1.8) : 0;
  if (qrDataUrl) {
    try {
      doc.addImage({
        imageData: qrDataUrl,
        format: parseImageFormat(qrDataUrl),
        x: innerX + innerW - qrSize,
        y: innerY,
        width: qrSize,
        height: qrSize,
      });
    } catch {
      /* QR failed to embed — sticker still prints without it. */
    }
  }

  const topTextW = Math.max(0.2, innerW - (qrSize ? qrSize + 0.08 : 0));

  // Top band: lab name + patient.
  doc.setTextColor(20);
  doc.setFont("Inter, sans-serif", "bold");
  doc.setFontSize(nameFont);
  let cy = innerY + nameFont / 72;
  doc.text(fitText(doc, slip.lab_name || "", topTextW), innerX, cy);

  doc.setFontSize(ptFont);
  cy += (ptFont / 72) * 1.35;
  doc.text(fitText(doc, `PT: ${slip.pt_name || "-"}`, topTextW), innerX, cy);

  // Divider under the top band (clears the QR).
  const topBandBottom = Math.max(cy + pad * 0.7, innerY + qrSize + 0.04);
  doc.setDrawColor(195);
  doc.setLineWidth(0.006);
  doc.line(innerX, topBandBottom, innerX + innerW, topBandBottom);

  // Body rows: keep as many as fit, then spread them evenly to fill the height.
  const bodyTop = topBandBottom + 0.05;
  const bodyBottom = innerY + innerH;
  const bodyH = Math.max(0.1, bodyBottom - bodyTop);
  const all = buildRows(slip);
  const maxRows = clamp(Math.floor(bodyH / 0.17), 4, all.length);
  const rows = all.slice(0, maxRows);
  const bandH = bodyH / rows.length;
  const bodyFont = clamp(bandH * 72 * 0.42, 6.5, 15);

  doc.setTextColor(40);
  rows.forEach((row, i) => {
    const baseY = bodyTop + bandH * (i + 0.5) + (bodyFont / 72) * 0.35;
    doc.setFont("Inter, sans-serif", "bold");
    doc.setFontSize(bodyFont);
    const keyText = `${row.k}  `;
    doc.text(keyText, innerX, baseY);
    const keyW = doc.getTextWidth(keyText);
    doc.setFont("Inter, sans-serif", "normal");
    doc.text(fitText(doc, row.v, Math.max(0.2, innerW - keyW)), innerX + keyW, baseY);
  });
}

export async function generateDriverLabelPdf(
  pages: (DriverLabelSlip | null)[][],
  geo: GridGeometry
): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const orientation = geo.pageWidthIn > geo.pageHeightIn ? "landscape" : "portrait";
  const format: [number, number] = [geo.pageWidthIn, geo.pageHeightIn];
  const doc = new JsPDF({ unit: "in", format, orientation });

  // Preload each distinct QR once.
  const qrCache = new Map<string, string | null>();
  const sources = new Set<string>();
  for (const cells of pages) for (const s of cells) if (s?.qr_code) sources.add(s.qr_code);
  await Promise.all(
    Array.from(sources).map(async (src) => qrCache.set(src, await loadImageAsDataUrl(src)))
  );

  pages.forEach((cells, pageIdx) => {
    if (pageIdx > 0) doc.addPage(format, orientation);
    cells.forEach((slip, cellIdx) => {
      if (!slip) return;
      const { x, y } = cellOrigin(geo, cellIdx);
      const qr = slip.qr_code ? qrCache.get(slip.qr_code) ?? null : null;
      drawSticker(doc, slip, x, y, geo.labelWidthIn, geo.labelHeightIn, qr);
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
