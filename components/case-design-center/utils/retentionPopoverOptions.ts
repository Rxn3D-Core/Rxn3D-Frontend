import { resolveRetentionOptionImageUrl } from "@/components/case-design-center/utils/retentionOptionImage";
import {
  resolveRetentionOptionChartTypeOrDefault,
  type RetentionChartType,
} from "@/components/case-design-center/utils/retentionOptionChartType";
import type { RetentionOptionItem } from "@/components/retention-type-popover";

export type RetentionPopoverOption = {
  id: number;
  toothChartType: RetentionChartType;
  name: string;
  imageUrl: string | null;
};

function getOptionName(opt: RetentionOptionItem): string {
  return opt.name || opt.retention_option?.name || opt.lab_retention_option?.name || "Unknown";
}

/**
 * Build the retention options shown in the tooth-chart popover for a tooth.
 * Shared by the popover UI and slip-creation auto-select (must stay in sync).
 */
export function buildRetentionPopoverOptions(
  retentionOptions: RetentionOptionItem[] | undefined,
  toothNumber: number,
  allowPontic: boolean,
): RetentionPopoverOption[] {
  if (!retentionOptions?.length) return [];

  const mapped = [...retentionOptions]
    .filter((opt) => (opt.status || "Active") === "Active")
    .map((opt) => ({
      id: opt.id,
      toothChartType: resolveRetentionOptionChartTypeOrDefault(opt),
      name: getOptionName(opt),
      imageUrl: resolveRetentionOptionImageUrl(opt, toothNumber),
      sequence: opt.sequence ?? Number.MAX_SAFE_INTEGER,
    }));

  const hasAbutmentOption = mapped.some((o) => o.toothChartType !== "Pontic");
  const visible =
    allowPontic || !hasAbutmentOption
      ? mapped
      : mapped.filter((o) => o.toothChartType !== "Pontic");

  const rank = (t: RetentionChartType) => (t === "Pontic" ? 1 : 0);
  return visible
    .sort((a, b) => rank(a.toothChartType) - rank(b.toothChartType) || a.sequence - b.sequence)
    .map(({ sequence: _sequence, ...opt }) => opt);
}
