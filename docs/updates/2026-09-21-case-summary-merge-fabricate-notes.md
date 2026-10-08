# Case summary notes: merge shared fabricate lines

## Summary

When Case Summary / stage notes generate multiple `Please fabricate …` lines that share the same stage and shade suffix, those lines are now collapsed into **one note**.

## Before

```
Please fabricate Premium Full Denture Acrylic for Finish, shade IPS Shade System A1.
Please fabricate Premium Acrylic Partial for #32 for Finish, shade IPS Shade System A1.
```

## After

```
Please fabricate Premium Full Denture Acrylic and Premium Acrylic Partial for #32 for Finish, shade IPS Shade System A1.
```

## Behavior

- Implemented in `mergeFabricateNotes` (`components/case-design-center/utils/caseNoteBuilder.ts`).
- `buildCaseSummaryText` merges across maxillary and mandibular when the shared suffix matches.
- Products with different stage/shade suffixes stay as separate lines.
- Tooth clauses (`for #32`) stay on the product phrase; only stage + shade are treated as the shared suffix.

## Tests

`components/case-design-center/utils/caseNoteBuilder.test.mjs` — `mergeFabricateNotes` / `buildCaseSummaryText` cases.
