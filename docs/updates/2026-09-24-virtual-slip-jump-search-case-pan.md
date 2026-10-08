# Virtual slip jump search: slip / case / case pan

**Date:** 2026-09-24

The virtual slip toolbar "jump" box (`components/virtual-slip/VirtualSlipToolbarRow.tsx`)
now resolves slip, case, and case pan numbers, not just slip numbers. Resolution
lives in `lib/api/slip-lookup.ts` (`lookupSlipIdByNumber`).

## Behavior (lab users)

| Input | Search scope |
| --- | --- |
| Slip # / Case # | All statuses |
| Case pan # | In-Progress cases only |

Resolution runs in two phases against `GET /slip/listing/lab`:

1. `q=<input>&search_by=slip_number,case_number` — exact match on `slip_number`
   or `case.case_number` (no status filter → all statuses).
2. Fallback `q=<input>&search_by=casepan_number&status=In Progress` — exact match
   on `casepan.number`, restricted to In-Progress.

The first exact match's slip id wins; the box then navigates to that slip. The
virtual slip page self-corrects the URL case segment from the loaded slip, so a
cross-case jump lands on the right case.

## Office users

Unchanged: office listing (`GET /slip/listing/office`) has no case pan search, so
office roles keep the existing slip-number lookup.

## Input sanitizing

The input now allows `_` (underscore) in addition to alphanumerics and `-`, so
case pan numbers containing underscores are preserved.
