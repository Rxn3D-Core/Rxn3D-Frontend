/**
 * RXN-65: where each printed item goes on the "centered" driver label design, in inches from the label's
 * top-left corner. Pure (no jsPDF) so it can be unit tested for every label size.
 *
 * Reference artboard is 480 x 240 px (4" x 2" at 120 px/in); x is scaled by width/4, y by height/2 and fonts by
 * the smaller of the two, exactly like the classic design, so all label sizes behave alike.
 *
 *   [ lab logo or name, centred in the region left of the QR ]            [  QR  ]
 *   Stage <v>     Pan <v>                                                 [      ]
 *   Ofc <v>                                       Case <v>
 *   Dr  <v>                                       Slip <v>
 *   Pt  <v>
 *   (Prod <v>                                     Status <v>)   only when switched on
 *   ----------------------------------------------------------------------
 *   Pku <v>                                       Del <v>
 *
 * Lab name or logo, patient and office always print. Hidden fields leave no gap: remaining rows are centred
 * in the free band, and a column with one entry moves up.
 */

import type { DriverLabelPrintSettings } from "./label-print-settings";

export type CenteredFieldKey =
  | "stage"
  | "pan"
  | "ofc"
  | "dr"
  | "pt"
  | "case"
  | "slip"
  | "prod"
  | "status"
  | "pickup"
  | "deliver";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CenteredCell extends Box {
  key: CenteredFieldKey;
  /** Font size in pt after scaling. */
  fontPt: number;
  /** Muted colour (body fields) versus ink (patient). */
  muted: boolean;
}

export interface CenteredPlan {
  /** QR code square, or null when the QR code is switched off. */
  qr: Box | null;
  /** Region left of the QR (or the full width) where the logo or lab name is centred. */
  header: Box;
  /** Largest box a logo may occupy, inside `header`. */
  logoBox: Box;
  /** Lab name line (used when no logo prints); centred on `header`. */
  nameCell: Box & { fontPt: number };
  cells: CenteredCell[];
  /** The one divider above the bottom line, or null. */
  rule: { x: number; y: number; w: number } | null;
}

export const ARTBOARD_W_PX = 480;
export const ARTBOARD_H_PX = 240;
const DPI = 120;
const W_IN = 4;
const H_IN = 2;

const ROW_PITCH_PX = 19.5;
const TEXT_H_PX = 16;
const OPTICAL_SHIFT_PX = 0.75;
const COL_LEFT = 14;
const COL_RIGHT = 246;
const COL_W = 220;
const FULL_W = 452;
const FOOTER_RULE_PX = 192;
const FOOTER_TOP_PX = 202;
const NAME_BOX_H_PX = 48;
const LOGO_H_PX = 44;
const BODY_PT = 9.5;
const NAME_PT = 12;

export function planCenteredLayout(
  settings: DriverLabelPrintSettings,
  widthIn: number,
  heightIn: number,
): CenteredPlan {
  const sx = widthIn / W_IN;
  const sy = heightIn / H_IN;
  const sFont = Math.min(sx, sy);
  const X = (px: number) => (px / DPI) * sx;
  const Y = (px: number) => (px / DPI) * sy;
  // Box height = ascent plus descent of the glyphs (baseline is at 0.78 em below the top of the box).
  const bodyH = (BODY_PT * sFont * 0.9) / 72;

  // QR: same size rule as the classic design (fills the band above y=96, capped by the width scale).
  const qrTop = Y(8);
  const qrSize = Math.max(0, Math.min(Y(96) - Y(6) - qrTop, (82 / DPI) * sx * 1.25));
  const qrX = widthIn - X(12) - qrSize;
  const qr: Box | null = settings.showQrCode ? { x: qrX, y: qrTop, w: qrSize, h: qrSize } : null;

  const regionLeft = X(COL_LEFT);
  const regionRight = qr ? qrX - X(8) : widthIn - X(COL_LEFT);
  const regionW = Math.max(0, regionRight - regionLeft);
  const bandBottomPx = qr ? 96 : 84;

  const hasStageLine = settings.showStage || settings.showPan;
  const nameTopPx = hasStageLine ? 8 : (bandBottomPx - NAME_BOX_H_PX) / 2;
  const header: Box = { x: regionLeft, y: Y(nameTopPx), w: regionW, h: Y(NAME_BOX_H_PX) };
  const logoBox: Box = {
    x: regionLeft + X(4),
    y: Y(nameTopPx + 2),
    w: Math.max(0, regionW - X(8)),
    h: Y(LOGO_H_PX),
  };
  const nameH = (NAME_PT * sFont * 0.9) / 72;
  const nameCell = {
    x: regionLeft,
    y: Y(nameTopPx + NAME_BOX_H_PX / 2 - TEXT_H_PX / 2),
    w: regionW,
    h: nameH,
    fontPt: NAME_PT * sFont,
  };

  const cells: CenteredCell[] = [];
  const add = (key: CenteredFieldKey, leftPx: number, topPx: number, maxWPx: number) => {
    // The patient line is larger and in ink colour, as in the classic design.
    const isPt = key === "pt";
    const fontPt = (isPt ? NAME_PT : BODY_PT) * sFont;
    cells.push({ key, x: X(leftPx), y: Y(topPx), w: X(maxWPx), h: isPt ? nameH : bodyH, fontPt, muted: !isPt });
  };

  // Stage and Pan share one line under the header, left aligned, inside the region left of the QR.
  if (hasStageLine) {
    const lineTopPx = 8 + NAME_BOX_H_PX + 6;
    const regionWPx = (regionW / sx) * DPI;
    if (settings.showStage && settings.showPan) {
      const half = (regionWPx - 8) / 2;
      add("stage", COL_LEFT, lineTopPx, half);
      add("pan", COL_LEFT + half + 8, lineTopPx, half);
    } else {
      add(settings.showStage ? "stage" : "pan", COL_LEFT, lineTopPx, regionWPx);
    }
  }

  // Body: left column Ofc, Dr, Pt; right column Case, Slip; optional Prod / Status row.
  const left: CenteredFieldKey[] = ["ofc", ...(settings.showDoctor ? (["dr"] as const) : []), "pt"];
  const right: CenteredFieldKey[] = [
    ...(settings.showCaseNumber ? (["case"] as const) : []),
    ...(settings.showSlipNumber ? (["slip"] as const) : []),
  ];
  const extra: CenteredFieldKey[] = [
    ...(settings.showProduct ? (["prod"] as const) : []),
    ...(settings.showStatus ? (["status"] as const) : []),
  ];
  const footerKeys: CenteredFieldKey[] = [
    ...(settings.showPickup ? (["pickup"] as const) : []),
    ...(settings.showDelivery ? (["deliver"] as const) : []),
  ];
  const hasFooter = footerKeys.length > 0;

  const columnRows = Math.max(left.length, right.length);
  const rowCount = columnRows + (extra.length > 0 ? 1 : 0);
  const midBottomPx = hasFooter ? FOOTER_RULE_PX : ARTBOARD_H_PX;
  const blockH = (rowCount - 1) * ROW_PITCH_PX + TEXT_H_PX;
  const midStartPx = bandBottomPx + (midBottomPx - bandBottomPx - blockH) / 2 - OPTICAL_SHIFT_PX;
  const rowTop = (i: number) => midStartPx + i * ROW_PITCH_PX;

  // A left-column row with nothing on its right (Pt, usually) may use the full width, so long names cut later.
  left.forEach((key, i) => add(key, COL_LEFT, rowTop(i), i < right.length ? COL_W : FULL_W));
  right.forEach((key, i) => add(key, COL_RIGHT, rowTop(i), COL_W));
  if (extra.length === 1) {
    add(extra[0], COL_LEFT, rowTop(columnRows), FULL_W);
  } else if (extra.length === 2) {
    add(extra[0], COL_LEFT, rowTop(columnRows), COL_W);
    add(extra[1], COL_RIGHT, rowTop(columnRows), COL_W);
  }

  // Bottom line: Pku stays left and Del right even when the other one is hidden.
  for (const key of footerKeys) {
    add(key, key === "pickup" ? COL_LEFT : COL_RIGHT, FOOTER_TOP_PX, COL_W);
  }

  return {
    qr,
    header,
    logoBox,
    nameCell,
    cells,
    rule: settings.showDividers && hasFooter ? { x: X(COL_LEFT), y: Y(FOOTER_RULE_PX), w: X(FULL_W) } : null,
  };
}

/** Largest size with the image's aspect ratio (width / height) that fits `box`, centred in it. */
export function fitLogoInBox(box: Box, aspect: number): Box {
  if (!(aspect > 0) || box.w <= 0 || box.h <= 0) return { x: box.x, y: box.y, w: 0, h: 0 };
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
