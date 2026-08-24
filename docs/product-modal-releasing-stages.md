# Product modal releasing stages

`stages[].is_releasing_stage` on create/update follows the **Releasing** checkboxes in the product modal (`releasingStageIds`).

Unchecked stages must send `"No"`. The previous save path kept `"Yes"` from product GET (`is_releasing_stage === "Yes"` on hydrated rows) even after the checkbox was cleared, so a later edit still posted Yes for every previously releasing stage.

Membership compares stage ids as strings so number/`"12"` mismatches do not leave a stale Yes in the payload.
