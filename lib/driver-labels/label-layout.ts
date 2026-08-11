/**
 * Geometry for driver-label sticker printing.
 *
 * Two print targets are supported:
 *   - Sheet: a paper page (Letter/A4) filled with a fixed columns × rows grid of
 *     sticker cells, evenly centred on the page. Overflow spills onto more pages
 *     ("layers").
 *   - Roll: a continuous thermal/roll printer. Each sticker is its own page sized
 *     exactly to the label, fed back-to-back (Amazon-parcel style).
 *
 * Sheet sizes are named templates (matching common pre-cut label stock) so the
 * per-sheet count and 2-column arrangement match the physical die-cut sheet
 * rather than a generic best-fit guess. Custom sizes compute the grid from the
 * paper, with an optional columns override.
 */

export type MediaId = "letter" | "a4";

export interface PaperOption {
  id: MediaId;
  label: string;
  widthIn: number;
  heightIn: number;
}

export const PAPER_OPTIONS: PaperOption[] = [
  { id: "letter", label: 'Letter (8.5" × 11")', widthIn: 8.5, heightIn: 11 },
  { id: "a4", label: 'A4 (8.27" × 11.69")', widthIn: 8.27, heightIn: 11.69 },
];

export const CUSTOM_LABEL_ID = "custom";

/** A named sheet label stock: fixed columns × rows on its native paper. */
export interface SheetTemplate {
  id: string;
  /** Manufacturer/reference code, shown as a hint. */
  code?: string;
  widthIn: number;
  heightIn: number;
  cols: number;
  rows: number;
  /** Paper the count/arrangement was designed for. */
  paper: MediaId;
}

export const SHEET_TEMPLATES: SheetTemplate[] = [
  { id: "4x2.5", code: "PLS780", widthIn: 4, heightIn: 2.5, cols: 2, rows: 4, paper: "letter" },
  { id: "3.75x2", code: "PLS618", widthIn: 3.75, heightIn: 2, cols: 2, rows: 4, paper: "letter" },
  { id: "3.25x2.25", code: "PLS756", widthIn: 3.25, heightIn: 2.25, cols: 2, rows: 4, paper: "letter" },
  { id: "3.375x2.33", code: "PLS389", widthIn: 3.375, heightIn: 2.33, cols: 2, rows: 4, paper: "letter" },
  { id: "4x3", code: "PLS569", widthIn: 4, heightIn: 3, cols: 2, rows: 3, paper: "letter" },
  { id: "3x2", code: "PLS504", widthIn: 3, heightIn: 2, cols: 2, rows: 5, paper: "letter" },
  { id: "2.5x2.5", code: "PLS470", widthIn: 2.5, heightIn: 2.5, cols: 3, rows: 4, paper: "letter" },
  { id: "4x2", widthIn: 4, heightIn: 2, cols: 2, rows: 5, paper: "letter" },
];

/** Sizes offered for roll/thermal mode (per-label only; no grid). */
export const ROLL_SIZES: { id: string; widthIn: number; heightIn: number }[] = [
  { id: "4x6", widthIn: 4, heightIn: 6 },
  { id: "4x2.5", widthIn: 4, heightIn: 2.5 },
  { id: "4x2", widthIn: 4, heightIn: 2 },
  { id: "3x2", widthIn: 3, heightIn: 2 },
  { id: "2.25x1.25", widthIn: 2.25, heightIn: 1.25 },
];

export interface GridGeometry {
  cols: number;
  rows: number;
  cellsPerPage: number;
  labelWidthIn: number;
  labelHeightIn: number;
  pageWidthIn: number;
  pageHeightIn: number;
  /** Even gap between cells and page edge, per axis (inches). */
  gapXIn: number;
  gapYIn: number;
  isRoll: boolean;
}

export function getPaper(id: MediaId): PaperOption {
  return PAPER_OPTIONS.find((p) => p.id === id) ?? PAPER_OPTIONS[0];
}

export function getTemplate(id: string): SheetTemplate | undefined {
  return SHEET_TEMPLATES.find((t) => t.id === id);
}

export function formatSizeLabel(w: number, h: number): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
  return `${fmt(w)}" × ${fmt(h)}"`;
}

/** One label-sized page for roll/thermal output. */
export function rollGeometry(labelWidthIn: number, labelHeightIn: number): GridGeometry {
  return {
    cols: 1,
    rows: 1,
    cellsPerPage: 1,
    labelWidthIn,
    labelHeightIn,
    pageWidthIn: labelWidthIn,
    pageHeightIn: labelHeightIn,
    gapXIn: 0,
    gapYIn: 0,
    isRoll: true,
  };
}

/** A cols × rows grid of the given label, evenly centred on the paper. */
export function sheetGeometry(
  paper: PaperOption,
  labelWidthIn: number,
  labelHeightIn: number,
  cols: number,
  rows: number
): GridGeometry {
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);
  const gapXIn = (paper.widthIn - safeCols * labelWidthIn) / (safeCols + 1);
  const gapYIn = (paper.heightIn - safeRows * labelHeightIn) / (safeRows + 1);
  return {
    cols: safeCols,
    rows: safeRows,
    cellsPerPage: safeCols * safeRows,
    labelWidthIn,
    labelHeightIn,
    pageWidthIn: paper.widthIn,
    pageHeightIn: paper.heightIn,
    gapXIn,
    gapYIn,
    isRoll: false,
  };
}

const MIN_GAP_IN = 0.1;

/** Best-fit columns/rows for a custom size, with an optional forced column count. */
export function autoColsRows(
  paper: PaperOption,
  labelWidthIn: number,
  labelHeightIn: number,
  forcedCols?: number
): { cols: number; rows: number } {
  const fit = (avail: number, size: number) =>
    Math.max(1, Math.floor((avail + MIN_GAP_IN) / (size + MIN_GAP_IN)));
  return {
    cols: forcedCols && forcedCols > 0 ? forcedCols : fit(paper.widthIn, labelWidthIn),
    rows: fit(paper.heightIn, labelHeightIn),
  };
}

/** Top-left corner (inches) of a cell index within a page. */
export function cellOrigin(geo: GridGeometry, cellIndex: number): { x: number; y: number } {
  if (geo.isRoll) return { x: 0, y: 0 };
  const col = cellIndex % geo.cols;
  const row = Math.floor(cellIndex / geo.cols);
  return {
    x: geo.gapXIn + col * (geo.labelWidthIn + geo.gapXIn),
    y: geo.gapYIn + row * (geo.labelHeightIn + geo.gapYIn),
  };
}

/** Whether the chosen grid physically fits on the page (non-negative gaps). */
export function labelFitsPage(geo: GridGeometry): boolean {
  if (geo.labelWidthIn <= 0 || geo.labelHeightIn <= 0) return false;
  if (geo.isRoll) return true;
  return geo.gapXIn >= -0.001 && geo.gapYIn >= -0.001;
}
