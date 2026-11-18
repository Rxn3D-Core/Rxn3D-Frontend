/**
 * RXN-90: a lab on product based invoicing charges the product/grade price once per arch, so the per-stage price
 * columns and the stage pricing helper are hidden in the product modal's Stages tab.
 *
 * Hiding is display only: stage prices stay in form state and are saved unchanged, so switching the lab back to
 * stage based invoicing shows them intact. While the setting is loading or failed to load, `invoicingMode` is
 * undefined and the stage-mode UI is shown.
 */
export function hidesStagePricing(invoicingMode: string | null | undefined): boolean {
  return invoicingMode === "product"
}

/**
 * Stage price and allocation % checks only make sense when the inputs are visible. Super-admins never see them;
 * product-mode labs do not either, so a hidden empty cell must not block saving.
 */
export function skipsStagePriceValidation(userRole: string | null | undefined, invoicingMode: string | null | undefined): boolean {
  return userRole === "superadmin" || hidesStagePricing(invoicingMode)
}
