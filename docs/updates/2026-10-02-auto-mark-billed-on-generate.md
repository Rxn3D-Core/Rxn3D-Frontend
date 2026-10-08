# Charge Management — Auto mark as billed

Confirm Statement Generation’s **Auto mark as billed** toggle now takes effect on statement generation (not only after email send). Backend `POST /v1/statements/generate` with `auto_mark_billed: true` sets included charges to `billed`.

Default Charge Management hides Billed rows, so successfully auto-marked charges leave the default Pending list after refresh.
