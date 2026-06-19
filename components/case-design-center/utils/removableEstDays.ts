import type { ProductApiData } from "../types";
import { shouldSkipStageSelection } from "./categoryHelpers.ts";

type ProductWithEstimatedDays = ProductApiData & { estimated_days?: number | null };

function formatWorkDaysAfterSubmission(days: number): string {
  return `${days} work day${days === 1 ? "" : "s"} after submission`;
}

/** Est-days label for removable accordions — uses stage days when staged, else product estimated_days. */
export function resolveRemovableEstDaysText(
  product: ProductApiData | null | undefined,
  stageDisplayName?: string | null
): string {
  const estimatedDays = (product as ProductWithEstimatedDays)?.estimated_days ?? 10;

  if (product && shouldSkipStageSelection(product)) {
    return formatWorkDaysAfterSubmission(estimatedDays);
  }

  const stageDays = stageDisplayName
    ? product?.stages?.find((s) => s.name === stageDisplayName)?.days_to_process
    : undefined;

  return formatWorkDaysAfterSubmission(stageDays ?? estimatedDays);
}
