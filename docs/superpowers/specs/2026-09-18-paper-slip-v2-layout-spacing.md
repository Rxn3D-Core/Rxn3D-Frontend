# Paper Slip Print V2 — Layout Spacing Spec

Source of truth: Figma frame **PS - Partial one arch** (CSS export).

## Page

| Token | Value |
| --- | --- |
| Artboard | `628px × 890px` |
| Outer fill | `#1162A8` |
| Outer border | `1px solid #7F7F7F` |
| Top blue pad | `28px` (nudged down from Figma `15px` for breathing room) |
| Inner white | `628 × 875` (flex-grow) |
| Section gap | `5px` |

`@page size: auto; margin: 0;` for **full** (honors iOS paper picker: Letter or A4).  
`@page size: letter landscape; margin: 0;` for **half** (two slips side by side).

> **Print layout chooser:** Before print, the app asks **Full page** (portrait, 1 slip/sheet) or **Half page** (landscape, 2 slips/sheet — cut down the middle). See `docs/updates/2026-09-22-paper-slip-full-vs-half-print-layout.md`.
>
> **Full page fill:** The slip is scaled (`transform`) to the largest size that still fits one Letter sheet (`8.5×11in` clip). That removes the large bottom gap and tightens left/right. In Chrome, set **Margins → None** for edge-to-edge (browser “Default” margins add extra white).
>
> **Half page:** Each slip scales into a `5.5in × 8.5in` slot on landscape Letter.

## Brand lockup

| Element | Spec |
| --- | --- |
| Height | `20.48px` |
| Horizontal pad | `15px` |
| Logo | `21.29 × 11.76` |
| Lab name | Verdana 700 / `18px` / lh `20px` / ls `-0.02em` |
| Address | Verdana 400 / `12.6px` / lh `20px` / ls `-0.02em` |

## Header meta (two columns)

| Token | Value |
| --- | --- |
| Row gap | `4.18px` |
| Label↔value gap | `7.52px` |
| Label | Arial 700 / `11.7002px` / lh `12px` |
| Value | Arial 400 / `14.2073px` / lh `15px` |
| Left col width | `299.19px` |
| Right col width | `218.52px` |
| Column gap | `10px` |
| Block padding | `5px 0` |

Left: Code, Office, Dr, Patient, Gender  
Right: Case #, Slip #, Location, Pick up date, Due date

## Arch charts

| Token | Value |
| --- | --- |
| Row padding | `0 15px 15px` |
| Column gap | `20px` |
| Column width | `298px` (bumped from Figma `280.67` for readability) |
| Arch title | Inter 700 / `8.63608px` / lh `9px` / `#4C4D55` |
| Chart scale | `1.12`; gap under chart tightened (`margin-bottom: 4px`, negative pull `-6%`) |

Tooth chart **props/logic unchanged** — `VirtualSlipToothChart` stays dynamic.

## Product callout

| Token | Value |
| --- | --- |
| Width | full arch column (`~298px`) |
| Border | `1px #D3D3D3`, radius `4px` |
| Title / teeth | Inter 500/400 / `11.5px` / lh `12px` / `#666666` |

## Detail grid (non-implant)

| Token | Value |
| --- | --- |
| Width | `550.05px` |
| Columns | `176.02 × 3` (value right \| label center \| value left) |
| Font | Verdana / `12.0286px` / lh `22px` / ls `-0.02em` / `#4C4D55` |
| Label weight | 700; values 400 |
| Row height | `23px` |

## Notes

| Token | Value |
| --- | --- |
| Width | `570px` |
| Min height | `72px` |
| Rush fill | `#FFE3E3`, radius `7px`, pad `15px` |
| Body | Arial 400 / `12px` / lh `14px` / `#4C4D55` |

## Related / signature / footer

| Token | Value |
| --- | --- |
| Divider | `586px`, `#B3B3B3` |
| Related label | Inter 700 / `10px` |
| Chip | `76 × 21`, radius `10px`, Inter 600 / `8.5px` |
| Signature line | `206px`, label Inter 400 / `7px` |
| Contact | Inter 400 / `7px` |
| Case pan label | Inter 400 / `7px` |
| QR | `120.41 × 106.73` |
| Pan number | Inter 400 / `96px` / lh `116px` |

## Out of scope

- Driver / label sticker layouts (deferred)
- VirtualSlipToothChart prop API / selection logic

## HTML preview toggle

Set in frontend `.env` (restart Next after change):

```bash
NEXT_PUBLIC_PAPER_SLIP_V2_HTML_PREVIEW=true
```

When `true`, paper-slip v2 print actions render an on-screen HTML page (with Close) instead of the browser print dialog. Also applies to `/paper-slip/print-v2` (same as `?view=1` / `?preview=1`). Set `false` or remove to restore print.
