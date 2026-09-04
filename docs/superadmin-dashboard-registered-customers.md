# Superadmin dashboard — registered practices & labs

## Purpose

The Super Admin dashboard **All Practices** and **All Labs** panels list **registered** office and lab customers. They no longer use the lab/office **connections** API (which returns `403` for superadmin and is scoped to partner connections, not the full registry).

## Frontend API helpers

Module: `lib/api/superadmin-customers.ts`

| Helper | Backend call | Used for |
|--------|--------------|----------|
| `searchSuperadminOfficeCustomers(options)` | `GET /customers/search?type=office&…` | All Practices (Connected tab) |
| `searchSuperadminLabCustomers(options)` | `GET /customers/search?type=lab&…` | All Labs (Connected tab), header lab switcher, billing tenant loaders |
| `searchSuperadminCustomers(type, options)` | Shared implementation for both | Prefer the typed wrappers above |
| `getSuperadminLabCustomerProfile(id)` | `GET /customers/{id}` | Profile / billing enrichment |

Default list options on the dashboard: `per_page=100`, `order_by=name`, `sort_by=asc`.

## UI behavior (`components/dashboard/superadmin-dashboard.tsx`)

1. On mount, load offices and labs **in parallel** via the two helpers above (`Promise.allSettled` so one failure does not blank the other panel).
2. Each panel has its own loading and error state (`isLoadingPractices` / `practicesError`, `isLoadingLabs` / `labsError`).
3. **Connected** tab: registered customers with `status === "Active"`.
4. **Request Sent** tab: still sourced from invitations (`useInvitation`), filtered by `Office` / `Lab`.
5. Connections context (`fetchConnections`) is **not** used on this dashboard.

## Backend

No new routes. Reuses existing public/authenticated customer search:

- Docs: backend `docs/CUSTOMER_API_DOCUMENTATION.md` → `GET /customers/search`
- `type` required: `Lab` | `Office` (lowercase accepted; normalized server-side)
