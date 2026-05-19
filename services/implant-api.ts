const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface ImplantPlatformSize {
  id: number;
  implant_platform_id: number;
  is_default: string;
  diameter_mm: string | null;
  length_mm: string | null;
  label: string;
  price: string | null;
  status: string;
  sequence: number;
}

export interface ImplantPlatform {
  id: number;
  implant_id: number;
  name: string;
  image_url: string | null;
  status: string;
  is_default: string;
  price: string | null;
  sequence: number;
  sizes: ImplantPlatformSize[];
}

export interface ProductImplant {
  id: number;
  brand_name: string;
  system_name: string;
  code: string;
  image_url: string | null;
  status: string;
  sequence: number;
  platforms: ImplantPlatform[];
}

export interface AbutmentOption {
  id: number;
  abutment_type_id: number;
  name: string;
  image_url: string | null;
  status: string;
  is_default: string;
  price: string | null;
  sequence: number;
}

export interface ProductAbutment {
  id: number;
  type: string;
  code: string;
  description: string;
  status: string;
  image_url: string | null;
  sequence: number;
  customer_id: number;
  options: AbutmentOption[];
}

// Module-level cache to avoid duplicate API calls per product+customer combo
const _implantsCache = new Map<string, ProductImplant[]>();
const _implantsInflight = new Map<string, Promise<ProductImplant[]>>();

export async function fetchProductImplants(
  productId: number,
  customerId: number,
): Promise<ProductImplant[]> {
  const key = `${productId}_${customerId}`;
  const cached = _implantsCache.get(key);
  if (cached) return cached;

  const inflight = _implantsInflight.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const url = new URL(`${API_BASE_URL}/slip/product/implants`);
      url.searchParams.set("product_id", String(productId));
      url.searchParams.set("customer_id", String(customerId));
      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const json = await res.json();
      const data = (json.data ?? json) as ProductImplant[];
      _implantsCache.set(key, data);
      return data;
    } catch {
      return [];
    } finally {
      _implantsInflight.delete(key);
    }
  })();

  _implantsInflight.set(key, promise);
  return promise;
}

