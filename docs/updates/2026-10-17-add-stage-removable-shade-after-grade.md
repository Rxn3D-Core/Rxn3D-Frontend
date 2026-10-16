# Add-new-stage: removable fields stuck after grade (2026-10-17)

## Bug

On add-new-stage (and removable CDC), after selecting **Grade**, the next fields (teeth shade / gum shade / later steps) did not appear when the product had unrelated `advance_fields`.

## Cause

Removable card visibility uses `isF(step) = hasAdvanceField(step) && isFieldVisible(step)`.

`teeth_shade` / `gum_shade` stayed in `getSelectionFieldChain` (product `has_*` ≠ `"No"`), so they blocked progression. But `hasAdvanceField` only returned true when an advance-field **name** matched `"teeth"+"shade"` / `"gum"+"shade"`. Unrelated AFs hid the steps → UI stuck on Grade.

## Fix

Honor product `has_teeth_shade` / `has_gum_shade` the same way as the selection chain (`!== "No"`), and do not require AF name matches for removable shade steps.

Touched: `MandibularPanel`, `MaxillaryPanel`, `FixedRestorationFields`, `OpposingRemovableAccordion`.
