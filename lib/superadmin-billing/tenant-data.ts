export type SuperadminBillingStatus =
  | "Active"
  | "Warning"
  | "Limit Reached"
  | "Suspended"
  | "Not Configured";

type CustomerRecord = {
  id: number;
  name: string;
  unique_code?: string | null;
  email?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type CustomerProfileRecord = {
  default_admin?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  users?: Array<{
    role?: { name?: string | null } | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  }> | null;
};

type BillingPlanRecord = {
  id?: number;
  name?: string | null;
  monthly_fee?: number | string | null;
  feature_limits?: {
    slip_capacity?: number | null;
    included_storage_gb?: number | null;
    max_admin_seats?: number | null;
    max_user_seats?: number | null;
  } | null;
  pricing?: {
    currency?: string | null;
    prices?: Array<{
      frequency?: string | null;
      price?: number | string | null;
      is_default?: boolean | null;
    }> | null;
  } | null;
};

type BillingProfileRecord = {
  id: number;
  customer_id: number;
  billing_plan_id?: number | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
  usage_count?: number | null;
  plan?: BillingPlanRecord | null;
};

type BillingUsageRecord = {
  slip_count?: number | null;
  slip_capacity?: number | null;
  remaining_slips?: number | null;
  period_start?: string | null;
  period_end?: string | null;
};

type StorageRecord = {
  id: number;
  customer_id: number;
  storage_gb?: number | string | null;
  storage_limit_gb?: number | string | null;
  status?: string | null;
  current_period_end?: string | null;
};

type SubscriptionInvoiceRecord = {
  id: number;
  invoice_number?: string | null;
  amount?: number | string | null;
  amount_due?: number | string | null;
  amount_paid?: number | string | null;
  total_amount?: number | string | null;
  subtotal?: number | string | null;
  currency?: string | null;
  status?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  due_date?: string | null;
};

type CatalogAddOnRecord = {
  id: number;
  name?: string | null;
  description?: string | null;
  monthly_fee?: number | string | null;
  active?: boolean | null;
};

type CustomerAddOnRecord = {
  id: number;
  customer_id: number;
  billing_add_on_id: number;
  status?: string | null;
  add_on?: CatalogAddOnRecord | null;
};

export type SuperadminBillingTenantRow = {
  customerId: number;
  labName: string;
  labCode: string;
  ownerName: string;
  ownerEmail: string;
  tenantType: "Dental Lab";
  planName: string;
  status: SuperadminBillingStatus;
  statusTone: "success" | "warning" | "danger" | "muted";
  slipUsagePercent: number | null;
  slipUsageLabel: string;
  storageUsagePercent: number | null;
  storageUsageLabel: string;
  memberSinceLabel: string;
  nextRenewalLabel: string;
};

export type SuperadminBillingActivityItem = {
  kind: "invoice" | "add-on" | "profile";
  label: string;
  timestamp: string | null;
};

export type SuperadminBillingTenantDetail = {
  header: {
    customerId: number;
    labName: string;
    labCode: string;
    ownerName: string;
    ownerEmail: string;
    status: SuperadminBillingStatus;
    memberSinceLabel: string;
  };
  subscription: {
    profileId: number | null;
    planId: number | null;
    planName: string;
    monthlyFee: number;
    monthlyFeeLabel: string;
    nextRenewalLabel: string;
    nextInvoiceEstimate: string;
    autoRenewLabel: string;
    seatUsageLabel: string;
  };
  usage: {
    slipUsed: number;
    slipCapacity: number | null;
    slipUsagePercent: number | null;
    slipUsageLabel: string;
    storageUsedGb: number | null;
    storageLimitGb: number | null;
    storageUsagePercent: number | null;
    storageUsageLabel: string;
    billingPeriodStart: string | null;
    billingPeriodEnd: string | null;
  };
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    amountLabel: string;
    statusLabel: string;
    dateLabel: string;
    downloadUrl: string | null;
  }>;
  addOns: Array<{
    id: number;
    customerAddOnId: number | null;
    name: string;
    description: string;
    monthlyFee: number;
    monthlyFeeLabel: string;
    status: "Active" | "Available" | "Cancelled";
    active: boolean;
  }>;
  activity: SuperadminBillingActivityItem[];
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value: number | null, currency = "USD"): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsageValue(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clampPercent(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function getPlanName(profile?: BillingProfileRecord | null): string {
  return profile?.plan?.name?.trim() || "Not Configured";
}

function getPlanMonthlyFee(plan?: BillingPlanRecord | null): number {
  const prices = plan?.pricing?.prices ?? [];
  const defaultPrice =
    prices.find((entry) => entry?.is_default) ||
    prices.find((entry) => entry?.frequency === "monthly") ||
    prices[0];

  return toNumber(defaultPrice?.price) ?? toNumber(plan?.monthly_fee) ?? 0;
}

function getSlipCapacity(profile?: BillingProfileRecord | null, usage?: BillingUsageRecord | null): number | null {
  return (
    toNumber(usage?.slip_capacity) ??
    toNumber(profile?.plan?.feature_limits?.slip_capacity) ??
    null
  );
}

function getStorageLimit(profile?: BillingProfileRecord | null, storageRecord?: StorageRecord | null): number | null {
  return (
    toNumber(storageRecord?.storage_limit_gb) ??
    toNumber(profile?.plan?.feature_limits?.included_storage_gb) ??
    null
  );
}

function getPrimaryOwner(profile?: CustomerProfileRecord | null, customer?: CustomerRecord | null) {
  const defaultAdmin = profile?.default_admin;
  if (defaultAdmin) {
    const name = [defaultAdmin.first_name, defaultAdmin.last_name].filter(Boolean).join(" ").trim();
    return {
      name: name || customer?.name || "—",
      email: defaultAdmin.email?.trim() || customer?.email?.trim() || "—",
    };
  }

  const labAdmin = profile?.users?.find((user) => user.role?.name === "lab_admin");
  if (labAdmin) {
    const name = [labAdmin.first_name, labAdmin.last_name].filter(Boolean).join(" ").trim();
    return {
      name: name || customer?.name || "—",
      email: labAdmin.email?.trim() || customer?.email?.trim() || "—",
    };
  }

  return {
    name: customer?.name || "—",
    email: customer?.email?.trim() || "—",
  };
}

function deriveStatus(args: {
  profile?: BillingProfileRecord | null;
  slipUsagePercent: number | null;
  storageUsagePercent: number | null;
}): SuperadminBillingStatus {
  const normalizedProfileStatus = (args.profile?.status || "").toLowerCase();
  if (!args.profile) return "Not Configured";
  if (normalizedProfileStatus === "suspended" || normalizedProfileStatus === "cancelled") {
    return "Suspended";
  }

  const highestUsage = Math.max(args.slipUsagePercent ?? 0, args.storageUsagePercent ?? 0);
  if (highestUsage >= 100) return "Limit Reached";
  if (highestUsage >= 80) return "Warning";
  return "Active";
}

function getStatusTone(status: SuperadminBillingStatus): SuperadminBillingTenantRow["statusTone"] {
  if (status === "Active") return "success";
  if (status === "Warning") return "warning";
  if (status === "Limit Reached" || status === "Suspended") return "danger";
  return "muted";
}

function getInvoiceAmount(invoice: SubscriptionInvoiceRecord): number | null {
  return (
    toNumber(invoice.amount_paid) ??
    toNumber(invoice.amount_due) ??
    toNumber(invoice.total_amount) ??
    toNumber(invoice.amount) ??
    toNumber(invoice.subtotal) ??
    null
  );
}

function getInvoiceDate(invoice: SubscriptionInvoiceRecord): string | null {
  return invoice.paid_at || invoice.created_at || invoice.due_date || null;
}

function buildAddOnRows(
  customerAddOns: CustomerAddOnRecord[],
  catalogAddOns: CatalogAddOnRecord[] = [],
) {
  const activeStatuses = new Set(["active", "trialing"]);
  const cancelledStatuses = new Set(["cancelled"]);
  const byCatalogId = new Map<number, CatalogAddOnRecord>();
  for (const item of catalogAddOns) {
    byCatalogId.set(item.id, item);
  }

  const rows = new Map<number, SuperadminBillingTenantDetail["addOns"][number]>();

  for (const customerAddOn of customerAddOns) {
    const catalog = customerAddOn.add_on ?? byCatalogId.get(customerAddOn.billing_add_on_id);
    const normalizedStatus = (customerAddOn.status || "").toLowerCase();
    const active = activeStatuses.has(normalizedStatus);
    const status = active ? "Active" : cancelledStatuses.has(normalizedStatus) ? "Cancelled" : "Available";
    rows.set(customerAddOn.billing_add_on_id, {
      id: customerAddOn.billing_add_on_id,
      customerAddOnId: customerAddOn.id,
      name: catalog?.name?.trim() || `Add-on #${customerAddOn.billing_add_on_id}`,
      description: catalog?.description?.trim() || "Subscription add-on",
      monthlyFee: toNumber(catalog?.monthly_fee) ?? 0,
      monthlyFeeLabel: formatCurrency(toNumber(catalog?.monthly_fee) ?? 0),
      status,
      active,
    });
  }

  for (const catalog of catalogAddOns) {
    if (rows.has(catalog.id)) continue;
    rows.set(catalog.id, {
      id: catalog.id,
      customerAddOnId: null,
      name: catalog.name?.trim() || `Add-on #${catalog.id}`,
      description: catalog.description?.trim() || "Subscription add-on",
      monthlyFee: toNumber(catalog.monthly_fee) ?? 0,
      monthlyFeeLabel: formatCurrency(toNumber(catalog.monthly_fee) ?? 0),
      status: "Available",
      active: false,
    });
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function buildActivity(args: {
  invoices: SubscriptionInvoiceRecord[];
  customerAddOns: CustomerAddOnRecord[];
  profile?: BillingProfileRecord | null;
}): SuperadminBillingActivityItem[] {
  const items: SuperadminBillingActivityItem[] = [];

  for (const invoice of args.invoices.slice(0, 3)) {
    items.push({
      kind: "invoice",
      label: `Payment received — ${formatCurrency(getInvoiceAmount(invoice))}`,
      timestamp: getInvoiceDate(invoice),
    });
  }

  for (const addOn of args.customerAddOns.slice(0, 2)) {
    const name = addOn.add_on?.name?.trim() || `Add-on #${addOn.billing_add_on_id}`;
    items.push({
      kind: "add-on",
      label: `${name} ${((addOn.status || "").toLowerCase() === "active") ? "active" : addOn.status || "updated"}`,
      timestamp: null,
    });
  }

  if (args.profile?.created_at) {
    items.push({
      kind: "profile",
      label: `Billing profile created for ${getPlanName(args.profile)}`,
      timestamp: args.profile.created_at,
    });
  }

  return items
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 6);
}

export function buildSuperadminBillingTenantRow(args: {
  customer: CustomerRecord;
  customerProfile?: CustomerProfileRecord | null;
  profile?: BillingProfileRecord | null;
  usage?: BillingUsageRecord | null;
  storageRecord?: StorageRecord | null;
}): SuperadminBillingTenantRow {
  const slipUsed =
    toNumber(args.usage?.slip_count) ??
    toNumber(args.profile?.usage_count) ??
    0;
  const slipCapacity = getSlipCapacity(args.profile, args.usage);
  const slipUsagePercent = clampPercent(
    slipCapacity && slipCapacity > 0 ? (slipUsed / slipCapacity) * 100 : null,
  );

  const storageUsedGb = toNumber(args.storageRecord?.storage_gb);
  const storageLimitGb = getStorageLimit(args.profile, args.storageRecord);
  const storageUsagePercent = clampPercent(
    storageUsedGb != null && storageLimitGb && storageLimitGb > 0
      ? (storageUsedGb / storageLimitGb) * 100
      : null,
  );

  const status = deriveStatus({
    profile: args.profile,
    slipUsagePercent,
    storageUsagePercent,
  });
  const owner = getPrimaryOwner(args.customerProfile, args.customer);
  const nextRenewal = args.profile?.current_period_end || args.storageRecord?.current_period_end || null;

  return {
    customerId: args.customer.id,
    labName: args.customer.name,
    labCode: args.customer.unique_code?.trim() || `LAB-${String(args.customer.id).padStart(4, "0")}`,
    ownerName: owner.name,
    ownerEmail: owner.email,
    tenantType: "Dental Lab",
    planName: getPlanName(args.profile),
    status,
    statusTone: getStatusTone(status),
    slipUsagePercent,
    slipUsageLabel: slipCapacity ? `${formatUsageValue(slipUsed)}/${formatUsageValue(slipCapacity)}` : "—",
    storageUsagePercent,
    storageUsageLabel:
      storageUsedGb != null && storageLimitGb != null
        ? `${formatUsageValue(storageUsedGb)}/${formatUsageValue(storageLimitGb)} GB`
        : "—",
    memberSinceLabel: formatDate(args.customer.created_at),
    nextRenewalLabel: formatDate(nextRenewal),
  };
}

export function buildSuperadminBillingTenantDetail(args: {
  customer: CustomerRecord;
  customerProfile?: CustomerProfileRecord | null;
  profile?: BillingProfileRecord | null;
  usage?: BillingUsageRecord | null;
  storageRecord?: StorageRecord | null;
  invoices?: SubscriptionInvoiceRecord[];
  customerAddOns?: CustomerAddOnRecord[];
  catalogAddOns?: CatalogAddOnRecord[];
}): SuperadminBillingTenantDetail {
  const row = buildSuperadminBillingTenantRow(args);
  const invoices = (args.invoices ?? []).map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number?.trim() || `INV-${invoice.id}`,
    amountLabel: formatCurrency(getInvoiceAmount(invoice), invoice.currency || "USD"),
    statusLabel: (invoice.status || "unknown").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    dateLabel: formatDate(getInvoiceDate(invoice)),
    downloadUrl: invoice.invoice_pdf || invoice.hosted_invoice_url || null,
  }));

  const addOns = buildAddOnRows(args.customerAddOns ?? [], args.catalogAddOns ?? []);
  const monthlyFee = getPlanMonthlyFee(args.profile?.plan);
  const owner = getPrimaryOwner(args.customerProfile, args.customer);
  const slipUsed = toNumber(args.usage?.slip_count) ?? toNumber(args.profile?.usage_count) ?? 0;
  const slipCapacity = getSlipCapacity(args.profile, args.usage);
  const storageUsedGb = toNumber(args.storageRecord?.storage_gb);
  const storageLimitGb = getStorageLimit(args.profile, args.storageRecord);

  return {
    header: {
      customerId: row.customerId,
      labName: row.labName,
      labCode: row.labCode,
      ownerName: owner.name,
      ownerEmail: owner.email,
      status: row.status,
      memberSinceLabel: row.memberSinceLabel,
    },
    subscription: {
      profileId: args.profile?.id ?? null,
      planId: args.profile?.billing_plan_id ?? null,
      planName: row.planName,
      monthlyFee,
      monthlyFeeLabel: formatCurrency(monthlyFee),
      nextRenewalLabel: row.nextRenewalLabel,
      nextInvoiceEstimate: invoices[0]?.amountLabel || formatCurrency(monthlyFee),
      autoRenewLabel:
        args.profile?.status === "cancelled" || args.profile?.status === "suspended" ? "Off" : "On",
      seatUsageLabel:
        args.profile?.plan?.feature_limits?.max_user_seats != null
          ? `1 of ${args.profile.plan.feature_limits.max_user_seats} used`
          : "—",
    },
    usage: {
      slipUsed,
      slipCapacity,
      slipUsagePercent: row.slipUsagePercent,
      slipUsageLabel: row.slipUsageLabel,
      storageUsedGb,
      storageLimitGb,
      storageUsagePercent: row.storageUsagePercent,
      storageUsageLabel: row.storageUsageLabel,
      billingPeriodStart: args.usage?.period_start || args.profile?.current_period_start || null,
      billingPeriodEnd: args.usage?.period_end || args.profile?.current_period_end || null,
    },
    invoices,
    addOns,
    activity: buildActivity({
      invoices: args.invoices ?? [],
      customerAddOns: args.customerAddOns ?? [],
      profile: args.profile,
    }),
  };
}
