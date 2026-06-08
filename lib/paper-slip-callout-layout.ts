export type PaperSlipCalloutSource = "extraction" | "missing" | "retention" | "product";

export function getPaperSlipCalloutVisual(source: PaperSlipCalloutSource): {
  icon: "missing" | "extraction" | null;
} {
  switch (source) {
    case "extraction":
      return { icon: "extraction" };
    case "missing":
      return { icon: "missing" };
    case "retention":
    case "product":
    default:
      return { icon: null };
  }
}

export function getPaperSlipCalloutLayout(source: PaperSlipCalloutSource): {
  hasIcon: boolean;
  wrapperClass: string;
  boxClass: string;
  iconClass: string;
  textClass: string;
  labelClass: string;
  teethClass: string;
} {
  const { icon } = getPaperSlipCalloutVisual(source);
  const hasIcon = icon != null;

  // Mirrors the /virtual-slip-v2 extraction pill: the tooth status image is
  // absolutely positioned so it overlaps the LEFT edge of the box (left:-20px,
  // vertically centered), and the box reserves left padding so the text clears
  // the icon. Tailwind port of that inline style.
  return {
    hasIcon,
    wrapperClass: hasIcon
      ? "relative inline-flex min-h-[50px] min-w-[148px] shrink-0 items-center justify-center overflow-visible rounded-[14px] border-2 border-[#D3D3D3] bg-white py-2 pl-[44px] pr-[14px] outline-none"
      : "flex min-h-[40px] items-center justify-center rounded-[8px] border border-[#e5e7eb] px-3 py-1.5",
    boxClass: "",
    iconClass: hasIcon
      ? "pointer-events-none absolute left-[-20px] top-1/2 z-10 h-[70px] w-[50px] -translate-y-1/2 object-contain drop-shadow-[5px_14px_13px_rgba(35,31,32,0.22)]"
      : "",
    textClass:
      "grid place-items-center gap-[2px] whitespace-nowrap [font-family:Verdana,Arial,sans-serif] font-normal text-[#666666]",
    labelClass: "text-[12px] leading-[1.15]",
    teethClass: "text-[12px] leading-[1.1]",
  };
}
