# Ready to send: allow video proof media

## Summary

Ready-to-send proof upload now accepts **mp4**, **mov**, and **avi** in addition to images (when photo upload is enabled in slip settings).

## Changes

- Backend `ReadyToSendSlipRequest` — `image` mimes include video; max raised to 500MB
- Frontend `ImageDropzone` — optional `allowVideo` (used by ready-to-send modal only)
- Frontend `lib/image-to-base64.ts` — video allowlist + object-URL preview for large files

Driver pickup/drop-off photo upload remains image-only.
