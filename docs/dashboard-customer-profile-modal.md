# Dashboard lab / office profile modal

Searching a lab or office from a dashboard (or opening a connection profile) loads a read-only profile modal from `GET /customers/{id}`.

## Entry points

- Lab admin dashboard — search practices / labs
- Office admin dashboard — search labs
- Superadmin dashboard — search practices / labs
- Lab / office **All Connections** — view profile

Shared UI: `components/profile-modal.tsx`  
Shared mapper: `lib/api-profile.ts` (`fetchProfileData`, `mapCustomerApiToProfile`)

## Dynamic fields

The modal does **not** use hardcoded contact or hours. It maps:

| UI | API source |
|---|---|
| Name, logo, type, status, codes | customer record |
| Address / city / state / country / website / email | customer record |
| Contact person, phone, contact email, position | `default_admin` (fallback: first matching admin in `users[]`) |
| Business hours | `business_settings.business_hours` (`open_time` / `close_time` parsed as clock values, not `Date`) |
| Lab admins | `users[]` with role `lab_admin` |
| Office admins | `users[]` with role `office_admin` or `doctor_admin` |

Admin cards show **photo, name, and email only**. Doctors and other staff roles are not listed.

## Backend

See `docs/CUSTOMER_API_DOCUMENTATION.md` → `GET /customers/{id}` in the backend repo. `users[]` includes membership `status`, `is_primary`, `image`, `work_number`, and customer-scoped `role`.
