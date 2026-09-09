import {
  isOverlayExtractionByFlag,
  isTimExtractionByFlag,
  isTimExtractionRow,
  type ExtractionLike,
} from "./extractionHelpers";
import { getStatusBoxTeeth } from "./removableToothDisplay";

function isActiveExtractionRow(e: ExtractionLike): boolean {
  if (String(e.status ?? "Active").trim().toLowerCase() === "inactive") return false;
  if (e.name == null || e.code == null) return false;
  if (String(e.name).trim() === "" || String(e.code).trim() === "") return false;
  return true;
}

function isYes(value: unknown): boolean {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "yes";
}

/** Hard required: must be satisfied on its own (Required checked, Optional not). */
export function isHardRequiredExtraction(e: ExtractionLike): boolean {
  return isYes(e.is_required) && !isYes(e.is_optional);
}

/**
 * Required + Optional: OR-group members. At least one group member must meet
 * its own min/max; the rest may be empty.
 */
export function isOrGroupRequiredExtraction(e: ExtractionLike): boolean {
  return isYes(e.is_required) && isYes(e.is_optional);
}

/** Effective minimum for a required status — at least 1 when min is unset/0. */
export function effectiveRequiredMinTeeth(e: ExtractionLike): number {
  const min = e.min_teeth;
  if (typeof min === "number" && min > 0) return min;
  return 1;
}

export function extractionStatusMeetsMinMax(
  toothCount: number,
  e: ExtractionLike
): boolean {
  if (toothCount < effectiveRequiredMinTeeth(e)) return false;
  const max = e.max_teeth;
  if (typeof max === "number" && max > 0 && toothCount > max) return false;
  return true;
}

/**
 * Count teeth assigned to an extraction status for requirement checks.
 * Default-stamped (non-TIM) codes and TIM unmapped selected teeth both count.
 */
export function countTeethForExtractionStatus(
  extraction: ExtractionLike,
  opts: {
    selectedTeeth: number[];
    toothExtractionMap: Record<number, string>;
    claspTeeth?: number[];
  }
): number {
  const code = String(extraction.code ?? "").trim();
  if (!code) return 0;

  const claspTeeth = opts.claspTeeth ?? [];
  const isTim = isTimExtractionByFlag(extraction) || isTimExtractionRow(extraction);

  return getStatusBoxTeeth({
    selectedTeeth: opts.selectedTeeth,
    toothExtractionMap: opts.toothExtractionMap,
    claspTeeth,
    extractionCode: code,
    isDefault: isTim,
    isClasp: isOverlayExtractionByFlag(extraction),
  }).length;
}

export type ExtractionRequirementContext = {
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth?: number[];
};

/**
 * True when slip-create extraction rules are satisfied for Done / next fields:
 * - each Required-only status meets its min/max (default-stamped teeth count)
 * - if any Required+Optional exist, at least one of them meets its min/max
 * - when nothing is required, returns true (Done may show immediately)
 */
export function areExtractionRequirementsSatisfied(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null,
  ctx: ExtractionRequirementContext
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  if (active.length === 0) return true;

  const countFor = (e: ExtractionLike) =>
    countTeethForExtractionStatus(e, {
      selectedTeeth: ctx.selectedTeeth,
      toothExtractionMap: ctx.toothExtractionMap,
      claspTeeth: ctx.claspTeeth,
    });

  for (const e of active.filter(isHardRequiredExtraction)) {
    if (!extractionStatusMeetsMinMax(countFor(e), e)) return false;
  }

  const orGroup = active.filter(isOrGroupRequiredExtraction);
  if (orGroup.length > 0) {
    const anySatisfied = orGroup.some((e) =>
      extractionStatusMeetsMinMax(countFor(e), e)
    );
    if (!anySatisfied) return false;
  }

  return true;
}
