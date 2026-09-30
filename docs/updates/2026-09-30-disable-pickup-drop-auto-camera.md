# Pickup / drop-off: disable auto-open camera

**Date:** 2026-09-30

When a proof photo was required on pickup or drop-off, the camera opened
automatically as soon as the modal showed a single slip without a photo. Drivers
now choose when to take or upload a photo.

## Behavior

- Camera / gallery available via **Take Photo** and **Upload Photo** (see
  `2026-09-30-pickup-drop-labeled-photo-buttons.md`).
- Opening the pickup or drop-off modal no longer triggers the file/camera picker.
- Photo required validation is unchanged.

## Files

| File | Change |
| --- | --- |
| `components/driver-history-modal.tsx` | Removed `autoOpenCameraSlipId` wiring |
| `components/driver-delivery/delivery-parts.tsx` | Removed `autoOpenCamera` from `ImageDropzone` and `RowImageUpload` |
