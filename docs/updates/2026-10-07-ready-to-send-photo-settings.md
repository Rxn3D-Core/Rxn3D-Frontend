# Ready to send: signature + proof photo from slip settings

**Date:** 2026-10-07

## Summary

Slip Settings → **Ready to send** now uses the same signature + photo controls as pickup/drop-off locations (without allow-multiple). The Ready to Send modal shows signature and/or photo upload based on those flags.

## UI

- Settings card: Signature required, Photo upload, Photo optional/required
- Ready to Send modal: `ImageDropzone` when photo enabled; `SignaturePad` when signature required

## Related backend

- `enable_photo_ready_to_send` / `require_photo_ready_to_send` on slip settings
- `POST /v1/slip/action/{slipId}/ready-to-send` accepts multipart `image`
