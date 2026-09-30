# Fix swapped lab_id / office_id on slip create

**Date:** 2026-09-30

Lab-profile create-slip could store the selected **office** id in `cases.lab_id`
and the active **lab** id in `cases.office_id`. That produced 403s on slip
details (access checks `case.lab_id`) and wrong lab-scoped validation.

## Cause

The new-case wizard decides lab vs office from `customerType`
(`isLabCustomerContext()`). Payload builders used a strict
`localStorage.role === "lab_admin"` check instead.

When role was `lab_user`, `lab_driver`, a JSON role array, or otherwise not
exactly `lab_admin`, lab-context create took the office mapping:

- `lab_id` ← selected office (`completedLabId`)
- `office_id` ← active lab (`customerId`)

Backend stores those values as-is; it does not remap.

## Fix

`isLabSlipCreateContext()` in `lib/role-utils.ts`:

1. Prefer `customerType` (`lab` / `office`) — same as the wizard
2. Else treat any lab role slug (`lab_admin`, `lab_user`, `lab_driver`), including JSON role arrays in localStorage

Used by:

- `components/case-design-center/utils/caseSubmissionPayload.ts`
- `utils/slip-data-transformer.ts`

Status fields (`case_status`, slip `status`) are unchanged.
