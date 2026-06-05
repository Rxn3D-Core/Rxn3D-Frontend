export type PaperSlipArch = "maxillary" | "mandibular";
export type PaperSlipArchMode = "extraction" | "retention" | "default";
export type PaperSlipChartType = "Implant" | "Prep" | "Pontic" | null;
export type PaperSlipImageSource = "extraction" | "retention" | "default";
export type PaperSlipDetailRowKind =
  | "fixed"
  | "implant_retention"
  | "removable"
  | "mixed";
export type PaperSlipToothStatus = "in_mouth" | "missing" | "will_extract" | "implant";

export interface PaperSlipChartSelection {
  toothNumber: number;
  source: PaperSlipImageSource;
  imageUrl: string;
  chartType: PaperSlipChartType;
}

export interface PaperSlipCallout {
  label: string;
  teethNumbers: number[];
  source: Exclude<PaperSlipImageSource, "default"> | "missing";
}

export interface PaperSlipDetailField {
  label: string;
  value: string;
}

export interface PaperSlipDetailRow {
  kind: PaperSlipDetailRowKind;
  title: string;
  teethLabel: string;
  fields: PaperSlipDetailField[];
}

export interface PaperSlipToothVM {
  number: number;
  status: PaperSlipToothStatus;
}

export interface PaperSlipArchVM {
  arch: PaperSlipArch;
  mode: PaperSlipArchMode;
  allMissing: boolean;
  selectedTeeth: number[];
  teeth: PaperSlipToothVM[];
  toothChartSelectionsByTooth: Record<number, PaperSlipChartSelection>;
  callouts: PaperSlipCallout[];
  detailRows: PaperSlipDetailRow[];
}

export interface PaperSlipPrintHeaderVM {
  labName: string;
  labAddress: string;
  labCode: string;
  labLogoUrl: string | null;
  qrCodeUrl: string | null;
  officeName: string;
  doctorName: string;
  doctorLicenseNumber: string;
  patientName: string;
  gender: string;
  age: string;
  caseNumber: string;
  slipNumber: string;
  locationName: string;
  pickupDate: string;
  dueDate: string;
  casePanNumber: string;
}

export interface PaperSlipPrintFooterVM {
  labPhone: string;
  labEmail: string;
  relatedSlips: string[];
}

export interface PaperSlipPrintableSlipVM {
  slipId: number;
  slipNumber: string;
  caseNumber: string;
  title: string;
  isRush: boolean;
  header: PaperSlipPrintHeaderVM;
  arches: {
    maxillary: PaperSlipArchVM | null;
    mandibular: PaperSlipArchVM | null;
  };
  notes: string[];
  footer: PaperSlipPrintFooterVM;
}

export interface PaperSlipPrintVM {
  arches: {
    maxillary: PaperSlipArchVM | null;
    mandibular: PaperSlipArchVM | null;
  };
}

const MAXILLARY_TEETH = Array.from({ length: 16 }, (_, index) => index + 1);
const MANDIBULAR_TEETH = Array.from({ length: 16 }, (_, index) => index + 17);

function archFromType(type: unknown): PaperSlipArch {
  return String(type ?? "").trim().toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

function firstStr(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function parseTeeth(value: unknown): number[] {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((item) => Number.isFinite(item));
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) =>
      typeof item === "number"
        ? item
        : Number.parseInt(
            String(item?.tooth_number ?? item?.teeth_number ?? item?.tooth_num ?? item?.number ?? item),
            10,
          ),
    )
    .filter((item) => Number.isFinite(item));
}

function formatTeethLabel(selectedTeeth: number[], missingTeeth: Set<number>): string {
  if (selectedTeeth.length > 0 && selectedTeeth.every((tooth) => missingTeeth.has(tooth))) {
    return "All teeth missing";
  }
  return selectedTeeth.length > 0 ? `#${selectedTeeth.join(",")}` : "";
}

function defaultToothImage(arch: PaperSlipArch, toothNumber: number): string {
  return `/images/teeth/${arch}/tooth-${toothNumber}.png?v=2`;
}

function nonEmptyUrl(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function normalizeChartType(value: unknown): PaperSlipChartType {
  const normalized = firstStr(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("implant")) return "Implant";
  if (normalized.includes("prep")) return "Prep";
  if (normalized.includes("pontic")) return "Pontic";
  return null;
}

function getSelectedRows(product: any): any[] {
  const candidates = [
    product?.selected_teeth,
    product?.selected_teeth_map,
    product?.tooth_chart,
    product?.tooth_chart_entries,
    product?.tooth_chart_details,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function findRetentionOption(product: any, row: any): any | null {
  const options = Array.isArray(product?.retention_options) ? product.retention_options : [];
  if (!options.length) return null;

  const toothNumber = Number(
    row?.tooth_number ?? row?.teeth_number ?? row?.tooth_chart_entry?.tooth_number ?? 0,
  );
  const retentionOptionId = Number(
    row?.retention_option_id ?? row?.tooth_chart_entry?.retention_option_id ?? 0,
  );

  if (retentionOptionId > 0) {
    const byId = options.find(
      (option: any) =>
        Number(option?.retention_option_id ?? option?.id ?? 0) === retentionOptionId &&
        (Number(option?.teeth_number ?? toothNumber) === toothNumber || option?.teeth_number == null),
    );
    if (byId) return byId;
  }

  const chartType = normalizeChartType(
    row?.chart_type ??
      row?.tooth_chart_entry?.chart_type ??
      row?.retention_option?.name ??
      row?.tooth_chart_entry?.retention_option?.name,
  );

  if (!chartType) return null;

  return (
    options.find(
      (option: any) =>
        normalizeChartType(
          option?.tooth_chart_type ??
            option?.retention_option?.tooth_chart_type ??
            option?.lab_retention_option?.tooth_chart_type ??
            option?.name,
        ) === chartType &&
        (Number(option?.teeth_number ?? toothNumber) === toothNumber || option?.teeth_number == null),
    ) ?? null
  );
}

function resolveRetentionImage(option: any, toothNumber: number): string | null {
  if (!option) return null;

  const selectedImage =
    nonEmptyUrl(option?.selected_tooth_image_url) ??
    nonEmptyUrl(option?.selectedToothImageUrl);
  if (selectedImage) return selectedImage;

  const images = Array.isArray(option?.images) ? option.images : [];
  const toothImage = images.find(
    (image: any) => Number(image?.tooth_number ?? image?.tooth_num) === toothNumber,
  );

  return (
    nonEmptyUrl(toothImage?.image_url) ??
    nonEmptyUrl(toothImage?.image) ??
    nonEmptyUrl(option?.image_url) ??
    nonEmptyUrl(option?.retention_option?.image_url) ??
    nonEmptyUrl(option?.lab_retention_option?.image_url) ??
    nonEmptyUrl(option?.global_connection?.sample_image_url)
  );
}

function findExtraction(product: any, row: any): any | null {
  const extractions = Array.isArray(product?.extractions) ? product.extractions : [];
  const ids = [
    ...(Array.isArray(row?.extraction_ids) ? row.extraction_ids : []),
    row?.extraction_id,
    row?.tooth_chart_entry?.extraction_id,
  ]
    .map((value) => Number(value))
    .filter((value) => value > 0);

  for (const extractionId of ids) {
    const match = extractions.find(
      (extraction: any) =>
        Number(extraction?.extraction_id ?? extraction?.id ?? 0) === extractionId,
    );
    if (match) return match;
  }

  return null;
}

function resolveExtractionImage(extraction: any, toothNumber: number): string | null {
  if (!extraction) return null;

  const images = Array.isArray(extraction?.images) ? extraction.images : [];
  const toothImage = images.find(
    (image: any) => Number(image?.tooth_number ?? image?.tooth_num) === toothNumber,
  );

  return (
    nonEmptyUrl(toothImage?.image_url) ??
    nonEmptyUrl(toothImage?.image) ??
    nonEmptyUrl(extraction?.image_url) ??
    nonEmptyUrl(extraction?.sample_image_url) ??
    nonEmptyUrl(extraction?.url)
  );
}

function getRetentionNames(option: any): string[] {
  const links = Array.isArray(option?.retentions) ? option.retentions : [];
  const names: string[] = [];

  for (const link of links) {
    if (String(link?.status ?? "Active").trim() !== "Active") continue;
    const name = firstStr(link?.name, link?.retention?.name);
    if (name && !names.includes(name)) names.push(name);
  }

  return names;
}

function formatImpressions(impressions: unknown): string {
  if (!Array.isArray(impressions)) return "";
  return impressions
    .map((item: any) => {
      const quantity = item?.quantity ?? item?.qty ?? 1;
      const name = firstStr(item?.impression?.name, item?.name, item?.code);
      return name ? `${quantity}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function formatAddOns(addons: unknown): string {
  if (!Array.isArray(addons)) return "";
  return addons
    .map((item: any) => {
      const quantity = item?.quantity ?? item?.qty ?? 1;
      const name = firstStr(item?.addon?.name, item?.add_on?.name, item?.name);
      return name ? `${quantity}x ${name}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function isRemovableProduct(product: any): boolean {
  return firstStr(product?.category?.name, product?.product?.subcategory?.category?.name)
    .toLowerCase()
    .includes("removable");
}

function classifyDetailRow(product: any): PaperSlipDetailRowKind {
  if (isRemovableProduct(product)) return "removable";

  const selectedRows = getSelectedRows(product);
  const hasRetentionSelection = selectedRows.some(
    (row) => Number(row?.retention_option_id ?? row?.tooth_chart_entry?.retention_option_id ?? 0) > 0,
  );
  const hasImplantRetention = Array.isArray(product?.retentions)
    ? product.retentions.some((entry: any) =>
        firstStr(entry?.retention?.name, entry?.name, entry?.retention_name).toLowerCase().includes("implant"),
      )
    : false;

  return hasRetentionSelection || hasImplantRetention ? "implant_retention" : "fixed";
}

function buildDetailFields(product: any, rowKind: PaperSlipDetailRowKind): PaperSlipDetailField[] {
  const fields: PaperSlipDetailField[] = [];
  const maybePush = (label: string, value: string) => {
    if (value) fields.push({ label, value });
  };

  maybePush(
    "Restoration",
    firstStr(product?.category?.name, product?.product?.subcategory?.category?.name),
  );
  maybePush("Product", firstStr(product?.product?.name, product?.name));
  maybePush("Grade", firstStr(product?.grade?.name, product?.grade_name));
  maybePush("Stage", firstStr(product?.stage?.name, product?.stage_name));
  maybePush("Teeth shade", firstStr(product?.teeth_shade?.name, product?.teeth_shade_name));
  maybePush("Gum shade", firstStr(product?.gum_shade?.name, product?.gum_shade_name));
  maybePush("Stump shade", firstStr(product?.stump_shade?.name, product?.stump_shade_name));
  maybePush("Impression", formatImpressions(product?.impressions));
  maybePush("Add ons", formatAddOns(product?.addons));

  if (rowKind === "implant_retention") {
    const retentionNames = new Set<string>();
    for (const selectedRow of getSelectedRows(product)) {
      const option = findRetentionOption(product, selectedRow);
      for (const name of getRetentionNames(option)) retentionNames.add(name);
    }
    maybePush("Retention", Array.from(retentionNames).join(", "));

    const implantRow = Array.isArray(product?.implant_details) ? product.implant_details[0] : null;
    const abutmentRow = Array.isArray(product?.abutment_details) ? product.abutment_details[0] : null;
    maybePush("Implant brand", firstStr(implantRow?.implant?.brand_name, implantRow?.implant?.name));
    maybePush("Implant platform", firstStr(implantRow?.platform?.name, implantRow?.implant_platform?.name));
    maybePush(
      "Implant size",
      firstStr(
        implantRow?.size?.label,
        implantRow?.size?.name,
        implantRow?.custom_size,
      ),
    );
    maybePush("Abutment type", firstStr(abutmentRow?.abutment_type?.type, abutmentRow?.abutment_type?.name));
    maybePush("Abutment option", firstStr(abutmentRow?.abutment_option?.name));
  }

  return fields;
}

function buildProductDetailRows(products: any[]): PaperSlipDetailRow[] {
  const rows = products.map((product) => {
    const selectedTeeth = parseTeeth(product?.teeth_selection ?? product?.teeth);
    const missingTeeth = new Set(parseTeeth(product?.missing_teeth ?? product?.missing));
    const kind = classifyDetailRow(product);

    return {
      kind,
      title: firstStr(product?.product?.name, product?.name, "Product"),
      teethLabel: formatTeethLabel(selectedTeeth, missingTeeth),
      fields: buildDetailFields(product, kind),
    } satisfies PaperSlipDetailRow;
  });

  const nonMixedKinds = Array.from(
    new Set(rows.map((row) => row.kind).filter((kind) => kind !== "mixed")),
  );

  if (nonMixedKinds.length > 1) {
    rows.unshift({
      kind: "mixed",
      title: "Mixed case",
      teethLabel: "",
      fields: [
        {
          label: "Contains",
          value: nonMixedKinds
            .map((kind) => kind.replace("_", " "))
            .join(", "),
        },
      ],
    });
  }

  return rows;
}

function buildCallouts(
  mode: PaperSlipArchMode,
  extractionVisuals: Map<number, { label: string }>,
  retentionVisuals: Map<number, { label: string }>,
  allMissing: boolean,
): PaperSlipCallout[] {
  if (allMissing) {
    return [{ label: "All teeth missing", teethNumbers: [], source: "missing" }];
  }

  const sourceMap = mode === "extraction" ? extractionVisuals : mode === "retention" ? retentionVisuals : null;
  if (!sourceMap) return [];

  const grouped = new Map<string, PaperSlipCallout>();
  for (const [toothNumber, item] of sourceMap.entries()) {
    const label = item.label || (mode === "extraction" ? "Extraction" : "Retention");
    const key = `${mode}:${label}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.teethNumbers.push(toothNumber);
      continue;
    }
    grouped.set(key, {
      label,
      teethNumbers: [toothNumber],
      source: mode,
    });
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    teethNumbers: item.teethNumbers.sort((a, b) => a - b),
  }));
}

function extractionStatusFromLabel(label: string): PaperSlipToothStatus {
  const normalized = label.toLowerCase();
  if (normalized.includes("missing")) return "missing";
  if (normalized.includes("extract")) return "will_extract";
  return "in_mouth";
}

function buildArchVM(arch: PaperSlipArch, products: any[]): PaperSlipArchVM | null {
  const archProducts = products.filter((product) => archFromType(product?.type) === arch);
  if (archProducts.length === 0) return null;

  const order = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  const selectedTeeth = new Set<number>();
  const missingTeeth = new Set<number>();
  const extractionVisuals = new Map<number, { imageUrl: string; label: string; chartType: PaperSlipChartType }>();
  const retentionVisuals = new Map<number, { imageUrl: string; label: string; chartType: PaperSlipChartType }>();

  for (const product of archProducts) {
    parseTeeth(product?.teeth_selection ?? product?.teeth).forEach((tooth) => selectedTeeth.add(tooth));
    parseTeeth(product?.missing_teeth ?? product?.missing).forEach((tooth) => missingTeeth.add(tooth));

    for (const row of getSelectedRows(product)) {
      const toothNumber = Number(row?.tooth_number ?? row?.teeth_number ?? row?.tooth_chart_entry?.tooth_number);
      if (!Number.isFinite(toothNumber)) continue;

      const extraction = findExtraction(product, row);
      const extractionImage = resolveExtractionImage(extraction, toothNumber);
      if (extractionImage && !extractionVisuals.has(toothNumber)) {
        extractionVisuals.set(toothNumber, {
          imageUrl: extractionImage,
          label: firstStr(extraction?.name, extraction?.code, "Extraction"),
          chartType: normalizeChartType(row?.chart_type ?? row?.tooth_chart_entry?.chart_type),
        });
      }

      const option = findRetentionOption(product, row);
      const retentionImage = resolveRetentionImage(option, toothNumber);
      if (retentionImage && !retentionVisuals.has(toothNumber)) {
        retentionVisuals.set(toothNumber, {
          imageUrl: retentionImage,
          label: firstStr(
            option?.name,
            option?.retention_option?.name,
            option?.lab_retention_option?.name,
            "Retention",
          ),
          chartType: normalizeChartType(
            option?.tooth_chart_type ??
              option?.retention_option?.tooth_chart_type ??
              option?.lab_retention_option?.tooth_chart_type ??
              row?.chart_type ??
              row?.tooth_chart_entry?.chart_type,
          ),
        });
      }
    }
  }

  const selectedTeethList = order.filter((tooth) => selectedTeeth.has(tooth));
  const allMissing =
    selectedTeethList.length > 0 && selectedTeethList.every((tooth) => missingTeeth.has(tooth));
  const mode: PaperSlipArchMode =
    extractionVisuals.size > 0 ? "extraction" : retentionVisuals.size > 0 ? "retention" : "default";

  const toothChartSelectionsByTooth: Record<number, PaperSlipChartSelection> = {};
  const teeth: PaperSlipToothVM[] = [];

  for (const toothNumber of order) {
    const defaultSelection: PaperSlipChartSelection = {
      toothNumber,
      source: "default",
      imageUrl: defaultToothImage(arch, toothNumber),
      chartType: null,
    };

    let selection = defaultSelection;
    if (mode === "extraction" && extractionVisuals.has(toothNumber)) {
      const extraction = extractionVisuals.get(toothNumber)!;
      selection = {
        toothNumber,
        source: "extraction",
        imageUrl: extraction.imageUrl,
        chartType: extraction.chartType,
      };
    } else if (mode === "retention" && retentionVisuals.has(toothNumber)) {
      const retention = retentionVisuals.get(toothNumber)!;
      selection = {
        toothNumber,
        source: "retention",
        imageUrl: retention.imageUrl,
        chartType: retention.chartType,
      };
    }

    toothChartSelectionsByTooth[toothNumber] = selection;

    let status: PaperSlipToothStatus = "in_mouth";
    if (allMissing && selectedTeeth.has(toothNumber)) {
      status = "missing";
    } else if (missingTeeth.has(toothNumber)) {
      status = "missing";
    } else if (mode === "extraction" && extractionVisuals.has(toothNumber)) {
      status = extractionStatusFromLabel(extractionVisuals.get(toothNumber)!.label);
    } else if (
      mode === "retention" &&
      retentionVisuals.has(toothNumber) &&
      retentionVisuals.get(toothNumber)!.chartType === "Implant"
    ) {
      status = "implant";
    }

    teeth.push({
      number: toothNumber,
      status,
    });
  }

  return {
    arch,
    mode,
    allMissing,
    selectedTeeth: selectedTeethList,
    teeth,
    toothChartSelectionsByTooth,
    callouts: buildCallouts(mode, extractionVisuals, retentionVisuals, allMissing),
    detailRows: buildProductDetailRows(archProducts),
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${month}/${day}/${year.slice(2)}`;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /T(\d{2}):(\d{2})/.exec(iso) ?? /^(\d{1,2}):(\d{2})/.exec(iso);
  if (!match) return "";
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function formatDueDate(date: string | null | undefined, time: string | null | undefined): string {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);
  if (formattedDate && formattedTime) return `${formattedDate} @ ${formattedTime}`;
  return formattedDate || formattedTime;
}

function joinAddress(parts: unknown[]): string {
  return parts
    .map((part) => firstStr(part))
    .filter(Boolean)
    .join(", ");
}

function collectNotes(rawNotes: unknown): string[] {
  if (!Array.isArray(rawNotes)) return [];
  return rawNotes
    .map((note: any) => firstStr(typeof note === "string" ? note : note?.note))
    .filter(Boolean);
}

export function buildPaperSlipPrintSlipVM(data: any): PaperSlipPrintableSlipVM {
  const caseData = data?.case ?? {};
  const lab = caseData?.lab ?? data?.lab ?? {};
  const office = caseData?.office ?? data?.office ?? {};
  const doctor = caseData?.doctor ?? caseData?.doctor_details ?? data?.doctor ?? {};
  const delivery = data?.delivery ?? {};
  const products = Array.isArray(data?.products) ? data.products : [];
  const relatedSlips = Array.isArray(caseData?.slips)
    ? caseData.slips.map((slip: any) => firstStr(slip?.slip_number)).filter(Boolean)
    : [];

  return {
    slipId: Number(data?.id ?? 0),
    slipNumber: firstStr(data?.slip_number),
    caseNumber: firstStr(caseData?.case_number),
    title: firstStr(products[0]?.variation?.name_template, products[0]?.product?.name, "Paper Slip"),
    isRush:
      data?.is_rush === true ||
      (Array.isArray(products) && products.some((product) => product?.rush?.is_rush === true)),
    header: {
      labName: firstStr(lab?.name),
      labAddress: joinAddress([
        lab?.address,
        lab?.city,
        lab?.state,
        lab?.postal_code,
      ]),
      labCode: firstStr(lab?.code, caseData?.lab_code),
      labLogoUrl: nonEmptyUrl(lab?.logo_url) ?? null,
      qrCodeUrl: nonEmptyUrl(data?.qr_code_url) ?? null,
      officeName: firstStr(office?.name),
      doctorName: firstStr(doctor?.name),
      doctorLicenseNumber: firstStr(doctor?.license_number, doctor?.license_no),
      patientName: firstStr(caseData?.patient_name),
      gender: firstStr(caseData?.gender),
      age: firstStr(caseData?.age),
      caseNumber: firstStr(caseData?.case_number),
      slipNumber: firstStr(data?.slip_number),
      locationName: firstStr(data?.location?.name),
      pickupDate: formatDate(delivery?.pickup_date),
      dueDate: formatDueDate(delivery?.delivery_date, delivery?.delivery_time),
      casePanNumber: firstStr(data?.casepan?.number, data?.casepan?.code, data?.casepan_number),
    },
    arches: {
      maxillary: buildArchVM("maxillary", products),
      mandibular: buildArchVM("mandibular", products),
    },
    notes: collectNotes(data?.notes),
    footer: {
      labPhone: firstStr(lab?.phone, lab?.phone_number),
      labEmail: firstStr(lab?.email),
      relatedSlips,
    },
  };
}

export function buildPaperSlipPrintVM(data: any): PaperSlipPrintVM {
  const slip = buildPaperSlipPrintSlipVM(data);
  return {
    arches: slip.arches,
  };
}
