import type { CustomerAddressProfile } from "@/lib/api/customers";
import type {
  BillingInvoice,
  BillingProduct,
  StatementParty,
  StatementPartyNamedRef,
  StatementRecord,
} from "@/lib/redux/api/billingApi";

export type StatementHeaderDraft = {
  statementId: string;
  recipientEmail: string;
  statementDate: string;
  dueDate: string;
};

export type StatementBillingTarget = {
  invoiceId: number;
  productId: number;
};

export type StatementItemLike = {
  patient_name?: string | null;
  product_name?: string | null;
  grade_name?: string | null;
  stage_name?: string | null;
  gross_amount?: number | string | null;
  amount?: number | string | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function namedRefText(value: string | StatementPartyNamedRef | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return (value.name ?? "").trim();
}

/**
 * Builds a multi-line address from whatever party fields the statement API
 * returns (street, city, state, postal, country). Missing parts are omitted.
 */
export function formatStatementPartyAddress(
  party: StatementParty | null | undefined,
  fallback = "—",
): string {
  if (!party) return fallback;

  const street = (party.address ?? "").trim();
  const city = (party.city ?? "").trim();
  const state = namedRefText(party.state);
  const postal = (party.postal_code ?? "").trim();
  const country = namedRefText(party.country);

  const cityLine = [city, [state, postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const lines = [street, cityLine, country].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : fallback;
}

/** True when city or state is missing — statement payloads often only include street `address`. */
export function statementPartyNeedsLocationEnrichment(
  party: StatementParty | null | undefined,
): boolean {
  if (!party) return true;
  const city = (party.city ?? "").trim();
  const state = namedRefText(party.state);
  return !city || !state;
}

/**
 * Fills missing address parts on a statement party from a customer profile
 * (`GET /customers/{id}`). Existing party values win.
 */
export function mergeStatementPartyWithProfile(
  party: StatementParty | null | undefined,
  profile: CustomerAddressProfile | null | undefined,
): StatementParty | null {
  if (!party && !profile) return null;
  if (!profile) return party ?? null;

  if (!party) {
    return {
      id: profile.id,
      name: profile.name ?? null,
      email: profile.email ?? null,
      address: profile.address ?? null,
      city: profile.city ?? null,
      postal_code: profile.postal_code ?? null,
      state: profile.state ?? null,
      country: profile.country ?? null,
    };
  }

  return {
    ...party,
    address: (party.address ?? "").trim() || profile.address || party.address,
    city: (party.city ?? "").trim() || profile.city || party.city,
    postal_code: (party.postal_code ?? "").trim() || profile.postal_code || party.postal_code,
    state: namedRefText(party.state) ? party.state : (profile.state ?? party.state),
    country: namedRefText(party.country) ? party.country : (profile.country ?? party.country),
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function buildStatementHeaderDraft(
  statement: Pick<StatementRecord, "id" | "statement_id" | "recipient_email" | "created_at" | "due_date">,
): StatementHeaderDraft {
  return {
    statementId: statement.statement_id ?? `ST-${statement.id}`,
    recipientEmail: statement.recipient_email ?? "",
    statementDate: toDateInputValue(statement.created_at),
    dueDate: toDateInputValue(statement.due_date),
  };
}

function scoreProductMatch(item: StatementItemLike, product: BillingProduct): number {
  let score = 0;

  if (normalizeText(item.product_name) && normalizeText(item.product_name) === normalizeText(product.product_name)) {
    score += 5;
  }
  if (normalizeText(item.grade_name) && normalizeText(item.grade_name) === normalizeText(product.grade_name)) {
    score += 3;
  }
  if (normalizeText(item.stage_name) && normalizeText(item.stage_name) === normalizeText(product.stage_name)) {
    score += 3;
  }

  const itemAmount = toNumber(item.gross_amount ?? item.amount);
  const productAmount = toNumber(product.total_price);
  if (itemAmount !== 0 && Math.abs(itemAmount - productAmount) < 0.01) {
    score += 2;
  }

  return score;
}

export function findMatchingBillingTarget(
  item: StatementItemLike,
  invoices: BillingInvoice[],
): StatementBillingTarget | null {
  const itemPatient = normalizeText(item.patient_name);
  let best: { invoiceId: number; productId: number; score: number } | null = null;

  for (const invoice of invoices) {
    const patient = normalizeText(invoice.slip?.case?.patient_name);
    const patientScore = itemPatient && patient === itemPatient ? 5 : 0;
    const products = invoice.products ?? [];

    for (const product of products) {
      if (product.id == null) continue;
      const score = patientScore + scoreProductMatch(item, product);
      if (best == null || score > best.score) {
        best = { invoiceId: invoice.id, productId: product.id, score };
      }
    }
  }

  return best != null && best.score >= 10
    ? { invoiceId: best.invoiceId, productId: best.productId }
    : null;
}

export function findMatchingBillingInvoiceId(
  item: StatementItemLike,
  invoices: BillingInvoice[],
): number | null {
  return findMatchingBillingTarget(item, invoices)?.invoiceId ?? null;
}

function sumAddonTotal(product: BillingProduct): number {
  return (product.addons ?? []).reduce((sum, addon) => {
    const unitPrice = toNumber(addon.price ?? addon.total);
    const quantity = addon.quantity != null && addon.quantity > 0 ? addon.quantity : 1;
    return sum + unitPrice * quantity;
  }, 0);
}

function sumRetentionTotal(product: BillingProduct): number {
  return (product.retentions ?? []).reduce((sum, retention) => sum + toNumber(retention.price ?? retention.total), 0);
}

function sumAdvanceFieldTotal(product: BillingProduct): number {
  return (product.advance_fields ?? []).reduce((sum, field) => {
    const quantity = field.quantity != null && field.quantity > 0 ? field.quantity : 1;
    return sum + toNumber(field.price) * quantity;
  }, 0);
}

export function parseStatementMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export type StatementPreviewRefundSummary = {
  lineItemRefund: number;
  statementRefund: number;
  totalRefund: number;
  grandTotal: number;
  showRefundLine: boolean;
  refundReason: string | null;
};

/** Combines line-item refunds (negative billing rows) with statement-level `refund_amount`. */
export function summarizeStatementPreviewTotals(
  subtotal: number,
  lineItemRefundTotal: number,
  options?: {
    statementRefundAmount?: number | string | null;
    refundReason?: string | null;
  },
): StatementPreviewRefundSummary {
  const lineItemRefund = Math.max(0, lineItemRefundTotal);
  const statementRefund = Math.max(0, parseStatementMoney(options?.statementRefundAmount));
  const totalRefund = lineItemRefund + statementRefund;
  const grandTotal = subtotal - totalRefund;
  const refundReason = (options?.refundReason ?? "").trim() || null;

  return {
    lineItemRefund,
    statementRefund,
    totalRefund,
    grandTotal,
    showRefundLine: totalRefund > 0,
    refundReason,
  };
}

/** Signed gross for a statement billing row — already-negative or refund-status rows count as negative. */
function statementItemSignedGross(item: {
  gross_amount?: number | string | null;
  amount?: number | string | null;
  status?: string | null;
}): number {
  const amount = toNumber(item.gross_amount ?? item.amount);
  if (amount < 0) return amount;
  const status = (item.status ?? "").trim().toLowerCase();
  return status === "refund" || status === "refunded" ? -amount : amount;
}

export type StatementNetTotalInput = {
  billing_items?: Array<{
    gross_amount?: number | string | null;
    amount?: number | string | null;
    status?: string | null;
  }> | null;
  amount_due?: number | string | null;
  refund_amount?: number | string | null;
};

export type StatementTotals = {
  /** Sum of positive line items (gross, pre-refund). */
  subtotal: number;
  /** Total refund deducted: line-item refunds + statement-level `refund_amount`. */
  refund: number;
  /** subtotal − refund; matches the statement preview's grand total. */
  netTotal: number;
};

/**
 * Resolves a statement's subtotal / refund / net total, consistent with the statement
 * preview's grand total: (sum of positive line items) − (line-item refunds +
 * statement-level `refund_amount`). When the record carries no `billing_items` (e.g.
 * lightweight list rows), it falls back to `amount_due` (subtotal) and `refund_amount`
 * (refund) so listings still net out the refund.
 *
 * NOTE: for the deduction to show on listings, the statements list API must return
 * `refund_amount` (and/or `billing_items`) on each row. If neither is present, refund
 * is 0 and netTotal equals `amount_due`.
 */
export function resolveStatementTotals(statement: StatementNetTotalInput): StatementTotals {
  const items = statement.billing_items ?? [];
  if (items.length > 0) {
    let subtotal = 0;
    let lineItemRefund = 0;
    for (const item of items) {
      const gross = statementItemSignedGross(item);
      if (gross > 0) subtotal += gross;
      else if (gross < 0) lineItemRefund += Math.abs(gross);
    }
    const summary = summarizeStatementPreviewTotals(subtotal, lineItemRefund, {
      statementRefundAmount: statement.refund_amount,
    });
    return { subtotal, refund: summary.totalRefund, netTotal: summary.grandTotal };
  }
  const subtotal = parseStatementMoney(statement.amount_due);
  const refund = Math.max(0, parseStatementMoney(statement.refund_amount));
  return { subtotal, refund, netTotal: subtotal - refund };
}

/** Net total for a statement (subtotal − refund). See {@link resolveStatementTotals}. */
export function resolveStatementNetTotal(statement: StatementNetTotalInput): number {
  return resolveStatementTotals(statement).netTotal;
}

export function computeBasePriceFromTargetGross(
  targetGross: number,
  product: BillingProduct,
): number | null {
  if (!Number.isFinite(targetGross) || targetGross < 0) return null;

  const rushPercentage = toNumber(product.rush_percentage);
  const multiplier = 1 + rushPercentage / 100;
  if (multiplier <= 0) return null;

  const nonBaseTotal =
    toNumber(product.material_price) +
    sumAddonTotal(product) +
    sumRetentionTotal(product) +
    sumAdvanceFieldTotal(product);

  const solvedBase = targetGross / multiplier - nonBaseTotal;
  if (!Number.isFinite(solvedBase) || solvedBase < 0) return null;

  return Number(solvedBase.toFixed(2));
}
