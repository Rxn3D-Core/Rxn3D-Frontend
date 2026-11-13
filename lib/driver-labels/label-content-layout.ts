/**
 * Where each printed field goes on one sticker, in Figma artboard pixels (4" x 2" at 120 px/in).
 * Pure (no jsPDF) so it can be unit tested. Hidden fields are removed and the rest are packed:
 *   - lab name, patient and office always print (header band, with the QR code on the right when on);
 *   - a mid row holding one visible field uses the full width, not half of it;
 *   - the mid rows are centred between the rules, so a short list leaves no hole under the header;
 *   - with nothing below the header, the header band is centred on the label.
 * With every field on, the output equals the original Figma layout (rows at 106, 125.5, 145, 164.5,
 * rules at 96 and 192, footer at 202).
 */

import type { DriverLabelPrintSettings } from "./label-print-settings";

export const FRAME_H_PX = 240;
export const HEADER_BAND_PX = 96;
export const FOOTER_RULE_PX = 192;
export const FOOTER_TOP_PX = 202;
export const ROW_PITCH_PX = 19.5;
/** Rendered height of one 9.5 pt line, in artboard pixels. */
export const TEXT_H_PX = 16;
const OPTICAL_SHIFT_PX = 0.75;

export type MidFieldKey = "case" | "slip" | "stage" | "pan" | "prod" | "status";
export type FooterFieldKey = "pickup" | "deliver";

export interface LayoutCell<K extends string> {
  key: K;
  left: number;
  maxW: number;
}

export interface LayoutRow<K extends string> {
  top: number;
  cells: LayoutCell<K>[];
}

export interface StickerLayout {
  /** Added to every header y (centres the header when nothing is below it). */
  headerDy: number;
  showDoctor: boolean;
  showQr: boolean;
  /** Y of the divider lines, artboard px. */
  rules: number[];
  mid: LayoutRow<MidFieldKey>[];
  footer: LayoutRow<FooterFieldKey> | null;
}

const COL_LEFT = 14;
const COL_RIGHT = 246;
const COL_W = 220;
const FULL_W = 452;

function packRow<K extends string>(cells: K[], top: number): LayoutRow<K> | null {
  if (cells.length === 0) return null;
  if (cells.length === 1) return { top, cells: [{ key: cells[0], left: COL_LEFT, maxW: FULL_W }] };
  return {
    top,
    cells: [
      { key: cells[0], left: COL_LEFT, maxW: COL_W },
      { key: cells[1], left: COL_RIGHT, maxW: COL_W },
    ],
  };
}

export function planStickerLayout(settings: DriverLabelPrintSettings): StickerLayout {
  const groups: MidFieldKey[][] = [
    [
      ...(settings.showCaseNumber ? (["case"] as const) : []),
      ...(settings.showSlipNumber ? (["slip"] as const) : []),
    ],
    [
      ...(settings.showStage ? (["stage"] as const) : []),
      ...(settings.showPan ? (["pan"] as const) : []),
    ],
    settings.showProduct ? ["prod"] : [],
    settings.showStatus ? ["status"] : [],
  ];
  const midGroups = groups.filter((g) => g.length > 0);
  const footerKeys: FooterFieldKey[] = [
    ...(settings.showPickup ? (["pickup"] as const) : []),
    ...(settings.showDelivery ? (["deliver"] as const) : []),
  ];
  const hasMid = midGroups.length > 0;
  const hasFooter = footerKeys.length > 0;

  // Mid rows are centred in the space between the header rule and the footer rule (or the bottom edge).
  const midBottom = hasFooter ? FOOTER_RULE_PX : FRAME_H_PX;
  const blockH = (midGroups.length - 1) * ROW_PITCH_PX + TEXT_H_PX;
  const midStart = HEADER_BAND_PX + (midBottom - HEADER_BAND_PX - blockH) / 2 - OPTICAL_SHIFT_PX;
  const mid = midGroups
    .map((g, i) => packRow(g, midStart + i * ROW_PITCH_PX))
    .filter((r): r is LayoutRow<MidFieldKey> => r !== null);

  const footerTop = hasMid
    ? FOOTER_TOP_PX
    : HEADER_BAND_PX + (FRAME_H_PX - HEADER_BAND_PX - TEXT_H_PX) / 2 - OPTICAL_SHIFT_PX;
  const footer = hasFooter ? packRow(footerKeys, footerTop) : null;

  const rules: number[] = [];
  if (settings.showDividers) {
    if (hasMid || hasFooter) rules.push(HEADER_BAND_PX);
    if (hasMid && hasFooter) rules.push(FOOTER_RULE_PX);
  }

  return {
    headerDy: hasMid || hasFooter ? 0 : (FRAME_H_PX - HEADER_BAND_PX) / 2,
    showDoctor: settings.showDoctor,
    showQr: settings.showQrCode,
    rules,
    mid,
    footer,
  };
}
