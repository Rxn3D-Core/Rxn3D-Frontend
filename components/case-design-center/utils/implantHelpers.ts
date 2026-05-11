import type { ProductApiData } from "../types";

type RetentionOption = NonNullable<ProductApiData["retention_options"]>[number];

/** Returns true when any tooth in the group has a retention option with has_implant === "Yes". */
export function hasImplantRetention(
  toothNumbers: number[],
  retentionTypesMap: Record<number, string[]>,
  retentionOptions?: RetentionOption[]
): boolean {
  if (!retentionOptions?.length) return false;
  return toothNumbers.some((n) =>
    (retentionTypesMap[n] || []).some((type) => {
      const opt = retentionOptions.find(
        (o) =>
          o.name === type ||
          o.tooth_chart_type === type ||
          o.lab_retention_option?.name === type ||
          o.lab_retention_option?.tooth_chart_type === type
      );
      return opt?.has_implant === "Yes" || opt?.lab_retention_option?.has_implant === "Yes";
    })
  );
}
