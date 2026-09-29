# Case listing: "View" eye icon

**Date:** 2026-09-30

Every case in the lab case listing now has an eye icon that opens the case's
virtual slip — the same destination as clicking the patient name. It is a plain
link, so Cmd/Ctrl-click opens the slip in a new tab.

## Where it appears

| Layout | Position |
| --- | --- |
| Mobile card list | Card header, just left of the ⋯ row-actions menu |
| Desktop table | Right edge of the "Patient / Slip" cell |

Both live in `app/lab-case-management/components/V3CaseTable.tsx` (`ViewEyeIcon`).

## Styling

The icon is a line icon stroked with the same blue → purple → pink gradient
(`#2AA6DE` → `#82298D` → `#C9539F`) as the active Filter / Columns toolbar icons,
and it is always shown in gradient.

Each icon defines its own gradient id. The mobile list and desktop table are both
rendered with one hidden via CSS, and a shared id could resolve to the gradient
inside the hidden layout, which makes the stroke disappear.

No backend changes.
