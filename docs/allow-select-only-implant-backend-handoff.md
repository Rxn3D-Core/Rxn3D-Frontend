# Product: `allow_select_only_implant` — backend handoff

Frontend now sends this field on library product create/update. Backend needs to accept, persist, and return it.

## Field

| Key | Type | Values | Default |
|-----|------|--------|---------|
| `allow_select_only_implant` | string enum | `"Yes"` \| `"No"` | `"No"` |

## When it is set (product UI)

- Shown only when **Default tooth chart** is on **and** a linked retention option resolves to chart type **Implant**.
- Label: “Allow user to select only implant”.
- Cleared to `"No"` when the chart is off or the Implant option is unlinked.

## API

- **Create:** `POST /library/products` (and `?customer_id=` for lab)
- **Update:** `PUT /library/products/{id}`

Sent as a **top-level** product field (same level as `has_default_tooth_chart`), alongside:

```json
{
  "has_default_tooth_chart": "Yes",
  "allow_select_only_implant": "Yes",
  "default_tooth_chart": [ /* 32 tooth rows */ ]
}
```

Always included on save: `"Yes"` or `"No"` (never omitted).

## Backend checklist

1. Add DB column (or product_configurations key) for `allow_select_only_implant` (`Yes`/`No`, default `No`).
2. Allow in create/update validation (`in:Yes,No` or equivalent).
3. Persist on store/update.
4. Return on product show/list/detail so edit modal can hydrate the checkbox.
5. (Later / slip) Honor the flag so users may only select Implant when `"Yes"`.

## Frontend reference

- Payload mapper: `lib/product-default-tooth-chart.ts` → `applyDefaultToothChartToPayload`
- Form field: `ProductCreateForm.allow_select_only_implant` in `lib/schemas.ts`
