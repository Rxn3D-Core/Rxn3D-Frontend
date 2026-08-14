/**
 * Return the URL to use when loading an attachment.
 *
 * Files are loaded directly from S3. A Next.js `/api/file-proxy` wrapper was
 * used previously to dodge CORS and force `Content-Disposition: inline`, but:
 * - `<img>` / `<a href>` do not need CORS
 * - the proxy allowlist only had `rxn3d-media-files`, so `rxn3d-prod-files`
 *   attachments (current slip uploads) returned 403
 * - large files (up to 500MB) cannot stream through Next.js (60s maxDuration)
 *
 * STL canvas fetch() still needs a CORS rule on the bucket allowing GET from
 * the app origin. That belongs on S3, not in a frontend proxy.
 *
 * blob: and relative URLs are returned as-is.
 */
export function toProxiedFileUrl(url: string): string {
  return url;
}
