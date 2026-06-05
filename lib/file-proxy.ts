/**
 * Helper to wrap remote S3 file URLs through a same-origin proxy route.
 * Prevents CORS issues when loading STL/image files from AWS S3.
 */

const PROXY_ROUTE = "/api/file-proxy";

/**
 * Convert a remote file URL to a proxied URL if needed.
 * - Local blob: URLs are returned as-is (already same-origin)
 * - Remote http(s) S3 URLs are wrapped through the proxy
 * - Returns the original URL if it's relative/same-origin
 *
 * @param url The original file URL (could be blob:, http(s), or relative)
 * @returns The URL to use for loading (either the original or proxied)
 */
export function toProxiedFileUrl(url: string): string {
  if (!url) return url;

  // Blob URLs are already same-origin, don't proxy them
  if (url.startsWith("blob:")) {
    return url;
  }

  // Relative URLs are same-origin, don't proxy them
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }

  // For remote http(s) URLs, wrap through the proxy
  const encodedUrl = encodeURIComponent(url);
  return `${PROXY_ROUTE}?url=${encodedUrl}`;
}
