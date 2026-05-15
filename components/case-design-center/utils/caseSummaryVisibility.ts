export function shouldShowCaseSummaryNotes({
  caseSubmitted = false,
  completedFixedAccordions = 0,
  completedRemovableAccordions = 0,
  hasAnyProducts = false,
}: {
  caseSubmitted?: boolean;
  completedFixedAccordions?: number;
  completedRemovableAccordions?: number;
  hasAnyProducts?: boolean;
}) {
  if (caseSubmitted) return true;
  if (hasAnyProducts) return true;

  return completedFixedAccordions + completedRemovableAccordions > 0;
}
