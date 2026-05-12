export function shouldShowCaseSummaryNotes({
  caseSubmitted = false,
  completedFixedAccordions = 0,
  completedRemovableAccordions = 0,
}: {
  caseSubmitted?: boolean;
  completedFixedAccordions?: number;
  completedRemovableAccordions?: number;
}) {
  if (caseSubmitted) return true;

  return completedFixedAccordions + completedRemovableAccordions > 0;
}
