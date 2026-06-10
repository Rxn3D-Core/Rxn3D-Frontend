import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * Allowed S3 bucket hosts for file proxying.
 * Only these hosts are permitted to prevent SSRF attacks.
 */
const ALLOWED_HOSTS = [
  "rxn3d-media-files.s3.us-west-2.amazonaws.com",
  // Add more whitelisted S3 buckets here if needed
];

/**
 * Check if a URL's hostname is in the allowlist.
 */
function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((host) =>
      parsed.hostname === host || parsed.hostname?.endsWith("." + host)
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/file-proxy?url=<encoded-url>
 *
 * Proxies a remote file request to avoid CORS issues.
 * - Validates the URL hostname against an allowlist (SSRF prevention)
 * - Fetches the file from the remote server
 * - Returns it with permissive CORS headers and correct Content-Type
 * - Handles errors explicitly with proper status codes
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.searchParams.get("url");

  // Validate URL parameter is provided
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Validate and decode the URL
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    return new NextResponse("Invalid URL encoding", { status: 400 });
  }

  // Whitelist the host to prevent SSRF
  if (!isAllowedHost(decodedUrl)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  // Fetch the remote file
  let response: Response;
  try {
    response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "RXN3D-Frontend/1.0",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Failed to fetch file: ${errorMessage}`, {
      status: 502,
    });
  }

  // Check if the remote response was successful
  if (!response.ok) {
    return new NextResponse(
      `Remote server returned ${response.status}: ${response.statusText}`,
      { status: response.status }
    );
  }

  // Get the content type from the remote response, with STL override
  const remoteContentType = response.headers.get("content-type") || "application/octet-stream";
  const isStl = decodedUrl.split("?")[0].toLowerCase().endsWith(".stl");
  const contentType = isStl ? "model/stl" : remoteContentType;

  // Get the content length if available
  const contentLength = response.headers.get("content-length");

  // Stream the response body back to the client
  const body = response.body;

  if (!body) {
    return new NextResponse("No content from remote server", { status: 502 });
  }

  const headers: Record<string, string> = {
    // CORS headers for same-origin loading (permissive for local/development)
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    // Correct content type for the file
    "Content-Type": contentType,
    // Force inline rendering — overrides S3's Content-Disposition: attachment
    "Content-Disposition": "inline",
    // Cache the file for reasonable duration (1 hour)
    "Cache-Control": "public, max-age=3600",
    // Security headers
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };

  // Add content length if available
  if (contentLength) {
    headers["Content-Length"] = contentLength;
  }

  return new NextResponse(body, {
    status: 200,
    headers,
  });
}

/**
 * HEAD /api/file-proxy?url=<encoded-url>
 *
 * Returns headers only (no body) for the remote file.
 * Useful for checking file metadata without downloading the full content.
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.searchParams.get("url");

  // Validate URL parameter is provided
  if (!url) {
    return new NextResponse(null, { status: 400 });
  }

  // Validate and decode the URL
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Whitelist the host to prevent SSRF
  if (!isAllowedHost(decodedUrl)) {
    return new NextResponse(null, { status: 403 });
  }

  // Fetch headers only
  let response: Response;
  try {
    response = await fetch(decodedUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "RXN3D-Frontend/1.0",
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 502 });
  }

  // Check if the remote response was successful
  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  // Get the content type from the remote response
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const contentLength = response.headers.get("content-length");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  if (contentLength) {
    headers["Content-Length"] = contentLength;
  }

  return new NextResponse(null, {
    status: 200,
    headers,
  });
}

/**
 * OPTIONS /api/file-proxy
 *
 * Handle CORS preflight requests.
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  });
}
