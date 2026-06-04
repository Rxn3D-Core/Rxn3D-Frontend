"use client";

const ICON_BASE = "/icons/virtual-slip-actions";

export type VirtualSlipActionIconName =
  | "edit-slip"
  | "printer"
  | "pick-up"
  | "drop-off"
  | "truck"
  | "phone"
  | "list"
  | "calendar"
  | "paper-airplane"
  | "send-to-lab"
  | "return-to-office"
  | "lightning-bolt"
  | "on-hold"
  | "cancel"
  | "ellipsis"
  | "add-stage";

interface VirtualSlipActionIconProps {
  name: VirtualSlipActionIconName;
  className?: string;
  /** When false, icon keeps source color (e.g. ellipsis on gray). */
  invert?: boolean;
}

const PNG_ICONS: Partial<
  Record<VirtualSlipActionIconName, { invert: boolean; size: number }>
> = {
  "drop-off": { invert: false, size: 47 },
};

export function VirtualSlipActionIcon({
  name,
  className = "h-[22px] w-auto max-w-[26px]",
  invert = true,
}: VirtualSlipActionIconProps) {
  const png = PNG_ICONS[name];
  const ext = png ? "png" : "svg";
  const shouldInvert = png ? png.invert : invert;
  const size = png?.size ?? 26;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyphs; Next/Image blocks local SVG without extra config
    <img
      src={`${ICON_BASE}/${name}.${ext}`}
      alt=""
      width={size}
      height={size}
      className={`${className} object-contain ${shouldInvert ? "brightness-0 invert" : ""}`}
      aria-hidden
    />
  );
}
