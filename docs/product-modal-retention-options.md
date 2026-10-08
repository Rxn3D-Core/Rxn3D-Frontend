# Product modal retention options

Linked retention options must be present on **every** product update payload, including saves from the Stages tab. Sending `retention_options: []` clears existing links on the server.

## Edit hydration

Product GET embeddings are full `RetentionOptionResource` rows (`id`, `name`, `code`). Hydration uses `library_retention_options.id` (`retention_option_id` or `id`). It does **not** use `lab_retention_option.id` (`lab_library_retention_options`, a different table).

Lab catalog rows can still use different IDs than the GET embedding. After the catalog loads, the modal remaps form rows onto catalog IDs by:

1. exact catalog id
2. `global_relationship_id`
3. name
4. code

That remap runs when the edit modal opens, not only when Tooth Chart Configurations is visited. Submit also remaps through the same catalog so a stages-only save keeps the selected options.
