# Permissions (frontend)

Canonical permission names and API contracts are defined in the **backend** repo. This frontend must use those names only — do not invent keys in sidebar or guards.

## Backend documentation (source of truth)

| Document | Path (WSL backend repo) |
|----------|-------------------------|
| Integration guide (start here) | `rxn3d_backend/docs/FRONTEND_PERMISSION_INTEGRATION_GUIDE.md` |
| UI ↔ API name mapping | `rxn3d_backend/docs/PERMISSION_FRONTEND_BACKEND_MAPPING.md` |
| Full permission catalog | `rxn3d_backend/docs/PERMISSIONS_SUMMARY.md` |
| User permissions API | `rxn3d_backend/docs/USER_PERMISSIONS_API_DOCUMENTATION.md` |

## Frontend implementation

| File | Role |
|------|------|
| `lib/permissions.ts` | `hasPermission`, `hasAnyPermission`, normalize API responses |
| `lib/menu-permissions.ts` | Sidebar menu filtering (`permission` arrays on `MenuItem`) |
| `lib/customer-scope.ts` | `appendCustomerIdQuery` for profile-scoped requests |
| `contexts/auth-context.tsx` | `profilePermissions`, refresh on login & profile switch |
| `config/sidebar-menu.tsx` | Menu items with backend `permission` keys; `getMenuForProfile(customerType)` |
| `lib/api/user-permissions-api.ts` | Catalog, per-user GET/PUT, `persistUserDirectPermissions()` |
| `lib/api/role-permissions-api.ts` | Superadmin `GET/PUT /role-permissions/roles` |
| `lib/role-utils.ts` | `normalizeRoleSlug`, `getActiveCustomerType`, lab/office context |
| `components/permission-route.tsx` | Layout/page guard via `hasAnyPermission` |
| `components/permission/permission-assignment-panel.tsx` | Grouped checkboxes; `variant="user"` \| `"role"` |
| `components/permission/user-permissions.tsx` | User list + direct permission editor |
| `components/permission/role-manager.tsx` | Role catalog; superadmin role bundle edit |

## Runtime flow

1. **Login** — read `customers[].permissions` for the active profile.
2. **Profile switch** — `POST /set-customer-id` then `GET /users/permissions?customer_id={id}`.
3. **UI** — `useAuth().hasPermission('view_case_details_status')` (superadmin bypass).
4. **API** — include `customer_id` on requests when the backend expects profile context.

## Common mappings (do not use left column in new code)

| Avoid (legacy) | Use (backend) |
|----------------|---------------|
| `view_slips`, `view_cases` | `view_case_details_status` |
| `create_slips` | `submit_new_case` |
| `edit_slips` | `edit_slip` |
| `delete_slips` | `soft_delete_case` |
| `view_connections` | `get_connections` |
| `manage_products` | `view_product`, `create_product`, … |
| `view_lab_schedule` | `view_business_setting` |
| `generate_reports` (statements) | `view_statements`, `create_statements` |
