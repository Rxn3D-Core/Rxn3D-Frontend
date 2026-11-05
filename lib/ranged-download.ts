/**
 * Parallel ranged download for large S3 files.
 *
 * One connection to a far-away region is limited by latency, not bandwidth, so
 * the file is split into chunks fetched with `Range` requests several at a time
 * and written into one pre-sized buffer.
 *
 * - The size comes from a HEAD request (`Content-Length` is CORS-readable). Presigned GET
 *   URLs reject HEAD, which makes this throw and the caller falls back to a single download.
 * - `Accept-Ranges` is not CORS-readable, so range support is detected from the chunk
 *   response itself (must be 206).
 * - At most MAX_IN_FLIGHT chunk requests run at once across ALL files (browsers allow 6
 *   HTTP/1.1 connections per host), handed out first-come-first-served so several files
 *   loading together progress side by side.
 */

const MB = 1024 * 1024
export const MIN_RANGED_BYTES = 4 * MB
const MIN_CHUNK = 2 * MB
const MAX_CHUNK = 16 * MB
const TARGET_CHUNKS = 12
const MAX_IN_FLIGHT = 6
const CHUNK_RETRIES = 2
const PROGRESS_INTERVAL_MS = 100

export class RangedDownloadUnsupported extends Error {}

// ── Shared slot pool (FIFO) ──────────────────────────────────────────────
let active = 0
const waiters: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  if (active < MAX_IN_FLIGHT) {
    active++
    return
  }
  // The releasing request hands its slot straight to us, so `active` stays the same
  await new Promise<void>((resolve) => waiters.push(resolve))
}

function releaseSlot(): void {
  const next = waiters.shift()
  if (next) next()
  else active--
}

export interface RangedDownloadOptions {
  onProgress?: (loaded: number, total: number) => void
  fetchImpl?: typeof fetch
}

export function chunkSizeFor(total: number): number {
  return Math.min(MAX_CHUNK, Math.max(MIN_CHUNK, Math.ceil(total / TARGET_CHUNKS)))
}

export async function downloadRanged(url: string, options: RangedDownloadOptions = {}): Promise<ArrayBuffer> {
  const doFetch = options.fetchImpl ?? fetch
  const init: RequestInit = { mode: "cors", credentials: "omit" }

  const head = await doFetch(url, { ...init, method: "HEAD" })
  if (!head.ok) throw new RangedDownloadUnsupported(`HEAD ${head.status}`)
  const total = Number(head.headers.get("content-length"))
  if (!Number.isFinite(total) || total < MIN_RANGED_BYTES) {
    throw new RangedDownloadUnsupported("size unknown or too small for ranged download")
  }
  const etag = head.headers.get("etag")

  const chunkSize = chunkSizeFor(total)
  const chunkCount = Math.ceil(total / chunkSize)
  const out = new Uint8Array(total)
  const loadedPerChunk = new Array<number>(chunkCount).fill(0)
  const abort = new AbortController()

  let lastReport = 0
  const report = (force = false) => {
    if (!options.onProgress) return
    const now = Date.now()
    if (!force && now - lastReport < PROGRESS_INTERVAL_MS) return
    lastReport = now
    options.onProgress(loadedPerChunk.reduce((a, b) => a + b, 0), total)
  }

  const fetchChunk = async (index: number): Promise<void> => {
    const start = index * chunkSize
    const end = Math.min(start + chunkSize, total) - 1
    const expected = end - start + 1
    let lastError: unknown
    for (let attempt = 0; attempt <= CHUNK_RETRIES; attempt++) {
      loadedPerChunk[index] = 0
      await acquireSlot()
      try {
        const res = await doFetch(url, { ...init, signal: abort.signal, headers: { Range: `bytes=${start}-${end}` } })
        if (res.status !== 206) throw new RangedDownloadUnsupported(`expected 206, got ${res.status}`)
        const chunkEtag = res.headers.get("etag")
        if (etag && chunkEtag && etag !== chunkEtag) throw new Error("file changed during download")
        let received = 0
        if (res.body) {
          const reader = res.body.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            if (received + value.byteLength > expected) throw new Error("chunk longer than requested")
            out.set(value, start + received)
            received += value.byteLength
            loadedPerChunk[index] = received
            report()
          }
        } else {
          const bytes = new Uint8Array(await res.arrayBuffer())
          if (bytes.byteLength > expected) throw new Error("chunk longer than requested")
          out.set(bytes, start)
          received = bytes.byteLength
          loadedPerChunk[index] = received
        }
        if (received !== expected) throw new Error(`chunk ${index} short: ${received}/${expected} bytes`)
        return
      } catch (err) {
        lastError = err
        if (err instanceof RangedDownloadUnsupported || abort.signal.aborted) throw err
      } finally {
        releaseSlot()
      }
    }
    throw lastError
  }

  let nextChunk = 0
  const worker = async () => {
    for (;;) {
      const index = nextChunk++
      if (index >= chunkCount) return
      await fetchChunk(index)
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(MAX_IN_FLIGHT, chunkCount) }, worker))
  } catch (err) {
    abort.abort()
    throw err
  }
  report(true)
  return out.buffer
}
