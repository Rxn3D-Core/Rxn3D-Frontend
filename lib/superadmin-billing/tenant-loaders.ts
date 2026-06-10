import {
  getCustomerBillingProfile,
  listBillingCatalogPlans,
  upgradeBillingProfile,
  downgradeBillingProfile,
  type BillingProfile,
} from "@/lib/api/billing-profiles"
import {
  createCustomerAddOn,
  deleteCustomerAddOn,
  listCustomerAddOns,
  listSubscriptionInvoices,
  updateCustomerAddOn,
  type CustomerAddOn,
} from "@/lib/api/billing-subscription"
import {
  cancelCustomerStorageTier,
  createStorageTierCheckoutSession,
  getCustomerStorageTier,
  type CustomerStorageTierRecord,
} from "@/lib/api/customer-storage-tier"
import {
  getSuperadminLabCustomerProfile,
  searchSuperadminLabCustomers,
  type SearchLabCustomersOptions,
  type SuperadminLabCustomer,
  type SuperadminLabCustomerProfile,
} from "@/lib/api/superadmin-customers"
import { getBillingUsage, listBillingCatalogAddOns, type BillingUsage, type SubscriptionInvoice, type CatalogAddOn } from "@/lib/api/billing-subscription"
import { getStorageUsageStatus, type StorageUsageStatus } from "@/lib/api/storage-usage"
import { getBatchTenantBillingOverview, type TenantBillingOverviewEntry } from "@/lib/api/superadmin-tenant-billing"
import {
  buildSuperadminBillingTenantDetail,
  buildSuperadminBillingTenantRow,
  type SuperadminBillingTenantDetail,
  type SuperadminBillingTenantRow,
} from "@/lib/superadmin-billing/tenant-data"

type EnrichmentBundle = {
  customerProfile: SuperadminLabCustomerProfile | null
  billingProfile: BillingProfile | null
  usage: BillingUsage | null
  storageUsage: StorageUsageStatus | null
  storageTier: CustomerStorageTierRecord | null
}

function toStorageRecord(
  storageUsage: StorageUsageStatus | null,
  storageTier: CustomerStorageTierRecord | null,
  customerId: number,
) {
  if (!storageUsage && !storageTier) return null
  return {
    id: storageTier?.id ?? customerId,
    customer_id: customerId,
    storage_gb: storageUsage?.used_gb ?? null,
    storage_limit_gb:
      storageUsage?.limit_gb ??
      storageTier?.storageTier?.storage_gb ??
      null,
    status: storageTier?.status ?? "active",
    current_period_end: storageTier?.current_period_end ?? null,
  }
}

function batchEntryToStorageRecord(entry: TenantBillingOverviewEntry, customerId: number) {
  const limitGb = entry.storage.limit_gb
  if (!limitGb) return null
  return {
    id: customerId,
    customer_id: customerId,
    storage_gb: null, // actual usage not fetched in batch (would require expensive per-lab file scans)
    storage_limit_gb: limitGb,
    status: entry.storage.tier_status ?? "active",
    current_period_end: entry.storage.tier_period_end ?? null,
  }
}

function batchEntryToBillingProfile(entry: TenantBillingOverviewEntry): BillingProfile | null {
  const bp = entry.billing_profile
  if (!bp) return null
  return {
    id: bp.id,
    customer_id: 0,
    billing_plan_id: bp.plan?.id ?? 0,
    status: bp.status as BillingProfile["status"],
    current_period_start: bp.current_period_start ?? undefined,
    current_period_end: bp.current_period_end ?? undefined,
    plan: bp.plan
      ? {
          id: bp.plan.id,
          name: bp.plan.name,
          status: bp.plan.status,
          monthly_fee: bp.plan.monthly_fee ?? undefined,
          feature_limits: {
            slip_capacity: bp.plan.slip_capacity,
            capacity_type: "reset_each_cycle",
            included_storage_gb: bp.plan.storage_included_gb,
            max_admin_seats: 0,
            max_user_seats: 0,
          },
        }
      : undefined,
  }
}

function batchEntryToUsage(entry: TenantBillingOverviewEntry): BillingUsage | null {
  const u = entry.usage
  if (!u) return null
  return {
    slip_count: u.slip_count,
    slip_capacity: u.slip_capacity,
    remaining_slips: u.remaining_slips ?? undefined,
    credit_used: u.credit_used,
    overage_count: u.overage_count,
    period_start: u.period_start ?? undefined,
    period_end: u.period_end ?? undefined,
  } as BillingUsage
}

async function enrichTenant(customer: SuperadminLabCustomer): Promise<EnrichmentBundle> {
  const [customerProfile, profileResult, usage, storageUsage, storageTier] = await Promise.all([
    getSuperadminLabCustomerProfile(customer.id).catch(() => null),
    getCustomerBillingProfile(customer.id).catch(() => ({ has_plan: false, data: null })),
    getBillingUsage(customer.id).catch(() => null),
    getStorageUsageStatus(customer.id).catch(() => null),
    getCustomerStorageTier(customer.id).catch(() => null),
  ])

  return {
    customerProfile,
    billingProfile: profileResult?.data ?? null,
    usage,
    storageUsage,
    storageTier,
  }
}

export async function loadSuperadminBillingTenantOverview(options: SearchLabCustomersOptions = {}) {
  const search = await searchSuperadminLabCustomers(options)

  const customerIds = search.data.map((c) => c.id)
  const batchData = customerIds.length > 0
    ? await getBatchTenantBillingOverview(customerIds).catch(() => ({}))
    : {}

  const rows: SuperadminBillingTenantRow[] = search.data.map((customer) => {
    const entry = batchData[customer.id]
    return buildSuperadminBillingTenantRow({
      customer,
      customerProfile: null,
      profile: entry ? batchEntryToBillingProfile(entry) : null,
      usage: entry ? batchEntryToUsage(entry) : null,
      storageRecord: entry ? batchEntryToStorageRecord(entry, customer.id) : null,
    })
  })

  return {
    customers: search.data,
    rows,
    pagination: search.pagination,
  }
}

export async function loadSuperadminBillingTenantDetail(customerId: number): Promise<{
  customer: SuperadminLabCustomerProfile | null
  detail: SuperadminBillingTenantDetail | null
  billingProfile: BillingProfile | null
  customerAddOns: CustomerAddOn[]
  catalogAddOns: CatalogAddOn[]
  storageTier: CustomerStorageTierRecord | null
  storageUsage: StorageUsageStatus | null
  catalogPlans: any[]
  invoices: SubscriptionInvoice[]
  supports: {
    suspendAccount: false
    bonusSlips: false
    settingsPersistence: false
  }
}> {
  const customer = await getSuperadminLabCustomerProfile(customerId)
  if (!customer) {
    return {
      customer: null,
      detail: null,
      billingProfile: null,
      customerAddOns: [],
      catalogAddOns: [],
      storageTier: null,
      storageUsage: null,
      catalogPlans: [],
      invoices: [],
      supports: {
        suspendAccount: false,
        bonusSlips: false,
        settingsPersistence: false,
      },
    }
  }

  const [profileResult, usage, invoices, customerAddOns, catalogAddOns, storageTier, storageUsage, catalogPlans] =
    await Promise.all([
      getCustomerBillingProfile(customerId).catch(() => ({ has_plan: false, data: null })),
      getBillingUsage(customerId).catch(() => null),
      listSubscriptionInvoices(customerId).catch(() => []),
      listCustomerAddOns(customerId).catch(() => []),
      listBillingCatalogAddOns(customerId).catch(() => []),
      getCustomerStorageTier(customerId).catch(() => null),
      getStorageUsageStatus(customerId).catch(() => null),
      listBillingCatalogPlans(customerId).catch(() => []),
    ])

  const billingProfile = profileResult?.data ?? null
  const detail = buildSuperadminBillingTenantDetail({
    customer,
    customerProfile: customer,
    profile: billingProfile,
    usage,
    storageRecord: toStorageRecord(storageUsage, storageTier, customerId),
    invoices,
    customerAddOns,
    catalogAddOns,
  })

  return {
    customer,
    detail,
    billingProfile,
    customerAddOns,
    catalogAddOns,
    storageTier,
    storageUsage,
    catalogPlans,
    invoices,
    supports: {
      suspendAccount: false,
      bonusSlips: false,
      settingsPersistence: false,
    },
  }
}

export async function applySuperadminPlanChange(args: {
  profileId: number
  targetPlanId: number
  currentMonthlyFee: number
  targetMonthlyFee: number
}) {
  const payload = {
    billing_plan_id: args.targetPlanId,
  }

  if (args.targetMonthlyFee > args.currentMonthlyFee) {
    return upgradeBillingProfile(args.profileId, payload)
  }

  return downgradeBillingProfile(args.profileId, payload)
}

export async function enableSuperadminCustomerAddOn(args: {
  customerId: number
  billingAddOnId: number
}) {
  return createCustomerAddOn({
    customer_id: args.customerId,
    billing_add_on_id: args.billingAddOnId,
    status: "active",
  })
}

export async function disableSuperadminCustomerAddOn(args: {
  customerAddOnId: number
}) {
  return deleteCustomerAddOn(args.customerAddOnId)
}

export async function cancelSuperadminStorageTier(customerStorageTierId: number) {
  return cancelCustomerStorageTier(customerStorageTierId)
}

export async function startSuperadminStorageTierCheckout(args: {
  customerId: number
  billingStorageTierId: number
  successUrl: string
  cancelUrl: string
}) {
  return createStorageTierCheckoutSession({
    customer_id: args.customerId,
    billing_storage_tier_id: args.billingStorageTierId,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  })
}

export async function cancelSuperadminCustomerAddOn(customerAddOnId: number) {
  return updateCustomerAddOn(customerAddOnId, { status: "cancelled" })
}
