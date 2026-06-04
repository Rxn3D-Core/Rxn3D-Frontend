import type { ImplantVM } from "@/lib/virtual-slip-view-model";

export type VirtualSlipImplantGroup = {
  id: string;
  toothNumbers: number[];
  retentionHeader: string;
  brand: string;
  platform: string;
  size: string;
  abutmentType: string;
  abutmentOption: string;
};

function implantDetailsKey(imp: ImplantVM): string {
  return JSON.stringify({
    brand: imp.brand,
    platform: imp.platform,
    size: imp.size,
    abutmentType: imp.abutmentType,
    abutmentOption: imp.abutmentOption,
    retentionMechanism: imp.retentionMechanism,
  });
}

/** Accordion title: Screwed or Cemented when recognizable; otherwise raw retention label. */
export function formatImplantRetentionHeader(retention: string): string {
  const normalized = (retention ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return "Implant";
  if (normalized.includes("screw")) return "Screwed";
  if (normalized.includes("cement")) return "Cemented";
  return retention.trim();
}

/** Accordion label: tooth numbers first, then retention (e.g. "#9, #10 Screwed"). */
export function formatImplantAccordionLabel(
  toothNumbers: number[],
  retentionHeader: string
): string {
  const teeth = formatImplantToothNumbers(toothNumbers);
  if (teeth) return `${teeth} ${retentionHeader}`;
  return retentionHeader;
}

/**
 * Group teeth with identical implant/abutment values into one accordion panel.
 */
export function groupVirtualSlipImplants(implants: ImplantVM[]): VirtualSlipImplantGroup[] {
  const byKey = new Map<string, ImplantVM[]>();

  for (const imp of implants) {
    const key = implantDetailsKey(imp);
    const list = byKey.get(key) ?? [];
    list.push(imp);
    byKey.set(key, list);
  }

  let index = 0;
  return Array.from(byKey.entries()).map(([, teeth]) => {
    const sorted = [...teeth].sort((a, b) => a.toothNumber - b.toothNumber);
    const sample = sorted[0];
    const toothNumbers = sorted
      .map((t) => t.toothNumber)
      .filter((n) => Number.isFinite(n) && n > 0);

    return {
      id: `implant-group-${index++}`,
      toothNumbers,
      retentionHeader: formatImplantRetentionHeader(sample.retentionMechanism),
      brand: sample.brand,
      platform: sample.platform,
      size: sample.size,
      abutmentType: sample.abutmentType,
      abutmentOption: sample.abutmentOption,
    };
  });
}

export function formatImplantToothNumbers(toothNumbers: number[]): string {
  if (toothNumbers.length === 0) return "";
  return toothNumbers.map((n) => `#${n}`).join(", ");
}
