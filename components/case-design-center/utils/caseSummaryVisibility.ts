/**
 * True when every arch that has products assigned has passed full accordion
 * validation (required fields, impressions, removable tooth selection, etc.).
 */
export function computeSlipValidationComplete({
  hasMaxillaryProducts = false,
  hasMandibularProducts = false,
  maxillarySideReady = false,
  mandibularSideReady = false,
  hasToothStatusValidation = false,
}: {
  hasMaxillaryProducts?: boolean;
  hasMandibularProducts?: boolean;
  maxillarySideReady?: boolean;
  mandibularSideReady?: boolean;
  hasToothStatusValidation?: boolean;
}) {
  if (hasToothStatusValidation) return false;

  const hasAnyProduct = hasMaxillaryProducts || hasMandibularProducts;
  if (!hasAnyProduct) return false;

  if (hasMaxillaryProducts && !maxillarySideReady) return false;
  if (hasMandibularProducts && !mandibularSideReady) return false;

  return true;
}

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
