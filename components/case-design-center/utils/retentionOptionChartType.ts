import type { RetentionOptionItem } from "@/components/retention-type-popover";

export type RetentionChartType = "Implant" | "Prep" | "Pontic";

const EXACT_CHART_TYPE_ALIASES: Record<string, RetentionChartType> = {
  implant: "Implant",
  prepped: "Prep",
  prep: "Prep",
  pontic: "Pontic",
};

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalize a single raw label to a canonical chart type when possible. */
export function normalizeRetentionChartType(
  raw: string | null | undefined
): RetentionChartType | null {
  const value = nonEmptyString(raw);
  if (!value) return null;

  const exact = EXACT_CHART_TYPE_ALIASES[value.toLowerCase()];
  if (exact) return exact;

  const lower = value.toLowerCase();
  // Pontic before prep: some labels may contain both words in custom names.
  if (lower.includes("pontic")) return "Pontic";
  if (lower.includes("implant")) return "Implant";
  if (lower.includes("prep")) return "Prep";

  return null;
}

function getOptionHasImplant(opt: RetentionOptionItem): boolean {
  const raw =
    opt.has_implant ??
    opt.retention_option?.has_implant ??
    opt.lab_retention_option?.has_implant;
  return raw === "Yes";
}

function collectChartTypeCandidates(opt: RetentionOptionItem): string[] {
  return [
    opt.tooth_chart_type,
    opt.retention_option?.tooth_chart_type,
    opt.lab_retention_option?.tooth_chart_type,
    opt.selector_shape,
    opt.retention_option?.selector_shape,
    opt.lab_retention_option?.selector_shape,
    opt.name,
    opt.retention_option?.name,
    opt.lab_retention_option?.name,
  ].flatMap((value) => {
    const text = nonEmptyString(value);
    return text ? [text] : [];
  });
}

/**
 * Resolve which tooth-chart category a retention option represents.
 * Product catalog rows often only set `selector_shape` and `name` (not `tooth_chart_type`).
 */
export function resolveRetentionOptionChartType(
  opt: RetentionOptionItem,
  options?: { fallbackWhenUnknown?: RetentionChartType | null }
): RetentionChartType | null {
  for (const candidate of collectChartTypeCandidates(opt)) {
    const mapped = normalizeRetentionChartType(candidate);
    if (mapped) return mapped;
  }

  if (getOptionHasImplant(opt)) return "Implant";

  return options?.fallbackWhenUnknown ?? null;
}

/** Popover/chart helpers that must always bucket an active option. */
export function resolveRetentionOptionChartTypeOrDefault(
  opt: RetentionOptionItem
): RetentionChartType {
  return (
    resolveRetentionOptionChartType(opt) ??
    (getOptionHasImplant(opt) ? "Implant" : "Prep")
  );
}

export function retentionOptionMatchesChartType(
  opt: RetentionOptionItem,
  chartType: RetentionChartType
): boolean {
  return resolveRetentionOptionChartType(opt) === chartType;
}
