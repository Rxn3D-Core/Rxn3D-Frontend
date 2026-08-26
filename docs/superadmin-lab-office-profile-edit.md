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

## Save behavior

**Save Changes** always:

1. Validates all editable fields client-side before submit:
   - **Required (non-empty):** name, code, website, street address, city, postal code, country, state
   - Website is free text (max 255) — no URL format check
   - Lab `release_casepan` enum when set
2. Submits the **full** editable payload to the API — even when nothing was changed

Backend update uses `array_key_exists` so empty values converted to `null` by Laravel middleware still persist (website, address, city, postal_code, state_id, country_id, etc.). Frontend blocks empty required fields before that happens.

Lab `release_casepan` is only included when set.

## Editable fields

Uses existing Customer APIs:

- `PUT /api/v1/customers/{customer_id}`
  - `name`, `code`, `website`, `address`, `city`, `postal_code`, `state_id`, `country_id`
  - Labs only: `release_casepan` (`After Stage` | `After Product`)
- `POST /api/v1/customers/{customer_id}/logo`
  - multipart `logo` (PNG/JPG/JPEG/SVG, max 1MB)

Email / contact person fields remain read-only (owned by users / primary admin).

## Listing

Both `/lab-office-management/all-labs` and `/lab-office-management/all-offices` show the customer `logo_url` in the Name column (circular avatar). If no logo is set, colored initials fallback is used.

## Also updated

- Office profile overview (`/office-profile`) now supports the same field edit modal (parity with lab profile).
- Lab profile overview (`/lab-profile`) Save also validates and submits the full payload (same behavior).
