# Office Doctor / Admin mixed role (`doctor_admin`)

**Date:** 2026-09-04

## Behavior (office profiles)

On office Admin and Doctor create/update:

| Starting role | Checkbox | Result role | Doctor fields |
|---------------|----------|-------------|----------------|
| Office Admin | **User is also a Doctor** | `doctor_admin` | License + signature required |
| Doctor | **User is also an Admin** | `doctor_admin` | License + signature required |
| Doctor Admin | Uncheck also Doctor | `office_admin` | Hidden |
| Doctor Admin | Uncheck also Admin | `doctor` | Kept |

Listings for `office_admin` and `doctor` already include `doctor_admin` users (backend role filter expands both).

## Create role picker (scoped by customer type)

| Active customer | Roles shown |
|-----------------|-------------|
| Office | Office Admin, Office User, Doctor |
| Lab | Lab Admin, Lab User |
| Superadmin All Users | Roles for the selected customer’s type only |

`doctor_admin` is not a picker option — it is created via the mix checkboxes.

## Edit role change

Only **lab_admin** (including a superadmin acting as lab admin) may change a user’s role on edit. Office editors keep the Doctor/Admin mix checkboxes only; they do not get a free role dropdown.

## Frontend

- `CreateUserModal` / `UpdateUserModal` — opposite-role checkboxes when `customerType === office`
- Role lists: `lib/user-customer-roles.ts` → `roleSelectOptionsForCustomerType()`
- Role resolution: `lib/user-role-labels.ts` → `resolveOfficeMixedRole()`
- User update always uses **`PUT /users/{id}`** with JSON. New signatures are sent as base64 data-URLs (not `POST` multipart — production returns **405** for `POST /users/{id}`).

## Backend

- `UserCreateRequest` allows `doctor_admin`; coerces `office_admin` + `is_doctor` → `doctor_admin`
- `UserUpdateRequest` accepts `is_doctor`, `license_number`, `signature` (file or base64 data-URL)
- `UserRepository::updateUser` updates role + doctor credentials
- `UserResource` returns `license_number` and `signature_url`
- Route: `PUT users/{id}` only
