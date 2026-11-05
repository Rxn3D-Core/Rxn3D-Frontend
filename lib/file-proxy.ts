/**
 * Return the URL to use when loading an attachment.
 *
 * For files hosted on our S3 buckets we route through `/api/file-proxy`.
 * This avoids browser CORS blocks: Three.js STLLoader uses fetch(), and S3
 * does not emit the `Access-Control-Allow-Origin` header for our origin.
 * The proxy strips the S3 CORS restriction by serving the bytes from the
 * same origin as the app.
 *
 * Since RXN-56 both buckets allow GET from our origins, so STL previews try
 * S3 directly first (getStlSourceUrls) and downloads skip the proxy.
 *
 * blob: and relative URLs are returned as-is.
 */

const S3_HOSTS = [
  "rxn3d-media-files.s3.us-west-2.amazonaws.com",
  "rxn3d-prod-files.s3.us-west-2.amazonaws.com",
];

export function isS3Url(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return S3_HOSTS.some((h) => hostname === h);
  } catch {
    return false;
  }
}

export function toProxiedFileUrl(url: string): string {
  if (!url) return url;
  // blob: and relative/data: URLs don't need proxying
  if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("/")) {
    return url;
  }
  if (isS3Url(url)) {
    return `/api/file-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Undo toProxiedFileUrl: `/api/file-proxy?url=<x>` -> `<x>`; any other URL is returned as-is. */
export function fromProxiedFileUrl(url: string): string {
  if (!url || !url.startsWith("/api/file-proxy?")) return url;
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("url") || url;
}

/**
 * URLs to try, in order, when loading an STL preview. S3 files load directly
 * (the buckets' CORS rule allows our origins) and fall back to the proxy;
 * anything else loads as given. The first entry is the canonical cache key,
 * so a direct and a proxied URL for the same file share one cache slot.
 */
export function getStlSourceUrls(url: string): string[] {
  const direct = fromProxiedFileUrl(url);
  return isS3Url(direct) ? [direct, toProxiedFileUrl(direct)] : [url];
}
