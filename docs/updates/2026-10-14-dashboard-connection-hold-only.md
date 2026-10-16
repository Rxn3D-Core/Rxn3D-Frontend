# Dashboard connection cards: hold only

## Summary

Connected practice/lab cards on lab and office dashboards keep a single action: **Hold / Resume**.

The same hold/resume also appears on **All Connections → Connected** as a Status dropdown (see `2026-10-14-all-connections-status-hold-dropdown.md`).

- **Hold** → `PUT /connections/{id}/hold` (status `OnHold`) so slip flows that require an Active lab↔office link stop
- **Resume** → `PUT /connections/{id}/resume`
- Disconnect and overflow (⋯) placeholders were removed
- User rows no longer show those decorative icons (hold applies to lab↔office links, not users)

## Files

- `components/dashboard/connection-hold-button.tsx`
- `lib/connection-api.ts` / `hooks/use-connections.ts` / `lib/connection-utils.ts`
- `components/dashboard/lab-admin-dashboard.tsx`
- `components/dashboard/office-admin-dashboard.tsx`
- `components/dashboard/superadmin-dashboard.tsx` (removed non-working icons; customers list is not lab_office rows)
