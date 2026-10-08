# Undo location step (lab admin)

## Summary

Lab admins can undo one location step from the **⋯** menu on lab case listing and from virtual slip **more actions**, with a confirmation dialog that lists side effects.

## Surfaces

- Lab case management row actions → ⋯ → **Undo location step**
- Virtual slip → expand more actions → **Undo location step**
- Role gate: `lab_admin` / `superadmin` only

## Depends on

Backend `POST /v1/slip/action/{slipId}/undo-location`
