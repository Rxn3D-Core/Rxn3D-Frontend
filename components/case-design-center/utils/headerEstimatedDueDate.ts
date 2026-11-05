/** What CaseDesignCenter reports through `onEstimatedDueDateChange`. */
export type EstimatedDueDateReport = {
  isoDate: string | null;
  displayDate: string | null;
  isLoading: boolean;
};

/** Stage-aware header date, tagged with the product it was reported for. */
export type StageAwareDueDate = {
  productId: number | null;
  displayDate: string | null;
};

/**
 * Folds a CaseDesignCenter report into the stored stage-aware date.
 * While a newly chosen stage's date is loading, keeps the previous date for the
 * same product so the header does not flicker; a different product starts empty.
 * Returns `prev` unchanged when nothing changed (no extra render).
 */
export function nextStageAwareDueDate(
  prev: StageAwareDueDate,
  report: EstimatedDueDateReport,
  productId: number | null
): StageAwareDueDate {
  const prevDate = prev.productId === productId ? prev.displayDate : null;
  const displayDate = report.displayDate || (report.isLoading ? prevDate : null);
  if (prev.productId === productId && prev.displayDate === displayDate) return prev;
  return { productId, displayDate };
}

/**
 * Header "Estimated delivery date": the stage-aware date when every product slot
 * has its stage (or has none), otherwise the product-only date. Hidden once submitted.
 */
export function pickHeaderDueDate(params: {
  caseSubmitted: boolean;
  stageAwareDate: string | null;
  productDate: string | null;
  productDateLoading: boolean;
}): { date: string | null; isLoading: boolean } {
  if (params.caseSubmitted) return { date: null, isLoading: false };
  if (params.stageAwareDate) return { date: params.stageAwareDate, isLoading: false };
  return { date: params.productDate, isLoading: params.productDateLoading };
}
