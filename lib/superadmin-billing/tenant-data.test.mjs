import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSuperadminBillingTenantRow,
  buildSuperadminBillingTenantDetail,
} from "./tenant-data.ts";

const baseCustomer = {
  id: 42,
  name: "Precision Dental Arts",
  unique_code: "LAB-0042",
  email: "lab@example.com",
  status: "Active",
  created_at: "2024-01-15T00:00:00.000Z",
};

const baseProfile = {
  id: 9,
  customer_id: 42,
  billing_plan_id: 2,
  status: "active",
  current_period_start: "2026-03-01T00:00:00.000Z",
  current_period_end: "2026-03-31T23:59:59.999Z",
  plan: {
    id: 2,
    name: "Professional",
    monthly_fee: 149,
    feature_limits: {
      slip_capacity: 300,
      included_storage_gb: 15,
      max_admin_seats: 1,
      max_user_seats: 5,
    },
  },
};

const baseUsage = {
  slip_count: 280,
  slip_capacity: 300,
  period_start: "2026-03-01T00:00:00.000Z",
  period_end: "2026-03-31T23:59:59.999Z",
};

test("buildSuperadminBillingTenantRow marks high usage tenants as warning", () => {
  const row = buildSuperadminBillingTenantRow({
    customer: baseCustomer,
    profile: baseProfile,
    usage: baseUsage,
    storageRecord: {
      id: 3,
      customer_id: 42,
      storage_gb: 12.4,
      storage_limit_gb: 15,
      status: "active",
    },
    customerProfile: {
      default_admin: {
        first_name: "Sarah",
        last_name: "Mitchell",
        email: "s.mitchell@precisiondental.com",
      },
    },
  });

  assert.equal(row.planName, "Professional");
  assert.equal(row.ownerName, "Sarah Mitchell");
  assert.equal(row.status, "Warning");
  assert.equal(row.slipUsageLabel, "280/300");
  assert.equal(row.storageUsageLabel, "12.4/15 GB");
});

test("buildSuperadminBillingTenantRow marks labs without billing profiles as not configured", () => {
  const row = buildSuperadminBillingTenantRow({
    customer: baseCustomer,
    profile: null,
    usage: null,
    storageRecord: null,
    customerProfile: null,
  });

  assert.equal(row.planName, "Not Configured");
  assert.equal(row.status, "Not Configured");
  assert.equal(row.slipUsageLabel, "—");
  assert.equal(row.storageUsageLabel, "—");
});

test("buildSuperadminBillingTenantDetail derives recent activity from invoices and add-ons", () => {
  const detail = buildSuperadminBillingTenantDetail({
    customer: baseCustomer,
    customerProfile: {
      default_admin: {
        first_name: "Sarah",
        last_name: "Mitchell",
        email: "s.mitchell@precisiondental.com",
      },
    },
    profile: baseProfile,
    usage: baseUsage,
    storageRecord: {
      id: 3,
      customer_id: 42,
      storage_gb: 12.4,
      storage_limit_gb: 15,
      status: "active",
    },
    invoices: [
      {
        id: 101,
        invoice_number: "INV-1042",
        amount_paid: 149,
        status: "paid",
        paid_at: "2026-03-01T08:30:00.000Z",
      },
    ],
    customerAddOns: [
      {
        id: 8,
        customer_id: 42,
        billing_add_on_id: 14,
        status: "active",
        add_on: {
          id: 14,
          name: "Priority Support",
          monthly_fee: 29,
        },
      },
    ],
  });

  assert.equal(detail.header.labName, "Precision Dental Arts");
  assert.equal(detail.header.labCode, "LAB-0042");
  assert.equal(detail.subscription.planName, "Professional");
  assert.equal(detail.subscription.nextInvoiceEstimate, "$149.00");
  assert.equal(detail.activity[0].kind, "invoice");
  assert.match(detail.activity[0].label, /Payment received/i);
  assert.match(detail.activity[1].label, /Priority Support/i);
});
