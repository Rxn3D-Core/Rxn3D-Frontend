# Pickup / drop-off: labeled photo buttons

**Date:** 2026-09-30

Proof photo controls now use clear labeled buttons with icons instead of
icon-only controls (and no longer auto-open the camera).

## Buttons

| Label | Icon | Action |
| --- | --- | --- |
| **Take Photo** | Camera | Opens device camera (`capture="environment"`) |
| **Upload Photo** | Upload | Opens gallery / file picker |
| **Clear Batch** | Trash | Clears the QR scan batch (unchanged action) |

Single-slip dropzone and multi-slip row upload both show these labels. After a
photo is attached, the same Take / Upload actions remain available to replace it,
plus Remove.

## Files

| File | Change |
| --- | --- |
| `components/driver-delivery/delivery-parts.tsx` | Labeled Take Photo / Upload Photo on `ImageDropzone` and `RowImageUpload` |
| `components/driver-history-modal.tsx` | Wider photo column; mobile card photo row; Clear Batch title case |
