/**
 * RXN-68: the "v3" driver label (Figma file "Krupesh new labels file"). Used for the sizes in `V3_SIZES`
 * (five roll sizes, eight sheet sizes). Pure (no jsPDF) so every size and hide combination can be unit tested.
 *
 * The design does not scale: on every size the type stays the same and each frame places things at fixed px
 * positions (96 dpi). `V3_FRAMES` holds those numbers per size, so a new size is a new row there and in
 * `V3_SIZES`; no code changes.
 *
 * RXN-103: for readability the type is larger than in Figma (captions 12.5 px, OFFICE / DOCTOR / STAGE # captions
 * 14.5 px and values 15.5 px, other values 13.5 px; 2.25 x 1.25 uses 14.5 / 12.5 px values) and the QR code is
 * 150% of the Figma square. Positions were moved to make room.
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
export type V3StatusKey = "status" | "location";
export type V3Key = V3HeaderKey | V3RowKey | V3FooterKey | V3StatusKey | "pt";
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
  status: "STATUS",
  location: "LOCATION",
};

/** Status and location text is the same size everywhere; the LOCATION value box is 135 px wide and wraps to 2 lines. */
export const V3_LOCATION_W = 135;
export const V3_LOCATION_LINE_PX = 13;
export const V3_STATUS_PX = 12.5;
export const V3_COLOR_LABEL = "#666666";
export const V3_COLOR_VALUE = "#111111";
export const V3_COLOR_RULE = "#555555";

/**
 * Where STATUS (slip status, e.g. Ongoing) and LOCATION (where the slip is, e.g. In office ready to pick up) sit.
 * `columns`: STATUS caption at x[0], LOCATION caption at x[1], values 14 px below; the LOCATION value box is 135 px
 * wide and wraps to two lines (the block is 42 px tall). `line` (sheet 4 x 2 only): one line "STATUS: v · LOCATION: v".
 */
export type V3StatusBlock = { kind: "columns"; y: number; x: [number, number] } | { kind: "line"; y: number; x: number };

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
  /** Status / location block; absent on 2.25 x 1.25 and sheet 2.5 x 2.5, whose Figma frames have none. */
  status?: V3StatusBlock;
  /** Font size px of the pickup and delivery values (13.5 px; 12.5 px on 2.25 x 1.25). Row values are 2 px larger. */
  valuePx: number;
  /**
   * Footer: caption y, value offset, x of PICKUP and DELIVER, QR square, delivery date format. With `stack`, DELIVER
   * prints below PICKUP (both at `pickupX`, `stack` px lower) because the two do not fit side by side.
   */
  footer: {
    y: number;
    valueDy: number;
    pickupX: number;
    deliverX: number;
    stack?: number;
    qr: [number, number, number];
    date: V3DateMode;
  };
}

const LOGO_STD: [number, number, number, number] = [14, 14, 66, 20];

/** Frame geometry per size id, `<media>:<w>x<h>` (inches). Started from the Figma frames, re-spaced for RXN-103. */
export const V3_FRAMES: Record<string, V3Frame> = {
  "roll:4x6": {
    logo: [10, 13.5, 66, 20],
    header: { x: [212, 268, 326], labelY: 10, valueY: 24.5, valuePx: 13, right: 10 },
    patient: { labelX: 10, labelY: 56, nameX: 10, nameY: 70, nameH: 36, namePx: 34 },
    row: { y: 120, x: [10, 108, 250], captions: true },
    rule: { x: 10, y: 505, w: 250 },
    valuePx: 13.5,
    footer: { y: 522, valueDy: 15, pickupX: 10, deliverX: 108, qr: [268, 460, 106], date: "long" },
    status: { kind: "columns", y: 170, x: [10, 108] },
  },
  "roll:4x2.5": {
    logo: LOGO_STD,
    header: { x: [208, 264, 322], labelY: 10, valueY: 24, valuePx: 13, right: 14 },
    patient: { labelX: 16, labelY: 40, nameX: 14, nameY: 50, nameH: 36, namePx: 34 },
    row: { y: 92, x: [14, 108, 262], captions: true },
    rule: { x: 14, y: 190, w: 247 },
    valuePx: 13.5,
    footer: { y: 196, valueDy: 15, pickupX: 14, deliverX: 108, qr: [269, 128, 105], date: "long" },
    status: { kind: "columns", y: 130, x: [14, 108] },
  },
  "roll:4x2": {
    logo: [14, 10, 66, 20],
    header: { x: [208, 264, 322], labelY: 6, valueY: 20, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 32.5, nameX: 14, nameY: 39.5, nameH: 36, namePx: 34 },
    row: { y: 74.5, x: [14, 100, 218], captions: true },
    rule: { x: 14, y: 153, w: 270 },
    valuePx: 13.5,
    footer: { y: 155.5, valueDy: 15, pickupX: 14, deliverX: 108, qr: [292, 104, 82], date: "long" },
    status: { kind: "columns", y: 108, x: [14, 108] },
  },
  "roll:3x2": {
    logo: [14, 10, 66, 20],
    header: { x: [126, 176, 232], labelY: 6, valueY: 20, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 32.5, nameX: 14, nameY: 39.5, nameH: 36, namePx: 34 },
    row: { y: 74.5, x: [14, 90, 212], captions: true },
    rule: { x: 14, y: 153, w: 192 },
    valuePx: 13.5,
    footer: { y: 155.5, valueDy: 15, pickupX: 14, deliverX: 88, qr: [214, 118, 66], date: "long" },
    status: { kind: "columns", y: 108, x: [14, 90] },
  },
  // RXN-103: no separate Figma frame; the roll label uses the numbers of the sheet 4 x 3 frame.
  "roll:4x3": {
    logo: LOGO_STD,
    header: { x: [208, 264, 322], labelY: 10, valueY: 24, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 43, nameX: 14, nameY: 55, nameH: 36, namePx: 34 },
    row: { y: 108, x: [14, 108, 262], captions: true },
    rule: { x: 14, y: 237, w: 255 },
    valuePx: 13.5,
    footer: { y: 244, valueDy: 15, pickupX: 14, deliverX: 108, qr: [277, 183, 97], date: "long" },
    status: { kind: "columns", y: 154, x: [14, 108] },
  },
  "roll:2.25x1.25": {
    logo: [10, 7, 48, 15],
    header: { x: [68, 116, 170], labelY: 3, valueY: 17, valuePx: 13, right: 10 },
    patient: { labelX: 10, labelY: 29.5, nameX: 10, nameY: 37.5, nameH: 26, namePx: 23 },
    row: { y: 60.5, x: [10, 61, 137], captions: false },
    rule: { x: 10, y: 80, w: 154 },
    valuePx: 12.5,
    footer: { y: 82, valueDy: 14, pickupX: 10, deliverX: 78, qr: [172, 79, 37.5], date: "short" },
  },
  "sheet:2.5x2.5": {
    logo: LOGO_STD,
    header: { x: [84, 132, 186], labelY: 10, valueY: 24, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 42, nameX: 14, nameY: 52, nameH: 34, namePx: 29 },
    row: { y: 92, x: [14, 74, 164], captions: true },
    rule: { x: 14, y: 138, w: 212 },
    valuePx: 13.5,
    footer: { y: 148, valueDy: 15, pickupX: 14, deliverX: 14, stack: 40, qr: [150, 148, 82], date: "hour" },
  },
  "sheet:4x2.5": {
    logo: LOGO_STD,
    header: { x: [208, 264, 322], labelY: 10, valueY: 24, valuePx: 13, right: 14 },
    patient: { labelX: 16, labelY: 40, nameX: 14, nameY: 50, nameH: 36, namePx: 34 },
    row: { y: 92, x: [14, 108, 262], captions: true },
    rule: { x: 14, y: 190, w: 255 },
    valuePx: 13.5,
    footer: { y: 196, valueDy: 15, pickupX: 14, deliverX: 108, qr: [277, 135, 97], date: "long" },
    status: { kind: "columns", y: 130, x: [14, 108] },
  },
  "sheet:3.75x2": {
    logo: [14, 10, 66, 20],
    header: { x: [190, 244, 302], labelY: 6, valueY: 20, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 32.5, nameX: 14, nameY: 39.5, nameH: 36, namePx: 34 },
    row: { y: 74.5, x: [14, 104, 246], captions: true },
    rule: { x: 14, y: 153, w: 254 },
    valuePx: 13.5,
    footer: { y: 155.5, valueDy: 15, pickupX: 14, deliverX: 108, qr: [276, 110, 76], date: "long" },
    status: { kind: "columns", y: 108, x: [14, 104] },
  },
  "sheet:3.25x2.25": {
    logo: LOGO_STD,
    header: { x: [148, 200, 256], labelY: 6, valueY: 20, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 32.5, nameX: 14, nameY: 39.5, nameH: 36, namePx: 34 },
    row: { y: 74.5, x: [14, 96, 220], captions: true },
    rule: { x: 14, y: 151.5, w: 185 },
    valuePx: 13.5,
    footer: { y: 153, valueDy: 15, pickupX: 14, deliverX: 14, stack: 30, qr: [207, 113, 97], date: "long" },
    status: { kind: "columns", y: 108, x: [14, 96] },
  },
  "sheet:3.375x2.33": {
    logo: LOGO_STD,
    header: { x: [160, 212, 268], labelY: 8, valueY: 22, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 35, nameX: 14, nameY: 42, nameH: 36, namePx: 34 },
    row: { y: 78, x: [14, 98, 230], captions: true },
    rule: { x: 14, y: 183, w: 195 },
    valuePx: 13.5,
    footer: { y: 186, valueDy: 15, pickupX: 14, deliverX: 88, qr: [217, 119, 99], date: "long" },
    status: { kind: "columns", y: 114, x: [14, 98] },
  },
  "sheet:4x3": {
    logo: LOGO_STD,
    header: { x: [208, 264, 322], labelY: 10, valueY: 24, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 43, nameX: 14, nameY: 55, nameH: 36, namePx: 34 },
    row: { y: 108, x: [14, 108, 262], captions: true },
    rule: { x: 14, y: 237, w: 255 },
    valuePx: 13.5,
    footer: { y: 244, valueDy: 15, pickupX: 14, deliverX: 108, qr: [277, 183, 97], date: "long" },
    status: { kind: "columns", y: 154, x: [14, 108] },
  },
  "sheet:3x2": {
    logo: [14, 10, 66, 20],
    header: { x: [126, 176, 232], labelY: 6, valueY: 20, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 32.5, nameX: 14, nameY: 39.5, nameH: 36, namePx: 34 },
    row: { y: 74.5, x: [14, 90, 212], captions: true },
    rule: { x: 14, y: 153, w: 188 },
    valuePx: 13.5,
    footer: { y: 155.5, valueDy: 15, pickupX: 14, deliverX: 86, qr: [210, 114, 72], date: "long" },
    status: { kind: "columns", y: 108, x: [14, 90] },
  },
  "sheet:4x2": {
    logo: [14, 10, 66, 20],
    header: { x: [208, 264, 322], labelY: 8, valueY: 22, valuePx: 13, right: 14 },
    patient: { labelX: 14, labelY: 35, nameX: 14, nameY: 42, nameH: 36, namePx: 34 },
    row: { y: 78, x: [14, 100, 218], captions: true },
    rule: { x: 14, y: 137, w: 270 },
    valuePx: 13.5,
    footer: { y: 144, valueDy: 15, pickupX: 14, deliverX: 108, qr: [292, 104, 82], date: "long" },
    status: { kind: "line", y: 114, x: 14 },
  },
};

export const V3_SIZES: readonly { media: V3Media; widthIn: number; heightIn: number }[] = [
  { media: "roll", widthIn: 4, heightIn: 6 },
  { media: "roll", widthIn: 4, heightIn: 2.5 },
  { media: "roll", widthIn: 4, heightIn: 2 },
  { media: "roll", widthIn: 3, heightIn: 2 },
  { media: "roll", widthIn: 4, heightIn: 3 },
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

/** RXN-103: custom sizes inside this range print the v3 design too (smaller than the smallest Figma frame does not fit). */
export const V3_CUSTOM_MIN_IN = { w: 2.25, h: 1.25 } as const;
export const V3_CUSTOM_MAX_IN = { w: 8.5, h: 11 } as const;

function isStandardV3Size(media: V3Media, widthIn: number, heightIn: number): boolean {
  return V3_SIZES.some(
    (s) => s.media === media && Math.abs(s.widthIn - widthIn) < 1e-6 && Math.abs(s.heightIn - heightIn) < 1e-6,
  );
}

/** True for the Figma sizes in `V3_SIZES` and for any custom size from 2.25 x 1.25 in up to a Letter page. */
export function isV3Size(media: V3Media, widthIn: number, heightIn: number): boolean {
  if (isStandardV3Size(media, widthIn, heightIn)) return true;
  return (
    Number.isFinite(widthIn) &&
    Number.isFinite(heightIn) &&
    widthIn >= V3_CUSTOM_MIN_IN.w - 1e-6 &&
    heightIn >= V3_CUSTOM_MIN_IN.h - 1e-6 &&
    widthIn <= V3_CUSTOM_MAX_IN.w + 1e-6 &&
    heightIn <= V3_CUSTOM_MAX_IN.h + 1e-6
  );
}

/**
 * RXN-103: the frame of a custom size. Starts from the nearest listed frame that is not larger than the label (same media
 * first), so its content always fits, and moves what is anchored to the right edge (header, QR code, rule width) by the
 * width difference and what is anchored to the bottom (footer, QR code, rule) by the height difference. Type sizes stay
 * as designed, like on every listed frame.
 */
export function deriveV3Frame(media: V3Media, widthIn: number, heightIn: number): V3Frame {
  const fitting = V3_SIZES.filter((s) => s.widthIn <= widthIn + 1e-6 && s.heightIn <= heightIn + 1e-6);
  const sameMedia = fitting.filter((s) => s.media === media);
  const candidates = sameMedia.length ? sameMedia : fitting;
  const score = (c: { widthIn: number; heightIn: number }) => Math.abs(c.widthIn - widthIn) * 2 + Math.abs(c.heightIn - heightIn);
  const base = candidates.reduce((best, s) => (score(s) < score(best) ? s : best), candidates[0]);
  const f = V3_FRAMES[v3FrameKey(base.media, base.widthIn, base.heightIn)];
  const dx = (widthIn - base.widthIn) * 96;
  const dy = (heightIn - base.heightIn) * 96;
  const [qx, qy, qs] = f.footer.qr;
  return {
    ...f,
    header: { ...f.header, x: f.header.x.map((x) => x + dx) as [number, number, number] },
    rule: { ...f.rule, y: f.rule.y + dy, w: f.rule.w + dx },
    footer: { ...f.footer, y: f.footer.y + dy, qr: [qx + dx, qy + dy, qs] },
  };
}

/** The Figma frame for a listed size, or a derived one for a custom size. */
export function resolveV3Frame(media: V3Media, widthIn: number, heightIn: number): V3Frame | null {
  const exact = V3_FRAMES[v3FrameKey(media, widthIn, heightIn)];
  if (exact) return exact;
  return isV3Size(media, widthIn, heightIn) ? deriveV3Frame(media, widthIn, heightIn) : null;
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
  group: "header" | "patient" | "row" | "footer" | "status";
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
  /** Value lines allowed (2 for LOCATION: it wraps); `lineGap` (inches) is the distance between them. */
  maxLines: number;
  lineGap: number;
}

/** One printed line "STATUS: value · LOCATION: value" (kind `line`). Inches; `base` is a baseline. */
export interface V3StatusLine {
  keys: V3StatusKey[];
  x: number;
  w: number;
  base: number;
  pt: number;
  minPt: number;
}

export interface V3Plan {
  frame: V3Frame;
  qr: V3Box | null;
  /** Logo box; the lab name uses `nameCell` when there is no logo. */
  logoBox: V3Box;
  nameCell: { x: number; w: number; baseline: number; fontPt: number; minPt: number };
  cells: V3Cell[];
  /** Status / location printed inline (empty for `columns`, whose cells are in `cells`). */
  statusLines: V3StatusLine[];
  rule: { x: number; y: number; w: number; widthIn: number } | null;
  dateMode: V3DateMode;
  /** For the generator's header repack: right margin and the smallest x a header column may start at (right of the logo plus 8 px). */
  headerRight: number;
  headerMinLeft: number;
}

const LABEL_PX = 12.5;
/** OFFICE / DOCTOR / STAGE # print larger than the rest: caption size, value size above `valuePx`, caption-to-value gap. */
const ROW_LABEL_PX = 14.5;
const ROW_VALUE_EXTRA_PX = 2;
const ROW_VALUE_DY = 16;
/** Smallest space between two row values, so a long doctor name never runs into the stage. */
const ROW_GAP = 8;
const MIN_SHRINK = 0.62;
const GAP = 3;
/** Smallest gap (px) kept between the SLIP / CASE / PAN columns; closer texts are re-spaced by repackHeader. */
const HEADER_GAP = 10;
const LAB_NAME_PX = 13.5;

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
  const frame = resolveV3Frame(media, widthIn, heightIn);
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
    opts: { caption?: boolean; labelPx?: number; boldLabel?: boolean; boldValue?: boolean; maxLines?: number } = {},
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
      labelPt: PT(opts.labelPx ?? LABEL_PX),
      valuePt: PT(valuePx),
      minValuePt: PT(valuePx) * MIN_SHRINK,
      boldLabel: !!opts.boldLabel,
      boldValue: !!opts.boldValue,
      maxLines: opts.maxLines ?? 1,
      lineGap: I(V3_LOCATION_LINE_PX),
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
  add("pt", "patient", p.nameX, Wpx - 2 * p.nameX, baselineFromTop(p.labelY, LABEL_PX), baselineInBox(p.nameY, p.nameH, p.namePx), p.namePx);
  // The caption may start at its own x (4 x 2.5 prints it at 16 px).
  cells[cells.length - 1].labelX = I(p.labelX);

  // Row: visible columns take the left-most column positions; the last one runs to the right margin, or stops short
  // of the QR code when the code reaches up into the row.
  const r = frame.row;
  const f = frame.footer;
  const [qx, qy, qs] = f.qr;
  const rowPx = frame.valuePx + ROW_VALUE_EXTRA_PX;
  const rowBottom = r.y + (r.captions ? ROW_VALUE_DY : 0) + rowPx * 1.13;
  const rowRight = settings.showQrCode && qy < rowBottom && qy + qs > r.y ? qx - 6 : Wpx - 14;
  const rowKeys: V3RowKey[] = ["ofc", ...(settings.showDoctor ? (["dr"] as const) : []), ...(settings.showStage ? (["stage"] as const) : [])];
  rowKeys.forEach((key, i) => {
    const x = r.x[i];
    const slot = (i + 1 < rowKeys.length ? r.x[i + 1] - ROW_GAP : rowRight) - x;
    const valueTop = r.captions ? r.y + ROW_VALUE_DY : r.y;
    add(key, "row", x, slot, baselineFromTop(r.y, ROW_LABEL_PX), baselineFromTop(valueTop, rowPx), rowPx, {
      caption: r.captions,
      labelPx: ROW_LABEL_PX,
    });
  });

  // Footer: QR, then pickup and delivery side by side or stacked (delivery takes the pickup position when pickup is hidden).
  const qr: V3Box | null = settings.showQrCode ? { x: I(qx), y: I(qy), w: I(qs), h: I(qs) } : null;
  const footRight = settings.showQrCode ? qx : Wpx - 14;
  const footKeys: V3FooterKey[] = [
    ...(settings.showPickup ? (["pickup"] as const) : []),
    ...(settings.showDelivery ? (["deliver"] as const) : []),
  ];
  footKeys.forEach((key, i) => {
    const x = f.stack || i === 0 ? f.pickupX : f.deliverX;
    const y = f.y + (f.stack ?? 0) * i;
    const sideBySideNext = !f.stack && i + 1 < footKeys.length;
    const slot = (sideBySideNext ? f.deliverX - 6 : footRight - 6) - x;
    add(key, "footer", x, slot, baselineFromTop(y, LABEL_PX), baselineFromTop(y + f.valueDy, frame.valuePx), frame.valuePx, { boldLabel: true });
  });

  // Status and location: columns (cells), or one or two inline lines. Stops short of the QR code when they share height.
  const statusLines: V3StatusLine[] = [];
  const sb = frame.status;
  if (sb && settings.showStatus) {
    const qrBox = settings.showQrCode ? f.qr : null;
    const bottom = sb.y + (sb.kind === "columns" ? 42 : 16);
    const beside = qrBox && qrBox[1] < bottom && qrBox[1] + qrBox[2] > sb.y;
    const rightLimit = beside && qrBox ? qrBox[0] - 6 : Wpx - 14;
    if (sb.kind === "columns") {
      (["status", "location"] as const).forEach((key, i) => {
        const x = sb.x[i];
        const slot = i === 0 ? sb.x[1] - GAP - x : Math.min(V3_LOCATION_W, rightLimit - x);
        add(key, "status", x, slot, baselineFromTop(sb.y, LABEL_PX), baselineFromTop(sb.y + 14, V3_STATUS_PX), V3_STATUS_PX, {
          maxLines: i === 1 ? 2 : 1,
        });
      });
    } else {
      statusLines.push({
        keys: ["status", "location"],
        x: I(sb.x),
        w: I(Math.max(0, rightLimit - sb.x)),
        base: I(baselineFromTop(sb.y, V3_STATUS_PX)),
        pt: PT(V3_STATUS_PX),
        minPt: PT(V3_STATUS_PX) * MIN_SHRINK,
      });
    }
  }

  const rule =
    settings.showDividers && (footKeys.length > 0 || qr)
      ? { x: I(frame.rule.x), y: I(frame.rule.y), w: I(frame.rule.w), widthIn: I(1) }
      : null;

  return { frame, qr, logoBox, nameCell, cells, statusLines, rule, dateMode: f.date, headerRight: I(hdrRight), headerMinLeft: I(lx + lw + 8) };
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
