import type { QueryClient, QueryKey } from "@tanstack/react-query"

export const QUERY_CACHE_STORAGE_KEY = "rxn3d-query-cache"
export const PRODUCT_MODAL_STORE_KEY = "product-modal-store"

/** Brief default freshness so rapid remounts inside one screen still share a response. */
export const DEFAULT_QUERY_STALE_TIME_MS = 30 * 1000
export const DEFAULT_QUERY_GC_TIME_MS = 30 * 60 * 1000
export const QUERY_PERSIST_MAX_AGE_MS = DEFAULT_QUERY_GC_TIME_MS

/**
 * Use on lists that must match the server when a screen is opened again
 * (create slip, library pickers, connections, etc.).
 *
 * Cached data still paints immediately; `refetchOnMount: "always"` then hits the API.
 */
export const FRESH_LIST_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 10 * 60 * 1000,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false,
}

/** Query-key prefixes that must not be treated as long-lived persisted snapshots. */
export const TRANSACTIONAL_QUERY_KEY_PREFIXES = [
  "slip-data",
  "connected-offices",
  "connected-offices-or-labs",
  "library-categories",
  "library-products",
  "library-product-search",
  "doctors",
  "labs",
  "products",
  "connections",
  "invitations",
  "product-teeth-shades",
  "product-gum-shades",
  "product-impressions",
] as const

let appQueryClient: QueryClient | null = null
const inMemoryClearers = new Set<() => void>()

export function registerAppQueryClient(client: QueryClient) {
  appQueryClient = client
}

export function getAppQueryClient(): QueryClient | null {
  return appQueryClient
}

export function registerInMemoryCacheClearer(clear: () => void) {
  inMemoryClearers.add(clear)
}

export function shouldPersistQuery(queryKey: QueryKey): boolean {
  const prefix = queryKey[0]
  return typeof prefix !== "string" || !TRANSACTIONAL_QUERY_KEY_PREFIXES.includes(prefix as (typeof TRANSACTIONAL_QUERY_KEY_PREFIXES)[number])
}

export function invalidateFrontendListQueries(queryClient: QueryClient | null | undefined) {
  if (!queryClient) return

  for (const prefix of TRANSACTIONAL_QUERY_KEY_PREFIXES) {
    void queryClient.invalidateQueries({ queryKey: [prefix] })
  }
}

export function clearPersistedQueryCache() {
  if (typeof window === "undefined") return
  localStorage.removeItem(QUERY_CACHE_STORAGE_KEY)
  localStorage.removeItem(PRODUCT_MODAL_STORE_KEY)
}

export function clearInMemoryApiCaches() {
  inMemoryClearers.forEach((clear) => clear())
}

/** Drop in-memory + React Query list caches so the next screen open hits the APIs. */
export function resetFrontendListCaches(queryClient: QueryClient | null | undefined = getAppQueryClient()) {
  clearInMemoryApiCaches()
  invalidateFrontendListQueries(queryClient)
}
