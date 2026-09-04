# Superadmin All Users — customer & role display / linking

**Date:** 2026-09-04  
**Page:** `/lab-office-management/all-users`

## Problem

The listing showed **N/A** for Customer and Role because the UI mapped `customer_users`, while `UserResource` returns associations under **`customers`** (`id`, `name`, `type`, `role`, `departments`).

## Listing

- Helper: `lib/user-customer-roles.ts` — `extractUserCustomerRoleLinks()`, `buildUserCustomerRoleDisplay()`
- Display: first customer/role + `+N` when multiple (e.g. `HMC innoovs + 1`)
- Hover: tooltip lists every association as `Customer — Role`

## Create User (superadmin only)

`CreateUserModal` accepts `requireCustomerSelection` + `customerOptions` (wired from All Users only):

- Required searchable **Customer** picker
- Roles filtered by selected customer type (lab vs office)
- Lab departments load for the selected customer
- `customer_id` is sent from the picker (not localStorage)

Lab/office create pages omit these props and keep using the active customer.

## Update User (superadmin)

`UpdateUserModal` accepts `manageCustomerLinks` + `customerOptions`:

| Action | API |
|--------|-----|
| Link user to customer with role | `POST /customers/{customer_id}/users/{user_id}/role` |
| Change role on existing link | same POST (updates pivot) |
| Unlink | `DELETE /customers/{customer_id}/users/{user_id}/role` |

Role choices are filtered by customer type (lab vs office) via `rolesForCustomerType()`.

## Autofill

Create / edit / reset-password forms set `autoComplete="off"` on the form and `autoComplete="new-password"` / `off` on password and email inputs to reduce Chrome saved-password fill.
