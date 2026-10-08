# Paper slip: hide lab email and phone

**Date:** 2026-09-23

## Change

Paper slip print (v1 and v2) no longer shows lab email or lab phone under the doctor signature line.

## Files

- `components/paper-slip-print/paper-slip-print-v2-document.tsx` — removed footer contact line
- `components/paper-slip-print/paper-slip-print-document.tsx` — removed footer contact line
- `lib/paper-slip-print-v2-view-model.ts` — dropped `labPhone` / `labEmail` from print extras
- `lib/paper-slip-print-view-model.ts` — dropped `labPhone` / `labEmail` from footer VM
