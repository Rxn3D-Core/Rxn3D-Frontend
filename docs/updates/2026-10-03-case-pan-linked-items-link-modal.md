# Case pan linked items + link modal (2026-10-03)

## Problem

Case Pan Tracking showed **No linked items** even when subcategories were already configured with a case pan in Product Library. The list API only read lab assignment tables (`lab_library_*`), not `library_subcategories.case_pan_id`.

The Link Product modal did not match the implant library link UX.

## Fix

### Backend

- `CasePanResource.connected_items` now includes subcategory names from `library_subcategories.case_pan_id`, merged (deduped) with lab product / subcategory / stage assignments.
- `getAssignments` also returns those catalog subcategory links for each lab case pan.
- `setAssignments` keeps lab-owned `library_subcategories.case_pan_id` in sync when assigning/clearing subcategory links.

### Frontend — Link modal (implant-parity)

Same tab structure and chrome as **Link Implant**:

| Implant | Case Pan |
|---------|----------|
| Browse Linked → by Implant / by Product | Browse Linked → by Case Pan / by Category |
| Link by Product | Link by Category |
| Link by Implant | Link by Case Pan |
| Bulk Link | Bulk Link |

Shared UX details: expand/fullscreen, chip previews with `+`, numbered pagination, Cancel + Done / Apply link footer, available/linked split panes, jump search.

Note: a category has a single `case_pan_id`, so Link by Category / Bulk keep one case pan per category (last selected pan wins when multiple are chosen in bulk).

## Files

- `app/Http/Resources/Library/CasePanResource.php`
- `app/Repositories/LibraryCasePanRepository.php`
- `components/case-tracking/link-product-modal.tsx`
- `contexts/case-tracking-context.tsx`
- `docs/CUSTOMER_CASE_PAN_COLOR_CODE_API_DOCUMENTATION.md`
