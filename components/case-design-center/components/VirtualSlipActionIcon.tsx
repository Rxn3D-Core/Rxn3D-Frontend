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
  | "add-stage"
  | "attachments"
  | "resume";

interface VirtualSlipActionIconProps {
  name: VirtualSlipActionIconName;
  className?: string;
}

/** Full-size pickup/dropoff artwork (replaces the FAB circle). */
const FULL_BLEED_ICONS: Partial<Record<VirtualSlipActionIconName, number>> = {
  "pick-up": 47,
  "drop-off": 47,
  resume: 47,
  "on-hold": 47,
};

const ICON_FILE: Partial<Record<VirtualSlipActionIconName, string>> = {
  "on-hold": "on-hold.png",
  "paper-airplane": "ready-to-send.png",
};

const ICON_BASE_OVERRIDE: Partial<Record<VirtualSlipActionIconName, string>> = {
  "paper-airplane": "/icons/slip-listing",
};

export function VirtualSlipActionIcon({
  name,
  className = "h-[22px] w-auto max-w-[26px]",
}: VirtualSlipActionIconProps) {
  const size = FULL_BLEED_ICONS[name] ?? 26;
  const file = ICON_FILE[name] ?? `${name}.svg`;
  const base = ICON_BASE_OVERRIDE[name] ?? ICON_BASE;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyphs; Next/Image blocks local SVG without extra config
    <img
      src={`${base}/${file}`}
      alt=""
      width={size}
      height={size}
      className={`${className} object-contain`}
      aria-hidden
    />
  );
}
