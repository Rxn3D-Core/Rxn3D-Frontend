import assert from "node:assert/strict"
import test from "node:test"
import {
  OFFICE_LAB_COLUMN_MIGRATION_KEY,
  OFFICE_VISIBLE_COLUMNS_KEY,
  migrateOfficeLabColumn,
} from "./slip-listing-lab-column-migration.ts"

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  }
}

test("adds office (Lab) once to a column set saved before RXN-110", () => {
  const storage = fakeStorage({ [OFFICE_VISIBLE_COLUMNS_KEY]: JSON.stringify(["patient", "status"]) })
  migrateOfficeLabColumn(storage)
  assert.deepEqual(JSON.parse(storage.getItem(OFFICE_VISIBLE_COLUMNS_KEY)), ["patient", "status", "office"])
  assert.equal(storage.getItem(OFFICE_LAB_COLUMN_MIGRATION_KEY), "1")
})

test("a user who hides Lab after the migration keeps it hidden", () => {
  const storage = fakeStorage({ [OFFICE_VISIBLE_COLUMNS_KEY]: JSON.stringify(["patient"]) })
  migrateOfficeLabColumn(storage)
  storage.setItem(OFFICE_VISIBLE_COLUMNS_KEY, JSON.stringify(["patient"])) // user hides Lab
  migrateOfficeLabColumn(storage)
  assert.deepEqual(JSON.parse(storage.getItem(OFFICE_VISIBLE_COLUMNS_KEY)), ["patient"])
})

test("no saved set: only the flag is written (defaults already include Lab)", () => {
  const storage = fakeStorage()
  migrateOfficeLabColumn(storage)
  assert.equal(storage.getItem(OFFICE_VISIBLE_COLUMNS_KEY), null)
  assert.equal(storage.getItem(OFFICE_LAB_COLUMN_MIGRATION_KEY), "1")
})

test("saved set that already has office is left unchanged", () => {
  const saved = JSON.stringify(["office", "patient"])
  const storage = fakeStorage({ [OFFICE_VISIBLE_COLUMNS_KEY]: saved })
  migrateOfficeLabColumn(storage)
  assert.equal(storage.getItem(OFFICE_VISIBLE_COLUMNS_KEY), saved)
})

test("unreadable saved value is left alone and flag is set", () => {
  const storage = fakeStorage({ [OFFICE_VISIBLE_COLUMNS_KEY]: "{not json" })
  migrateOfficeLabColumn(storage)
  assert.equal(storage.getItem(OFFICE_VISIBLE_COLUMNS_KEY), "{not json")
  assert.equal(storage.getItem(OFFICE_LAB_COLUMN_MIGRATION_KEY), "1")
})
