# Super Admin Lab & Office Profile Edit

## Summary

Super admins can edit lab and office profile details (including logo) from Lab & Office Management.

## UI entry points

- `/lab-office-management/all-labs`
  - Pencil action on each row opens edit modal
  - Detail dialog (eye) includes **Edit Lab** and editable Lab Info pencil
- `/lab-office-management/all-offices`
  - Same pattern for offices

Shared component: `components/lab-office-management/edit-customer-profile-modal.tsx`

## Editable fields

Uses existing Customer APIs:

- `PUT /api/v1/customers/{customer_id}`
  - `name`, `code`, `website`, `address`, `city`, `postal_code`, `state_id`, `country_id`
  - Labs only: `release_casepan` (`After Stage` | `After Product`)
- `POST /api/v1/customers/{customer_id}/logo`
  - multipart `logo` (PNG/JPG/JPEG/SVG, max 1MB)

Email / contact person fields remain read-only (owned by users / primary admin).

## Also updated

- Office profile overview (`/office-profile`) now supports the same field edit modal (parity with lab profile).
