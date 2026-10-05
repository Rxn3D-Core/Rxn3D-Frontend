# Add-stage: ask impressions after stage selection (2026-10-05)

## Change

When creating a new stage, the Impression field no longer pretends **"No Impression"** was already chosen. After the user confirms the stage, the impression modal opens and asks **New Impression** vs **No Impression**.

Submit stays blocked until that choice is made (cards for New, or explicit No Impression).

## Files

- `components/add-new-stage/useAddStageStagePrompt.ts` — stage → impression prompt sequence
- `components/case-design-center/components/CaseDesignCenter.tsx` — remove empty→No Impression fallback; require choice; suppress field auto-open during prompts
- `components/case-design-center/components/FixedRestorationFields.tsx` — respect auto-open suppression for impression modal
- `docs/superpowers/specs/2026-09-18-add-stage-impression-choice.md` — updated behavior
