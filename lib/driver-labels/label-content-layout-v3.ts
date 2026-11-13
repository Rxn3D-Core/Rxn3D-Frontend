/**
 * RXN-68: the "v3" driver label (Figma file "Krupesh new labels file"). Used for the sizes in `V3_SIZES`
 * (five roll sizes, eight sheet sizes). Pure (no jsPDF) so every size and hide combination can be unit tested.
 *
 * Figma does not scale the design: on every size the type stays the same (captions 9.5 px, values 10.5 px,
 * header values 10 px) and each frame places things at fixed px positions (96 dpi). `V3_FRAMES` holds those
 * numbers per size, so a new size is a new row there and in `V3_SIZES`; no code changes.
 *
 * Optional fields hidden under RXN-66 are repacked: header columns move to the right-most column positions, row
 * columns to the left-most, and pickup / delivery stay where the design puts them (the middle of a label is blank).
 * Text boxes are slots between neighbouring positions; the generator shrinks or cuts text that is too wide.
 */

import { formatShortDate } from "./generate-driver-label-pdf";
import type { DriverLabelPrintSettings } from "./label-print-settings";

export type V3HeaderKey = "slip" | "case" | "pan";
export type V3RowKey = "ofc" | "dr" | "stage";
export type V3FooterKey = "pickup" | "deliver";
export type V3Key = V3HeaderKey | V3RowKey | V3FooterKey | "pt";
export type V3Media = "roll" | "sheet";
/** Delivery text: `long` "10/05/2026 4:00 PM"; `short` "10/05/26 4:00 PM"; `hour` "10/05/26 4 PM" (whole hours). */
export type V3DateMode = "long" | "short" | "hour";

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

/** Positions of one Figma frame, in px at 96 dpi from the frame's top-left corner. */
export interface V3Frame {
  /** [x, y, w, h] of the logo (and of the lab name when there is no logo). */
  logo: [number, number, number, number];
  /** x of SLIP / CASE / PAN, caption top y, value top y, value size px, right margin. */
  header: { x: [number, number, number]; labelY: number; valueY: number; valuePx: number; right: number };
  /** PATIENT caption x and y; name x, y (top of its box), box height and font size px. */
  patient: { labelX: number; labelY: number; nameX: number; nameY: number; nameH: number; namePx: number };
  /** Row y and x of OFFICE / DOCTOR / STAGE #; `captions` false prints values only (2.25 x 1.25). */
  row: { y: number; x: [number, number, number]; captions: boolean };
  rule: { x: number; y: number; w: number };
  /** Font size px of the row, pickup and delivery values (10.5 px; 9.5 px on 2.25 x 1.25). */
  valuePx: number;
  /** Footer: caption y, value offset, x of PICKUP and DELIVER, QR square, delivery date format. */
  footer: { y: number; valueDy: number; pickupX: number; deliverX: number; qr: [number, number, number]; date: V3DateMode };
}

const HDR_STD = { labelY: 11.5, valueY: 24, valuePx: 10, right: 14 } as const;
const PT_STD = { labelX: 14, nameX: 14, nameY: 49, nameH: 36, namePx: 31 } as const;
const LOGO_STD: [number, number, number, number] = [14, 14, 66, 20];
const ROW_Y = 87.5;

/** Frame geometry per size id, `<media>:<w>x<h>` (inches). Numbers read from the Figma frames. */
export const V3_FRAMES: Record<string, V3Frame> = {
  "roll:4x6": {
    logo: [10, 13.5, 66, 20],
    header: { x: [266, 304, 347], labelY: 10, valueY: 24.5, valuePx: 10, right: 10 },
    patient: { labelX: 10, labelY: 53, nameX: 10, nameY: 68, nameH: 36, namePx: 31 },
    row: { y: 110, x: [10, 87, 195], captions: true },
    rule: { x: 10, y: 470, w: 364 },
    valuePx: 10.5,
    footer: { y: 532, valueDy: 12, pickupX: 10, deliverX: 115, qr: [290, 485, 71], date: "long" },
  },
  "roll:4x2.5": {
    logo: LOGO_STD,
    header: { x: [265, 303, 345], ...HDR_STD },
    patient: { ...PT_STD, labelX: 16, labelY: 40.5 },
    row: { y: ROW_Y, x: [14, 94, 194], captions: true },
    rule: { x: 14, y: 148, w: 356 },
    valuePx: 10.5,
    footer: { y: 201.5, valueDy: 12, pickupX: 14, deliverX: 94, qr: [300, 156, 70], date: "long" },
  },
  "roll:4x2": {
    logo: LOGO_STD,
    header: { x: [265, 303, 345], ...HDR_STD },
    patient: { ...PT_STD, labelY: 43.5 },
    row: { y: ROW_Y, x: [14, 94, 194], captions: true },
    rule: { x: 14, y: 123, w: 356 },
    valuePx: 10.5,
    footer: { y: 158, valueDy: 12, pickupX: 14, deliverX: 94, qr: [315, 127, 55], date: "long" },
  },
  "roll:3x2": {
    logo: LOGO_STD,
    header: { x: [169, 207, 249], ...HDR_STD },
    patient: { ...PT_STD, labelY: 41.5 },
    row: { y: ROW_Y, x: [14, 80, 163.76], captions: true },
    rule: { x: 14, y: 123, w: 260 },
    valuePx: 10.5,
    footer: { y: 156, valueDy: 12, pickupX: 14, deliverX: 80, qr: [229, 134, 44], date: "long" },
  },
  "roll:2.25x1.25": {
    logo: [10, 10, 48, 15],
    header: { x: [101, 139, 181], labelY: 7.5, valueY: 20, valuePx: 10, right: 10 },
    patient: { labelX: 10, labelY: 30.5, nameX: 10, nameY: 41, nameH: 23, namePx: 20 },
    row: { y: 66.5, x: [10, 61, 137], captions: false },
    rule: { x: 10, y: 83, w: 196 },
    valuePx: 9.5,
    footer: { y: 88, valueDy: 13, pickupX: 10, deliverX: 86, qr: [181, 87, 25], date: "short" },
  },
  "sheet:2.5x2.5": {
    logo: LOGO_STD,
    header: { x: [121, 159, 201], ...HDR_STD },
    patient: { labelX: 14, labelY: 45.5, nameX: 14, nameY: 54, nameH: 30, namePx: 26 },
    row: { y: ROW_Y, x: [14, 70, 147], captions: true },
    rule: { x: 14, y: 162, w: 212 },
    valuePx: 10.5,
    footer: { y: 197, valueDy: 12, pickupX: 14, deliverX: 75, qr: [171, 166, 55], date: "hour" },
  },
  "sheet:4x2.5": {
    logo: LOGO_STD,
    header: { x: [265, 303, 345], ...HDR_STD },
    patient: { ...PT_STD, labelX: 16, labelY: 42.5 },
    row: { y: ROW_Y, x: [14, 94, 194], captions: true },
    rule: { x: 14, y: 148, w: 356 },
    valuePx: 10.5,
    footer: { y: 196.5, valueDy: 12, pickupX: 14, deliverX: 94, qr: [305, 154, 65], date: "long" },
  },
  "sheet:3.75x2": {
    logo: LOGO_STD,
    header: { x: [241, 279, 321], ...HDR_STD },
    patient: { ...PT_STD, labelY: 42.5 },
    row: { y: ROW_Y, x: [14, 94, 194], captions: true },
    rule: { x: 14, y: 123, w: 332 },
    valuePx: 10.5,
    footer: { y: 157, valueDy: 12, pickupX: 14, deliverX: 94, qr: [295, 128, 51], date: "long" },
  },
  "sheet:3.25x2.25": {
    logo: LOGO_STD,
    header: { x: [193, 231, 273], ...HDR_STD },
    patient: { ...PT_STD, labelY: 43.5 },
    row: { y: ROW_Y, x: [14, 80, 176.24], captions: true },
    rule: { x: 14, y: 124, w: 284 },
    valuePx: 10.5,
    footer: { y: 172.5, valueDy: 12, pickupX: 14, deliverX: 80, qr: [233, 130, 65], date: "long" },
  },
  "sheet:3.375x2.33": {
    logo: LOGO_STD,
    header: { x: [205, 243, 285], ...HDR_STD },
    patient: { ...PT_STD, labelY: 42.5 },
    row: { y: ROW_Y, x: [14, 83, 182.48], captions: true },
    rule: { x: 14, y: 132, w: 296 },
    valuePx: 10.5,
    footer: { y: 180.5, valueDy: 12, pickupX: 14, deliverX: 83, qr: [244, 137, 66], date: "long" },
  },
  "sheet:4x3": {
    logo: LOGO_STD,
    header: { x: [265, 303, 345], ...HDR_STD },
    patient: { ...PT_STD, labelY: 41.5 },
    row: { y: ROW_Y, x: [14, 94, 194], captions: true },
    rule: { x: 14, y: 196, w: 356 },
    valuePx: 10.5,
    footer: { y: 244.5, valueDy: 12, pickupX: 14, deliverX: 94, qr: [305, 202, 65], date: "long" },
  },
  "sheet:3x2": {
    logo: LOGO_STD,
    header: { x: [169, 207, 249], ...HDR_STD },
    patient: { ...PT_STD, labelY: 42.5 },
    row: { y: ROW_Y, x: [14, 80, 163.76], captions: true },
    rule: { x: 14, y: 123, w: 260 },
    valuePx: 10.5,
    footer: { y: 154, valueDy: 12, pickupX: 14, deliverX: 80, qr: [226, 128, 48], date: "long" },
  },
  "sheet:4x2": {
    logo: LOGO_STD,
    header: { x: [265, 303, 345], ...HDR_STD },
    patient: { ...PT_STD, labelY: 42.5 },
    row: { y: ROW_Y, x: [14, 94, 194], captions: true },
    rule: { x: 14, y: 123, w: 356 },
    valuePx: 10.5,
    footer: { y: 157, valueDy: 12, pickupX: 14, deliverX: 94, qr: [315, 126, 55], date: "long" },
  },
};

export const V3_SIZES: readonly { media: V3Media; widthIn: number; heightIn: number }[] = [
  { media: "roll", widthIn: 4, heightIn: 6 },
  { media: "roll", widthIn: 4, heightIn: 2.5 },
  { media: "roll", widthIn: 4, heightIn: 2 },
  { media: "roll", widthIn: 3, heightIn: 2 },
  { media: "roll", widthIn: 2.25, heightIn: 1.25 },
  { media: "sheet", widthIn: 4, heightIn: 2.5 }, // PLS780, 8/sheet
  { media: "sheet", widthIn: 3.75, heightIn: 2 }, // PLS618, 8/sheet
  { media: "sheet", widthIn: 3.25, heightIn: 2.25 }, // 8/sheet
  { media: "sheet", widthIn: 3.375, heightIn: 2.33 }, // PLS389, 8/sheet
  { media: "sheet", widthIn: 4, heightIn: 3 }, // PLS569, 6/sheet
  { media: "sheet", widthIn: 3, heightIn: 2 }, // PLS504, 10/sheet
  { media: "sheet", widthIn: 4, heightIn: 2 }, // 10/sheet
  { media: "sheet", widthIn: 2.5, heightIn: 2.5 }, // PLS470, 12/sheet in the size list
];

export function v3FrameKey(media: V3Media, widthIn: number, heightIn: number): string {
  return `${media}:${widthIn}x${heightIn}`;
}

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

/** A caption with a value (or, for the patient, a large name). All numbers in inches; y values are baselines. */
export interface V3Cell {
  key: V3Key;
  group: "header" | "patient" | "row" | "footer";
  x: number;
  /** x of the caption (differs from `x` only for the patient on some frames). */
  labelX: number;
  /** Width of the text slot (up to the next item or the margin). */
  w: number;
  labelBase: number;
  valueBase: number;
  /** False: the caption is not printed (values only). */
  caption: boolean;
  labelPt: number;
  valuePt: number;
  /** Smallest value size the generator may shrink to before it cuts the text with an ellipsis. */
  minValuePt: number;
  boldLabel: boolean;
  boldValue: boolean;
}

export interface V3Plan {
  frame: V3Frame;
  qr: V3Box | null;
  /** Logo box; the lab name uses `nameCell` when there is no logo. */
  logoBox: V3Box;
  nameCell: { x: number; w: number; baseline: number; fontPt: number; minPt: number };
  cells: V3Cell[];
  rule: { x: number; y: number; w: number; widthIn: number } | null;
  dateMode: V3DateMode;
  /** For the generator's header repack: right margin and the smallest x a header column may start at (right of the logo plus 8 px). */
  headerRight: number;
  headerMinLeft: number;
}

const LABEL_PX = 9.5;
const MIN_SHRINK = 0.62;
const GAP = 3;
/** Smallest gap (px) kept between the SLIP / CASE / PAN columns; closer texts are re-spaced by repackHeader. */
const HEADER_GAP = 10;
const LAB_NAME_PX = 10.5;

const I = (px: number) => px / 96;
const PT = (px: number) => px * 0.75;
/** Baseline below the top of a 1.15 line-height box (Arial / Helvetica metrics). */
const baselineFromTop = (top: number, px: number) => top + px * 0.92;
/** Baseline of text vertically centred in a box of height `boxH`. */
const baselineInBox = (top: number, boxH: number, px: number) => top + (boxH - px * 1.117) / 2 + px * 0.905;

export function planV3Layout(
  settings: DriverLabelPrintSettings,
  widthIn: number,
  heightIn: number,
  media: V3Media = "roll",
): V3Plan {
  const frame = V3_FRAMES[v3FrameKey(media, widthIn, heightIn)];
  if (!frame) throw new Error(`No v3 frame for ${media} ${widthIn} x ${heightIn} in`);
  const Wpx = widthIn * 96;
  const cells: V3Cell[] = [];
  const add = (
    key: V3Key,
    group: V3Cell["group"],
    xPx: number,
    wPx: number,
    labelBasePx: number,
    valueBasePx: number,
    valuePx: number,
    opts: { caption?: boolean; boldLabel?: boolean; boldValue?: boolean } = {},
  ) => {
    cells.push({
      key,
      group,
      x: I(xPx),
      labelX: I(xPx),
      w: I(Math.max(0, wPx)),
      labelBase: I(labelBasePx),
      valueBase: I(valueBasePx),
      caption: opts.caption !== false,
      labelPt: PT(LABEL_PX),
      valuePt: PT(valuePx),
      minValuePt: PT(valuePx) * MIN_SHRINK,
      boldLabel: !!opts.boldLabel,
      boldValue: !!opts.boldValue,
    });
  };

  // Header: visible columns take the right-most column positions; each slot runs to the next column.
  const h = frame.header;
  const hdrAll: V3HeaderKey[] = ["slip", "case", "pan"];
  const hdrOn: Record<V3HeaderKey, boolean> = { slip: settings.showSlipNumber, case: settings.showCaseNumber, pan: settings.showPan };
  const hdrKeys = hdrAll.filter((k) => hdrOn[k]);
  const hdrXs = h.x.slice(3 - hdrKeys.length);
  const hdrRight = Wpx - h.right;
  hdrKeys.forEach((key, i) => {
    const x = hdrXs[i];
    const slot = (i + 1 < hdrKeys.length ? hdrXs[i + 1] - HEADER_GAP : hdrRight) - x;
    add(key, "header", x, slot, baselineFromTop(h.labelY, LABEL_PX), baselineFromTop(h.valueY, h.valuePx), h.valuePx);
  });

  // Logo / lab name.
  const [lx, ly, lw, lh] = frame.logo;
  const nameRight = hdrKeys.length ? hdrXs[0] - 8 : hdrRight;
  const logoBox: V3Box = { x: I(lx), y: I(ly), w: I(Math.min(lw, Math.max(0, nameRight - lx))), h: I(lh) };
  const nameCell = {
    x: I(lx),
    w: I(Math.max(0, nameRight - lx)),
    baseline: I(baselineInBox(ly, lh, LAB_NAME_PX)),
    fontPt: PT(LAB_NAME_PX),
    minPt: PT(LAB_NAME_PX) * MIN_SHRINK,
  };

  // Patient: caption and the large name (full width: nothing else sits beside it).
  const p = frame.patient;
  add("pt", "patient", p.nameX, Wpx - 2 * p.nameX, baselineFromTop(p.labelY, LABEL_PX), baselineInBox(p.nameY, p.nameH, p.namePx), p.namePx, {
    boldValue: true,
  });
  // The caption may start at its own x (4 x 2.5 prints it at 16 px).
  cells[cells.length - 1].labelX = I(p.labelX);

  // Row: visible columns take the left-most column positions; the last one runs to the right margin.
  const r = frame.row;
  const rowKeys: V3RowKey[] = ["ofc", ...(settings.showDoctor ? (["dr"] as const) : []), ...(settings.showStage ? (["stage"] as const) : [])];
  rowKeys.forEach((key, i) => {
    const x = r.x[i];
    const slot = (i + 1 < rowKeys.length ? r.x[i + 1] - GAP : Wpx - 14) - x;
    const valueTop = r.captions ? r.y + 12 : r.y;
    add(key, "row", x, slot, baselineFromTop(r.y, LABEL_PX), baselineFromTop(valueTop, frame.valuePx), frame.valuePx, { caption: r.captions });
  });

  // Footer: QR, then pickup and delivery side by side (delivery moves to the pickup position when pickup is hidden).
  const f = frame.footer;
  const [qx, qy, qs] = f.qr;
  const qr: V3Box | null = settings.showQrCode ? { x: I(qx), y: I(qy), w: I(qs), h: I(qs) } : null;
  const footRight = settings.showQrCode ? qx : Wpx - 14;
  const footKeys: V3FooterKey[] = [
    ...(settings.showPickup ? (["pickup"] as const) : []),
    ...(settings.showDelivery ? (["deliver"] as const) : []),
  ];
  const footXs = [f.pickupX, f.deliverX].slice(0, footKeys.length);
  footKeys.forEach((key, i) => {
    const x = footXs[i];
    const slot = (i + 1 < footKeys.length ? footXs[i + 1] - 6 : footRight - 6) - x;
    add(key, "footer", x, slot, baselineFromTop(f.y, LABEL_PX), baselineFromTop(f.y + f.valueDy, frame.valuePx), frame.valuePx, { boldLabel: true });
  });

  const rule =
    settings.showDividers && (footKeys.length > 0 || qr)
      ? { x: I(frame.rule.x), y: I(frame.rule.y), w: I(frame.rule.w), widthIn: I(1) }
      : null;

  return { frame, qr, logoBox, nameCell, cells, rule, dateMode: f.date, headerRight: I(hdrRight), headerMinLeft: I(lx + lw + 8) };
}

function datePart(d: string | null | undefined, fullYear: boolean): string {
  const short = formatShortDate(d); // MM/DD/YY, "-" when empty, or the raw text when it is not a date
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(short);
  if (!m || !fullYear) return short;
  const iso = /^(\d{4})-\d{2}-\d{2}/.exec(String(d ?? "").trim());
  if (iso) return `${m[1]}/${m[2]}/${iso[1]}`;
  const parsed = new Date(String(d));
  return Number.isNaN(parsed.getTime()) ? short : `${m[1]}/${m[2]}/${parsed.getFullYear()}`;
}

/** Pickup date as in every Figma frame: MM/DD/YYYY. */
export function formatPickupV3(date: string | null | undefined): string {
  return datePart(date, true);
}

/** Delivery date and time as in the Figma frame of the size (no dot between date and time). */
export function formatDeliverV3(date: string | null | undefined, time: string | null | undefined, mode: V3DateMode): string {
  const d = datePart(date, mode === "long");
  const raw = time && String(time).trim() ? String(time).trim() : "";
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  let clock = raw;
  if (m) {
    let hh = Number(m[1]);
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
    clock = mode === "hour" && m[2] === "00" ? `${hh} ${ampm}` : `${hh}:${m[2]} ${ampm}`;
  }
  if (d === "-" && !clock) return "-";
  if (!clock) return d;
  if (d === "-") return clock;
  return `${d} ${clock}`;
}

/**
 * Header columns: Figma positions when every text fits its slot; otherwise the columns are packed against the
 * right margin by their real widths (gap 10 px), so real slip / case / pan numbers are not cut. `needed` is the
 * width (inches) each column wants, in order. Falls back to the Figma slots when even the packed row is too wide.
 */
export function repackHeader(
  cols: { x: number; w: number }[],
  needed: number[],
  rightEdge: number,
  minLeft: number,
  gap = HEADER_GAP / 96,
): { x: number; w: number }[] {
  if (cols.every((c, i) => needed[i] <= c.w + 1e-9)) return cols;
  const total = needed.reduce((s, n) => s + n, 0) + gap * Math.max(0, cols.length - 1);
  if (rightEdge - total < minLeft) return cols;
  let x = rightEdge - total;
  return cols.map((_, i) => {
    const out = { x, w: needed[i] };
    x += needed[i] + gap;
    return out;
  });
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
