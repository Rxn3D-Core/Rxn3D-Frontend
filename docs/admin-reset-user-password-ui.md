# Admin reset user password (frontend)

**Date:** 2026-09-04  
**API:** `POST /v1/users/{id}/reset-password`  
**Client:** `lib/api/admin-reset-user-password.ts`

## UI flow

Password reset is **not** part of Create/Update User forms.

| Surface | Behavior |
|---------|----------|
| User listing actions | Lock icon opens **Set Password** modal |
| Create User | Password + confirm required (create only) |
| Update User | Profile fields only — no password, no permissions panel |

Shared modal: `components/office-administrator/reset-user-password-modal.tsx`

Wired on:

- `components/office-administrator/user-list-table.tsx` (lab users/admins, office users/admins, doctors)
- `app/lab-office-management/all-users/page.tsx`
- `app/lab-administrator/staff-management/page.tsx`
- `app/office-administrator/user-management/page.tsx`

## Lab / office create & edit (aligned with All Users)

Lab and office profile user listings no longer use a View (Eye) page or full-page `AddUserForm` / detail screens for add/edit.

| Surface | Create | Edit | Password |
|---------|--------|------|----------|
| Lab staff management | `CreateUserModal` | `UpdateUserModal` | Lock → `ResetUserPasswordModal` |
| Office user management | same | same | same |
| Role-scoped tables (`user-list-table`) | same | same | same |

Listing stays mounted; actions are Edit + Lock (+ Trash where applicable). View/detail navigation was removed from these flows.

## Permissions on create/update

The Permissions / `PermissionAssignmentPanel` block was removed from:

- `components/lab-administrator/add-user-form.tsx`
- `components/office-administrator/create-user-modal.tsx`
- `components/office-administrator/update-user-modal.tsx`

Role-based permissions remain managed elsewhere (e.g. User Permissions screens). Create/update no longer call `persistUserDirectPermissions`.

## Validation

Create/update forms use react-hook-form `mode: "onChange"` but **visual** error/valid borders only appear after a field is dirty (or has a resolver error). Empty required fields are not marked invalid on open.
