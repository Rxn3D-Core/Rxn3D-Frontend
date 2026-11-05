import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const FILES = {
  en: "public/locales/en/translation.json",
  es: "public/locales/es/translation.json",
  de: "public/locales/de/common.json",
  fr: "public/locales/fr/common.json",
  zh: "public/locales/zh/common.json",
}

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]))

const load = (lang) => JSON.parse(fs.readFileSync(FILES[lang], "utf8")).offboarding

test("every language has the same offboarding keys as English, none empty", () => {
  const base = flatten(load("en")).sort()
  for (const lang of Object.keys(FILES)) {
    const ns = load(lang)
    assert.deepEqual(flatten(ns).sort(), base, `${lang} keys`)
    for (const key of flatten(ns)) {
      const value = key.split(".").reduce((o, p) => o[p], ns)
      assert.ok(String(value).trim().length > 0, `${lang}.${key} is empty`)
    }
  }
})

test("every offboarding key used in the dialog and helpers exists", () => {
  const source =
    fs.readFileSync("components/offboarding/offboard-member-dialog.tsx", "utf8") +
    fs.readFileSync("lib/offboarding/offboarding.ts", "utf8")
  const used = [...source.matchAll(/"offboarding\.([A-Za-z_.]+)"/g)].map((m) => m[1])
  const have = new Set(flatten(load("en")))
  assert.ok(used.length > 20)
  for (const key of used) assert.ok(have.has(key), `missing offboarding.${key}`)
})
