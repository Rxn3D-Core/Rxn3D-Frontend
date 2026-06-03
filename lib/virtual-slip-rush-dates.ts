function isoDateFromApiTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : "";
}

/** Resolved delivery dates from GET /v1/slip/slip/{id}/details (and related listing shapes). */
export interface SlipDeliveryDates {
  isRush: boolean;
  /** Standard (non-rush) due date, display MM/DD/YY. */
  standardDueDate: string;
  /** Rush due date when rushed, display MM/DD/YY. */
  rushDueDate: string;
  /** Primary header due date: rush when rushed, else standard. */
  dueDate: string;
  /** `yyyy-MM-dd` for rush modal "standard delivery" column. */
  standardDateIso: string;
  /** `yyyy-MM-dd` rush target when rushed. */
  rushDateIso: string;
}

function formatDateFromIso(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  const [, year, month, day] = m;
  return `${month}/${day}/${year.slice(2)}`;
}

function firstIso(...vals: Array<unknown>): string {
  for (const v of vals) {
    const iso = isoDateFromApiTimestamp(
      typeof v === "string" ? v : (v as { date?: string })?.date
    );
    if (iso) return iso;
  }
  return "";
}

function productRushIso(product: any): string {
  const rush = product?.rush ?? {};
  return firstIso(
    rush?.requested_rush_date,
    rush?.requested_delivery_date,
    product?.requested_rush_date
  );
}

function productIsRushed(product: any): boolean {
  const rush = product?.rush;
  return Boolean(
    product?.is_rush ||
      rush?.is_rush ||
      (typeof rush === "object" && rush !== null && productRushIso(product))
  );
}

/**
 * Derive rush vs standard due dates from slip details payload.
 * Tries several backend field names for the pre-rush (standard) date when `is_rush` is true.
 */
export function resolveSlipDeliveryDates(safe: any, products: any[] = []): SlipDeliveryDates {
  const root = safe ?? {};
  const deliveryIso = firstIso(root.delivery?.delivery_date);
  const standardIso = firstIso(
    root.delivery?.standard_delivery_date,
    root.delivery?.scheduled_delivery_date,
    root.delivery?.original_delivery_date,
    root.delivery?.non_rush_delivery_date,
    root.delivery_date?.standard_date,
    root.delivery_date?.original_date,
    root.delivery_date?.scheduled_date,
    root.delivery_date?.standard_delivery_date
  );

  let rushIso = firstIso(
    root.requested_rush_date,
    root.rush?.requested_rush_date,
    root.rush?.requested_delivery_date
  );

  for (const p of products) {
    if (!productIsRushed(p) && !productRushIso(p)) continue;
    const iso = productRushIso(p);
    if (iso) rushIso = iso;
  }

  const isRush = Boolean(
    root.is_rush || root.rush?.is_rush || rushIso || products.some((p) => productIsRushed(p))
  );

  let resolvedStandardIso = standardIso;
  let resolvedRushIso = rushIso;

  if (isRush) {
    if (!resolvedRushIso) resolvedRushIso = deliveryIso;
    if (!resolvedStandardIso && deliveryIso && deliveryIso !== resolvedRushIso) {
      resolvedStandardIso = deliveryIso;
    }
  } else {
    resolvedStandardIso = resolvedStandardIso || deliveryIso;
    resolvedRushIso = "";
  }

  const standardDueDate = formatDateFromIso(resolvedStandardIso);
  const rushDueDate = formatDateFromIso(resolvedRushIso);
  const dueDate = isRush && rushDueDate ? rushDueDate : standardDueDate;

  return {
    isRush,
    standardDueDate,
    rushDueDate,
    dueDate,
    standardDateIso: resolvedStandardIso,
    rushDateIso: resolvedRushIso,
  };
}
