# Paper slip: slashed zero in case pan numbers

**Date:** 2026-09-30

Case pan numbers use digits and letters (`A01` … `AZZ`), so the digit `0` and the
letter `O` looked identical on printed slips. Every `0` in the case pan number
now prints with a diagonal stroke; the letter `O` is unchanged.

## Where it applies

| Renderer | File |
| --- | --- |
| v5 HTML slip (direct print + PDF) — header "Pan #" and large pan number | `lib/paper-slip-v5-html.ts` (`panHtml`), styles in `lib/paper-slip-v5-css.ts` (`.ps-zero`) |
| Paper slip print page — large pan number | `components/paper-slip-print/paper-slip-print-document.tsx` |
| Paper slip print v2 — large pan number | `components/paper-slip-print/paper-slip-print-v2-document.tsx` |

The React renderers share `components/paper-slip-print/slashed-zero-text.tsx`.

## Why a drawn stroke

The stroke is a real element over the glyph, not a font feature
(`font-variant-numeric: slashed-zero`). The print fonts fall back to Arial, which
has no slashed-zero glyph, and the PDF export (`html2canvas`) ignores font
features. A drawn stroke looks the same in every font and output path.

Only the case pan number changes; slip and case numbers print as before.
