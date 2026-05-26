/** Layout and geometry ported from teethshade.html reference. */

export interface ShadeGuideDisplayShade {
  name: string;
  color_code_incisal?: string;
  color_code_body?: string;
  color_code_cervical?: string;
}

export const SHADE_LAYOUT = {
  viewBoxY: 0,
  viewBoxHeight: 180,
  firstSlotX: 31.28,
  slotSpacing: 28.53,
  stickWidth: 24.151,
  shadeOriginX: 544.641,
  baseViewBoxWidth: 600,
  baseLastSlotX: 544.64,
  holderLeft: 11.485,
  holderRightInset: 11.388,
  rackLeft: 0.413,
  rackBarWidthAtBase: 543.023,
  rackRightInset: 0.324,
  clipBWidthDelta: 1.39,
  clipAUWidthDelta: 0.741,
  hitAreaY: 29,
  hitAreaHeight: 110,
  labelY: 111,
  rackLineSpacing: 5.082,
} as const;

export const STICK_PATHS = {
  tooth:
    "M569.379 61.263c.165 4.65-2.984 8.52-6.903 8.465l-2.765-.037-5.987-.112-3.516-.055c-3.607-.056-6.427-3.723-6.134-8.002l1.282-18.948c.495-7.298 5.621-12.929 11.774-12.929 3.112 0 5.951 1.463 8.038 3.853s3.424 5.705 3.552 9.41l.641 18.355z",
  stick:
    "M568.792 101.94v121.397h-24.151V101.94c0-5.797 3.863-10.65 9.082-12.02V40l5.987.693v49.245c5.219 1.37 9.082 6.223 9.082 12.021z",
  neck: "M559.717 67.063v2.611l-5.987-.092v-2.52z",
  highlightF:
    "M563.982 63.526a2.77 2.77 0 0 0-.696 2.445c.293.167.677.148.988 0 .312-.148.586-.37.824-.593.477-.444 3.516-3.519 2.216-4.149-.458-.222-1.227.5-1.52.778-.586.519-1.263.964-1.812 1.52",
  highlightG:
    "M566.154 58.226c.623-.222.806-1.019.879-1.686.165-1.296.605-3.204.092-4.463-.293-.723-.787-1.112-1.099-.371-.274.63.147 1.926.183 2.593.037.463.184 3.816-.073 3.908z",
  highlightH:
    "M562.111 35.038c.22.334.458.741.86.778.33.037.641-.222.751-.537s.073-.667 0-.982a3.11 3.11 0 0 0-1.556-1.852c-.623-.296-1.868-.593-1.703.463.11.722 1.282 1.482 1.666 2.112z",
  rackLine: "M5.495 122.956H.413v29.481h5.082z",
} as const;

/** VITA Classical default when product shades are unavailable. */
export const CLASSICAL_FALLBACK_SHADES: ShadeGuideDisplayShade[] = [
  { name: "OM1", color_code_incisal: "#FAF8F5", color_code_body: "#F3EDE6", color_code_cervical: "#E8DFD4" },
  { name: "OM2", color_code_incisal: "#F8F4EF", color_code_body: "#F0E8DE", color_code_cervical: "#E4D9CC" },
  { name: "OM3", color_code_incisal: "#F6F0EA", color_code_body: "#EDE4D8", color_code_cervical: "#E0D4C4" },
  { name: "A1", color_code_incisal: "#F7F1EC", color_code_body: "#EFE6DA", color_code_cervical: "#E3D6C6" },
  { name: "A2", color_code_incisal: "#F6EFEB", color_code_body: "#EDE2CF", color_code_cervical: "#E2D3BD" },
  { name: "A3", color_code_incisal: "#F2E9E0", color_code_body: "#E8D9C8", color_code_cervical: "#DAC8B0" },
  { name: "A3.5", color_code_incisal: "#F0E6DC", color_code_body: "#E6D4C2", color_code_cervical: "#D8C4AA" },
  { name: "A4", color_code_incisal: "#EDE2D4", color_code_body: "#E2D0BE", color_code_cervical: "#D2BCA4" },
  { name: "B1", color_code_incisal: "#F5F0E8", color_code_body: "#EBE2D3", color_code_cervical: "#DDD0BC" },
  { name: "B2", color_code_incisal: "#F0E8DC", color_code_body: "#E4D6C4", color_code_cervical: "#D4C4AD" },
  { name: "B3", color_code_incisal: "#EDE4D6", color_code_body: "#E0D2BE", color_code_cervical: "#CEBEA6" },
  { name: "B4", color_code_incisal: "#EAE0D0", color_code_body: "#DCCCB4", color_code_cervical: "#CAB69E" },
  { name: "C1", color_code_incisal: "#EDE6DC", color_code_body: "#DFD4C4", color_code_cervical: "#CEC0AD" },
  { name: "C2", color_code_incisal: "#EAE2D6", color_code_body: "#DAD0BE", color_code_cervical: "#C8B8A4" },
  { name: "C3", color_code_incisal: "#E6DDD0", color_code_body: "#D6CAB6", color_code_cervical: "#C4B29C" },
  { name: "C4", color_code_incisal: "#E2D8CA", color_code_body: "#D0C4AE", color_code_cervical: "#BCAA92" },
  { name: "D2", color_code_incisal: "#E8DFD2", color_code_body: "#D9CBB8", color_code_cervical: "#C7B5A0" },
  { name: "D3", color_code_incisal: "#E4D8CA", color_code_body: "#D4C4AE", color_code_cervical: "#C0AA94" },
  { name: "D4", color_code_incisal: "#E2D6C6", color_code_body: "#D0C0AA", color_code_cervical: "#BBA892" },
];

export interface ShadeGuideLayout {
  total: number;
  lastSlotX: number;
  lastStickRight: number;
  viewBoxWidth: number;
  holderWidth: number;
  rackBarWidth: number;
  rackClipRight: number;
  centerX: number;
}

export function sanitizeStickId(name: string): string {
  return name.replace(/\./g, "-");
}

export function shadeStickDomId(name: string, index: number): string {
  return `stick-${sanitizeStickId(name)}-${index}`;
}

export function slotX(index: number): number {
  return SHADE_LAYOUT.firstSlotX + index * SHADE_LAYOUT.slotSpacing;
}

export function shadeTranslate(index: number): number {
  return slotX(index) - SHADE_LAYOUT.shadeOriginX;
}

export function getGuideLayout(shadeCount: number): ShadeGuideLayout {
  const total = Math.max(shadeCount, 1);
  const lastSlotX =
    total <= 1 ? SHADE_LAYOUT.firstSlotX : SHADE_LAYOUT.firstSlotX + (total - 1) * SHADE_LAYOUT.slotSpacing;
  const lastStickRight = lastSlotX + SHADE_LAYOUT.stickWidth;
  const viewBoxRightPadding =
    SHADE_LAYOUT.baseViewBoxWidth - (SHADE_LAYOUT.baseLastSlotX + SHADE_LAYOUT.stickWidth);
  const viewBoxWidth = Math.max(SHADE_LAYOUT.baseViewBoxWidth, lastStickRight + viewBoxRightPadding);

  return {
    total,
    lastSlotX,
    lastStickRight,
    viewBoxWidth,
    holderWidth: viewBoxWidth - SHADE_LAYOUT.holderLeft - SHADE_LAYOUT.holderRightInset,
    rackBarWidth:
      viewBoxWidth -
      SHADE_LAYOUT.rackLeft -
      (SHADE_LAYOUT.baseViewBoxWidth - SHADE_LAYOUT.rackLeft - SHADE_LAYOUT.rackBarWidthAtBase),
    rackClipRight: viewBoxWidth - SHADE_LAYOUT.rackRightInset,
    centerX: viewBoxWidth / 2,
  };
}

export function getRackLineCount(viewBoxWidth: number): number {
  const left = SHADE_LAYOUT.rackLeft;
  const right = viewBoxWidth - SHADE_LAYOUT.rackRightInset;
  const width = right - left;
  return Math.max(1, Math.ceil(width / SHADE_LAYOUT.rackLineSpacing + 1));
}

export function resolveShadeColors(shade: ShadeGuideDisplayShade): Required<
  Pick<ShadeGuideDisplayShade, "color_code_incisal" | "color_code_body" | "color_code_cervical">
> {
  const fallback = CLASSICAL_FALLBACK_SHADES.find((s) => s.name === shade.name);
  const body = shade.color_code_body ?? fallback?.color_code_body ?? "#EFE6DA";
  return {
    color_code_cervical: shade.color_code_cervical ?? fallback?.color_code_cervical ?? body,
    color_code_body: body,
    color_code_incisal: shade.color_code_incisal ?? fallback?.color_code_incisal ?? body,
  };
}
