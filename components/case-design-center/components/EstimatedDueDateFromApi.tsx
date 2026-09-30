"use client";

import type { ProductApiData } from "../types";
import { findVariationByTeethCount } from "../utils/variationHelpers";
import { useProductEstimatedDueDate } from "../hooks/useProductEstimatedDueDate";

function countTeethFromDisplay(toothDisplay: string | undefined): number {
  if (!toothDisplay) return 0;
  const nums = toothDisplay.replace(/^#/, "").split(",").map((s) => s.trim()).filter(Boolean);
  return nums.length;
}

function resolveStageId(
  product: ProductApiData | null | undefined,
  stageName: string | null | undefined
): number | undefined {
  if (!product?.stages?.length || !stageName) return undefined;
  const stage = product.stages.find((s) => s.name === stageName);
  if (!stage) return undefined;
  const id = stage.stage_id > 0 ? stage.stage_id : stage.id;
  return id > 0 ? id : undefined;
}

/**
 * Shows the product delivery date from GET /slip/lab/{labId}/delivery-date
 * under the tooth selection line in accordion headers.
 */
export function EstimatedDueDateFromApi({
  product,
  stageName,
  toothDisplay,
}: {
  product?: ProductApiData | null;
  stageName?: string | null;
  toothDisplay?: string;
}) {
  const teethCount = countTeethFromDisplay(toothDisplay);
  const stageId = resolveStageId(product, stageName);
  const variationId =
    teethCount > 0
      ? findVariationByTeethCount(product?.variations, teethCount)?.id
      : undefined;

  const { displayDate, isLoading } = useProductEstimatedDueDate(
    product?.id,
    stageId,
    variationId
  );

  if (!product?.id) return null;

  if (isLoading) {
    return (
      <p className="w-full text-center text-[11px] sm:text-[12px] leading-snug text-[#9CA3AF]">
        Estimating due date…
      </p>
    );
  }

  if (!displayDate) return null;

  return (
    <p
      className="w-full text-center text-[11px] sm:text-[12px] leading-snug text-[#666666]"
      title="Calendar due date from the lab delivery-date API (pickup cutoff, working days, holidays)."
    >
      Estimated due date:{" "}
      <span className="font-semibold text-[#374151]">{displayDate}</span>
    </p>
  );
}
