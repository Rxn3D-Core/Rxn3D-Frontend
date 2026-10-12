import assert from "node:assert/strict"
import test from "node:test"

import {
  consumeSlipListingPage,
  getSlipListingProfileForPath,
  markSlipListingPageForRestore,
  normalizeSlipListingPage,
  resetSlipListingPage,
  SLIP_LISTING_RESET_PAGE_EVENT,
} from "./slip-listing-page.ts"

function installWindow(t) {
  const store = new Map()
  const listeners = new Map()
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    addEventListener: (type, handler) => {
      const list = listeners.get(type) ?? []
      list.push(handler)
      listeners.set(type, list)
    },
    removeEventListener: (type, handler) => {
      const list = listeners.get(type) ?? []
      listeners.set(
        type,
        list.filter((item) => item !== handler),
      )
    },
    dispatchEvent: (event) => {
      for (const handler of listeners.get(event.type) ?? []) handler(event)
      return true
    },
  }
  t.after(() => {
    delete globalThis.window
  })
  return { store, listeners }
}

test("normalizeSlipListingPage accepts positive integers only", () => {
  assert.equal(normalizeSlipListingPage(3), 3)
  assert.equal(normalizeSlipListingPage("3"), 3)
  assert.equal(normalizeSlipListingPage(1), 1)
  assert.equal(normalizeSlipListingPage(0), null)
  assert.equal(normalizeSlipListingPage(-2), null)
  assert.equal(normalizeSlipListingPage(1.5), null)
  assert.equal(normalizeSlipListingPage("nope"), null)
  assert.equal(normalizeSlipListingPage(null), null)
})

test("getSlipListingProfileForPath only matches listing roots", () => {
  assert.equal(getSlipListingProfileForPath("/lab-case-management"), "lab")
  assert.equal(getSlipListingProfileForPath("/lab-case-management/"), "lab")
  assert.equal(getSlipListingProfileForPath("/office-case-management/"), "office")
  assert.equal(getSlipListingProfileForPath("/lab-case-management/call-logs"), null)
  assert.equal(getSlipListingProfileForPath("/dashboard"), null)
})

test("opening a slip restores page; menu visits start at page 1", (t) => {
  installWindow(t)

  assert.equal(consumeSlipListingPage("lab"), 1)

  markSlipListingPageForRestore("lab", 3)
  assert.equal(consumeSlipListingPage("lab"), 3)
  // one-shot — next visit without marking is page 1
  assert.equal(consumeSlipListingPage("lab"), 1)

  markSlipListingPageForRestore("lab", 3)
  resetSlipListingPage("lab")
  assert.equal(consumeSlipListingPage("lab"), 1)
})

test("resetSlipListingPage notifies an open listing to jump to page 1", (t) => {
  installWindow(t)

  let resetProfile = null
  window.addEventListener(SLIP_LISTING_RESET_PAGE_EVENT, (event) => {
    resetProfile = event.detail.profile
  })

  resetSlipListingPage("office")
  assert.equal(resetProfile, "office")
})
