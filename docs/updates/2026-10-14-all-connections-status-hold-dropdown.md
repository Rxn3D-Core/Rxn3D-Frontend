# All Connections: Status hold dropdown

## Change

On lab and office **All Connections → Connected**, the Status badge is a dropdown:

| Current status | Menu option | API |
|----------------|-------------|-----|
| Connected | Hold | `PUT /connections/{id}/hold` |
| On Hold | Resume | `PUT /connections/{id}/resume` |

Held partners stay on this list (and the dashboard) so they can be resumed, but they are excluded from create-slip partner pickers (`connected-offices` / `connected-labs`).

## Files

- `components/lab-administrator/connections/connections-table.tsx`
- `app/lab-administrator/all-connections/page.tsx`
- `app/office-administrator/all-connections/page.tsx`
