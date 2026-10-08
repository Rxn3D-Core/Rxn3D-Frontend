# Charge Management office select design (2026-10-02)

## Problem

The Office filter used `SearchableSelect` with the brand `outline` Button style (blue→purple gradient border + purple text). Next to plain Date / Status selects it looked broken, and long names truncated mid-word without ellipsis.

## Change

- `SearchableSelect` trigger now matches a normal `SelectTrigger` (neutral border, truncate label).
- Charge Management office control widened slightly (`240px`) and focus ring aligned with sibling filters.

## Files

- `components/ui/searchable-select.tsx`
- `app/billing/charge-management/page.tsx`
