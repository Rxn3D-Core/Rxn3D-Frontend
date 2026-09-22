# Paper slip listing — bulk print wrong slip

## Problem

From case listing, checkbox bulk “Print paper slip” printed the **wrong** slip.

## Cause

Handlers preferred `row.caseId` and passed it as `slip_ids`. The print API treats those as slip primary keys, so a different slip (or failure) was loaded.

## Fix

Always send selected rows’ **`slip.id`** as `slip_ids` (single + bulk) on:

- `app/lab-case-management/v2/page.tsx`
- `app/lab-case-management/page.tsx`
- `app/office-case-management/page.tsx`

Shared helper: `lib/paper-slip-listing-print-ids.ts`

## Verify

1. Select one listing row → print → that slip’s number/patient appear
2. Select multiple rows → print → those slips only, in selection order
