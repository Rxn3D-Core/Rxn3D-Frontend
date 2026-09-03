# Super Admin Lab & Office Profile Edit

## Summary

Super admins can edit lab and office profile details (including logo) from Lab & Office Management. Office admins can self-edit the same fields from **Office Profile** (`/office-profile`).

## UI entry points

- `/lab-office-management/all-labs`
  - Pencil action on each row opens edit modal
  - Detail dialog (eye) includes **Edit Lab** and editable Lab Info pencil
- `/lab-office-management/all-offices`
  - Same pattern for offices
- `/office-profile` → Overview → pencil on **Office Info**
  - Uses the same shared edit modal
- `/office-profile` → Operating Hours
  - Uses the shared `OperatingHoursTab` (`lab-profile-operating-hours.tsx`) with `customerType="office"`
  - Persists via `POST /api/v1/business-settings` (`updateBusinessSettings`)
- `/office-profile` does **not** show an Activity Log tab (lab profile still does)

Shared component: `components/lab-office-management/edit-customer-profile-modal.tsx`

## Office profile edit reliability

Opening the edit modal loads the latest customer via `fetchCustomerProfile(id, { silent: true })` so the parent page does **not** flip `isProfileLoading` and unmount the modal. Silent fetches also **do not** call `setCustomerProfile` (form hydration only), which prevents a re-render loop when parents pass a new inline `customer` object each render.

The modal effect depends on `open` + `customer.id` (not the whole `customer` object) and cancels in-flight loads on cleanup.

Profile pages only show the full-tab loading state on the **initial** load (`isProfileLoading && !customerProfile`). Refetches after save keep the current tab mounted.

The overview display address is a formatted string; the modal receives the street-only `streetAddress` field separately.

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
- `POST /api/v1/business-settings` (office / lab hours)
  - `customer_id`, `customer_type`, `business_hours[]`

Email / contact person fields remain read-only (owned by users / primary admin).

## Listing

Both `/lab-office-management/all-labs` and `/lab-office-management/all-offices` show the customer `logo_url` in the Name column (circular avatar). If no logo is set, colored initials fallback is used.

## Also updated

- Office profile overview (`/office-profile`) supports the same field edit modal (parity with lab profile).
- Office operating hours are editable and saved (parity with lab profile hours).
- Lab profile overview (`/lab-profile`) Save also validates and submits the full payload (same behavior).
- Activity Log is hidden on office profile; it remains available on lab profile.
