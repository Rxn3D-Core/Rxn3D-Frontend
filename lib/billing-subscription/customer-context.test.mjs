import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveBillingCustomerId,
  resolveUsageCustomerId,
} from "./customer-context.ts";

function createStorage(values) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
  };
}

test("resolveBillingCustomerId prefers stored customer id", () => {
  const customerId = resolveBillingCustomerId(
    { customer_id: 12, customers: [{ id: 18 }] },
    createStorage({ customerId: "42" }),
  );

  assert.equal(customerId, 42);
});

test("resolveUsageCustomerId uses selected lab id for office admins", () => {
  const customerId = resolveUsageCustomerId(
    { customer_id: 12, customers: [{ id: 18 }] },
    createStorage({
      customerId: "12",
      selectedLabId: "88",
      role: "office_admin",
    }),
  );

  assert.equal(customerId, 88);
});

test("resolveUsageCustomerId uses selected lab id for doctors when roles are stored as JSON", () => {
  const customerId = resolveUsageCustomerId(
    { customer_id: 12, customers: [{ id: 18 }] },
    createStorage({
      customerId: "12",
      selectedLabId: "91",
      role: JSON.stringify(["doctor"]),
    }),
  );

  assert.equal(customerId, 91);
});

test("resolveUsageCustomerId falls back to billing customer id for lab admins", () => {
  const customerId = resolveUsageCustomerId(
    { customer_id: 12, customers: [{ id: 18 }] },
    createStorage({
      customerId: "12",
      selectedLabId: "91",
      role: "lab_admin",
    }),
  );

  assert.equal(customerId, 12);
});
