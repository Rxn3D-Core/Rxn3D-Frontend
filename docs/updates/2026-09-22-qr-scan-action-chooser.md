# QR scan action chooser

**Date:** 2026-09-22

## Behavior

After a paper-slip QR is identified and there is **no** active pickup/drop-off session, the app shows a small action screen. Scanning alone does **not** change location.

| Audience | Actions |
| --- | --- |
| Lab (`lab_admin`, `lab_user`) | View V-Slip + location action (Mark Ready to Pick Up / Pick Up / Drop Off) |
| Driver (`lab_driver`) | Pick Up / Drop Off only (no V-Slip) |
| Office (`office_*`, doctor roles) | Open Virtual Slip only |

### Active session

If `qr_scan_session_key` (or a persisted scan batch) already exists — i.e. the user already chose Pick Up / Drop Off — additional QR scans skip the chooser and use the existing `POST /slip/scan-qr` batch flow.

In the pickup modal, users can:

- Remove one scanned case (trash) via `POST /slip/remove-scanned-case`
- **Clear batch** to wipe the whole session

### Local session TTL (frontend)

`qr_scan_session_key` is not permanent. It expires after **30 minutes** of inactivity
(`DRIVER_QR_SESSION_TTL_MS`). Each successful scan / batch persist refreshes the timer.
Expired keys and `qr_scan_batch_data` are cleared automatically; the next scan shows the
action chooser again. (Server cache TTL remains 1 hour independently.)

### Location actions

Resolved from current slip location via `GET /slip/slip/{id}/details` (identify only):

- **In lab** → Mark Ready to Pick Up (`ready-to-send`)
- **Ready to pickup (office/lab)** → Pick Up
- **On route** → Drop Off

## Key files

- `lib/qr-scan-actions.ts` — audience + action list
- `lib/api/slip-qr-identify.ts` — details lookup without session
- `components/qr-scan-action-chooser.tsx` — UI
- `components/header.tsx` — in-app scanner
- `components/driver-qr-landing.tsx` — native-camera deep link
