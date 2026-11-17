import test from "node:test";
import assert from "node:assert/strict";

import { findProductsUsingItem, productDetailUsesItem, toUsingProducts, PAGE_SIZE } from "./item-usage.ts";

const isFirstPage = (path) => /[?&]page=1(&|$)/.test(path);
const page = (rows, lastPage = 1) => ({ status: true, data: { data: rows, pagination: { last_page: lastPage } } });

test("toUsingProducts dedupes, keeps names and skips inactive links", () => {
  const rows = [
    { id: 1, name: "Crown" },
    { id: 1, name: "Crown again" },
    { id: 2, name: "Bridge", lab_impression_status: "Inactive", status: "Active" },
    { id: 3, name: "Denture", status: "Inactive" },
    { id: "4", name: "Night guard" },
    null,
  ];
  assert.deepEqual(toUsingProducts(rows), [
    { id: 1, name: "Crown" },
    { id: 4, name: "Night guard" },
  ]);
  assert.deepEqual(toUsingProducts(undefined), []);
});

test("productDetailUsesItem matches by brand / material id and ignores inactive links", () => {
  const detail = {
    teeth_shades: [{ id: 11, status: "Active", brand: { id: 5 } }],
    gum_shades: [{ id: 21, status: "Inactive", brand: { id: 7 } }],
    materials: [{ id: 31, material_id: 31, status: "Active" }],
  };
  assert.equal(productDetailUsesItem(detail, "teeth-shade", 5), true);
  assert.equal(productDetailUsesItem(detail, "teeth-shade", 6), false);
  assert.equal(productDetailUsesItem(detail, "gum-shade", 7), false, "inactive link on product");
  assert.equal(productDetailUsesItem(detail, "material", 31), true);
  assert.equal(productDetailUsesItem(detail, "material", 32), false);
  assert.equal(productDetailUsesItem(null, "material", 31), false);
});

test("impression: reads products from the impression detail", async () => {
  const calls = [];
  const fetchJson = async (path) => {
    calls.push(path);
    return { data: { id: 9, products: [{ id: 1, name: "Crown", lab_impression_status: "Active" }] } };
  };
  const result = await findProductsUsingItem({ type: "impression", itemId: 9, customerId: 42, fetchJson });
  assert.deepEqual(result, [{ id: 1, name: "Crown" }]);
  assert.deepEqual(calls, ["/library/impressions/9?customer_id=42"]);
});

test("retention-option: pages through with-products-categories and finds the option", async () => {
  const calls = [];
  const fetchJson = async (path) => {
    calls.push(path);
    if (isFirstPage(path)) return page([{ id: 1, products: [] }], 2);
    return page([{ id: 2, products: [{ id: 8, name: "Implant crown", status: "Active" }] }], 2);
  };
  const result = await findProductsUsingItem({ type: "retention-option", itemId: 2, customerId: 42, fetchJson });
  assert.deepEqual(result, [{ id: 8, name: "Implant crown" }]);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].startsWith(`/library/retention-options/with-products-categories?per_page=${PAGE_SIZE}&page=1`));
  assert.ok(calls.every((c) => c.endsWith("customer_id=42")));
});

test("material/shades: lists every product page and checks each detail", async () => {
  const details = {
    1: { materials: [{ material_id: 31, status: "Active" }] },
    2: { materials: [{ material_id: 99, status: "Active" }] },
    3: { materials: [{ material_id: 31, status: "Active" }], teeth_shades: [{ brand: { id: 5 }, status: "Active" }] },
  };
  const calls = [];
  const fetchJson = async (path) => {
    calls.push(path);
    if (path.startsWith("/library/products?")) {
      return isFirstPage(path) ? page([{ id: 1, name: "A" }, { id: 2, name: "B" }], 2) : page([{ id: 3, name: "C", status: "Inactive" }], 2);
    }
    const id = Number(path.match(/\/library\/products\/(\d+)/)[1]);
    return { data: details[id] };
  };
  const materials = await findProductsUsingItem({ type: "material", itemId: 31, customerId: null, fetchJson });
  assert.deepEqual(materials, [{ id: 1, name: "A" }, { id: 3, name: "C" }], "inactive products still count; second page is read");
  assert.equal(calls.filter((c) => c.startsWith("/library/products?")).length, 2);
  assert.ok(!calls.some((c) => c.includes("customer_id")), "no customer_id when none is known");

  const shades = await findProductsUsingItem({ type: "teeth-shade", itemId: 5, fetchJson });
  assert.deepEqual(shades, [{ id: 3, name: "C" }]);

  const unused = await findProductsUsingItem({ type: "gum-shade", itemId: 5, fetchJson });
  assert.deepEqual(unused, []);
});

test("a failed request rejects so the caller can fall back", async () => {
  const fetchJson = async () => {
    throw new Error("500");
  };
  await assert.rejects(findProductsUsingItem({ type: "material", itemId: 1, fetchJson }));
});
