/**
 * Case summary notes and center action icons appear only after every assigned
 * product on the slip has completed its required fields (including impressions).
 */
export function shouldShowCaseSummaryNotes({
  caseSubmitted = false,
  allProductsComplete = false,
}: {
  caseSubmitted?: boolean;
  allProductsComplete?: boolean;
}) {
  if (caseSubmitted) return true;
  return allProductsComplete;
}
