import { resolveLibraryCustomerId } from "./libraryCustomerId";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const productCache = new Map<string, any>();
const productInflight = new Map<string, Promise<any>>();

export interface CaseDesignProductDetails {
  id?: number;
  subcategory_id?: number;
  name: string;
  image_url: string | null;
  category_name: string;
  subcategory_name: string;
  retention_options?: unknown[];
  extractions?: unknown[];
  has_retention?: string | boolean | null;
  has_variation?: string | boolean | null;
  variations?: unknown[];
}

/** Fetch basic product info for the accordion (name/image/category). */
export async function fetchCaseDesignProductDetails(
  productId: number,
  selectedLabId?: number | null
): Promise<CaseDesignProductDetails | null> {
  const customerId = resolveLibraryCustomerId(selectedLabId);
  if (!customerId) return null;
  const cacheKey = `${productId}_${customerId}`;

  if (productCache.has(cacheKey)) {
    const data = productCache.get(cacheKey);
    return mapProductDetails(data);
  }

  if (productInflight.has(cacheKey)) {
    const data = await productInflight.get(cacheKey);
    return mapProductDetails(data);
  }

  const promise = (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const url = new URL(`/v1/library/products/${productId}`, API_BASE_URL);
      url.searchParams.set("lang", "en");
      url.searchParams.set("customer_id", String(customerId));
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const data = json.data || null;
      productCache.set(cacheKey, data);
      return data;
    } catch {
      return null;
    } finally {
      productInflight.delete(cacheKey);
    }
  })();

  productInflight.set(cacheKey, promise);
  const data = await promise;
  return mapProductDetails(data);
}

function mapProductDetails(data: any): CaseDesignProductDetails | null {
  return data ? {
    id: typeof data.id === "number" ? data.id : undefined,
    subcategory_id: typeof data.subcategory?.id === "number" ? data.subcategory.id : undefined,
    name: data.name || "",
    image_url: data.image_url || null,
    category_name: data.subcategory?.category?.name || "",
    subcategory_name: data.subcategory?.name || "",
    retention_options: data.retention_options,
    extractions: data.extractions,
    has_retention: data.has_retention,
    has_variation: data.has_variation,
    variations: data.variations,
  } : null;
}
