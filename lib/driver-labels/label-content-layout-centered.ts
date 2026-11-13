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
  /** Font size in pt after scaling: the field name ("Ofc:"). The value after it is `valuePt`, larger. */
  fontPt: number;
  valuePt: number;
  /** Muted colour (body fields) versus ink (patient). */
  muted: boolean;
  /** `right`: the text ends at the right edge of the box (Case / Slip / Status column). */
  align: "left" | "right";
  /** Draw right after the real text end of this cell (Pan after Stage, Del after Pku), inside the box limits. */
  after?: CenteredFieldKey;
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

// Row spacing like the user's sample label: airy (35 px on the 240 px artboard), shrinking only when many rows must fit.
const ROW_PITCH_MAX_PX = 35;
const ROW_MARGIN_PX = 8;
const TEXT_H_PX = 16;
const OPTICAL_SHIFT_PX = 0.75;
const COL_LEFT = 14;
const COL_W = 220;
const FULL_W = 452;
const NAME_BOX_H_PX = 48;
const LOGO_H_PX = 44;
const BODY_PT = 9.5; // field names (Ofc:, Dr:, ...)
const VALUE_PT = 11; // the values after them (DOH, Shaun Nelson, ...), larger than the names
const NAME_PT = 11;

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
  const bodyH = (VALUE_PT * sFont * 0.9) / 72;

  // QR: same size rule as the classic design (fills the band above y=96, capped by the width scale).
  const qrTop = Y(8);
  const qrSize = Math.max(0, Math.min(Y(96) - Y(6) - qrTop, (82 / DPI) * sx * 1.25));
  const qrX = widthIn - X(12) - qrSize;
  const qr: Box | null = settings.showQrCode ? { x: qrX, y: qrTop, w: qrSize, h: qrSize } : null;

  const regionLeft = X(COL_LEFT);
  const regionRight = qr ? qrX - X(8) : widthIn - X(COL_LEFT);
  const regionW = Math.max(0, regionRight - regionLeft);
  const bandBottomPx = qr ? 96 : 84;

  // Stage and Pan are no longer on a line under the header: they sit in the right column with Case.
  const nameTopPx = (bandBottomPx - NAME_BOX_H_PX) / 2;
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
  const add = (
    key: CenteredFieldKey,
    leftPx: number,
    topPx: number,
    maxWPx: number,
    extra: { align?: "left" | "right"; after?: CenteredFieldKey } = {},
  ) => {
    const fontPt = BODY_PT * sFont;
    cells.push({
      key, x: X(leftPx), y: Y(topPx), w: X(maxWPx), h: bodyH, fontPt, valuePt: VALUE_PT * sFont, muted: false,
      align: extra.align ?? "left", after: extra.after,
    });
  };
  // Rows, each with a left and a right part (the user's priority order):
  //   Ofc | Dr      Pt | Stage      Slip | Case + Pan      [Prod | Status]      Pku | Del
  // A row with nothing visible is dropped, so hidden fields leave no gap; a row with only a right part keeps it right.
  const LEFT_W = 205; // left part width when the row also has a right part
  const RIGHT_X = COL_LEFT + LEFT_W + 10;
  const RIGHT_W = ARTBOARD_W_PX - 14 - RIGHT_X;
  type RowSpec = { left?: CenteredFieldKey; right: CenteredFieldKey[]; last?: boolean };
  const rows = ([
    { left: "ofc", right: settings.showDoctor ? ["dr"] : [] },
    { left: "pt", right: settings.showStage ? ["stage"] : [] },
    {
      left: settings.showSlipNumber ? "slip" : undefined,
      right: [...(settings.showCaseNumber ? (["case"] as const) : []), ...(settings.showPan ? (["pan"] as const) : [])],
    },
    { left: settings.showProduct ? "prod" : undefined, right: settings.showStatus ? ["status"] : [] },
    { left: settings.showPickup ? "pickup" : undefined, right: settings.showDelivery ? ["deliver"] : [], last: true },
  ] as RowSpec[]).filter((r) => r.left !== undefined || r.right.length > 0);
  const hasFooter = rows.some((r) => r.last);
  const totalRows = rows.length;
  const bodyRows = hasFooter ? totalRows - 1 : totalRows;

  // All rows are evenly spaced and centred in the band under the header; hidden fields leave no gap.
  const pitchPx =
    totalRows > 1
      ? Math.min(ROW_PITCH_MAX_PX, (ARTBOARD_H_PX - bandBottomPx - ROW_MARGIN_PX - TEXT_H_PX) / (totalRows - 1))
      : ROW_PITCH_MAX_PX;
  const blockH = (totalRows - 1) * pitchPx + TEXT_H_PX;
  const startPx = bandBottomPx + (ARTBOARD_H_PX - bandBottomPx - blockH) / 2 - OPTICAL_SHIFT_PX;
  const rowTop = (i: number) => startPx + i * pitchPx;

  rows.forEach((row, i) => {
    const top = rowTop(i);
    if (row.left) add(row.left, COL_LEFT, top, row.right.length > 0 ? LEFT_W : FULL_W);
    if (row.right.length === 2) {
      // Case first, Pan right after its text.
      const caseW = RIGHT_W * 0.62;
      add(row.right[0], RIGHT_X, top, caseW);
      add(row.right[1], RIGHT_X + caseW + 6, top, RIGHT_W - caseW - 6, { after: row.right[0] });
    } else if (row.right.length === 1) {
      add(row.right[0], RIGHT_X, top, RIGHT_W);
    }
  });

  return {
    qr,
    header,
    logoBox,
    nameCell,
    cells,
    // The optional divider sits between the details and the Pku / Del row.
    rule:
      settings.showDividers && hasFooter
        ? { x: X(COL_LEFT), y: Y(rowTop(bodyRows) - (pitchPx - TEXT_H_PX) / 2), w: X(FULL_W) }
        : null,
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

/** Like `fitLogoInBox` but left aligned and vertically centred (classic design header). Null when nothing fits. */
export function fitLogoLeft(box: Box, aspect: number): Box | null {
  const fit = fitLogoInBox(box, aspect);
  if (fit.w <= 0 || fit.h <= 0) return null;
  return { x: box.x, y: fit.y, w: fit.w, h: fit.h };
}
