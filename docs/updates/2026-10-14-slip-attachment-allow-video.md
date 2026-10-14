# Slip attachments: allow video uploads

## Summary

Frontend slip/case attachment upload now accepts the same video types the backend already allows: **mp4**, **mov**, **avi**.

## Changes

- `services/slip-attachments-service.ts` — added `mp4`, `mov`, `avi` to `SLIP_ATTACHMENT_ALLOWED_EXTENSIONS` (also updates `accept` / client validation)

## Notes

Backend `UploadAttachmentRequest` already listed these in `EXTRA_EXTENSIONS`. Videos map to the existing `other` attachment preview type.
