/**
 * Return the URL to use when loading an attachment.
 *
 * For files hosted on our S3 buckets we route through `/api/file-proxy`.
 * This avoids browser CORS blocks: Three.js STLLoader uses fetch(), and S3
 * does not emit the `Access-Control-Allow-Origin` header for our origin.
 * The proxy strips the S3 CORS restriction by serving the bytes from the
 * same origin as the app.
 *
 * blob: and relative URLs are returned as-is.
 */

const S3_HOSTS = [
  "rxn3d-media-files.s3.us-west-2.amazonaws.com",
  "rxn3d-prod-files.s3.us-west-2.amazonaws.com",
];

function isS3Url(url: string): boolean {
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
