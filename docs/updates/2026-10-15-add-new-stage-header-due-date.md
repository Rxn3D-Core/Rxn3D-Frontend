# Add new stage: show estimated due date after both arches select a stage

**Date:** 2026-10-15

## Problem

On Add New Stage, the slip header never showed **Estimated delivery date** after
maxillary and mandibular stages were selected. Create-slip used a product-only
`useCaseEstimatedDueDate` path; add-new-stage did not re-run the lab
`delivery-date` API with `stage_id` once stages were chosen. Office users also
often lacked `selectedLabId` in localStorage (no lab picker on this flow), so
`ProductApi.calculateDelivery` could fail.

## Behavior

| Condition | Header |
| --- | --- |
| One or more arches still missing a stage | Due date hidden |
| Every active product slot has a stage | Calls `GET /v1/slip/lab/{labId}/delivery-date` per slot (with `stage_id` / variation when known); shows the **latest** calendar date |
| Loading | `Estimating delivery date…` |

Office profiles: source slip lab id is written to `selectedLabId` so the
delivery-date API resolves the correct lab.

## Files

| File | Change |
| --- | --- |
| `components/add-new-stage/AddNewStageFlow.tsx` | Seed lab id; wire header from CDC stage-aware callback |
| `components/case-design-center/components/CaseDesignCenter.tsx` | Report latest due date when all slots have stages |
| `components/case-design-center/hooks/useRushSlotDeliveryDates.ts` | Expose `isLoading` with dates map |
| `components/case-design-center/utils/rushModalContext.ts` | Prefer library `stage_id` for delivery-date / rush |
| `components/case-design-center/types.ts` | `onEstimatedDueDateChange` prop |
