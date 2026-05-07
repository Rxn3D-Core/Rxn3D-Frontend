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

export async function fetchProductImplants(
  productId: number,
  customerId: number,
): Promise<ProductImplant[]> {
  const url = new URL(`${API_BASE_URL}/product/implants`);
  url.searchParams.set("product_id", String(productId));
  url.searchParams.set("customer_id", String(customerId));

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch implants: ${res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? json) as ProductImplant[];
}
