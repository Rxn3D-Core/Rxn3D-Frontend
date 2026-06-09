/** Product column label for slip listing tables: `product_code-stage_code`. */

function readProductCode(product) {
  const catalog = product?.product;
  return String(
    product?.product_code ??
      product?.code ??
      (catalog && typeof catalog === "object" ? catalog.product_code ?? catalog.code : "") ??
      product?.abbreviation ??
      "",
  ).trim();
}

function readStageCode(product) {
  const stage = product?.stage;
  return String(
    product?.stage_code ??
      (stage && typeof stage === "object"
        ? stage.code ?? stage.stage_code
        : "") ??
      "",
  ).trim();
}

/** @param {unknown} product */
export function formatSlipListingProductLabel(product) {
  const productCode = readProductCode(product);
  const stageCode = readStageCode(product);

  if (productCode && stageCode) return `${productCode}-${stageCode}`;
  return productCode || stageCode || "";
}

function productArchKey(type) {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (normalized === "lower" || normalized === "mandibular") return "mandibular";
  if (normalized === "upper" || normalized === "maxillary") return "maxillary";
  if (normalized === "both") return "both";
  return null;
}

/** @param {unknown[]} products */
export function formatSlipListingProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return "";

  let maxillaryLabel = null;
  let mandibularLabel = null;

  for (const product of products) {
    const label = formatSlipListingProductLabel(product);
    if (!label) continue;

    const arch = productArchKey(product?.type);
    if (arch === "both") {
      maxillaryLabel = maxillaryLabel ?? label;
      mandibularLabel = mandibularLabel ?? label;
    } else if (arch === "mandibular") {
      mandibularLabel = mandibularLabel ?? label;
    } else if (arch === "maxillary") {
      maxillaryLabel = maxillaryLabel ?? label;
    } else if (!maxillaryLabel) {
      maxillaryLabel = label;
    } else if (!mandibularLabel) {
      mandibularLabel = label;
    }
  }

  const hasMaxillary = products.some((p) => {
    const arch = productArchKey(p?.type);
    return arch === "maxillary" || arch === "both";
  });
  const hasMandibular = products.some((p) => {
    const arch = productArchKey(p?.type);
    return arch === "mandibular" || arch === "both";
  });

  if (hasMaxillary && hasMandibular && (maxillaryLabel || mandibularLabel)) {
    const upper = maxillaryLabel ?? mandibularLabel;
    const lower = mandibularLabel ?? maxillaryLabel;
    return `${upper}/${lower}`;
  }

  return products.map(formatSlipListingProductLabel).filter(Boolean).join(",");
}
