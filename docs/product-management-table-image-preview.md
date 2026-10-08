# Product management table image previews

Listing tables in Product Management now show a 32×32 thumbnail next to the primary name (or brand/type) on both Super Admin (`/global-product-library`) and Lab Admin (`/lab-product-library`) routes.

## Behavior

- Uses the list payload `image_url` already returned by library APIs. No extra fetch.
- Hovering a thumbnail opens a larger preview.
- Rows without an image show a placeholder icon so column alignment stays consistent.

Shared UI: `components/product-management/table-image-preview.tsx` (`TableNameWithImage`).

## Listings with previews

| Listing | Image source |
|---|---|
| Category / Sub Category | `image_url` |
| Products | `image_url` |
| Add-ons | `image_url` |
| Materials | `lab_material.image_url` or `image_url` |
| Grades / Stages / Impressions | `image_url` |
| Retention Option | `image_url` (lab also falls back to `sample_image_url`) |
| Tooth Mapping | `image_url` (lab also falls back to `sample_image_url`) |
| Advance Category / Sub Category / Fields | `image_url` |
| Implant Library | `image_url` |
| Abutment Library | `image_url` |

Advance, implant, and abutment product-library routes re-export the advance-mode pages, so those tables are covered there.

## Not shown

Add-on category/sub-category, retention type, shade guides, case pans, case tracking, and visibility manager do not store a catalog image on the list row.
