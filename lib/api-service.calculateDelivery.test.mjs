import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// Minimal browser globals so ProductApi can read localStorage and call fetch.
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
const requested = [];
globalThis.fetch = async (url) => {
  requested.push(String(url));
  return new Response(
    JSON.stringify({ success: true, data: { delivery_date: "2026-11-20" } }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

const { ProductApi } = await import("./api-service.ts");

describe("ProductApi.calculateDelivery lab id (RXN-54)", () => {
  beforeEach(() => {
    store.clear();
    requested.length = 0;
    store.set("customerType", "office");
    store.set("customerId", "77");
  });

  it("throws without a request when office user has no selectedLabId and no override", async () => {
    await assert.rejects(() => ProductApi.calculateDelivery(5), /Lab ID not found/);
    assert.equal(requested.length, 0);
  });

  it("uses the explicit lab id when selectedLabId is missing", async () => {
    const data = await ProductApi.calculateDelivery(5, undefined, undefined, undefined, 12);
    assert.equal(data.delivery_date, "2026-11-20");
    assert.equal(requested.length, 1);
    assert.match(requested[0], /\/slip\/lab\/12\/delivery-date\?product_id=5/);
  });

  it("explicit lab id wins over a stale selectedLabId", async () => {
    store.set("selectedLabId", "99");
    await ProductApi.calculateDelivery(5, 3, undefined, undefined, 12);
    assert.match(requested[0], /\/slip\/lab\/12\/delivery-date\?product_id=5&stage_id=3/);
  });

  it("falls back to selectedLabId when no override is given (existing callers)", async () => {
    store.set("selectedLabId", "99");
    await ProductApi.calculateDelivery(5, 3, 4);
    assert.match(requested[0], /\/slip\/lab\/99\/delivery-date\?product_id=5&stage_id=3&variation_id=4/);
  });

  it("lab profile falls back to its own customer id", async () => {
    store.set("customerType", "lab");
    await ProductApi.calculateDelivery(5);
    assert.match(requested[0], /\/slip\/lab\/77\/delivery-date/);
  });
});
