# Driver Label Sticker Layout

Source: Figma driver slips — **4" × 2.5"** (PLS780) and **3.75" × 2"** (PLS618), 8/sheet, roll compatible.

## Stock templates

Already in `lib/driver-labels/label-layout.ts`:

| id | Size | Code | Grid |
| --- | --- | --- | --- |
| `4x2.5` | 4 × 2.5 in | PLS780 | 2×4 on Letter |
| `3.75x2` | 3.75 × 2 in | PLS618 | 2×4 on Letter |

## Cell layout (PDF)

Drawn in `lib/driver-labels/generate-driver-label-pdf.ts` → `drawSticker`.

```
┌─────────────────────────────────────┐
│ LAB NAME                       [QR] │
│ PT Patient Name                     │
│ OFC OfficeCode                      │
│ DR Doctor Name                      │
├─────────────────────────────────────┤
│ CASE …          SLIP …              │
│ STAGE …         PAN …               │
│ PROD …                              │
│ STATUS …                            │
├─────────────────────────────────────┤
│ PICKUP MM/DD/YY   DELIVER MM/DD/YY · h:mm AM/PM │
└─────────────────────────────────────┘
```

### Field mapping

| Sticker | API field |
| --- | --- |
| Lab | `lab_name` (uppercased) |
| PT | `pt_name` |
| OFC | `office_code` |
| DR | `doctor_name` |
| CASE / SLIP | `case_number` / `slip_number` |
| STAGE / PAN | `stage_code` / `case_pan_number` |
| PROD | `product_name` |
| STATUS | `status` (location name, uppercased) |
| PICKUP | `pickup_date` → `MM/DD/YY` |
| DELIVER | `delivery_date` + `delivery_time` → `MM/DD/YY · h:mm AM/PM` |
| QR | `qr_code` |

### Typography (Figma CSS · Label art 4" × 2" @ 120px/in)

| Layer | Size | Weight | Color | Position (px) |
| --- | --- | --- | --- | --- |
| Lab name | 12 / lh 15 | 700 | `#17191F` | 14, 14 |
| Patient | 12 / lh 15 | 600 | `#17191F` | 14, 36 |
| Office / Doctor | 9.5 / lh 12 | 600 | `#555B66` | 14, 60 / 76 |
| CASE·SLIP | 9.5 / lh 12 | 600 | `#555B66` | 14 / 246, 106 |
| STAGE·PAN | 9.5 | 600 | `#555B66` | 14 / 246, 125.5 |
| PROD / STATUS | 9.5 | 600 | `#555B66` | 14, 145 / 164.5 |
| PICKUP / DELIVER | 9.5 | 600 | `#555B66` | 14 / 203.84, 202 |
| QR | 70×70 | — | — | 396, 14 |
| Rules | 1px | — | `#D3D7DE` | y 96, 192 |
| Border | 1px, r 8 | — | `#1B1D21` | artboard |

PDF maps Inter → Helvetica; weight 600/700 → bold (jsPDF has no semibold). Layout scales from 4×2 onto other stock sizes.

## Print settings

Gear control on **Print Driver Labels** opens **Driver label settings**:

| Group | Fields |
| --- | --- |
| Always shown (locked) | Lab, Patient, Office, Case #+Slip #, QR, Pickup+Delivery |
| Optional | Doctor, Stage, Pan #, Product, Status / location |
| Display | Compact abbreviations, Show dividers, Uppercase status |

Persisted in `localStorage` (`rxn3d.driver-label-print-settings.v1`) and passed into `generateDriverLabelPdf`.
