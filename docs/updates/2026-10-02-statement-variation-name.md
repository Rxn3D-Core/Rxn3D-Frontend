# Virtual statements show product variation name

## Change

Virtual statement Product cells now show `variation_name` under `product_name` (muted subtitle), matching Charge Management.

## Surfaces

- Generate Statements → Virtual Statement preview table
- Statement Preview page (desktop table + mobile cards)

## API dependency

Requires statement `billing_items[].variation_name` from the backend (snapshotted at generate; older statements may resolve from the linked product).
