// RXN-110: the office listing now shows its "Lab" column (key "office") by
// default. Column sets saved before that never had it, so add it once to an
// existing saved set. The flag makes this run only once per browser, so a user
// who hides Lab afterwards keeps it hidden.
export const OFFICE_VISIBLE_COLUMNS_KEY = "rxn3d.slip-listing.office.visible-columns"
export const OFFICE_LAB_COLUMN_MIGRATION_KEY = "rxn3d.slip-listing.office.lab-column-default-v1"

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">

export function migrateOfficeLabColumn(storage: KeyValueStorage): void {
  if (storage.getItem(OFFICE_LAB_COLUMN_MIGRATION_KEY)) return

  const raw = storage.getItem(OFFICE_VISIBLE_COLUMNS_KEY)
  if (raw) {
    try {
      const saved: unknown = JSON.parse(raw)
      if (Array.isArray(saved) && !saved.includes("office")) {
        storage.setItem(OFFICE_VISIBLE_COLUMNS_KEY, JSON.stringify([...saved, "office"]))
      }
    } catch {
      // Unreadable value: leave it; the loader already falls back to defaults.
    }
  }

  storage.setItem(OFFICE_LAB_COLUMN_MIGRATION_KEY, "1")
}
