# Paper slip print — full vs half only on iPhone and iPad

## Behavior

- **iPhone and iPad** (including iPadOS desktop-site mode): print still asks **Full page** or **Half page**.
- **Mac, Android, Windows, and every other device:** no chooser. Print is always **full page** (portrait, one slip per sheet).

## Detection

`shouldOfferPaperSlipPrintLayoutChoice` in `lib/paper-slip-print-layout.ts`:

- User agent contains iPhone, iPad, or iPod, or
- `platform === "MacIntel"` and `maxTouchPoints > 1` (iPad requesting the desktop site).

A Mac reports `maxTouchPoints` 0, so Mac Safari does not see the dialog.

## Verify

1. iPhone or iPad → Print paper slip → Full / Half dialog.
2. Mac Safari, Android, and desktop Chrome → Print paper slip → print sheet opens as full page, no dialog.
