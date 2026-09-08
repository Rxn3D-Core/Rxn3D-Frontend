# Slip listing advanced filters (lab & office)

**Pages:** `/lab-case-management`, `/office-case-management`

## Hidden for now (still available in open/quick filters where applicable)

- Start date / end date
- Duplicate search text box in the advanced panel (main search bar remains)
- Status and location (quick filter pills / tabs stay)
- Duplicate “All Office & Lab” control (kept a single counterparty filter)

## Advanced panel filters

| Filter | Lab listing | Office listing |
| --- | --- | --- |
| Counterparty | Connected **offices** (`GET /v1/slip/connected-offices`), searchable; sends `office_code` | Connected **labs** (`GET /v1/slip/connected-labs`), searchable; client filter by lab name |
| Doctors | Searchable dropdown | Searchable dropdown |
| Products | Searchable catalog **product names** (Upper/Lower arch types removed); lab listing sends `product_name` | Searchable product names (client filter) |
| Stages | Stage **names** from listing rows | Same |
| Attachments only | Toggle | Toggle |

## Notes

- Product options exclude arch-type values `Upper` / `Lower`.
- Connected lists are merged with codes/names already seen on loaded slips so the selected value does not disappear after filtering.
