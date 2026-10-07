# Idle session timeout

**Date:** 2026-10-08

## Summary

Authenticated app pages sign the user out after **2 hours** of browser inactivity (mouse, keyboard, touch, scroll, click). Session storage is cleared and the browser goes to `/login?idle=1`.

## Behavior

- Mounted from `ClientLayout` via `IdleSessionWatcher` (authenticated routes only).
- Default timeout: 2 hours (120 minutes).
- Override with `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` (positive number of minutes).
- Calls `/auth/logout` when possible, then clears local session even if that call fails.
- Login page shows a short inactivity message when `idle=1` is present.

## Notes

- Public routes (login, register, privacy, etc.) do not run the watcher.
- JWT token lifetime on the API is separate; idle timeout is the client inactivity control.
