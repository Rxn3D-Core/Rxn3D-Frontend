# Shared pan color on lab case listing

## Summary

Lab users with an assigned HEX `pan_color` can click the pan badge to paint the entire listing row. Override is a simple user flag: `can_override_pan_color`.

Office listings do not show this control.

## Setup

1. Open the lab user → **Update User**
2. Set **Pan Color** (HEX)
3. Optionally enable **Can Override Pan Color** (e.g. Belen only)
4. That user should re-login if they are currently signed in

## Example (all lab admins)

| User | Color | Can Override |
|------|-------|--------------|
| Heide | Blue | Off |
| Stella | Green | Off |
| Belen | Red | On |

- Heide empty row → blue  
- Stella on Heide’s row → “Assigned to Heide.”  
- Belen on Heide’s row → red + “Reassigned: Heide → Belen”  
- Belen again → cleared  
