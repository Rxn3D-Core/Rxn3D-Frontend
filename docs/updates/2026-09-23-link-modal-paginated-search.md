# Link modal paginated search fix (2026-09-23)

## Problem

In Product Management link modals (Link Implant, Link Fields, Link Retention), product table search only filtered the **current page** of results. Pagination fetched a page from `/library/products` without `q`, then the UI applied a client-side filter on those rows.

Searching while on a later page (or after paging) also failed to reset to page 1, so matches on other pages never appeared.

## Fix

- Pass optional `q` on `fetchLibraryProductsPage` to `GET /library/products` (backend already supports `q` / `search` on name and code).
- Use server-returned rows for paginated product lists (no page-scoped client filter).
- Reset list page to `1` when the debounced search query changes (bulk / linked-entity product lists).
- Link Implant: implant jump / available-implant search also query the implants API with `q` instead of filtering a local first-100 catalog only.

## Bulk Link (Link Implant) — no pagination

Bulk Link loads the full implant and product catalogs (paginated API requests aggregated client-side, max 100 per request) and filters them with local search. Select-all applies to all currently visible (search-filtered) rows. Pagination controls were removed from this tab only; Browse / Link by Implant still paginate where needed.

## Affected UI

- `components/advance-mode/link-implant-modal.tsx`
- `components/advance-mode/link-product-modal.tsx`
- `components/product-management/link-retention-modal.tsx`
