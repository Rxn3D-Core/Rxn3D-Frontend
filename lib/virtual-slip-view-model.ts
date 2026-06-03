/**
 * Display-oriented view model for the redesigned (view-only) virtual slip page.
 *
 * Maps the GET /v1/slip/slip/{id}/details response into a flat, render-ready
 * shape consumed by the components under components/virtual-slip/.
 *
 * Unlike lib/virtual-slip-transformer.ts (which fakes the editable
 * CaseDesignCenter's internal state), this produces plain data for display —
 * no progressive-disclosure gating, no editor types.
 */

export type ToothStatus = "in_mouth" | "missing" | "will_extract" | "implant";

export interface ToothVM {
  number: number;
  status: ToothStatus;
}

export interface ImplantVM {
  toothNumber: number;
  brand: string;
  platform: string;
  size: string;
  abutmentType: string;
  abutmentOption: string;
  retentionMechanism: string;
}

export interface ProductVM {
  image: string | null;
  /** Product display name, e.g. "Stay plate 4 teeth to replace". */
  title: string;
  /** "#7,8,9,10" or "All teeth missing". */
  teethLabel: string;
  missingTeeth: number[];
  willExtractTeeth: number[];
  restoration: string;
  productName: string;
  grade: string;
  stage: string;
  teethShade: string;
  gumShade: string;
  stumpShade: string;
  /** "1x Clean impression, 1x STL" */
  impression: string;
  /** ["3x Gold tooth"] */
  addOns: string[];
  isFixed: boolean;
  isImplant: boolean;
  /** Per-tooth implant + abutment details (one entry per implant tooth). */
  implants: ImplantVM[];
  /** Advance Mode configuration fields. */
  advanceFields: Array<{ label: string; value: string }>;
  /** True when the product has an opposing arch section to render. */
  hasOpposing: boolean;
  /** The opposing arch (opposite of the product's own arch). */
  opposingArch: "maxillary" | "mandibular" | null;
  /** Formatted opposing arch impressions, e.g. "1x Alginate". */
  opposingImpression: string;
  /** Opposing arch tooth numbers that should be highlighted on the chart. */
  opposingSelectedTeeth: number[];
  /**
   * Per-tooth image overrides for the opposing arch chart.
   * Keyed by OPPOSING tooth number (derived as 33 − main_tooth for universal numbering).
   */
  opposingToothChartByTooth: Record<number, string | null>;
}

export interface ArchVM {
  arch: "maxillary" | "mandibular";
  teeth: ToothVM[];
  selectedTeeth: number[];
  toothChartSelectionsByTooth: Record<
    number,
    { chartType: "Implant" | "Prep" | "Pontic" | null; imageUrl: string | null }
  >;
  products: ProductVM[];
  /**
   * Impressions contributed by products on the OPPOSITE arch that have
   * `opposite_impression: "Yes"`. Displayed below the tooth chart on this side.
   */
  opposingImpression: string;
}

export interface VirtualSlipHeaderVM {
  officeName: string;
  officeLogo: string | null;
  labName: string;
  labLogo: string | null;
  doctorName: string;
  doctorImage: string | null;
  createdByName: string;
  createdByImage: string | null;
  patientName: string;
  gender: string;
  age: string;
  slipNumber: string;
  caseNumber: string;
  panNumber: string;
  status: string;
  location: string;
  deliveryTime: string;
  dueDate: string;
  pickupDate: string;
}

export interface VirtualSlipVM {
  header: VirtualSlipHeaderVM;
  arches: { maxillary: ArchVM | null; mandibular: ArchVM | null };
  notes: string;
  relatedSlips: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAXILLARY_TEETH = Array.from({ length: 16 }, (_, i) => i + 1); // 1..16
const MANDIBULAR_TEETH = Array.from({ length: 16 }, (_, i) => 32 - i); // 32..17

/** "Upper" → maxillary, "Lower" → mandibular. */
function archFromType(type: string | null | undefined): "maxillary" | "mandibular" {
  return type?.toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

/** Parse a teeth value that may be a comma string, an array of numbers, or an array of objects. */
function parseTeeth(value: unknown): number[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  if (Array.isArray(value)) {
    return value
      .map((v: any) =>
        typeof v === "number"
          ? v
          : parseInt(String(v?.tooth_number ?? v?.tooth_num ?? v?.number ?? v), 10),
      )
      .filter((n) => !isNaN(n));
  }
  return [];
}

/** Read the first non-empty string from a list of candidate values. */
function firstStr(...vals: Array<unknown>): string {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/**
 * Format an ISO date string to MM/DD/YY. Parses the date components directly
 * from the string (rather than via `new Date()`) so the calendar day is not
 * shifted by the viewer's timezone, and so 6-digit microsecond fractions
 * (e.g. "2026-06-11T07:00:00.000000Z") parse reliably.
 */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  const [, year, month, day] = m;
  return `${month}/${day}/${year.slice(2)}`;
}

/**
 * Format a time to "h:mm AM/PM". Reads the hour/minute directly from the ISO
 * string's time portion (the stored UTC value, not the viewer's local time).
 * Accepts full ISO datetimes ("...T13:30:00.000000Z") or bare "HH:mm[:ss]".
 */
function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /T(\d{2}):(\d{2})/.exec(iso) ?? /^(\d{1,2}):(\d{2})/.exec(iso);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(min)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, "0")} ${ampm}`;
}

/** Format an impressions array into "1x Clean impression, 1x STL". */
function formatImpressions(impressions: unknown): string {
  if (!Array.isArray(impressions)) return "";
  return impressions
    .map((imp: any) => {
      const qty = imp?.quantity ?? imp?.qty ?? 1;
      const name = firstStr(imp?.impression?.name, imp?.name, imp?.impression?.code, imp?.code);
      return name ? `${qty}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

/** Format an addons array into ["3x Gold tooth", ...]. */
function formatAddOns(addons: unknown): string[] {
  if (!Array.isArray(addons)) return [];
  return addons
    .map((a: any) => {
      const qty = a?.quantity ?? a?.qty ?? 1;
      const name = firstStr(a?.addon?.name, a?.add_on?.name, a?.name);
      return name ? `${qty}x ${name}` : "";
    })
    .filter(Boolean);
}

/**
 * Build the per-product implant VM from the dedicated implant_details /
 * abutment_details arrays returned by GET /v1/slip/slip/{id}/details.
 * The exact expanded shape of these rows isn't fully documented, so each field
 * is read across a few likely key names.
 */
function buildImplantRow(
  impRow: any,
  abRow: any,
  toothNumber: number,
  retentionMechanism: string,
): ImplantVM {
  const sizeObj =
    typeof impRow?.size === "object" && impRow.size !== null
      ? impRow.size
      : (impRow?.implant_platform_size ?? impRow?.platform_size ?? {});

  const size =
    firstStr(
      sizeObj.label,
      sizeObj.name,
      typeof impRow?.size === "string" ? impRow.size : null,
      impRow?.custom_size,
      impRow?.size_label,
    ) ||
    (() => {
      const d = firstStr(impRow?.diameter, impRow?.implant_diameter, sizeObj.diameter_mm, sizeObj.diameter);
      const l = firstStr(impRow?.length, impRow?.implant_length, sizeObj.length_mm, sizeObj.length);
      return d && l ? `Ø ${d} mm × ${l} mm` : "";
    })();

  return {
    toothNumber,
    brand: firstStr(
      impRow?.implant?.brand_name,
      impRow?.implant?.name,
      impRow?.brand,
      impRow?.brand_name,
    ),
    platform: firstStr(
      impRow?.platform?.name,
      impRow?.implant_platform?.name,
      impRow?.platform_name,
      impRow?.system_name,
    ),
    size,
    abutmentType: firstStr(
      abRow?.abutment_type?.type,
      abRow?.abutment_type?.name,
      abRow?.abutmentType,
    ),
    abutmentOption: firstStr(
      abRow?.abutment_option?.name,
      abRow?.abutmentOption,
    ),
    retentionMechanism,
  };
}

/** Build per-tooth implant VMs from implant_details + abutment_details arrays. */
function buildImplants(apiProduct: any): ImplantVM[] {
  const implantDetails: any[] = Array.isArray(apiProduct?.implant_details)
    ? apiProduct.implant_details
    : [];

  // Build abutment lookup keyed by tooth_number.
  const abutmentByTooth: Record<number, any> = {};
  if (Array.isArray(apiProduct?.abutment_details)) {
    for (const ab of apiProduct.abutment_details) {
      const tn = Number(ab?.tooth_number);
      if (Number.isFinite(tn)) abutmentByTooth[tn] = ab;
    }
  }

  // Build retention mechanism lookup keyed by tooth_number.
  const retentionByTooth: Record<number, string> = {};
  if (Array.isArray(apiProduct?.retentions)) {
    for (const r of apiProduct.retentions) {
      const tn = Number(r?.teeth_number ?? r?.tooth_number);
      if (Number.isFinite(tn)) retentionByTooth[tn] = firstStr(r?.name, r?.retention_name);
    }
  }

  if (implantDetails.length > 0) {
    return implantDetails
      .map((imp) => {
        const tn = Number(imp?.tooth_number);
        if (!Number.isFinite(tn)) return null;
        return buildImplantRow(imp, abutmentByTooth[tn] ?? {}, tn, retentionByTooth[tn] ?? "");
      })
      .filter((v): v is ImplantVM => v !== null);
  }

  // Legacy single-implant shape (older API responses).
  const legacy = apiProduct?.implant ?? apiProduct?.implant_detail ?? null;
  const abLegacy = Array.isArray(apiProduct?.abutment_details) ? (apiProduct.abutment_details[0] ?? {}) : {};
  if (legacy || apiProduct?.implant_brand) {
    const vm = buildImplantRow(legacy ?? {}, abLegacy, 0, firstStr(apiProduct?.retention_type));
    if (vm.brand || vm.platform || vm.size) return [vm];
  }

  return [];
}

/**
 * Substitute the teeth count into a variation name_template.
 * e.g. "[x tooth/teeth] crown" + 3 → "3 teeth crown"
 * e.g. "[x tooth/teeth] crown" + 1 → "1 tooth crown"
 */
function applyNameTemplate(template: string, count: number): string {
  return template.replace(/\[x ([^/\]]+)\/([^\]]+)\]/gi, (_, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`
  );
}

/** Map a single API product into a ProductVM. */
function buildProduct(apiProduct: any): ProductVM {
  const product = apiProduct?.product ?? {};
  const variation = apiProduct?.variation ?? null;
  const categoryName = firstStr(
    apiProduct?.category?.name,
    product?.subcategory?.category?.name,
    product?.category_name,
  );
  const isRemovable = categoryName.toLowerCase().includes("removable");
  const implants = buildImplants(apiProduct);
  const isImplant = !isRemovable && implants.length > 0;
  const isFixed = !isRemovable;

  const teeth = parseTeeth(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  const missingTeeth = parseTeeth(apiProduct?.missing_teeth ?? apiProduct?.missing);
  const willExtractTeeth = parseTeeth(
    apiProduct?.extraction_teeth ?? apiProduct?.will_extract ?? apiProduct?.extractions,
  );

  const teethLabel = teeth.length > 0 ? `#${teeth.join(",")}` : "";

  const variationImage = firstStr(variation?.image_url, variation?.image) || null;
  const productImage = firstStr(product?.image_url, product?.image, apiProduct?.image) || null;

  const variationTitle = variation?.name_template
    ? applyNameTemplate(variation.name_template, teeth.length)
    : "";
  const productTitle = firstStr(product?.name, apiProduct?.name, "Product");

  // Advance field saved values for the "Advance Mode configuration" expander.
  // Each entry in apiProduct.advance_fields carries its own label via the nested
  // `advance_field.name` — no separate definitions array from product is needed.
  const advanceFields: Array<{ label: string; value: string }> = [];
  if (Array.isArray(apiProduct?.advance_fields)) {
    // Optional product-level defs map (older API shape where product carries its own advance_fields array).
    const defs: Record<number, string> = {};
    if (Array.isArray(product?.advance_fields)) {
      for (const def of product.advance_fields) {
        if (def?.id) defs[def.id] = def?.name ?? "";
      }
    }
    for (const saved of apiProduct.advance_fields) {
      const id = saved?.advance_field_id ?? saved?.id;
      const value = firstStr(saved?.advance_field_value, saved?.value);
      // Prefer the nested advance_field.name (present in v2 response); fall back to defs map.
      const label = firstStr(saved?.advance_field?.name, defs[id], saved?.name);
      if (label && value) advanceFields.push({ label, value });
    }
  }

  // Teeth shade: direct field first; fall back to the first shade_guide advance_field
  // (e.g. "Base Shade") when the product stores all shades as advance fields.
  const teethShadeFromAdvance = (() => {
    if (!Array.isArray(apiProduct?.advance_fields)) return "";
    for (const saved of apiProduct.advance_fields) {
      if (saved?.advance_field?.field_type === "shade_guide") {
        return firstStr(saved?.teeth_shade?.name, saved?.advance_field_value);
      }
    }
    return "";
  })();

  const stumpShadeFromAdvance = (() => {
    if (!Array.isArray(apiProduct?.advance_fields)) return "";
    for (const saved of apiProduct.advance_fields) {
      const name: string = (saved?.advance_field?.name ?? "").toLowerCase();
      if (name.includes("stump") && saved?.advance_field?.field_type === "shade_guide") {
        return firstStr(saved?.teeth_shade?.name, saved?.advance_field_value);
      }
    }
    return "";
  })();

  // ── Opposing arch ───────────────────────────────────────────────────────────
  const productArch = archFromType(apiProduct?.type);
  const opposingArch: "maxillary" | "mandibular" =
    productArch === "maxillary" ? "mandibular" : "maxillary";

  // Opposing impressions: dedicated field preferred, falls back to empty string.
  const opposingImpression = formatImpressions(
    apiProduct?.opposing_impressions ??
    apiProduct?.opposite_impressions ??
    [],
  );

  // Build per-tooth opposing image map from selected_teeth[].tooth_chart_entry.
  // The opposing tooth number is derived as 33 − mainTooth (universal dental numbering).
  const opposingToothChartByTooth: Record<number, string | null> = {};
  const opposingSelectedTeethSet = new Set<number>();

  const selectedTeethSource: any[] = Array.isArray(apiProduct?.selected_teeth)
    ? apiProduct.selected_teeth
    : Array.isArray(apiProduct?.selected_teeth_map)
      ? apiProduct.selected_teeth_map
      : [];

  for (const row of selectedTeethSource) {
    const mainTooth = Number(row?.tooth_number);
    if (!Number.isFinite(mainTooth) || mainTooth < 1 || mainTooth > 32) continue;
    const entry = row?.tooth_chart_entry ?? {};
    const oppUrl =
      firstStr(
        entry?.opposite_extraction_image_url,
        row?.opposite_extraction_image_url,
      ) || null;
    if (oppUrl) {
      const oppTooth = 33 - mainTooth;
      opposingToothChartByTooth[oppTooth] = oppUrl;
      opposingSelectedTeethSet.add(oppTooth);
    }
  }

  // Also collect opposing teeth from the saved opposite_extractions list.
  if (Array.isArray(apiProduct?.opposite_extractions)) {
    for (const ext of apiProduct.opposite_extractions) {
      // Each entry is { extraction_id, teeth_numbers: number[] } (creation payload shape)
      // OR { extraction_id, teeth_number } (single-tooth shape).
      const tns: number[] = Array.isArray(ext?.teeth_numbers)
        ? ext.teeth_numbers.map(Number)
        : ext?.teeth_number != null
          ? [Number(ext.teeth_number)]
          : [];
      for (const tn of tns) {
        if (Number.isFinite(tn)) opposingSelectedTeethSet.add(tn);
      }
    }
  }

  const opposingSelectedTeeth = Array.from(opposingSelectedTeethSet);
  const hasOpposing =
    (product?.opposite_impression === "Yes") ||
    opposingSelectedTeeth.length > 0 ||
    !!opposingImpression;

  return {
    image: variationImage ?? productImage,
    title: variationTitle || productTitle,
    teethLabel,
    missingTeeth,
    willExtractTeeth,
    restoration: categoryName,
    productName: firstStr(product?.name, apiProduct?.name),
    grade: firstStr(apiProduct?.grade?.name, apiProduct?.grade_name),
    stage: firstStr(apiProduct?.stage?.name, apiProduct?.stage_name),
    teethShade: firstStr(apiProduct?.teeth_shade?.name, apiProduct?.teeth_shade_name, teethShadeFromAdvance),
    gumShade: firstStr(apiProduct?.gum_shade?.name, apiProduct?.gum_shade_name),
    stumpShade: firstStr(apiProduct?.stump_shade?.name, apiProduct?.stump_shade_name, stumpShadeFromAdvance),
    impression: formatImpressions(apiProduct?.impressions),
    addOns: formatAddOns(apiProduct?.addons ?? apiProduct?.add_ons),
    isFixed,
    isImplant,
    implants: isImplant ? implants : [],
    advanceFields,
    hasOpposing,
    opposingArch: hasOpposing ? opposingArch : null,
    opposingImpression,
    opposingSelectedTeeth,
    opposingToothChartByTooth,
  };
}

/** Join slip-level notes ({ note }[]); fall back to per-product notes. */
function collectNotes(slipNotes: unknown, products: any[]): string {
  if (Array.isArray(slipNotes) && slipNotes.length > 0) {
    const joined = slipNotes
      .map((n: any) => firstStr(typeof n === "string" ? n : n?.note))
      .filter(Boolean)
      .join("\n");
    if (joined) return joined;
  }
  return products
    .map((p: any) => firstStr(p?.notes))
    .filter(Boolean)
    .join("\n");
}

/** Build a single arch's tooth chart + products.
 *  `allProducts` is the full list; the function filters by arch internally.
 *  It also collects opposing tooth-chart images and impressions contributed
 *  by products on the OTHER arch so they appear on the correct side. */
function buildArch(arch: "maxillary" | "mandibular", allProducts: any[]): ArchVM | null {
  const archProducts = allProducts.filter((p) => archFromType(p?.type) === arch);
  const opposingProducts = allProducts.filter((p) => archFromType(p?.type) !== arch);

  // Collect opposing tooth-chart images from the other arch's products.
  // The opposing tooth number is derived as 33 − mainTooth (universal dental numbering).
  const opposingToothChartForThisArch: Record<
    number,
    { chartType: null; imageUrl: string }
  > = {};
  const opposingSelectedForThisArch = new Set<number>();
  const opposingImpressionParts: string[] = [];

  for (const p of opposingProducts) {
    const rows: any[] = Array.isArray(p?.selected_teeth)
      ? p.selected_teeth
      : Array.isArray(p?.selected_teeth_map)
        ? p.selected_teeth_map
        : [];

    for (const row of rows) {
      const mainTooth = Number(row?.tooth_number);
      if (!Number.isFinite(mainTooth) || mainTooth < 1 || mainTooth > 32) continue;
      const entry = row?.tooth_chart_entry ?? {};
      const oppUrl =
        firstStr(
          entry?.opposite_extraction_image_url,
          row?.opposite_extraction_image_url,
        ) || null;
      if (oppUrl) {
        const oppTooth = 33 - mainTooth;
        opposingToothChartForThisArch[oppTooth] = { chartType: null, imageUrl: oppUrl };
        opposingSelectedForThisArch.add(oppTooth);
      }
    }

    // Collect opposing impressions contributed by the other arch's products.
    const oppImp = formatImpressions(
      p?.opposing_impressions ?? p?.opposite_impressions ?? [],
    );
    if (oppImp) opposingImpressionParts.push(oppImp);

    // Also honour explicit opposite_extractions teeth.
    if (Array.isArray(p?.opposite_extractions)) {
      for (const ext of p.opposite_extractions) {
        const tns: number[] = Array.isArray(ext?.teeth_numbers)
          ? ext.teeth_numbers.map(Number)
          : ext?.teeth_number != null
            ? [Number(ext.teeth_number)]
            : [];
        for (const tn of tns) {
          if (Number.isFinite(tn)) opposingSelectedForThisArch.add(tn);
        }
      }
    }
  }

  const hasOpposingData =
    Object.keys(opposingToothChartForThisArch).length > 0 ||
    opposingSelectedForThisArch.size > 0 ||
    opposingImpressionParts.length > 0;

  // Return null only when there are no direct products AND no opposing data for this arch.
  if (archProducts.length === 0 && !hasOpposingData) return null;

  const productVMs = archProducts.map(buildProduct);

  // Aggregate per-tooth statuses across all products in this arch.
  const missing = new Set<number>();
  const willExtract = new Set<number>();
  const implant = new Set<number>();
  const selected = new Set<number>();
  const toothChartSelectionsByTooth: Record<
    number,
    { chartType: "Implant" | "Prep" | "Pontic" | null; imageUrl: string | null }
  > = {};

  // Seed with opposing images first so direct arch images can override them.
  for (const [tn, entry] of Object.entries(opposingToothChartForThisArch)) {
    toothChartSelectionsByTooth[Number(tn)] = entry;
  }
  for (const tn of opposingSelectedForThisArch) selected.add(tn);

  const normalizeChartType = (raw: unknown): "Implant" | "Prep" | "Pontic" | null => {
    const value = firstStr(raw).toLowerCase();
    if (!value) return null;
    if (value.includes("implant")) return "Implant";
    if (value.includes("prep")) return "Prep";
    if (value.includes("pontic")) return "Pontic";
    return null;
  };

  const getToothChartRows = (product: any): any[] => {
    const candidates = [
      product?.selected_teeth,
      product?.selected_teeth_map,
      product?.tooth_chart,
      product?.tooth_chart_entries,
      product?.tooth_chart_details,
      product?.tooth_selections,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  };

  for (const p of archProducts) {
    parseTeeth(p?.teeth_selection ?? p?.teeth).forEach((t) => selected.add(t));
    parseTeeth(p?.missing_teeth ?? p?.missing).forEach((t) => missing.add(t));
    parseTeeth(p?.extraction_teeth ?? p?.will_extract ?? p?.extractions).forEach((t) =>
      willExtract.add(t),
    );
    if (Array.isArray(p?.retentions)) {
      for (const r of p.retentions) {
        const name = (r?.retention?.name ?? r?.retention_name ?? "").toLowerCase();
        const tn = r?.tooth_number ?? r?.tooth_num;
        if (name === "implant" && tn) implant.add(tn);
      }
    }

    for (const row of getToothChartRows(p)) {
      const toothNumber = Number(row?.tooth_number ?? row?.tooth_chart_entry?.tooth_number);
      if (!Number.isFinite(toothNumber)) continue;
      const entry = row?.tooth_chart_entry ?? {};
      const chartType = normalizeChartType(
        entry?.chart_type ??
          row?.chart_type ??
          entry?.retention_option?.name ??
          row?.retention_option?.name
      );
      const imageUrl =
        firstStr(
          entry?.selected_image_url,
          row?.image_url,
          entry?.retention_option_image_url,
          row?.selected_image_url
        ) || null;

      toothChartSelectionsByTooth[toothNumber] = { chartType, imageUrl };
    }
  }

  const order = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  const teeth: ToothVM[] = order.map((number) => {
    let status: ToothStatus = "in_mouth";
    if (willExtract.has(number)) status = "will_extract";
    else if (missing.has(number)) status = "missing";
    else if (implant.has(number)) status = "implant";
    return { number, status };
  });

  return {
    arch,
    teeth,
    selectedTeeth: Array.from(selected),
    toothChartSelectionsByTooth,
    products: productVMs,
    opposingImpression: opposingImpressionParts.join(", "),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function buildVirtualSlipVM(d: any): VirtualSlipVM {
  const safe = d ?? {};
  const caseObj = safe.case ?? {};
  const products: any[] = Array.isArray(safe.products)
    ? safe.products
    : Array.isArray(safe.slips?.[0]?.products)
      ? safe.slips[0].products
      : [];

  const relatedSlipsRaw = safe.related_slips ?? safe.relatedSlips ?? [];
  const relatedSlips: string[] = Array.isArray(relatedSlipsRaw)
    ? relatedSlipsRaw
        .map((r: any) => firstStr(typeof r === "string" ? r : r?.slip_number, r?.number))
        .filter(Boolean)
    : [];

  // created_by appears both top-level (slip / paper-slip responses) and nested
  // under `case` (case-details response); read name/image across both so the
  // avatar resolves from whichever source carries it.
  const header: VirtualSlipHeaderVM = {
    officeName: firstStr(caseObj.office?.name, safe.office?.name),
    officeLogo: firstStr(caseObj.office?.logo_url, caseObj.office?.image) || null,
    labName: firstStr(caseObj.lab?.name, safe.lab?.name) || "Lab",
    labLogo: firstStr(caseObj.lab?.logo_url, caseObj.lab?.image) || null,
    doctorName: firstStr(caseObj.doctor?.name, safe.doctor?.name),
    doctorImage: firstStr(caseObj.doctor?.image, caseObj.doctor?.signature_url) || null,
    createdByName: firstStr(safe.created_by?.name, caseObj.created_by?.name),
    createdByImage: firstStr(safe.created_by?.image, caseObj.created_by?.image) || null,
    patientName: firstStr(caseObj.patient_name),
    gender: firstStr(caseObj.gender),
    age: firstStr(caseObj.age),
    slipNumber: firstStr(safe.slip_number),
    caseNumber: firstStr(caseObj.case_number),
    panNumber: firstStr(safe.casepan?.number, caseObj.casepan?.number),
    status: firstStr(safe.status, caseObj.case_status),
    location: firstStr(safe.location?.name),
    deliveryTime: formatTime(safe.delivery?.delivery_time),
    dueDate: formatDate(safe.delivery?.delivery_date),
    pickupDate: formatDate(safe.delivery?.pickup_date),
  };

  // Slip notes are an array ({ note }), one per added note. Join them; fall back
  // to per-product notes if the slip-level notes array is empty.
  const notes = collectNotes(safe.notes, products);

  return {
    header,
    arches: {
      maxillary: buildArch("maxillary", products),
      mandibular: buildArch("mandibular", products),
    },
    notes,
    relatedSlips,
  };
}
