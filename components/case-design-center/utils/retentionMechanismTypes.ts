import type { RetentionOptionItem } from "@/components/retention-type-popover";
import type { RetentionChartType } from "./retentionChartImage.ts";
import { findRetentionOptionForChartType } from "./retentionChartImage.ts";

export type RetentionMechanismLink = {
  id?: number;
  name?: string;
  code?: string | null;
  status?: string | null;
};

function isActiveRetentionMechanism(item: RetentionMechanismLink): boolean {
  const status = (item.status || "Active").toString().trim();
  return status === "Active";
}

/** Names of retention types (e.g. Screwed, Cemented) linked to a retention option. */
export function getRetentionMechanismNamesFromOption(
  opt: RetentionOptionItem | null | undefined
): string[] {
  if (!opt) return [];

  const raw = (opt as RetentionOptionItem & { retentions?: RetentionMechanismLink[] })
    .retentions;

  if (!Array.isArray(raw) || raw.length === 0) return [];

  const names: string[] = [];
  for (const item of raw) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    if (!name || !isActiveRetentionMechanism(item)) continue;
    if (!names.includes(name)) names.push(name);
  }

  return names;
}

/** Union of mechanism type names for the given teeth based on chart retention options. */
export function getSuggestedRetentionMechanismTypes(
  product: { retention_options?: RetentionOptionItem[] } | null | undefined,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  toothNumbers: number[]
): string[] {
  const options = product?.retention_options;
  if (!options?.length || !toothNumbers.length) return [];

  const names: string[] = [];

  for (const toothNumber of toothNumbers) {
    const chartType = retentionTypesByTooth?.[toothNumber]?.[0];
    if (!chartType) continue;

    const opt = findRetentionOptionForChartType(options, chartType);
    for (const name of getRetentionMechanismNamesFromOption(opt)) {
      if (!names.includes(name)) names.push(name);
    }
  }

  return names;
}

export function serializeRetentionMechanismSelection(names: string[]): string {
  return names.filter(Boolean).join(", ");
}

export function parseRetentionMechanismSelection(value: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
