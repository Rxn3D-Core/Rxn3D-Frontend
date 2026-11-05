/**
 * Download a file straight from S3, without /api/file-proxy.
 *
 * Browsers ignore `<a download>` on cross-origin URLs, and S3 rejects
 * `response-content-disposition` on unsigned GETs, so the bytes are fetched
 * (the buckets' CORS rule allows our origins) and saved under `fileName`.
 * Presigned URLs are fetched unchanged. If the fetch fails, the S3 URL is
 * opened in a new tab instead.
 */
export async function downloadFromS3(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blobUrl = URL.createObjectURL(await res.blob())
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
  } catch (err) {
    console.warn("[file-download] direct S3 download failed, opening the file instead →", url, err)
    window.open(url, "_blank", "noopener,noreferrer")
  }
}
