# Add-stage impression choice (New / No Impression)

## Goal

When creating a **new stage** on an existing case, do **not** reuse the previous slip’s impressions. The impression modal must prompt:

- **New Impression** — select impression type(s) from the same model box (cards start unselected)
- **No Impression** — complete the impression step with no selections for this stage

This applies to every newly created stage slip.

## Behavior

1. `buildAddStagePreload` clears `selectedImpressions` and strips `impression` / `fixed_impression` from preloaded field completion so cards are not pre-checked.
2. `AddStageDesignContext.promptImpressionChoice` is set when entering the add-new-stage design center.
3. `ImpressionSelectionModal` (same impression model box) shows the New / No Impression choice above the arch grids.
4. Default: no choice selected, no impression cards selected.
5. Choosing a card implies **New Impression**. Choosing **No Impression** clears any picks, marks the step complete as `"No Impression"`, and closes the modal.
6. Dual-arch opposing grid keeps the full option list after a selection (does not collapse to the selected card only).
7. **Validation:** impressions are **optional** for add-stage submit readiness (`requireMaxillaryImpression` / `requireMandibularImpression` are off when `promptImpressionChoice` is set). The footer is not blocked by a missing impression.
8. **Empty display:** when nothing is selected on add-stage, the Impression field shows **"No Impression"** (green complete) instead of a blank red field.

## Key files

- `lib/add-stage/preload-state.ts` — clear prior impressions on preload
- `lib/add-stage/session.ts` — `promptImpressionChoice` flag
- `components/add-new-stage/AddNewStageFlow.tsx` — enables the flag
- `components/impression-selection-modal.tsx` — choice UI
- `components/case-design-center/components/ModalOrchestrator.tsx` — No Impression commit
- `components/case-design-center/components/CaseDesignCenter.tsx` — wires add-stage context

## Out of scope

- Edit-slip and first-time slip create keep existing impression preload / selection behavior.
- API payload shape is unchanged; empty `impressions` / opposite rows remain valid for No Impression.
