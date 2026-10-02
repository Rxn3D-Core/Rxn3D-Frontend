# Charge Management status filter default (2026-10-02)

## Change

- Default billing status filter is **Unbilled** (was **Any**).
- **Any** no longer hides billed rows client-side; it omits the status filter so all statuses (including billed) appear.
- List `GET /billing` now passes `status` the same way statistics already did, so Unbilled works on the standard list path.
- Clear-all advanced filters resets status to **Unbilled**.

## Why

Selecting **Any** previously still stripped billed items in the UI, which made the label misleading. Unbilled is the usual work queue, so it is the first-visit default.

## Files

- `app/billing/charge-management/page.tsx`
- `lib/charge-management-preferences.ts`
- `docs/billing-lab-charge-management-apis.md`

## Note

Existing per-lab prefs in `localStorage` are unchanged. Labs that already saved **Any** keep that selection (now correctly including billed). New visits / no saved prefs get **Unbilled**.
