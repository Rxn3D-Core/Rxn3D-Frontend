/**
 * RXN-68: the "v3" driver label (Figma). Used for the sizes in `V3_SIZES` (five roll sizes, three sheet sizes).
 * Pure (no jsPDF) so every size and every hide combination can be unit tested.
 *
 * Spec (4 x 6 in = 384 x 576 px at 96 dpi, Arial):
 *   header 47 px:   logo top left (66 x 20)                      SLIP #   CASE #   PAN #  (label above value)
 *   patient 51 px:  PATIENT label, name 31 px
 *   row 24 px:      OFFICE      DOCTOR      STAGE #
 *   (blank middle)
 *   footer 116 px:  1 px line #555, PICKUP / DELIVER (bold label, value below) bottom left, QR 71 px bottom right
 *
 * Smaller sizes use the same design: everything is drawn on a virtual canvas of `unitsW x unitsH` px and scaled by
 * `k` (inches = px * k / 96), where `k` is the largest scale (max 1) at which the full design fits the label.
 * Hidden optional fields leave no gap: header columns pack to the right edge, row columns share the width, and the
 * footer shrinks or disappears. Text boxes are fixed-width; the generator shrinks or cuts text to the box.
 */

import type { DriverLabelPrintSettings } from "./label-print-settings";

export type V3HeaderKey = "slip" | "case" | "pan";
export type V3RowKey = "ofc" | "dr" | "stage";
export type V3FooterKey = "pickup" | "deliver";
export type V3Key = V3HeaderKey | V3RowKey | V3FooterKey | "pt";

/** Printed caption of each field (fixed full capital words, not the compact abbreviations). */
export const V3_CAPTIONS: Record<V3Key, string> = {
  slip: "SLIP #",
  case: "CASE #",
  pan: "PAN #",
  pt: "PATIENT",
  ofc: "OFFICE",
  dr: "DOCTOR",
  stage: "STAGE #",
  pickup: "PICKUP",
  deliver: "DELIVER",
};

export const V3_COLOR_LABEL = "#666666";
export const V3_COLOR_VALUE = "#111111";
export const V3_COLOR_RULE = "#555555";

export type V3Media = "roll" | "sheet";

/**
 * Sizes (inches) that print the v3 design, per print mode. To add a size, add a row here; nothing else changes.
 * Roll rows are the five roll sizes; sheet rows are label stock on a Letter sheet (grid comes from SHEET_TEMPLATES,
 * 8 labels per sheet for these three).
 */
export const V3_SIZES: readonly { media: V3Media; widthIn: number; heightIn: number }[] = [
  { media: "roll", widthIn: 4, heightIn: 6 },
  { media: "roll", widthIn: 4, heightIn: 2.5 },
  { media: "roll", widthIn: 4, heightIn: 2 },
  { media: "roll", widthIn: 3, heightIn: 2 },
  { media: "roll", widthIn: 2.25, heightIn: 1.25 },
  { media: "sheet", widthIn: 4, heightIn: 2.5 }, // PLS780
  { media: "sheet", widthIn: 3.75, heightIn: 2 }, // PLS618
  { media: "sheet", widthIn: 3.25, heightIn: 2.25 },
];

export function isV3Size(media: V3Media, widthIn: number, heightIn: number): boolean {
  return V3_SIZES.some(
    (s) => s.media === media && Math.abs(s.widthIn - widthIn) < 1e-6 && Math.abs(s.heightIn - heightIn) < 1e-6,
  );
}

export interface V3Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A caption with a value under it (or, for the patient, a large name). All numbers in inches. */
export interface V3Cell {
  key: V3Key;
  x: number;
  w: number;
  /** Top of the caption line box, top of the value line box. */
  labelY: number;
  valueY: number;
  labelH: number;
  valueH: number;
  labelPt: number;
  valuePt: number;
  /** Smallest value size the generator may shrink to before it cuts the text with an ellipsis. */
  minValuePt: number;
  /** Bold caption (pickup / deliver). */
  boldLabel: boolean;
  /** Bold value (patient name). */
  boldValue: boolean;
}

export interface V3Plan {
  /** Scale of the 96 dpi design (1 = full size). */
  k: number;
  qr: V3Box | null;
  /** Largest box the logo may use; the lab name uses `nameCell` when there is no logo. */
  logoBox: V3Box;
  nameCell: V3Box & { fontPt: number; minPt: number };
  cells: V3Cell[];
  rule: { x: number; y: number; w: number; widthIn: number } | null;
}

// Figma numbers (px at 96 dpi).
const PAD = 10;
const LABEL_PX = 9.5;
const VALUE_PX = 10.5;
const NAME_PX = 31;
const LINE = 1.15;
const HEADER_H = 47;
const PATIENT_H = 51;
const ROW_H = 24;
const FOOTER_H_TALL = 116;
const QR_PX = 71;
const LOGO_W = 66;
const LOGO_H = 20;
const HEADER_COL_W = 62;
const COL_GAP = 6;
const GROUP_PITCH = 30;
const MIN_SHRINK = 0.62;
const FULL_W_PX = 384;
/** Height of the compact design (all fields on, QR on): used to find the scale. */
const COMPACT_NEED_H = HEADER_H + PATIENT_H + 4 + ROW_H + 10 + (8 + QR_PX + PAD);

const px2in = (px: number, k: number) => (px * k) / 96;
const px2pt = (px: number, k: number) => px * k * 0.75;

export function v3Scale(widthIn: number, heightIn: number): number {
  const wPx = widthIn * 96;
  const hPx = heightIn * 96;
  const tall = hPx >= 400;
  const needH = tall ? 0 : COMPACT_NEED_H;
  return Math.min(1, wPx / FULL_W_PX, needH > 0 ? hPx / needH : 1);
}

export function planV3Layout(settings: DriverLabelPrintSettings, widthIn: number, heightIn: number): V3Plan {
  const k = v3Scale(widthIn, heightIn);
  const U = (widthIn * 96) / k; // canvas width in px
  const H = (heightIn * 96) / k; // canvas height in px
  const tall = heightIn * 96 >= 400;
  const I = (px: number) => px2in(px, k);

  const cells: V3Cell[] = [];
  const addCell = (
    key: V3Key,
    xPx: number,
    yPx: number,
    wPx: number,
    opts: { valuePx?: number; boldLabel?: boolean; boldValue?: boolean; valueGapPx?: number } = {},
  ) => {
    const valuePx = opts.valuePx ?? VALUE_PX;
    const labelH = LABEL_PX * LINE;
    const valueGap = opts.valueGapPx ?? 0;
    cells.push({
      key,
      x: I(xPx),
      w: I(wPx),
      labelY: I(yPx),
      valueY: I(yPx + labelH + valueGap),
      labelH: I(labelH),
      valueH: I(valuePx * LINE),
      labelPt: px2pt(LABEL_PX, k),
      valuePt: px2pt(valuePx, k),
      minValuePt: px2pt(valuePx, k) * MIN_SHRINK,
      boldLabel: !!opts.boldLabel,
      boldValue: !!opts.boldValue,
    });
  };

  // Header: optional columns pack against the right edge.
  const headerKeys: V3HeaderKey[] = [
    ...(settings.showSlipNumber ? (["slip"] as const) : []),
    ...(settings.showCaseNumber ? (["case"] as const) : []),
    ...(settings.showPan ? (["pan"] as const) : []),
  ];
  const headerW = headerKeys.length * HEADER_COL_W + Math.max(0, headerKeys.length - 1) * COL_GAP;
  const headerLeft = U - PAD - headerW;
  headerKeys.forEach((key, i) => addCell(key, headerLeft + i * (HEADER_COL_W + COL_GAP), PAD, HEADER_COL_W));

  const nameRight = headerKeys.length ? headerLeft - 8 : U - PAD;
  const logoBox: V3Box = { x: I(PAD), y: I(PAD), w: I(Math.min(LOGO_W, Math.max(0, nameRight - PAD))), h: I(LOGO_H) };
  const namePx = 10.5;
  const nameCell = {
    x: I(PAD),
    y: I(PAD + (LOGO_H - namePx * LINE) / 2),
    w: I(Math.max(0, nameRight - PAD)),
    h: I(namePx * LINE),
    fontPt: px2pt(namePx, k),
    minPt: px2pt(namePx, k) * MIN_SHRINK,
  };

  // Patient: caption then the large name, across the full width.
  addCell("pt", PAD, HEADER_H, U - 2 * PAD, { valuePx: NAME_PX, boldValue: true, valueGapPx: 1 });

  // Row: office, doctor and stage share the width (doctor gets the most).
  const rowKeys: V3RowKey[] = ["ofc", ...(settings.showDoctor ? (["dr"] as const) : []), ...(settings.showStage ? (["stage"] as const) : [])];
  const weight: Record<V3RowKey, number> = { ofc: 0.3, dr: 0.42, stage: 0.28 };
  const totalW = U - 2 * PAD - (rowKeys.length - 1) * 8;
  const wSum = rowKeys.reduce((s, key) => s + weight[key], 0);
  let rowX = PAD;
  const rowY = HEADER_H + PATIENT_H + 4;
  for (const key of rowKeys) {
    const w = (totalW * weight[key]) / wSum;
    addCell(key, rowX, rowY, w);
    rowX += w + 8;
  }

  // Footer, pinned to the bottom edge.
  const footerKeys: V3FooterKey[] = [
    ...(settings.showPickup ? (["pickup"] as const) : []),
    ...(settings.showDelivery ? (["deliver"] as const) : []),
  ];
  const textH = footerKeys.length ? (footerKeys.length - 1) * GROUP_PITCH + (LABEL_PX + VALUE_PX) * LINE : 0;
  const gapAfterRule = tall ? 24 : 8;
  let footerH = 0;
  if (settings.showQrCode) footerH = tall ? FOOTER_H_TALL : gapAfterRule + QR_PX + PAD;
  else if (footerKeys.length) footerH = gapAfterRule + textH + PAD;
  const footerTop = H - footerH;

  const qrPx = Math.min(QR_PX, Math.max(0, H - PAD - (footerTop + gapAfterRule)));
  const qr: V3Box | null = settings.showQrCode
    ? { x: I(U - PAD - qrPx), y: I(H - PAD - qrPx), w: I(qrPx), h: I(qrPx) }
    : null;
  const textW = settings.showQrCode ? U - PAD - qrPx - 12 - PAD : U - 2 * PAD;
  footerKeys.forEach((key, i) =>
    addCell(key, PAD, footerTop + gapAfterRule + i * GROUP_PITCH, textW, { boldLabel: true }),
  );

  const rule =
    settings.showDividers && footerH > 0
      ? { x: I(PAD), y: I(footerTop), w: I(U - 2 * PAD), widthIn: I(1) }
      : null;

  return { k, qr, logoBox, nameCell, cells, rule };
}

/**
 * Value font size that makes `text` fit `maxW`: the full size when it fits, otherwise shrunk down to `minPt`;
 * `ellipsis` is true only when even the minimum is too wide. `measure(text, pt)` returns the width in inches.
 */
export function fitValueSize(
  measure: (text: string, pt: number) => number,
  text: string,
  maxW: number,
  pt: number,
  minPt: number,
): { pt: number; ellipsis: boolean } {
  if (measure(text, pt) <= maxW) return { pt, ellipsis: false };
  const scaled = pt * (maxW / measure(text, pt));
  if (scaled >= minPt) return { pt: scaled * 0.995, ellipsis: false };
  return { pt: minPt, ellipsis: measure(text, minPt) > maxW };
}

/** Largest size with the image's aspect ratio (width / height) that fits `box`, left aligned and vertically centred. */
export function fitLogoLeft(box: V3Box, aspect: number): V3Box {
  if (!(aspect > 0) || box.w <= 0 || box.h <= 0) return { x: box.x, y: box.y, w: 0, h: 0 };
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  return { x: box.x, y: box.y + (box.h - h) / 2, w, h };
}
