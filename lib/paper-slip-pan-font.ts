/** Large Case Pan # face — serif so 1 / i / L stay distinct; zeros still use the slash. */
export const PAPER_SLIP_PAN_FONT_FAMILY =
  '"Libre Caslon Condensed", Georgia, "Times New Roman", Times, serif';

const FONT_PATH = "/fonts/LibreCaslonCondensed-latin-400.woff2";

/** Absolute @font-face so hidden print iframes (about:blank) can load the file. */
export function paperSlipPanFontFaceCss(): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const url = origin ? `${origin}${FONT_PATH}` : FONT_PATH;
  return `@font-face{font-family:"Libre Caslon Condensed";src:url("${url}") format("woff2");font-weight:400;font-style:normal;font-display:swap;}`;
}
