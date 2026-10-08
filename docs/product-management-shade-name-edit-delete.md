# Product management: edit / delete shade names

## Summary

In **Teeth Shade** and **Gum Shade** create/edit modals (`create-teeth-shade-modal.tsx`, `create-gum-shade-modal.tsx`), each row in **List of Shades** now supports:

1. **Edit shade name** — inline text input (previously read-only labels; only hex colors were editable)
2. **Delete shade** — trash action removes the row from the form

## Add shade button

Both teeth and gum shade modals show an **Add shade** button on the right of the **List of Shades** header. Clicking it opens the existing “Add new shade” panel **above** the shades table (toggle: **Hide form**). The form is no longer always visible under the table.


- **Product management**: Brand Color uses `ColorPicker` with a visible swatch + hex (not a white-covered outline button).
- **Slip / Case Design Center**: The teeth shade guide SVG bottom rack (the bar with the system name, e.g. "Vita Classical") uses `brand.brand_color` for the selected guide via `getBrandColorForSelectedGuide` → `ToothShadeSelectionSVG` `brandColor` prop. Label text contrast switches black/white automatically.

## Persist behavior

| Action | Create / Copy | Edit existing brand |
|--------|---------------|---------------------|
| Rename | Included in create payload | Sent on brand `PUT` nested `shades[].name` (matched by `shades[].id`) |
| Delete | Unlinks from the form only | Removed from `shades[]` on save; backend soft-deletes omitted shades |

Backend brand update (`PUT /library/teeth-shade-brands/{id}`, `PUT /library/gum-shade-brands/{id}`):

- Upserts nested shades by `id`
- Soft-deletes brand shades that are **not** present in the submitted `shades` array

## UI notes

- Edit mode lists shades from the form (brand shades), so rename/delete update the table immediately
- Create/copy still shows the catalog list; name input enables once a shade is linked (active)
- Save stays disabled if any shade name is blank or no shade is active
