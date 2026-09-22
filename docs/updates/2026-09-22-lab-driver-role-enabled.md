# Lab Driver role re-enabled

**Date:** 2026-09-22

## Summary

`lab_driver` is selectable and recognized across invite, create-user, registration, login landing, and lab staff UI again.

## Changes

- Role pickers: invitation form, onboarding invite, add-user form, registration user form, all-users filter.
- Auth: `MULTI_LOCATION_ROLES`, post-login landing, `getPrimaryRole`, `PROFILE_SCOPED_ROLES`.
- Lab behavior: slip role helpers, connections, billing scope, dashboard widgets, header role label.
- Staff nav: **Lab Drivers** at `/lab-administrator/lab-drivers`.

No QR scan changes in this pass.
