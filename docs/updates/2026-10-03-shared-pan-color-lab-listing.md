# Shared pan color on lab case listing

## Summary

Lab users with an assigned HEX `pan_color` can click the pan badge to paint the entire listing row. The color is shared across the lab, stores who assigned it, and supports `override_pan_color` for replacing another user’s color.

Office listings do not show this control.

## Setup

1. Lab admin sets **Pan Color** on each lab user (Update User modal).
2. Optionally grant **Override Pan Color** (`override_pan_color`) via Permissions — on by default for lab admins.
3. User must re-login (or refresh session) after receiving a pan color so listing toggle unlocks.

## UX

| Situation | Result |
|-----------|--------|
| Empty row | Row uses current user’s color |
| Own color | Clears |
| Other user’s color, no override | Toast `Assigned to {Name}.` — no change |
| Other user’s color, has override | Replaces; toast `Reassigned: A → B` |

Desktop tooltips match the same copy (`… — click to override.` when permitted).
